/**
 * /.netlify/functions/fetch-image
 *
 * POST { "url": "https://example.com/photo.jpg", "referer": "https://example.com/recipe" }
 *
 * Browsers can't read most third-party images into a canvas (CORS), so the
 * app asks this function for the bytes, then resizes/compresses them locally
 * and stores the copy in IndexedDB. Same SSRF guard, limits and rate limiting
 * as the importer; the response is the raw image (never SVG) or a JSON error.
 */
import { validateUrl } from './lib/url-guard.js';
import { fetchImage, FetchError } from './lib/safe-fetch.js';
import { createRateLimiter } from './lib/rate-limit.js';
import {
  errorResponse, clientIp, originAllowed, readJsonBody, logEvent,
} from './lib/common.js';

export function createHandler(opts = {}) {
  const limiter = opts.rateLimiter || createRateLimiter({ perMinute: 24, perHour: 240 });
  const getImage = opts.getImage || ((url, referer) => fetchImage(url, { referer }));
  const checkOrigin = opts.checkOrigin !== false;

  return async function handler(event) {
    const started = Date.now();
    try {
      const method = (event.httpMethod || '').toUpperCase();
      if (method === 'OPTIONS') return { statusCode: 204, headers: { Allow: 'POST, OPTIONS' }, body: '' };
      if (method !== 'POST') {
        const e = new Error('Use POST.');
        e.code = 'METHOD_NOT_ALLOWED';
        return errorResponse(e, { Allow: 'POST, OPTIONS' });
      }
      if (checkOrigin && !originAllowed(event)) {
        const e = new Error('This request is not allowed from that site.');
        e.code = 'FORBIDDEN_ORIGIN';
        return errorResponse(e);
      }
      const rl = limiter.check(clientIp(event));
      if (!rl.ok) {
        const e = new Error('Too many requests. Please wait a moment.');
        e.code = 'RATE_LIMITED';
        return errorResponse(e, { 'Retry-After': String(rl.retryAfterSec) });
      }

      const body = readJsonBody(event);
      const url = validateUrl(String(body.url || ''), { allowPrivate: !!opts.allowPrivate });
      let referer;
      if (body.referer) {
        try { referer = validateUrl(String(body.referer), { allowPrivate: !!opts.allowPrivate }).href; } catch { referer = undefined; }
      }

      const img = await getImage(url.href, referer);
      logEvent('image', { bytes: img.body.length, ms: Date.now() - started });
      return {
        statusCode: 200,
        isBase64Encoded: true,
        headers: {
          'Content-Type': img.mime,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'",
        },
        body: img.body.toString('base64'),
      };
    } catch (err) {
      const code = err && err.code;
      logEvent('image-error', { code: typeof code === 'string' ? code : 'UNEXPECTED', ms: Date.now() - started });
      if (err instanceof FetchError || (err && err.name === 'GuardError') || (err && typeof code === 'string')) {
        return errorResponse(err);
      }
      return errorResponse({ code: 'FETCH_FAILED', message: "We couldn't load that image." });
    }
  };
}

export const handler = createHandler();
