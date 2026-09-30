/**
 * db.js — IndexedDB access layer.
 *
 * Stores (DB "recipe-library-studio"):
 *   recipes        the library (keyPath id)
 *   images         locally cached, compressed recipe photos (Blobs) + thumbnails
 *   collections    user collections (folders)
 *   mealPlans      one record per week, keyed by the Monday date (YYYY-MM-DD)
 *   shoppingLists  shopping list(s) — the UI uses the single list "main"
 *   settings       key/value preferences (incl. the backup-folder handle)
 *   history        one row per "Made it"
 *   backupMeta     backup bookkeeping (last backup date, permission state…)
 *
 * MIGRATIONS
 *   Bump DB_VERSION and add a function to MIGRATIONS[n] that upgrades from
 *   version n-1. Migrations must be additive: never delete or rewrite user
 *   data destructively. Record-shape changes are handled lazily and safely by
 *   recipes.normalizeRecipe() (see `schemaVersion` there), so old rows keep
 *   working without a blocking rewrite.
 */

export const DB_NAME = 'recipe-library-studio';
export const DB_VERSION = 1;

export const STORES = {
  recipes: 'recipes',
  images: 'images',
  collections: 'collections',
  mealPlans: 'mealPlans',
  shoppingLists: 'shoppingLists',
  settings: 'settings',
  history: 'history',
  backupMeta: 'backupMeta',
};

/** Stores included in backups (settings/backupMeta handled specially). */
export const DATA_STORES = ['recipes', 'images', 'collections', 'mealPlans', 'shoppingLists', 'history'];

const MIGRATIONS = {
  // v1: initial schema
  1(db) {
    const recipes = db.createObjectStore('recipes', { keyPath: 'id' });
    recipes.createIndex('sourceUrlNorm', 'sourceUrlNorm', { unique: false });
    recipes.createIndex('updatedAt', 'updatedAt', { unique: false });
    recipes.createIndex('createdAt', 'createdAt', { unique: false });
    db.createObjectStore('images', { keyPath: 'id' });
    const collections = db.createObjectStore('collections', { keyPath: 'id' });
    collections.createIndex('order', 'order', { unique: false });
    db.createObjectStore('mealPlans', { keyPath: 'weekStart' });
    db.createObjectStore('shoppingLists', { keyPath: 'id' });
    db.createObjectStore('settings', { keyPath: 'key' });
    const history = db.createObjectStore('history', { keyPath: 'id' });
    history.createIndex('recipeId', 'recipeId', { unique: false });
    db.createObjectStore('backupMeta', { keyPath: 'key' });
  },
  // Example for the future:
  // 2(db, tx) { tx.objectStore('recipes').createIndex('someNewIndex', 'someField'); },
};

export class DBError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'DBError';
    this.cause = cause;
    this.quota = !!(cause && (cause.name === 'QuotaExceededError' || cause.code === 22));
  }
}

let dbPromise = null;
const closeListeners = new Set();

export function onDbClosed(fn) { closeListeners.add(fn); return () => closeListeners.delete(fn); }

export function isSupported() {
  try { return typeof indexedDB !== 'undefined' && indexedDB !== null; } catch { return false; }
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!isSupported()) {
      reject(new DBError('This browser does not allow the app to store data (is private browsing on?).'));
      return;
    }
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(new DBError('The local database could not be opened.', e));
      return;
    }
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;
      for (let v = event.oldVersion + 1; v <= (event.newVersion || DB_VERSION); v++) {
        if (MIGRATIONS[v]) MIGRATIONS[v](db, tx, event.oldVersion);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the schema: release our connection so it can proceed.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        closeListeners.forEach((fn) => fn());
      };
      resolve(db);
    };
    request.onerror = () => reject(new DBError('The local database could not be opened.', request.error));
    request.onblocked = () => reject(new DBError('The database is busy in another tab. Close other tabs of this app and reload.'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

/** Promisify one IDBRequest. */
export function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new DBError('A database operation failed.', r.error));
  });
}

/**
 * Run `fn(store)` inside one transaction spanning `storeNames`.
 * `store(name)` returns the IDBObjectStore. fn may be async but must only
 * await IndexedDB requests (awaiting anything else lets the transaction commit).
 * Resolves with fn's return value once the transaction has COMMITTED.
 */
export async function transaction(storeNames, mode, fn) {
  const db = await openDB();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(names, mode);
    } catch (e) {
      reject(new DBError('The local database is not available.', e));
      return;
    }
    let result;
    let failure = null;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => { failure = failure || tx.error; };
    tx.onabort = () => reject(new DBError(
      tx.error && tx.error.name === 'QuotaExceededError'
        ? 'Your device is out of storage space.'
        : 'The change could not be saved.',
      failure || tx.error,
    ));
    Promise.resolve()
      .then(() => fn((name) => tx.objectStore(name)))
      .then((r) => { result = r; })
      .catch((e) => {
        failure = e;
        try { tx.abort(); } catch { /* already finished */ }
      });
  });
}

// ---- convenience wrappers --------------------------------------------------

export async function get(store, key) {
  return transaction(store, 'readonly', (s) => req(s(store).get(key)));
}
export async function getAll(store) {
  return transaction(store, 'readonly', (s) => req(s(store).getAll()));
}
export async function getAllByIndex(store, index, value) {
  return transaction(store, 'readonly', (s) => req(s(store).index(index).getAll(value)));
}
export async function count(store) {
  return transaction(store, 'readonly', (s) => req(s(store).count()));
}
export async function put(store, value) {
  return transaction(store, 'readwrite', (s) => { s(store).put(value); });
}
export async function putMany(store, values) {
  if (!values.length) return;
  return transaction(store, 'readwrite', (s) => { const st = s(store); for (const v of values) st.put(v); });
}
export async function del(store, key) {
  return transaction(store, 'readwrite', (s) => { s(store).delete(key); });
}
export async function delMany(store, keys) {
  if (!keys.length) return;
  return transaction(store, 'readwrite', (s) => { const st = s(store); for (const k of keys) st.delete(k); });
}
export async function clearStore(store) {
  return transaction(store, 'readwrite', (s) => { s(store).clear(); });
}

/** Wipe every store in a single atomic transaction. */
export async function clearEverything() {
  return transaction(Object.values(STORES), 'readwrite', (s) => {
    for (const name of Object.values(STORES)) s(name).clear();
  });
}

/** Estimated storage usage for the Settings screen. */
export async function storageEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      return { usage: usage || 0, quota: quota || 0 };
    }
  } catch { /* unsupported */ }
  return null;
}
