/**
 * /.netlify/functions/import-recipe
 *
 * POST { "url": "https://example.com/some-recipe" }
 *
 *   1. validate the URL (http/https only, SSRF guard)
 *   2. fetch the page (redirect/size/time limits, HTML only)
 *   3. extract + normalise a recipe (JSON-LD → microdata → fallback)
 *   4. return plain JSON — never remote HTML
 *
 * Nothing is stored and no recipe content is logged. The function is stateless
 * apart from a small in-memory rate limiter.
 */
import { validateUrl } from './lib/url-guard.js';
import { fetchHtml, FetchError } from './lib/safe-fetch.js';
import { extractRecipe } from './lib/recipe-parser.js';
import { createRateLimiter } from './lib/rate-limit.js';
import {
  jsonResponse, errorResponse, clientIp, originAllowed, readJsonBody, logEvent,
} from './lib/common.js';

/**
 * Factory so tests can inject a fake fetcher / limiter. Production uses the
 * default export below, which has every safety check enabled.
 */
export function createHandler(opts = {}) {
  const limiter = opts.rateLimiter || createRateLimiter({ perMinute: 12, perHour: 120 });
  const fetchPage = opts.fetchPage || ((url) => fetchHtml(url, { timeoutMs: 8000, maxBytes: 3_000_000, maxRedirects: 4 }));
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
        const e = new Error('Too many imports in a short time. Please wait a moment and try again.');
        e.code = 'RATE_LIMITED';
        return errorResponse(e, { 'Retry-After': String(rl.retryAfterSec) });
      }

      const body = readJsonBody(event);
      const requested = validateUrl(String(body.url || ''), { allowPrivate: !!opts.allowPrivate });

      const page = await fetchPage(requested.href);
      const result = extractRecipe(page.html, { url: page.finalUrl });

      logEvent('import', { status: result.status, method: result.method, ms: Date.now() - started });
      return jsonResponse(200, {
        ok: true,
        status: result.status,
        method: result.method,
        recipe: result.recipe,
        missing: result.missing,
        warnings: result.warnings,
        source: {
          requestedUrl: requested.href,
          finalUrl: page.finalUrl,
          canonicalUrl: result.meta.canonicalUrl || '',
        },
      });
    } catch (err) {
      const code = err && err.code;
      logEvent('import-error', { code: typeof code === 'string' ? code : 'UNEXPECTED', ms: Date.now() - started });
      if (err instanceof FetchError || (err && err.name === 'GuardError') || (err && typeof code === 'string')) {
        return errorResponse(err);
      }
      // Unknown failure: never leak internals.
      return errorResponse({ code: 'FETCH_FAILED', message: "We couldn't load that page." });
    }
  };
}

export const handler = createHandler();
