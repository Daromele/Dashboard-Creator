// ---------- google-books: GET ?q=… or ?id=… → the Google Books volumes answer, using the app's key ----------
// The app asks Google Books without a key first. Only when Google refuses that (its per-connection limit) does it come
// here, so the key stays on the server (Netlify environment variable GOOGLE_BOOKS_KEY) and never reaches the page.
// Only Books API lookups can be made, 30 a minute per visitor, and answers are cached for a day.
import { json, fail } from '../lib/net.mjs';

const API = 'https://www.googleapis.com/books/v1/volumes', DAY = 86400;
const hits = new Map(), cache = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => t > now - 60000);
  list.push(now); hits.set(ip, list); if (hits.size > 5000) hits.clear();
  return list.length > 30 ? 60 - Math.floor((now - list[0]) / 1000) : 0;
}
// the only two lookups the app makes: a search (an ISBN or a title) or one volume by its id
export function target(params) {
  const q = (params.get('q') || '').trim(), id = (params.get('id') || '').trim();
  if (id) return /^[\w-]{6,20}$/.test(id) ? `${API}/${id}` : '';
  if (!q || q.length > 200) return '';
  const max = Math.min(10, Math.max(1, parseInt(params.get('maxResults') || '8', 10) || 8));
  return `${API}?q=${encodeURIComponent(q)}&maxResults=${max}&printType=books`;
}

export default async (req, context) => {
  if (req.method !== 'GET') return fail(405, 'METHOD', 'Use GET with ?q= or ?id=.', { allow: 'GET' });
  const key = process.env.GOOGLE_BOOKS_KEY;
  if (!key) return fail(503, 'NO_KEY', 'Google Books is not set up on this site yet.');
  const url = target(new URL(req.url).searchParams);
  if (!url) return fail(400, 'BAD_REQUEST', 'Send ?q= (an ISBN or a title) or ?id= (a Google Books id).');
  const hit = cache.get(url);
  if (hit && hit.at > Date.now() - DAY * 1000) return json(200, hit.body, { 'cache-control': `public, max-age=${DAY}` });
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'local', wait = limited(ip);
  if (wait) return fail(429, 'RATE_LIMIT', `Too many book lookups in a minute. Please wait ${wait} seconds.`, { 'retry-after': String(wait) });
  let res;
  try { res = await fetch(`${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(10000) }); }
  catch { return fail(504, 'TIMEOUT', 'Google Books took too long to answer.'); }
  if (res.status === 404) return json(404, { code: 'NOT_FOUND' });
  if (!res.ok) return fail(res.status === 429 ? 429 : 502, 'SOURCE_ERROR', 'Google Books is busy right now.');   // never pass Google's error text (it can echo the request)
  const body = await res.json().catch(() => null);
  if (!body) return fail(502, 'SOURCE_ERROR', 'Google Books sent an answer we couldn’t read.');
  if (cache.size > 2000) cache.clear(); cache.set(url, { at: Date.now(), body });
  return json(200, body, { 'cache-control': `public, max-age=${DAY}` });
};
