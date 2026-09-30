/**
 * app.js — bootstrap: open the database, load data, build the shell
 * (sidebar / bottom navigation / timer tray), register routes, start the router.
 */
import * as db from './db.js';
import { h, clear, isOnline } from './util.js';
import { icon } from './icons.js';
import { button, iconButton, toast, showBanner } from './ui.js';
import { loadSettings, getSetting, onSettingsChange } from './settings.js';
import { initRecipes, onRecipesChange, inboxCount } from './recipes.js';
import { initCollections, onCollectionsChange } from './collections.js';
import { initMealPlans } from './mealplanner.js';
import { initShopping, onShoppingChange, uncheckedCount } from './shopping.js';
import {
  initTimers, listTimers, onTimersChange, remainingSeconds, addTime, dismissTimer, formatClock,
} from './timers.js';
import {
  initPwa, onPwaEvent, applyUpdate,
} from './pwa.js';
import { maybeAutoBackup, backupToFolder, onDataReloaded, downloadBackup } from './backup.js';
import { route, startRouter, navigate, refresh } from './router.js';
import { renderLibrary } from './views/library.js';
import { renderDetail } from './views/detail.js';
import { renderNewRecipe, renderEditRecipe, renderImportReview } from './views/editor.js';
import { renderImport } from './views/import.js';
import { renderCook } from './views/cook.js';
import { renderCollections, renderCollection } from './views/collections.js';
import { renderPlanner } from './views/planner.js';
import { renderShopping } from './views/shopping.js';
import { renderSettings } from './views/settings.js';
import { showOnboarding } from './views/onboarding.js';
import { session } from './state.js';

const NAV = [
  { id: 'recipes', label: 'Recipes', icon: 'recipes', href: '#/recipes', match: /^\/(recipes?|new|cook)(\/|$)/ },
  { id: 'collections', label: 'Collections', icon: 'folder', href: '#/collections', match: /^\/collections?(\/|$)/ },
  { id: 'import', label: 'Import', icon: 'download', href: '#/import', match: /^\/import/ },
  { id: 'plan', label: 'Meal Plan', icon: 'calendar', href: '#/plan', match: /^\/plan/ },
  { id: 'shopping', label: 'Shopping', icon: 'cart', href: '#/shopping', match: /^\/shopping/, shortLabel: 'Shopping' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '#/settings', match: /^\/settings/, sidebarOnly: true },
];

function fatal(message, detail) {
  const app = document.getElementById('app') || document.body;
  clear(app);
  app.appendChild(h('main', { class: 'fatal' },
    h('h1', null, 'We couldn’t start Recipe Library Studio'),
    h('p', null, message),
    detail ? h('p', { class: 'muted' }, detail) : null,
    h('button', { type: 'button', class: 'btn btn-primary', onclick: () => location.reload() }, 'Try again')));
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

function buildShell() {
  const app = document.getElementById('app');
  const badgeFor = (id) => {
    if (id === 'shopping') return uncheckedCount();
    if (id === 'collections') return inboxCount();
    return 0;
  };

  const linkFor = (item, variant) => {
    const n = badgeFor(item.id);
    return h('a', { class: `nav-link nav-${variant}`, href: item.href, dataset: { nav: item.id } },
      h('span', { class: 'nav-icon' }, icon(item.icon, { size: variant === 'side' ? 20 : 22 })),
      h('span', { class: 'nav-label' }, item.shortLabel || item.label),
      n ? h('span', { class: 'nav-badge', 'aria-label': `${n} ${item.id === 'shopping' ? 'items to buy' : 'in Inbox'}` }, String(n)) : null);
  };

  const sidebar = h('aside', { class: 'sidebar' },
    h('a', { class: 'brand', href: '#/recipes' }, h('span', { class: 'brand-mark' }, icon('recipes', { size: 22 })), h('span', { class: 'brand-name' }, 'Recipe Library Studio')),
    h('nav', { class: 'side-nav', 'aria-label': 'Primary' }, NAV.map((i) => linkFor(i, 'side'))),
    h('p', { class: 'sidebar-foot' }, 'Your recipes stay on this device.'));

  const offlinePill = h('span', { class: 'offline-pill', hidden: true, role: 'status' }, icon('wifiOff', { size: 14 }), ' Offline');
  const topbar = h('header', { class: 'topbar' },
    h('a', { class: 'brand brand-compact', href: '#/recipes' }, h('span', { class: 'brand-name' }, 'Recipe Library Studio')),
    offlinePill,
    h('a', { class: 'icon-btn icon-btn-ghost topbar-settings', href: '#/settings', 'aria-label': 'Settings', title: 'Settings' }, icon('settings', { size: 22 })));

  const bottom = h('nav', { class: 'bottom-nav', 'aria-label': 'Primary' }, NAV.filter((i) => !i.sidebarOnly).map((i) => linkFor(i, 'bottom')));

  const main = h('div', { class: 'app-main' },
    topbar,
    h('div', { id: 'banner-region', class: 'banner-region' }),
    h('main', { id: 'main', tabindex: '-1' }, h('div', { id: 'view' })));

  clear(app);
  app.append(sidebar, main, bottom, h('div', { id: 'timer-tray', class: 'timer-tray', 'aria-label': 'Timers' }));

  // connectivity pill
  const paintOnline = () => { offlinePill.hidden = isOnline(); };
  paintOnline();
  onPwaEvent((e) => { if (e.type === 'online' || e.type === 'offline') paintOnline(); });

  // live badges
  const paintBadges = () => {
    document.querySelectorAll('.nav-link').forEach((a) => {
      const id = a.dataset.nav;
      const n = badgeFor(id);
      let b = a.querySelector('.nav-badge');
      if (n) {
        if (!b) { b = h('span', { class: 'nav-badge' }); a.appendChild(b); }
        b.textContent = String(n);
        b.setAttribute('aria-label', `${n} ${id === 'shopping' ? 'items to buy' : 'in Inbox'}`);
      } else if (b) b.remove();
    });
  };
  onShoppingChange(paintBadges);
  onRecipesChange(paintBadges);
  onCollectionsChange(paintBadges);
  onDataReloaded(paintBadges);
}

function setActiveNav({ path }) {
  document.querySelectorAll('.nav-link').forEach((a) => {
    const item = NAV.find((n) => n.id === a.dataset.nav);
    const active = item && item.match.test(path);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// ---------------------------------------------------------------------------
// Timer tray (global: timers keep running while you move around the app)
// ---------------------------------------------------------------------------

function initTimerTray() {
  const tray = document.getElementById('timer-tray');
  let structureKey = '';

  const structure = () => listTimers().map((t) => `${t.id}:${t.done}`).join('|');

  function build() {
    const timers = listTimers();
    structureKey = structure();
    clear(tray);
    tray.hidden = timers.length === 0;
    document.body.classList.toggle('has-timers', timers.length > 0);
    for (const t of timers) {
      const clock = h('span', { class: 'timer-clock', role: 'timer', 'aria-label': `${t.label} remaining` });
      const card = h('div', { class: `timer-chip${t.done ? ' is-done' : ''}`, dataset: { id: t.id }, role: t.done ? 'alert' : null },
        h('div', { class: 'timer-info' }, h('span', { class: 'timer-name' }, t.label), t.recipeTitle ? h('span', { class: 'timer-recipe' }, t.recipeTitle) : null),
        clock,
        h('div', { class: 'timer-actions' },
          t.done ? null : button({ label: '+1 min', variant: 'secondary', className: 'btn-sm', attrs: { 'aria-label': `Add one minute to ${t.label}` }, onClick: () => addTime(t.id, 60) }),
          t.done ? button({ label: 'Dismiss', variant: 'primary', className: 'btn-sm', onClick: () => dismissTimer(t.id) }) : iconButton({ icon: 'x', label: `Cancel ${t.label}`, size: 16, onClick: () => dismissTimer(t.id) })));
      tray.appendChild(card);
    }
    tick();
  }

  function tick() {
    for (const t of listTimers()) {
      const el = tray.querySelector(`[data-id="${CSS.escape(t.id)}"] .timer-clock`);
      if (el) el.textContent = t.done ? (t.missed ? 'Finished while away' : 'Time’s up!') : formatClock(remainingSeconds(t));
    }
  }

  onTimersChange((evt) => {
    if (structure() !== structureKey || evt.type === 'init') build(); else tick();
  });
  build();
}

// ---------------------------------------------------------------------------
// Backups due / update banners
// ---------------------------------------------------------------------------

async function checkAutoBackup() {
  let res;
  try { res = await maybeAutoBackup(); } catch (e) { console.error(e); return; }
  if (res.action === 'backed-up') toast(`Automatic backup saved (${res.file}).`, { tone: 'success' });
  else if (res.action === 'needs-permission') {
    showBanner({
      id: 'backup', tone: 'warn', message: 'Your automatic backup is due. Allow access to your backup folder to continue.',
      actions: [{ label: 'Allow & back up', onClick: async () => { const r = await backupToFolder({ interactive: true }); toast(r.ok ? 'Backup saved.' : r.error || 'The backup failed.', { tone: r.ok ? 'success' : 'error' }); } }],
    });
  } else if (res.action === 'remind-download') {
    showBanner({
      id: 'backup', tone: 'warn', message: 'It’s time for a backup. Download a copy of your library to keep it safe.',
      actions: [{ label: 'Download backup', onClick: async () => { try { await downloadBackup(); toast('Backup downloaded.', { tone: 'success' }); } catch { toast('The backup could not be created.', { tone: 'error' }); } } }],
    });
  } else if (res.action === 'failed') {
    showBanner({ id: 'backup', tone: 'warn', message: `Automatic backup didn’t work: ${res.error}`, actions: [{ label: 'Open Settings', onClick: () => navigate('#/settings') }] });
  }
}

// ---------------------------------------------------------------------------
// Share target: the OS "Share → Recipe Library Studio" passes ?url= / ?text=
// ---------------------------------------------------------------------------

function handleShareTarget() {
  const params = new URLSearchParams(location.search);
  const raw = params.get('url') || params.get('text') || '';
  if (!raw) return;
  const m = raw.match(/https?:\/\/[^\s<>"']+/i);
  history.replaceState(null, '', `${location.pathname}${m ? `#/import?url=${encodeURIComponent(m[0])}` : '#/import'}`);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

let lastErrorToast = 0;
let firstRenderDone = false;
function installErrorHandlers() {
  const friendly = (err) => {
    console.error(err);
    const now = Date.now();
    if (now - lastErrorToast < 4000) return;
    lastErrorToast = now;
    toast('Something went wrong. Your saved recipes are safe — try that again.', { tone: 'error' });
  };
  window.addEventListener('unhandledrejection', (e) => friendly(e.reason));
  window.addEventListener('error', (e) => { if (e.message && !/ResizeObserver/.test(e.message)) friendly(e.error || e.message); });
}

async function boot() {
  installErrorHandlers();
  try {
    await db.openDB();
    await loadSettings();
    await initCollections();
    await initRecipes();
    await initMealPlans();
    await initShopping();
  } catch (err) {
    console.error(err);
    fatal(
      (err && err.message) || 'The app couldn’t open its local storage.',
      'If you are using a private/incognito window, try a normal window. Your saved recipes live in this browser’s storage.',
    );
    return;
  }
  initTimers();
  buildShell();
  initTimerTray();

  route('/', () => { navigate('#/recipes', { replace: true }); return { el: h('div') }; });
  route('/recipes', renderLibrary);
  route('/recipe/:id', renderDetail);
  route('/recipe/:id/edit', renderEditRecipe);
  route('/new', renderNewRecipe);
  route('/cook/:id', renderCook);
  route('/import', renderImport);
  route('/import/review', renderImportReview);
  route('/collections', renderCollections);
  route('/collection/:id', renderCollection);
  route('/plan', renderPlanner);
  route('/shopping', renderShopping);
  route('/settings', renderSettings);

  // bulk data changes (restore, delete-all) re-render the current screen
  onDataReloaded(() => { session.importDraft = null; refresh(); });
  onSettingsChange((e) => { if (e.key === 'showSnacks') return; });

  // PWA events
  onPwaEvent((e) => {
    if (e.type === 'update-ready') {
      showBanner({ id: 'update', message: 'A new version of Recipe Library Studio is ready.', actions: [{ label: 'Reload', onClick: applyUpdate }], dismissible: true });
    }
  });
  initPwa().catch((e) => console.warn('PWA init failed', e));

  handleShareTarget();
  await startRouter({
    outlet: document.getElementById('view'),
    fallback: '#/recipes',
    onRender: ({ path, hash }) => {
      setActiveNav({ path });
      // Move focus to the new page for screen readers — but not on first load, so Tab still reaches the skip link.
      const main = document.getElementById('main');
      if (main && firstRenderDone) main.focus({ preventScroll: true });
      firstRenderDone = true;
      if (!/^#\/(cook|import|recipe\/[^/]+\/edit|new)/.test(hash) && !/^#\/(recipe)\//.test(hash)) session.lastListHash = hash;
    },
  });

  if (!getSetting('onboarded')) await showOnboarding();
  setTimeout(checkAutoBackup, 1500);
}

boot();
