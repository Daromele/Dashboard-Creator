/**
 * html.js — a tiny, tolerant, dependency-free HTML parser.
 *
 * It is NOT a spec-compliant parser; it builds just enough of a tree to locate
 * JSON-LD, <meta> tags and recipe containers on real-world pages. Important
 * safety properties:
 *   - nothing is ever executed or evaluated
 *   - <script>/<style> bodies are discarded (except application/ld+json, which
 *     is captured as inert text for JSON parsing)
 *   - node count and depth are capped so hostile pages can't exhaust memory
 */

const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param',
  'source', 'track', 'wbr',
]);
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title', 'noscript']);
const INLINE_JOIN = new Set(['a', 'b', 'i', 'em', 'strong', 'u', 'sup', 'sub', 'small', 'abbr', 'mark']);
const SKIP_TEXT = new Set(['script', 'style', 'noscript', 'template', 'svg']);
const BLOCKISH = new Set([
  'p', 'div', 'li', 'ul', 'ol', 'br', 'tr', 'td', 'th', 'table', 'section', 'article',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dd', 'dt', 'dl', 'header', 'footer', 'blockquote', 'pre', 'hr',
]);

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', deg: '°', frac12: '½', frac14: '¼', frac34: '¾', frac13: '⅓', frac23: '⅔',
  frac18: '⅛', frac38: '⅜', frac58: '⅝', frac78: '⅞', rsquo: '’', lsquo: '‘', rdquo: '”',
  ldquo: '“', eacute: 'é', egrave: 'è', agrave: 'à', aacute: 'á', ccedil: 'ç', ntilde: 'ñ',
  ouml: 'ö', uuml: 'ü', auml: 'ä', iacute: 'í', oacute: 'ó', uacute: 'ú', ecirc: 'ê',
  times: '×', trade: '™', reg: '®', copy: '©', bull: '•', middot: '·', shy: '', ensp: ' ', emsp: ' ',
  thinsp: ' ', laquo: '«', raquo: '»', plusmn: '±', micro: 'µ', euro: '€', pound: '£',
};

/** Decode HTML entities (named subset + numeric). Unknown entities stay as-is. */
export function decodeEntities(s) {
  if (!s || s.indexOf('&') === -1) return s || '';
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!code || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '';
      try { return String.fromCodePoint(code); } catch { return ''; }
    }
    const v = ENTITIES[e] ?? ENTITIES[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}

function makeEl(tag, attrs, parent) {
  return { tag, attrs, children: [], parent, text: null };
}

const START_TAG = /<([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/y;
const END_TAG = /<\/([a-zA-Z][a-zA-Z0-9:-]*)[^>]*>/y;
const ATTR = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttrs(text) {
  const attrs = {};
  if (!text) return attrs;
  ATTR.lastIndex = 0;
  let m;
  let count = 0;
  while ((m = ATTR.exec(text)) && count++ < 60) {
    const name = m[1].toLowerCase();
    if (name in attrs) continue;
    attrs[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

/**
 * Parse HTML into { root, jsonLd[], metas[], links[], title, lang }.
 * `root` is a synthetic element; text nodes are { tag: '#text', text }.
 */
export function parseHtml(html, { maxNodes = 120000, maxDepth = 256 } = {}) {
  const src = String(html || '');
  const lower = src.toLowerCase();
  const root = makeEl('#root', {}, null);
  const doc = { root, jsonLd: [], metas: [], links: [], title: '', lang: '', truncated: false };
  const stack = [root];
  let nodes = 0;
  let i = 0;
  const n = src.length;

  const top = () => stack[stack.length - 1];
  const addText = (t) => {
    if (!t) return;
    const p = top();
    p.children.push({ tag: '#text', text: t, children: [], parent: p, attrs: {} });
    nodes++;
  };
  const closeTo = (tag) => {
    for (let k = stack.length - 1; k > 0; k--) {
      if (stack[k].tag === tag) { stack.length = k; return true; }
    }
    return false;
  };

  while (i < n) {
    if (nodes > maxNodes) { doc.truncated = true; break; }
    const lt = src.indexOf('<', i);
    if (lt === -1) { addText(src.slice(i)); break; }
    if (lt > i) addText(src.slice(i, lt));

    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', lt)) {
      const end = src.indexOf(']]>', lt + 9);
      i = end === -1 ? n : end + 3;
      continue;
    }
    const next = src[lt + 1];
    if (next === '!' || next === '?') {
      const end = src.indexOf('>', lt + 2);
      i = end === -1 ? n : end + 1;
      continue;
    }
    if (next === '/') {
      END_TAG.lastIndex = lt;
      const m = END_TAG.exec(src);
      if (!m) { addText('<'); i = lt + 1; continue; }
      closeTo(m[1].toLowerCase());
      i = lt + m[0].length;
      continue;
    }
    START_TAG.lastIndex = lt;
    const m = START_TAG.exec(src);
    if (!m) { addText('<'); i = lt + 1; continue; }

    const tag = m[1].toLowerCase();
    let attrText = m[2] || '';
    const selfClose = /\/\s*$/.test(attrText);
    if (selfClose) attrText = attrText.replace(/\/\s*$/, '');
    const attrs = parseAttrs(attrText);
    i = lt + m[0].length;

    // Implied end tags for the few cases that matter for lists/paragraphs.
    if (tag === 'li') {
      for (let k = stack.length - 1; k > 0; k--) {
        const t = stack[k].tag;
        if (t === 'li') { stack.length = k; break; }
        if (t === 'ul' || t === 'ol') break;
      }
    } else if (tag === 'p' || tag === 'dt' || tag === 'dd') {
      if (top().tag === tag) stack.pop();
    }

    if (RAW_TEXT.has(tag) && !selfClose) {
      const closeIdx = lower.indexOf(`</${tag}`, i);
      const body = src.slice(i, closeIdx === -1 ? n : closeIdx);
      const gt = closeIdx === -1 ? n : src.indexOf('>', closeIdx);
      i = gt === -1 ? n : gt + 1;
      if (tag === 'script') {
        const type = (attrs.type || '').toLowerCase();
        if (type.includes('ld+json') && body.length < 2_000_000) doc.jsonLd.push(body);
      } else if (tag === 'title') {
        if (!doc.title) doc.title = decodeEntities(body).replace(/\s+/g, ' ').trim();
      }
      // style/textarea/noscript bodies are dropped on purpose
      continue;
    }

    if (tag === 'meta') doc.metas.push(attrs);
    else if (tag === 'link') doc.links.push(attrs);
    else if (tag === 'html' && attrs.lang) doc.lang = attrs.lang;

    if (tag === 'html' || tag === 'head' || tag === 'body') {
      // Don't nest structural tags; keep a flat, predictable tree.
      if (stack.some((e) => e.tag === tag)) continue;
    }

    const el = makeEl(tag, attrs, top());
    top().children.push(el);
    nodes++;
    if (!VOID.has(tag) && !selfClose && stack.length < maxDepth) stack.push(el);
  }
  return doc;
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

/** Depth-first walk (iterative). Return false from fn to skip that subtree. */
export function walk(node, fn) {
  const stack = [node];
  while (stack.length) {
    const cur = stack.pop();
    if (fn(cur) === false) continue;
    for (let k = cur.children.length - 1; k >= 0; k--) stack.push(cur.children[k]);
  }
}

export function findAll(node, pred) {
  const out = [];
  walk(node, (el) => {
    if (el.tag !== '#text' && pred(el)) out.push(el);
  });
  return out;
}

export function classAndId(el) {
  return `${el.attrs.class || ''} ${el.attrs.id || ''}`.toLowerCase();
}

/** Visible text of an element with sensible spacing, entities decoded. */
export function textOf(node) {
  const parts = [];
  const visit = (el) => {
    if (el.tag === '#text') { parts.push(decodeEntities(el.text)); return; }
    if (SKIP_TEXT.has(el.tag)) return;
    const block = BLOCKISH.has(el.tag);
    const sep = block || !INLINE_JOIN.has(el.tag);
    if (el.tag === 'br') { parts.push('\n'); return; }
    if (sep) parts.push(block ? '\n' : ' ');
    for (const c of el.children) visit(c);
    if (sep) parts.push(block ? '\n' : ' ');
  };
  visit(node);
  return parts.join('');
}

/** textOf() collapsed to a single clean line. */
export function lineOf(node) {
  return textOf(node)
    .replace(/[\s ]+/g, ' ')
    .replace(/\s+([,.;:!?)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .trim();
}

export function nextSiblings(el) {
  const p = el.parent;
  if (!p) return [];
  const idx = p.children.indexOf(el);
  return p.children.slice(idx + 1);
}

/** Get a <meta> value by property/name (case-insensitive). */
export function metaContent(doc, key) {
  const k = key.toLowerCase();
  for (const m of doc.metas) {
    const name = (m.property || m.name || m.itemprop || '').toLowerCase();
    if (name === k && m.content) return decodeEntities(m.content).trim();
  }
  return '';
}
