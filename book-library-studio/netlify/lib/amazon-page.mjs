// Reads a book out of an Amazon product page (any country): the ISBN-13 from the details, else the title and author.
// Kindle pages usually link the print edition's ISBN in their "other formats" list or carry none; the title is enough to search.
import { isIsbn13, toIsbn13 } from './book-page.mjs';
const decode = s => String(s ?? '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const clean = s => decode(String(s ?? '').replace(/<[^>]*>/g, ' ')).replace(/[‎‏]/g, '').replace(/\s+/g, ' ').trim();
export function parseAmazon(html) {
  if (/validateCaptcha|captcha|robot check|api-services-support@amazon/i.test(html) && !/id="productTitle"/.test(html)) return { blocked: true };
  // the details list: "ISBN-13 : 978-8401…" (every language writes ISBN-13 the same way)
  let isbn = '';
  const m = html.match(/ISBN-13[\s\S]{0,300}?(97[89][\d\s-]{10,16})/i);
  if (m && isIsbn13(m[1])) isbn = m[1].replace(/\D/g, '');
  if (!isbn) { const t = html.match(/ISBN-10[\s\S]{0,300}?\b(\d{9}[\dX])\b/i); if (t) isbn = toIsbn13(t[1]); }
  let title = clean((html.match(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] || (html.match(/id="ebooksProductTitle"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]);
  if (!title) { // <title>Amazon.es: Title : Author: Libros</title> or <title>Title eBook : Author : Kindle Store</title>
    const t = clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).replace(/^Amazon\.[a-z.]+\s*:\s*/i, '');
    title = t.split(/\s+:\s+/)[0] || '';
  }
  title = title.replace(/\s*\((?:Spanish|English|French|German|Italian) Edition\)\s*$/i, '').replace(/\s*(?:Kindle Edition|Edición Kindle|eBook)\s*$/i, '').trim();
  const author = clean((html.match(/class="author[^"]*"[\s\S]{0,400}?<a[^>]*>([\s\S]*?)<\/a>/i) || [])[1]);
  const image = decode((html.match(/id="(?:landingImage|imgBlkFront|ebooksImgBlkFront)"[^>]*?(?:data-old-hires|src)="(https:[^"]+)"/i) || [])[1] || '');
  return { isbn, title: /^amazon/i.test(title) ? '' : title.slice(0, 200), author, image, found: !!(isbn || title) };
}
