/* Recipe Library Studio — service worker
 *
 * Strategy
 *  - App shell (HTML/CSS/JS/fonts/icons): precached at install, served cache-first, so the
 *    installed app opens instantly and works fully offline.
 *  - Navigations: always answered with the cached /index.html (single-page app, hash routes).
 *  - Netlify Functions (/.netlify/*) and all non-GET or cross-origin requests: never touched,
 *    never cached (imports need the network; recipe photos live in IndexedDB, not here).
 *  - Updates: a new worker waits until the page asks it to take over (SKIP_WAITING), so the app
 *    is never swapped out from under someone mid-edit. Old caches are deleted on activation.
 *
 * `scripts/build.mjs` rewrites VERSION and PRECACHE below on every deploy. The value 'dev'
 * disables shell caching so local development always sees fresh files.
 */
const VERSION = 'dev';
const SHELL_CACHE = `rls-shell-${VERSION}`;
const RUNTIME_CACHE = 'rls-runtime-v1';
const DEV = VERSION === 'dev';

// <precache:start>
const PRECACHE = [];
// <precache:end>

self.addEventListener('install', (event) => {
  if (DEV) return;
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll is atomic: if any file fails, the whole install fails and the old version keeps running.
      cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
    for (const name of await caches.keys()) {
      if (name.startsWith('rls-') && !keep.has(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  else if (data.type === 'GET_VERSION' && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // remote images etc.: browser default
  if (url.pathname.startsWith('/.netlify/')) return; // functions: always live

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }
  event.respondWith(handleAsset(request));
});

async function handleNavigation(request) {
  if (!DEV) {
    const cached = await caches.match('/index.html');
    if (cached) return cached;
  }
  try {
    const res = await fetch(request);
    if (res.ok && DEV) (await caches.open(RUNTIME_CACHE)).put('/index.html', res.clone());
    return res;
  } catch {
    const fallback = await caches.match('/index.html');
    if (fallback) return fallback;
    return new Response('<!doctype html><title>Offline</title><p style="font-family:sans-serif;padding:2rem">You appear to be offline, and the app has not been saved for offline use yet. Reconnect and reload once.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function handleAsset(request) {
  if (!DEV) {
    const hit = await caches.match(request);
    if (hit) return hit;
  }
  try {
    const res = await fetch(request);
    // Keep lazily-needed same-origin files (e.g. extra font subsets) for offline use.
    if (res.ok && res.type === 'basic') {
      const cache = await caches.open(DEV ? RUNTIME_CACHE : SHELL_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const hit = await caches.match(request);
    return hit || Response.error();
  }
}

// Tapping a "timer finished" notification brings the app to the front.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = all.find((c) => 'focus' in c);
    if (existing) return existing.focus();
    return self.clients.openWindow('/');
  })());
});
