// A stand-in for Open Library and Google Books, so the browser tests never depend on the real catalogs.
// Playwright sends every request for those hosts here; anything not listed answers like the real thing does
// for an unknown book (an empty result, or a 404 for a cover).
import { readFileSync } from 'node:fs';
const PNG = readFileSync(new URL('../site/icons/icon-192.png', import.meta.url));
const ed = (isbn, title, author, pages, year, key, cover, subjects = []) => ({ [`ISBN:${isbn}`]: {
  url: `https://openlibrary.org${key}`, key, title, authors: [{ name: author }], number_of_pages: pages, publish_date: year, publishers: [{ name: 'Test House' }],
  subjects: subjects.map(name => ({ name })), cover: cover ? { medium: `https://covers.openlibrary.org/b/id/${cover}-M.jpg`, large: `https://covers.openlibrary.org/b/id/${cover}-L.jpg` } : undefined } });
const BOOKS = {
  ...ed('9780593135204', 'Project Hail Mary', 'Andy Weir', 476, 'May 4, 2021', '/books/OL1M', 101, ['Fiction, science fiction, general', 'Space flight', 'Survival']),
  ...ed('9780441172719', 'Dune', 'Frank Herbert', 617, '1990', '/books/OL2M', 102, ['Science Fiction', 'Dune (Imaginary place)']),
  ...ed('9780316556347', 'Circe', 'Madeline Miller', 393, '2018', '/books/OL3M', 0, ['Greek mythology', 'Fantasy fiction']),
};
const EDITIONS = { OL1M: { works: [{ key: '/works/OL1W' }], isbn_13: ['9780593135204'] }, OL9M: { isbn_13: ['9780525559474'], number_of_pages: 304, publishers: ['Viking'], works: [{ key: '/works/OL9W' }] } };
const WORKS = {
  OL1W: { description: { type: '/type/text', value: 'Ryland Grace is the sole survivor on a desperate, last-chance mission. ([source][1])\r\n\r\n----------\r\n**Contains**\r\n - [Project Hail Mary][2]\r\n\r\n  [1]: https://example.com\r\n  [2]: https://example.com/2' }, subjects: ['Science fiction'] },
  OL9W: { description: 'Between life and death there is a library, and within that library, the shelves go on forever.', subjects: ['Fiction', 'Fantasy fiction'] },
};
const SEARCH = {
  midnight: [{ key: '/works/OL9W', title: 'The Midnight Library', author_name: ['Matt Haig'], first_publish_year: 2020, cover_i: 109, cover_edition_key: 'OL9M', number_of_pages_median: 304, subject: ['Fiction', 'Fantasy fiction', 'Libraries'] },
    { key: '/works/OL10W', title: 'Midnight Library Mysteries', author_name: ['Someone Else'], first_publish_year: 2011, subject: ['Mystery fiction'] }],
  hail: [{ key: '/works/OL1W', title: 'Project Hail Mary', author_name: ['Andy Weir'], first_publish_year: 2021, cover_i: 101, cover_edition_key: 'OL1M', number_of_pages_median: 476, subject: ['Science fiction'] }],
};
const CORS = { 'access-control-allow-origin': '*' };   // like the real catalogs, so a page opened from a file can read the answers
const json = (route, body, status = 200) => route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });
export const calls = [];
const flaky = { done: false };
export async function catalog(route) {
  const u = new URL(route.request().url()); calls.push(u.href);
  if (u.hostname === 'covers.openlibrary.org') return /\/b\/id\/\d+-/.test(u.pathname) ? route.fulfill({ status: 200, headers: CORS, contentType: 'image/png', body: PNG }) : route.fulfill({ status: 404, headers: CORS, body: '' });
  // Google's keyless limit: a lookup for 'ratelimit' is always refused
  if (u.hostname === 'www.googleapis.com' && u.searchParams.get('q') === 'ratelimit') return json(route, { error: { code: 429 } }, 429);
  if (u.hostname === 'www.googleapis.com') return json(route, { kind: 'books#volumes', totalItems: 0 });
  // Dune's first lookup is turned away (busy), as the real catalog sometimes does; the app should retry
  if (u.pathname === '/api/books' && /9780441172719/.test(u.search) && !flaky.done) { flaky.done = true; return route.fulfill({ status: 503, headers: CORS, body: 'busy' }); }
  if (u.pathname === '/api/books') { const k = u.searchParams.get('bibkeys'); return json(route, BOOKS[k] ? { [k]: BOOKS[k] } : {}); }
  if (u.pathname === '/search.json') { const q = (u.searchParams.get('q') || '').toLowerCase(), hit = Object.keys(SEARCH).find(k => q.includes(k)); return json(route, { numFound: hit ? SEARCH[hit].length : 0, docs: hit ? SEARCH[hit] : [] }); }
  let m = u.pathname.match(/^\/books\/(OL\d+M)\.json$/); if (m) return EDITIONS[m[1]] ? json(route, EDITIONS[m[1]]) : json(route, { error: 'notfound' }, 404);
  m = u.pathname.match(/^\/works\/(OL\d+W)\.json$/); if (m) return WORKS[m[1]] ? json(route, WORKS[m[1]]) : json(route, { error: 'notfound' }, 404);
  return json(route, { error: 'notfound' }, 404);
}
