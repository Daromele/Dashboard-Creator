// End-to-end scenarios, part 2.
import { openApp, seed, SAMPLE_RECIPES, hasNoOverflow, a11yProblems } from './helpers.mjs';

export function registerPart2(runner, { assert, until }) {
  const { test } = runner;

  // ------------------------------------------------------------------------------------------
  test('cooking mode: one step at a time, checklist, timers persist while navigating', async ({ ctx, app }) => {
    const page = await openApp(ctx, app);
    await seed(page, [{ id: 'c1', title: 'Cook Test', servings: '4', ingredients: ['2 cups rice', '1 tsp salt'], instructionSections: [{ section: 'Main', steps: ['Rinse the rice.', 'Simmer for 10 minutes.', 'Rest for 5 minutes, then serve.'] }] }]);
    await page.goto(`${app}/#/recipe/c1`);
    await page.getByRole('checkbox', { name: '2 cups rice' }).check(); // detail checklist shared with cooking mode
    await page.getByRole('button', { name: 'Start Cooking' }).click();
    const label = page.locator('.cook-step-label');
    await until(async () => (await label.textContent()) === 'Step 1 of 3', { message: 'step 1' });
    assert.equal(await page.locator('.cook-text').textContent(), 'Rinse the rice.');
    assert.ok(await page.locator('.cook-text').evaluate((el) => parseFloat(getComputedStyle(el).fontSize)) >= 26, 'large text');
    assert.equal(await page.getByRole('button', { name: 'Previous' }).isDisabled(), true);
    assert.equal(await page.locator('.bottom-nav').isVisible(), false, 'nav hidden while cooking');
    await page.getByRole('button', { name: 'Next' }).click();
    assert.equal(await label.textContent(), 'Step 2 of 3');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await label.textContent(), 'Step 1 of 3');
    await page.keyboard.press('ArrowRight');

    // ingredient checklist without leaving cooking mode
    await page.getByRole('button', { name: 'Ingredients' }).click();
    assert.equal(await page.locator('dialog[open]').getByRole('checkbox', { name: '2 cups rice' }).isChecked(), true);
    await page.locator('dialog[open]').getByRole('checkbox', { name: '1 tsp salt' }).check();
    await page.getByRole('button', { name: 'Back to cooking' }).click();
    assert.equal(await label.textContent(), 'Step 2 of 3');

    await page.getByRole('button', { name: 'Start 10-minute timer' }).click();
    await page.locator('.timer-chip').waitFor();
    assert.match(await page.locator('.timer-clock').first().textContent(), /^(9|10):\d\d$/);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Start 5-minute timer' }).click();
    await until(async () => (await page.locator('.timer-chip').count()) === 2, { message: 'two timers' });
    await page.getByRole('button', { name: 'Exit' }).click();
    await page.locator('h1.recipe-title').waitFor();
    assert.equal(await page.locator('.timer-chip').count(), 2, 'timers keep running across screens');
    await page.getByRole('button', { name: /Add one minute to 10-minute timer/ }).click();
    await until(async () => /^(10|11):\d\d$/.test(await page.locator('.timer-clock').first().textContent()), { message: 'minute added' });
    await page.getByRole('button', { name: /Cancel 5-minute timer/ }).click();
    assert.equal(await page.locator('.timer-chip').count(), 1);

    // manual step timers on the detail screen + reload persistence
    await page.getByRole('button', { name: 'Start 5-minute timer' }).click();
    await page.reload();
    await until(async () => (await page.locator('.timer-chip').count()) === 2, { message: 'timers survive reload' });

    // finish flow
    await page.getByRole('button', { name: 'Start Cooking' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.locator('dialog[open]').getByText('All done!').waitFor();
    await page.getByRole('button', { name: 'Mark as Made' }).click();
    await page.locator('h1.recipe-title').waitFor();
    await until(async () => /Made 1 time/.test(await page.locator('.made-line').textContent()));
  });

  test('timers finish with an alert (fake clock)', async ({ ctx, app }) => {
    const page = await ctx.newPage();
    await page.clock.install();
    await page.goto(app);
    await page.clock.runFor(200);
    await page.locator('dialog.onboarding').getByRole('button', { name: 'Skip' }).click();
    await page.evaluate(async () => { (await import('/src/timers.js')).startTimer({ label: 'Soup timer', seconds: 600, recipeTitle: 'Soup' }); });
    await page.locator('.timer-chip').waitFor();
    await page.clock.fastForward('09:00');
    assert.match(await page.locator('.timer-clock').textContent(), /^1:0\d$|^1:00$|^0:5\d$/, 'about a minute left');
    await page.clock.fastForward('01:10');
    await until(async () => (await page.locator('.timer-chip.is-done').count()) === 1, { message: 'timer done' });
    assert.equal(await page.locator('.timer-chip.is-done').getAttribute('role'), 'alert');
    assert.match(await page.locator('.timer-chip.is-done .timer-clock').textContent(), /Time’s up!/);
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    assert.equal(await page.locator('.timer-chip').count(), 0);
  });

  // ------------------------------------------------------------------------------------------
  test('meal planner: add, move, duplicate, remove, jump weeks, shopping list from plan', async ({ ctx, app }) => {
    const page = await openApp(ctx, app);
    await seed(page, SAMPLE_RECIPES.slice(0, 2).map(({ collectionNames, ...r }) => r));
    await page.getByRole('link', { name: 'Meal Plan' }).click();
    await page.getByRole('heading', { name: 'Meal Plan', level: 1 }).waitFor();
    await page.getByText('Add recipes from your library to plan your week.').waitFor();
    const day = (name) => page.locator('.day-card', { has: page.getByRole('heading', { name, exact: true }) });

    await page.getByRole('button', { name: 'Add recipe to Monday Dinner' }).click();
    await page.locator('dialog[open]').getByText('Tomato Pasta').click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Add (1)' }).click();
    await until(async () => (await day('Monday').locator('.plan-entry').count()) === 1, { message: 'entry added' });
    assert.match(await day('Monday').locator('.plan-title').textContent(), /Tomato Pasta/);

    // move to Tuesday lunch
    const monday = await page.locator('input[aria-label^="Jump to the week"]').inputValue();
    const tuesday = new Date(`${monday}T12:00:00`); tuesday.setDate(tuesday.getDate() + 1);
    const tIso = tuesday.toISOString().slice(0, 10);
    await page.getByRole('button', { name: 'Actions for Tomato Pasta' }).click();
    await page.getByRole('button', { name: 'Move…' }).click();
    await page.locator('dialog[open]').getByLabel('Date').fill(tIso);
    await page.locator('dialog[open]').getByLabel('Meal').selectOption('lunch');
    await page.locator('dialog[open]').getByRole('button', { name: 'Move', exact: true }).click();
    await until(async () => (await day('Tuesday').locator('.plan-entry').count()) === 1 && (await day('Monday').locator('.plan-entry').count()) === 0, { message: 'moved' });

    // duplicate (defaults to the next day)
    await page.getByRole('button', { name: 'Actions for Tomato Pasta' }).click();
    await page.getByRole('button', { name: 'Duplicate…' }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Duplicate', exact: true }).click();
    await until(async () => (await day('Wednesday').locator('.plan-entry').count()) === 1, { message: 'duplicated' });

    // remove
    await page.getByRole('button', { name: 'Actions for Tomato Pasta' }).first().click();
    await page.getByRole('button', { name: 'Remove from plan' }).click();
    await until(async () => (await page.locator('.plan-entry').count()) === 1, { message: 'removed' });

    // snacks are optional
    assert.equal(await page.getByRole('heading', { name: 'Snacks' }).count(), 0);
    await page.getByLabel('Show snacks').check();
    await until(async () => (await page.getByRole('heading', { name: 'Snacks' }).count()) >= 7);

    // weeks
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByText('Nothing planned this week').waitFor();
    await page.getByRole('button', { name: 'Previous week' }).click();
    assert.equal(await page.locator('.plan-entry').count(), 1);
    await page.getByLabel('Jump to the week containing this date').fill('2027-01-06');
    await until(async () => /Jan 4 – Jan 10, 2027/.test(await page.locator('.week-label').textContent()), { message: 'jumped' });
    await page.getByRole('button', { name: 'Jump to this week' }).click();
    assert.equal(await page.locator('.plan-entry').count(), 1);

    // plan -> shopping list
    await page.getByRole('button', { name: 'Add week to shopping list' }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Add ingredients' }).click();
    await page.getByRole('link', { name: 'Shopping' }).click();
    await page.locator('.shop-item').first().waitFor();
    assert.ok((await page.locator('.shop-item').count()) >= 3);

    // deleting a recipe scrubs it from the plan
    await page.evaluate(async () => { await (await import('/src/recipes.js')).deleteRecipes(['s1']); });
    await page.getByRole('link', { name: 'Meal Plan' }).click();
    await until(async () => (await page.locator('.plan-entry').count()) === 0, { message: 'plan scrubbed' });
  });

  // ------------------------------------------------------------------------------------------
  test('shopping list: generate, consolidate safely, edit, move categories, clear', async ({ ctx, app }) => {
    const page = await openApp(ctx, app);
    await seed(page, [
      { id: 'r1', title: 'Recipe One', servings: '4', ingredients: ['1 onion', '1 cup milk', '2 tbsp olive oil', 'Salt to taste', '2 cups spinach', '1 lb chicken thighs'] },
      { id: 'r2', title: 'Recipe Two', servings: '4', ingredients: ['2 onions', '250 ml milk', '1 tbsp olive oil', 'salt to taste', '1/2 onion', '1 loaf bread', '1 bag frozen peas'] },
    ]);
    await page.goto(`${app}/#/shopping`);
    assert.match(await page.locator('.empty-text').textContent(), /Create a grocery list from one recipe or your entire meal plan\./);

    await page.goto(`${app}/#/recipe/r1`);
    await page.getByRole('button', { name: 'Add Ingredients to Shopping List' }).click();
    const dlg = page.locator('dialog[open]');
    await dlg.getByLabel(/Recipe One/).fill('8'); // double it
    await dlg.getByRole('button', { name: 'Add ingredients' }).click();
    await page.goto(`${app}/#/recipe/r2`);
    await page.getByRole('button', { name: 'Add Ingredients to Shopping List' }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Add ingredients' }).click();
    await page.getByRole('button', { name: 'View list' }).last().click();

    await page.locator('.shop-item').first().waitFor();
    const rows = await page.locator('.shop-item .shop-main').allTextContents();
    const has = (t) => rows.some((r) => r.replace(/\s+/g, ' ').trim() === t);
    assert.ok(has('4½ onions'), `onions combined: ${rows.join(' | ')}`); // 2 (1x2) + 2 + ½
    assert.ok(has('5 tbsp olive oil'), 'olive oil combined after scaling');
    assert.ok(has('2 cups milk') && has('250 ml milk'), 'cups and ml are NOT merged');
    assert.equal(rows.filter((r) => /salt to taste/i.test(r)).length, 1, 'identical unparsed lines merge');
    const cats = await page.locator('.shop-cat').evaluateAll((els) => els.map((e) => e.childNodes[0].textContent));
    assert.deepEqual(cats, ['Produce', 'Meat & Seafood', 'Dairy', 'Bakery', 'Pantry', 'Frozen']);
    assert.equal(await page.locator('.nav-bottom[data-nav=shopping] .nav-badge').textContent(), String(rows.length));

    // check + clear checked
    await page.getByRole('checkbox', { name: /4½ onions/ }).check();
    await until(async () => (await page.locator('.shop-item.is-checked').count()) === 1, { message: 'item checked' });
    await page.getByRole('button', { name: 'Clear Checked' }).click();
    await until(async () => (await page.locator('.shop-item').count()) === rows.length - 1, { message: 'cleared checked' });

    // custom item, auto category, then move it
    await page.getByRole('button', { name: 'Add item', exact: true }).first().click();
    await page.locator('dialog[open]').getByLabel(/^Item/).fill('Bananas');
    await page.locator('dialog[open]').getByLabel('Quantity').fill('3');
    await page.locator('dialog[open]').getByRole('button', { name: 'Add item' }).click();
    await page.getByText('Bananas').waitFor();
    assert.equal(await page.locator('.shop-group', { has: page.getByRole('heading', { name: /Produce/ }) }).getByText('Bananas').count(), 1);
    await page.getByRole('button', { name: /Edit Bananas/ }).click();
    await page.locator('dialog[open]').getByLabel('Category').selectOption('Other');
    await page.locator('dialog[open]').getByLabel('Notes').fill('Ripe ones');
    await page.locator('dialog[open]').getByRole('button', { name: 'Save', exact: true }).click();
    await until(async () => (await page.locator('.shop-group', { has: page.getByRole('heading', { name: /Other/ }) }).getByText('Bananas').count()) === 1, { message: 'moved to Other' });
    await page.getByText('Ripe ones').waitFor();

    // persistence + copy as text
    await page.reload();
    await page.getByText('Bananas').waitFor();
    await page.getByRole('button', { name: 'More shopping list actions' }).click();
    await page.getByRole('button', { name: 'Copy list as text' }).click();
    await page.locator('.toast', { hasText: 'List copied.' }).waitFor();
    const clip = await page.evaluate(async () => (await import('/src/shopping.js')).listAsText());
    assert.match(clip, /^Shopping List/); assert.match(clip, /PRODUCE/); assert.match(clip, /Bananas/);

    await page.getByRole('button', { name: 'Clear List' }).click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Clear list' }).click();
    await page.getByText('Your shopping list is empty').waitFor();
  });

  // ------------------------------------------------------------------------------------------
  test('backup: export, validation, merge restore, replace restore', async ({ ctx, app }) => {
    const page = await openApp(ctx, app);
    await seed(page, SAMPLE_RECIPES);
    await page.evaluate(async () => {
      const mp = await import('/src/mealplanner.js'); const sh = await import('/src/shopping.js'); const rc = await import('/src/recipes.js');
      await mp.addEntry(mp.weekKey(new Date()), { day: 0, slot: 'dinner', recipeId: 's1', servings: 4 });
      await sh.addFromRecipes([{ recipeId: 's1', servings: 4 }]);
      await rc.markMade('s1');
    });
    await page.goto(`${app}/#/settings`);
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export Full Backup' }).click()]);
    assert.match(download.suggestedFilename(), /^RecipeLibrary_Backup_\d{4}-\d{2}-\d{2}\.json$/);
    const file = await download.path();
    const { readFileSync } = await import('node:fs');
    const raw = readFileSync(file, 'utf8');
    const backup = JSON.parse(raw);
    assert.equal(backup.app, 'recipe-library-studio'); assert.equal(backup.backupVersion, 1);
    assert.ok(backup.appVersion && backup.createdAt && backup.schemaVersion);
    for (const k of ['recipes', 'collections', 'mealPlans', 'shoppingLists', 'history', 'images']) assert.ok(Array.isArray(backup.data[k]), k);
    assert.ok(backup.data.settings && typeof backup.data.settings === 'object');
    assert.equal(backup.data.recipes.length, 6);
    assert.ok(backup.data.history.length >= 1);
    assert.ok(!raw.includes('backupFolderHandle'));

    // damage local data
    await page.evaluate(async () => {
      const rc = await import('/src/recipes.js');
      await rc.deleteRecipes(['s2', 's3']);
      await rc.saveRecipe({ ...rc.getRecipe('s1'), title: 'Changed Locally' });
    });
    const titlesNow = () => page.evaluate(async () => (await import('/src/recipes.js')).allRecipes().map((r) => r.title).sort());

    // invalid files never change data
    const input = page.locator('input[type=file][aria-label="Choose a backup file"]');
    const tryFile = async (name, content, expected) => {
      await input.setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
      const dlg = page.locator('dialog[open]');
      await dlg.getByText('This backup can’t be restored').waitFor();
      assert.match(await dlg.textContent(), expected);
      await dlg.getByRole('button', { name: 'OK' }).click();
    };
    await tryFile('bad.json', 'not json {{', /not valid JSON/);
    await tryFile('other.json', JSON.stringify({ app: 'something-else', backupVersion: 1, data: {} }), /doesn't look like a Recipe Library Studio backup|doesn’t look like/);
    await tryFile('future.json', JSON.stringify({ app: 'recipe-library-studio', backupVersion: 99, data: {} }), /newer version/);
    await tryFile('broken.json', JSON.stringify({ app: 'recipe-library-studio', backupVersion: 1, data: { recipes: 'nope' } }), /malformed/);
    assert.equal((await titlesNow()).length, 4);

    // merge: summary first, never silent; newest edit wins; nothing deleted
    await input.setInputFiles({ name: 'RecipeLibrary_Backup.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
    const dlg = page.locator('dialog[open]');
    await dlg.getByText('Restore backup').first().waitFor();
    const summary = await dlg.textContent();
    assert.match(summary, /6\s*Recipes/); assert.match(summary, /1\s*Collection/); assert.match(summary, /1\s*Meal Plan/); assert.match(summary, /1\s*Shopping List/);
    assert.equal(await dlg.getByRole('radio', { name: 'Merge With Existing Data' }).getAttribute('aria-checked'), 'true');
    await dlg.getByLabel('Download a backup of my current data first').uncheck();
    await dlg.getByRole('button', { name: 'Restore', exact: true }).click();
    await page.locator('.toast', { hasText: 'Merged' }).waitFor();
    const merged = await titlesNow();
    assert.equal(merged.length, 6);
    assert.ok(merged.includes('Changed Locally') && !merged.includes('Tomato Pasta'), 'locally edited (newer) recipe kept');
    assert.ok(merged.includes('Overnight Oats') && merged.includes('Roasted Chickpeas'), 'deleted recipes restored');

    // replace: confirmation + exact state from the backup
    await input.setInputFiles({ name: 'RecipeLibrary_Backup.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
    const dlg2 = page.locator('dialog[open]');
    await dlg2.getByRole('radio', { name: 'Replace Existing Data' }).click();
    await dlg2.getByRole('button', { name: 'Restore', exact: true }).click();
    await page.locator('dialog[open]').getByText('Replace everything?').waitFor();
    await page.locator('dialog[open]').getByRole('button', { name: 'Replace my data' }).click();
    await page.locator('.toast', { hasText: 'Restored 6 recipes' }).waitFor();
    const replaced = await titlesNow();
    assert.ok(replaced.includes('Tomato Pasta') && !replaced.includes('Changed Locally'));
    const counts = await page.evaluate(async () => { const mp = await import('/src/mealplanner.js'); const sh = await import('/src/shopping.js'); const c = await import('/src/collections.js'); return { plans: mp.allPlans().length, items: sh.itemCount(), cols: c.listCollections().length }; });
    assert.equal(counts.plans, 1); assert.ok(counts.items > 0); assert.equal(counts.cols, 1);
  });

  // ------------------------------------------------------------------------------------------
  const doImport = async (page, url) => {
    await page.goto(`${page.url().split('#')[0]}#/import`);
    const tab = page.getByRole('radio', { name: 'From a link' });
    if (!(await page.getByLabel('Recipe link').isVisible().catch(() => false))) await tab.click();
    const link = page.getByLabel('Recipe link');
    await link.fill(url);
    const gap = 1700 - (Date.now() - (page.__lastImport || 0));
    if (gap > 0) await page.waitForTimeout(gap); // client-side throttle is 1.5s between requests
    page.__lastImport = Date.now();
    await page.getByRole('button', { name: 'Import Recipe' }).last().click();
  };
  const savePreview = async (page) => { await page.getByRole('button', { name: 'Save Recipe' }).click(); await page.locator('h1.recipe-title').waitFor(); };

  test('import: complete recipe → editable preview → save → attribution → photo works offline', async ({ ctx, app, site }) => {
    const page = await openApp(ctx, app);
    await doImport(page, `${site}/with-image.html`);
    await page.getByRole('heading', { name: 'Review Imported Recipe' }).waitFor();
    assert.equal(await page.getByLabel('Recipe name').inputValue(), 'Pumpkin Soup with Photo');
    assert.equal(await page.getByLabel('Author').inputValue(), 'Fixture Chef');
    assert.equal(await page.getByLabel('Source website').inputValue(), '127.0.0.1');
    assert.equal(await page.getByLabel('Original URL').inputValue(), `${site}/with-image.html`);
    assert.equal(await page.getByLabel('Servings').inputValue(), '4 servings');
    assert.equal(await page.getByLabel('Prep time').inputValue(), '10');
    assert.equal(await page.getByLabel('Cook time').inputValue(), '30');
    assert.match(await page.locator('.tag-chips').first().textContent(), /Dinner/);
    assert.equal((await page.getByLabel('Ingredients').inputValue()).split('\n').length, 4);
    assert.equal((await page.getByLabel('Instructions').inputValue()).split('\n').length, 2);
    assert.equal(await page.evaluate(async () => (await import('/src/recipes.js')).recipeCount()), 0, 'nothing saved before review');
    assert.equal(await page.getByRole('link', { name: 'View Original Recipe' }).getAttribute('href'), `${site}/with-image.html`);
    await page.getByLabel('Recipe name').fill('Pumpkin Soup (edited)');
    await page.getByLabel('My Notes').fill('Needs more nutmeg.');
    await until(async () => (await page.locator('.photo-box img.img-photo').count()) === 1, { message: 'photo preview' });
    await until(async () => !(await page.locator('.photo-box .field-hint').textContent()).includes('Saving a copy'), { message: 'photo cached' });
    await savePreview(page);

    assert.equal(await page.locator('h1.recipe-title').textContent(), 'Pumpkin Soup (edited)');
    const src = page.locator('.source-line a');
    assert.equal(await src.getAttribute('href'), `${site}/with-image.html`);
    assert.equal(await src.textContent(), '127.0.0.1');
    assert.equal(await page.getByRole('link', { name: 'View Original Recipe' }).getAttribute('target'), '_blank');
    assert.match(await page.getByRole('link', { name: 'View Original Recipe' }).getAttribute('rel'), /noopener/);
    const img = await page.evaluate(async () => { const { allRecipes } = await import('/src/recipes.js'); const { getImageRow } = await import('/src/images.js'); const r = allRecipes()[0]; const row = await getImageRow(r.imageId); return { has: !!row, type: row && row.blob.type, w: row && row.width, thumb: row && row.thumb.size, sourceUrl: r.sourceUrl, dateImported: r.dateImported, categories: r.categories, tags: r.tags }; });
    assert.ok(img.has, 'image cached locally');
    assert.match(img.type, /image\/(webp|jpeg)/);
    assert.ok(img.w <= 1400);
    assert.deepEqual(img.categories, ['Dinner']);
    assert.deepEqual(img.tags, ['soup', 'autumn']);
    assert.ok(img.dateImported);
    await until(async () => page.locator('.hero img.img-photo').evaluate((el) => el.complete && el.naturalWidth > 0), { message: 'hero photo loaded' });

    // original text is kept alongside parsed ingredients
    assert.equal(await page.locator('.ingredient label').nth(0).textContent(), '2 cups pumpkin puree');

    // backup includes the photo and restoring brings it back
    const restored = await page.evaluate(async () => {
      const b = await import('/src/backup.js'); const im = await import('/src/images.js'); const rc = await import('/src/recipes.js'); const db = await import('/src/db.js');
      const backup = await b.buildBackup();
      const hasImage = backup.data.images.length === 1 && backup.data.images[0].data.startsWith('data:image/');
      await db.clearStore('images');
      const v = b.validateBackup(JSON.parse(JSON.stringify(backup)));
      await b.restoreBackup(v.clean, 'replace');
      const row = await im.getImageRow(rc.allRecipes()[0].imageId);
      return { hasImage, back: !!row };
    });
    assert.deepEqual(restored, { hasImage: true, back: true });

    // offline: saved recipe + its photo still work
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await until(async () => page.evaluate(() => !!navigator.serviceWorker.controller), { message: 'sw control' });
    await ctx.setOffline(true);
    await page.reload();
    await page.locator('h1.recipe-title').waitFor();
    await until(async () => page.locator('.hero img.img-photo').evaluate((el) => el.complete && el.naturalWidth > 0), { message: 'hero photo offline' });
    await ctx.setOffline(false);
  }, { allowNetworkErrors: true, allowConsole: /Refused to load the image 'http:\/\/127\.0\.0\.1/ });

  test('import: duplicate detection (same link, same title, open / anyway / replace / cancel)', async ({ ctx, app, site }) => {
    const page = await openApp(ctx, app);
    const url = `${site}/with-image.html`;
    await doImport(page, url);
    await page.getByRole('heading', { name: 'Review Imported Recipe' }).waitFor();
    await savePreview(page);
    await page.getByRole('radio', { name: '5 stars' }).click();
    await page.getByRole('button', { name: 'Favorite', exact: true }).click();
    await page.getByLabel('My notes for this recipe').fill('Keep this note');
    await until(async () => (await page.locator('.notes-status').textContent()) === 'Saved');
    const count = () => page.evaluate(async () => (await import('/src/recipes.js')).recipeCount());

    // Cancel -> nothing happens
    await doImport(page, url);
    const dlg = page.locator('dialog[open]');
    await dlg.getByText('This recipe may already be in your library.').waitFor();
    for (const name of ['Open Existing', 'Import Anyway', 'Replace Existing', 'Cancel']) assert.equal(await dlg.getByRole('button', { name }).count(), 1, name);
    assert.match(await dlg.textContent(), /Same link/);
    await dlg.getByRole('button', { name: 'Cancel' }).click();
    assert.equal(await count(), 1);
    assert.equal(await page.getByRole('heading', { name: 'Import Recipe' }).count(), 1, 'stays on the import screen');

    // Open Existing
    await page.getByRole('button', { name: 'Import Recipe' }).last().click();
    await page.locator('dialog[open]').getByRole('button', { name: 'Open Existing' }).click();
    await page.locator('h1.recipe-title').waitFor();

    // Same title on a different URL is flagged too
    await doImport(page, `${url}?other=1`);
    await page.locator('dialog[open]').getByText('Same title').waitFor();
    await page.locator('dialog[open]').getByRole('button', { name: 'Import Anyway' }).click();
    await page.getByRole('heading', { name: 'Review Imported Recipe' }).waitFor();
    await page.getByLabel('Recipe name').fill('Pumpkin Soup, second copy');
    await savePreview(page);
    assert.equal(await count(), 2);

    // Replace Existing keeps personal data, does not add a third recipe
    await doImport(page, url);
    await page.locator('dialog[open]').getByRole('button', { name: 'Replace Existing' }).click();
    await page.getByText('Replacing an existing recipe.').waitFor();
    await page.getByLabel('Recipe name').fill('Replaced Soup');
    await savePreview(page);
    assert.equal(await count(), 2, 'replaced instead of duplicated');
    assert.equal(await page.locator('h1.recipe-title').textContent(), 'Replaced Soup');
    assert.equal(await page.getByRole('radio', { name: '5 stars' }).getAttribute('aria-checked'), 'true');
    assert.equal(await page.getByRole('button', { name: 'Favorited' }).count(), 1);
    assert.equal(await page.getByLabel('My notes for this recipe').inputValue(), 'Keep this note');
  }, { allowNetworkErrors: true, allowConsole: /Refused to load the image 'http:\/\/127\.0\.0\.1/ });

  test('import: partial / non-recipe pages show the friendly recovery screen', async ({ ctx, app, site }) => {
    const page = await openApp(ctx, app);
    await doImport(page, `${site}/og-fallback.html`);
    const card = page.locator('.failure-card');
    await card.waitFor();
    assert.equal(await card.locator('.failure-title').textContent(), 'We couldn\'t fully detect this recipe.');
    for (const name of ['Try Again', 'Enter Recipe Manually', 'Paste Recipe Text']) assert.equal(await card.getByRole('button', { name }).count(), 1, name);
    const orig = card.getByRole('link', { name: 'Open Original Recipe' });
    assert.equal(await orig.getAttribute('href'), `${site}/og-fallback.html`);
    assert.match(await card.locator('.findings').textContent(), /Found.*title.*photo/s);
    assert.match(await card.locator('.findings').textContent(), /Missing.*ingredients.*instructions/s);
    assert.doesNotMatch(await page.locator('#view').textContent(), /TypeError|stack|undefined|null|\bat \w+/);

    // manual completion, prefilled with what was found
    await card.getByRole('button', { name: 'Enter Recipe Manually' }).click();
    await page.getByText('We found part of this recipe.').waitFor();
    assert.equal(await page.getByLabel('Recipe name').inputValue(), 'Sunday Stew');
    assert.equal(await page.getByLabel('Original URL').inputValue(), `${site}/og-fallback.html`);
    assert.equal(await page.getByLabel('Ingredients').inputValue(), '');
    await page.getByLabel('Ingredients').fill('2 lb beef\n3 carrots');
    await page.getByLabel('Instructions').fill('Brown the beef.\nSimmer for 2 hours.');
    await savePreview(page);
    assert.equal(await page.locator('.source-line a').getAttribute('href'), `${site}/og-fallback.html`);

    // paste-text route keeps the found title/link
    await doImport(page, `${site}/og-fallback.html?second=1`);
    await page.locator('.failure-card').waitFor();
    await page.locator('.failure-card').getByRole('button', { name: 'Paste Recipe Text' }).click();
    assert.equal(await page.getByLabel('Recipe name').inputValue(), 'Sunday Stew');
    assert.equal(await page.getByLabel('Source link').inputValue(), `${site}/og-fallback.html?second=1`);

    await doImport(page, `${site}/non-recipe.html`);
    await page.locator('.failure-card').waitFor();
    assert.match(await page.locator('.failure-message').textContent(), /couldn.t detect structured recipe information/);
  }, { allowNetworkErrors: true, allowConsole: /Refused to load the image 'http:\/\/127\.0\.0\.1/ });

  test('import: errors are friendly and always offer a next step', async ({ ctx, app, site }) => {
    const page = await openApp(ctx, app);
    const cases = [
      ['/blocked', /This website blocked automatic recipe importing\./],
      ['/gone', /couldn.t find that page/i],
      ['/file.pdf', /doesn.t appear to be a webpage/],
    ];
    for (const [p, re] of cases) {
      await doImport(page, `${site}${p}`);
      const card = page.locator('.failure-card');
      await card.waitFor();
      assert.equal(await card.locator('.failure-title').textContent(), 'We couldn\'t fully detect this recipe.');
      assert.match(await card.locator('.failure-message').textContent(), re);
      assert.equal(await card.getByRole('button', { name: 'Try Again' }).count(), 1);
      assert.equal(await card.getByRole('button', { name: 'Enter Recipe Manually' }).count(), 1);
      assert.equal(await card.getByRole('button', { name: 'Paste Recipe Text' }).count(), 1);
      assert.equal(await card.getByRole('link', { name: 'Open Original Recipe' }).count(), 1);
      assert.doesNotMatch(await card.textContent(), /Error:|stack|TypeError|ECONN|\b(40[0-9]|50[0-9])\b/);
    }
    // inline validation for text that is not a link
    await page.goto(`${app}/#/import`);
    await page.getByLabel('Recipe link').fill('hello world');
    await page.getByRole('button', { name: 'Import Recipe' }).last().click();
    assert.match(await page.locator('.field-error:not([hidden])').textContent(), /valid link/);
    assert.equal(await page.locator('.failure-card').count(), 0);
    await page.getByLabel('Recipe link').fill('ftp://example.com/x');
    await page.getByRole('button', { name: 'Import Recipe' }).last().click();
    assert.match(await page.locator('.field-error:not([hidden])').textContent(), /http or https/);
    // private addresses are rejected (inline) before any request is made
    await page.getByLabel('Recipe link').fill('localhost');
    await page.getByRole('button', { name: 'Import Recipe' }).last().click();
    assert.match(await page.locator('.field-error:not([hidden])').textContent(), /valid link/);
    // redirects are followed and the final URL is kept as the source
    await doImport(page, `${site}/redirect`);
    await page.getByRole('heading', { name: 'Review Imported Recipe' }).waitFor();
    assert.equal(await page.getByLabel('Original URL').inputValue(), `${site}/simple-jsonld.html`);
  }, { allowNetworkErrors: true, allowConsole: /Refused to load the image 'http:\/\/127\.0\.0\.1/ });

  test('paste recipe text, manual entry and the Recipe Inbox', async ({ ctx, app }) => {
    const page = await openApp(ctx, app, '#/import');
    await page.getByRole('radio', { name: 'Paste recipe text' }).click();
    await page.getByRole('button', { name: 'Review Recipe' }).click();
    assert.ok((await page.locator('.field-error:not([hidden])').count()) >= 1, 'validates empty paste');
    await page.getByLabel('Recipe name').fill('Nana’s Flatbread');
    await page.getByLabel('Ingredients').fill('Ingredients:\n\n• 2 cups flour\n☐ 1 tsp salt\n\n\n- 3/4 cup water');
    await page.getByLabel('Instructions').fill('1. Mix the dough.\n2) Rest for 20 minutes.\nStep 3: Fry until puffed.');
    await page.getByRole('button', { name: 'Review Recipe' }).click();
    await page.getByRole('heading', { name: 'Review Pasted Recipe' }).waitFor();
    assert.equal(await page.getByLabel('Ingredients').inputValue(), '2 cups flour\n1 tsp salt\n3/4 cup water');
    assert.equal(await page.getByLabel('Instructions').inputValue(), 'Mix the dough.\nRest for 20 minutes.\nFry until puffed.');
    await page.getByLabel('Save to Inbox').check();
    await savePreview(page);
    await page.getByText('In Inbox', { exact: true }).waitFor();

    // inbox count + workflow
    assert.equal(await page.locator('.nav-bottom[data-nav=collections] .nav-badge').textContent(), '1');
    await page.getByRole('link', { name: /Collections/ }).click();
    assert.match(await page.locator('.inbox-card').textContent(), /1 recipe waiting to be organized/);
    await page.locator('.inbox-card').click();
    assert.equal(await page.getByRole('button', { name: /Inbox/ }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.recipe-card').count(), 1);
    await page.locator('.recipe-card a').click();
    await page.getByRole('button', { name: 'Move out of Inbox' }).click();
    await until(async () => (await page.getByText('In Inbox', { exact: true }).count()) === 0, { message: 'left inbox' });
    assert.equal(await page.locator('.nav-bottom[data-nav=collections] .nav-badge').count(), 0);

    // duplicate as "My Version" keeps attribution
    await seed(page, [{ id: 'att', title: 'Original Soup', sourceName: 'cooksite.test', sourceUrl: 'https://cooksite.test/soup', ingredients: ['1 cup broth'], instructionSections: [{ section: 'Main', steps: ['Heat.'] }] }]);
    await page.goto(`${app}/#/recipe/att`);
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('button', { name: /Create My Version/ }).click();
    await page.getByRole('heading', { name: 'Edit Recipe' }).waitFor();
    assert.equal(await page.getByLabel('Recipe name').inputValue(), 'Original Soup (My Version)');
    assert.equal(await page.getByLabel('Original URL').inputValue(), 'https://cooksite.test/soup');
    await page.getByLabel('Ingredients').fill('2 cups broth\n1 carrot');
    // the source link cannot be blanked on a recipe that has one
    await page.getByLabel('Original URL').fill('');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    assert.match(await page.locator('.field-error:not([hidden])').textContent(), /can.t be removed/);
    await page.getByLabel('Original URL').fill('https://cooksite.test/soup');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.locator('h1.recipe-title').waitFor();
    assert.match(await page.locator('.based-on').textContent(), /My Version · Based on Original Soup/);
    assert.equal(await page.locator('.based-on a').getAttribute('href'), 'https://cooksite.test/soup');
    assert.equal(await page.locator('.source-line a').first().getAttribute('href'), 'https://cooksite.test/soup');
  });

  // ------------------------------------------------------------------------------------------
  test('offline: installed app opens, saved recipes work, import says connection required', async ({ ctx, app }) => {
    const page = await openApp(ctx, app);
    await seed(page, SAMPLE_RECIPES.slice(0, 3).map(({ collectionNames, ...r }) => r));
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await until(async () => page.evaluate(() => !!navigator.serviceWorker.controller), { message: 'sw control' });

    await ctx.setOffline(true);
    await page.reload();
    await page.locator('.recipe-card').first().waitFor();
    assert.equal(await page.locator('.recipe-card').count(), 3);
    await until(async () => page.locator('.offline-pill').isVisible(), { message: 'offline pill' });
    assert.equal(await page.evaluate(() => document.fonts.check('16px Montserrat')), true, 'fonts available offline');
    await page.locator('.recipe-card a').first().click();
    await page.locator('h1.recipe-title').waitFor();
    await page.getByLabel('My notes for this recipe').fill('Edited while offline');
    await until(async () => (await page.locator('.notes-status').textContent()) === 'Saved');
    await page.goto(`${app}/#/plan`); // deep link while offline
    await page.getByRole('heading', { name: 'Meal Plan' }).waitFor();

    await page.goto(`${app}/#/import`);
    await page.getByText('Internet connection required').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Import Recipe' }).last().isDisabled(), true);
    await page.getByLabel('Recipe link').fill('https://example.com/x');
    await page.getByLabel('Recipe link').press('Enter');
    await page.locator('.failure-card').waitFor();
    assert.match(await page.locator('.failure-title').textContent(), /You appear to be offline\./);
    await page.goto(`${app}/#/settings`);
    await page.getByText(/Ready — \d+ app files saved for offline use/).waitFor();
    await ctx.setOffline(false);
    await until(async () => !(await page.locator('.offline-pill').isVisible()), { message: 'pill hidden online' });
  }, { allowNetworkErrors: true, allowConsole: /Refused to load the image 'http:\/\/127\.0\.0\.1/ });
}
