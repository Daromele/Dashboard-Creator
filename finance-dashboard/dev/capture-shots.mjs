// Capture product screenshots (sample data, USD) for the mockup deck and guides.
import { createRequire } from 'module';
import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = 'file://' + path.resolve(here, '..', 'Personal_Finance_Dashboard.html');
const out = path.resolve(here, '..', 'listing', 'assets');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
async function setup(ctx) {
  const page = await ctx.newPage();
  await page.goto(file); await page.waitForSelector('#wizBody');
  await page.click('label:has(input[name=mode][value=couple])'); await page.fill('input[name=p1]', 'Alex'); await page.fill('input[name=p2]', 'Sam');
  await page.click('#wizNext'); await page.click('#wizNext'); await page.click('label:has(input[name=data][value=sample])'); await page.click('#wizNext');
  await page.waitForTimeout(300); await page.evaluate(() => document.getElementById('toasts').innerHTML = '');
  await page.click('[data-action=monthShift][data-n="-1"]'); await page.waitForTimeout(150);   // show a complete month
  return page;
}
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await setup(ctx);
const shot = async (name, opts) => { await page.evaluate(() => document.getElementById('toasts').innerHTML = ''); await page.screenshot(Object.assign({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 82 }, opts || {})); console.log('captured', name); };
await shot('overview');
await page.click('#nav button[data-view=budget]'); await page.waitForTimeout(100); await shot('budget');
await page.click('#nav button[data-view=bills]'); await page.click('[data-action=calMode][data-mode=calendar]'); await page.waitForTimeout(100); await shot('calendar');
await page.click('[data-action=calMode][data-mode=list]'); await page.waitForTimeout(100); await shot('bills');
await page.click('#nav button[data-view=debt]'); await page.waitForTimeout(100); await shot('debt');
await page.click('#nav button[data-view=savings]'); await page.waitForTimeout(100); await shot('savings');
await page.click('#nav button[data-view=networth]'); await page.waitForTimeout(100); await shot('networth');
await page.click('#nav button[data-view=reports]'); await page.waitForTimeout(100); await shot('reports');
await page.click('#nav button[data-view=transactions]'); await page.waitForTimeout(100); await shot('transactions');
await page.click('#nav button[data-view=income]'); await page.waitForTimeout(100); await shot('income');
await page.click('#nav button[data-view=settings]'); await page.waitForTimeout(100); await shot('settings');
await page.click('#nav button[data-view=overview]'); await page.waitForTimeout(100);
// close-ups
const kpis = await page.$('.grid.grid-5'); await kpis.screenshot({ path: path.join(out, 'kpis.jpg'), type: 'jpeg', quality: 85 });
await page.locator('.card', { hasText: 'Safe to spend' }).first().screenshot({ path: path.join(out, 'safe-to-spend.jpg'), type: 'jpeg', quality: 85 });
await page.locator('.card', { hasText: 'Household split' }).first().screenshot({ path: path.join(out, 'household-split.jpg'), type: 'jpeg', quality: 85 });
await page.click('#nav button[data-view=transactions]'); await page.click('[data-action=txnAdd]'); await page.fill('#genForm [name=description]', 'Weekly shop — Costco'); await page.fill('#genForm [name=split_amt_0]', '150'); await page.click('#genForm [data-action=splitAdd]'); await page.selectOption('#genForm [name=split_cat_1]', 'Pets'); await page.fill('#genForm [name=split_amt_1]', '22'); await page.waitForTimeout(100);
await (await page.$('.modal')).screenshot({ path: path.join(out, 'txn-form.jpg'), type: 'jpeg', quality: 85 }); await page.keyboard.press('Escape');
await page.click('#nav button[data-view=debt]'); await page.locator('.card', { hasText: 'Strategy comparison' }).first().screenshot({ path: path.join(out, 'strategy.jpg'), type: 'jpeg', quality: 85 });
await ctx.close();
// mobile
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const mp = await setup(mctx);
await mp.screenshot({ path: path.join(out, 'mobile-overview.jpg'), type: 'jpeg', quality: 82 });
await mp.click('.hamburger'); await mp.waitForTimeout(250); await mp.screenshot({ path: path.join(out, 'mobile-nav.jpg'), type: 'jpeg', quality: 82 });
await mp.click('#nav button[data-view=bills]'); await mp.click('[data-action=calMode][data-mode=calendar]'); await mp.waitForTimeout(150); await mp.screenshot({ path: path.join(out, 'mobile-calendar.jpg'), type: 'jpeg', quality: 82 });
// tablet
const tctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1.5 });
const tp = await setup(tctx); await tp.click('#nav button[data-view=savings]'); await tp.waitForTimeout(150); await tp.screenshot({ path: path.join(out, 'tablet-savings.jpg'), type: 'jpeg', quality: 82 });
await browser.close();
