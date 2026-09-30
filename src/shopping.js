/**
 * shopping.js — the shopping list.
 *
 * Items are created from recipe ingredients (scaled to the chosen servings) and
 * consolidated ONLY where quantities can be combined safely (see
 * ingredients.consolidateEntries): 1 onion + 2 onions + ½ onion = 3½ onions,
 * while 1 cup milk + 250 ml milk stay separate. Users can edit everything.
 */
import * as db from './db.js';
import {
  makeShoppingEntry, canMerge, mergeEntries, categorizeIngredient, parseIngredient,
  entryQuantityText, entryDisplayName, SHOPPING_CATEGORIES, parseServings,
} from './ingredients.js';
import { uid, createEmitter, nowIso } from './util.js';
import { getRecipe } from './recipes.js';

export { SHOPPING_CATEGORIES };

const LIST_ID = 'main';
let list = emptyList();
const emitter = createEmitter();
export const onShoppingChange = emitter.on;

function emptyList() {
  return { id: LIST_ID, name: 'Shopping List', items: [], updatedAt: nowIso() };
}

function normalizeItem(i) {
  if (!i || typeof i !== 'object' || !String(i.name || '').trim()) return null;
  return {
    id: i.id || uid(),
    name: String(i.name).trim(),
    key: String(i.key || ''),
    value: typeof i.value === 'number' && isFinite(i.value) ? i.value : null,
    max: typeof i.max === 'number' && isFinite(i.max) ? i.max : null,
    unitKey: String(i.unitKey || ''),
    unit: String(i.unit || ''),
    fam: String(i.fam || ''),
    sizeNote: String(i.sizeNote || ''),
    note: String(i.note || ''),
    raw: !!i.raw,
    qtyText: String(i.qtyText || ''), // free-text quantity typed by the user
    category: SHOPPING_CATEGORIES.includes(i.category) ? i.category : 'Other',
    checked: !!i.checked,
    notes: String(i.notes || ''),
    from: Array.isArray(i.from) ? i.from.map(String).slice(0, 12) : [],
    manual: !!i.manual,
  };
}

export async function initShopping() {
  const row = await db.get(db.STORES.shoppingLists, LIST_ID);
  list = row ? { id: LIST_ID, name: row.name || 'Shopping List', items: (row.items || []).map(normalizeItem).filter(Boolean), updatedAt: row.updatedAt || nowIso() } : emptyList();
}

export function getList() { return list; }
export function itemCount() { return list.items.length; }
export function uncheckedCount() { return list.items.filter((i) => !i.checked).length; }

async function persist() {
  list = { ...list, updatedAt: nowIso() };
  if (list.items.length) await db.put(db.STORES.shoppingLists, list);
  else await db.del(db.STORES.shoppingLists, LIST_ID);
  emitter.emit({ type: 'change' });
}

/** Text shown for an item's quantity (user text wins over computed). */
export function itemQuantityText(item) {
  if (item.qtyText) return item.qtyText;
  return entryQuantityText(item);
}
export function itemDisplayName(item) {
  return item.qtyText || item.raw ? item.name : entryDisplayName(item);
}

/** Grouped by category, in SHOPPING_CATEGORIES order; empty groups omitted. */
export function groupedItems() {
  return SHOPPING_CATEGORIES
    .map((category) => ({ category, items: list.items.filter((i) => i.category === category).sort((a, b) => Number(a.checked) - Number(b.checked)) }))
    .filter((g) => g.items.length);
}

/**
 * Add ingredients from recipes.
 * @param {Array<{recipeId: string, servings?: number|null}>} selections
 * @returns {{added: number, merged: number}}
 */
export async function addFromRecipes(selections) {
  let added = 0;
  let merged = 0;
  const items = [...list.items];
  for (const sel of selections) {
    const recipe = getRecipe(sel.recipeId);
    if (!recipe) continue;
    const base = parseServings(recipe.servings);
    const factor = sel.servings && base ? sel.servings / base : 1;
    for (const ing of recipe.ingredients) {
      const entry = makeShoppingEntry(ing, factor);
      if (!entry.name) continue;
      const idx = items.findIndex((it) => !it.checked && !it.manual && !it.qtyText && canMerge(it, entry));
      if (idx >= 0) {
        const m = mergeEntries(items[idx], entry);
        items[idx] = { ...items[idx], ...m, from: [...new Set([...items[idx].from, recipe.title])].slice(0, 12) };
        merged++;
      } else {
        items.push(normalizeItem({ ...entry, id: uid(), category: categorizeIngredient(entry.name), from: [recipe.title] }));
        added++;
      }
    }
  }
  list = { ...list, items };
  await persist();
  return { added, merged };
}

export async function addCustomItem({ name, quantity = '', category = '', notes = '' }) {
  const n = String(name || '').trim();
  if (!n) throw new Error('Please enter an item name.');
  const item = normalizeItem({ id: uid(), name: n, category: category || categorizeIngredient(n), notes, manual: true });
  applyQuantityText(item, quantity);
  list = { ...list, items: [...list.items, item] };
  await persist();
  return item;
}

/** Parse "2 cups" into structured fields when possible, else keep it as free text. */
function applyQuantityText(item, text) {
  const t = String(text || '').trim();
  item.qtyText = '';
  item.value = null; item.max = null; item.unitKey = ''; item.unit = ''; item.fam = ''; item.sizeNote = '';
  item.raw = true;
  if (!t) return;
  const p = parseIngredient(`${t} x`);
  if (p.quantityValue != null && p.ingredient === 'x') {
    item.value = p.quantityValue;
    item.max = p.quantityMax != null ? p.quantityMax : null;
    item.unitKey = p.unitKey || '';
    item.unit = p.unit || '';
    item.sizeNote = p.sizeNote || '';
    item.raw = false;
  } else {
    item.qtyText = t;
  }
}

export async function updateItem(id, patch) {
  const items = list.items.map((it) => {
    if (it.id !== id) return it;
    const next = { ...it };
    if ('name' in patch) next.name = String(patch.name || '').trim() || it.name;
    if ('category' in patch && SHOPPING_CATEGORIES.includes(patch.category)) next.category = patch.category;
    if ('notes' in patch) next.notes = String(patch.notes || '');
    if ('checked' in patch) next.checked = !!patch.checked;
    if ('quantity' in patch) { applyQuantityText(next, patch.quantity); next.manual = true; }
    return next;
  });
  list = { ...list, items };
  await persist();
}

export async function toggleItem(id) {
  const it = list.items.find((i) => i.id === id);
  if (it) await updateItem(id, { checked: !it.checked });
}

export async function removeItem(id) {
  list = { ...list, items: list.items.filter((i) => i.id !== id) };
  await persist();
}

export async function clearChecked() {
  list = { ...list, items: list.items.filter((i) => !i.checked) };
  await persist();
}

export async function clearList() {
  list = { ...list, items: [] };
  await persist();
}

/** Plain-text export for copy/paste into notes or messages. */
export function listAsText() {
  const lines = ['Shopping List', ''];
  for (const g of groupedItems()) {
    lines.push(g.category.toUpperCase());
    for (const it of g.items) {
      const qty = itemQuantityText(it);
      lines.push(`${it.checked ? '[x]' : '[ ]'} ${[qty, itemDisplayName(it)].filter(Boolean).join(' ')}${it.notes ? ` (${it.notes})` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
