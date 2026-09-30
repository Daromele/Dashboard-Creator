/**
 * settings.js — user preferences.
 *
 * Source of truth: the IndexedDB `settings` store (so settings are included in
 * backups). The theme is additionally mirrored into localStorage purely so the
 * page can paint in the right colours before IndexedDB has loaded (no flash).
 */
import * as db from './db.js';
import { createEmitter } from './util.js';

export const THEMES = [
  // Mono must stay first: it is the default theme.
  { id: 'mono', label: 'Mono', swatch: ['#ffffff', '#111111', '#767676'], themeColor: '#ffffff' },
  { id: 'sage', label: 'Sage', swatch: ['#f4f7f3', '#3f6150', '#a9bfae'], themeColor: '#f4f7f3' },
  { id: 'blush', label: 'Blush', swatch: ['#fdf6f6', '#8f3f57', '#ecc3cc'], themeColor: '#fdf6f6' },
  { id: 'cream', label: 'Warm Cream', swatch: ['#fbf6ea', '#7a4e22', '#e6d3ae'], themeColor: '#fbf6ea' },
  { id: 'blue', label: 'Dusty Blue', swatch: ['#f4f7fa', '#3d5a75', '#b5c8d9'], themeColor: '#f4f7fa' },
];

export const DEFAULTS = {
  theme: 'mono',
  onboarded: false,
  unitSystem: 'original', // original | us | metric
  servingsBehavior: 'original', // original | remember
  showSnacks: false,
  backupFrequency: 'off', // off | daily | every3 | weekly
  backupRetention: 'all', // all | 7 | 14 | 30
  backupIncludeImages: true,
  cookWakeLock: true,
  cookTextScale: 1,
  plannerWeekStartsOn: 'monday',
};

/** Keys that must never leave the device inside a backup file. */
const NOT_EXPORTED = new Set(['backupFolderHandle', 'backupFolderName']);

const store = new Map();
const emitter = createEmitter();
export const onSettingsChange = emitter.on;

export async function loadSettings() {
  store.clear();
  const rows = await db.getAll(db.STORES.settings);
  for (const row of rows) store.set(row.key, row.value);
  applyTheme(getSetting('theme'));
}

export function getSetting(key) {
  return store.has(key) ? store.get(key) : DEFAULTS[key];
}

export async function setSetting(key, value) {
  store.set(key, value);
  if (key === 'theme') applyTheme(value); // visible (and mirrored to localStorage) immediately
  await db.put(db.STORES.settings, { key, value });
  emitter.emit({ key, value });
}

export async function removeSetting(key) {
  store.delete(key);
  await db.del(db.STORES.settings, key);
  emitter.emit({ key, value: DEFAULTS[key] });
}

export function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  document.documentElement.dataset.theme = theme.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.themeColor);
  try { localStorage.setItem('rls_theme', theme.id); } catch { /* storage blocked: fine */ }
}

/** Plain-object export of settings for backups. */
export function exportSettings() {
  const out = {};
  for (const [k, v] of store) if (!NOT_EXPORTED.has(k)) out[k] = v;
  return out;
}

/** Apply settings from a backup (Replace mode). Unknown keys are ignored. */
export function settingsRows(obj) {
  const rows = [];
  for (const [key, value] of Object.entries(obj || {})) {
    if (NOT_EXPORTED.has(key)) continue;
    if (!(key in DEFAULTS)) continue;
    rows.push({ key, value });
  }
  return rows;
}
