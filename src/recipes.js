/**
 * recipes.js — recipe data model, persistence, search, filtering, history.
 *
 * All recipes are cached in memory after init() (a few thousand small records
 * is a few MB without images), which keeps search/filter/sort instantaneous.
 * Writes go to IndexedDB first and then update the cache + notify listeners.
 *
 * MODEL NOTES
 *  - `ingredients` items always carry the untouched `original` text; the parsed
 *    fields (quantity/unit/ingredient…) are derived and re-derived on save.
 *  - `image` is the original remote URL (kept for reference); `imageId` points
 *    at the locally cached, compressed copy in the `images` store.
 *  - `schemaVersion` + normalizeRecipe() are the lazy-migration hook: every
 *    record is normalised when loaded, so older rows keep working.
 */
import * as db from './db.js';
import { parseIngredient, parseServings } from './ingredients.js';
import { canonicalCategories } from './taxonomy.js';
import { uid, createEmitter, normalizeText, nowIso, compareText, uniqueStrings } from './util.js';

export const RECIPE_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export function createBlankRecipe(overrides = {}) {
  const now = nowIso();
  return normalizeRecipe({
    id: uid(),
    title: '',
    description: '',
    image: '',
    imageId: '',
    sourceName: '',
    sourceUrl: '',
    author: '',
    datePublished: '',
    dateImported: '',
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    totalTimeMinutes: null,
    servings: '',
    cuisine: [],
    categories: [],
    tags: [],
    ingredients: [],
    instructionSections: [],
    notes: '',
    personalRating: null,
    favorite: false,
    madeBefore: false,
    madeCount: 0,
    lastMade: null,
    collections: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

const str = (v) => (v == null ? '' : String(v));
const strList = (v) => uniqueStrings(Array.isArray(v) ? v.map(str) : str(v).split(/[,;\n]/));
const minutes = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) && n > 0 ? Math.round(n) : null;
};

function normalizeIngredientItem(item) {
  if (typeof item === 'string') {
    const parsed = parseIngredient(item);
    return parsed.original ? parsed : null;
  }
  if (!item || typeof item !== 'object') return null;
  const original = str(item.original || item.text || item.ingredient).trim();
  if (!original) return null;
  // Re-derive parsed fields from the original so they can never drift.
  return parseIngredient(original);
}

function normalizeSections(input, legacySteps) {
  let sections = Array.isArray(input) ? input : [];
  if (!sections.length && Array.isArray(legacySteps)) sections = [{ section: 'Main', steps: legacySteps }];
  const out = [];
  for (const s of sections) {
    const steps = (Array.isArray(s && s.steps) ? s.steps : Array.isArray(s) ? s : [])
      .map((x) => str(x).trim())
      .filter(Boolean);
    if (!steps.length && !str(s && s.section).trim()) continue;
    out.push({ section: str(s && s.section).trim() || 'Main', steps });
  }
  return out.filter((s) => s.steps.length);
}

/** Bring any recipe-shaped object (old version, import, backup) to the current model. */
export function normalizeRecipe(input) {
  const r = input && typeof input === 'object' ? input : {};
  const now = nowIso();
  const rating = parseInt(r.personalRating, 10);
  const madeCount = Math.max(0, parseInt(r.madeCount, 10) || 0);
  const out = {
    id: str(r.id) || uid(),
    schemaVersion: RECIPE_SCHEMA_VERSION,
    title: str(r.title).trim(),
    description: str(r.description).trim(),
    image: str(r.image).trim(),
    imageId: str(r.imageId),
    sourceName: str(r.sourceName).trim(),
    sourceUrl: str(r.sourceUrl).trim(),
    author: str(r.author).trim(),
    datePublished: str(r.datePublished),
    dateImported: str(r.dateImported),
    prepTimeMinutes: minutes(r.prepTimeMinutes),
    cookTimeMinutes: minutes(r.cookTimeMinutes),
    totalTimeMinutes: minutes(r.totalTimeMinutes),
    servings: str(r.servings).trim(),
    cuisine: strList(r.cuisine),
    categories: canonicalCategories(r.categories),
    tags: strList(r.tags),
    ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map(normalizeIngredientItem).filter(Boolean),
    instructionSections: normalizeSections(r.instructionSections, r.instructions),
    notes: str(r.notes),
    personalRating: rating >= 1 && rating <= 5 ? rating : null,
    favorite: !!r.favorite,
    madeBefore: !!r.madeBefore || madeCount > 0,
    madeCount,
    lastMade: r.lastMade ? str(r.lastMade) : null,
    collections: uniqueStrings(r.collections),
    createdAt: str(r.createdAt) || now,
    updatedAt: str(r.updatedAt) || str(r.createdAt) || now,
    // --- extensions beyond the base model (all optional) ---
    inbox: !!r.inbox,
    sample: !!r.sample,
    nutrition: r.nutrition && typeof r.nutrition === 'object' ? r.nutrition : null,
    sourceRating: r.sourceRating && typeof r.sourceRating === 'object' && r.sourceRating.value ? { value: +r.sourceRating.value, count: r.sourceRating.count ? +r.sourceRating.count : null } : null,
    basedOn: r.basedOn && typeof r.basedOn === 'object' && (r.basedOn.url || r.basedOn.title) ? { id: str(r.basedOn.id), title: str(r.basedOn.title), url: str(r.basedOn.url), sourceName: str(r.basedOn.sourceName) } : null,
    preferredServings: r.preferredServings ? Number(r.preferredServings) || null : null,
  };
  out.sourceUrlNorm = normalizeUrl(out.sourceUrl);
  return out;
}

/** Total time, falling back to prep + cook when total is unknown. */
export function effectiveTotalMinutes(r) {
  if (r.totalTimeMinutes) return r.totalTimeMinutes;
  if (r.prepTimeMinutes || r.cookTimeMinutes) return (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0);
  return null;
}

export function baseServings(r) { return parseServings(r.servings); }

// ---------------------------------------------------------------------------
// URL / title normalisation (duplicate detection)
// ---------------------------------------------------------------------------

const TRACKING_PARAM = /^(utm_.*|fbclid|gclid|igshid|mc_cid|mc_eid|ref|ref_src|ref_url|cmp|campaign|_hsenc|_hsmi|yclid|msclkid|share|shared|jump|wprm_print|print)$/i;

/** Canonical form of a URL for comparing "is this the same page?". */
export function normalizeUrl(input) {
  const s = str(input).trim();
  if (!s) return '';
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`); } catch { return ''; }
  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const path = url.pathname.replace(/\/+$/, '').replace(/\/amp$/i, '') || '';
  const params = [...url.searchParams.entries()]
    .filter(([k]) => !TRACKING_PARAM.test(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${host}${path}${params ? `?${params}` : ''}`;
}

export function normalizeTitle(t) {
  return normalizeText(t).replace(/&/g, ' and ').replace(/\brecipes?\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const cache = new Map();
const searchIndex = new Map();
const emitter = createEmitter();
export const onRecipesChange = emitter.on;
let collectionNames = () => new Map();

/** collections.js registers a resolver so search can match collection names. */
export function setCollectionNameResolver(fn) { collectionNames = fn; }

export async function initRecipes() {
  cache.clear();
  searchIndex.clear();
  const rows = await db.getAll(db.STORES.recipes);
  for (const row of rows) {
    const r = normalizeRecipe(row);
    cache.set(r.id, r);
  }
  rebuildSearchIndex();
}

export function allRecipes() { return [...cache.values()]; }
export function getRecipe(id) { return cache.get(id) || null; }
export function recipeCount() { return cache.size; }
export function inboxCount() { let n = 0; for (const r of cache.values()) if (r.inbox) n++; return n; }

function indexText(r, names) {
  const parts = [
    r.title, r.sourceName, r.author, r.notes, r.description,
    ...r.categories, ...r.cuisine, ...r.tags,
    ...r.ingredients.map((i) => i.original),
    ...r.collections.map((id) => names.get(id) || ''),
  ];
  return normalizeText(parts.join(' \n '));
}

export function rebuildSearchIndex() {
  const names = collectionNames();
  searchIndex.clear();
  for (const r of cache.values()) {
    searchIndex.set(r.id, { text: indexText(r, names), title: normalizeText(r.title), meta: normalizeText([...r.categories, ...r.tags, ...r.cuisine].join(' ')) });
  }
}

function reindex(r) {
  const names = collectionNames();
  searchIndex.set(r.id, { text: indexText(r, names), title: normalizeText(r.title), meta: normalizeText([...r.categories, ...r.tags, ...r.cuisine].join(' ')) });
}

/**
 * Persist a recipe (insert or update). `touch: false` keeps updatedAt (used for
 * bookkeeping changes such as favourites that shouldn't reorder "recently edited").
 */
export async function saveRecipe(input, { touch = true, silent = false } = {}) {
  const r = normalizeRecipe(input);
  if (!r.title) r.title = 'Untitled recipe';
  if (touch) r.updatedAt = nowIso();
  await db.put(db.STORES.recipes, r);
  const existed = cache.has(r.id);
  cache.set(r.id, r);
  reindex(r);
  if (!silent) emitter.emit({ type: existed ? 'update' : 'add', id: r.id });
  return r;
}

export async function saveManyRecipes(list, { touch = true } = {}) {
  const rows = list.map((x) => {
    const r = normalizeRecipe(x);
    if (!r.title) r.title = 'Untitled recipe';
    if (touch) r.updatedAt = nowIso();
    return r;
  });
  await db.putMany(db.STORES.recipes, rows);
  for (const r of rows) { cache.set(r.id, r); reindex(r); }
  emitter.emit({ type: 'bulk', ids: rows.map((r) => r.id) });
  return rows;
}

export async function deleteRecipes(ids, { imageCleanup } = {}) {
  const list = ids.filter((id) => cache.has(id));
  if (!list.length) return;
  const removed = list.map((id) => cache.get(id));
  await db.transaction([db.STORES.recipes, db.STORES.history], 'readwrite', async (s) => {
    const recipes = s(db.STORES.recipes);
    const history = s(db.STORES.history);
    for (const id of list) {
      recipes.delete(id);
      const rows = await db.req(history.index('recipeId').getAllKeys(id));
      for (const k of rows) history.delete(k);
    }
  });
  for (const id of list) { cache.delete(id); searchIndex.delete(id); }
  emitter.emit({ type: 'remove', ids: list });
  if (imageCleanup) {
    // Only delete images no remaining recipe still uses.
    const used = new Set([...cache.values()].map((r) => r.imageId).filter(Boolean));
    for (const r of removed) if (r.imageId && !used.has(r.imageId)) await imageCleanup(r.imageId);
  }
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

export async function toggleFavorite(id) {
  const r = getRecipe(id);
  if (!r) return null;
  return saveRecipe({ ...r, favorite: !r.favorite }, { touch: false });
}

export async function setRating(id, rating) {
  const r = getRecipe(id);
  if (!r) return null;
  return saveRecipe({ ...r, personalRating: rating >= 1 && rating <= 5 ? rating : null }, { touch: false });
}

export async function setNotes(id, notes) {
  const r = getRecipe(id);
  if (!r) return null;
  return saveRecipe({ ...r, notes }, { touch: true });
}

/** Add to / remove from the Recipe Inbox. */
export async function setInbox(id, inbox) {
  const r = getRecipe(id);
  if (!r) return null;
  return saveRecipe({ ...r, inbox: !!inbox }, { touch: false });
}

/**
 * Duplicate a recipe.
 *  - asMyVersion: keeps attribution ("Based on …" + original URL) and is fully editable.
 *  - otherwise: a plain copy.
 */
export async function duplicateRecipe(id, { asMyVersion = true } = {}) {
  const src = getRecipe(id);
  if (!src) return null;
  const now = nowIso();
  const basedOn = src.basedOn || (src.sourceUrl ? { id: src.id, title: src.title, url: src.sourceUrl, sourceName: src.sourceName } : null);
  const copy = {
    ...JSON.parse(JSON.stringify({ ...src, sourceUrlNorm: undefined })),
    id: uid(),
    title: asMyVersion ? `${src.title} (My Version)` : `${src.title} (Copy)`,
    favorite: false,
    personalRating: null,
    madeBefore: false,
    madeCount: 0,
    lastMade: null,
    inbox: false,
    sample: false,
    createdAt: now,
    updatedAt: now,
    dateImported: src.dateImported,
    basedOn: asMyVersion ? basedOn || { id: src.id, title: src.title, url: '', sourceName: '' } : src.basedOn,
  };
  // Attribution must never disappear: the copy keeps the source URL too.
  return saveRecipe(copy, { touch: false });
}

// ---------------------------------------------------------------------------
// Cooking history
// ---------------------------------------------------------------------------

export async function markMade(id, date = new Date()) {
  const r = getRecipe(id);
  if (!r) return null;
  const madeAt = date.toISOString();
  const entry = { id: uid(), recipeId: id, madeAt };
  await db.put(db.STORES.history, entry);
  const latest = !r.lastMade || madeAt > r.lastMade ? madeAt : r.lastMade;
  const saved = await saveRecipe({ ...r, madeCount: r.madeCount + 1, madeBefore: true, lastMade: latest }, { touch: false });
  return { recipe: saved, entry };
}

export async function undoMade(recipeId, entryId) {
  const r = getRecipe(recipeId);
  if (!r) return null;
  await db.del(db.STORES.history, entryId);
  const rows = await getHistory(recipeId);
  const last = rows.length ? rows[0].madeAt : null;
  const madeCount = Math.max(0, r.madeCount - 1);
  return saveRecipe({ ...r, madeCount, lastMade: last, madeBefore: madeCount > 0 }, { touch: false });
}

/** Newest first. */
export async function getHistory(recipeId) {
  const rows = await db.getAllByIndex(db.STORES.history, 'recipeId', recipeId);
  return rows.sort((a, b) => (a.madeAt < b.madeAt ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

/**
 * Find recipes that look like the one being imported.
 * `urls`: any URLs known for the page (requested, final, canonical).
 * Returns [{ recipe, reason: 'url' | 'title' }] with URL matches first.
 */
export function findDuplicates({ urls = [], title = '', excludeId = '' } = {}) {
  const wanted = new Set(urls.map(normalizeUrl).filter(Boolean));
  const t = normalizeTitle(title);
  const out = [];
  for (const r of cache.values()) {
    if (r.id === excludeId) continue;
    if (wanted.size && r.sourceUrlNorm && wanted.has(r.sourceUrlNorm)) {
      out.push({ recipe: r, reason: 'url' });
    } else if (t.length >= 4 && normalizeTitle(r.title) === t) {
      out.push({ recipe: r, reason: 'title' });
    }
  }
  return out.sort((a, b) => (a.reason === b.reason ? 0 : a.reason === 'url' ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Query: search + filters + sort
// ---------------------------------------------------------------------------

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Added', short: 'Newest' },
  { value: 'alpha', label: 'Alphabetical', short: 'A–Z' },
  { value: 'rating', label: 'Highest Rated', short: 'Top rated' },
  { value: 'made', label: 'Recently Made', short: 'Last made' },
  { value: 'time', label: 'Cooking Time', short: 'Quickest' },
];

export const QUICK_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'toTry', label: 'To Try' },
  { value: 'madeBefore', label: 'Made Before' },
  { value: 'Breakfast', label: 'Breakfast', category: true },
  { value: 'Lunch', label: 'Lunch', category: true },
  { value: 'Dinner', label: 'Dinner', category: true },
  { value: 'Snacks', label: 'Snacks', category: true },
  { value: 'Desserts', label: 'Desserts', category: true },
];

const has = (list, value) => list.some((x) => x.toLowerCase() === String(value).toLowerCase());

const SORTERS = {
  recent: (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : compareText(a.title, b.title)),
  alpha: (a, b) => compareText(a.title, b.title),
  rating: (a, b) => (b.personalRating || 0) - (a.personalRating || 0) || compareText(a.title, b.title),
  made: (a, b) => {
    if (a.lastMade && b.lastMade) return a.lastMade < b.lastMade ? 1 : -1;
    if (a.lastMade) return -1;
    if (b.lastMade) return 1;
    return compareText(a.title, b.title);
  },
  time: (a, b) => {
    const ta = effectiveTotalMinutes(a);
    const tb = effectiveTotalMinutes(b);
    if (ta == null && tb == null) return compareText(a.title, b.title);
    if (ta == null) return 1;
    if (tb == null) return -1;
    return ta - tb || compareText(a.title, b.title);
  },
};

/**
 * @param {object} o
 * @param {string} o.text          search text (AND across words)
 * @param {string} o.quick         all | favorites | toTry | madeBefore | inbox | <meal category>
 * @param {string} o.category      extra category filter
 * @param {string} o.cuisine       cuisine filter
 * @param {string} o.collection    collection id filter
 * @param {string} o.tag           tag filter
 * @param {string} o.sort          one of SORT_OPTIONS
 */
export function queryRecipes({ text = '', quick = 'all', category = '', cuisine = '', collection = '', tag = '', sort = 'recent' } = {}) {
  const tokens = normalizeText(text).split(/\s+/).filter(Boolean);
  const results = [];
  for (const r of cache.values()) {
    if (quick === 'favorites' && !r.favorite) continue;
    if (quick === 'toTry' && r.madeBefore) continue;
    if (quick === 'madeBefore' && !r.madeBefore) continue;
    if (quick === 'inbox' && !r.inbox) continue;
    if (quick !== 'all' && !['favorites', 'toTry', 'madeBefore', 'inbox'].includes(quick) && !has(r.categories, quick)) continue;
    if (category && !has(r.categories, category)) continue;
    if (cuisine && !has(r.cuisine, cuisine)) continue;
    if (tag && !has(r.tags, tag)) continue;
    if (collection && !r.collections.includes(collection)) continue;
    let score = 0;
    if (tokens.length) {
      const idx = searchIndex.get(r.id);
      if (!idx) continue;
      let ok = true;
      for (const tok of tokens) {
        if (idx.title.includes(tok)) score += 3;
        else if (idx.meta.includes(tok)) score += 2;
        else if (idx.text.includes(tok)) score += 1;
        else { ok = false; break; }
      }
      if (!ok) continue;
    }
    results.push({ r, score });
  }
  const cmp = SORTERS[sort] || SORTERS.recent;
  results.sort((a, b) => b.score - a.score || cmp(a.r, b.r));
  return results.map((x) => x.r);
}

/** Distinct categories / cuisines / tags with counts (for the Filter sheet). */
export function facets() {
  const count = (pick) => {
    const m = new Map();
    for (const r of cache.values()) for (const v of pick(r)) {
      const k = v.toLowerCase();
      const e = m.get(k) || { value: v, count: 0 };
      e.count++;
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => compareText(a.value, b.value));
  };
  return { categories: count((r) => r.categories), cuisines: count((r) => r.cuisine), tags: count((r) => r.tags) };
}
