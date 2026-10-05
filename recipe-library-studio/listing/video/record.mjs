// Records a short "how it works" run of the real app for the Etsy listing video.
//   node listing/video/record.mjs      (needs listing/deck/userdata.js and network access to the recipe sites)
// Writes sharp frames (Chrome screencast, 1920x1080) to frames/ with list.txt (ffconcat timings) and marks.json;
// make.sh turns them into the MP4.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const HERE = new URL('.', import.meta.url).pathname, DECK = new URL('../deck/', import.meta.url).pathname, ROOT = new URL('../../', import.meta.url).pathname;
const LINK = 'https://www.recipetineats.com/honey-garlic-chicken/', PORT = 8977;
const srv = spawn(process.execPath, ['dev-server.mjs', String(PORT)], { cwd: ROOT, env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_EXTRA_CA_CERTS: '/root/.ccr/ca-bundle.crt' }, stdio: 'pipe' });
await new Promise(r => srv.stdout.once('data', r));
const b = await pw.chromium.launch();
// 1440x810 at 4/3 scale = 1920x1080 frames with readable, app-sized text
const ctx = await b.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3, ignoreHTTPSErrors: true });
// recipe photos come from the recipe sites: fetch them in Node (which goes through the environment's proxy) and hand them to the page
await ctx.route(u => !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u.href), async route => {
  try { const r = await fetch(route.request().url(), { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36' } });
    await route.fulfill({ status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'access-control-allow-origin': '*' }, body: Buffer.from(await r.arrayBuffer()) }); }
  catch { await route.abort(); } });
const p = await ctx.newPage(), marks = {}, mark = k => { marks[k] = Date.now() / 1000; };
const frames = []; let cdp;
const startCast = async () => { cdp = await ctx.newCDPSession(p);
  cdp.on('Page.screencastFrame', f => { frames.push({ t: f.metadata.timestamp, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 }); };
const wait = ms => p.waitForTimeout(ms);
try {
  await p.goto(`http://localhost:${PORT}/`); await p.waitForSelector('#welcome[open]');
  await p.addScriptTag({ content: readFileSync(DECK + 'userdata.js', 'utf8') });
  await p.addScriptTag({ content: readFileSync(DECK + 'stage.js', 'utf8') });
  await p.evaluate(async () => {
    await window.__stage();
    state.plans = []; state.shopping = []; state.recipes = state.recipes.filter(r => !/honey-garlic-chicken/.test(r.sourceUrl)); save();
    const css = document.createElement('style');
    css.textContent = `#vid-cap{position:fixed;left:50%;bottom:40px;transform:translateX(-50%) translateY(20px);opacity:0;z-index:9999;background:#2D1B12;color:#FBF3EE;font:700 28px Manrope,'DM Sans',sans-serif;letter-spacing:-.01em;padding:18px 34px;border-radius:999px;box-shadow:0 18px 50px -12px rgba(0,0,0,.5);transition:opacity .35s,transform .35s;white-space:nowrap}
      #vid-cap.on{opacity:1;transform:translateX(-50%)} #vid-cap b{color:#F2B441}
      #vid-cur{position:fixed;left:960px;top:620px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(242,180,65,.95);border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.35);z-index:10000;transition:left .7s cubic-bezier(.4,0,.2,1),top .7s cubic-bezier(.4,0,.2,1),transform .15s;pointer-events:none}
      #vid-cur.tap{transform:scale(.7)}
      #vid-end{position:fixed;inset:0;pointer-events:none;z-index:10001;background:radial-gradient(900px 600px at 80% 90%,#5a3a1e 0,transparent 70%),#2D1B12;color:#FBF3EE;display:grid;place-content:center;justify-items:center;gap:18px;opacity:0;transition:opacity .5s;font-family:'DM Sans',sans-serif}
      #vid-end.on{opacity:1} #vid-end i{width:96px;height:96px;border-radius:24px;background:#F2B441;color:#2D1B12;display:grid;place-items:center;font:800 54px Manrope,sans-serif;font-style:normal}
      #vid-end h1{font:700 78px 'Playfair Display',Georgia,serif;margin:0} #vid-end p{font-size:30px;color:#CBB3A5;margin:0} #vid-end small{font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:#F2B441;margin-top:18px}
      #toast{display:none!important}`;
    document.head.appendChild(css);
    document.body.insertAdjacentHTML('beforeend', '<div id="vid-cap"></div><div id="vid-cur"></div><div id="vid-end"><i>R</i><h1>Recipe Library Studio</h1><p>Save · Plan · Shop · Cook</p><small>JPS Digital Pages</small></div>');
    window.cap = h => { const c = document.getElementById('vid-cap'); c.classList.remove('on'); setTimeout(() => { c.innerHTML = h; if (h) c.classList.add('on'); }, h ? 120 : 0); };
    window.cur = (x, y) => { const c = document.getElementById('vid-cur'); c.style.left = x + 'px'; c.style.top = y + 'px'; };
    go('import'); scrollTo(0, 0);
  });
  const moveTo = async sel => { const bx = await p.locator(sel).first().boundingBox(); await p.evaluate(([x, y]) => cur(x, y), [bx.x + bx.width / 2, bx.y + bx.height / 2]); await wait(750); return bx; };
  const tap = async sel => { await moveTo(sel); await p.evaluate(() => document.getElementById('vid-cur').classList.add('tap')); await wait(140); await p.evaluate(() => document.getElementById('vid-cur').classList.remove('tap')); await p.locator(sel).first().click(); };
  await startCast(); await wait(800); mark('start');
  // 1. paste a link
  await p.evaluate(() => cap('Paste any <b>recipe link</b>'));
  await moveTo('.import-hero input[name=url]'); await p.locator('.import-hero input[name=url]').click();
  await p.keyboard.type(LINK, { delay: 18 }); await wait(300);
  await tap('.import-hero [data-import-go]'); mark('importClick');
  await p.waitForSelector('.recipe-hero h1', { timeout: 30000 }); mark('importDone');
  await p.evaluate(() => { cap('Get <b>just the recipe</b>, no ads'); cur(1500, 700); });
  await p.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 15000 }).catch(() => {});
  await wait(1800);
  await p.evaluate(() => scrollTo({ top: 520, behavior: 'smooth' })); await wait(1600);
  // 2. plan the week
  await p.evaluate(() => { scrollTo(0, 0); go('plan'); cap('Plan your week <b>in one click</b>'); }); await wait(600);
  await tap('[data-action="plan-fill"]'); await wait(1900);
  // 3. shopping list
  await p.evaluate(() => cap('Shop by aisle, <b>in one tap</b>'));
  await tap('[data-action="shop-week"]'); await wait(500);
  await p.evaluate(() => { go('shopping'); scrollTo(0, 0); }); await wait(2300);
  // 4. cook
  await p.evaluate(() => { openRecipe(state.recipes.find(r => /honey-garlic-chicken/.test(r.sourceUrl)).id); cap('Cook <b>step by step</b>'); }); await wait(500);
  await tap('[data-action="cook"]'); await wait(1300);
  await p.keyboard.press('ArrowRight'); await wait(1300);
  // end card
  await p.evaluate(() => { cap(''); document.getElementById('vid-end').classList.add('on'); }); await wait(2800); mark('end');
} finally {
  if (cdp) await cdp.send('Page.stopScreencast').catch(() => {});
  await ctx.close(); await b.close(); srv.kill();
  rmSync(HERE + 'frames', { recursive: true, force: true }); mkdirSync(HERE + 'frames');
  const keep = frames.filter(f => f.t >= marks.start - 0.05 && f.t <= marks.end + 0.05);
  let list = 'ffconcat version 1.0\n';
  keep.forEach((f, i) => { const n = `f${String(i).padStart(5, '0')}.jpg`; writeFileSync(HERE + 'frames/' + n, Buffer.from(f.data, 'base64'));
    const next = keep[i + 1]?.t ?? marks.end; list += `file ${n}\nduration ${Math.max(0.001, next - f.t).toFixed(4)}\n`; });
  list += `file f${String(keep.length - 1).padStart(5, '0')}.jpg\n`;
  writeFileSync(HERE + 'frames/list.txt', list);
  writeFileSync(HERE + 'marks.json', JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v - marks.start).toFixed(3)])), null, 1));
  console.log(keep.length, 'frames', (marks.end - marks.start).toFixed(1) + 's');
}
