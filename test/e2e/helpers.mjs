// Shared helpers for the end-to-end scenarios.

/** Open the app in a fresh page and dismiss onboarding. */
export async function openApp(ctx, app, hash = '') {
  const page = await ctx.newPage();
  await page.goto(`${app}/${hash}`);
  const skip = page.locator('dialog.onboarding').getByRole('button', { name: 'Skip' });
  await skip.click();
  await page.locator('dialog.onboarding').waitFor({ state: 'detached' });
  return page;
}

/**
 * Insert recipes straight into the app's own store (fast setup for scenarios).
 * A recipe may carry `collectionNames: ['X']`; those collections are created on demand.
 */
export async function seed(page, recipes) {
  await page.evaluate(async (list) => {
    const { saveManyRecipes, createBlankRecipe } = await import('/src/recipes.js');
    const cols = await import('/src/collections.js');
    const prepared = [];
    for (const r of list) {
      const { collectionNames, ...rest } = r;
      const ids = [];
      for (const name of collectionNames || []) {
        const c = cols.listCollections().find((x) => x.name === name) || await cols.createCollection(name);
        ids.push(c.id);
      }
      prepared.push(createBlankRecipe({ ...rest, collections: ids }));
    }
    await saveManyRecipes(prepared, { touch: false });
  }, recipes);
}

export async function seedCollection(page, name) {
  return page.evaluate(async (n) => (await (await import('/src/collections.js')).createCollection(n)).id, name);
}

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();

/** Six varied recipes with known attributes (used by the search/filter/sort scenarios). */
export const SAMPLE_RECIPES = [
  { id: 's1', title: 'Tomato Pasta', servings: '4', categories: ['Dinner'], cuisine: ['Italian'], tags: ['pasta'], ingredients: ['12 oz spaghetti', '2 tbsp olive oil', '1 can tomatoes'], instructionSections: [{ section: 'Main', steps: ['Boil pasta for 10 minutes.', 'Add sauce.'] }], totalTimeMinutes: 30, favorite: true, personalRating: 4, madeCount: 3, lastMade: iso(1), createdAt: iso(1), collections: [] },
  { id: 's2', title: 'Overnight Oats', servings: '2', categories: ['Breakfast'], tags: ['make-ahead'], ingredients: ['1 cup oats', '1 cup milk'], instructionSections: [{ section: 'Main', steps: ['Stir and chill overnight.'] }], totalTimeMinutes: 485, personalRating: 5, madeCount: 1, lastMade: iso(10), createdAt: iso(2) },
  { id: 's3', title: 'Roasted Chickpeas', servings: '4', categories: ['Snacks'], tags: ['vegan', 'snack'], ingredients: ['2 cans chickpeas', '2 tbsp olive oil', '1 tsp salt'], instructionSections: [{ section: 'Main', steps: ['Roast at 400°F for 30 minutes.'] }], totalTimeMinutes: 35, favorite: true, createdAt: iso(3) },
  { id: 's4', title: 'Oat Cookies', servings: '12 cookies', categories: ['Desserts'], tags: ['baking'], ingredients: ['2 bananas', '1 1/2 cups oats'], instructionSections: [{ section: 'Main', steps: ['Mix and bake for 15 minutes.'] }], totalTimeMinutes: 25, notes: 'Kids liked these a lot', createdAt: iso(4) },
  { id: 's5', title: 'Web Soup', servings: '6', categories: ['Dinner'], tags: ['soup'], sourceName: 'example.com', sourceUrl: 'https://example.com/web-soup', ingredients: ['4 cups broth', '1 onion'], instructionSections: [{ section: 'Main', steps: ['Simmer for 20 minutes.'] }], createdAt: iso(5) },
  { id: 's6', title: 'Lemon Rice', servings: '4', categories: ['Lunch'], tags: ['rice'], ingredients: ['1 cup rice', '1 lemon'], instructionSections: [{ section: 'Main', steps: ['Cook rice.'] }], createdAt: iso(6) },
].map((r, i) => ({ ...r, collections: [], ...(i === 0 || i === 5 ? { collectionNames: ['Weeknight Dinners'] } : {}) }));

/** True when nothing pokes out horizontally (ignores content inside horizontally scrollable rows). */
export async function hasNoOverflow(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('.chip-row, .sr-only, .toast-region, dialog, .timer-tray, .skip-link')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`);
    }
    return { ok: document.documentElement.scrollWidth <= vw + 1 && offenders.length === 0, scrollWidth: document.documentElement.scrollWidth, vw, offenders: offenders.slice(0, 6) };
  });
}

/** Names of interactive elements that have no accessible name, etc. */
export async function a11yProblems(page) {
  return page.evaluate(() => {
    const problems = [];
    const nameOf = (el) => {
      const labelled = el.getAttribute('aria-labelledby');
      if (labelled) return labelled.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
      const aria = el.getAttribute('aria-label');
      if (aria && aria.trim()) return aria.trim();
      if (el.labels && el.labels.length) return Array.from(el.labels).map((l) => l.textContent).join(' ').trim();
      if (el.tagName === 'IMG') return el.getAttribute('alt') || '';
      return (el.textContent || '').trim() || el.getAttribute('title') || '';
    };
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && (r.width > 0 || r.height > 0 || el.matches('input[type=checkbox],input[type=file]')); };
    for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=radio], [role=checkbox]')) {
      if (!visible(el) && !el.closest('dialog')) continue;
      if (el.classList.contains('sr-only') && el.tagName === 'INPUT') { if (!nameOf(el)) problems.push(`no name: ${el.outerHTML.slice(0, 80)}`); continue; }
      if (!nameOf(el)) problems.push(`no accessible name: ${el.outerHTML.slice(0, 100)}`);
    }
    for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) problems.push(`img without alt: ${img.src.slice(0, 60)}`);
    for (const el of document.querySelectorAll('[tabindex]')) if (Number(el.getAttribute('tabindex')) > 0) problems.push('positive tabindex');
    const ids = new Map();
    for (const el of document.querySelectorAll('[id]')) ids.set(el.id, (ids.get(el.id) || 0) + 1);
    for (const [id, n] of ids) if (n > 1) problems.push(`duplicate id: ${id}`);
    for (const d of document.querySelectorAll('dialog[open]')) if (!d.getAttribute('aria-labelledby')) problems.push('dialog without label');
    if (document.querySelectorAll('h1').length !== 1) problems.push(`expected 1 h1, found ${document.querySelectorAll('h1').length}`);
    return problems;
  });
}
