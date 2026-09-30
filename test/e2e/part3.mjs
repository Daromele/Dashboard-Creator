// End-to-end scenarios, part 3: layout, accessibility, themes, security, folder backup, print, misc.
import { openApp, seed, SAMPLE_RECIPES, hasNoOverflow, a11yProblems } from './helpers.mjs';

export function registerPart3(runner, { assert, until }) {
  const { test } = runner;
  const plain = SAMPLE_RECIPES.map(({ collectionNames, ...r }) => r);

  test('layout: no horizontal overflow; mobile bottom nav vs desktop sidebar; grid columns', async ({ ctx, app }) => {
    const page = await openApp(ctx, app);
    await seed(page, plain);
    const routes = ['#/recipes', '#/recipe/s1', '#/recipe/s1/edit', '#/collections', '#/plan', '#/shopping', '#/settings', '#/import', '#/new'];
    const cols = async () => page.locator('.recipe-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    for (const [w, h, navMode, gridCols] of [[360, 740, 'bottom', 1], [390, 844, 'bottom', 1], [768, 1024, 'bottom', 2], [1280, 800, 'side', 4], [1700, 900, 'side', 5]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const r of routes) {
        await page.goto(`${app}/${r}`);
        await page.waitForTimeout(150);
        const res = await hasNoOverflow(page);
        assert.ok(res.ok, `${w}px ${r}: overflow ${JSON.stringify(res)}`);
      }
      await page.goto(`${app}/#/recipes`);
      await page.locator('.recipe-card').first().waitFor();
      assert.equal(await page.locator('.bottom-nav').isVisible(), navMode === 'bottom', `bottom nav @${w}`);
      assert.equal(await page.locator('.sidebar').isVisible(), navMode === 'side', `sidebar @${w}`);
      assert.equal(await cols(), gridCols, `grid columns @${w}`);
      if (navMode === 'bottom') {
        for (const a of await page.locator('.bottom-nav a').all()) assert.ok((await a.boundingBox()).height >= 48, 'nav tap target');
        assert.equal(await page.locator('.bottom-nav a').count(), 5);
        assert.equal(await page.locator('a.topbar-settings').isVisible(), true, 'settings reachable on mobile');
      }
    }
    // every nav destination is alive
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [name, heading] of [['Collections', 'Collections'], ['Import', 'Import Recipe'], ['Meal Plan', 'Meal Plan'], ['Shopping', 'Shopping List'], ['Recipes', 'My Recipes']]) {
      await page.locator('.bottom-nav').getByRole('link', { name }).click();
      await page.getByRole('heading', { name: heading, level: 1 }).waitFor();
    }
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('heading', { name: 'Settings', level: 1 }).waitFor();
    // unknown routes recover
    await page.goto(`${app}/#/nonsense`);
    await page.getByRole('heading', { name: 'My Recipes', level: 1 }).waitFor();
    await page.goto(`${app}/#/recipe/nope`);
    await page.getByText('Recipe not found').waitFor();
    await page.goto(`${app}/#/cook/nope`);
    await page.getByText('Recipe not found').waitFor();
  });

  test('accessibility: names, labels, landmarks, keyboard, dialog focus', async ({ ctx, app }) => {
    const page = await openApp(ctx, app);
    await seed(page, plain);
    for (const r of ['#/recipes', '#/recipe/s1', '#/recipe/s1/edit', '#/collections', '#/plan', '#/shopping', '#/settings', '#/import', '#/new', '#/cook/s1']) {
      await page.goto(`${app}/${r}`);
      await page.waitForTimeout(200);
      const problems = await a11yProblems(page);
      assert.deepEqual(problems, [], `${r}: ${problems.join('\n')}`);
    }
    await page.goto(`${app}/#/recipes`);
    await page.locator('.recipe-card').first().waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.ok((await page.locator('nav[aria-label]').count()) >= 1 && (await page.locator('main').count()) === 1);
    // skip link is first in tab order and works
    await page.goto(`${app}/#/recipes`);
    await page.reload();
    await page.locator('.recipe-card').first().waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to main content');
    await page.keyboard.press('Enter');
    // visible focus ring on keyboard focus
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return parseFloat(cs.outlineWidth); });
    assert.ok(ring >= 2, `focus outline ${ring}`);
    // dialogs: focus stays inside, Escape closes, focus returns to trigger
    const trigger = page.getByRole('button', { name: /Sort:/ });
    await trigger.focus();
    await trigger.press('Enter');
    await page.locator('dialog[open]').waitFor();
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog') || document.activeElement === document.body), true, 'focus never reaches the page behind a modal'); }
    await page.keyboard.press('Escape');
    await page.locator('dialog[open]').waitFor({ state: 'detached' });
    assert.match(await page.evaluate(() => document.activeElement.textContent), /Sort:/);
    // star rating by keyboard
    await page.goto(`${app}/#/recipe/s6`);
    await page.getByRole('radio', { name: '1 star' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await until(async () => (await page.getByRole('radio', { name: '2 stars' }).getAttribute('aria-checked')) === 'true', { message: 'star via keyboard' });
    // colour is never the only signal: selected chips carry a programmatic state
    await page.goto(`${app}/#/recipes`);
    assert.equal(await page.getByRole('button', { name: 'All', exact: true }).getAttribute('aria-pressed'), 'true');
  });

  test('themes: Mono first and default, choice persists before first paint', async ({ ctx, app }) => {
    const page = await openApp(ctx, app, '#/settings');
    const names = await page.locator('.theme-card .theme-name').allTextContents();
    assert.deepEqual(names, ['Mono', 'Sage', 'Blush', 'Warm Cream', 'Dusty Blue']);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'mono');
    assert.equal(await page.getByRole('radio', { name: 'Mono' }).getAttribute('aria-checked'), 'true');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const mono = await bg();
    await page.getByRole('radio', { name: 'Sage' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'sage');
    assert.notEqual(await bg(), mono);
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'sage');
    assert.equal(await page.locator('meta[name=theme-color]').getAttribute('content'), '#f4f7f3');
    for (const t of ['Blush', 'Warm Cream', 'Dusty Blue', 'Mono']) await page.getByRole('radio', { name: t }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'mono');
  });

  test('security: hostile content is only ever text; no script runs; imports are sanitised', async ({ ctx, app, site }) => {
    const page = await openApp(ctx, app);
    // 1) imported page with script/onerror payloads
    await page.goto(`${app}/#/import`);
    await page.getByLabel('Recipe link').fill(`${site}/xss.html`);
    await page.getByRole('button', { name: 'Import Recipe' }).last().click();
    await page.getByRole('heading', { name: 'Review Imported Recipe' }).waitFor();
    assert.equal(await page.getByLabel('Recipe name').inputValue(), 'Safe Title');
    assert.ok(!/<|onerror|javascript:/i.test(await page.getByLabel('Ingredients').inputValue() + await page.getByLabel('Instructions').inputValue()));
    // 2) user-typed HTML in every text field stays text
    const evil = '<img src=x onerror="window.__pwned=5"><script>window.__pwned=6</script>';
    await page.goto(`${app}/#/new`);
    await page.getByLabel('Recipe name').fill(evil);
    await page.getByLabel('Description').fill(evil);
    await page.getByLabel('My Notes').fill(evil);
    await page.getByLabel('Ingredients').fill(`1 cup ${evil}`);
    await page.getByLabel('Instructions').fill(`Stir ${evil}`);
    await page.getByLabel('Tags').fill('<b>tag</b>'); await page.getByLabel('Tags').press('Enter');
    await page.getByRole('button', { name: 'Save Recipe' }).click();
    await page.locator('h1.recipe-title').waitFor();
    assert.equal(await page.locator('h1.recipe-title').textContent(), evil);
    for (const r of ['#/recipes', '#/shopping', '#/plan']) { await page.goto(`${app}/${r}`); await page.waitForTimeout(150); }
    await page.evaluate(async () => { const rc = await import('/src/recipes.js'); const sh = await import('/src/shopping.js'); await sh.addFromRecipes([{ recipeId: rc.allRecipes()[0].id }]); });
    await page.goto(`${app}/#/shopping`);
    await page.goto(`${app}/#/recipes`);
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
    assert.equal(await page.locator('img[onerror], #view script, #view iframe').count(), 0);
    // 3) a malicious backup cannot smuggle javascript: links
    const backup = { app: 'recipe-library-studio', backupVersion: 1, data: { recipes: [{ id: 'evil1', title: 'Evil', sourceUrl: 'javascript:window.__pwned=7', image: 'javascript:window.__pwned=8', ingredients: ['1 cup x'], instructionSections: [{ section: 'Main', steps: ['y'] }] }] } };
    await page.goto(`${app}/#/settings`);
    await page.locator('input[type=file][aria-label="Choose a backup file"]').setInputFiles({ name: 'evil.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.locator('dialog[open]').getByLabel('Download a backup of my current data first').uncheck();
    await page.locator('dialog[open]').getByRole('button', { name: 'Restore', exact: true }).click();
    await page.locator('.toast', { hasText: 'Merged' }).waitFor();
    await page.goto(`${app}/#/recipe/evil1`);
    await page.locator('h1.recipe-title').waitFor();
    assert.equal(await page.locator('a[href^="javascript"], img[src^="javascript"]').count(), 0);
    assert.equal(await page.evaluate(() => window.__pwned), undefined);
    // 4) strict CSP is in force (inline script is refused)
    const blocked = await page.evaluate(() => new Promise((resolve) => { document.addEventListener('securitypolicyviolation', () => resolve(true), { once: true }); const s = document.createElement('script'); s.textContent = 'window.__csp=1'; document.head.appendChild(s); setTimeout(() => resolve(false), 500); }));
    assert.equal(blocked, true);
    assert.equal(await page.evaluate(() => window.__csp), undefined);
  }, { allowConsole: /Content Security Policy|violates/, allowNetworkErrors: true });

  test('automatic backup folder: choose, backup now, retention, schedule (OPFS stands in for a folder)', async ({ ctx, app }) => {
    await ctx.addInitScript(() => { window.showDirectoryPicker = async () => navigator.storage.getDirectory(); });
    const page = await openApp(ctx, app);
    await seed(page, plain);
    await page.goto(`${app}/#/settings`);
    assert.equal(await page.getByLabel('Backup Frequency').inputValue(), 'off', 'default is Off');
    assert.match(await page.locator('.settings-group', { hasText: 'Automatic Backup Folder' }).textContent(), /synchronized with a cloud service, your backups can sync through that provider automatically/);
    await page.getByRole('button', { name: 'Choose folder' }).click();
    await page.getByRole('button', { name: 'Backup Now' }).waitFor();
    const files = () => page.evaluate(async () => { const d = await navigator.storage.getDirectory(); const out = []; for await (const [n] of d.entries()) out.push(n); return out.sort(); });
    await page.getByRole('button', { name: 'Backup Now' }).click();
    await page.locator('.toast', { hasText: /Backup saved as RecipeLibrary_Backup_\d{4}-\d{2}-\d{2}\.json/ }).waitFor();
    const list = await files();
    assert.equal(list.length, 1);
    const parsed = await page.evaluate(async (n) => { const d = await navigator.storage.getDirectory(); return JSON.parse(await (await (await d.getFileHandle(n)).getFile()).text()); }, list[0]);
    assert.equal(parsed.data.recipes.length, 6);
    await page.getByText(/Last backup:/).waitFor();

    // retention only touches our own files, and only when enabled
    await page.evaluate(async () => { const d = await navigator.storage.getDirectory(); for (let i = 1; i <= 8; i++) { const f = await d.getFileHandle(`RecipeLibrary_Backup_2020-01-0${i}.json`, { create: true }); const w = await f.createWritable(); await w.write('{}'); await w.close(); } const n = await d.getFileHandle('notes.txt', { create: true }); const w = await n.createWritable(); await w.write('mine'); await w.close(); });
    await page.getByRole('button', { name: 'Backup Now' }).click();
    await page.locator('.toast', { hasText: 'Backup saved' }).last().waitFor();
    assert.equal((await files()).length, 10, 'keep all by default: nothing deleted');
    await page.getByLabel('Backup retention').selectOption('7');
    await page.getByRole('button', { name: 'Backup Now' }).click();
    await until(async () => (await files()).filter((n) => n.startsWith('RecipeLibrary_')).length === 7, { message: 'retention trimmed to 7' });
    const after = await files();
    assert.ok(after.includes('notes.txt'), 'foreign files untouched');
    assert.ok(!after.includes('RecipeLibrary_Backup_2020-01-01.json') && after.includes('RecipeLibrary_Backup_2020-01-08.json'), 'oldest removed');

    // schedule: due -> one automatic backup on open; not due -> none
    await page.getByLabel('Backup Frequency').selectOption('daily');
    const today = list[0];
    const setLast = (daysAgo) => page.evaluate(async (d) => { const db = await import('/src/db.js'); const row = await db.get('backupMeta', 'state'); await db.put('backupMeta', { ...row, lastBackupDate: new Date(Date.now() - d * 86400000).toISOString() }); const dir = await navigator.storage.getDirectory(); try { await dir.removeEntry(`RecipeLibrary_Backup_${new Date().toLocaleDateString('en-CA')}.json`); } catch {} }, daysAgo);
    await setLast(0);
    await page.reload();
    await page.waitForTimeout(2500);
    assert.ok(!(await files()).includes(today), 'same day: not due yet');
    await page.getByLabel('Backup Frequency').selectOption('weekly').catch(() => {});
    await setLast(3);
    await page.getByLabel('Backup Frequency').selectOption('daily');
    await page.reload();
    await until(async () => (await files()).includes(today), { timeout: 6000, message: 'automatic backup created when due' });
  });

  test('backup schedule without folder support falls back to a download reminder', async ({ ctx, app }) => {
    await ctx.addInitScript(() => { delete window.showDirectoryPicker; });
    const page = await openApp(ctx, app);
    await seed(page, plain);
    await page.goto(`${app}/#/settings`);
    await page.getByText(/can.t write to a folder you choose/).waitFor();
    await page.getByLabel('Backup Frequency').selectOption('daily');
    await page.reload();
    await page.locator('.banner', { hasText: 'time for a backup' }).waitFor({ timeout: 6000 });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download backup' }).click()]);
    assert.match(dl.suggestedFilename(), /^RecipeLibrary_Backup_/);
  });

  test('print layouts, JSON export and share target', async ({ ctx, app }) => {
    const page = await openApp(ctx, app);
    await seed(page, [{ ...plain[4], id: 'p1', title: 'Print Me', notes: 'Personal note' }]);
    await page.goto(`${app}/#/recipe/p1`);
    await page.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints++; }; });
    for (const [item, cls] of [['Print — Recipe Card layout', 'print-card'], ['Print — Full Page layout', 'print-full']]) {
      await page.getByRole('button', { name: 'Print or export' }).click();
      await page.getByRole('button', { name: new RegExp(item) }).click();
      await until(() => page.evaluate(() => window.__prints) , { message: 'print called' });
      await page.evaluate(() => { window.__prints = 0; });
      const html = await page.locator('#print-root').innerHTML();
      assert.ok(html.includes(cls), cls);
      const text = await page.locator('#print-root').evaluate((el) => el.textContent);
      assert.match(text, /Print Me/); assert.match(text, /4 cups broth/); assert.match(text, /Personal note/); assert.match(text, /https:\/\/example\.com\/web-soup/);
    }
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#app').evaluate((el) => getComputedStyle(el).display), 'none');
    assert.notEqual(await page.locator('#print-root').evaluate((el) => getComputedStyle(el).display), 'none');
    await page.emulateMedia({ media: 'screen' });
    assert.equal(await page.locator('#print-root').evaluate((el) => getComputedStyle(el).display), 'none');

    const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.getByRole('button', { name: 'Print or export' }).click(); await page.getByRole('button', { name: /Download recipe as JSON/ }).click(); })()]);
    assert.equal(dl.suggestedFilename(), 'print-me.json');

    // share target: ?url= / ?text= lands on the import screen, prefilled
    await page.goto(`${app}/?title=x&text=${encodeURIComponent('Look at this https://example.com/recipes/soup yum')}`);
    await page.getByRole('heading', { name: 'Import Recipe', level: 1 }).waitFor();
    assert.equal(await page.getByLabel('Recipe link').inputValue(), 'https://example.com/recipes/soup');
    assert.equal(await page.evaluate(() => location.search), '');
  });

  test('settings: sample data, install prompt, strong delete-all confirmation', async ({ ctx, app }) => {
    const page = await openApp(ctx, app, '#/settings');
    await page.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => {}; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
    await page.getByRole('button', { name: 'Install app' }).waitFor();
    await page.getByRole('button', { name: 'Load Sample Data' }).click();
    await page.goto(`${app}/#/recipes`);
    await page.locator('.recipe-card').first().waitFor();
    assert.equal(await page.locator('.badge-sample').count(), 6);
    assert.match(await page.locator('.badge-sample').first().textContent(), /Sample Recipe/i);
    await seed(page, [{ id: 'mine', title: 'My Own', ingredients: ['1 cup x'] }]);
    await page.goto(`${app}/#/settings`);
    await page.getByRole('button', { name: 'Clear Sample Data' }).click();
    await until(() => page.evaluate(async () => (await import('/src/recipes.js')).recipeCount() === 1), { message: 'samples cleared, mine kept' });
    await page.getByRole('button', { name: /Delete All Data/ }).click();
    const dlg = page.locator('dialog[open]');
    const go = dlg.getByRole('button', { name: 'Delete everything' });
    assert.equal(await go.isDisabled(), true);
    await dlg.getByLabel(/Type DELETE/).fill('delete');
    await dlg.getByLabel('I understand my data will be permanently deleted.').check();
    assert.equal(await go.isDisabled(), true, 'case-sensitive phrase required');
    await dlg.getByLabel(/Type DELETE/).fill('DELETE');
    await go.click();
    await page.getByRole('heading', { name: 'My Recipes', level: 1 }).waitFor();
    await page.getByText('No recipes yet.').waitFor();
    assert.equal(await page.evaluate(async () => (await import('/src/recipes.js')).recipeCount()), 0);
  });

  test('performance: 2,000 recipes stay responsive (chunked rendering, fast search)', async ({ ctx, app }) => {
    const page = await openApp(ctx, app);
    await page.evaluate(async () => {
      const { saveManyRecipes, createBlankRecipe } = await import('/src/recipes.js');
      const list = Array.from({ length: 2000 }, (_, i) => createBlankRecipe({ title: `Recipe number ${i}`, categories: [['Dinner', 'Lunch', 'Breakfast'][i % 3]], tags: [`t${i % 17}`], ingredients: [`${i % 5 + 1} cups ingredient${i}`, '1 tsp salt'], instructionSections: [{ section: 'Main', steps: ['Cook it.'] }], createdAt: new Date(Date.now() - i * 1000).toISOString() }));
      await saveManyRecipes(list, { touch: false });
    });
    const t0 = Date.now();
    await page.reload();
    await page.locator('.recipe-card').first().waitFor();
    const load = Date.now() - t0;
    assert.ok(load < 4000, `first render of 2000 recipes took ${load}ms`);
    assert.equal(await page.locator('.recipe-card').count(), 48, 'only a chunk is rendered');
    assert.equal(await page.locator('.result-count').textContent(), '2000 recipes');
    const avg = await page.evaluate(async () => { const { queryRecipes } = await import('/src/recipes.js'); const t = performance.now(); for (let i = 0; i < 30; i++) queryRecipes({ text: `ingredient19${i % 10}`, sort: 'alpha' }); return (performance.now() - t) / 30; });
    assert.ok(avg < 25, `search averaged ${avg.toFixed(1)}ms`);
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('ingredient1999');
    await until(async () => (await page.locator('.recipe-card').count()) === 1, { message: 'search narrows 2000 -> 1' });
    await page.getByRole('searchbox', { name: 'Search recipes' }).fill('');
    await until(async () => (await page.locator('.recipe-card').count()) === 48);
    await page.getByRole('button', { name: 'Show more' }).click();
    await until(async () => (await page.locator('.recipe-card').count()) === 96, { message: 'show more' });
  });
}
