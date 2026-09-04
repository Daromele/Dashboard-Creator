// Responsive + rail review shots — run: node dev/shot-responsive.mjs
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = 'file://' + path.resolve(here, '..', 'Personal_Finance_Dashboard.html');
const out = path.join(here, 'shots'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const sizes = [['xl', 1600, 1000], ['lg', 1280, 900], ['md', 1024, 900], ['sm', 820, 900], ['xs', 390, 844]];
for (const [name, w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', isMobile: w < 500, hasTouch: w < 500 });
  const page = await ctx.newPage();
  await page.goto(file); await page.waitForSelector('#wizBody');
  await page.evaluate(() => { loadSampleData(); commit(s => { s.settings.onboarded = true; s.settings.tourSeen = true; s.settings.checklistDismissed = true; }); while (modalStack.length) modalStack[modalStack.length - 1].close(); ui.month = D.addMonths(D.thisMonth(), -1); renderFresh(); document.getElementById('toasts').innerHTML = ''; });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('toasts').innerHTML = '');
  await page.screenshot({ path: path.join(out, `60-${name}-overview.png`), fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(name, w, 'overflow', overflow);
  if (w >= 900) {
    await page.click('#railBtn'); await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, `60-${name}-rail.png`), fullPage: false });
  }
  await ctx.close();
}
await browser.close();
