// ---------- resolve-book-link: POST {url} → {url, isbn, title, author, image} ----------
// The app reads most book links itself (the ISBN or Amazon number is in the address). It calls this for the rest:
// short links (a.co, amzn.to) are followed to their full address, and bookshop or publisher pages are read for the
// book's ISBN and title. Amazon pages are never opened (Amazon refuses automated readers), only the address comes back.
// Nothing is stored.
import { normalizeUrl, checkHost, fetchPage, json, fail, limited } from '../lib/net.mjs';
import { parseBookPage } from '../lib/book-page.mjs';

const AMAZON = /(^|\.)amazon\.[a-z.]{2,6}$/i, SHORT = /^(a\.co|amzn\.to|amzn\.eu|amzn\.asia)$/i;
const hostOf = u => new URL(u).hostname.replace(/^www\./, '');

export async function resolveLink(raw, opts = {}) {
  const url = normalizeUrl(raw, { anyPort: !!opts.allowPrivate });
  if (!url) throw Object.assign(Error('Enter a full book link that starts with https://'), { code: 'BAD_URL', status: 400 });
  const stopAt = u => AMAZON.test(hostOf(u));
  if (stopAt(url)) return { url, stopped: true };
  let page;
  try { page = await fetchPage(url, { ...opts, stopAt }); }
  catch (e) { if (SHORT.test(hostOf(url))) return { url: e.finalUrl || url, stopped: true }; throw e; }
  if (page.stopped) return { url: page.finalUrl, stopped: true };
  if (SHORT.test(hostOf(url)) && page.finalUrl === url) throw Object.assign(Error('That short link didn’t lead anywhere. Open it and copy the full address.'), { code: 'NOT_FOUND' });
  const b = parseBookPage(page.html, page.finalUrl);
  return { url: page.finalUrl, isbn: b.isbn, title: b.title, author: b.author, image: b.image, pages: b.pages, found: b.found };
}

export default async (req, context) => {
  if (req.method !== 'POST') return fail(405, 'METHOD', 'Send a POST request with {"url": "…"}.', { allow: 'POST' });
  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || 'local';
  const wait = limited(ip);
  if (wait) return fail(429, 'RATE_LIMIT', `Too many links in a minute. Please wait ${wait} seconds.`, { 'retry-after': String(wait) });
  let body;
  try { body = await req.json(); } catch { return fail(400, 'BAD_REQUEST', 'Send a JSON body like {"url": "https://…"}.'); }
  try { return json(200, await resolveLink(body?.url, { allowPrivate: process.env.ALLOW_PRIVATE_URLS === '1' })); }
  catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return fail(504, 'TIMEOUT', 'The website took too long to answer. Try the book’s ISBN or title instead.');
    if (e.code) return fail(e.status || 422, e.code, e.message);
    console.error('resolve-book-link failed', e);
    return fail(502, 'SOURCE_ERROR', 'We couldn’t reach that website. Try the book’s ISBN or title instead.');
  }
};
export { checkHost };
