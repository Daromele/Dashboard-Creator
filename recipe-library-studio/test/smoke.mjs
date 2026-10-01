// Browser smoke test: every screen and the main flows in Chromium, through the local dev server.
//   node test/smoke.mjs [shots-dir]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const PORT = 8899 + Math.floor(Math.random() * 50), BASE = `http://localhost:${PORT}`, shots = process.argv[2];
const srv = spawn(process.execPath, ['dev-server.mjs', String(PORT)], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, ALLOW_PRIVATE_URLS: '1' }, stdio: 'pipe' });
await new Promise(r => srv.stdout.once('data', r));
const errors = [], fail = m => { errors.push(m); console.log('FAIL', m); }, ok = (c, m) => c ? console.log('ok', m) : fail(m);
const browser = await pw.chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', e => fail('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fail('console: ' + m.text()); });
  const shot = async n => { if (!shots) return; await page.evaluate(() => { document.querySelector('#toast').hidden = true; document.activeElement?.blur(); }); await page.screenshot({ path: `${shots}/${n}.png`, fullPage: true }); };
  await page.goto(BASE + '/');
  await page.waitForSelector('#welcome[open]');
  ok(await page.textContent('#welcome h2') === 'Save any recipe from a link', 'welcome tour opens on first visit');
  await shot('00-welcome');
  await page.click('#welcome [data-action="tour-close"]');
  ok(await page.isVisible('.import-hero .linkbar'), 'empty kitchen leads with the link bar');
  await shot('01-empty');

  // the headline flow: paste a link, recipe saved and opened
  await page.fill('.import-hero input[name=url]', `${BASE}/fixtures/wprm-graph.html?utm_source=pin`);
  await page.click('.import-hero [data-import-go]');
  await page.waitForSelector('.recipe-hero h1');
  ok(await page.textContent('.recipe-hero h1') === 'Marbled Banana Bread & Chocolate', 'link import saves and opens the recipe');
  ok((await page.$$('.ing label')).length === 6, '6 ingredients');
  ok((await page.$$('.steps-list li')).length === 4 && (await page.$$('.sec-name')).length === 2, '2 named sections, 4 steps');
  ok(/Saved “Marbled/.test(await page.textContent('#toast')), 'toast names what was saved');
  await page.click('[data-action="units"][data-k="Metric"]');
  ok(/ml|g /.test(await page.textContent('.ing')), 'metric conversion shows');
  await page.click('[data-action="serves"][data-d="1"]');
  await shot('02-recipe');
  // same link again: offered the existing copy
  await page.click('.topbar [data-action="add"]');
  await page.fill('#link-form input[name=url]', `${BASE}/fixtures/wprm-graph.html`);
  await page.click('#link-form button[type=submit]');
  await page.waitForSelector('.import-status .notice');
  ok(/Already in your library/.test(await page.textContent('.import-status')), 'duplicate link is caught');
  // a page with no recipe opens the editor with what was found
  await page.fill('.import-hero input[name=url]', `${BASE}/fixtures/no-recipe.html`);
  await page.click('.import-hero [data-import-go]');
  await page.waitForSelector('#recipe-form');
  ok(await page.inputValue('#recipe-form [name=title]') === 'About the Kitchen', 'partial import opens the editor');
  // leaving an edited draft from the sidebar asks first
  await page.fill('#recipe-form [name=description]', 'changed');
  await page.click('.navlink[data-go="import"]');
  await page.waitForSelector('#dlg[open]'); ok(/Leave without saving/.test(await page.textContent('#dlg')), 'leaving a changed draft asks first');
  await page.click('[data-action="ask-ok"]');
  // a 404 shows a clear error with the paste fallback
  await page.fill('.import-hero input[name=url]', `${BASE}/fixtures/missing.html`);
  await page.click('.import-hero [data-import-go]');
  await page.waitForSelector('.import-status .refused');
  ok(/doesn’t exist/.test(await page.textContent('.import-status')) && await page.isVisible('.import-status [data-action="paste"]'), '404 explained, paste offered');
  await shot('03-import-error');
  // paste the page text
  await page.click('.import-status [data-action="paste"]');
  await page.fill('#paste-form textarea', 'Home\n# Lemon Bars\nBright, tangy bars with a buttery crust that everyone asks for again.\nPrep Time: 15 mins\nCook Time: 40 mins\nServings: 16\nIngredients\n1 cup butter\n2 cups flour\n4 eggs\nDirections\nStep 1\nHeat oven to 350°F.\nStep 2\nBake crust 20 minutes.\nNutrition Facts\nCalories 210');
  await page.click('#paste-form button[type=submit]');
  await page.waitForSelector('#recipe-form');
  ok(await page.inputValue('#recipe-form [name=title]') === 'Lemon Bars' && await page.inputValue('#recipe-form [name=total]') === '', 'paste read into the editor');
  await page.click('#recipe-form button[type=submit]');
  await page.waitForSelector('.recipe-hero h1');
  ok(await page.textContent('.rstats') .then(t => /55 min/.test(t)), 'total filled from prep + cook');
  // a real whole-page paste: photo captions and credits never become steps
  await page.click('.topbar [data-action="add"]'); await page.click('#link-form [data-action="paste"]');
  await page.fill('#paste-form textarea', (await import('node:fs')).readFileSync(new URL('./fixtures/paste-allrecipes.txt', import.meta.url), 'utf8'));
  await page.click('#paste-form button[type=submit]'); await page.waitForSelector('#recipe-form');
  const steps = await page.inputValue('#ed-steps');
  ok(steps.split('\n').length === 6 && !/Dotdash|overhead shot/i.test(steps), 'captions and photo credits are left out of the steps');
  ok((await page.inputValue('#ed-ing')).split('\n').length === 12, '12 ingredients, no scale buttons');
  // a photo from an image link
  await page.route('https://img.example/**', r => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64') }));
  await page.fill('#photo-url', 'https://img.example/egusi.jpg'); await page.press('#photo-url', 'Enter');
  await page.waitForSelector('#photo-box img[src="https://img.example/egusi.jpg"]');
  ok(true, 'photo added from an image link');
  await page.click('#recipe-form button[type=submit]'); await page.waitForSelector('.recipe-hero h1');
  ok(await page.textContent('.recipe-hero h1') === 'Egusi Soup' && await page.$('.recipe-hero img[src="https://img.example/egusi.jpg"]'), 'saved with its linked photo');
  await page.click('[data-action="delete-recipe"]'); await page.click('[data-action="ask-ok"]');
  await page.evaluate(() => openRecipe(state.recipes.find(r => r.title === 'Lemon Bars').id)); await page.waitForSelector('.recipe-hero h1');
  await page.click('[data-action="made"]');
  await page.click('[data-action="undo"]');
  ok(/Not made yet/.test(await page.textContent('.rate')), 'undo works');
  // shopping list from a recipe
  await page.click('[data-action="shop-recipe"]');
  // reload keeps everything
  await page.reload(); await page.waitForSelector('#content .pagehead');
  await page.waitForTimeout(600); ok(await page.isVisible('#welcome[open]') && /Keep your recipes safe/.test(await page.textContent('#welcome')), 'backup reminder shows once there are recipes and no backup');
  await page.click('#welcome [data-action="tour-close"]');
  await page.click('.navlink[data-go="library"]');
  ok((await page.$$('.rcard')).length === 2, 'library has 2 recipes after reload');
  await page.click('.navlink[data-go="shopping"]');
  ok((await page.$$('.shop-row')).length === 3, '3 shopping items saved');
  await page.click('.shop-row input'); await page.waitForTimeout(50);
  // copy the list for another app: what's left to buy, one item per line
  await page.click('[data-action="copy-shop"]'); await page.waitForTimeout(100);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  ok(copied.split('\n').length === 2 && !/butter/.test(copied), 'Copy list copies the 2 items still to buy');
  // print documents replace the screen while printing, then clear
  await page.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await page.click('[data-action="print"]'); await page.waitForFunction(() => window.__printed === 1);
  ok(await page.evaluate(() => document.body.classList.contains('printing') && !!document.querySelector('#print-root .pd-shop .pd-item')), 'shopping list prints as a document');
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  ok(await page.evaluate(() => !document.body.classList.contains('printing') && !document.querySelector('#print-root').innerHTML), 'print document cleared afterwards');
  // PWA pieces are served
  ok((await page.evaluate(async () => (await fetch('manifest.webmanifest')).status)) === 200 && (await page.evaluate(async () => (await fetch('sw.js')).status)) === 200, 'manifest and service worker are served');
  ok((await page.$$('.shop-row.done')).length === 1, 'check off an item');

  // sample mode: every screen
  await page.click('#rail-demo');
  for (const s of ['dashboard', 'library', 'collections', 'import', 'plan', 'shopping', 'guide', 'settings']) {
    await page.evaluate(id => go(id), s); await page.waitForTimeout(80);
    ok(await page.$('#content .pagehead, #content .hero'), 'screen renders: ' + s);
    await shot('10-' + s);
  }
  await page.evaluate(() => go('library'));
  await page.click('[data-action="lib-view"][data-k="table"]'); await shot('11-library-table');
  await page.click('.titlecell button'); await page.waitForSelector('.recipe-hero'); await shot('12-sample-recipe');
  await page.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; window.__printed = 0; });
  await page.click('[data-action="print"]'); await page.waitForFunction(() => window.__printed === 1);
  ok(await page.evaluate(() => !!document.querySelector('#print-root .pd-recipe .pd-steps li')), 'recipe prints as a recipe card');
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await page.click('[data-action="copy-ing"]'); await page.waitForTimeout(100);
  ok((await page.evaluate(() => navigator.clipboard.readText())).split('\n').length >= 4, 'ingredients copy');
  await page.evaluate(() => go('collections')); await page.click('.ccard [data-action="book"]'); await page.waitForSelector('#book-form');
  await page.click('#book-form label:has(input[value=modern])'); await page.click('#book-form button[type=submit]');
  await page.waitForFunction(() => window.__printed === 2);
  ok(await page.evaluate(() => document.querySelectorAll('#print-root .pd-cover.cv-modern').length === 1 && document.querySelectorAll('#print-root .pd-recipe').length >= 2 && !!document.querySelector('#print-root .pd-toc')), 'recipe book: cover, contents and recipes');
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await page.evaluate(() => go('library')); await page.click('.titlecell button'); await page.waitForSelector('.recipe-hero');
  await page.click('[data-action="cook"]'); await page.waitForSelector('.cook-step');
  await page.keyboard.press('ArrowRight');
  ok(/step 2/i.test(await page.textContent('.cook .eyebrow')), 'cook mode arrow keys');
  await page.click('.cook [data-action="timer"]').catch(() => {});
  await shot('13-cook');
  await page.evaluate(() => go('plan'));
  ok((await page.$$('.meal')).length >= 6, 'sample week is planned');
  await page.click('[data-action="sample"].rail-demo');
  ok((await page.$$('.navlink')).length === 7, 'back to own data');
  // dark theme + phone width
  await page.evaluate(() => go('settings')); await page.click('[data-k="night"]'); await page.evaluate(() => go('dashboard')); await shot('20-dark-dashboard');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const s of ['dashboard', 'library', 'import', 'plan', 'shopping', 'settings']) {
    await page.evaluate(id => go(id), s); await page.waitForTimeout(60);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(over <= 0, `no sideways scroll at 390px: ${s} (${over})`);
  }
  await page.evaluate(() => { go('library'); }); await shot('30-phone-library');
  await page.evaluate(() => { openRecipe(state.recipes[0].id); }); await shot('31-phone-recipe');
} finally { await browser.close(); srv.kill(); }
console.log(errors.length ? `\n${errors.length} problem(s)` : '\nall smoke checks passed');
process.exit(errors.length ? 1 : 0);
