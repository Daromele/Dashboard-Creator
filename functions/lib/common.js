/**
 * common.js — small helpers shared by the Netlify function handlers.
 */

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/** code -> HTTP status. Upstream (remote-site) problems use 502/504. */
const STATUS_BY_CODE = {
  BAD_REQUEST: 400, INVALID_URL: 400, UNSUPPORTED_PROTOCOL: 400, BLOCKED_HOST: 400,
  FORBIDDEN_ORIGIN: 403, METHOD_NOT_ALLOWED: 405, RATE_LIMITED: 429,
  NOT_HTML: 422, NOT_IMAGE: 422, TOO_LARGE: 413, TIMEOUT: 504,
  SITE_BLOCKED: 502, NOT_FOUND: 502, SITE_RATE_LIMITED: 502, REMOTE_ERROR: 502,
  TOO_MANY_REDIRECTS: 502, REDIRECT_LOOP: 502, TLS_ERROR: 502, FETCH_FAILED: 502,
};

export function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

/** Turn any thrown error into a safe, friendly JSON error (never a stack trace). */
export function errorResponse(err, extraHeaders = {}) {
  const code = err && typeof err.code === 'string' && STATUS_BY_CODE[err.code] ? err.code : 'FETCH_FAILED';
  const known = err && STATUS_BY_CODE[err.code];
  const message = known && err.message ? err.message : "We couldn't load that page.";
  return jsonResponse(STATUS_BY_CODE[code], { ok: false, error: { code, message } }, extraHeaders);
}

export function clientIp(event) {
  const h = event.headers || {};
  return (
    h['x-nf-client-connection-ip'] ||
    (h['x-forwarded-for'] || '').split(',')[0].trim() ||
    h['client-ip'] ||
    'unknown'
  );
}

/**
 * Only accept browser requests coming from this site. Non-browser clients
 * (curl) send no Origin and are still rate limited. Extra hosts can be allowed
 * via the optional ALLOWED_ORIGINS env var (comma-separated hostnames).
 */
export function originAllowed(event, extraHosts = process.env.ALLOWED_ORIGINS || '') {
  const h = event.headers || {};
  if ((h['sec-fetch-site'] || '').toLowerCase() === 'cross-site') return false;
  const origin = h.origin;
  if (!origin) return true;
  let originHost;
  try { originHost = new URL(origin).host.toLowerCase(); } catch { return false; }
  const selfHosts = [h['x-forwarded-host'], h.host].filter(Boolean).map((x) => String(x).toLowerCase());
  if (selfHosts.includes(originHost)) return true;
  return extraHosts.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).includes(originHost);
}

/** Parse a small JSON request body. Throws BAD_REQUEST on anything odd. */
export function readJsonBody(event, maxBytes = 4096) {
  let raw = event.body || '';
  if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  if (raw.length > maxBytes) {
    const e = new Error('Request too large.');
    e.code = 'BAD_REQUEST';
    throw e;
  }
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object') throw new Error('x');
    return parsed;
  } catch {
    const e = new Error('Invalid request.');
    e.code = 'BAD_REQUEST';
    throw e;
  }
}

/** Minimal structured log: never includes URLs, page content or user data. */
export function logEvent(evt, fields = {}) {
  try {
    console.log(JSON.stringify({ evt, ...fields }));
  } catch { /* logging must never break a request */ }
}
