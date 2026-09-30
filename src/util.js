/**
 * util.js — small, dependency-free helpers used across the app.
 *
 * `h()` is the ONLY way views create DOM: it builds elements with
 * createElement/textContent, so imported or user-entered text can never be
 * interpreted as HTML. There is no innerHTML anywhere in the app.
 */

export const APP_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// DOM building
// ---------------------------------------------------------------------------

const BOOLEAN_PROPS = new Set(['checked', 'selected', 'disabled', 'hidden', 'open', 'required', 'multiple', 'readOnly', 'autofocus']);

/**
 * h('button', { class: 'btn', onclick: fn, 'aria-label': 'Close' }, 'Text', childNode)
 * - `class` / `className`, `dataset`, `style` (object; CSS custom properties ok), `on*` handlers
 * - `value`, `checked`, `disabled`… are set as DOM properties
 * - null / undefined / false attributes and children are skipped
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, val] of Object.entries(props)) {
      if (val == null || val === false) continue;
      if (key === 'class' || key === 'className') el.className = val;
      else if (key === 'dataset') Object.assign(el.dataset, val);
      else if (key === 'style' && typeof val === 'object') {
        for (const [k, v] of Object.entries(val)) {
          if (k.startsWith('--') || k.includes('-')) el.style.setProperty(k, v);
          else el.style[k] = v;
        }
      } else if (key.startsWith('on') && typeof val === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), val);
      } else if (key === 'text') el.textContent = val;
      else if (BOOLEAN_PROPS.has(key)) el[key] = !!val;
      else if (key === 'value') el.value = val;
      else el.setAttribute(key, val === true ? '' : String(val));
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const child of children) {
    if (child == null || child === false || child === true) continue;
    if (Array.isArray(child)) appendChildren(el, child);
    else if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(String(child)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/**
 * Replace all children of `el`. Unlike the native replaceChildren(), null / undefined / false
 * are skipped (native would insert the text "null"), arrays are flattened, strings become text.
 */
export function fill(el, ...children) {
  clear(el);
  appendChildren(el, children);
  return el;
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

// ---------------------------------------------------------------------------
// IDs, events, timing
// ---------------------------------------------------------------------------

export function uid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

export function createEmitter() {
  const handlers = new Set();
  return {
    on(fn) { handlers.add(fn); return () => handlers.delete(fn); },
    emit(evt) { for (const fn of [...handlers]) { try { fn(evt); } catch (e) { console.error(e); } } },
  };
}

export function debounce(fn, ms = 200) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(t);
  wrapped.flush = (...args) => { clearTimeout(t); fn(...args); };
  return wrapped;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/** Lowercase, accent-insensitive text for searching. */
export function normalizeText(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function plural(n, word, pluralWord) {
  return `${n} ${n === 1 ? word : pluralWord || `${word}s`}`;
}

export function slugify(s) {
  return normalizeText(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'recipe';
}

export function initials(s) {
  const m = String(s || '').trim().match(/[\p{L}\p{N}]/u);
  return m ? m[0].toUpperCase() : '•';
}

/** Returns the URL only when it is http(s); otherwise ''. Use before any href/src. */
export function safeHttpUrl(u) {
  try {
    const url = new URL(String(u || ''));
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    // Browsers are lenient about odd host names (e.g. "not a url" becomes "not%20a%20url"): require a real one.
    if (!/^(\[[0-9a-f:.]+\]|[a-z0-9_-]+(\.[a-z0-9_-]+)*\.?)$/i.test(url.hostname)) return '';
    return url.href;
  } catch {
    return '';
  }
}

export function hostOf(u) {
  try { return new URL(u).hostname.replace(/^www\./i, ''); } catch { return ''; }
}

// ---------------------------------------------------------------------------
// Time & dates
// ---------------------------------------------------------------------------

/** 75 -> "1 hr 15 min", 45 -> "45 min", null -> "" */
export function formatMinutes(min) {
  if (min == null || !isFinite(min) || min <= 0) return '';
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const hrs = Math.floor(m / 60);
  const rest = m % 60;
  if (hrs >= 24) {
    const d = Math.floor(hrs / 24);
    const hr = hrs % 24;
    return `${d} day${d > 1 ? 's' : ''}${hr ? ` ${hr} hr` : ''}`;
  }
  return rest ? `${hrs} hr ${rest} min` : `${hrs} hr`;
}

/** "45", "45 min", "1h 30", "1:30", "1.5 hours" -> minutes (or null). Empty -> null. */
export function parseMinutesInput(text) {
  const s = String(text == null ? '' : text).trim().toLowerCase();
  if (!s) return null;
  let m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d+)\s*(?:m|min|mins|minutes?)?)?$/);
  if (m) return Math.round(parseFloat(m[1]) * 60 + (m[2] ? parseInt(m[2], 10) : 0));
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minutes?)?$/);
  if (m) return Math.round(parseFloat(m[1]));
  return NaN; // present but unparseable
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const dateShortFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' });

export function formatDate(iso) {
  if (!iso) return '';
  const d = iso instanceof Date ? iso : new Date(iso);
  return isNaN(d.getTime()) ? '' : dateFmt.format(d);
}
export function formatDateShort(d) { return dateShortFmt.format(d); }
export function weekdayName(d) { return weekdayFmt.format(d); }

/** Local calendar date -> "YYYY-MM-DD" (NOT UTC). */
export function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseIsoDate(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}
export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
/** Monday of the week containing `d`. */
export function startOfWeek(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - dow);
  return x;
}

export function nowIso() { return new Date().toISOString(); }

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export function download(filename, data, type = 'application/json') {
  const blob = data instanceof Blob ? data : new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error || new Error('Could not read the file.'));
    r.readAsText(file);
  });
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error || new Error('Could not read image data.'));
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl) {
  const m = String(dataUrl).match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!m) throw new Error('Invalid data URL');
  const mime = m[1];
  if (m[2]) {
    const bin = atob(m[3]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(m[3])], { type: mime });
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  try {
    const ta = h('textarea', { value: text, 'aria-hidden': 'true', style: { position: 'fixed', opacity: '0', top: '0' } });
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/** Stable unique strings, preserving order, case-insensitive. */
export function uniqueStrings(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const s = String(item == null ? '' : item).trim();
    const k = s.toLowerCase();
    if (s && !seen.has(k)) { seen.add(k); out.push(s); }
  }
  return out;
}

export function compareText(a, b) {
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}
