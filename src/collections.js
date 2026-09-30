/**
 * collections.js — user collections ("folders" where one recipe can live in
 * several). The membership lives on the recipe (`recipe.collections` = ids) so
 * a recipe always travels with its collections in exports/backups.
 */
import * as db from './db.js';
import { uid, createEmitter, nowIso, compareText } from './util.js';
import {
  allRecipes, saveManyRecipes, getRecipe, setCollectionNameResolver, rebuildSearchIndex,
} from './recipes.js';

const cache = new Map();
const emitter = createEmitter();
export const onCollectionsChange = emitter.on;

export const SUGGESTED_COLLECTIONS = ['Breakfast', 'Weeknight Dinner', 'Meal Prep', 'Baking', 'Vegetarian', 'Holiday', 'Air Fryer', 'Recipes to Try'];

export class CollectionError extends Error {}

export async function initCollections() {
  cache.clear();
  const rows = await db.getAll(db.STORES.collections);
  rows.forEach((c, i) => cache.set(c.id, { id: c.id, name: String(c.name || 'Untitled'), order: Number.isFinite(c.order) ? c.order : i, createdAt: c.createdAt || nowIso(), updatedAt: c.updatedAt || nowIso() }));
  setCollectionNameResolver(() => new Map([...cache.values()].map((c) => [c.id, c.name])));
  rebuildSearchIndex();
}

export function listCollections() {
  return [...cache.values()].sort((a, b) => a.order - b.order || compareText(a.name, b.name));
}
export function getCollection(id) { return cache.get(id) || null; }

export function collectionRecipeCount(id) {
  let n = 0;
  for (const r of allRecipes()) if (r.collections.includes(id)) n++;
  return n;
}

function cleanName(name, exceptId = '') {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  if (!n) throw new CollectionError('Please enter a name for the collection.');
  if (n.length > 60) throw new CollectionError('Collection names can be up to 60 characters.');
  const dupe = [...cache.values()].find((c) => c.id !== exceptId && c.name.toLowerCase() === n.toLowerCase());
  if (dupe) throw new CollectionError(`You already have a collection called “${dupe.name}”.`);
  return n;
}

function changed() {
  rebuildSearchIndex();
  emitter.emit({ type: 'change' });
}

export async function createCollection(name) {
  const n = cleanName(name);
  const order = Math.max(-1, ...[...cache.values()].map((c) => c.order)) + 1;
  const c = { id: uid(), name: n, order, createdAt: nowIso(), updatedAt: nowIso() };
  await db.put(db.STORES.collections, c);
  cache.set(c.id, c);
  changed();
  return c;
}

export async function renameCollection(id, name) {
  const c = cache.get(id);
  if (!c) return null;
  const next = { ...c, name: cleanName(name, id), updatedAt: nowIso() };
  await db.put(db.STORES.collections, next);
  cache.set(id, next);
  changed();
  return next;
}

/** Move one step up (-1) or down (+1) in the user's ordering. */
export async function moveCollection(id, dir) {
  const list = listCollections();
  const i = list.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const rows = list.map((c, idx) => ({ ...c, order: idx }));
  await db.putMany(db.STORES.collections, rows);
  rows.forEach((c) => cache.set(c.id, c));
  changed();
}

/** Deleting a collection never deletes recipes — it only unlinks them. */
export async function deleteCollection(id) {
  if (!cache.has(id)) return;
  const members = allRecipes().filter((r) => r.collections.includes(id));
  await db.del(db.STORES.collections, id);
  cache.delete(id);
  if (members.length) await saveManyRecipes(members.map((r) => ({ ...r, collections: r.collections.filter((x) => x !== id) })), { touch: false });
  changed();
}

export async function addRecipesToCollection(collectionId, recipeIds) {
  if (!cache.has(collectionId)) return 0;
  const targets = recipeIds.map(getRecipe).filter((r) => r && !r.collections.includes(collectionId));
  if (targets.length) await saveManyRecipes(targets.map((r) => ({ ...r, collections: [...r.collections, collectionId] })), { touch: false });
  rebuildSearchIndex();
  return targets.length;
}

export async function removeRecipesFromCollection(collectionId, recipeIds) {
  const targets = recipeIds.map(getRecipe).filter((r) => r && r.collections.includes(collectionId));
  if (targets.length) await saveManyRecipes(targets.map((r) => ({ ...r, collections: r.collections.filter((x) => x !== collectionId) })), { touch: false });
  rebuildSearchIndex();
  return targets.length;
}

/** Replace a single recipe's collection membership. */
export async function setRecipeCollections(recipeId, collectionIds) {
  const r = getRecipe(recipeId);
  if (!r) return;
  await saveManyRecipes([{ ...r, collections: collectionIds.filter((id) => cache.has(id)) }], { touch: false });
}
