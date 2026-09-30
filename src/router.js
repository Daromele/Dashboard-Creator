/**
 * router.js — tiny hash router (#/path/:param?query).
 *
 * Hash routing needs no server rewrites, works identically on Netlify, Netlify
 * Dev and file servers, and plays nicely with the service worker.
 *
 * A route handler receives ({ params, query, path }) and returns
 *   { el, title?, destroy?() }  (or a Promise of that).
 */
const routes = [];
const scrollMemory = new Map();
const RESTORE_SCROLL = /^#\/(recipes|collections|collection\/[^/]+|plan|shopping)(\?|$)/;

let outlet = null;
let current = null;
let token = 0;
let notFoundHash = '#/recipes';
let afterRender = () => {};
let lastHash = '';

export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:[a-zA-Z]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; })}$`);
  routes.push({ re, keys, handler });
}

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/recipes';
  const [path, qs = ''] = raw.split('?');
  const query = {};
  new URLSearchParams(qs).forEach((v, k) => { query[k] = v; });
  return { path: path || '/recipes', query };
}

export function navigate(hash, { replace = false } = {}) {
  if (!hash.startsWith('#')) hash = `#${hash}`;
  if (location.hash === hash) { render(); return; }
  if (replace) location.replace(hash);
  else location.hash = hash;
}

export function currentPath() { return parseHash().path; }

async function render() {
  const my = ++token;
  const hash = location.hash || '#/recipes';
  if (lastHash) scrollMemory.set(lastHash, window.scrollY);
  lastHash = hash;
  const { path, query } = parseHash(hash);

  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
    current = null;
    let view;
    try {
      view = await r.handler({ params, query, path });
    } catch (err) {
      console.error(err);
      view = { el: document.createTextNode('Something went wrong showing this page. Please go back and try again.'), title: 'Error' };
    }
    if (my !== token) { if (view && view.destroy) view.destroy(); return; } // a newer navigation won
    current = view;
    outlet.replaceChildren(view.el);
    document.title = view.title ? `${view.title} · Recipe Library Studio` : 'Recipe Library Studio';
    const saved = RESTORE_SCROLL.test(hash) ? scrollMemory.get(hash) : 0;
    window.scrollTo(0, saved || 0);
    afterRender({ path, query, hash });
    return;
  }
  navigate(notFoundHash, { replace: true });
}

export function startRouter({ outlet: el, onRender, fallback }) {
  outlet = el;
  if (onRender) afterRender = onRender;
  if (fallback) notFoundHash = fallback;
  window.addEventListener('hashchange', render);
  return render();
}

/** Re-render the current route (after a bulk data change). */
export function refresh() { return render(); }
