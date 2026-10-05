// Address checks, link rules and a size-capped page fetch for the link reader.
// http(s) only, no private or local addresses (checked on every redirect), 10 s timeout, 4 MB page limit.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_BYTES = 4 * 1024 * 1024, TIMEOUT_MS = 10000, MAX_REDIRECTS = 5;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
export const fail = (status, code, error, extra = {}) => json(status, { code, error }, extra);

// ---------- rate limit (best effort: memory lives as long as the warm instance) ----------
const hits = new Map();
export function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => t > now - 60000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 20 ? 60 - Math.floor((now - list[0]) / 1000) : 0;
}

// ---------- address checks ----------
function privateAddress(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return privateAddress(v.slice(7));
  return v === '::' || v === '::1' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff');
}
export async function checkHost(hostname, allowPrivate = false) {
  if (allowPrivate) return;
  const host = hostname.replace(/^\[|\]$/g, '');
  if (/^localhost$|\.localhost$|\.local$|\.internal$/i.test(host)) throw Object.assign(Error('That address is not a public website.'), { code: 'BAD_URL' });
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => { throw Object.assign(Error('That website could not be found. Check the link.'), { code: 'NOT_FOUND' }); });
  if (!addrs.length || addrs.some(a => privateAddress(a.address))) throw Object.assign(Error('That address is not a public website.'), { code: 'BAD_URL' });
}

export function normalizeUrl(raw, { anyPort = false } = {}) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { return ''; }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || (u.port && !anyPort && !['80', '443'].includes(u.port))) return '';
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(k)) u.searchParams.delete(k);
  return u.href.length <= 2048 ? u.href : '';
}

async function readCapped(res) {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) { await reader.cancel(); break; }   // a book's details sit in the head; keep what we have
    chunks.push(value);
  }
  const buf = Buffer.concat(chunks.map(c => Buffer.from(c)));
  const charset = (res.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1] || 'utf-8';
  try { return new TextDecoder(charset).decode(buf); } catch { return new TextDecoder().decode(buf); }
}

export async function fetchPage(url, { allowPrivate = false, fetchImpl = fetch, stopAt = null } = {}) {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await checkHost(new URL(current).hostname, allowPrivate);
    if (stopAt && stopAt(current)) return { html: '', finalUrl: current, stopped: true };
    const res = await fetchImpl(current, { redirect: 'manual', signal, headers: {
      'user-agent': UA, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' } });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = normalizeUrl(new URL(res.headers.get('location'), current).href, { anyPort: allowPrivate });
      if (!current) throw Object.assign(Error('The website redirected somewhere we can’t follow.'), { code: 'BAD_URL' });
      continue;
    }
    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 451)
      throw Object.assign(Error('This website blocks automatic access, even though it opens in your browser.'), { code: 'SOURCE_ACCESS_DENIED' });
    if (res.status === 404 || res.status === 410) throw Object.assign(Error('That page doesn’t exist anymore. Check the link.'), { code: 'NOT_FOUND' });
    if (!res.ok) throw Object.assign(Error(`The website answered with an error (${res.status}). Try again later.`), { code: 'SOURCE_ERROR' });
    const type = res.headers.get('content-type') || '';
    if (type && !/html|xml|text\/plain/i.test(type)) throw Object.assign(Error('That link is not a web page. Paste the link of the book’s page.'), { code: 'NOT_HTML' });
    return { html: await readCapped(res), finalUrl: current };
  }
  throw Object.assign(Error('The website redirected too many times.'), { code: 'SOURCE_ERROR' });
}

