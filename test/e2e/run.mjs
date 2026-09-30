// End-to-end tests. Run: npm run test:e2e            (all)
//                        npm run test:e2e -- cooking (only scenarios whose name matches)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  root, launch, startApp, startFixtureSite, Runner, until,
} from './harness.mjs';
import { registerPart2 } from './part2.mjs';
import { registerPart3 } from './part3.mjs';
import { openApp, seed, SAMPLE_RECIPES, hasNoOverflow } from './helpers.mjs';

const browser = await launch();
const site = await startFixtureSite(browser);
const app = await startApp();
const runner = new Runner({ browser, app, site });
const { test } = runner;

// ---------------------------------------------------------------------------------------------
test('first run: three onboarding screens, no account, shown only once', async ({ ctx, app }) => {
  const page = await ctx.newPage();
  await page.goto(app);
  const dlg = page.locator('dialog.onboarding');
  await dlg.waitFor();
  assert.match(await dlg.locator('h3').textContent(), /Save recipes without the copy-and-paste work\./);
  await dlg.getByRole('button', { name: 'Next' }).click();
  assert.match(await dlg.locator('h3').textContent(), /Paste a recipe link and we’ll organize it for you\./);
  await dlg.getByRole('button', { name: 'Back' }).click();
  await dlg.getByRole('button', { name: 'Next' }).click();
  await dlg.getByRole('button', { name: 'Next' }).click();
  assert.match(await dlg.locator('h3').textContent(), /Your recipes stay in your personal library on this device\./);
  await dlg.getByRole('button', { name: 'Start My Recipe Library' }).click();
  await dlg.waitFor({ state: 'detached' });
  assert.equal(await page.locator('h1').first().textContent(), 'My Recipes');
  assert.equal(await page.getByText('No recipes yet.').count(), 1);
  assert.equal(await page.getByText('Paste your first recipe link to start your library.').count(), 1);
  await page.reload();
  await page.locator('h1').first().waitFor();
  assert.equal(await page.locator('dialog.onboarding').count(), 0, 'onboarding must not reappear');
});

// ---------------------------------------------------------------------------------------------
test('PWA installability: manifest, icons, service worker, theme colour', async ({ ctx, app }) => {
  const page = await openApp(ctx, app);
  const manifestUrl = await page.locator('link[rel=manifest]').getAttribute('href');
  const res = await page.request.get(new URL(manifestUrl, app).href);
  assert.equal(res.status(), 200);
  assert.match(res.headers()['content-type'], /manifest\+json|json/);
  const m = await res.json();
  assert.equal(m.name, 'Recipe Library Studio');
  assert.ok(m.short_name && m.short_name.length <= 12);
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, '/');
  assert.ok(m.theme_color && m.background_color);
  const sizes = m.icons.map((i) => `${i.sizes}:${i.purpose}`);
  assert.ok(sizes.includes('192x192:any') && sizes.includes('512x512:any') && sizes.includes('512x512:maskable'), sizes.join());
  for (const icon of m.icons) {
    const r = await page.request.get(new URL(icon.src, app).href);
    assert.equal(r.status(), 200, icon.src);
    assert.match(r.headers()['content-type'], /image\//);
  }
  // service worker registers, activates and controls the page
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await until(() => page.evaluate(() => !!navigator.serviceWorker.controller), { message: 'SW controlling the page' });
  const swText = await (await page.request.get(`${app}/service-worker.js`)).text();
  assert.match(swText, /const VERSION = '[0-9a-f]{12}'/);
  assert.match(swText, /"\/index\.html"/);
  assert.match(swText, /"\/src\/app\.js"/);
  assert.ok(!/"\/functions\//.test(swText) && !/"\/test\//.test(swText));
  const caches = await page.evaluate(async () => { const names = await caches.keys(); const c = await caches.open(names.find((n) => n.startsWith('rls-shell'))); return (await c.keys()).length; });
  assert.ok(caches > 25, `shell precached (${caches} files)`);
  assert.equal(await page.locator('meta[name=theme-color]').getAttribute('content'), '#ffffff');
  assert.equal(await page.locator('link[rel=apple-touch-icon]').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  // cache headers for the service worker must force revalidation
  const swHeaders = (await page.request.get(`${app}/service-worker.js`)).headers();
  assert.match(swHeaders['cache-control'] || '', /no-cache/);
});

// ---------------------------------------------------------------------------------------------
test('recipe CRUD: create manually, edit, add notes, delete', async ({ ctx, app }) => {
  const page = await openApp(ctx, app);
  await page.getByRole('button', { name: 'Create a recipe manually' }).click();
  await page.getByRole('heading', { name: 'New Recipe', level: 1 }).waitFor();

  // validation: title is required
  await page.getByRole('button', { name: 'Save Recipe' }).click();
  assert.match(await page.locator('.field-error:not([hidden])').first().textContent(), /give the recipe a name/i);
  assert.equal(await page.getByLabel('Recipe name').getAttribute('aria-invalid'), 'true');
  // validation: bad URL and bad time
  await page.getByLabel('Recipe name').fill('Garlic Green Beans');
  await page.getByLabel('Original URL').fill('not a url with spaces');
  await page.getByLabel('Prep time').fill('soon');
  await page.getByRole('button', { name: 'Save Recipe' }).click();
  const errs = await page.locator('.field-error:not([hidden])').allTextContents();
  assert.ok(errs.some((t) => /web address/i.test(t)) && errs.some((t) => /minutes/i.test(t)), errs.join('|'));

  await page.getByLabel('Original URL').fill('');
  await page.getByLabel('Prep time').fill('10');
  await page.getByLabel('Cook time').fill('1h 5');
  await page.getByLabel('Servings').fill('4');
  await page.getByLabel('Category').fill('Dinner');
  await page.getByLabel('Category').press('Enter');
  await page.getByLabel('Cuisine').fill('Italian');
  await page.getByLabel('Cuisine').press('Enter');
  await page.getByLabel('Ingredients').fill('1 lb green beans, trimmed\n3 cloves garlic, minced\n2 tbsp olive oil\nSalt to taste');
  await page.getByLabel('Instructions').fill('Blanch the beans for 3 minutes.\nSaute the garlic in oil.\nToss together and season.');
  await page.getByLabel('Tags').fill('side, quick');
  await page.getByLabel('Tags').press('Enter');
  await page.getByRole('button', { name: 'Save Recipe' }).click();

  await page.locator('h1.recipe-title').waitFor();
  assert.equal(await page.locator('h1.recipe-title').textContent(), 'Garlic Green Beans');
  const summary = await page.locator('.summary-grid').textContent();
  assert.match(summary, /10 min/); assert.match(summary, /1 hr 5 min/); assert.match(summary, /Italian/); assert.match(summary, /Dinner/);
  assert.equal(await page.locator('.ingredient').count(), 4);
  assert.equal(await page.locator('.steps .step').count(), 3);
  assert.equal(await page.getByText('My own recipe').count(), 1);

  // reload: still there (IndexedDB)
  await page.reload();
  await page.locator('h1.recipe-title').waitFor();
  assert.equal(await page.locator('h1.recipe-title').textContent(), 'Garlic Green Beans');

  // personal notes (autosave, separate from instructions)
  await page.getByLabel('My notes for this recipe').fill('Use less garlic next time. Kids liked it.');
  await until(async () => (await page.locator('.notes-status').textContent()) === 'Saved', { message: 'notes saved' });
  await page.reload();
  assert.equal(await page.getByLabel('My notes for this recipe').inputValue(), 'Use less garlic next time. Kids liked it.');

  // edit
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('heading', { name: 'Edit Recipe', level: 1 }).waitFor();
  assert.equal(await page.getByLabel('Recipe name').inputValue(), 'Garlic Green Beans');
  assert.match(await page.getByLabel('Ingredients').inputValue(), /3 cloves garlic, minced/);
  await page.getByLabel('Recipe name').fill('Lemony Green Beans');
  await page.getByLabel('Ingredients').fill('1 lb green beans\n1 lemon, juiced');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.locator('h1.recipe-title').waitFor();
  assert.equal(await page.locator('h1.recipe-title').textContent(), 'Lemony Green Beans');
  assert.equal(await page.locator('.ingredient').count(), 2);
  assert.equal(await page.getByLabel('My notes for this recipe').inputValue(), 'Use less garlic next time. Kids liked it.', 'notes survive edits');

  // cancel with changes asks for confirmation
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Recipe name').fill('Discard me');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  assert.equal(await page.getByLabel('Recipe name').inputValue(), 'Discard me');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Discard' }).click();
  await page.locator('h1.recipe-title').waitFor();
  assert.equal(await page.locator('h1.recipe-title').textContent(), 'Lemony Green Beans');

  // delete (with confirmation)
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('button', { name: /Delete recipe/ }).click();
  await page.getByRole('button', { name: 'Delete recipe', exact: true }).click();
  await page.getByText('No recipes yet.').waitFor();
});

// ---------------------------------------------------------------------------------------------
test('search, quick filters, filter sheet and sorting', async ({ ctx, app }) => {
  const page = await openApp(ctx, app);
  await seed(page, SAMPLE_RECIPES);
  await page.reload();
  await page.locator('.recipe-card').first().waitFor();
  const titles = async () => page.locator('.recipe-card .card-title').allTextContents();
  const titlesAre = (expected) => until(async () => JSON.stringify((await titles()).sort()) === JSON.stringify([...expected].sort()), { message: `titles to equal ${expected.join(', ') || '(none)'}` });
  await titlesAre(['Lemon Rice', 'Oat Cookies', 'Overnight Oats', 'Roasted Chickpeas', 'Tomato Pasta', 'Web Soup']);
  assert.equal(await page.locator('.result-count').textContent(), '6 recipes');

  const search = page.getByRole('searchbox', { name: 'Search recipes' });
  await search.fill('spaghetti'); // ingredient search
  await titlesAre(['Tomato Pasta']);
  await search.fill('vegan'); // tag search
  await titlesAre(['Roasted Chickpeas']);
  await search.fill('italian'); // cuisine
  await titlesAre(['Tomato Pasta']);
  await search.fill('kids liked'); // notes
  await titlesAre(['Oat Cookies']);
  await search.fill('example.com'); // source website
  await titlesAre(['Web Soup']);
  await search.fill('weeknight dinners'); // collection name (set by seed)
  await titlesAre(['Tomato Pasta', 'Lemon Rice']);
  await search.fill('dinner'); // category (+ the "Weeknight Dinners" collection name)
  await titlesAre(['Tomato Pasta', 'Web Soup', 'Lemon Rice']);
  await search.fill('zzzzqqq');
  await page.getByText('No recipes match').waitFor();
  await page.getByRole('button', { name: 'Clear search & filters' }).click();
  await titlesAre(['Lemon Rice', 'Oat Cookies', 'Overnight Oats', 'Roasted Chickpeas', 'Tomato Pasta', 'Web Soup']);

  // quick filters
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await titlesAre(['Tomato Pasta', 'Roasted Chickpeas']);
  await page.getByRole('button', { name: 'Dinner', exact: true }).click();
  await titlesAre(['Tomato Pasta', 'Web Soup']);
  await page.getByRole('button', { name: 'Breakfast', exact: true }).click();
  await titlesAre(['Overnight Oats']);
  await page.getByRole('button', { name: 'Made Before', exact: true }).click();
  await titlesAre(['Tomato Pasta', 'Overnight Oats']);
  await page.getByRole('button', { name: 'To Try', exact: true }).click();
  await titlesAre(['Roasted Chickpeas', 'Oat Cookies', 'Web Soup', 'Lemon Rice']);
  await page.getByRole('button', { name: 'Desserts', exact: true }).click();
  await titlesAre(['Oat Cookies']);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await titlesAre(['Lemon Rice', 'Oat Cookies', 'Overnight Oats', 'Roasted Chickpeas', 'Tomato Pasta', 'Web Soup']);

  // filter sheet: cuisine
  await page.getByRole('button', { name: 'Filter' }).click();
  const dlg = page.locator('dialog[open]');
  await dlg.getByLabel('Cuisine').selectOption({ label: 'Italian (1)' });
  await dlg.getByRole('button', { name: 'Show recipes' }).click();
  await titlesAre(['Tomato Pasta']);
  assert.equal(await page.locator('.count-badge').first().textContent(), '1');
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Reset' }).click();
  await titlesAre(['Lemon Rice', 'Oat Cookies', 'Overnight Oats', 'Roasted Chickpeas', 'Tomato Pasta', 'Web Soup']);

  // sorting
  await page.getByRole('button', { name: /Sort:/ }).click();
  await page.getByRole('radio', { name: 'Alphabetical' }).click();
  await until(async () => (await titles())[0] === 'Lemon Rice');
  const alpha = await titles();
  assert.deepEqual(alpha, [...alpha].sort((a, b) => a.localeCompare(b)));
  await page.getByRole('button', { name: /Sort:/ }).click();
  await page.getByRole('radio', { name: 'Highest Rated' }).click();
  await until(async () => (await titles())[0] === 'Overnight Oats');
  await page.getByRole('button', { name: /Sort:/ }).click();
  await page.getByRole('radio', { name: 'Cooking Time' }).click();
  await until(async () => (await titles())[0] === 'Oat Cookies', { message: 'quickest first' });
  const byTime = await page.evaluate(async () => { const { queryRecipes, effectiveTotalMinutes } = await import('/src/recipes.js'); return queryRecipes({ sort: 'time' }).map((r) => effectiveTotalMinutes(r)); });
  const known = byTime.filter((x) => x != null);
  assert.deepEqual(known, [...known].sort((a, b) => a - b), 'sorted by cooking time, unknown last');
  await page.getByRole('button', { name: /Sort:/ }).click();
  await page.getByRole('radio', { name: 'Recently Made' }).click();
  await until(async () => (await titles())[0] === 'Tomato Pasta');
});

// ---------------------------------------------------------------------------------------------
test('favorites, personal rating, "Made it" history and undo', async ({ ctx, app }) => {
  const page = await openApp(ctx, app);
  await seed(page, SAMPLE_RECIPES.slice(3, 4));
  await page.reload();
  const card = page.locator('.recipe-card').first();
  await card.waitFor();
  await card.getByRole('button', { name: /Add to favorites/ }).click();
  await until(async () => (await card.getByRole('button', { name: /Remove from favorites/ }).count()) === 1, { message: 'favorite on card' });
  await page.locator('.recipe-card a').first().click();
  assert.equal(await page.getByRole('button', { name: 'Favorited' }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Favorited' }).click();
  await page.getByRole('button', { name: 'Favorite', exact: true }).waitFor();

  // rating is private 1–5 stars, clear by pressing again
  await page.getByRole('radio', { name: '4 stars' }).click();
  await until(async () => (await page.getByRole('radio', { name: '4 stars' }).getAttribute('aria-checked')) === 'true');
  await until(() => page.evaluate(async () => (await import('/src/recipes.js')).getRecipe('s4').personalRating === 4), { message: 'rating persisted' });
  await page.reload();
  assert.equal(await page.getByRole('radio', { name: '4 stars' }).getAttribute('aria-checked'), 'true');
  await page.getByRole('radio', { name: '4 stars' }).click();
  await until(async () => (await page.getByRole('radio', { name: '4 stars' }).getAttribute('aria-checked')) === 'false');
  await page.getByRole('radio', { name: '5 stars' }).click();
  await until(() => page.evaluate(async () => (await import('/src/recipes.js')).getRecipe('s4').personalRating === 5), { message: 'rating 5 persisted' });

  // made it
  assert.match(await page.locator('.made-line').textContent(), /Not made yet/);
  await page.getByRole('button', { name: 'Made It' }).click();
  await until(async () => /Made 1 time/.test(await page.locator('.made-line').textContent()), { message: 'made once' });
  assert.match(await page.locator('.made-line').textContent(), /Last made [A-Z][a-z]{2} \d{1,2}, \d{4}/);
  await page.getByRole('button', { name: 'Made It' }).click();
  await until(async () => /Made 2 times/.test(await page.locator('.made-line').textContent()));
  await page.getByRole('button', { name: 'Undo' }).last().click();
  await until(async () => /Made 1 time/.test(await page.locator('.made-line').textContent()), { message: 'undo' });
  await page.getByText(/Cooking history \(1\)/).waitFor();
});

// ---------------------------------------------------------------------------------------------
test('collections: create, rename, reorder, add/remove recipes, delete; bulk select', async ({ ctx, app }) => {
  const page = await openApp(ctx, app);
  await seed(page, SAMPLE_RECIPES.map(({ collectionNames, ...r }) => r));
  await page.getByRole('link', { name: 'Collections' }).click();
  await page.getByRole('heading', { name: 'Collections', level: 1 }).waitFor();
  assert.match(await page.locator('.empty-title').textContent(), /Create collections to organize recipes your way\./);
  await page.getByRole('button', { name: 'New collection' }).last().click();
  await page.getByLabel('Collection name').fill('Weeknight Dinner');
  await page.locator('dialog[open]').getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: /Weeknight Dinner/ }).waitFor();
  // duplicate names are rejected politely
  await page.getByRole('button', { name: 'New collection' }).first().click();
  await page.getByLabel('Collection name').fill('weeknight dinner');
  await page.locator('dialog[open]').getByRole('button', { name: 'Create' }).click();
  await page.locator('.toast-error').waitFor();
  await page.locator('dialog[open]').getByRole('button', { name: 'Cancel' }).click().catch(() => {});
  await page.getByRole('button', { name: 'New collection' }).first().click();
  await page.getByLabel('Collection name').fill('Baking');
  await page.locator('dialog[open]').getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: /Baking/ }).waitFor();

  const names = async () => page.locator('.collection-link strong').allTextContents();
  assert.deepEqual(await names(), ['Weeknight Dinner', 'Baking']);
  await page.getByRole('button', { name: 'Move Baking up' }).click();
  await until(async () => (await names())[0] === 'Baking', { message: 'reorder' });
  await page.getByRole('button', { name: 'Move Baking down' }).click();
  await until(async () => (await names())[0] === 'Weeknight Dinner');

  // rename via menu
  await page.getByRole('button', { name: 'More actions for Baking' }).click();
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.getByLabel('Collection name').fill('Bakes & Treats');
  await page.locator('dialog[open]').getByRole('button', { name: 'Rename' }).click();
  await page.getByRole('link', { name: /Bakes & Treats/ }).waitFor();

  // open collection, add recipes through the picker
  await page.getByRole('link', { name: /Bakes & Treats/ }).click();
  await page.getByText('This collection is empty').waitFor();
  await page.getByRole('button', { name: 'Add recipes' }).first().click();
  const picker = page.locator('dialog[open]');
  await picker.getByText('Oat Cookies').click();
  await picker.getByText('Overnight Oats').click();
  await picker.getByRole('button', { name: 'Add (2)' }).click();
  await until(async () => (await page.locator('.recipe-card').count()) === 2, { message: 'collection has 2' });
  // bulk: select one and remove it from the collection
  await page.getByRole('button', { name: 'Select' }).click();
  await page.getByRole('checkbox', { name: 'Select Oat Cookies' }).click();
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('button', { name: 'Remove from Collection' }).click();
  await until(async () => (await page.locator('.recipe-card').count()) === 1, { message: 'removed one' });
  assert.equal(await page.getByRole('button', { name: 'Select' }).count(), 1, 'selection mode exits after the action');

  // recipe detail shows the collection; editing collections works there
  await page.locator('.recipe-card a').first().click();
  await page.getByRole('link', { name: 'Bakes & Treats' }).waitFor();
  await page.getByRole('button', { name: 'Edit collections' }).click();
  await page.locator('dialog[open]').getByLabel('Weeknight Dinner').check();
  await page.locator('dialog[open]').getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: 'Weeknight Dinner' }).waitFor();

  // deleting a collection keeps the recipes
  await page.getByRole('link', { name: 'Collections' }).click();
  await page.getByRole('button', { name: 'More actions for Bakes & Treats' }).click();
  await page.getByRole('button', { name: /Delete collection/ }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Delete collection' }).click();
  await until(async () => (await page.getByRole('link', { name: /Bakes & Treats/ }).count()) === 0);
  const count = await page.evaluate(async () => (await import('/src/recipes.js')).recipeCount());
  assert.equal(count, 6, 'no recipes lost');
});

// ---------------------------------------------------------------------------------------------
test('serving scale with clean fractions, unit conversion, originals preserved', async ({ ctx, app }) => {
  const page = await openApp(ctx, app);
  await seed(page, [{
    id: 'scale-1', title: 'Scale Test', servings: '4',
    ingredients: ['2 cups flour', '1 1/2 tsp salt', '1/2 cup sugar', '1 onion', '8 oz cream cheese', '1 lb beef', 'Salt to taste', '2 (14 oz) cans tomatoes'],
    instructionSections: [{ section: 'Main', steps: ['Bake at 350°F for 30 minutes.'] }],
  }]);
  await page.goto(`${app}/#/recipe/scale-1`);
  const ings = async () => page.locator('.ingredient label').allTextContents();
  assert.deepEqual((await ings())[0], '2 cups flour');

  await page.getByRole('button', { name: '8', exact: true }).click(); // x2
  assert.deepEqual(await ings(), ['4 cups flour', '3 tsp salt', '1 cup sugar', '2 onions', '16 oz cream cheese', '2 lb beef', 'Salt to taste', '4 (14 oz) cans tomatoes']);
  await page.getByRole('button', { name: '2', exact: true }).click(); // x0.5
  assert.deepEqual(await ings(), ['1 cup flour', '¾ tsp salt', '¼ cup sugar', '½ onion', '4 oz cream cheese', '½ lb beef', 'Salt to taste', '1 (14 oz) can tomatoes']);
  await page.getByRole('button', { name: 'More servings' }).click(); // 3 servings = x0.75
  assert.equal((await ings())[0], '1½ cups flour');
  assert.equal((await ings())[2], '⅜ cup sugar');
  // tooltip keeps the original text
  assert.equal(await page.locator('.ingredient label').first().getAttribute('title'), 'Original: 2 cups flour');
  await page.getByRole('button', { name: 'Reset to original' }).click();
  assert.equal((await ings())[1], '1 1/2 tsp salt', 'original text restored exactly');

  // units
  await page.getByRole('radio', { name: 'Metric' }).click();
  const metric = await ings();
  assert.equal(metric[0], '480 ml flour'.replace('480', '470'), `cups -> ml only (no density guessing): ${metric[0]}`);
  assert.equal(metric[1], '1 1/2 tsp salt', 'tsp untouched');
  assert.equal(metric[4], '225 g cream cheese');
  assert.equal(metric[5], '455 g beef');
  assert.equal(metric[6], 'Salt to taste');
  assert.match(await page.locator('.step p').textContent(), /175°C/);
  await page.getByRole('radio', { name: 'US' }).click();
  assert.equal((await ings())[4], '8 oz cream cheese');
  assert.match(await page.locator('.step p').textContent(), /350°F/);
  await page.getByRole('radio', { name: 'Original' }).click();
  assert.equal((await ings())[5], '1 lb beef');

  // ingredient checklist
  await page.getByRole('checkbox', { name: '2 cups flour' }).check();
  assert.equal(await page.locator('.ingredient.is-checked').count(), 1);
  await page.getByRole('button', { name: 'Clear checks' }).click();
  assert.equal(await page.locator('.ingredient.is-checked').count(), 0);

  // recipes with no yield fall back to multipliers
  await seed(page, [{ id: 'scale-2', title: 'No Yield', ingredients: ['2 eggs', '1 cup milk'] }]);
  await page.goto(`${app}/#/recipe/scale-2`);
  await page.getByRole('button', { name: '2×' }).click();
  assert.deepEqual(await ings(), ['4 eggs', '2 cups milk']);
});

registerPart2(runner, { assert, fs, path, root, until });
registerPart3(runner, { assert, until });

const filter = process.argv[2];
const results = await runner.run(filter);
await browser.close();
await site.close();
app.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed`);
process.exit(failed.length ? 1 : 0);
