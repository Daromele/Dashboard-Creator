/**
 * mealplanner.js — weekly meal plan (Monday → Sunday).
 *
 * One IndexedDB record per week, keyed by that week's Monday ("YYYY-MM-DD"):
 *   { weekStart, entries: [{ id, day: 0-6, slot, recipeId, title, servings }], updatedAt }
 * `title` is a snapshot so a plan remains readable even if a recipe is deleted
 * (deleted recipes are scrubbed from plans automatically anyway).
 */
import * as db from './db.js';
import { uid, createEmitter, nowIso, isoDate, startOfWeek, parseIsoDate, addDays } from './util.js';
import { onRecipesChange, getRecipe } from './recipes.js';

export const SLOTS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks', optional: true },
];

const plans = new Map(); // weekStart -> record
const emitter = createEmitter();
export const onPlanChange = emitter.on;

export async function initMealPlans() {
  plans.clear();
  for (const p of await db.getAll(db.STORES.mealPlans)) plans.set(p.weekStart, normalizePlan(p));
  // Keep plans tidy when recipes are deleted.
  onRecipesChange((evt) => { if (evt.type === 'remove') scrubRecipes(evt.ids).catch(console.error); });
}

function normalizePlan(p) {
  const entries = (Array.isArray(p.entries) ? p.entries : [])
    .filter((e) => e && e.recipeId && Number.isInteger(e.day) && e.day >= 0 && e.day <= 6 && SLOTS.some((s) => s.id === e.slot))
    .map((e) => ({ id: e.id || uid(), day: e.day, slot: e.slot, recipeId: String(e.recipeId), title: String(e.title || ''), servings: e.servings ? Number(e.servings) || null : null }));
  return { weekStart: p.weekStart, entries, updatedAt: p.updatedAt || nowIso() };
}

export function weekKey(date) { return isoDate(startOfWeek(date)); }
export function weekDates(weekStart) {
  const start = parseIsoDate(weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export function shiftWeek(weekStart, n) { return isoDate(addDays(parseIsoDate(weekStart), n * 7)); }

export function getWeekEntries(weekStart) {
  const p = plans.get(weekStart);
  return p ? p.entries : [];
}
export function allPlans() { return [...plans.values()]; }
export function plannedRecipeCount() { let n = 0; for (const p of plans.values()) n += p.entries.length; return n; }

async function savePlan(weekStart, entries) {
  const plan = { weekStart, entries, updatedAt: nowIso() };
  if (entries.length) {
    await db.put(db.STORES.mealPlans, plan);
    plans.set(weekStart, plan);
  } else {
    await db.del(db.STORES.mealPlans, weekStart);
    plans.delete(weekStart);
  }
  emitter.emit({ type: 'change', weekStart });
}

export async function addEntry(weekStart, { day, slot, recipeId, servings = null }) {
  const r = getRecipe(recipeId);
  if (!r) throw new Error('That recipe is no longer in your library.');
  const entry = { id: uid(), day, slot, recipeId, title: r.title, servings };
  await savePlan(weekStart, [...getWeekEntries(weekStart), entry]);
  return entry;
}

export async function removeEntry(weekStart, entryId) {
  await savePlan(weekStart, getWeekEntries(weekStart).filter((e) => e.id !== entryId));
}

/** Move an entry to another day/slot (optionally another week). */
export async function moveEntry(weekStart, entryId, { day, slot, weekStart: targetWeek = weekStart }) {
  const entry = getWeekEntries(weekStart).find((e) => e.id === entryId);
  if (!entry) return;
  const moved = { ...entry, day, slot };
  if (targetWeek === weekStart) {
    await savePlan(weekStart, getWeekEntries(weekStart).map((e) => (e.id === entryId ? moved : e)));
  } else {
    await savePlan(targetWeek, [...getWeekEntries(targetWeek), moved]);
    await savePlan(weekStart, getWeekEntries(weekStart).filter((e) => e.id !== entryId));
  }
}

export async function duplicateEntry(weekStart, entryId, { day, slot, weekStart: targetWeek = weekStart }) {
  const entry = getWeekEntries(weekStart).find((e) => e.id === entryId);
  if (!entry) return null;
  const copy = { ...entry, id: uid(), day, slot };
  await savePlan(targetWeek, [...getWeekEntries(targetWeek), copy]);
  return copy;
}

export async function clearWeek(weekStart) {
  await savePlan(weekStart, []);
}

async function scrubRecipes(ids) {
  const gone = new Set(ids);
  for (const p of [...plans.values()]) {
    const kept = p.entries.filter((e) => !gone.has(e.recipeId));
    if (kept.length !== p.entries.length) await savePlan(p.weekStart, kept);
  }
}

/** Refresh stored title snapshots after a rename (called on recipe updates). */
export function currentTitle(entry) {
  const r = getRecipe(entry.recipeId);
  return r ? r.title : entry.title || 'Removed recipe';
}
