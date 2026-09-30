/**
 * pwa.js — service worker registration, update prompts, install prompt,
 * connectivity, storage persistence.
 */
import { createEmitter } from './util.js';

const emitter = createEmitter();
/** Emits { type: 'update-ready' | 'installable' | 'installed' | 'online' | 'offline' | 'sw-ready' } */
export const onPwaEvent = emitter.on;

let registration = null;
let installEvent = null;
let reloadingForUpdate = false;

export function swSupported() {
  return 'serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname));
}

export async function initPwa() {
  window.addEventListener('online', () => emitter.emit({ type: 'online' }));
  window.addEventListener('offline', () => emitter.emit({ type: 'offline' }));
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e;
    emitter.emit({ type: 'installable' });
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    emitter.emit({ type: 'installed' });
  });

  if (!swSupported()) return null;
  try {
    registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
  } catch (err) {
    console.warn('Service worker registration failed', err);
    return null;
  }
  if (!registration) return null;

  // A new version finished installing and is waiting to take over.
  const watch = (worker) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) emitter.emit({ type: 'update-ready' });
    });
  };
  if (registration.waiting && navigator.serviceWorker.controller) emitter.emit({ type: 'update-ready' });
  registration.addEventListener('updatefound', () => { if (registration.installing) watch(registration.installing); });

  // Reload only after the user accepted the update (never mid-edit).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) location.reload();
  });
  navigator.serviceWorker.ready.then(() => emitter.emit({ type: 'sw-ready' }));
  return registration;
}

export function applyUpdate() {
  const waiting = registration && registration.waiting;
  if (!waiting) { location.reload(); return; }
  reloadingForUpdate = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

export async function checkForUpdates() {
  if (!registration) return false;
  try {
    await registration.update();
    return !!(registration.waiting || registration.installing);
  } catch { return false; }
}

export function canInstall() { return !!installEvent; }

export async function promptInstall() {
  if (!installEvent) return 'unavailable';
  installEvent.prompt();
  const choice = await installEvent.userChoice.catch(() => ({ outcome: 'dismissed' }));
  installEvent = null;
  return choice.outcome;
}

export function isStandalone() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Ask the browser not to evict our IndexedDB data under storage pressure. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch { /* unsupported */ }
  return false;
}

export async function isStoragePersistent() {
  try {
    if (navigator.storage && navigator.storage.persisted) return await navigator.storage.persisted();
  } catch { /* unsupported */ }
  return false;
}

export async function offlineStatus() {
  const supported = swSupported();
  let controlled = false;
  let cached = 0;
  if (supported) {
    controlled = !!navigator.serviceWorker.controller;
    try {
      const names = await caches.keys();
      for (const n of names.filter((x) => x.startsWith('rls-'))) cached += (await (await caches.open(n)).keys()).length;
    } catch { /* cache API unavailable */ }
  }
  return { supported, controlled, cachedFiles: cached };
}

/** Drop app-file caches and reload (needs a connection to re-download). */
export async function refreshAppFiles() {
  try {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('rls-')).map((n) => caches.delete(n)));
    if (registration) await registration.unregister();
  } catch { /* ignore */ }
  location.reload();
}
