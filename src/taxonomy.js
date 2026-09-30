/**
 * taxonomy.js — category normalisation shared by the importer and the app.
 * Pure (no DOM). Maps the many spellings sites use ("Main Course", "Dessert",
 * "Appetizer") onto the app's quick-filter categories.
 */

export const MEAL_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts'];

const RULES = [
  [/^(breakfasts?|brunch)$/, 'Breakfast'],
  [/^lunch(es)?$/, 'Lunch'],
  [/^(dinners?|suppers?|main courses?|main dish(es)?|mains?|entr[eé]es?)$/, 'Dinner'],
  [/^(snacks?|appetizers?|starters?|finger foods?|hors d'?oeuvres?)$/, 'Snacks'],
  [/^(desserts?|sweets?|sweet treats?)$/, 'Desserts'],
];

const SMALL_WORDS = new Set(['and', 'or', 'of', 'with', 'for', 'the', 'in', 'a', 'to']);

/** "side dish" -> "Side Dish", "soups and stews" -> "Soups and Stews"; keeps short acronyms (BBQ). */
export function titleCase(s) {
  return String(s)
    .split(/(\s+)/)
    .map((w, i) => {
      if (/^\s+$/.test(w) || !w) return w;
      if (w === w.toUpperCase() && /[A-Z]/.test(w) && w.length <= 4) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.replace(/(^|[-/(])([\p{L}])/gu, (_m, p, c) => p + c.toUpperCase());
    })
    .join('');
}

/** Canonical category for one label. Unknown labels are title-cased, not dropped. */
export function canonicalCategory(label) {
  const t = String(label || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const lower = t.toLowerCase();
  for (const [re, name] of RULES) if (re.test(lower)) return name;
  if (t.length > 40) return '';
  return titleCase(t);
}

/** Split/clean/dedupe a list (or comma separated string) of categories. */
export function canonicalCategories(input) {
  const raw = Array.isArray(input) ? input : String(input || '').split(/[,;|\n]/);
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const c = canonicalCategory(item);
    const k = c.toLowerCase();
    if (c && !seen.has(k)) {
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}
