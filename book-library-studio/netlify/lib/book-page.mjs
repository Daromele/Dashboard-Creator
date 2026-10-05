// Reads a book out of a web page: ISBN, title, author, cover. No DOM, no dependencies.
// Order: schema.org Book data (JSON-LD), then book meta tags, then Open Graph, then an ISBN printed in the page.

// ---------- ISBNs ----------
const digits = s => String(s || '').toUpperCase().replace(/[^0-9X]/g, '');
export function isIsbn13(s) { const d = digits(s); if (!/^97[89]\d{10}$/.test(d)) return false; let t = 0; for (let i = 0; i < 12; i++) t += +d[i] * (i % 2 ? 3 : 1); return (10 - t % 10) % 10 === +d[12]; }
export function isIsbn10(s) { const d = digits(s); if (!/^\d{9}[\dX]$/.test(d)) return false; let t = 0; for (let i = 0; i < 10; i++) t += (d[i] === 'X' ? 10 : +d[i]) * (10 - i); return t % 11 === 0; }
export function toIsbn13(s) {
  const d = digits(s); if (isIsbn13(d)) return d; if (!isIsbn10(d)) return '';
  const core = '978' + d.slice(0, 9); let t = 0; for (let i = 0; i < 12; i++) t += +core[i] * (i % 2 ? 3 : 1); return core + ((10 - t % 10) % 10);
}

const decode = s => String(s ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const clean = s => decode(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const metaAll = (html, key) => [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]).filter(t => new RegExp(`(?:property|name|itemprop)\\s*=\\s*["']${key.replace(/[.:]/g, '\\$&')}["']`, 'i').test(t))
  .map(t => (t.match(/content\s*=\s*"([^"]*)"/i) || t.match(/content\s*=\s*'([^']*)'/i) || [])[1]).filter(Boolean).map(decode);
const meta = (html, key) => metaAll(html, key)[0] || '';

function jsonLdBooks(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data; try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const walk = n => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(walk);
      const t = [].concat(n['@type'] || []).map(String); if (t.some(x => /^(Book|BookSeries)$/i.test(x)) || n.isbn) out.push(n);
      if (n['@graph']) walk(n['@graph']); if (n.workExample) walk(n.workExample); if (n.mainEntity) walk(n.mainEntity); };
    walk(data);
  }
  return out;
}
const names = v => [].concat(v || []).map(a => typeof a === 'string' ? a : a?.name).map(clean).filter(Boolean);

export function parseBookPage(html, pageUrl = '') {
  const books = jsonLdBooks(html), b = books.find(x => x.isbn) || books[0] || {};
  const ex = [].concat(b.workExample || []).find(x => x?.isbn) || {};
  let isbn = toIsbn13(b.isbn || ex.isbn || meta(html, 'books:isbn') || meta(html, 'book:isbn') || meta(html, 'isbn') || '');
  if (!isbn) { // an ISBN printed in the page counts only when it is the only one (lists and "you may also like" carry many)
    const found = new Set([...html.matchAll(/\b97[89][-\s]?\d(?:[-\s]?\d){8}[-\s]?\d\b/g)].map(m => toIsbn13(m[0])).filter(Boolean));
    if (found.size === 1) isbn = [...found][0];
  }
  const title = clean(b.name || meta(html, 'og:title') || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s*[|–—-]\s*[^|–—-]{2,40}$/, '').slice(0, 200);
  const authors = names(b.author || ex.author);
  const author = authors[0] || meta(html, 'books:author') || meta(html, 'book:author') || '';
  let image = [].concat(b.image || [])[0]; image = typeof image === 'object' ? image?.url : image; image = image || meta(html, 'og:image');
  try { image = image ? new URL(image, pageUrl).href : ''; } catch { image = ''; }
  return { isbn, title, author: /^https?:/.test(author) ? '' : clean(author), authors, image, pages: +(b.numberOfPages || ex.numberOfPages) || null, found: !!(isbn || books.length) };
}
