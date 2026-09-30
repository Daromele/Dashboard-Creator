/**
 * images.js — recipe photos.
 *
 * Remote recipe images often block hotlinking and can't be read into a canvas
 * (CORS), so the importer asks our fetch-image function for the bytes. Every
 * photo (imported or uploaded) is then resized locally (max 1400px, WebP when
 * supported, otherwise JPEG), a small thumbnail is generated, and both are
 * stored as Blobs in IndexedDB so recipes keep their pictures offline.
 */
import * as db from './db.js';
import { functionUrl } from './api.js';
import { uid, nowIso, safeHttpUrl } from './util.js';

export const MAX_FULL = 1400;
export const MAX_THUMB = 480;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

// ---- processing -------------------------------------------------------------

async function decode(blob) {
  if ('createImageBitmap' in globalThis) {
    try { return await createImageBitmap(blob); } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('That file could not be read as an image.'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

async function renderScaled(source, sw, sh, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // flatten transparency (JPEG fallback has no alpha)
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  let blob = await canvasToBlob(canvas, 'image/webp', quality);
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', Math.min(0.88, quality + 0.05));
  if (!blob) throw new Error('Could not compress the image.');
  return { blob, width: w, height: h };
}

/** Resize + compress. Returns { full, thumb, width, height, mime }. */
export async function processImage(blob) {
  if (!blob || blob.size === 0) throw new Error('That image is empty.');
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('That image is too large (25 MB max).');
  const src = await decode(blob);
  const sw = src.width || src.naturalWidth;
  const sh = src.height || src.naturalHeight;
  if (!sw || !sh) throw new Error('That file could not be read as an image.');
  const full = await renderScaled(src, sw, sh, MAX_FULL, 0.82);
  const thumb = await renderScaled(src, sw, sh, MAX_THUMB, 0.72);
  if (src.close) src.close();
  return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height, mime: full.blob.type };
}

// ---- storage ------------------------------------------------------------------

export async function storeProcessed(p, id = uid()) {
  await db.put(db.STORES.images, { id, blob: p.full, thumb: p.thumb, mime: p.mime, width: p.width, height: p.height, createdAt: nowIso() });
  return id;
}

/** Process + store an uploaded/picked file. Returns the new image id. */
export async function addImageFromBlob(blob) {
  return storeProcessed(await processImage(blob));
}

export async function deleteImage(id) {
  if (!id) return;
  await db.del(db.STORES.images, id);
  for (const key of [...urlCache.keys()]) if (key.startsWith(`${id}|`)) revoke(key);
}

// ---- object URL cache (LRU) ---------------------------------------------------------

const urlCache = new Map(); // "id|variant" -> objectURL
const URL_CACHE_MAX = 400;

function revoke(key) {
  const url = urlCache.get(key);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(key);
}

/** Object URL for a stored image (thumb or full). Resolves '' when missing. */
export async function imageUrl(id, variant = 'thumb') {
  if (!id) return '';
  const key = `${id}|${variant}`;
  if (urlCache.has(key)) {
    const url = urlCache.get(key);
    urlCache.delete(key);
    urlCache.set(key, url); // refresh LRU position
    return url;
  }
  const row = await db.get(db.STORES.images, id);
  if (!row) return '';
  const blob = variant === 'full' ? row.blob : row.thumb || row.blob;
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  if (urlCache.size > URL_CACHE_MAX) revoke(urlCache.keys().next().value);
  return url;
}

export async function getImageRow(id) {
  return id ? db.get(db.STORES.images, id) : null;
}

// ---- remote images via our function ----------------------------------------------------

/** Download a remote image's bytes through the SSRF-safe function. Throws on failure. */
export async function fetchRemoteImageBlob(url, referer = '', { signal } = {}) {
  const safe = safeHttpUrl(url);
  if (!safe) throw new Error('No usable image address.');
  const res = await fetch(functionUrl('fetch-image'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: safe, referer: safeHttpUrl(referer) || undefined }),
    signal,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Image download failed (${res.status}).`);
  const type = res.headers.get('content-type') || '';
  if (!type.startsWith('image/')) throw new Error('The server did not return an image.');
  return res.blob();
}

/** Fetch, compress and store a remote image. Returns the image id. */
export async function cacheRemoteImage(url, referer, opts) {
  const blob = await fetchRemoteImageBlob(url, referer, opts);
  return addImageFromBlob(blob);
}

// ---- lazy <img> for recipe cards -------------------------------------------------------------

let observer = null;
function getObserver() {
  if (observer || !('IntersectionObserver' in globalThis)) return observer;
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const load = entry.target.__load;
      if (load) load();
    }
  }, { rootMargin: '300px 0px' });
  return observer;
}

/**
 * Returns a wrapper element containing the recipe photo (or a tidy placeholder).
 *  - local copy  -> loaded lazily from IndexedDB when scrolled near the viewport
 *  - remote only -> native lazy loading, no referrer; falls back to placeholder on error (e.g. offline)
 */
export function recipeImage(recipe, { variant = 'thumb', className = '', alt = '', eager = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = `img-wrap ${className}`.trim();
  const ph = document.createElement('span');
  ph.className = 'img-placeholder';
  ph.setAttribute('aria-hidden', 'true');
  const letter = String(recipe.title || '?').replace(/^sample:\s*/i, '').trim().match(/[\p{L}\p{N}]/u);
  ph.textContent = letter ? letter[0].toUpperCase() : '•';
  wrap.appendChild(ph);

  const remote = safeHttpUrl(recipe.image);
  if (!recipe.imageId && !remote) return wrap;

  const img = document.createElement('img');
  img.alt = alt;
  img.decoding = 'async';
  img.className = 'img-photo';
  img.addEventListener('load', () => wrap.classList.add('is-loaded'));
  img.addEventListener('error', () => { img.remove(); wrap.classList.remove('is-loaded'); });
  wrap.appendChild(img);

  const load = async () => {
    if (recipe.imageId) {
      const url = await imageUrl(recipe.imageId, variant).catch(() => '');
      if (url) { img.src = url; return; }
    }
    if (remote) {
      img.referrerPolicy = 'no-referrer';
      img.loading = eager ? 'eager' : 'lazy';
      img.src = remote;
    } else {
      img.remove();
    }
  };
  const obs = eager ? null : getObserver();
  if (obs) {
    wrap.__load = load; // invoked by the shared IntersectionObserver
    obs.observe(wrap);
  } else {
    load();
  }
  return wrap;
}
