// Link reader and book-logic checks. Run: node --test test/books.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseBookPage, isIsbn13, isIsbn10, toIsbn13 } from '../netlify/lib/book-page.mjs';
import handler, { resolveLink } from '../netlify/functions/resolve-book-link.mjs';
import googleBooks, { target } from '../netlify/functions/google-books.mjs';

const fx = n => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
// the app's pure logic (CONFIG, helpers, ISBN, Logic) runs here without a browser
const html = readFileSync(new URL('../src/app.html', import.meta.url), 'utf8');
const src = html.slice(html.indexOf('const CONFIG='), html.indexOf('/* ---------- state + storage keys'));
const app = vm.createContext({ crypto: globalThis.crypto, URL, console });
vm.runInContext(src + ';globalThis.out={Logic,ISBN,CONFIG,today};', app);
const { Logic, ISBN, today } = app.out;
const plain = v => JSON.parse(JSON.stringify(v));

test('ISBN check digits and conversion', () => {
  assert.equal(isIsbn13('978-0-593-13520-4'), true);
  assert.equal(isIsbn13('9780593135205'), false);
  assert.equal(isIsbn10('0593135202'), true);
  assert.equal(isIsbn10('080442957X'), true);
  assert.equal(toIsbn13('0593135202'), '9780593135204');
  assert.equal(toIsbn13('12345'), '');
  assert.equal(ISBN.to13('ISBN 0-593-13520-2'), '9780593135204');
});

test('a bookshop page: JSON-LD ISBN wins over other numbers on the page', () => {
  const b = parseBookPage(fx('book-page.html'), 'https://shop.example/circe');
  assert.equal(b.isbn, '9780316556347');
  assert.equal(b.title, 'Circe');
  assert.equal(b.author, 'Madeline Miller');
  assert.equal(b.pages, 393);
  assert.equal(b.image, 'https://shop.example/img/circe.jpg');
});

test('a page with several printed ISBNs and no book data gives no ISBN', () => {
  const b = parseBookPage('<title>List</title><p>9780593135204 and 9780441172719</p>', 'https://x.example/');
  assert.equal(b.isbn, '');
  assert.equal(b.title, 'List');
});

test('Amazon pages (any country): ISBN from the details, else title and author; refusals give back the address', async () => {
  const page = html => async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } });
  const kindle = await resolveLink('https://www.amazon.es/dp/B0CNVR8ZX8/ref=sspa_dk_detail_4?psc=1', { allowPrivate: true, fetchImpl: page(fx('amazon-es.html')) });
  assert.equal(kindle.isbn, ''); assert.equal(kindle.title, 'Alas de sangre (Empíreo 1)'); assert.equal(kindle.author, 'Rebecca Yarros');
  assert.equal(kindle.image, 'https://m.media-amazon.com/images/I/81x.jpg');
  const print = await resolveLink('https://www.amazon.es/dp/B0XXXXXXXX', { allowPrivate: true, fetchImpl: page(fx('amazon-print.html')) });
  assert.equal(print.isbn, '9788466671811'); assert.equal(print.title, 'Proyecto Hail Mary');
  const captcha = await resolveLink('https://www.amazon.com/dp/B08FHBV4ZX', { allowPrivate: true, fetchImpl: page('<form action="/errors/validateCaptcha"></form>') });
  assert.equal(captcha.stopped, true);
  const refused = await resolveLink('https://www.amazon.de/dp/B08FHBV4ZX', { allowPrivate: true, fetchImpl: async () => new Response('', { status: 503 }) });
  assert.deepEqual(refused, { url: 'https://www.amazon.de/dp/B08FHBV4ZX', stopped: true });
  // a short link that lands on a refusing Amazon page still gives back Amazon's address
  const short = await resolveLink('https://a.co/d/abc123', { allowPrivate: true, fetchImpl: async u => u.includes('a.co') ? new Response('', { status: 301, headers: { location: 'https://www.amazon.com/dp/B08FHBV4ZX' } }) : new Response('', { status: 503 }) });
  assert.deepEqual(short, { url: 'https://www.amazon.com/dp/B08FHBV4ZX', stopped: true });
});

test('the link reader reads a page for its book', async () => {
  const fetchImpl = async () => new Response(fx('book-page.html'), { status: 200, headers: { 'content-type': 'text/html' } });
  const r = await resolveLink('https://shop.example/circe', { allowPrivate: true, fetchImpl });
  assert.equal(r.isbn, '9780316556347');
  assert.equal(r.found, true);
});

test('the function answers POST only, and explains bad links', async () => {
  assert.equal((await handler(new Request('http://x/', { method: 'GET' }), {})).status, 405);
  const bad = await handler(new Request('http://x/', { method: 'POST', body: JSON.stringify({ url: 'ftp://nope' }) }), { ip: 't1' });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).code, 'BAD_URL');
  const local = await handler(new Request('http://x/', { method: 'POST', body: JSON.stringify({ url: 'http://localhost/secret' }) }), { ip: 't2' });
  assert.equal((await local.json()).code, 'BAD_URL');
});

test('what you typed: ISBN, link or title', () => {
  assert.deepEqual(plain(Logic.readInput('978-0-593-13520-4')), { kind: 'isbn', isbn: '9780593135204' });
  assert.equal(Logic.readInput('9780593135205').kind, 'bad');
  assert.deepEqual(plain(Logic.readInput('project hail mary')), { kind: 'title', q: 'project hail mary' });
  assert.equal(Logic.readInput('bookshop.org/p/books/x/1?ean=9780441172719').isbn, '9780441172719');
});

test('book numbers and titles from links', () => {
  const L = u => plain(Logic.fromLink(u));
  assert.deepEqual(L('https://www.amazon.com/Project-Hail-Mary-Novel/dp/0593135202/ref=sr_1_1'), { isbn: '9780593135204' });
  assert.deepEqual(L('https://www.amazon.co.uk/gp/product/0593135202'), { isbn: '9780593135204' });
  assert.deepEqual(L('https://www.amazon.com/Project-Hail-Mary-Novel-ebook/dp/B08FHBV4ZX'), { asin: 'B08FHBV4ZX', q: 'Project Hail Mary' });
  assert.deepEqual(L('https://www.amazon.es/dp/B0CNVR8ZX8/ref=sspa_dk_detail_4?psc=1&pd_rd_i=B0CNVR8ZX8'), { asin: 'B0CNVR8ZX8', q: '' });
  assert.deepEqual(L('https://www.amazon.es/Proyecto-Hail-Mary-Andy-Weir/dp/8466671815'), { asin: '8466671815', q: 'Proyecto Hail Mary Andy Weir' });
  assert.deepEqual(L('https://www.barnesandnoble.com/w/dune-frank-herbert/1100154406?ean=9780441172719'), { isbn: '9780441172719' });
  assert.deepEqual(L('https://www.waterstones.com/book/circe/madeline-miller/9781526622587'), { isbn: '9781526622587' });
  assert.deepEqual(L('https://openlibrary.org/works/OL20651256W/The_Midnight_Library'), { olKey: '/works/OL20651256W' });
  assert.deepEqual(L('https://books.google.com/books?id=abcDEF123456'), { gbId: 'abcDEF123456' });
  assert.deepEqual(L('https://www.goodreads.com/book/show/54493401-project-hail-mary'), { q: 'project hail mary' });
  assert.deepEqual(L('https://www.goodreads.com/book/show/11.The_Hitchhiker_s_Guide'), { q: 'The Hitchhiker s Guide' });
  assert.deepEqual(L('https://app.thestorygraph.com/books/0a1b2c'), {});
});

test('catalog subjects become a few plain genres', () => {
  assert.deepEqual(plain(Logic.genres(['Fiction, science fiction, general', 'Mars (Planet)', 'Survival'])), ['Science fiction']);
  assert.deepEqual(plain(Logic.genres(['Fiction', 'Libraries'])), ['Fiction']);
  assert.deepEqual(plain(Logic.genres([{ name: 'Biography & Autobiography' }, { name: 'History' }])), ['Memoir', 'Biography', 'History']);
});

test('catalog descriptions lose their markup', () => {
  const d = Logic.cleanDesc('A survivor wakes up. ([source][1])\r\n\r\n----------\r\n**Contains**\r\n - [X][2]\r\n\r\n  [1]: https://e.x');
  assert.equal(d, 'A survivor wakes up.');
  assert.equal(Logic.cleanDesc('<p>One</p><p>Two &amp; three</p>'), 'One\n\nTwo & three');
});

test('Goodreads export: series, ISBN, dates, shelves, review', () => {
  const rows = Logic.fromCSV(fx('goodreads.csv'));
  assert.equal(rows.length, 4);
  const lw = rows[0];
  assert.equal(lw.title, 'Leviathan Wakes'); assert.equal(lw.series, 'The Expanse'); assert.equal(lw.seriesNo, '1');
  assert.equal(lw.isbn, '9780316129084'); assert.equal(lw.status, 'read'); assert.equal(lw.rating, 4);
  assert.deepEqual(plain(lw.reads), [{ start: '', end: '2024-03-12', dnf: false }]);
  assert.deepEqual(plain(lw.shelfNames), ['book-club', 'sci-fi']); assert.equal(lw.owned, true); assert.match(lw.notes, /loved Holden/);
  assert.equal(rows[1].status, 'reading'); assert.equal(rows[1].reads[0].start, '2025-05-01'); assert.equal(rows[1].isbn, '');
  assert.equal(rows[2].title, 'Educated'); assert.equal(rows[2].subtitle, 'A Memoir'); assert.equal(rows[2].format, 'Ebook'); assert.equal(rows[2].status, 'want');
});

test('StoryGraph export: half stars round, did-not-finish', () => {
  const rows = Logic.fromCSV(fx('storygraph.csv'));
  assert.equal(rows[0].rating, 5); assert.deepEqual(plain(rows[0].tags), ['mythology', 'comfort']); assert.equal(rows[0].reads[0].end, '2025-02-20');
  assert.equal(rows[1].status, 'dnf');
  assert.throws(() => Logic.fromCSV('a,b\n1,2'), /Goodreads or StoryGraph/);
});

test('status changes keep the reading history right', () => {
  const b = Logic.book({ title: 'T', pages: 200 });
  Logic.setStatus(b, 'reading', { date: '2026-01-02' });
  assert.deepEqual(plain(b.reads), [{ start: '2026-01-02', end: '', dnf: false }]);
  Logic.setStatus(b, 'read', { date: '2026-01-20' });
  assert.deepEqual(plain(b.reads), [{ start: '2026-01-02', end: '2026-01-20', dnf: false }]); assert.equal(b.progress, 200);
  Logic.setStatus(b, 'reading', { date: '2026-03-01' }); assert.equal(b.reads.length, 2); assert.equal(b.progress, 0);
  Logic.setStatus(b, 'dnf', { date: '2026-03-05' }); assert.equal(b.reads[1].dnf, true);
  assert.equal(Logic.finished(b).length, 1);
  const c = Logic.book({ title: 'U' }); Logic.setStatus(c, 'read', { date: '' }); assert.equal(c.status, 'read'); assert.equal(c.reads.length, 0);
  const s = { books: [b] }; assert.equal(Logic.yearStats(s, '2026').fin.length, 1); assert.equal(Logic.yearStats(s, '2026').dnf, 1);
});

test('restore merge: same ISBN or same title and author is one book', () => {
  const a = Logic.validate({ books: [{ id: 'a', title: 'Dune', authors: ['Frank Herbert'], isbn: '9780441172719', reads: [{ start: '', end: '2024-01-01' }], updatedAt: '2026-01-01' }], shelves: [] });
  const b = Logic.validate({ books: [{ id: 'z', title: 'Dune', authors: ['Frank Herbert'], isbn: '0441172717', reads: [{ start: '', end: '2025-06-01' }], quotes: [{ text: 'Fear is the mind-killer.' }], updatedAt: '2025-01-01' },
    { id: 'y', title: 'Circe', authors: ['Madeline Miller'], updatedAt: '2025-01-01' }], shelves: [], settings: { goals: { 2025: 20 } } });
  const m = Logic.merge(a, b);
  assert.deepEqual(plain(m.stats), { added: 1, updated: 1, same: 0 });
  const dune = m.state.books.find(x => x.title === 'Dune');
  assert.equal(dune.reads.length, 2); assert.equal(dune.quotes.length, 1); assert.equal(m.state.settings.goals[2025], 20);
  assert.equal(Logic.merge(m.state, m.state).stats.same, 2);
});

test('validate keeps only clean data', () => {
  const s = Logic.validate({ books: [{ id: 'x', title: 'T', status: 'nope', rating: 9, isbn: 'abc', cover: 'javascript:alert(1)', reads: [{}, { end: '2026-02-30x' }, { start: '2026-01-01' }] }], shelves: [], settings: { theme: 'zzz', goals: { 2026: -1, 2025: 12 } } });
  const b = s.books[0];
  assert.equal(b.status, 'want'); assert.equal(b.rating, 5); assert.equal(b.isbn, ''); assert.equal(b.cover, ''); assert.equal(b.reads.length, 1);
  assert.equal(s.settings.theme, 'fjord'); assert.deepEqual(plain(s.settings.goals), { 2025: 12 });
  assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});

test('google-books function: only Books lookups, key added on the server, answers cached, never echoes Google errors', async () => {
  assert.equal(target(new URLSearchParams('q=isbn:9780593135204&maxResults=50')), 'https://www.googleapis.com/books/v1/volumes?q=isbn%3A9780593135204&maxResults=10&printType=books');
  assert.equal(target(new URLSearchParams('id=abcDEF123456')), 'https://www.googleapis.com/books/v1/volumes/abcDEF123456');
  assert.equal(target(new URLSearchParams('id=../../oauth2')), '');
  assert.equal(target(new URLSearchParams('')), '');
  const call = (qs, ip = 'g1') => googleBooks(new Request('http://x/.netlify/functions/google-books?' + qs), { ip });
  delete process.env.GOOGLE_BOOKS_KEY;
  assert.equal((await (await call('q=dune')).json()).code, 'NO_KEY');
  process.env.GOOGLE_BOOKS_KEY = 'test-key-123'; const real = globalThis.fetch, seen = [];
  globalThis.fetch = async u => { seen.push(u); return u.includes('q=fail') ? new Response('{"error":{"message":"API key test-key-123 invalid"}}', { status: 400 }) : new Response('{"totalItems":1}', { status: 200 }); };
  try {
    const r = await call('q=dune');
    assert.equal(r.status, 200); assert.deepEqual(await r.json(), { totalItems: 1 });
    assert.match(seen[0], /^https:\/\/www\.googleapis\.com\/books\/v1\/volumes\?q=dune&maxResults=8&printType=books&key=test-key-123$/);
    await call('q=dune'); assert.equal(seen.length, 1, 'second lookup comes from the cache');
    const bad = await call('q=fail'); assert.equal(bad.status, 502); assert.doesNotMatch(await bad.text(), /test-key/);
    let last; for (let i = 0; i < 32; i++) last = await call('q=book' + i, 'busy-ip');
    assert.equal(last.status, 429);
    assert.equal((await googleBooks(new Request('http://x/', { method: 'POST' }), {})).status, 405);
  } finally { globalThis.fetch = real; delete process.env.GOOGLE_BOOKS_KEY; }
});
