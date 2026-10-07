// Browser smoke test: every screen and the main flows in Chromium, through the local dev server.
// Open Library and Google Books are answered by test/catalog.mjs, so it runs offline.   node test/smoke.mjs [shots-dir]
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { catalog, calls } from './catalog.mjs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const PORT = 8899 + Math.floor(Math.random() * 50), BASE = `http://localhost:${PORT}`, shots = process.argv[2];
const srv = spawn(process.execPath, ['dev-server.mjs', String(PORT)], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, ALLOW_PRIVATE_URLS: '1' }, stdio: 'pipe' });
await new Promise(r => srv.stdout.once('data', r));
const errors = [], fail = m => { errors.push(m); console.log('FAIL', m); }, ok = (c, m) => c ? console.log('ok', m) : fail(m);
const fx = n => readFileSync(new URL(`./fixtures/${n}`, import.meta.url));
const browser = await pw.chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.route(/^https:\/\/(openlibrary\.org|covers\.openlibrary\.org|www\.googleapis\.com)\//, catalog);
  const page = await ctx.newPage();
  page.on('pageerror', e => fail('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fail('console: ' + m.text()); });
  const shot = async n => { if (!shots) return; await page.evaluate(() => { document.querySelector('#toast').hidden = true; document.activeElement?.blur(); }); await page.screenshot({ path: `${shots}/${n}.png`, fullPage: true }); };
  const find = async q => { await page.fill('#find-a', q); await page.click('[data-find-go]'); await page.waitForFunction(() => !find.busy); };
  const toastHas = async re => { await page.waitForFunction(s => new RegExp(s).test(document.querySelector('#toast').textContent), re.source); return true; };
  await page.goto(BASE + '/');
  await page.waitForSelector('#welcome[open]');
  ok(await page.textContent('#welcome h2') === 'Add any book from a link', 'welcome tour opens on first visit');
  await page.click('#welcome [data-action="tour-close"]');
  ok(await page.isVisible('.import-hero .linkbar'), 'empty library leads with the find bar');
  await shot('01-empty');

  // an ISBN with dashes: one book found, added as Reading, its page opens and fills in its description
  await find('978-0-593-13520-4');
  ok((await page.$$('.result')).length === 1 && /Project Hail Mary/.test(await page.textContent('.result')) && /Andy Weir/.test(await page.textContent('.result')), 'ISBN lookup finds the book');
  ok(/Found it/.test(await page.textContent('.results-head')), 'a single match says so');
  await shot('02-found');
  await page.click('.result [data-action="add-result"][data-k="reading"]');
  await page.waitForSelector('.book-hero h1');
  ok(await page.textContent('.book-hero h1') === 'Project Hail Mary', 'adding opens the book');
  ok(await page.getAttribute('.book-hero [data-action="status"][data-k="reading"]', 'aria-pressed') === 'true', 'status is Reading');
  await page.waitForSelector('.desc');
  const desc = await page.textContent('.desc');
  ok(/^Ryland Grace is the sole survivor/.test(desc) && !/Contains|\[1\]|source/.test(desc), 'description filled in from the work, without catalog markup');
  ok(await page.evaluate(() => state.books[0].genres.includes('Science fiction') && state.books[0].pages === 476 && state.books[0].cover.includes('/b/id/101')), 'genre, pages and cover come along');
  ok(await page.evaluate(() => { const i = document.querySelector('.book-hero .cover img'); return i && !i.hidden; }), 'cover picture shows');
  // progress as a percentage, then a quote, notes and finishing
  await page.click('.book-hero [data-action="progress"]');
  await page.fill('#progress-form [name=page]', '50%'); await page.fill('#progress-form [name=note]', 'Rocky!');
  await page.click('#progress-form button.primary');
  ok(await toastHas(/Page 238 of 476/), 'a percentage becomes a page');
  ok(/Page 238 of 476/.test(await page.textContent('.bh-prog')), 'progress shows on the book');
  await page.fill('#q-text', 'Fist my bump.'); await page.fill('[data-form="quote"] [name=page]', '201'); await page.click('[data-form="quote"] button');
  ok((await page.$$('.quote')).length === 1, 'quote saved');
  await page.fill('#b-notes', 'Best audiobook ever.'); await page.click('[data-form="notes"] button'); ok(await toastHas(/Notes saved/), 'notes saved');
  await page.click('.book-hero [data-action="finish"]');
  await page.click('#finish-form .rate-pick label:nth-child(5)'); await page.click('#finish-form button.primary');
  await page.waitForFunction(() => state.books[0].status === 'read');
  ok(await page.evaluate(() => state.books[0].rating === 5 && state.books[0].reads.length === 1 && state.books[0].reads[0].end === today() && !!state.books[0].reads[0].start), 'finishing closes the read with today and the rating');
  ok(/Finished/.test(await page.textContent('.read-row')), 'reading history shows the read');
  await shot('03-book');

  // a title search: several matches, add one, the rest stay
  await page.click('.topbar [data-action="add"]'); await page.waitForSelector('#find-a');
  await find('midnight library');
  ok((await page.$$('.result')).length === 2, 'title search lists the matches');
  await page.click('.result:first-child [data-action="add-result"][data-k="want"]');
  await page.waitForSelector('.result.added');
  ok(/In your library/.test(await page.textContent('.result.added')), 'added match is marked, search stays open');
  await page.waitForFunction(() => state.books.find(b => b.title === 'The Midnight Library')?.isbn === '9780525559474');
  ok(await page.evaluate(() => /shelves go on forever/.test(state.books.find(b => b.title === 'The Midnight Library').description)), 'ISBN and description come from the edition and work');
  await shot('04-search');
  // links: Amazon print (ISBN-10 in the address), Bookshop (?ean=), Goodreads (title), a bookshop page (read by the link reader)
  await find('https://www.amazon.com/Project-Hail-Mary-Novel/dp/0593135202/ref=sr_1_1?tag=x');
  ok(/In your library/.test(await page.textContent('.result')), 'Amazon link finds the book and knows it is already here');
  await find('https://www.goodreads.com/book/show/54493401-project-hail-mary');
  ok(/Project Hail Mary/.test(await page.textContent('.result')), 'Goodreads link is matched by its title');
  await find('https://bookshop.org/p/books/dune-frank-herbert/6431?ean=9780441172719');
  ok(/Dune/.test(await page.textContent('.result')), 'Bookshop link finds the book by its ISBN, after the busy catalog is retried');
  await page.click('.result [data-action="add-result"][data-k="read"]');
  await page.check('#finish-form [name=nodate]'); await page.click('#finish-form button.primary');
  await page.waitForSelector('.book-hero h1');
  ok(await page.evaluate(() => { const b = state.books.find(x => x.title === 'Dune'); return b.status === 'read' && !b.reads.length; }), 'read with no date: read, but in no year');
  ok(/without a date/.test(await page.textContent('.book-cols')), 'the book page says how to add the date');
  await page.click('.topbar [data-action="add"]'); await page.waitForSelector('#find-a');
  await find(`${BASE}/fixtures/book-page.html`);
  ok(/Circe/.test(await page.textContent('.result')) && /Madeline Miller/.test(await page.textContent('.result')), 'a bookshop page is read for its ISBN');
  await find(`${BASE}/fixtures/no-isbn.html`);
  ok(/The Quiet Garden/.test(await page.textContent('.result')), 'a page without an ISBN still offers its title');
  await find('https://www.amazon.es/dp/B0CNVR8ZX8/ref=sspa_dk_detail_4?psc=1&pd_rd_i=B0CNVR8ZX8');
  ok(/This Amazon link doesn’t include the book’s ISBN/.test(await page.textContent('.find-status')) && await page.evaluate(() => document.activeElement?.id === 'find-a'), 'an Amazon link without an ISBN asks for the title, straight away');
  await find('hail mary');
  ok(await page.evaluate(() => find.results[0]?.sourceUrl.startsWith('https://www.amazon.es/dp/B0CNVR8ZX8')), 'the title search keeps the Amazon link');
  await find('9780593135205');
  ok(/isn’t a valid ISBN/.test(await page.textContent('.find-status')), 'a mistyped ISBN is caught');
  await find('zzqx nothing');
  ok(/No books found/.test(await page.textContent('.find-status')), 'no matches explained');
  await shot('05-import');

  // Goodreads export: preview, skip what's here, shelves and series come across
  await page.setInputFiles('#csv-file', { name: 'goodreads_library_export.csv', mimeType: 'text/csv', buffer: fx('goodreads.csv') });
  await page.waitForSelector('#csv-form');
  ok(/Import 4 books/.test(await page.textContent('#dlg-title')) && /1 book already in your library/.test(await page.textContent('#dlg')), 'export preview counts and spots duplicates');
  await page.uncheck('#csv-form [name=enrich]'); await page.click('#csv-form button.primary');
  ok(await toastHas(/3 books imported/), 'Goodreads books imported');
  ok(await page.evaluate(() => { const b = state.books.find(x => x.title === 'Leviathan Wakes'); return b && b.series === 'The Expanse' && b.seriesNo === '1' && b.rating === 4 && b.reads[0].end === '2024-03-12' && b.shelves.length === 2 && b.owned && /loved Holden/.test(b.notes) && b.cover.includes('9780316129084'); }), 'series, rating, date read, shelves, review and cover');
  ok(await page.evaluate(() => state.books.find(x => x.title === 'The Hobbit').status === 'reading' && state.books.find(x => x.title === 'Educated').format === 'Ebook'), 'currently reading and format mapped');
  ok(await page.evaluate(() => state.shelves.map(s => s.name).sort().join() === 'Book club,Sci fi'), 'Goodreads shelves become shelves');
  await page.setInputFiles('#csv-file', { name: 'storygraph.csv', mimeType: 'text/csv', buffer: fx('storygraph.csv') });
  await page.waitForSelector('#csv-form'); ok(/1 book already in your library/.test(await page.textContent('#dlg')), 'StoryGraph preview spots the duplicate');
  await page.uncheck('#csv-form [name=enrich]'); await page.click('#csv-form button.primary');
  ok(await page.evaluate(() => { const p = state.books.find(x => x.title === 'Piranesi'), c = state.books.find(x => x.title === 'Circe'); return p && p.status === 'dnf' && c.rating === 5 && c.reads[0].end === '2025-02-20' && c.tags.join() === 'mythology,comfort' && c.format === 'Hardcover'; }), 'StoryGraph: half stars, tags, dates and did-not-finish');
  ok(await page.evaluate(() => state.books.length === 8 && state.books.filter(b => b.title === 'Project Hail Mary').length === 1), '8 books, nothing duplicated');

  // the library: filters, table, select and shelve
  await page.click('.navlink[data-go="library"]');
  ok((await page.$$('.bcard')).length === 8, 'library shows every book');
  await page.click('[data-action="lib-filter"][data-k="read"]');
  ok((await page.$$('.bcard')).length === 4, 'Read filter');
  await page.click('[data-action="lib-filter"][data-k="all"]');
  await page.click('[data-action="lib-view"][data-k="table"]'); ok((await page.$$('tbody tr')).length === 8, 'table view'); await page.click('[data-action="lib-view"][data-k="grid"]');
  await page.click('[data-action="sel-mode"]'); await page.click('.bcard:nth-child(1) .bcard-open'); await page.click('.bcard:nth-child(2) .bcard-open');
  await page.click('[data-action="bulk-shelf"]'); await page.selectOption('#bulk-shelf-form [name=v]', '__new'); await page.fill('#bulk-shelf-form [name=name]', 'Beach bag'); await page.click('#bulk-shelf-form button.primary');
  ok(await page.evaluate(() => { const s = state.shelves.find(x => x.name === 'Beach bag'); return s && state.books.filter(b => b.shelves.includes(s.id)).length === 2; }), 'two books put on a new shelf');
  await page.click('[data-action="sel-mode"]');
  await page.fill('#lib-search', 'expanse'); await page.waitForTimeout(350); ok((await page.$$('.bcard')).length === 1, 'search finds a series');
  await page.fill('#lib-search', ''); await page.waitForTimeout(350);
  await shot('06-library');
  await page.evaluate(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; window.__printed = 0; });
  await page.click('.pagehead [data-action="print"]'); await page.waitForFunction(() => window.__printed === 1);
  ok(await page.evaluate(() => document.querySelectorAll('#print-root .pd-list tbody tr').length === 8 && !(document.querySelector('#print-root').textContent || '').includes(CONFIG.email)), 'book list prints, with no contact line');
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  ok(await page.evaluate(() => !document.body.classList.contains('printing') && !document.querySelector('#print-root').innerHTML), 'print document cleared afterwards');

  // shelves, genres/tags/authors
  await page.click('.hub-tabs [data-go="shelves"]'); ok((await page.$$('.ccard')).length === 3, 'shelves screen lists 3 shelves');
  await page.click('.hub-tabs [data-go="tags"]'); ok((await page.$$('.grid-even .card')).length === 3, 'genres, tags and authors');
  await page.click('[data-action="facet-rename"][data-k="authors"][data-v="J.R.R. Tolkien"]'); await page.fill('#facet-form [name=to]', 'J. R. R. Tolkien'); await page.click('#facet-form button.primary');
  ok(await page.evaluate(() => state.books.find(b => b.title === 'The Hobbit').authors[0] === 'J. R. R. Tolkien'), 'author renamed everywhere');

  // goal, reading now, year in books and its printout
  await page.click('.navlink[data-go="reading"]');
  ok((await page.$$('.now')).length === 1, 'reading now lists the book in progress');
  await page.click('.card [data-action="goal"]'); await page.fill('#goal-form [name=goal]', '12'); await page.click('#goal-form button.primary');
  ok(await page.evaluate(() => state.settings.goals[thisYear()] === 12) && !!(await page.$('.kit-gauge')), 'goal set, gauge shows');
  await page.click('.navlink[data-go="year"]');
  ok(await page.textContent('.hero-num') === '1' && (await page.$$('.wall button')).length === 1, 'year in books counts this year’s finished book');
  await page.click('.pagehead [data-action="year-step"][data-d="-1"]');
  ok(await page.textContent('.hero-num') === '1' && /Circe/.test(await page.textContent('.wall')), 'last year: the book finished then');
  await page.click('.pagehead [data-action="year-print"]'); await page.waitForFunction(() => window.__printed === 2);
  ok(await page.evaluate(() => !!document.querySelector('#print-root .pd-cover.cv-classic') && document.querySelectorAll('#print-root .pd-brow').length === 1 && /in Books/.test(document.querySelector('#print-root h1').textContent)), 'year journal: cover, stats, every book');
  await page.evaluate(() => dispatchEvent(new Event('afterprint')));
  await page.click('.navlink[data-go="dashboard"]');
  ok(/1 \/ 12/.test(await page.textContent('.hero-side')), 'dashboard shows the goal');
  ok(!!(await page.$('.kit-chart svg')) && !!(await page.$('.kit-pie svg')), 'dashboard charts draw');
  ok(/hello@jpsdigitalpages\.com/.test(await page.textContent('.footer')), 'contact line in the app footer');
  await shot('07-dashboard');

  // backup and merge restore: same library back in, nothing duplicated
  const bk = await page.evaluate(() => backupJSON());
  await page.setInputFiles('#restore-file', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(bk) });
  await page.waitForSelector('[data-action="restore-go"][data-mode="merge"]');
  ok(await page.textContent('.restore-sum div:nth-child(3) b') === '8', 'restore preview: all 8 identical');
  await page.click('[data-action="restore-go"][data-mode="merge"]');
  ok(await toastHas(/0 books added/) && await page.evaluate(() => state.books.length === 8), 'merge adds no duplicates');

  // sample mode
  await page.click('#rail-demo');
  ok(await page.evaluate(() => demo && state.books.length === 18), 'sample library loads');
  ok(!!(await page.$('.pulse')) && !!(await page.$('.kit-pie')), 'sample dashboard');
  await shot('08-sample-dashboard');
  await page.evaluate(() => openBook('s0')); await page.waitForSelector('.book-hero');
  ok(/Project Hail Mary/.test(await page.textContent('.book-hero h1')) && (await page.$$('.log-row')).length === 3, 'sample book with progress notes');
  await shot('09-sample-book');
  await page.evaluate(() => { yearSel = new Date().getFullYear(); go('year'); });
  await shot('10-sample-year');
  await page.click('#rail-demo');
  ok(await page.evaluate(() => !demo && state.books.length === 8), 'back to my own books');
  // the editor: type a book in by hand
  await page.click('.navlink[data-go="import"]'); await page.click('.pagehead [data-action="manual"]');
  await page.fill('#book-form [name=title]', 'My Grandmother’s Letters'); await page.fill('#book-form [name=authors]', 'Rose Hale'); await page.fill('#book-form [name=isbn]', '12345');
  await page.click('#book-form .savebar button.primary'); ok(await toastHas(/ISBN doesn’t look right/), 'a wrong ISBN is caught in the editor');
  await page.fill('#book-form [name=isbn]', ''); await page.fill('#book-form [name=pages]', '120'); await page.click('#book-form .savebar button.primary');
  await page.waitForSelector('.book-hero h1'); ok(await page.textContent('.book-hero h1') === 'My Grandmother’s Letters', 'typed-in book saved');
  ok(await page.evaluate(() => !!document.querySelector('.book-hero .cover .gen')), 'a book without a picture gets a typeset cover');
  // undo
  await page.click('.book-hero [data-action="delete-book"]'); await page.click('[data-action="ask-ok"]');
  await page.click('#toast [data-action="undo"]'); ok(await page.evaluate(() => state.books.some(b => b.title === 'My Grandmother’s Letters')), 'delete can be undone');
  // phone width: nothing wider than the screen, menu opens
  await page.setViewportSize({ width: 390, height: 844 });
  for (const s of ['dashboard', 'library', 'import', 'reading', 'year', 'settings']) { await page.evaluate(s => go(s), s); const w = await page.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, `${s} fits a phone (${w}px)`); }
  await page.click('.mobile-menu'); ok(await page.evaluate(() => document.body.classList.contains('menu-open')), 'phone menu opens');
  await shot('11-phone');
  const before = calls.filter(u => u.includes('q=ratelimit')).length;
  ok(await page.evaluate(async () => { try { await getJSON(GB + '?q=ratelimit'); return false; } catch (e) { return e.why === 'limit' && /turning lookups away/.test(e.message); } }) && calls.filter(u => u.includes('q=ratelimit')).length === before + 1, 'Google’s keyless limit: asked once, not hammered, and explained');
  // a title Open Library doesn't have while Google is refusing: say which did what, offer Try again and Type it in
  await page.evaluate(() => document.body.classList.remove('menu-open')); await page.setViewportSize({ width: 1440, height: 900 });
  await page.click('.topbar [data-action="add"]'); await page.waitForSelector('#find-a');
  await page.fill('#find-a', 'ratelimit'); await page.click('[data-find-go]'); await page.waitForFunction(() => !find.busy);
  const st = await page.textContent('.find-status');
  ok(/Open Library has no match, and Google Books \(the backup\) is turning lookups away/.test(st) && /Details: Open Library: no match · Google Books: too many lookups from this connection \(429\)/.test(st), 'both catalogs explained, with a details line');
  ok(await page.isVisible('.find-status [data-action="find-again"]') && await page.isVisible('.find-status [data-action="manual"]'), 'Try again and Type it in offered');
  ok(calls.every(u => !/[?&](key|token)=/.test(u)) && !(await page.content()).includes('AIza') && !/google-books|googleEndpoint/.test(await page.content()), 'no Google key or Google function anywhere');
  // on an iPhone that hasn't installed it: a nudge to add it to the home screen, with the steps, that can be put off
  const phone = await browser.newContext({ ...pw.devices['iPhone 13'], reducedMotion: 'reduce' });
  const pp = await phone.newPage(); pp.on('pageerror', e => fail('phone pageerror: ' + e.message));
  await pp.goto(BASE + '/'); await pp.evaluate(() => { localStorage.setItem(CONFIG.storageKey + '-welcome-v1', '1'); }); await pp.reload(); await pp.waitForSelector('#content .pagehead');
  ok(await pp.isVisible('#install-banner') && /home screen/.test(await pp.textContent('#install-banner')), 'iPhone: add-to-home-screen nudge shows');
  await pp.click('#install-banner [data-action="install"]'); await pp.waitForSelector('#dlg[open]');
  ok(/Add to Home Screen/.test(await pp.textContent('#dlg')), 'iPhone: the steps are shown'); await pp.click('#dlg [data-action="dismiss"]');
  await pp.click('#install-banner [data-action="install-later"]'); await pp.reload(); await pp.waitForSelector('#content .pagehead');
  ok(await pp.isHidden('#install-banner'), 'Not now is remembered');
  ok(await page.isHidden('#install-banner'), 'no nudge on a computer');
  await phone.close();
} finally { await browser.close(); srv.kill(); }
if (errors.length) { console.log(`\n${errors.length} failure(s)`); process.exit(1); }
console.log('\nall smoke checks passed');
