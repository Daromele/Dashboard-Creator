// Review screenshots for the Month in review story — run: node dev/shot-story.mjs
import { createRequire } from 'module';
import path from 'path'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = 'file://' + path.resolve(here, '..', 'Personal_Finance_Dashboard.html');
const shots = path.join(here, 'shots'); fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--allow-file-access-from-files'] });
for (const [name, theme, vp] of [['light', 'cream', { width: 1380, height: 900 }], ['dark', 'charcoal', { width: 1380, height: 900 }], ['mobile', 'cream', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(file);
  await page.waitForSelector('#wizBody');
  await page.evaluate((t) => { loadSampleData(); commit(s => { s.settings.onboarded = true; s.settings.tourSeen = true; s.settings.theme = t; }); applyTheme(); while (modalStack.length) modalStack[modalStack.length - 1].close(); renderFresh(); }, theme);
  await page.waitForTimeout(400);
  const month = await page.evaluate(() => { const m = window.__pfd.ui.month; const prev = D.addMonths(m, -1); window.__pfd.ui.month = prev; render(); return prev; });
  for (const idx of [1, 3, 4, 8]) {
    await page.evaluate(() => { while (modalStack.length) modalStack[modalStack.length - 1].close(); });
    await page.click('[data-action=monthStory]'); await page.waitForTimeout(250);
    for (let k = 0; k < idx; k++) { await page.click('#storyFwd'); await page.waitForTimeout(120); }
    await page.screenshot({ path: path.join(shots, `story-${name}-${idx}.png`) });
  }
  console.log(name, 'done', month);
  await ctx.close();
}
await browser.close();
