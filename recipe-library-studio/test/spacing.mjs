// Spacing audit: no two controls (buttons, inputs, selects, links styled as buttons) may touch or sit closer than 8px,
// on any screen, at desktop and phone widths, empty and with the sample kitchen.   node test/spacing.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const PORT = 8950 + Math.floor(Math.random() * 40);
const srv = spawn(process.execPath, ['dev-server.mjs', String(PORT)], { cwd: new URL('..', import.meta.url).pathname, stdio: 'pipe' });
await new Promise(r => srv.stdout.once('data', r));
const browser = await pw.chromium.launch(); let problems = 0;
const audit = () => {
  // controls that are meant to sit together as one unit are skipped: segmented controls, steppers, star ratings, pulse dots, a field with its own button
  const skip = el => el.closest('.segment,.stepper,.rate,.pulse-nav,.welcome-dots,.linkbar,.month-control,.savebar,.pager .actions .btn+.btn,.theme-grid,.chip,.photo-choices,.toggle-grid,.kit-col,table');
  // with a dialog open, only the dialog is in reach
  const scope = document.querySelector('#dlg[open]') ? '#dlg button,#dlg .btn,#dlg input:not([type=checkbox]):not([type=radio]),#dlg select' : null;
  const els = [...document.querySelectorAll(scope || '#content button,#content .btn,#content input:not([type=checkbox]):not([type=radio]):not([type=hidden]),#content select,.topbar button,.topbar input,.rail-foot .btn,#dlg button,#dlg input:not([type=checkbox]):not([type=radio]),#dlg select')]
    .filter(el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && !skip(el) && !el.closest('[hidden]')&&(()=>{const sc=el.closest('.pair.scrolls .pair-body');if(!sc)return true;const a=sc.getBoundingClientRect(),b=el.getBoundingClientRect();return b.bottom<=a.bottom&&b.top>=a.top;})(); });
  const out = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j]; if (a.contains(b) || b.contains(a)) continue;
    // deliberate overlays: the heart on a recipe photo, the remove button on a planned meal
    const unit = a.closest('.rcard,.meal'); if (unit && unit === b.closest('.rcard,.meal')) continue;
    const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
    const gx = Math.max(B.left - A.right, A.left - B.right), gy = Math.max(B.top - A.bottom, A.top - B.bottom);
    if (gx < 8 && gy < 8) out.push(`${(a.textContent || a.placeholder || a.name || a.tagName).trim().slice(0, 28)} ↔ ${(b.textContent || b.placeholder || b.name || b.tagName).trim().slice(0, 28)} (gap ${Math.round(Math.max(gx, gy))}px)`);
  }
  // a button needs breathing room above the bottom edge of its card
  for (const el of els) { const card = el.closest('.card,.step,.notice,.hero,.ccard,.day'); if (!card || el.closest('.savebar,.table-wrap,.pager')) continue;
    const c = card.getBoundingClientRect(), r = el.getBoundingClientRect(), pb = parseFloat(getComputedStyle(card).paddingBottom) || 0;
    if (c.bottom - r.bottom < Math.min(12, pb || 12) - .5) out.push(`${(el.textContent || el.placeholder || el.tagName).trim().slice(0, 28)} sits ${Math.round(c.bottom - r.bottom)}px from the bottom of its card`); }
  return out;
};
for (const width of [1440, 390]) for (const mode of ['empty', 'sample']) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(`http://localhost:${PORT}/`); await page.waitForTimeout(500);
  await page.evaluate(m => { document.querySelector('#welcome')?.close(); if (m === 'sample') toggleSample(true); }, mode);
  const screens = ['dashboard', 'library', 'collections', 'tags', 'import', 'plan', 'shopping', 'guide', 'settings'];
  if (mode === 'sample') screens.push('recipe', 'edit', 'cook', 'book', 'selecting');
  for (const s of screens) {
    await page.evaluate(s => { if (s === 'recipe') openRecipe('s1'); else if (s === 'edit') editRecipe('s1'); else if (s === 'cook') { openRecipe('s1'); go('cook'); } else if (s === 'book') { go('collections'); bookForm(); } else if (s === 'selecting') { lib.cat = 'none'; go('library'); ACTIONS['sel-all'](); } else go(s); }, s);
    await page.waitForTimeout(80);
    for (const p of await page.evaluate(audit)) { problems++; console.log(`${width}px ${mode} ${s}: ${p}`); }
    await page.evaluate(() => { dirty = false; document.querySelector('#dlg').open && closeModal(); });
  }
  await page.close();
}
await browser.close(); srv.kill();
console.log(problems ? `\n${problems} spacing problem(s)` : 'no touching controls'); process.exit(problems ? 1 : 0);
