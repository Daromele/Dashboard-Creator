/**
 * importer.js — the client side of "paste a link → get a recipe".
 *
 *  - validates/cleans what the user pasted
 *  - throttles + caches requests (the server is on the owner's Netlify account)
 *  - calls the import-recipe function and translates failures into friendly,
 *    actionable messages (never raw errors)
 *  - turns the function's plain-data result into a recipe draft
 *  - parses pasted recipe text (no AI, just tidy heuristics)
 */
import { functionUrl } from './api.js';
import { createBlankRecipe, normalizeUrl } from './recipes.js';
import { cacheRemoteImage } from './images.js';
import { isOnline, nowIso, safeHttpUrl, hostOf } from './util.js';
import { parseIngredient } from './ingredients.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const GENERIC_FAIL_TITLE = "We couldn't fully detect this recipe.";

const COPY = {
  OFFLINE: ['You appear to be offline.', 'Importing a link needs an internet connection. You can still paste the recipe text or enter it manually, and everything you have saved stays available offline.'],
  INVALID_URL: ["That doesn't look like a valid link.", 'Copy the full address from your browser’s address bar — it starts with https://.'],
  UNSUPPORTED_PROTOCOL: ['Only web links (http or https) can be imported.', 'Copy the address of the recipe page from your browser.'],
  BLOCKED_HOST: ["That address can't be imported.", 'Only public recipe web pages are supported.'],
  RATE_LIMITED: ['You are importing very quickly.', 'Wait a few seconds and try again.'],
  SITE_BLOCKED: ['This website blocked automatic recipe importing.', 'Open the original recipe, then paste its text here or enter it manually.'],
  SITE_RATE_LIMITED: ['The website asked us to slow down.', 'Try again in a minute.'],
  NOT_FOUND: ["We couldn't find that page.", 'Check that the link still works by opening the original.'],
  TIMEOUT: ['The website took too long to respond.', 'Try again, or paste the recipe text instead.'],
  NOT_HTML: ["This link doesn't appear to be a webpage.", 'Make sure the link points to a recipe page, not a file or image.'],
  TOO_LARGE: ['That page is too large to import.', 'Paste the recipe text instead.'],
  TOO_MANY_REDIRECTS: ['That link redirects too many times.', 'Open the original and copy the final address.'],
  REDIRECT_LOOP: ['That link redirects in a loop.', 'Open the original and copy the final address.'],
  TLS_ERROR: ["We couldn't make a secure connection to that website.", 'Try again later, or paste the recipe text.'],
  REMOTE_ERROR: ['The website had a problem responding.', 'Try again in a little while.'],
  FETCH_FAILED: ["We couldn't load that page.", 'Try again, or paste the recipe text instead.'],
  NO_RECIPE: ["We found the page but couldn't detect structured recipe information.", 'You can still enter the recipe manually or paste its text.'],
  IMPORTER_UNAVAILABLE: ['The recipe importer is not running here.', 'When developing locally, start the app with "netlify dev" (or "npm run dev") so the import function is available.'],
  NETWORK: ["We couldn't reach the importer.", 'Check your connection and try again.'],
  CANCELLED: ['Import cancelled.', ''],
};

export class ImportError extends Error {
  constructor(code, { message, hint, status } = {}) {
    const copy = COPY[code] || COPY.FETCH_FAILED;
    super(message || copy[0]);
    this.name = 'ImportError';
    this.code = code;
    this.hint = hint || copy[1];
    this.status = status;
    /** Offer "Try Again" for transient problems only. */
    this.retryable = ['TIMEOUT', 'NETWORK', 'REMOTE_ERROR', 'SITE_RATE_LIMITED', 'RATE_LIMITED', 'FETCH_FAILED', 'TLS_ERROR'].includes(code);
    /** Errors about the text the user typed are shown inline, not as a failure card. */
    this.inline = ['INVALID_URL', 'UNSUPPORTED_PROTOCOL', 'BLOCKED_HOST'].includes(code);
  }
}

// ---------------------------------------------------------------------------
// URL handling
// ---------------------------------------------------------------------------

/** Clean up whatever was pasted into the URL box. Throws ImportError(INVALID_URL). */
export function cleanUserUrl(input) {
  let text = String(input == null ? '' : input).trim().replace(/^[<"'`(]+|[>"'`).,;]+$/g, '');
  const embedded = text.match(/https?:\/\/[^\s<>"']+/i);
  if (embedded) text = embedded[0];
  if (!text) throw new ImportError('INVALID_URL', { message: 'Paste a recipe link to get started.' });
  if (/\s/.test(text)) throw new ImportError('INVALID_URL');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text}`;
  let url;
  try { url = new URL(text); } catch { throw new ImportError('INVALID_URL'); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new ImportError('UNSUPPORTED_PROTOCOL');
  if (!url.hostname.includes('.') || url.hostname.endsWith('.')) throw new ImportError('INVALID_URL');
  url.hash = '';
  return url.href;
}

// ---------------------------------------------------------------------------
// Client-side rate protection: throttle + short-lived cache
// ---------------------------------------------------------------------------

const MIN_GAP_MS = 1500;
const MAX_PER_MINUTE = 8;
const CACHE_MS = 10 * 60 * 1000;
const recent = [];
const resultCache = new Map();
const inflight = new Map();

function checkThrottle() {
  const now = Date.now();
  while (recent.length && recent[0] < now - 60_000) recent.shift();
  if (recent.length && now - recent[recent.length - 1] < MIN_GAP_MS) throw new ImportError('RATE_LIMITED');
  if (recent.length >= MAX_PER_MINUTE) throw new ImportError('RATE_LIMITED');
  recent.push(now);
}

export function clearImportCache() { resultCache.clear(); }

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Fetch + parse a recipe page via the Netlify function.
 * Resolves { status, method, draft, missing, warnings, source }.
 * Throws ImportError for anything that prevents a result.
 */
export async function importFromUrl(rawUrl, { signal, fresh = false, timeoutMs = 20000 } = {}) {
  const url = cleanUserUrl(rawUrl);
  if (!isOnline()) throw new ImportError('OFFLINE');

  const key = normalizeUrl(url);
  const cached = resultCache.get(key);
  if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cloneResult(cached.result);
  if (inflight.has(key)) return inflight.get(key).then(cloneResult);

  const promise = (async () => {
    checkThrottle();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort('timeout'), timeoutMs);
    const onAbort = () => ctrl.abort('cancelled');
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    let res;
    try {
      res = await fetch(functionUrl('import-recipe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: ctrl.signal,
        cache: 'no-store',
        credentials: 'omit',
      });
    } catch (err) {
      if (ctrl.signal.aborted) throw new ImportError(ctrl.signal.reason === 'cancelled' ? 'CANCELLED' : 'TIMEOUT');
      throw new ImportError(isOnline() ? 'NETWORK' : 'OFFLINE');
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    }

    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!body || typeof body !== 'object') {
      // e.g. a static host answering 404 with HTML: the function isn't deployed/running
      throw new ImportError(res.status === 404 || res.status === 405 ? 'IMPORTER_UNAVAILABLE' : 'FETCH_FAILED');
    }
    if (!res.ok || body.ok === false) {
      const code = body.error && body.error.code;
      throw new ImportError(COPY[code] ? code : 'FETCH_FAILED', { status: res.status });
    }
    const result = {
      status: body.status || 'failed',
      method: body.method || 'none',
      draft: draftFromImport(body),
      missing: Array.isArray(body.missing) ? body.missing : [],
      warnings: Array.isArray(body.warnings) ? body.warnings : [],
      source: body.source || { requestedUrl: url, finalUrl: url },
    };
    resultCache.set(key, { at: Date.now(), result });
    return result;
  })();

  inflight.set(key, promise);
  try { return cloneResult(await promise); } finally { inflight.delete(key); }
}

function cloneResult(r) {
  return { ...r, draft: { ...r.draft, id: r.draft.id }, missing: [...r.missing], warnings: [...r.warnings] };
}

/** Turn the function's plain-data JSON into a recipe draft (not yet saved). */
export function draftFromImport(body) {
  const r = (body && body.recipe) || {};
  const src = (body && body.source) || {};
  const sourceUrl = safeHttpUrl(r.sourceUrl) || safeHttpUrl(src.finalUrl) || safeHttpUrl(src.requestedUrl) || '';
  return createBlankRecipe({
    title: r.title || '',
    description: r.description || '',
    image: safeHttpUrl(r.image),
    sourceName: r.sourceName || hostOf(sourceUrl),
    sourceUrl,
    author: r.author || '',
    datePublished: r.datePublished || '',
    dateImported: nowIso(),
    prepTimeMinutes: r.prepTimeMinutes,
    cookTimeMinutes: r.cookTimeMinutes,
    totalTimeMinutes: r.totalTimeMinutes,
    servings: r.servings || '',
    cuisine: r.cuisine || [],
    categories: r.categories || [],
    tags: r.tags || [],
    ingredients: Array.isArray(r.ingredients) ? r.ingredients.map((i) => (typeof i === 'string' ? i : i && i.original)).filter(Boolean) : [],
    instructionSections: r.instructionSections || [],
    nutrition: r.nutrition || null,
    sourceRating: r.sourceRating || null,
  });
}

/** URLs worth checking for duplicates (requested, final, canonical). */
export function knownUrls(result) {
  const s = result.source || {};
  return [...new Set([s.requestedUrl, s.finalUrl, s.canonicalUrl, result.draft && result.draft.sourceUrl].filter(Boolean))];
}

/** Human summary for the failure screen: what was found / what is missing. */
export function describeFindings(result) {
  const d = result.draft;
  const steps = (d.instructionSections || []).reduce((n, s) => n + s.steps.length, 0);
  const found = [];
  if (d.title) found.push('title');
  if (d.image) found.push('photo');
  if (d.description) found.push('description');
  if (d.ingredients.length) found.push(`${d.ingredients.length} ingredient${d.ingredients.length === 1 ? '' : 's'}`);
  if (steps) found.push(`${steps} step${steps === 1 ? '' : 's'}`);
  const missing = [];
  if (!d.ingredients.length) missing.push('ingredients');
  if (!steps) missing.push('instructions');
  if (!d.title) missing.push('title');
  return { found, missing };
}

/**
 * Begin downloading + compressing the recipe photo in the background while the
 * user reviews the preview. Resolves the local image id, or '' if unavailable.
 */
export function startImageCache(draft, { signal } = {}) {
  const url = safeHttpUrl(draft.image);
  if (!url || !isOnline()) return Promise.resolve('');
  return cacheRemoteImage(url, draft.sourceUrl, { signal }).catch(() => '');
}

// ---------------------------------------------------------------------------
// Paste recipe text
// ---------------------------------------------------------------------------

const BULLETS = /^[\s▢☐◻□•·*▪■●○◦‣✓✔>-]+(?=\S)/;
const INGREDIENT_HEAD = /^\s*(?:#+\s*)?ingredients?\s*:?\s*$/i;
const METHOD_HEAD = /^\s*(?:#+\s*)?(?:instructions?|directions?|method|preparation|steps?|how to make(?: it)?)\s*:?\s*$/i;
const NOTES_HEAD = /^\s*(?:#+\s*)?(?:notes?|tips?)\s*:?\s*$/i;

function tidyLines(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t+/g, ' ')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim());
}

/** Lines → non-empty trimmed lines with bullets/checkboxes removed. */
export function cleanIngredientLines(text) {
  return tidyLines(text)
    .map((l) => l.replace(BULLETS, '').trim())
    .filter((l) => l && !INGREDIENT_HEAD.test(l))
    // "For the sauce:" style group headers are not ingredients
    .filter((l) => !(/:$/.test(l) && l.split(' ').length <= 6 && !/\d/.test(l)));
}

/**
 * Turn pasted instructions into sections. Handles numbered steps ("1." "2)"
 * "Step 3:"), blank-line separated paragraphs, plain line-per-step text and
 * "For the filling:" style section headings.
 */
export function parseInstructionText(text) {
  const lines = tidyLines(text);
  const sections = [];
  let current = { section: 'Main', steps: [] };
  const flush = () => { if (current.steps.length) sections.push(current); };
  const hasNumbering = lines.filter((l) => /^(?:step\s*)?\d{1,2}\s*[.):\-]\s+\S/i.test(l)).length >= 2;
  const hasBlankSeparated = /\n\s*\n/.test(String(text || '').replace(/\r/g, ''));

  let buffer = [];
  const pushBuffer = () => {
    if (!buffer.length) return;
    current.steps.push(buffer.join(' ').trim());
    buffer = [];
  };

  for (const raw of lines) {
    let line = raw.replace(BULLETS, '').trim();
    if (!line) { if (hasBlankSeparated && !hasNumbering) pushBuffer(); continue; }
    if (METHOD_HEAD.test(line)) continue;
    if (/:$/.test(line) && line.split(' ').length <= 6 && !/[.!?]:$/.test(line)) {
      pushBuffer(); flush();
      current = { section: line.replace(/:$/, '').trim(), steps: [] };
      continue;
    }
    const numbered = line.match(/^(?:step\s*)?(\d{1,2})\s*[.):\-]\s+(\S.*)$/i);
    if (numbered) { pushBuffer(); buffer = [numbered[2]]; continue; }
    if (hasNumbering) { buffer.push(line); continue; } // continuation of a wrapped numbered step
    if (hasBlankSeparated) { buffer.push(line); continue; }
    pushBuffer(); buffer = [line]; // one step per line
  }
  pushBuffer();
  flush();

  // A single long paragraph: split into sentences so the steps are usable.
  if (sections.length === 1 && sections[0].steps.length === 1 && sections[0].steps[0].length > 400) {
    const sentences = sections[0].steps[0].match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [];
    if (sentences.length > 2) sections[0].steps = sentences.map((s) => s.trim()).filter(Boolean);
  }
  return sections;
}

/** If everything was pasted into one box, split it on "Ingredients" / "Directions" headings. */
export function splitWholeRecipeText(text) {
  const lines = tidyLines(text);
  const out = { title: '', ingredients: [], instructions: [], notes: [] };
  let mode = 'pre';
  for (const line of lines) {
    if (INGREDIENT_HEAD.test(line)) { mode = 'ing'; continue; }
    if (METHOD_HEAD.test(line)) { mode = 'ins'; continue; }
    if (NOTES_HEAD.test(line)) { mode = 'notes'; continue; }
    if (mode === 'pre') { if (line && !out.title) out.title = line; continue; }
    out[mode === 'ing' ? 'ingredients' : mode === 'ins' ? 'instructions' : 'notes'].push(line);
  }
  return {
    title: out.title,
    ingredients: out.ingredients.join('\n'),
    instructions: out.instructions.join('\n'),
    notes: out.notes.join('\n').trim(),
  };
}

/** Build a draft from the three "Paste Recipe" text areas (+ optional source). */
export function draftFromPastedText({ title = '', ingredients = '', instructions = '', sourceUrl = '', notes = '' } = {}) {
  let ing = ingredients;
  let ins = instructions;
  let name = title;
  let extraNotes = notes;
  // Everything dumped in the ingredients box (with headings)? Split it.
  const hasMethodHeading = ing.split('\n').some((l) => METHOD_HEAD.test(l.trim()));
  if (hasMethodHeading && !ins.trim()) {
    const split = splitWholeRecipeText(`${name}\n${ing}`);
    if (split.instructions) {
      if (!String(name).trim()) name = split.title;
      ing = split.ingredients || ing;
      ins = split.instructions;
      extraNotes = extraNotes || split.notes;
    }
  }
  const ingLines = cleanIngredientLines(ing);
  return createBlankRecipe({
    title: String(name).trim().split('\n')[0] || '',
    sourceUrl: safeHttpUrl(sourceUrl),
    sourceName: hostOf(sourceUrl),
    dateImported: sourceUrl ? nowIso() : '',
    ingredients: ingLines.map((l) => parseIngredient(l)),
    instructionSections: parseInstructionText(ins),
    notes: extraNotes || '',
  });
}
