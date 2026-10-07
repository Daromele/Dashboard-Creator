// The download edition, opened straight from disk the way a buyer opens it: lookups go to the catalogs directly,
// links without an ISBN ask for the title, nothing calls our server, no install.   node test/download.mjs
import { createRequire } from 'node:module';
import { catalog, calls } from './catalog.mjs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const FILE = 'file://' + new URL('../download/Book-Library-Studio.html', import.meta.url).pathname;
const errors = [], fail = m => { errors.push(m); console.log('FAIL', m); }, ok = (c, m) => c ? console.log('ok', m) : fail(m);
const browser = await pw.chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https:\/\/(openlibrary\.org|covers\.openlibrary\.org|www\.googleapis\.com)\//, catalog);
  const server = []; await ctx.route(/\.netlify\/functions\//, r => { server.push(r.request().url()); r.abort(); });
  const page = await ctx.newPage();
  page.on('pageerror', e => fail('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FILE_NOT_FOUND/.test(m.text())) fail('console: ' + m.text()); });
  await page.goto(FILE); await page.waitForSelector('#welcome[open]'); await page.click('#welcome [data-action="tour-close"]');
  ok(await page.evaluate(() => DL && !document.querySelector('link[rel=manifest]')), 'download edition, no app manifest');
  ok(/download edition/.test(await page.textContent('#rail-version')) && await page.isHidden('#rail-install'), 'labelled, no install button');
  const find = async q => { await page.fill('#find-a', q); await page.click('[data-find-go]'); await page.waitForFunction(() => !find.busy); };
  await find('9780593135204');
  ok(/Project Hail Mary/.test(await page.textContent('.result')), 'ISBN lookup works from a file');
  await page.click('.result [data-action="add-result"][data-k="want"]'); await page.waitForSelector('.book-hero h1');
  await page.waitForSelector('.desc'); ok(/Ryland Grace/.test(await page.textContent('.desc')), 'description filled in');
  await page.click('.topbar [data-action="add"]'); await page.waitForSelector('#find-a');
  await find('https://bookshop.org/p/books/dune-frank-herbert/6431?ean=9780441172719');
  ok(/Dune/.test(await page.textContent('.result')), 'links with an ISBN work');
  await find('https://www.amazon.es/dp/B0CNVR8ZX8/ref=sspa_dk_detail_4');
  ok(/doesn’t include the book’s ISBN/.test(await page.textContent('.find-status')), 'a link without an ISBN asks for the title');
  await find('hail mary');
  ok(await page.evaluate(() => find.results[0]?.sourceUrl.includes('amazon.es')), 'and keeps the link');
  ok(await page.evaluate(async () => { try { await getJSON(GB + '?q=ratelimit'); return false; } catch (e) { return e.why === 'limit'; } }), 'Google’s keyless limit: no server fallback, a clear message');
  await page.evaluate(() => go('settings')); ok(/Keep this file in one place/.test(await page.textContent('#content')) && !/Install the app/.test(await page.textContent('#content')), 'settings explain the file, no install card');
  await page.evaluate(() => go('guide')); ok(/Where should I keep this file/.test(await page.textContent('#content')), 'guide explains where to keep the file');
  await page.reload(); await page.waitForTimeout(500);
  ok(await page.evaluate(() => state.books.length === 1), 'books are still there after reopening the file');
  ok(!server.length, 'never calls our server');
  // the file opened on a phone: it says up front to use the web app, and a failed lookup says why
  const phone = await browser.newContext({ ...pw.devices['iPhone 13'], reducedMotion: 'reduce' });
  await phone.route(/^https:\/\/(openlibrary\.org|www\.googleapis\.com)\//, r => r.abort());   // as an iPhone browser does for a downloaded file
  const pp = await phone.newPage(); await pp.goto(FILE); await pp.evaluate(() => localStorage.setItem(CONFIG.storageKey + '-welcome-v1', '1')); await pp.reload(); await pp.waitForSelector('#content .pagehead');
  ok(await pp.isVisible('#install-banner') && /use the web app/.test(await pp.textContent('#install-banner')) && /book-library-studio\.netlify\.app/.test(await pp.getAttribute('#install-banner a', 'href')), 'phone: told to use the web app, with a link');
  await pp.fill('#find-a', '9780593135204'); await pp.click('[data-find-go]'); await pp.waitForFunction(() => !find.busy);
  ok(/Phones don’t let a downloaded file go online/.test(await pp.textContent('.find-status')) && await pp.isVisible('.find-status a[href*="netlify.app"]'), 'phone: a failed lookup explains why and links the web app');
  ok(await page.isHidden('#install-banner'), 'computer: no phone notice');
  await phone.close();
} finally { await browser.close(); }
if (errors.length) { console.log(`\n${errors.length} failure(s)`); process.exit(1); }
console.log('\nall download checks passed');
