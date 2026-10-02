// Screenshots of the app in sample mode for the Etsy listing images.  node listing/shoot.mjs
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const OUT = new URL('./shots/', import.meta.url).pathname, PORT = 8960, BASE = `http://localhost:${PORT}`;
const srv = spawn(process.execPath, ['dev-server.mjs', String(PORT)], { cwd: new URL('..', import.meta.url).pathname, stdio: 'pipe' });
await new Promise(r => srv.stdout.once('data', r));
const browser = await pw.chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/'); await page.waitForSelector('#welcome[open]');
  await page.click('#welcome [data-action="tour-close"]');
  await page.evaluate(() => { state = sampleData(); state.recipes.forEach(r => r.sample = false); localStorage.setItem(CONFIG.storageKey + '-manual-backup', String(Date.now())); save(); render(); });
  await page.addStyleTag({ content: '.banner,#toast{display:none!important}' });
  const snap = async (name, fn) => { await page.evaluate(fn); await page.waitForTimeout(700); await page.evaluate(() => { scrollTo(0, 0); document.activeElement?.blur(); }); await page.screenshot({ path: OUT + name + '.png' }); };
  await snap('dashboard', () => go('dashboard'));
  await snap('library', () => { lib.view = 'grid'; go('library'); });
  await snap('recipe', () => openRecipe('s1'));
  await snap('plan', () => go('plan'));
  await snap('shopping', () => { commit(() => shopAdd(recipeById('s1').ingredients.concat(recipeById('s4').ingredients), {}), '', { quiet: true }); go('shopping'); });
  await snap('pantry', () => go('pantry'));
  await snap('import', () => { lastLink = 'https://www.recipetineats.com/one-pot-chicken-risoni/'; go('import'); });
  await page.evaluate(() => { openRecipe('s1'); }); await page.click('[data-action="cook"]'); await page.waitForSelector('.cook-step');
  await page.waitForTimeout(500); await page.screenshot({ path: OUT + 'cook.png' });
  await page.keyboard.press('Escape').catch(() => {});
  // printed recipe book: cover + contents + a recipe page
  await page.evaluate(() => { window.print = () => { window.__printed = 1; }; go('collections'); });
  await page.click('.ccard [data-action="book"]'); await page.waitForSelector('#book-form');
  await page.click('#book-form label:has(input[value=modern])').catch(() => {});
  await page.click('#book-form button[type=submit]'); await page.waitForFunction(() => window.__printed === 1);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: OUT + 'book.pdf', format: 'Letter', printBackground: true, preferCSSPageSize: true });
  execFileSync('pdftoppm', ['-png', '-r', '110', '-f', '1', '-l', '3', OUT + 'book.pdf', OUT + 'book']);
  await page.emulateMedia({ media: 'screen' }); await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  // phone
  await page.setViewportSize({ width: 390, height: 844 });
  await snap('phone-recipe', () => openRecipe('s4'));
  await snap('phone-shopping', () => go('shopping'));
  await snap('phone-dashboard', () => go('dashboard'));
} finally { await browser.close(); srv.kill(); }
console.log('shots saved');
