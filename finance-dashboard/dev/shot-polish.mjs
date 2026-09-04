import { createRequire } from 'module'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/playwright/package.json'); const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname); const file = 'file://' + path.resolve(here, '..', 'Personal_Finance_Dashboard.html');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1380, height: 900 }, reducedMotion: 'reduce' });
await page.goto(file); await page.waitForSelector('#wizBody');
await page.click('#wizNext'); await page.click('#wizNext'); await page.waitForTimeout(100); await page.screenshot({ path: path.join(here, 'shots', '50-wizard-look.png') });
await page.click('#wizNext'); await page.click('label:has(input[name=data][value=sample])'); await page.click('#wizNext'); await page.waitForTimeout(300); await page.click('#tourSkip'); await page.waitForTimeout(200);
await page.click('[data-action=monthShift][data-n="-1"]'); await page.waitForTimeout(150); await page.evaluate(() => document.getElementById('toasts').innerHTML = '');
await page.screenshot({ path: path.join(here, 'shots', '50-overview.png'), fullPage: true });
for (const v of ['savings', 'debt', 'bills', 'settings', 'budget', 'income']) { await page.click(`#nav button[data-view=${v}]`); await page.waitForTimeout(150); await page.screenshot({ path: path.join(here, 'shots', `50-${v}.png`), fullPage: v !== 'settings' && v !== 'budget' }); }
await browser.close();
