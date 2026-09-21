#!/usr/bin/env node
/* Record a web app being used, as video.
 *
 *   node record.js <scene-file.js> [outDir]
 *
 * The scene file describes what to do; this script does it and leaves a
 * raw .webm behind. Encoding is a separate step (encode.js) so you can
 * re-cut timing without re-recording.
 */
const path = require('path');
const fs = require('fs');

const sceneFile = process.argv[2];
if (!sceneFile) { console.error('usage: record.js <scene-file.js> [outDir]'); process.exit(1); }
const scene = require(path.resolve(sceneFile));
const OUT = path.resolve(process.argv[3] || scene.out || './video');
fs.mkdirSync(OUT, { recursive: true });

let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright')); }

/* `size` is the video frame. `viewport` is the CSS window the app lays
   itself out in, and they are usefully different: for a 9:16 social cut you
   want the app's PHONE layout (a ~405px viewport) blown up to 1080x1920,
   not a desktop layout squeezed into a tall frame where nothing is legible.
   Defaults to matching, which is what you want for a landscape/square cut. */
const SIZE = scene.size || { width: 1080, height: 1080 };
const VIEW = scene.viewport || SIZE;
const wait = ms => new Promise(r => setTimeout(r, ms));

/* Playwright does not paint the real mouse pointer into the recording.
 * Without a visible cursor, buttons depress and panels change with nothing
 * touching them, and the result reads as a slideshow rather than someone
 * using software. This injects one and animates it between targets. */
const CURSOR = (start) => `
  const c = document.createElement('div');
  c.id = '__cur';
  c.style.cssText = 'position:fixed;z-index:2147483647;width:22px;height:22px;pointer-events:none;' +
    'left:0;top:0;transition:transform .55s cubic-bezier(.4,0,.2,1);will-change:transform;' +
    'transform:translate(${start.x}px,${start.y}px)';
  c.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22">' +
    '<path d="M5 2l7 18 2.2-7.3L21 10.5z" fill="#fff" stroke="#1a1a1a" ' +
    'stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(c);
  window.__moveCur = (x, y) => { c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  window.__tapCur = () => c.animate(
    [{ filter:'none' }, { filter:'brightness(.65)' }, { filter:'none' }], { duration:220 });
`;

(async () => {
  const b = await chromium.launch({
    executablePath: scene.executablePath || process.env.CHROME_PATH ||
      '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  /* Capture starts the instant the context exists, so this is frame zero.
     Everything between here and SETUP_MS is staging that has to be trimmed
     off — measuring it beats guessing at it from a contact sheet. */
  const t0 = Date.now();
  const ctx = await b.newContext({
    viewport: VIEW,
    /* Render at 2x and let the video scale down: text in the finished file
     * is noticeably crisper than recording at 1x, for free. */
    deviceScaleFactor: scene.deviceScaleFactor || 2,
    recordVideo: { dir: OUT, size: SIZE },
    reducedMotion: 'no-preference'
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto(scene.url);
  await wait(scene.settle == null ? 1200 : scene.settle);

  /* App-specific staging: load sample data, dismiss onboarding, put the app
   * in the state a satisfied user would be in. Run twice by default because
   * first-run UI is often opened by a timer that has not fired yet when the
   * first pass runs — closing it early closes nothing. */
  /* Staging runs against the app itself. With a stage wrapper that means the
     iframe, so hand `prepare` something it can evaluate in — the app frame
     when there is one, the page otherwise. */
  /* Resolve the frame from the iframe ELEMENT rather than guessing by index
     or URL — an app may itself contain frames, and the wrapper's iframe has
     not necessarily finished loading when staging begins. */
  const appCtx = async () => {
    if (!scene.frame) return page;
    const el = await page.waitForSelector(scene.frame, { state: 'attached' });
    const fr = await el.contentFrame();
    if (!fr) throw new Error('no content frame for ' + scene.frame);
    await fr.waitForLoadState('load').catch(() => {});
    return fr;
  };
  if (scene.prepare){
    await scene.prepare(await appCtx(), page);
    await wait(900);
    await scene.prepare(await appCtx(), page);
    await wait(600);
  }

  await page.evaluate(CURSOR(scene.cursorStart || { x: VIEW.width / 2, y: VIEW.height - 90 }));
  await wait(700);

  const startedAt = Date.now();
  const setupMs = startedAt - t0;
  console.log('SETUP_MS ' + setupMs + '  (encode.js trims this off by default)');

  /* When the app is staged inside an iframe (vertical/social cuts), every
     selector in the scene refers to the app, not the wrapper. boundingBox()
     on a frame element still reports main-frame coordinates, so the cursor
     — which lives in the wrapper — lines up with no correction. */
  const inApp = sel => scene.frame
    ? page.frameLocator(scene.frame).locator(sel).first()
    : page.locator(sel).first();

  const moveTo = async (sel, ms) => {
    const box = await inApp(sel).boundingBox();
    if (!box) throw new Error('not visible: ' + sel);
    await page.evaluate(([x, y]) => window.__moveCur(x, y),
      [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)]);
    await wait(ms == null ? 620 : ms);
    return box;
  };

  for (const step of scene.scenes){
    if (step.note) console.log('  · ' + step.note);
    if (step.run) { await step.run(await appCtx(), page); }
    if (step.moveTo) { await moveTo(step.moveTo, step.moveMs); }
    if (step.click) {
      await page.evaluate(() => window.__tapCur());
      await wait(130);
      await inApp(step.click === true ? step.moveTo : step.click).click();
    }
    if (step.type) {
      const t = step.type;
      const cps = t.cps || 14;                 // characters per second
      const field = inApp(t.selector);
      if (t.clear) await field.fill('');
      for (const ch of t.text){
        await field.pressSequentially(ch, { delay: 0 });
        await wait(1000 / cps);
      }
    }
    if (step.hold) await wait(step.hold);
  }

  const elapsed = Date.now() - startedAt;
  console.log('CONTENT_MS ' + elapsed);
  await ctx.close();
  await b.close();

  const raw = fs.readdirSync(OUT).filter(f => f.endsWith('.webm'))
    .map(f => path.join(OUT, f))
    .sort((a, b2) => fs.statSync(b2).mtimeMs - fs.statSync(a).mtimeMs)[0];
  fs.writeFileSync(path.join(OUT, 'take.json'),
    JSON.stringify({ raw, setupMs, contentMs: elapsed, size: SIZE, viewport: VIEW }, null, 2));
  console.log('raw: ' + raw);
})();
