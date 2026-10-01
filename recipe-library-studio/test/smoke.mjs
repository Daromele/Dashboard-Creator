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
  // bulk import: several links, one duplicate, one without a recipe, one missing
  await page.evaluate(() => go('import'));
  await page.fill('#bulk-text', `${BASE}/fixtures/dotdash-array.html\n${BASE}/fixtures/string-instructions.html\nsee ${BASE}/fixtures/wprm-graph.html,\n${BASE}/fixtures/no-recipe.html\n${BASE}/fixtures/nope.html`);
  await page.evaluate(() => { window.__sleep = sleep; });
  await page.click('[data-form="bulk"] button');
  await page.waitForFunction(() => !bulk.running, null, { timeout: 60000 });
  const st = await page.evaluate(() => bulk.items.map(i => i.status).join(','));
  ok(st === 'saved,saved,dupe,review,failed', 'bulk import: ' + st);
  ok(await page.evaluate(() => state.recipes.some(r => r.title === 'Weeknight Chili') && state.recipes.some(r => r.tags.includes('needs review'))), 'bulk saved recipes, partial one tagged needs review');
  await page.evaluate(() => { const ids = new Set(bulk.items.filter(i => i.status === 'saved' || i.status === 'review').map(i => i.id)); state.recipes = state.recipes.filter(r => !ids.has(r.id)); save(); bulk.items = []; });
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
  await page.click('[data-action="made"]'); await page.waitForSelector('#made-form');
  await page.click('#made-form .rate-pick label:nth-child(4)'); await page.fill('#made-form [name=note]', 'Less sugar next time.'); await page.click('#made-form button[type=submit]');
  ok(await page.evaluate(() => { const r = state.recipes.find(x => x.title === 'Lemon Bars'); return r.made.length === 1 && r.rating === 4 && r.cooklog[0].note === 'Less sugar next time.'; }), 'Made it logs the day, rating and note');
  ok(/Less sugar next time/.test(await page.textContent('.cooklog')), 'cook log shows on the recipe');
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
  // uncategorized: from the chart into the library, select them all, give them a category
  await page.evaluate(() => { lib.view = 'grid'; go('dashboard'); });
  await page.click('.kit-key-row.linked:has-text("Uncategorized")');
  ok(await page.evaluate(() => screen === 'library' && lib.cat === 'none') && (await page.$$('.rcard')).length === 2, 'chart slice opens the 2 uncategorized recipes');
  await page.click('[data-action="sel-all"]');
  ok((await page.$$('.rcard.picked')).length === 2, 'select all of them');
  await page.click('[data-action="bulk-cat"]'); await page.fill('#bulk-cat-form [name=v]', 'Dinner'); await page.click('#bulk-cat-form button[type=submit]');
  ok(await page.evaluate(() => state.recipes.filter(r => !r.categories.length).length === 0 && state.recipes.find(r => r.id === 's7').categories[0] === 'Dinner'), 'bulk category set');
  await page.click('[data-action="sel-mode"]');
  // tags on a recipe page: add with Enter, remove with ×
  await page.evaluate(() => openRecipe('s3')); await page.fill('.chip-add[data-chip="tags"]', 'weeknight, sheet pan'); await page.press('.chip-add[data-chip="tags"]', 'Enter');
  ok(await page.evaluate(() => ['weeknight', 'sheet pan'].every(t => recipeById('s3').tags.includes(t))), 'tags added on the recipe page');
  await page.click('[data-action="chip-x"][data-k="tags"][data-v="weeknight"]');
  ok(await page.evaluate(() => !recipeById('s3').tags.includes('weeknight') && recipeById('s3').tags.includes('sheet pan')), 'tag removed with ×');
  // categories & tags tab: rename merges, delete removes everywhere
  await page.evaluate(() => go('tags'));
  await page.click('[data-action="facet-rename"][data-k="categories"][data-v="Side"]'); await page.fill('#facet-form [name=to]', 'Dinner'); await page.click('#facet-form button[type=submit]');
  ok(await page.evaluate(() => !state.recipes.some(r => r.categories.includes('Side'))), 'renaming a category onto another merges them');
  await page.click('[data-action="facet-del"][data-k="tags"][data-v="make ahead"]'); await page.click('[data-action="ask-ok"]');
  ok(await page.evaluate(() => !state.recipes.some(r => r.tags.includes('make ahead'))), 'tag deleted from every recipe');
  await page.evaluate(() => go('plan'));
  ok((await page.$$('.meal')).length >= 6, 'sample week is planned');
  // pantry: what can I cook, and pantry items stay off the list
  await page.evaluate(() => go('pantry'));
  ok((await page.$$('.cook-row')).length >= 3, 'pantry suggests recipes to cook');
  await page.fill('#pantry-text', 'coconut milk, ginger'); await page.press('#pantry-text', 'Enter');
  ok(await page.evaluate(() => state.pantry.includes('coconut milk') && state.pantry.includes('ginger')), 'pantry items added');
  ok(await page.evaluate(() => { const x = Logic.cookable(state).find(c => c.r.id === 's4'); return x.missing.every(l => !/garlic|onion|coconut|curry/i.test(l)); }), 'curry no longer misses what the pantry has');
  ok(await page.evaluate(() => { const before = state.shopping.length; state.shopping = []; const res = shopAdd(recipeById('s4').ingredients, { from: 'x' }); return res.skipped >= 4 && !state.shopping.some(i => /garlic|coconut milk/i.test(i.text)); }), 'adding a recipe skips pantry items');
  await page.evaluate(() => go('shopping')); await page.click('[data-action="shop-staples"]');
  ok(await page.evaluate(() => ['milk', 'bananas', 'bread'].every(s => state.shopping.some(i => i.text === s))), 'staples added to the list');
  // plan: servings scale the list, fill my week, copy last week, drag to move
  await page.evaluate(() => go('plan'));
  ok(/serves 6/.test(await page.textContent('.week')), 'planned servings show on the meal');
  await page.evaluate(() => { state.shopping = []; ACTIONS['shop-week'](); });
  ok(await page.evaluate(() => state.shopping.some(i => /600 g pasta|1 1\/2 cups grated parmesan|¾ cup grated parmesan/.test(i.text) || i.text.startsWith('600 g pasta'))), 'meal servings scale the shopping list');
  const before = await page.evaluate(() => state.plans.length);
  await page.click('[data-action="plan-fill"]');
  ok(await page.evaluate(n => state.plans.length > n, before), 'fill my week adds dinners');
  await page.click('[data-action="week"][data-d="1"]'); await page.click('[data-action="plan-copy"]');
  ok(await page.evaluate(() => state.plans.filter(p => p.date >= week && p.date <= addDays(week, 6)).length >= 6), 'copy last week');
  const meal = page.locator('.meal').first(), target = page.locator('.day').nth(6);
  const id = await meal.getAttribute('data-meal'); await meal.dragTo(target);
  ok(await page.evaluate(i => state.plans.find(p => p.id === i).date === addDays(week, 6), id), 'drag a meal to another day');
  // library time filter
  await page.evaluate(() => { Object.assign(lib, { time: 20, cat: '', col: '', q: '', filter: 'all', view: 'grid' }); go('library'); });
  ok(await page.evaluate(() => libRows().every(r => r.total && r.total <= 20) && libRows().length >= 2), 'time filter');
  await page.evaluate(() => { lib.time = 0; });
  await page.click('[data-action="sample"].rail-demo');
  ok((await page.$$('.navlink')).length === 8, 'back to own data');
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
