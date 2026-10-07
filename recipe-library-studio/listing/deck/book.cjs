// Prints a recipe book from the staged library (Weeknight dinners, photos on) and composes tab-book.jpg for the deck.
//   NODE_USE_ENV_PROXY=1 node book.cjs shots-photos
const { chromium } = require(require.resolve('playwright', { paths: ['/opt/node22/lib/node_modules', '.'] }));
const { execFileSync } = require('child_process'), path = require('path'), fs = require('fs');
const OUT = path.resolve(process.argv[2] || 'shots-photos'), HERE = __dirname, TMP = path.join(HERE, 'book-tmp');
fs.mkdirSync(TMP, { recursive: true });
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(u => /^https?:/.test(u.href), async route => { try { const r = await fetch(route.request().url(), { headers: { 'user-agent': 'Mozilla/5.0 Chrome/128.0' } }); await route.fulfill({ status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream' }, body: Buffer.from(await r.arrayBuffer()) }); } catch { await route.abort(); } });
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(HERE, '../../site/index.html')); await p.waitForTimeout(800);
  await p.addScriptTag({ path: path.join(HERE, 'userdata.js') }); await p.addScriptTag({ path: path.join(HERE, 'stage.js') });
  await p.evaluate(async () => { await window.__stage(); window.print = () => { window.__printed = 1; }; go('collections'); });
  await p.click('.ccard [data-action="book"]'); await p.waitForSelector('#book-form');
  await p.click('#book-form label:has(input[value=modern])').catch(() => {});
  const photos = p.locator('#book-form input[name=photos]'); if (!(await photos.isChecked())) await photos.check();
  await p.click('#book-form button[type=submit]'); await p.waitForFunction(() => window.__printed === 1);
  await p.evaluate(() => Promise.all([...document.querySelectorAll('#print-root img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 10000); }))));
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: path.join(TMP, 'book.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
  await b.close();
  execFileSync('pdftoppm', ['-png', '-r', '110', '-f', '1', '-l', '4', path.join(TMP, 'book.pdf'), path.join(TMP, 'p')]);
  console.log(fs.readdirSync(TMP).join(' '));
})();
