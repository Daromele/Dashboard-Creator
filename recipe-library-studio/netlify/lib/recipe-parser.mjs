// ---------- recipe parser ----------
// Pure functions, no network. Turns a recipe page's HTML into the shape the app expects.
// Most recipe sites publish schema.org Recipe data as JSON-LD for search engines; that's the main source.
// Microdata (itemprop) and Open Graph tags are fallbacks, so a page without JSON-LD still gives a title,
// a photo and whatever ingredients and steps it marks up.

const MAX_LIST = 400;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', deg: '°', frac12: '½', frac14: '¼', frac34: '¾', times: '×', eacute: 'é', egrave: 'è', ntilde: 'ñ' };

export function decodeEntities(s) {
  return String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

// plain text: strip tags, decode entities (twice, for sites that double-encode), squeeze spaces
export function clean(s) {
  if (s == null) return '';
  if (typeof s === 'number') return String(s);
  if (typeof s !== 'string') return '';
  let t = s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ');
  t = decodeEntities(decodeEntities(t));
  return t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

const asArray = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
const typeOf = node => asArray(node?.['@type']).map(t => String(t).replace(/^.*[/#]/, ''));
const isType = (node, t) => typeOf(node).includes(t);

// ISO 8601 durations (PT1H30M, P0DT0H20M) and plain "1 hr 20 mins" into whole minutes
export function minutes(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v > 0 && v < 100000 ? Math.round(v) : null;
  const s = String(v).trim();
  const iso = s.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (iso && (iso[1] || iso[2] || iso[3] || iso[4])) {
    const m = (+iso[1] || 0) * 1440 + (+iso[2] || 0) * 60 + (+iso[3] || 0) + (+iso[4] || 0) / 60;
    return m > 0 && m < 100000 ? Math.round(m) : null;
  }
  let total = 0, found = false;
  for (const x of s.matchAll(/(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m)\b/gi)) {
    total += +x[1] * (/^d/i.test(x[2]) ? 1440 : /^h/i.test(x[2]) ? 60 : 1); found = true;
  }
  return found && total > 0 && total < 100000 ? Math.round(total) : null;
}

const imageUrl = (img, base) => {
  if (!img) return '';
  if (Array.isArray(img)) return imageUrl(img[0], base);
  const u = typeof img === 'string' ? img : img.url || img.contentUrl || img['@id'] || '';
  return absUrl(u, base);
};
export function absUrl(u, base) {
  u = decodeEntities(String(u || '').trim());
  if (!u || u.length > 2048) return '';
  try { const x = new URL(u, base); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch { return ''; }
}

function text(v) {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return clean(v);
  if (Array.isArray(v)) return text(v[0]);
  return clean(v.name || v.text || v['@value'] || '');
}
const list = v => [...new Set(asArray(v).flatMap(x => (typeof x === 'string' ? x.split(',') : [text(x)])).map(clean).filter(Boolean))].slice(0, 30);

// instructions come as a string, a list of strings, HowToStep objects, or HowToSection groups of steps
export function sections(v) {
  const out = [], main = { section: 'Main', steps: [] };
  const push = (sec, t) => { t = clean(t); if (t && sec.steps.length < MAX_LIST) sec.steps.push(t); };
  const walk = (node, sec) => {
    if (node == null) return;
    if (typeof node === 'string') {
      // one blob: split on line breaks or numbered steps
      const parts = node.replace(/<\/(p|li)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').split(/\n+|(?:^|\s)(?=\d+[.)]\s+[A-Z])/).map(clean).filter(Boolean);
      parts.forEach(p => push(sec, p.replace(/^\d+[.)]\s+/, '')));
      return;
    }
    if (Array.isArray(node)) { node.forEach(n => walk(n, sec)); return; }
    if (typeof node !== 'object') return;
    if (isType(node, 'HowToSection') || (node.itemListElement && !node.text)) {
      const s = { section: clean(node.name) || 'Main', steps: [] };
      walk(node.itemListElement || node.steps || [], s);
      if (s.steps.length) out.push(s);
      return;
    }
    if (node.itemListElement) { walk(node.itemListElement, sec); return; }
    push(sec, node.text || node.name || node.description || '');
  };
  walk(v, main);
  if (main.steps.length) out.unshift(main);
  return out.slice(0, 40);
}

function nutrition(n) {
  if (!n || typeof n !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(n)) {
    if (k.startsWith('@') || v == null || typeof v === 'object') continue;
    const name = k.replace(/Content$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    const val = clean(v);
    if (val && /\d/.test(val) && Object.keys(out).length < 20) out[name[0].toUpperCase() + name.slice(1)] = val;
  }
  return Object.keys(out).length ? out : null;
}

// every JSON-LD block on the page, parsed leniently (some sites leave raw newlines or trailing commas)
export function jsonLdBlocks(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    let raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '').replace(/^<!--|-->$/g, '').trim();
    if (!raw) continue;
    for (const attempt of [raw, raw.replace(/[\u0000-\u001f]+/g, ' '), raw.replace(/[\u0000-\u001f]+/g, ' ').replace(/,\s*([}\]])/g, '$1')]) {
      try { out.push(JSON.parse(attempt)); break; } catch { /* next attempt */ }
    }
  }
  return out;
}

export function findRecipe(blocks) {
  const seen = new Set(), queue = [...blocks];
  while (queue.length) {
    const n = queue.shift();
    if (!n || typeof n !== 'object' || seen.has(n)) continue;
    seen.add(n);
    if (Array.isArray(n)) { queue.push(...n); continue; }
    if (isType(n, 'Recipe')) return n;
    for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item', 'about', 'hasPart']) if (n[k]) queue.push(...asArray(n[k]));
  }
  return null;
}

const meta = (html, key) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`, 'i'), tag = html.match(re)?.[0];
  return tag ? clean(tag.match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i)?.slice(1).find(x => x != null) || '') : '';
};

// microdata fallback: itemprop="recipeIngredient" / "recipeInstructions" on ordinary elements
function microdata(html) {
  const grab = prop => [...html.matchAll(new RegExp(`<([a-z0-9]+)[^>]*itemprop\\s*=\\s*["'][^"']*\\b${prop}\\b[^"']*["'][^>]*>([\\s\\S]*?)</\\1>`, 'gi'))].map(m => clean(m[2])).filter(Boolean);
  const metaProp = prop => [...html.matchAll(new RegExp(`<meta[^>]*itemprop\\s*=\\s*["']${prop}["'][^>]*>`, 'gi'))].map(m => clean(m[0].match(/content\s*=\s*["']([^"']*)["']/i)?.[1] || ''));
  const ingredients = [...grab('recipeIngredient'), ...grab('ingredients')];
  const steps = grab('recipeInstructions');
  if (!ingredients.length && !steps.length) return null;
  return { '@type': 'Recipe', name: grab('name')[0], recipeIngredient: ingredients, recipeInstructions: steps,
    recipeYield: grab('recipeYield')[0] || metaProp('recipeYield')[0], prepTime: metaProp('prepTime')[0], cookTime: metaProp('cookTime')[0], totalTime: metaProp('totalTime')[0] };
}

export function parseRecipeHtml(html, pageUrl) {
  html = String(html || '');
  const base = pageUrl || undefined;
  const r = findRecipe(jsonLdBlocks(html)) || microdata(html);
  const ogTitle = meta(html, 'og:title') || clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const ogImage = absUrl(meta(html, 'og:image') || meta(html, 'twitter:image'), base);
  const siteName = meta(html, 'og:site_name');
  const host = (() => { try { return new URL(pageUrl).hostname.replace(/^www\./, ''); } catch { return ''; } })();
  if (!r) return { found: false, title: ogTitle, imageURLs: ogImage ? [ogImage] : [], sourceName: siteName || host, description: meta(html, 'og:description') || meta(html, 'description') };

  const images = [...new Set([...asArray(r.image).map(i => imageUrl(i, base)), ogImage].filter(Boolean))].slice(0, 12);
  const ingredients = asArray(r.recipeIngredient || r.ingredients).flatMap(x => (typeof x === 'string' ? [x] : [text(x)])).map(clean).filter(Boolean).slice(0, MAX_LIST);
  const yieldText = asArray(r.recipeYield).map(text).filter(Boolean).sort((a, b) => b.length - a.length)[0] || '';
  const authors = asArray(r.author).map(text).filter(Boolean);
  const rating = r.aggregateRating && typeof r.aggregateRating === 'object'
    ? { value: clean(r.aggregateRating.ratingValue), count: clean(r.aggregateRating.ratingCount || r.aggregateRating.reviewCount) } : null;
  const prep = minutes(r.prepTime), cook = minutes(r.cookTime);
  return {
    found: true,
    title: (text(r.name) || ogTitle || 'Imported recipe').slice(0, 200),
    description: clean(r.description).slice(0, 5000),
    author: authors.join(', ').slice(0, 200),
    sourceName: (siteName || text(r.publisher) || host).slice(0, 200),
    prepTimeMinutes: prep,
    cookTimeMinutes: cook,
    totalTimeMinutes: minutes(r.totalTime) ?? (prep || cook ? (prep || 0) + (cook || 0) : null),
    servings: /^\d+(\.\d+)?$/.test(yieldText) ? yieldText : yieldText.slice(0, 100),
    categories: list(r.recipeCategory),
    cuisine: list(r.recipeCuisine),
    tags: list(r.keywords).slice(0, 15),
    ingredients,
    instructionSections: sections(r.recipeInstructions),
    nutrition: nutrition(r.nutrition),
    nutritionBasis: clean(r.nutrition?.servingSize) ? 'Per ' + clean(r.nutrition.servingSize) : '',
    imageURLs: images,
    sourceRating: rating && rating.value ? rating : null,
  };
}
