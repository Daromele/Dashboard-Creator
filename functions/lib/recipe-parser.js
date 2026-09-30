/**
 * recipe-parser.js — layered recipe extraction from raw HTML.
 *
 *   Level 1  Schema.org Recipe JSON-LD   (single object, arrays, @graph, nested,
 *                                          multiple blocks, malformed-but-recoverable)
 *   Level 1b Schema.org microdata        (itemprop attributes)
 *   Level 2  Heuristic fallback          (Open Graph, <title>, meta description,
 *                                          common ingredient / instruction containers,
 *                                          "Ingredients" / "Directions" headings)
 *
 * The parser only ever returns PLAIN DATA (strings, numbers, arrays). No HTML
 * from the remote page is passed through; all text is tag-stripped, entity-
 * decoded, whitespace-normalised and length-capped.
 */
import {
  parseHtml, findAll, textOf, lineOf, nextSiblings, classAndId, metaContent, decodeEntities,
} from './html.js';
import { parseIngredient } from '../../src/ingredients.js';
import { canonicalCategories } from '../../src/taxonomy.js';

const LIMITS = {
  title: 200, description: 1500, author: 120, ingredient: 300, ingredients: 150,
  step: 3000, steps: 200, tag: 40, tags: 15, servings: 60, section: 120,
};

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Strip tags/entities/control chars → single clean line. */
export function cleanLine(v, max = 500) {
  if (v == null) return '';
  let s = Array.isArray(v) ? v.map((x) => cleanLine(x, max)).filter(Boolean).join(', ') : String(typeof v === 'object' ? (v.text ?? v.name ?? '') : v);
  s = stripTags(s);
  s = decodeEntities(s);
  // \p{Cc} = control chars, \p{Cf} = invisible format chars (zero-width space, BOM…)
  s = s.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

const INLINE_TAG = /<\/?(?:b|i|em|strong|u|span|a|small|sup|sub|mark|abbr|font|s)\b[^>]*>/gi;

/** Remove tags: inline formatting tags vanish, block/line-break tags become a space. */
function stripTags(s) {
  return s
    .replace(INLINE_TAG, '')
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|div)>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
}

/** Like cleanLine but keeps line breaks (for splitting instruction blobs). */
function cleanLines(v) {
  let s = String(v ?? '');
  s = s.replace(INLINE_TAG, '').replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|h[1-6]|tr)>/gi, '\n').replace(/<[^>]*>/g, ' ');
  s = decodeEntities(s).replace(/\r/g, '\n');
  // keep line breaks; blank out other control / invisible format characters
  s = s.replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === '\n' ? c : ' '));
  return s.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

const BULLET_RE = /^[\s▢☐◻□•·*▪■●○◦‣\-–—✓✔]+/;

function stripListMarker(s) {
  return s.replace(BULLET_RE, '').trim();
}

// ---------------------------------------------------------------------------
// JSON-LD extraction (loose)
// ---------------------------------------------------------------------------

/**
 * Repair common JSON-LD mistakes: raw control characters inside strings,
 * trailing commas, and truncated documents (auto-closes open strings/brackets).
 */
export function repairJson(text) {
  const out = [];
  const stack = [];
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) { esc = false; out.push(c); continue; }
      if (c === '\\') { esc = true; out.push(c); continue; }
      if (c === '"') { inStr = false; out.push(c); continue; }
      const code = c.charCodeAt(0);
      if (code < 0x20) {
        out.push(c === '\n' ? '\\n' : c === '\r' ? '\\r' : c === '\t' ? '\\t' : ' ');
        continue;
      }
      out.push(c);
      continue;
    }
    if (c === '"') { inStr = true; out.push(c); continue; }
    if (c === '{' || c === '[') { stack.push(c === '{' ? '}' : ']'); out.push(c); continue; }
    if (c === '}' || c === ']') {
      // drop a dangling comma before the closer
      let k = out.length - 1;
      while (k >= 0 && /\s/.test(out[k])) k--;
      if (k >= 0 && out[k] === ',') out.splice(k, 1);
      if (stack.length && stack[stack.length - 1] === c) stack.pop();
      out.push(c);
      continue;
    }
    out.push(c);
  }
  if (inStr) out.push('"');
  let k = out.length - 1;
  while (k >= 0 && /\s/.test(out[k])) k--;
  if (k >= 0 && out[k] === ',') out.splice(k, 1);
  else if (k >= 0 && out[k] === ':') out.push('null');
  while (stack.length) out.push(stack.pop());
  return out.join('');
}

/** Parse a JSON-LD script body, tolerating wrappers and minor corruption. */
export function parseJsonLoose(raw) {
  let t = String(raw || '').replace(/^\p{Cf}+/u, '').trim();
  t = t.replace(/^<!--/, '').replace(/-->$/, '').replace(/^\/\/\s*<!\[CDATA\[/, '').replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
  if (!t) return null;
  const attempts = [() => t, () => repairJson(t)];
  if (t.includes('&quot;') && !t.includes('"')) attempts.push(() => repairJson(decodeEntities(t)));
  for (const make of attempts) {
    try {
      return JSON.parse(make());
    } catch { /* try next repair */ }
  }
  return null;
}

function typeList(node) {
  return toArray(node && node['@type']).map((t) => String(t).replace(/^.*[/#]/, '').toLowerCase());
}

function isRecipeNode(node) {
  return node && typeof node === 'object' && !Array.isArray(node) && typeList(node).includes('recipe');
}

/** Walk any JSON value collecting every object (handles @graph, nesting, arrays). */
function collectObjects(root) {
  const out = [];
  const seen = new Set();
  const stack = [[root, 0]];
  while (stack.length && out.length < 5000) {
    const [v, depth] = stack.pop();
    if (!v || typeof v !== 'object' || seen.has(v) || depth > 40) continue;
    seen.add(v);
    if (!Array.isArray(v)) out.push(v);
    for (const child of Array.isArray(v) ? v : Object.values(v)) {
      if (child && typeof child === 'object') stack.push([child, depth + 1]);
    }
  }
  return out;
}

function buildIdMap(objects) {
  const map = new Map();
  for (const o of objects) {
    const id = o['@id'];
    if (typeof id !== 'string') continue;
    const prev = map.get(id);
    if (!prev || Object.keys(o).length > Object.keys(prev).length) map.set(id, o);
  }
  return map;
}

/** Resolve {"@id": "..."} references to their full node. */
function deref(v, idMap) {
  if (v && typeof v === 'object' && !Array.isArray(v) && idMap) {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === '@id' && idMap.has(v['@id'])) return idMap.get(v['@id']);
  }
  return v;
}

function scoreRecipeNode(node, idMap) {
  const ing = toArray(deref(node.recipeIngredient ?? node.ingredients, idMap)).length;
  let steps = 0;
  const visit = (x) => {
    x = deref(x, idMap);
    if (Array.isArray(x)) x.forEach(visit);
    else if (x && typeof x === 'object') {
      if (x.itemListElement) visit(x.itemListElement);
      else steps++;
    } else if (typeof x === 'string' && x.trim()) steps++;
  };
  visit(node.recipeInstructions);
  return ing * 2 + steps + (node.name ? 1 : 0) + (node.image ? 1 : 0);
}

function findJsonLdRecipe(doc, pageUrl) {
  const all = [];
  for (const block of doc.jsonLd) {
    const parsed = parseJsonLoose(block);
    if (parsed) all.push(...collectObjects(parsed));
  }
  if (!all.length) return null;
  const idMap = buildIdMap(all);
  const recipes = all.filter(isRecipeNode);
  if (!recipes.length) return null;
  let best = null;
  let bestScore = -1;
  for (const r of recipes) {
    let s = scoreRecipeNode(r, idMap);
    const u = cleanLine(r.url || (r.mainEntityOfPage && r.mainEntityOfPage['@id']) || r.mainEntityOfPage || '');
    if (pageUrl && u && u.replace(/\/$/, '') === pageUrl.replace(/\/$/, '')) s += 5;
    if (s > bestScore) { best = r; bestScore = s; }
  }
  return { node: best, idMap };
}

// ---------------------------------------------------------------------------
// Field normalisers
// ---------------------------------------------------------------------------

/** ISO-8601 duration or loose "1 hr 15 min" → whole minutes (or null). */
export function parseDurationMinutes(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v > 0 && v < 100000 ? Math.round(v) : null;
  if (typeof v === 'object') return parseDurationMinutes(v.value ?? v.text ?? v.name);
  const s = String(v).trim();
  const iso = s.match(/^P(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (iso && s.length > 1) {
    const [, w, d, h, m, sec] = iso.map((x) => (x == null ? 0 : parseFloat(x)));
    const minutes = w * 7 * 1440 + d * 1440 + h * 60 + m + sec / 60;
    return minutes > 0 ? Math.round(minutes) : null;
  }
  let total = 0;
  let matched = false;
  for (const mm of s.matchAll(/(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi)) {
    const n = parseFloat(mm[1]);
    const u = mm[2].toLowerCase();
    matched = true;
    if (u.startsWith('d')) total += n * 1440;
    else if (u.startsWith('h')) total += n * 60;
    else if (u.startsWith('m')) total += n;
    else total += n / 60;
  }
  if (matched) return total > 0 ? Math.round(total) : null;
  const hm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return parseInt(hm[1], 10) * 60 + parseInt(hm[2], 10) || null;
  if (/^\d+$/.test(s)) return parseInt(s, 10) || null;
  return null;
}

function normalizeYield(v, idMap) {
  const items = toArray(deref(v, idMap))
    .map((x) => cleanLine(typeof x === 'object' && x ? (x.value ?? x.name ?? x.text ?? '') : x, LIMITS.servings))
    .filter(Boolean);
  if (!items.length) return '';
  const pref = items.find((x) => /serv|portion|people|person|makes|yield|slice|piece|cookie|muffin|bar/i.test(x) && /\d/.test(x));
  return pref || items.find((x) => /\d/.test(x)) || items[0];
}

function absUrl(u, base) {
  const s = cleanLine(u, 2000);
  if (!s || /^(data|javascript|blob|file):/i.test(s)) return '';
  try {
    const url = new URL(s, base || undefined);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function normalizeImage(v, idMap, base) {
  const candidates = [];
  const visit = (x, depth = 0) => {
    x = deref(x, idMap);
    if (x == null || depth > 4) return;
    if (typeof x === 'string') { candidates.push({ url: x, area: 0 }); return; }
    if (Array.isArray(x)) { x.forEach((y) => visit(y, depth + 1)); return; }
    if (typeof x === 'object') {
      const url = x.url ?? x.contentUrl ?? x['@id'];
      const w = Number(x.width?.value ?? x.width) || 0;
      const h = Number(x.height?.value ?? x.height) || 0;
      if (typeof url === 'string') candidates.push({ url, area: w * h });
      else if (x.image) visit(x.image, depth + 1);
    }
  };
  visit(v);
  const ranked = candidates
    .map((c) => ({ ...c, url: absUrl(c.url, base) }))
    .filter((c) => c.url && !/\.svg(\?|$)/i.test(c.url));
  if (!ranked.length) return '';
  // Prefer the largest declared image; otherwise the first one listed.
  const best = ranked.reduce((a, b) => (b.area > a.area ? b : a), ranked[0]);
  return best.url;
}

function normalizeAuthor(v, idMap) {
  const names = [];
  const visit = (x, depth = 0) => {
    x = deref(x, idMap);
    if (x == null || depth > 3) return;
    if (typeof x === 'string') names.push(x);
    else if (Array.isArray(x)) x.forEach((y) => visit(y, depth + 1));
    else if (typeof x === 'object') visit(x.name ?? '', depth + 1);
  };
  visit(v);
  const clean = names.map((n) => cleanLine(n, LIMITS.author)).filter((n) => n && !/^https?:/i.test(n));
  return [...new Set(clean)].slice(0, 3).join(', ');
}

function normalizeKeywords(v, idMap) {
  const raw = toArray(deref(v, idMap)).flatMap((x) => (typeof x === 'string' ? x.split(/[,;\n|]/) : [x?.name ?? '']));
  const seen = new Set();
  const out = [];
  for (const k of raw) {
    const c = cleanLine(k, 80);
    if (!c || c.length > LIMITS.tag) continue;
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= LIMITS.tags) break;
  }
  return out;
}

function normalizeList(v, idMap) {
  const raw = toArray(deref(v, idMap)).flatMap((x) => (typeof x === 'string' ? x.split(/[,;|]/) : [x?.name ?? '']));
  const seen = new Set();
  const out = [];
  for (const k of raw) {
    const c = cleanLine(k, 60);
    if (c && !seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); out.push(c); }
  }
  return out.slice(0, 8);
}

const NUTRITION_KEYS = [
  'calories', 'servingSize', 'carbohydrateContent', 'proteinContent', 'fatContent', 'saturatedFatContent',
  'fiberContent', 'sugarContent', 'sodiumContent', 'cholesterolContent',
];

function normalizeNutrition(v, idMap) {
  v = deref(toArray(v)[0], idMap);
  if (!v || typeof v !== 'object') return null;
  const out = {};
  for (const k of NUTRITION_KEYS) {
    const val = cleanLine(v[k], 40);
    if (val) out[k] = val;
  }
  return Object.keys(out).length ? out : null;
}

function normalizeRating(v, idMap) {
  v = deref(toArray(v)[0], idMap);
  if (!v || typeof v !== 'object') return null;
  let value = parseFloat(String(v.ratingValue ?? '').replace(',', '.'));
  const best = parseFloat(v.bestRating ?? 5) || 5;
  if (!isFinite(value) || value <= 0) return null;
  if (best !== 5 && best > 0) value = (value * 5) / best;
  if (value > 5.01) return null;
  const count = parseInt(String(v.ratingCount ?? v.reviewCount ?? '').replace(/[^\d]/g, ''), 10);
  return { value: Math.round(value * 10) / 10, count: isFinite(count) && count > 0 ? count : null };
}

function normalizeDate(v) {
  const s = cleanLine(Array.isArray(v) ? v[0] : v, 40);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function normalizeIngredients(v, idMap) {
  const lines = [];
  const visit = (x, depth = 0) => {
    x = deref(x, idMap);
    if (x == null || depth > 3) return;
    if (typeof x === 'string') {
      // A few sites ship one big string with line breaks.
      const parts = x.includes('\n') || /<br|<li/i.test(x) ? cleanLines(x) : [cleanLine(x, LIMITS.ingredient)];
      lines.push(...parts);
    } else if (Array.isArray(x)) x.forEach((y) => visit(y, depth + 1));
    else if (typeof x === 'object') visit(x.text ?? x.name ?? '', depth + 1);
  };
  visit(v);
  const out = [];
  for (const raw of lines) {
    const line = stripListMarker(cleanLine(raw, LIMITS.ingredient));
    if (!line) continue;
    if (out.length && out[out.length - 1].original === line) continue;
    out.push(parseIngredient(line));
    if (out.length >= LIMITS.ingredients) break;
  }
  return out;
}

/** Split a blob of instruction text into individual steps. */
function splitInstructionText(text) {
  let lines = cleanLines(text);
  // "1. Do this 2. Do that" on a single line
  if (lines.length === 1 && /^(?:step\s*)?1[.):]\s/i.test(lines[0]) && /\s(?:step\s*)?2[.):]\s+\S/i.test(lines[0])) {
    lines = lines[0].split(/\s+(?=(?:step\s*)?\d{1,2}[.):]\s+[A-Z])/i);
  }
  return lines
    .map((l) => l.replace(/^(?:step\s*)?\d{1,2}\s*[.):\-–]\s+/i, '').replace(BULLET_RE, '').trim())
    .filter(Boolean);
}

/**
 * Normalise Schema.org recipeInstructions into
 *   [{ section: "Main", steps: ["…", "…"] }, …]
 * Handles string, string[], HowToStep[], HowToSection[] and nested sections.
 */
export function normalizeInstructions(v, idMap) {
  const sections = [];
  const byName = new Map();
  let total = 0;

  const sectionFor = (name) => {
    const key = name || 'Main';
    if (!byName.has(key)) {
      const s = { section: key, steps: [] };
      byName.set(key, s);
      sections.push(s);
    }
    return byName.get(key);
  };
  const addSteps = (name, texts) => {
    for (const t of texts) {
      if (total >= LIMITS.steps) return;
      const step = cleanLine(t, LIMITS.step);
      if (!step) continue;
      sectionFor(name).steps.push(step);
      total++;
    }
  };

  const visit = (x, sectionName, depth) => {
    x = deref(x, idMap);
    if (x == null || depth > 6) return;
    if (typeof x === 'string') { addSteps(sectionName, splitInstructionText(x)); return; }
    if (Array.isArray(x)) { x.forEach((y) => visit(y, sectionName, depth + 1)); return; }
    if (typeof x !== 'object') return;

    const types = typeList(x);
    const children = x.itemListElement;
    const isSection = types.includes('howtosection') || (children && !x.text && !types.includes('howtostep'));
    if (isSection) {
      const name = cleanLine(x.name ?? '', LIMITS.section);
      const full = name ? (sectionName && sectionName !== 'Main' ? `${sectionName} — ${name}` : name) : sectionName;
      visit(children, full, depth + 1);
      return;
    }
    // HowToStep / HowToDirection / anything with text
    const text = x.text ?? x.description ?? x.name;
    if (text) addSteps(sectionName, splitInstructionText(text));
    else if (children) visit(children, sectionName, depth + 1);
  };
  visit(v, '', 0);
  return sections.filter((s) => s.steps.length);
}

// ---------------------------------------------------------------------------
// Schema-like node → draft
// ---------------------------------------------------------------------------

function normalizeSchemaRecipe(node, { idMap, base }) {
  const get = (k) => deref(node[k], idMap);
  const prep = parseDurationMinutes(get('prepTime'));
  const cook = parseDurationMinutes(get('cookTime'));
  let total = parseDurationMinutes(get('totalTime'));
  if (total == null && prep != null && cook != null) total = prep + cook;
  const nameRaw = toArray(get('name') ?? get('headline'))[0];
  return {
    title: cleanLine(nameRaw, LIMITS.title),
    description: cleanLine(get('description'), LIMITS.description),
    image: normalizeImage(node.image ?? node.thumbnailUrl, idMap, base),
    author: normalizeAuthor(node.author ?? node.creator, idMap),
    datePublished: normalizeDate(get('datePublished')),
    prepTimeMinutes: prep,
    cookTimeMinutes: cook,
    totalTimeMinutes: total,
    servings: normalizeYield(node.recipeYield ?? node.yield, idMap),
    cuisine: normalizeList(node.recipeCuisine, idMap),
    categories: canonicalCategories(normalizeList(node.recipeCategory, idMap)),
    tags: normalizeKeywords(node.keywords, idMap),
    ingredients: normalizeIngredients(node.recipeIngredient ?? node.ingredients, idMap),
    instructionSections: normalizeInstructions(node.recipeInstructions, idMap),
    nutrition: normalizeNutrition(node.nutrition, idMap),
    sourceRating: normalizeRating(node.aggregateRating, idMap),
  };
}

// ---------------------------------------------------------------------------
// Microdata
// ---------------------------------------------------------------------------

function microdataValue(el) {
  const t = el.tag;
  if (t === 'meta') return el.attrs.content || '';
  if (t === 'img' || t === 'source') return el.attrs.src || '';
  if (t === 'a' || t === 'link') return el.attrs.href || '';
  if (t === 'time') return el.attrs.datetime || lineOf(el);
  return null; // caller uses text
}

function extractMicrodataRecipe(doc) {
  const scopes = findAll(doc.root, (el) => /schema\.org\/recipe/i.test(el.attrs.itemtype || ''));
  if (!scopes.length) return null;
  const scope = scopes[0];
  const props = {};
  const push = (name, val) => { (props[name] = props[name] || []).push(val); };

  const visit = (el, depth) => {
    for (const c of el.children) {
      if (c.tag === '#text') continue;
      const itemprop = (c.attrs.itemprop || '').toLowerCase().split(/\s+/).filter(Boolean);
      const isNestedScope = 'itemscope' in c.attrs;
      for (const name of itemprop) {
        const direct = microdataValue(c);
        if (name === 'recipeinstructions') {
          const items = findAll(c, (x) => x.tag === 'li' || x.tag === 'p');
          if (items.length) items.forEach((i) => push(name, lineOf(i)));
          else push(name, textOf(c));
        } else if (name === 'author' && isNestedScope) {
          const nm = findAll(c, (x) => (x.attrs.itemprop || '').toLowerCase() === 'name')[0];
          push(name, nm ? lineOf(nm) : lineOf(c));
        } else {
          push(name, direct != null ? direct : lineOf(c));
        }
      }
      if (!(isNestedScope && itemprop.length) && depth < 30) visit(c, depth + 1);
    }
  };
  visit(scope, 0);

  const first = (k) => (props[k] || [])[0];
  return {
    name: first('name'),
    description: first('description'),
    image: first('image'),
    author: first('author'),
    datePublished: first('datepublished'),
    prepTime: first('preptime'),
    cookTime: first('cooktime'),
    totalTime: first('totaltime'),
    recipeYield: first('recipeyield') || first('yield'),
    recipeCategory: props.recipecategory,
    recipeCuisine: props.recipecuisine,
    keywords: props.keywords,
    recipeIngredient: props.recipeingredient || props.ingredients,
    recipeInstructions: props.recipeinstructions,
  };
}

// ---------------------------------------------------------------------------
// Heuristic fallback (no structured data)
// ---------------------------------------------------------------------------

const JUNK_LINE = /^(print|pin|save|share|jump to|rate|review|add to|email|scale|1x|2x|3x|us customary|metric|ingredients?|instructions?|directions?|method|notes?|advertisement|ad|nutrition|equipment|watch|video)\b[:\s]*$/i;
const BAD_CONTAINER = /(related|comment|nav|sidebar|footer|header|menu|widget|newsletter|popup|modal|share|social|promo|advert|shop|cart|substitut|review|rating)/;

function listItems(container, itemTags = ['li']) {
  let items = findAll(container, (el) => itemTags.includes(el.tag));
  if (!items.length) items = findAll(container, (el) => el.tag === 'p');
  return items.map((el) => lineOf(el)).filter((l) => l && l.length <= LIMITS.step && !JUNK_LINE.test(l));
}

function pickContainer(doc, re) {
  const candidates = findAll(doc.root, (el) => {
    if (!['ul', 'ol', 'div', 'section', 'table', 'article'].includes(el.tag)) return false;
    const id = classAndId(el);
    return re.test(id) && !BAD_CONTAINER.test(id.replace(re, ''));
  });
  let best = null;
  let bestCount = 0;
  for (const c of candidates) {
    const n = findAll(c, (el) => el.tag === 'li').length || findAll(c, (el) => el.tag === 'p').length;
    if (n > bestCount && n <= 120) { best = c; bestCount = n; }
  }
  return best;
}

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function collectAfterHeading(doc, headingRe) {
  const heads = findAll(doc.root, (el) => {
    if (!(HEADING_TAGS.has(el.tag) || ['strong', 'b', 'p', 'div', 'span'].includes(el.tag))) return false;
    if (el.children.length > 3) return false;
    const t = lineOf(el);
    return t.length > 0 && t.length < 40 && headingRe.test(t);
  });
  for (const h of heads) {
    // Look at siblings of the heading, then of its parent (heading wrapped in a div).
    for (const start of [h, h.parent]) {
      if (!start || !start.parent) continue;
      const items = [];
      for (const sib of nextSiblings(start)) {
        if (sib.tag === '#text') continue;
        if (HEADING_TAGS.has(sib.tag)) break;
        if (sib.tag === 'ul' || sib.tag === 'ol') items.push(...listItems(sib));
        else if (sib.tag === 'p') { const l = lineOf(sib); if (l) items.push(l); }
        else if (sib.tag === 'div' || sib.tag === 'section') items.push(...listItems(sib));
        if (items.length > 100) break;
      }
      if (items.length) return items;
    }
  }
  return [];
}

function heuristicExtract(doc) {
  let ingLines = [];
  let stepLines = [];

  const ingContainer = pickContainer(doc, /ingredient/);
  if (ingContainer) ingLines = listItems(ingContainer);
  if (ingLines.length < 2) {
    const viaHeading = collectAfterHeading(doc, /^ingredients?\s*:?$/i);
    if (viaHeading.length > ingLines.length) ingLines = viaHeading;
  }

  const stepContainer = pickContainer(doc, /(instruction|direction|method|preparation|recipe-steps|recipe-step|steps)/);
  if (stepContainer) stepLines = listItems(stepContainer);
  if (stepLines.length < 2) {
    const viaHeading = collectAfterHeading(doc, /^(instructions?|directions?|method|preparation|steps?|how to make( it)?)\s*:?$/i);
    if (viaHeading.length > stepLines.length) stepLines = viaHeading;
  }

  return {
    ingredients: ingLines.slice(0, LIMITS.ingredients).map((l) => stripListMarker(cleanLine(l, LIMITS.ingredient))).filter(Boolean),
    steps: stepLines.slice(0, LIMITS.steps).map((l) => l.replace(/^(?:step\s*)?\d{1,2}\s*[.):\-–]\s+/i, '').trim()).filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Page-level metadata (Open Graph etc.)
// ---------------------------------------------------------------------------

function hostName(url) {
  try { return new URL(url).hostname.replace(/^www\./i, ''); } catch { return ''; }
}

function pageMeta(doc, baseUrl) {
  const siteName = cleanLine(metaContent(doc, 'og:site_name') || metaContent(doc, 'application-name'), 80);
  let title = cleanLine(metaContent(doc, 'og:title') || metaContent(doc, 'twitter:title'), LIMITS.title);
  if (!title) {
    const h1 = findAll(doc.root, (el) => el.tag === 'h1')[0];
    title = h1 ? cleanLine(lineOf(h1), LIMITS.title) : '';
  }
  if (!title) title = cleanLine(doc.title, LIMITS.title);
  // "Great Soup | Example Kitchen" -> "Great Soup"
  const parts = title.split(/\s+[|–—:·»-]\s+/);
  if (parts.length > 1) {
    const site = siteName.toLowerCase();
    const cleaned = parts.filter((p) => p.toLowerCase() !== site && p.toLowerCase() !== hostName(baseUrl).toLowerCase());
    if (cleaned.length && cleaned.length < parts.length) title = cleaned.join(' - ');
    else if (parts[0].length >= 8) title = parts[0];
  }
  const canonical = (doc.links.find((l) => /(^|\s)canonical(\s|$)/i.test(l.rel || '')) || {}).href || '';
  return {
    title,
    siteName,
    description: cleanLine(metaContent(doc, 'og:description') || metaContent(doc, 'description') || metaContent(doc, 'twitter:description'), LIMITS.description),
    image: absUrl(metaContent(doc, 'og:image') || metaContent(doc, 'og:image:url') || metaContent(doc, 'twitter:image') || ((doc.links.find((l) => /image_src/i.test(l.rel || '')) || {}).href || ''), baseUrl),
    author: cleanLine(metaContent(doc, 'author') || metaContent(doc, 'article:author'), LIMITS.author),
    ogType: (metaContent(doc, 'og:type') || '').toLowerCase(),
    canonicalUrl: absUrl(canonical, baseUrl),
    language: (doc.lang || '').slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const countSteps = (sections) => sections.reduce((n, s) => n + s.steps.length, 0);

/**
 * Extract a recipe draft from HTML.
 * Returns { status, method, recipe, missing[], warnings[], meta }.
 *   status: 'complete' | 'partial' | 'failed'
 *   method: 'json-ld' | 'microdata' | 'fallback' | 'none'
 */
export function extractRecipe(html, { url = '' } = {}) {
  const doc = parseHtml(html);
  const warnings = [];
  if (doc.truncated) warnings.push('The page was very large; some of it was skipped.');
  const page = pageMeta(doc, url);

  let draft = null;
  let method = 'none';

  const ld = findJsonLdRecipe(doc, url);
  if (ld) {
    draft = normalizeSchemaRecipe(ld.node, { idMap: ld.idMap, base: url });
    method = 'json-ld';
  }

  const hasBody = (d) => d && d.ingredients.length > 0 && countSteps(d.instructionSections) > 0;

  if (!hasBody(draft)) {
    const md = extractMicrodataRecipe(doc);
    if (md) {
      const mdDraft = normalizeSchemaRecipe(md, { idMap: null, base: url });
      if (!draft) { draft = mdDraft; method = 'microdata'; }
      else fillMissing(draft, mdDraft);
    }
  }

  if (!hasBody(draft)) {
    const fb = heuristicExtract(doc);
    if (fb.ingredients.length || fb.steps.length) {
      const fbDraft = {
        ingredients: normalizeIngredients(fb.ingredients, null),
        instructionSections: fb.steps.length ? [{ section: 'Main', steps: fb.steps.map((s) => cleanLine(s, LIMITS.step)).filter(Boolean) }] : [],
      };
      if (!draft) {
        draft = emptyDraft();
        method = 'fallback';
      }
      fillMissing(draft, fbDraft);
    }
  }

  if (!draft) draft = emptyDraft();

  // Fill gaps from page-level metadata (never overrides structured data).
  if (!draft.title) draft.title = page.title;
  if (!draft.image) draft.image = page.image;
  if (!draft.description) draft.description = page.description;
  if (!draft.author) draft.author = page.author;

  const sourceUrl = url || '';
  const recipe = {
    ...draft,
    sourceName: page.siteName || hostName(sourceUrl),
    sourceUrl,
  };

  const hasIng = recipe.ingredients.length > 0;
  const hasSteps = countSteps(recipe.instructionSections) > 0;
  const recipeish = method !== 'none' || /recipe/.test(page.ogType) || /recipe/i.test(`${page.title} ${sourceUrl}`);

  const missing = [];
  if (!recipe.title) missing.push('title');
  if (!recipe.image) missing.push('image');
  if (!hasIng) missing.push('ingredients');
  if (!hasSteps) missing.push('instructions');

  let status;
  if (recipe.title && hasIng && hasSteps) status = 'complete';
  else if (hasIng || hasSteps || recipeish) status = 'partial';
  else status = 'failed';

  return {
    status,
    method,
    recipe,
    missing,
    warnings,
    meta: { canonicalUrl: page.canonicalUrl, language: page.language, truncated: !!doc.truncated },
  };
}

function emptyDraft() {
  return {
    title: '', description: '', image: '', author: '', datePublished: '',
    prepTimeMinutes: null, cookTimeMinutes: null, totalTimeMinutes: null, servings: '',
    cuisine: [], categories: [], tags: [], ingredients: [], instructionSections: [],
    nutrition: null, sourceRating: null,
  };
}

/** Copy values from `extra` into `draft` only where draft has nothing. */
function fillMissing(draft, extra) {
  for (const [k, v] of Object.entries(extra)) {
    const cur = draft[k];
    const empty = cur == null || cur === '' || (Array.isArray(cur) && cur.length === 0);
    if (empty && v != null && !(Array.isArray(v) && v.length === 0) && v !== '') draft[k] = v;
  }
}
