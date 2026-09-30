/**
 * backup.js — export, validate, restore, and optional automatic folder backups.
 *
 * File format (JSON):
 *   { app: "recipe-library-studio", backupVersion, appVersion, schemaVersion,
 *     createdAt, scope: "full" | "recipes", includesImages,
 *     data: { recipes, collections, mealPlans, shoppingLists, history, images, settings } }
 *
 * Safety rules:
 *   - restore never writes before the file is validated and summarised
 *   - "Replace" runs in ONE IndexedDB transaction: it either fully succeeds or
 *     leaves the existing data untouched
 *   - "Merge" never deletes; conflicts keep whichever recipe was edited last
 *   - the backup-folder handle/permission never leaves the device
 */
import * as db from './db.js';
import {
  APP_VERSION, blobToDataUrl, dataUrlToBlob, isoDate, nowIso, parseIsoDate, createEmitter, download,
} from './util.js';
import {
  allRecipes, getRecipe, initRecipes, normalizeRecipe,
} from './recipes.js';
import { initCollections, listCollections } from './collections.js';
import { initMealPlans } from './mealplanner.js';
import { initShopping } from './shopping.js';
import {
  getSetting, setSetting, removeSetting, loadSettings, exportSettings, settingsRows, DEFAULTS,
} from './settings.js';

export const BACKUP_VERSION = 1;
export const BACKUP_APP_ID = 'recipe-library-studio';
export const FILE_NAME_RE = /^RecipeLibrary_Backup_\d{4}-\d{2}-\d{2}\.json$/;

const restoredEmitter = createEmitter();
/** Fires after any bulk data change (restore, delete-all, sample data) so views can refresh. */
export const onDataReloaded = restoredEmitter.on;

export function backupFileName(date = new Date()) {
  return `RecipeLibrary_Backup_${isoDate(date)}.json`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

/**
 * Snapshot the library.
 * @param {{includeImages?: boolean, recipeIds?: string[]|null}} opts
 *   recipeIds: export only these recipes (and what they need) instead of everything.
 */
export async function buildBackup({ includeImages = true, recipeIds = null } = {}) {
  const partial = Array.isArray(recipeIds);
  const stores = [db.STORES.recipes, db.STORES.collections, db.STORES.mealPlans, db.STORES.shoppingLists, db.STORES.history, db.STORES.images];
  // One read transaction = one consistent snapshot.
  const snap = await db.transaction(stores, 'readonly', async (s) => {
    const out = {};
    for (const name of stores) out[name] = await db.req(s(name).getAll());
    return out;
  });

  let recipes = snap.recipes.map(normalizeRecipe);
  if (partial) {
    const wanted = new Set(recipeIds);
    recipes = recipes.filter((r) => wanted.has(r.id));
  }
  const recipeIdSet = new Set(recipes.map((r) => r.id));
  const usedCollections = new Set(recipes.flatMap((r) => r.collections));
  const imageIds = new Set(recipes.map((r) => r.imageId).filter(Boolean));

  const data = {
    recipes: recipes.map(({ sourceUrlNorm, ...rest }) => rest),
    collections: snap.collections.filter((c) => !partial || usedCollections.has(c.id)),
    mealPlans: partial ? [] : snap.mealPlans,
    shoppingLists: partial ? [] : snap.shoppingLists,
    history: snap.history.filter((h) => !partial || recipeIdSet.has(h.recipeId)),
    images: [],
    settings: partial ? {} : exportSettings(),
  };

  if (includeImages) {
    for (const row of snap.images) {
      if (!imageIds.has(row.id)) continue; // skip images no exported recipe uses
      data.images.push({
        id: row.id,
        mime: row.mime,
        width: row.width,
        height: row.height,
        data: await blobToDataUrl(row.blob),
        thumb: row.thumb ? await blobToDataUrl(row.thumb) : undefined,
      });
    }
  }

  return {
    app: BACKUP_APP_ID,
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    schemaVersion: db.DB_VERSION,
    createdAt: nowIso(),
    scope: partial ? 'recipes' : 'full',
    includesImages: includeImages,
    data,
  };
}

/** Build + trigger a browser download. Returns the byte size. */
export async function downloadBackup(opts = {}) {
  const backup = await buildBackup({ includeImages: getSetting('backupIncludeImages'), ...opts });
  const json = JSON.stringify(backup);
  const blob = new Blob([json], { type: 'application/json' });
  download(opts.fileName || backupFileName(), blob);
  if (!opts.recipeIds) await markBackupDone({ file: opts.fileName || backupFileName(), bytes: blob.size, method: 'download' });
  return blob.size;
}

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/**
 * Validate a parsed backup and produce a cleaned copy plus a human summary.
 * Returns { ok, errors[], warnings[], summary, clean }.
 */
export function validateBackup(input) {
  const errors = [];
  const warnings = [];
  if (!isObj(input)) return fail('This file is not a valid backup (it is not a JSON object).');
  if (input.app !== BACKUP_APP_ID) return fail("This doesn't look like a Recipe Library Studio backup.");
  if (typeof input.backupVersion !== 'number' || input.backupVersion < 1) return fail('This backup is missing its version information.');
  if (input.backupVersion > BACKUP_VERSION) return fail('This backup was made by a newer version of the app. Update the app and try again.');
  if (!isObj(input.data)) return fail('This backup has no data section.');

  const d = input.data;
  const arr = (key) => {
    const v = d[key];
    if (v == null) return [];
    if (!Array.isArray(v)) { errors.push(`The "${key}" section is malformed.`); return []; }
    return v;
  };

  let skipped = 0;
  const recipes = [];
  for (const r of arr('recipes')) {
    if (!isObj(r) || typeof r.id !== 'string' || !r.id || typeof r.title !== 'string') { skipped++; continue; }
    recipes.push(normalizeRecipe(r));
  }
  const collections = arr('collections').filter((c) => isObj(c) && typeof c.id === 'string' && typeof c.name === 'string' && c.name.trim());
  const mealPlans = arr('mealPlans').filter((p) => isObj(p) && /^\d{4}-\d{2}-\d{2}$/.test(String(p.weekStart)) && Array.isArray(p.entries));
  const shoppingLists = arr('shoppingLists').filter((l) => isObj(l) && typeof l.id === 'string' && Array.isArray(l.items));
  const history = arr('history').filter((h) => isObj(h) && typeof h.id === 'string' && typeof h.recipeId === 'string' && typeof h.madeAt === 'string');
  const images = arr('images').filter((i) => isObj(i) && typeof i.id === 'string' && typeof i.data === 'string' && /^data:image\//.test(i.data));
  const settings = isObj(d.settings) ? d.settings : {};

  if (skipped) warnings.push(`${skipped} recipe${skipped === 1 ? ' was' : 's were'} skipped because the data was damaged.`);
  if (errors.length) return { ok: false, errors, warnings, summary: null, clean: null };

  const plannedMeals = mealPlans.reduce((n, p) => n + p.entries.length, 0);
  const summary = {
    recipes: recipes.length,
    collections: collections.length,
    mealPlans: mealPlans.length,
    plannedMeals,
    shoppingLists: shoppingLists.filter((l) => l.items.length).length,
    images: images.length,
    history: history.length,
    hasSettings: Object.keys(settings).length > 0,
    createdAt: input.createdAt || '',
    appVersion: input.appVersion || '',
    scope: input.scope || 'full',
  };
  if (!recipes.length && !collections.length && !mealPlans.length && !shoppingLists.length) {
    warnings.push('This backup does not contain any recipes or other data.');
  }
  return { ok: true, errors: [], warnings, summary, clean: { recipes, collections, mealPlans, shoppingLists, history, images, settings } };

  function fail(message) { return { ok: false, errors: [message], warnings: [], summary: null, clean: null }; }
}

/** Parse + validate backup text. Never throws. */
export function validateBackupText(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, errors: ['This file is not valid JSON, so it cannot be a backup.'], warnings: [], summary: null, clean: null }; }
  return validateBackup(parsed);
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

async function decodeImages(list) {
  const rows = [];
  for (const i of list) {
    try {
      const blob = await dataUrlToBlob(i.data);
      const thumb = i.thumb && /^data:image\//.test(i.thumb) ? await dataUrlToBlob(i.thumb) : undefined;
      rows.push({ id: i.id, blob, thumb, mime: i.mime || blob.type, width: i.width || 0, height: i.height || 0, createdAt: nowIso() });
    } catch { /* skip an undecodable image; the recipe simply keeps its remote URL */ }
  }
  return rows;
}

/** Re-load every in-memory cache from IndexedDB (after restore / wipe / sample data). */
export async function reloadAllData() {
  await loadSettings();
  await initCollections(); // registers the name resolver used by the search index
  await initRecipes();
  await initMealPlans();
  await initShopping();
  restoredEmitter.emit({ type: 'reloaded' });
}

/**
 * Restore a validated backup.
 * @param {object} clean   the `clean` object from validateBackup()
 * @param {'replace'|'merge'} mode
 * @returns {Promise<object>} counts describing what happened
 */
export async function restoreBackup(clean, mode) {
  const images = await decodeImages(clean.images);
  const result = mode === 'replace' ? await replaceAll(clean, images) : await mergeInto(clean, images);
  await reloadAllData();
  return result;
}

async function replaceAll(clean, images) {
  const deviceRows = (await db.getAll(db.STORES.settings)).filter((r) => !(r.key in DEFAULTS)); // device-local keys (folder handle…)
  const settingRows = [...deviceRows, ...settingsRows(clean.settings)];
  const stores = [db.STORES.recipes, db.STORES.images, db.STORES.collections, db.STORES.mealPlans, db.STORES.shoppingLists, db.STORES.history, db.STORES.settings];
  const knownCollections = new Set(clean.collections.map((c) => c.id));
  await db.transaction(stores, 'readwrite', (s) => {
    for (const name of stores) s(name).clear();
    for (const r of clean.recipes) s(db.STORES.recipes).put({ ...r, collections: r.collections.filter((c) => knownCollections.has(c)) });
    for (const i of images) s(db.STORES.images).put(i);
    clean.collections.forEach((c, idx) => s(db.STORES.collections).put({ id: c.id, name: String(c.name).trim(), order: Number.isFinite(c.order) ? c.order : idx, createdAt: c.createdAt || nowIso(), updatedAt: c.updatedAt || nowIso() }));
    for (const p of clean.mealPlans) s(db.STORES.mealPlans).put(p);
    for (const l of clean.shoppingLists) s(db.STORES.shoppingLists).put(l);
    for (const h of clean.history) s(db.STORES.history).put(h);
    for (const row of settingRows) s(db.STORES.settings).put(row);
  });
  return { mode: 'replace', recipes: clean.recipes.length, collections: clean.collections.length, mealPlans: clean.mealPlans.length, shoppingLists: clean.shoppingLists.length };
}

async function mergeInto(clean, images) {
  const result = { mode: 'merge', recipesAdded: 0, recipesUpdated: 0, recipesKept: 0, collectionsAdded: 0, mealPlansMerged: 0, itemsAdded: 0 };

  // Collections: same id OR same name (case-insensitive) = same collection.
  const existing = listCollections();
  const byName = new Map(existing.map((c) => [c.name.toLowerCase(), c.id]));
  const byId = new Set(existing.map((c) => c.id));
  const idMap = new Map();
  const newCollections = [];
  let order = Math.max(-1, ...existing.map((c) => c.order)) + 1;
  for (const c of clean.collections) {
    const name = String(c.name).trim();
    if (byId.has(c.id)) idMap.set(c.id, c.id);
    else if (byName.has(name.toLowerCase())) idMap.set(c.id, byName.get(name.toLowerCase()));
    else {
      newCollections.push({ id: c.id, name, order: order++, createdAt: c.createdAt || nowIso(), updatedAt: c.updatedAt || nowIso() });
      idMap.set(c.id, c.id);
      byName.set(name.toLowerCase(), c.id);
    }
  }
  result.collectionsAdded = newCollections.length;

  // Recipes: newer edit wins, nothing is deleted.
  const recipeWrites = [];
  const usedImages = new Set();
  for (const r of clean.recipes) {
    const mine = getRecipe(r.id);
    const incoming = { ...r, collections: [...new Set(r.collections.map((c) => idMap.get(c)).filter(Boolean))] };
    if (!mine) { recipeWrites.push(incoming); result.recipesAdded++; if (incoming.imageId) usedImages.add(incoming.imageId); }
    else if (incoming.updatedAt > mine.updatedAt) {
      recipeWrites.push({ ...incoming, collections: [...new Set([...mine.collections, ...incoming.collections])] });
      result.recipesUpdated++;
      if (incoming.imageId) usedImages.add(incoming.imageId);
    } else result.recipesKept++;
  }

  const stores = [db.STORES.recipes, db.STORES.images, db.STORES.collections, db.STORES.mealPlans, db.STORES.shoppingLists, db.STORES.history];
  await db.transaction(stores, 'readwrite', async (s) => {
    for (const c of newCollections) s(db.STORES.collections).put(c);
    for (const r of recipeWrites) s(db.STORES.recipes).put(r);

    const haveImages = new Set(await db.req(s(db.STORES.images).getAllKeys()));
    for (const i of images) if (!haveImages.has(i.id) && usedImages.has(i.id)) s(db.STORES.images).put(i);

    // Meal plans: union entries per week, by entry id.
    for (const p of clean.mealPlans) {
      const cur = await db.req(s(db.STORES.mealPlans).get(p.weekStart));
      const entries = cur ? [...cur.entries] : [];
      const ids = new Set(entries.map((e) => e.id));
      let added = 0;
      for (const e of p.entries) if (!ids.has(e.id)) { entries.push(e); added++; }
      if (!cur || added) { s(db.STORES.mealPlans).put({ weekStart: p.weekStart, entries, updatedAt: nowIso() }); result.mealPlansMerged++; }
    }

    // Shopping list: union items by id.
    for (const l of clean.shoppingLists) {
      const cur = await db.req(s(db.STORES.shoppingLists).get(l.id));
      const items = cur ? [...cur.items] : [];
      const ids = new Set(items.map((i) => i.id));
      for (const item of l.items) if (!ids.has(item.id)) { items.push(item); result.itemsAdded++; }
      s(db.STORES.shoppingLists).put({ ...(cur || l), items, updatedAt: nowIso() });
    }

    // History rows are immutable events: add missing ones.
    for (const h of clean.history) s(db.STORES.history).put(h);
  });
  return result;
}

// ---------------------------------------------------------------------------
// Backup metadata
// ---------------------------------------------------------------------------

const META_KEY = 'state';

export async function getBackupMeta() {
  const row = await db.get(db.STORES.backupMeta, META_KEY);
  return row || { key: META_KEY, lastBackupDate: null, lastBackupFile: '', lastBackupBytes: 0, lastBackupMethod: '', lastBackupStatus: '', lastError: '', backupFolderPermission: 'none', history: [] };
}

async function saveBackupMeta(patch) {
  const cur = await getBackupMeta();
  const next = { ...cur, ...patch, key: META_KEY };
  await db.put(db.STORES.backupMeta, next);
  return next;
}

async function markBackupDone({ file, bytes, method }) {
  const cur = await getBackupMeta();
  const entry = { at: nowIso(), file, bytes, method };
  return saveBackupMeta({
    lastBackupDate: entry.at, lastBackupFile: file, lastBackupBytes: bytes, lastBackupMethod: method, lastBackupStatus: 'ok', lastError: '',
    history: [entry, ...(cur.history || [])].slice(0, 10),
  });
}

// ---------------------------------------------------------------------------
// Automatic Backup Folder (File System Access API)
// ---------------------------------------------------------------------------

export function folderBackupSupported() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function getHandle() {
  const row = await db.get(db.STORES.settings, 'backupFolderHandle');
  return row ? row.value : null;
}

async function permissionOf(handle, request = false) {
  if (!handle || !handle.queryPermission) return 'none';
  try {
    let p = await handle.queryPermission({ mode: 'readwrite' });
    if (p !== 'granted' && request && handle.requestPermission) p = await handle.requestPermission({ mode: 'readwrite' });
    return p;
  } catch { return 'denied'; }
}

/** State shown in Settings: { supported, hasFolder, name, permission } */
export async function getFolderStatus() {
  if (!folderBackupSupported()) return { supported: false, hasFolder: false, name: '', permission: 'unsupported' };
  const handle = await getHandle();
  if (!handle) return { supported: true, hasFolder: false, name: '', permission: 'none' };
  const permission = await permissionOf(handle);
  await saveBackupMeta({ backupFolderPermission: permission });
  return { supported: true, hasFolder: true, name: handle.name || getSetting('backupFolderName') || 'Chosen folder', permission };
}

/** Must be called from a user gesture. Returns the folder name, or null if cancelled. */
export async function chooseBackupFolder() {
  if (!folderBackupSupported()) throw new Error('unsupported');
  let handle;
  try {
    handle = await window.showDirectoryPicker({ id: 'recipe-library-backups', mode: 'readwrite', startIn: 'documents' });
  } catch (err) {
    if (err && err.name === 'AbortError') return null;
    throw err;
  }
  const permission = await permissionOf(handle, true);
  if (permission !== 'granted') throw new Error('permission-denied');
  await setSetting('backupFolderHandle', handle); // structured-cloneable; stays on this device
  await setSetting('backupFolderName', handle.name || 'Chosen folder');
  await saveBackupMeta({ backupFolderPermission: 'granted' });
  return handle.name || 'Chosen folder';
}

export async function removeBackupFolder() {
  await removeSetting('backupFolderHandle');
  await removeSetting('backupFolderName');
  await saveBackupMeta({ backupFolderPermission: 'none' });
}

/** Re-grant access after the browser reset it (needs a user gesture). */
export async function reauthorizeFolder() {
  const handle = await getHandle();
  if (!handle) return 'none';
  const p = await permissionOf(handle, true);
  await saveBackupMeta({ backupFolderPermission: p });
  return p;
}

/**
 * Write a backup file into the chosen folder.
 * @param {{interactive?: boolean}} opts interactive=true (from a click) may prompt for permission.
 * @returns {Promise<{ok: boolean, file?: string, bytes?: number, needsPermission?: boolean, error?: string}>}
 */
export async function backupToFolder({ interactive = false } = {}) {
  const handle = await getHandle();
  if (!handle) return { ok: false, error: 'No backup folder has been chosen yet.' };
  const permission = await permissionOf(handle, interactive);
  if (permission !== 'granted') return { ok: false, needsPermission: true, error: 'Folder access needs to be allowed again.' };
  try {
    const backup = await buildBackup({ includeImages: getSetting('backupIncludeImages') });
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const name = backupFileName();
    const fileHandle = await handle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    await markBackupDone({ file: name, bytes: blob.size, method: 'folder' });
    const pruned = await applyRetention(handle).catch(() => 0);
    return { ok: true, file: name, bytes: blob.size, pruned };
  } catch (err) {
    const message = err && err.name === 'NotAllowedError' ? 'The browser no longer allows writing to that folder.'
      : err && err.name === 'NotFoundError' ? 'The backup folder could not be found. Choose it again.'
        : err && err.name === 'QuotaExceededError' ? 'There is not enough free space to save the backup.'
          : 'The backup could not be written.';
    await saveBackupMeta({ lastBackupStatus: 'failed', lastError: message }).catch(() => {});
    return { ok: false, error: message, needsPermission: err && err.name === 'NotAllowedError' };
  }
}

/**
 * Delete old backup files ONLY if the user enabled retention and ONLY files
 * that match our own naming pattern. Returns the number removed.
 */
export async function applyRetention(handle) {
  const keep = getSetting('backupRetention');
  if (keep === 'all' || !keep) return 0;
  const limit = Number(keep);
  if (!limit || limit < 1) return 0;
  const names = [];
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === 'file' && FILE_NAME_RE.test(name)) names.push(name);
  }
  names.sort().reverse(); // date is in the name: newest first
  let removed = 0;
  for (const name of names.slice(limit)) {
    try { await handle.removeEntry(name); removed++; } catch { /* leave it */ }
  }
  return removed;
}

// ---- scheduling ---------------------------------------------------------------

const FREQ_DAYS = { daily: 1, every3: 3, weekly: 7 };

export function backupDue(frequency, lastIso, now = new Date()) {
  const gap = FREQ_DAYS[frequency];
  if (!gap) return false;
  if (!lastIso) return true;
  const last = new Date(lastIso);
  if (isNaN(last.getTime())) return true;
  const a = parseIsoDate(isoDate(last));
  const b = parseIsoDate(isoDate(now));
  const days = Math.round((b - a) / 86_400_000);
  return days >= gap;
}

/**
 * Called when the app opens. Creates at most ONE backup if enough time has
 * passed. The PWA cannot run while closed, so nothing happens in the background.
 * Returns { action: 'none'|'backed-up'|'needs-permission'|'remind-download'|'failed', … }
 */
export async function maybeAutoBackup() {
  const frequency = getSetting('backupFrequency');
  if (!FREQ_DAYS[frequency]) return { action: 'none' };
  if (!allRecipes().length && !listCollections().length) return { action: 'none' }; // nothing worth backing up
  const meta = await getBackupMeta();
  if (!backupDue(frequency, meta.lastBackupDate)) return { action: 'none' };

  if (!folderBackupSupported()) return { action: 'remind-download' };
  const handle = await getHandle();
  if (!handle) return { action: 'remind-download' };
  const res = await backupToFolder({ interactive: false });
  if (res.ok) return { action: 'backed-up', file: res.file };
  if (res.needsPermission) return { action: 'needs-permission' };
  return { action: 'failed', error: res.error };
}

// ---------------------------------------------------------------------------
// Delete everything
// ---------------------------------------------------------------------------

/** Wipes all user data (keeps nothing). Caller must have confirmed strongly. */
export async function deleteAllData() {
  await db.clearEverything();
  try { localStorage.removeItem('rls_timers'); localStorage.removeItem('rls_theme'); } catch { /* ignore */ }
  await reloadAllData();
}

