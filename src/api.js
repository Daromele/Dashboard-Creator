/**
 * api.js — locating the Netlify Functions.
 *
 * In production and under `netlify dev` the functions live at the same origin
 * (/.netlify/functions/<name>), so a relative URL just works. For unusual dev
 * setups (static server on another port + functions elsewhere) you can set
 *   localStorage.rls_function_base = 'http://localhost:8888'
 * in the browser console.
 */
export function functionUrl(name) {
  let base = '';
  try { base = localStorage.getItem('rls_function_base') || ''; } catch { /* storage blocked */ }
  return `${base.replace(/\/$/, '')}/.netlify/functions/${name}`;
}
