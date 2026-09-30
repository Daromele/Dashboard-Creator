/**
 * safe-fetch.js — fetch a remote page or image defensively.
 *
 * Built on node:http/https (not fetch) so the guarded DNS lookup runs at
 * connect time. Enforces:
 *   - http/https only, every redirect hop re-validated (validateUrl)
 *   - redirect limit + loop detection, no https -> http downgrade
 *   - overall timeout (deadline shared across redirects)
 *   - maximum downloaded size (measured AFTER decompression)
 *   - content-type allow-list (plus light sniffing when the header is missing)
 *   - no cookies, no credentials, nothing is executed
 */
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { validateUrl, createGuardedLookup, GuardError } from './url-guard.js';

export class FetchError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'FetchError';
    this.code = code;
    this.status = status;
  }
}

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function statusError(status) {
  if (status === 401 || status === 403) return new FetchError('SITE_BLOCKED', 'This website blocked automatic recipe importing.', status);
  if (status === 404 || status === 410) return new FetchError('NOT_FOUND', "We couldn't find that page.", status);
  if (status === 429) return new FetchError('SITE_RATE_LIMITED', 'The website asked us to slow down. Try again in a minute.', status);
  if (status >= 500) return new FetchError('REMOTE_ERROR', 'The website had a problem responding.', status);
  return new FetchError('FETCH_FAILED', `The website responded with an unexpected status (${status}).`, status);
}

function mapNetError(err) {
  if (err instanceof GuardError || err instanceof FetchError) return err;
  const code = err && err.code;
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return new FetchError('TIMEOUT', 'The website took too long to respond.');
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ENODATA') return new FetchError('FETCH_FAILED', "We couldn't find that website.");
  if (code && /^(CERT_|DEPTH_ZERO|UNABLE_TO_|ERR_TLS|ERR_SSL|SELF_SIGNED|HOSTNAME_MISMATCH)/.test(code)) {
    return new FetchError('TLS_ERROR', "We couldn't establish a secure connection to that website.");
  }
  return new FetchError('FETCH_FAILED', "We couldn't reach that website.");
}

// ---- content-type policies ------------------------------------------------

/** Returns 'yes' | 'maybe' | 'no' for a Content-Type header. */
export function htmlTypePolicy(ct) {
  const t = (ct || '').toLowerCase();
  if (t.includes('text/html') || t.includes('application/xhtml')) return 'yes';
  if (!t || t.includes('application/octet-stream') || t.startsWith('text/plain')) return 'maybe';
  return 'no';
}

export function looksLikeHtml(buf) {
  const head = buf.subarray(0, 4096).toString('latin1').toLowerCase();
  return /<!doctype html|<html|<head|<body|<script|<meta|<title/.test(head);
}

export function imageTypePolicy(ct) {
  const t = (ct || '').toLowerCase();
  if (/image\/(jpeg|jpg|png|webp|gif|avif|bmp)/.test(t)) return 'yes';
  if (!t || t.includes('application/octet-stream')) return 'maybe';
  return 'no'; // includes image/svg+xml on purpose
}

/** Identify an image by magic bytes. Returns a MIME type or ''. */
export function sniffImageType(buf) {
  if (buf.length < 12) return '';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') return 'image/png';
  if (buf.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('latin1', 4, 8) === 'ftyp' && /avif|avis/.test(buf.toString('latin1', 8, 16))) return 'image/avif';
  if (buf.toString('latin1', 0, 2) === 'BM') return 'image/bmp';
  return '';
}

// ---- one HTTP request -----------------------------------------------------

function requestOnce(url, o) {
  return new Promise((resolve, reject) => {
    const remaining = o.deadline - Date.now();
    if (remaining <= 0) return reject(new FetchError('TIMEOUT', 'The website took too long to respond.'));

    const isHttps = url.protocol === 'https:';
    const mod = isHttps ? https : http;
    let settled = false;
    let req;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => {
      if (req) req.destroy();
      finish(reject, new FetchError('TIMEOUT', 'The website took too long to respond.'));
    }, remaining);

    const headers = {
      'User-Agent': BROWSER_UA,
      Accept: o.accept,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'close',
      ...(o.referer ? { Referer: o.referer } : {}),
    };

    try {
      req = mod.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: 'GET',
          headers,
          lookup: o.lookup,
          agent: false,
        },
        (res) => {
          const status = res.statusCode || 0;
          if (REDIRECT_CODES.has(status) && res.headers.location) {
            res.resume();
            return finish(resolve, { redirect: true, location: String(res.headers.location), status });
          }
          if (status < 200 || status >= 300) {
            res.resume();
            return finish(reject, statusError(status));
          }

          const contentType = String(res.headers['content-type'] || '');
          const policy = o.typePolicy(contentType);
          if (policy === 'no') {
            res.resume();
            return finish(reject, new FetchError(o.notTypeCode, o.notTypeMessage));
          }
          const declared = Number(res.headers['content-length']);
          const encoding = String(res.headers['content-encoding'] || '').toLowerCase().trim();
          if (!o.truncate && !encoding && declared > o.maxBytes) {
            res.resume();
            return finish(reject, new FetchError('TOO_LARGE', 'That file is too large to import.'));
          }

          let decoder = null;
          if (encoding === 'gzip' || encoding === 'x-gzip') decoder = zlib.createGunzip();
          else if (encoding === 'deflate') decoder = zlib.createInflate();
          else if (encoding === 'br') decoder = zlib.createBrotliDecompress();
          else if (encoding && encoding !== 'identity') {
            res.resume();
            return finish(reject, new FetchError('FETCH_FAILED', 'The website sent data in an unsupported format.'));
          }

          const chunks = [];
          let total = 0;
          let rawTotal = 0;
          let truncated = false;
          const stopEarly = () => {
            truncated = true;
            res.destroy();
            if (decoder) decoder.destroy();
            done();
          };
          const done = () => {
            const body = Buffer.concat(chunks);
            finish(resolve, {
              redirect: false,
              status,
              headers: res.headers,
              contentType,
              policy,
              body,
              truncated,
            });
          };
          const onData = (chunk) => {
            if (settled) return;
            total += chunk.length;
            if (total > o.maxBytes) {
              if (!o.truncate) {
                res.destroy();
                if (decoder) decoder.destroy();
                return finish(reject, new FetchError('TOO_LARGE', 'That file is too large to import.'));
              }
              const keep = chunk.length - (total - o.maxBytes);
              if (keep > 0) chunks.push(chunk.subarray(0, keep));
              return stopEarly();
            }
            chunks.push(chunk);
          };

          res.on('data', (c) => {
            rawTotal += c.length;
            // Guard against compression bombs AND slow huge downloads.
            if (rawTotal > o.maxBytes * 2) {
              if (o.truncate) stopEarly();
              else {
                res.destroy();
                finish(reject, new FetchError('TOO_LARGE', 'That file is too large to import.'));
              }
            }
          });
          if (decoder) {
            res.pipe(decoder);
            decoder.on('data', onData);
            decoder.on('end', done);
            decoder.on('error', () => {
              if (chunks.length) done();
              else finish(reject, new FetchError('FETCH_FAILED', 'The website sent corrupted data.'));
            });
            res.on('error', (e) => finish(reject, mapNetError(e)));
          } else {
            res.on('data', onData);
            res.on('end', done);
            res.on('error', (e) => (chunks.length ? done() : finish(reject, mapNetError(e))));
          }
        },
      );
    } catch (err) {
      return finish(reject, mapNetError(err));
    }
    req.on('error', (err) => finish(reject, mapNetError(err)));
    req.end();
  });
}

// ---- public API -----------------------------------------------------------

/**
 * Fetch `rawUrl` following a limited number of validated redirects.
 * Resolves { finalUrl, status, contentType, body: Buffer, truncated, policy }.
 */
export async function safeFetch(rawUrl, opts = {}) {
  const {
    maxRedirects = 4,
    timeoutMs = 8000,
    maxBytes = 3_000_000,
    accept = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    typePolicy = htmlTypePolicy,
    notTypeCode = 'NOT_HTML',
    notTypeMessage = "This link doesn't appear to be a webpage.",
    truncate = true,
    allowPrivate = false,
    lookup,
    resolver,
    referer,
  } = opts;

  const guardedLookup = lookup || createGuardedLookup({ allowPrivate, resolver });
  const deadline = Date.now() + timeoutMs;
  let current = validateUrl(rawUrl, { allowPrivate });
  const visited = new Set();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (visited.has(current.href)) throw new FetchError('REDIRECT_LOOP', 'This link redirects in a loop.');
    visited.add(current.href);

    const res = await requestOnce(current, {
      deadline, accept, typePolicy, notTypeCode, notTypeMessage, truncate, maxBytes, referer,
      lookup: guardedLookup,
    });

    if (res.redirect) {
      let next;
      try {
        next = new URL(res.location, current);
      } catch {
        throw new FetchError('FETCH_FAILED', 'The website sent an invalid redirect.');
      }
      next = validateUrl(next.href, { allowPrivate }); // SSRF check on every hop
      if (current.protocol === 'https:' && next.protocol === 'http:') {
        throw new FetchError('FETCH_FAILED', 'The website tried to redirect to an insecure address.');
      }
      current = next;
      continue;
    }
    return { ...res, finalUrl: current.href };
  }
  throw new FetchError('TOO_MANY_REDIRECTS', 'This link redirects too many times.');
}

/** Decode a page body honouring the declared/meta charset (falls back to UTF-8). */
export function decodeBody(buf, contentType = '') {
  let label = (contentType.match(/charset\s*=\s*["']?([\w-]+)/i) || [])[1];
  if (!label) {
    const head = buf.subarray(0, 4096).toString('latin1');
    label = (head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i) || [])[1];
  }
  try {
    return new TextDecoder((label || 'utf-8').toLowerCase(), { fatal: false }).decode(buf);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  }
}

/**
 * Fetch an HTML page. http:// links are tried over https first ("prefer
 * HTTPS") and fall back to the original only on connection-level failures.
 */
export async function fetchHtml(rawUrl, opts = {}) {
  const url = validateUrl(rawUrl, { allowPrivate: opts.allowPrivate });
  const attempt = async (u) => {
    const res = await safeFetch(u, opts);
    if (res.policy === 'maybe' && !looksLikeHtml(res.body)) {
      throw new FetchError('NOT_HTML', "This link doesn't appear to be a webpage.");
    }
    return { ...res, html: decodeBody(res.body, res.contentType) };
  };
  if (url.protocol === 'http:' && !opts.allowPrivate) {
    const upgraded = new URL(url.href);
    upgraded.protocol = 'https:';
    try {
      return await attempt(upgraded.href);
    } catch (err) {
      if (!(err instanceof FetchError) || !['FETCH_FAILED', 'TLS_ERROR'].includes(err.code) || err.status) throw err;
    }
  }
  return attempt(url.href);
}

/** Fetch an image (bytes). Uses magic-byte sniffing as the source of truth. */
export async function fetchImage(rawUrl, opts = {}) {
  const res = await safeFetch(rawUrl, {
    accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8',
    typePolicy: imageTypePolicy,
    notTypeCode: 'NOT_IMAGE',
    notTypeMessage: "That link isn't an image we can use.",
    truncate: false,
    maxBytes: 3_500_000,
    timeoutMs: 8000,
    ...opts,
  });
  const mime = sniffImageType(res.body);
  if (!mime) throw new FetchError('NOT_IMAGE', "That link isn't an image we can use.");
  return { ...res, mime };
}
