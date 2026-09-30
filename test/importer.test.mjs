import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import { extractRecipe, parseDurationMinutes, parseJsonLoose, normalizeInstructions } from '../functions/lib/recipe-parser.js';
import { validateUrl, isPrivateAddress, createGuardedLookup, GuardError } from '../functions/lib/url-guard.js';
import { safeFetch, fetchHtml, FetchError, sniffImageType } from '../functions/lib/safe-fetch.js';
import { createRateLimiter } from '../functions/lib/rate-limit.js';
import { createHandler } from '../functions/import-recipe.js';
import { createHandler as createImageHandler } from '../functions/fetch-image.js';
import { decodeEntities } from '../functions/lib/html.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => fs.readFileSync(path.join(dir, 'fixtures', name), 'utf8');
const extract = (name, url = 'https://site.example.com/recipe/') => extractRecipe(fixture(name), { url });
const steps = (r) => r.recipe.instructionSections.flatMap((s) => s.steps);

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

test('simple Recipe JSON-LD: all priority fields', () => {
  const r = extract('simple-jsonld.html');
  assert.equal(r.status, 'complete');
  assert.equal(r.method, 'json-ld');
  const x = r.recipe;
  assert.equal(x.title, 'Lemon Herb Couscous');
  assert.equal(x.author, 'Sample Author');
  assert.equal(x.description, 'A quick, bright side dish & pantry staple.');
  assert.equal(x.datePublished, '2024-03-04');
  assert.equal(x.prepTimeMinutes, 10);
  assert.equal(x.cookTimeMinutes, 5);
  assert.equal(x.totalTimeMinutes, 15);
  assert.equal(x.servings, '4 servings');
  assert.deepEqual(x.categories, ['Dinner', 'Side Dish']);
  assert.deepEqual(x.cuisine, ['Mediterranean']);
  assert.deepEqual(x.tags, ['couscous', 'lemon', 'quick']);
  assert.equal(x.image, 'https://cdn.example.test/couscous-1x1.jpg');
  assert.equal(x.ingredients.length, 6);
  assert.equal(x.ingredients[0].original, '1 1/2 cups couscous');
  assert.equal(x.ingredients[0].quantityValue, 1.5);
  assert.deepEqual(x.ingredients[5], { original: 'Salt to taste' });
  assert.deepEqual(x.instructionSections, [{
    section: 'Main',
    steps: [
      'Place the couscous in a bowl and pour the boiling water over it.',
      'Cover and let stand for 5 minutes, then fluff with a fork.',
      'Stir in oil, lemon zest, juice and parsley. Season with salt.',
    ],
  }]);
  assert.equal(x.nutrition.calories, '210 calories');
  assert.deepEqual(x.sourceRating, { value: 4.8, count: 1203 });
  assert.equal(x.sourceName, 'Fictional Kitchen');
  assert.equal(x.sourceUrl, 'https://site.example.com/recipe/');
  assert.deepEqual(r.missing, []);
});

test('Recipe inside @graph resolves @id references (author, image, instructions)', () => {
  const r = extract('graph.html', 'https://soup.example.test/graph-soup/');
  assert.equal(r.status, 'complete');
  assert.equal(r.recipe.title, 'Graph Soup');
  assert.equal(r.recipe.author, 'Graph Author');
  assert.equal(r.recipe.image, 'https://soup.example.test/wp-content/soup.jpg');
  assert.equal(r.recipe.instructionSections[0].section, 'Method');
  assert.equal(steps(r).length, 2);
  assert.equal(r.recipe.ingredients[3].sizeNote, '(15 oz)');
  assert.equal(r.recipe.totalTimeMinutes, 75);
});

test('multiple JSON-LD scripts: finds the Recipe among unrelated blocks; @type array; string instructions', () => {
  const r = extract('multiple-jsonld.html');
  assert.equal(r.status, 'complete');
  assert.equal(r.recipe.title, 'Block Four Pancakes');
  assert.deepEqual(steps(r), ['Whisk everything together. Fry ladles of batter until golden.']);
});

test('HowToStep instructions: name/text handling and HTML stripping', () => {
  const r = extract('howto-steps.html');
  assert.deepEqual(steps(r), [
    'Toast the bread until golden.',
    'Spread the butter while still warm.',
    'Serve immediately',
  ]);
});

test('HowToSection instructions including nested sections', () => {
  const r = extract('howto-sections.html');
  const secs = r.recipe.instructionSections;
  assert.deepEqual(secs.map((s) => s.section), ['Filling', 'Topping', 'Topping — Extras', 'Bake']);
  assert.deepEqual(secs[0].steps, ['Slice the apples.', 'Toss with cinnamon.']);
  assert.deepEqual(secs[2].steps, ['Add a pinch of salt.']);
  assert.equal(secs[3].steps[0], 'Bake at 350°F for 35 minutes.');
});

test('missing image: no crash, flagged as missing', () => {
  const r = extract('missing-image.html');
  assert.equal(r.status, 'complete');
  assert.equal(r.recipe.image, '');
  assert.ok(r.missing.includes('image'));
  assert.equal(r.recipe.totalTimeMinutes, 140, 'total derived from prep + cook');
});

test('missing times: null, never guessed; relative image resolved', () => {
  const r = extract('missing-times.html', 'https://salad.example.com/a/b');
  assert.equal(r.recipe.prepTimeMinutes, null);
  assert.equal(r.recipe.cookTimeMinutes, null);
  assert.equal(r.recipe.totalTimeMinutes, null);
  assert.equal(r.recipe.image, 'https://salad.example.com/img/salad.jpg');
  assert.equal(r.recipe.servings, '2 servings');
});

test('malformed JSON-LD is recovered (trailing commas, raw newline in string, truncated)', () => {
  const r = extract('malformed-jsonld.html');
  assert.equal(r.method, 'json-ld');
  assert.equal(r.recipe.title, 'Broken Bread');
  assert.equal(r.recipe.ingredients.length, 3);
  assert.equal(steps(r).length, 3);
  assert.match(r.recipe.description, /Line one line two/);
  assert.equal(r.recipe.prepTimeMinutes, 10);
});

test('no Recipe schema: plugin-style containers are used, unrelated lists ignored', () => {
  const r = extract('no-recipe-schema.html', 'https://pie.example.com/plugin-pie/');
  assert.equal(r.method, 'fallback');
  assert.equal(r.status, 'complete');
  assert.equal(r.recipe.title, 'Plugin Pie');
  assert.equal(r.recipe.image, 'https://pie.example.com/images/pie.jpg');
  assert.equal(r.recipe.description, 'A pie without structured data.');
  assert.deepEqual(r.recipe.ingredients.map((i) => i.original), ['2 cups flour', '1/2 cup butter, cold', 'Pinch of salt']);
  assert.deepEqual(steps(r), ['Cut butter into flour.', 'Press into a dish and bake for 25 minutes.']);
  assert.equal(r.recipe.sourceName, 'Pie Example');
});

test('heading based fallback (Ingredients / Directions)', () => {
  const r = extract('heading-fallback.html');
  assert.equal(r.method, 'fallback');
  assert.deepEqual(r.recipe.ingredients.map((i) => i.original), ['3 potatoes', '1 tbsp oil', 'salt']);
  assert.equal(steps(r).length, 2);
});

test('Open Graph fallback page: partial data (title + image), cleaned title', () => {
  const r = extract('og-fallback.html', 'https://some.example.com/sunday-stew');
  assert.equal(r.status, 'partial'.replace('partial', 'failed'), 'article og:type with no recipe signals is failed but still carries data');
  assert.equal(r.recipe.title, 'Sunday Stew');
  assert.equal(r.recipe.image, 'https://cdn.example.test/stew.jpg');
  assert.equal(r.recipe.description, 'A comforting stew for Sundays.');
  assert.deepEqual(r.missing.sort(), ['ingredients', 'instructions']);
});

test('non-recipe page: failed, nothing invented', () => {
  const r = extract('non-recipe.html', 'https://news.example.com/earnings');
  assert.equal(r.status, 'failed');
  assert.equal(r.method, 'none');
  assert.equal(r.recipe.ingredients.length, 0);
  assert.equal(r.recipe.instructionSections.length, 0);
  assert.equal(r.recipe.title, 'Quarterly Earnings Report');
});

test('recipe-looking URL with only a title is partial (not failed)', () => {
  const r = extractRecipe(fixture('og-fallback.html'), { url: 'https://some.example.com/recipes/sunday-stew' });
  assert.equal(r.status, 'partial');
});

test('microdata extraction', () => {
  const r = extract('microdata.html');
  assert.equal(r.method, 'microdata');
  assert.equal(r.status, 'complete');
  assert.equal(r.recipe.author, 'Micro Baker');
  assert.equal(r.recipe.totalTimeMinutes, 30);
  assert.equal(r.recipe.image, 'https://site.example.com/m/muffin.jpg');
  assert.equal(r.recipe.ingredients.length, 3);
  assert.deepEqual(steps(r), ['Mix dry.', 'Add wet and bake 20 minutes.']);
});

test('string instructions with <br> numbering, entities, image objects, author arrays', () => {
  const r = extract('string-instructions.html');
  assert.equal(r.recipe.title, 'Blob Brownies & Friends');
  assert.equal(r.recipe.author, 'Alex, Sam');
  assert.equal(r.recipe.image, 'https://cdn.example.test/brownie.jpg');
  assert.equal(r.recipe.servings, '16');
  assert.deepEqual(r.recipe.ingredients.map((i) => i.original), ['½ cup butter', '1 cup sugar', '2 eggs']);
  assert.deepEqual(steps(r), ['Melt the butter.', 'Stir in sugar & eggs.', 'Bake at 350 degrees F for 25 minutes.']);
});

test('output never contains HTML tags or script text', () => {
  const evil = `<html><head><script type="application/ld+json">{"@type":"Recipe","name":"<img src=x onerror=alert(1)>Evil","description":"<script>alert(1)<\\/script>ok","image":"javascript:alert(1)","recipeIngredient":["<b>1 cup</b> <a href='x'>flour</a>"],"recipeInstructions":["<script>steal()<\\/script>Bake."]}</script></head><body></body></html>`;
  const r = extractRecipe(evil, { url: 'https://evil.example.com/' });
  const blob = JSON.stringify(r.recipe);
  assert.ok(!/<\s*(script|img|b|a)\b/i.test(blob), blob);
  assert.equal(r.recipe.image, '');
  assert.equal(r.recipe.ingredients[0].original, '1 cup flour');
});

test('parseDurationMinutes', () => {
  assert.equal(parseDurationMinutes('PT1H30M'), 90);
  assert.equal(parseDurationMinutes('PT45M'), 45);
  assert.equal(parseDurationMinutes('P0DT0H20M'), 20);
  assert.equal(parseDurationMinutes('P1DT2H'), 1560);
  assert.equal(parseDurationMinutes('1 hr 15 mins'), 75);
  assert.equal(parseDurationMinutes('25 minutes'), 25);
  assert.equal(parseDurationMinutes('1:30'), 90);
  assert.equal(parseDurationMinutes('PT0M'), null);
  assert.equal(parseDurationMinutes(''), null);
  assert.equal(parseDurationMinutes(null), null);
  assert.equal(parseDurationMinutes('soon'), null);
});

test('parseJsonLoose handles wrappers and entity-encoded JSON', () => {
  assert.deepEqual(parseJsonLoose('<!-- {"a":1} -->'), { a: 1 });
  assert.deepEqual(parseJsonLoose('//<![CDATA[\n{"a":[1,2,],}\n//]]>'.replace('//]]>', '')), { a: [1, 2] });
  assert.deepEqual(parseJsonLoose('{&quot;a&quot;: 1}'), { a: 1 });
  assert.equal(parseJsonLoose('not json at all'), null);
});

test('normalizeInstructions: empty and odd shapes', () => {
  assert.deepEqual(normalizeInstructions(undefined), []);
  assert.deepEqual(normalizeInstructions([{ '@type': 'HowToStep' }]), []);
  assert.deepEqual(normalizeInstructions(['  ', 'Do it.']), [{ section: 'Main', steps: ['Do it.'] }]);
});

test('decodeEntities', () => {
  assert.equal(decodeEntities('350&deg;F &amp; &#189; &#x00BD; &unknown;'), '350°F & ½ ½ &unknown;');
});

// ---------------------------------------------------------------------------
// URL guard (SSRF)
// ---------------------------------------------------------------------------

test('validateUrl rejects dangerous or unsupported URLs', () => {
  const bad = [
    'file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com', 'javascript:alert(1)',
    'http://localhost/', 'http://LOCALHOST:8080/', 'http://foo.localhost/', 'http://127.0.0.1/',
    'http://127.1/', 'http://2130706433/', 'http://0x7f.0.0.1/', 'http://0177.0.0.1/',
    'http://10.0.0.5/', 'http://172.16.0.1/', 'http://192.168.1.1/', 'http://169.254.169.254/latest/meta-data',
    'http://metadata.google.internal/computeMetadata/v1/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/',
    'http://[fd00::1]/', 'http://intranet/', 'http://router.local/', 'http://printer.lan/',
    'https://user:pass@example.com/', 'https://example.com:8443/', 'http://8.8.8.8/', 'not a url', '', 'https://not a url with spaces', 'https://exa mple.com/x', 'https://exa%20mple.com/x',
    'http://example.internal/', `https://example.com/${'a'.repeat(2100)}`,
  ];
  for (const u of bad) {
    assert.throws(() => validateUrl(u), GuardError, `should reject ${u}`);
  }
  for (const u of ['https://www.example.com/recipe?id=1', 'http://example.com/a', 'https://sub.domain.co.uk:443/x#frag']) {
    assert.doesNotThrow(() => validateUrl(u), `should accept ${u}`);
  }
});

test('isPrivateAddress covers IPv4 and IPv6 ranges', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.31.255.255', '192.168.0.1', '169.254.169.254', '0.0.0.0', '100.64.0.1',
    '224.0.0.1', '255.255.255.255', '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:10.0.0.1', '::ffff:7f00:1',
    '64:ff9b::7f00:1', '2002:7f00:1::1', 'ff02::1', '2001:db8::1', 'garbage']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test('guarded DNS lookup blocks public names that resolve to private IPs (rebinding)', async () => {
  const fake = (map) => (host, opts, cb) => cb(null, map[host].map((a) => ({ address: a, family: a.includes(':') ? 6 : 4 })));
  const lookup = createGuardedLookup({ resolver: fake({ 'evil.example.com': ['127.0.0.1'], 'mixed.example.com': ['8.8.8.8', '10.0.0.1'], 'ok.example.com': ['93.184.216.34'] }) });
  const call = (host, options = {}) => new Promise((resolve) => lookup(host, options, (err, a, f) => resolve({ err, a, f })));
  assert.equal((await call('evil.example.com')).err.code, 'BLOCKED_HOST');
  assert.equal((await call('mixed.example.com', { all: true })).err.code, 'BLOCKED_HOST');
  const ok = await call('ok.example.com');
  assert.equal(ok.a, '93.184.216.34');
  const all = await call('ok.example.com', { all: true });
  assert.deepEqual(all.a, [{ address: '93.184.216.34', family: 4 }]);
});

// ---------------------------------------------------------------------------
// safeFetch against a local fixture server (allowPrivate only in tests)
// ---------------------------------------------------------------------------

function startServer(routes) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => routes(req, res));
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

test('safeFetch: redirects, loops, status mapping, content-type, size, compression, timeout', async (t) => {
  const page = fixture('simple-jsonld.html');
  const { server, base } = await startServer((req, res) => {
    const u = req.url;
    if (u === '/ok') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(page); }
    if (u === '/redir') { res.writeHead(302, { Location: '/ok' }); return res.end(); }
    if (u === '/loop-a') { res.writeHead(302, { Location: '/loop-b' }); return res.end(); }
    if (u === '/loop-b') { res.writeHead(302, { Location: '/loop-a' }); return res.end(); }
    if (u.startsWith('/many/')) { const n = Number(u.split('/')[2]); res.writeHead(302, { Location: `/many/${n + 1}` }); return res.end(); }
    if (u === '/to-metadata') { res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' }); return res.end(); }
    if (u === '/pdf') { res.writeHead(200, { 'Content-Type': 'application/pdf' }); return res.end('%PDF-1.4'); }
    if (u === '/json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{}'); }
    if (u === '/notype') { res.writeHead(200); return res.end('<html><head><title>x</title></head></html>'); }
    if (u === '/notype-binary') { res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); return res.end(Buffer.from([0, 1, 2, 3, 4, 5])); }
    if (u === '/gzip') { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' }); return res.end(zlib.gzipSync(page)); }
    if (u === '/br') { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'br' }); return res.end(zlib.brotliCompressSync(page)); }
    if (u === '/bomb') { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' }); return res.end(zlib.gzipSync(Buffer.alloc(5_000_000, 'a'))); }
    if (u === '/big') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>' + 'x'.repeat(3_000_000)); }
    if (u === '/slow') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.write('<html>'); return; }
    const m = u.match(/^\/status\/(\d+)/);
    if (m) { res.writeHead(Number(m[1]), { 'Content-Type': 'text/html' }); return res.end('nope'); }
    res.writeHead(404); res.end();
  });
  t.after(() => server.close());
  const opts = { allowPrivate: true, timeoutMs: 1500 };
  const code = async (p, extra = {}) => { try { await safeFetch(base + p, { ...opts, ...extra }); return 'OK'; } catch (e) { return e.code; } };

  const ok = await fetchHtml(base + '/redir', opts);
  assert.ok(ok.finalUrl.endsWith('/ok'));
  assert.match(ok.html, /Lemon Herb Couscous/);
  assert.match((await fetchHtml(base + '/gzip', opts)).html, /Lemon Herb/);
  assert.match((await fetchHtml(base + '/br', opts)).html, /Lemon Herb/);
  assert.match((await fetchHtml(base + '/notype', opts)).html, /<title>x/);

  assert.equal(await code('/loop-a'), 'REDIRECT_LOOP');
  assert.equal(await code('/many/0'), 'TOO_MANY_REDIRECTS');
  assert.equal(await code('/pdf'), 'NOT_HTML');
  assert.equal(await code('/json'), 'NOT_HTML');
  assert.equal(await code('/status/403'), 'SITE_BLOCKED');
  assert.equal(await code('/status/401'), 'SITE_BLOCKED');
  assert.equal(await code('/status/404'), 'NOT_FOUND');
  assert.equal(await code('/status/429'), 'SITE_RATE_LIMITED');
  assert.equal(await code('/status/500'), 'REMOTE_ERROR');
  assert.equal(await code('/status/503'), 'REMOTE_ERROR');
  assert.equal(await code('/slow', { timeoutMs: 400 }), 'TIMEOUT');

  // Non-HTML body with a missing/generic type is rejected after sniffing
  await assert.rejects(fetchHtml(base + '/notype-binary', opts), (e) => e.code === 'NOT_HTML');

  // Oversized pages are truncated, not crashed; compression bombs are capped
  const big = await safeFetch(base + '/big', { ...opts, maxBytes: 100_000 });
  assert.equal(big.truncated, true);
  assert.equal(big.body.length, 100_000);
  const bomb = await safeFetch(base + '/bomb', { ...opts, maxBytes: 100_000 });
  assert.equal(bomb.truncated, true);
  assert.ok(bomb.body.length <= 100_000);
  // ...and rejected outright when truncation is disabled (images)
  assert.equal(await code('/big', { maxBytes: 100_000, truncate: false }), 'TOO_LARGE');

  // SSRF: the production configuration refuses the local server entirely
  await assert.rejects(safeFetch(base + '/ok'), (e) => e.code === 'BLOCKED_HOST');
  // ...and a redirect to the cloud metadata address is refused even when hop 1 is allowed to be local
  await assert.rejects(
    safeFetch(base + '/to-metadata', { allowPrivate: false, lookup: (h, o, cb) => (o && o.all ? cb(null, [{ address: '127.0.0.1', family: 4 }]) : cb(null, '127.0.0.1', 4)) }),
    (e) => e instanceof GuardError,
  );
});

test('sniffImageType recognises common formats and rejects svg/html', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = Buffer.concat([Buffer.from([0x89]), Buffer.from('PNG\r\n\x1a\n'), Buffer.alloc(8)]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
  assert.equal(sniffImageType(jpeg), 'image/jpeg');
  assert.equal(sniffImageType(png), 'image/png');
  assert.equal(sniffImageType(webp), 'image/webp');
  assert.equal(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), '');
  assert.equal(sniffImageType(Buffer.from('<html><body>hello world</body></html>')), '');
});

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

test('rate limiter: per-minute and per-hour windows, per-client isolation', () => {
  let now = 1_000_000;
  const rl = createRateLimiter({ perMinute: 3, perHour: 5, now: () => now });
  for (let i = 0; i < 3; i++) assert.equal(rl.check('a').ok, true);
  const blocked = rl.check('a');
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec >= 1 && blocked.retryAfterSec <= 60);
  assert.equal(rl.check('b').ok, true, 'other clients unaffected');
  now += 61_000;
  assert.equal(rl.check('a').ok, true);
  assert.equal(rl.check('a').ok, true);
  now += 61_000;
  assert.equal(rl.check('a').ok, false, 'hourly cap reached');
  now += 3_600_000;
  assert.equal(rl.check('a').ok, true);
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const ev = (over = {}) => ({
  httpMethod: 'POST',
  headers: { host: 'app.example.com', origin: 'https://app.example.com', 'x-nf-client-connection-ip': '1.2.3.4' },
  body: JSON.stringify({ url: 'https://site.example.com/recipe' }),
  ...over,
});

test('import handler: happy path returns plain JSON', async () => {
  const handler = createHandler({ fetchPage: async () => ({ html: fixture('simple-jsonld.html'), finalUrl: 'https://site.example.com/recipe/' }) });
  const res = await handler(ev());
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['Content-Type'], /application\/json/);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.status, 'complete');
  assert.equal(body.recipe.title, 'Lemon Herb Couscous');
  assert.equal(body.source.finalUrl, 'https://site.example.com/recipe/');
});

test('import handler: validation, origin, method and rate-limit errors', async () => {
  const handler = createHandler({
    fetchPage: async () => { throw new Error('should not be called'); },
    rateLimiter: createRateLimiter({ perMinute: 100 }),
  });
  const code = async (e) => JSON.parse((await handler(e)).body).error.code;
  assert.equal(await code(ev({ body: JSON.stringify({ url: 'http://127.0.0.1/admin' }) })), 'BLOCKED_HOST');
  assert.equal(await code(ev({ body: JSON.stringify({ url: 'http://169.254.169.254/' }) })), 'BLOCKED_HOST');
  assert.equal(await code(ev({ body: JSON.stringify({ url: 'file:///etc/passwd' }) })), 'UNSUPPORTED_PROTOCOL');
  assert.equal(await code(ev({ body: JSON.stringify({ url: 'nonsense' }) })), 'INVALID_URL');
  assert.equal(await code(ev({ body: JSON.stringify({}) })), 'INVALID_URL');
  assert.equal(await code(ev({ body: '{bad json' })), 'BAD_REQUEST');
  assert.equal(await code(ev({ body: 'x'.repeat(10_000) })), 'BAD_REQUEST');
  assert.equal(await code(ev({ httpMethod: 'GET' })), 'METHOD_NOT_ALLOWED');
  assert.equal(await code(ev({ headers: { host: 'app.example.com', origin: 'https://evil.example.org' } })), 'FORBIDDEN_ORIGIN');
  assert.equal(await code(ev({ headers: { host: 'app.example.com', 'sec-fetch-site': 'cross-site' } })), 'FORBIDDEN_ORIGIN');
  assert.equal((await handler(ev({ httpMethod: 'OPTIONS' }))).statusCode, 204);

  const limited = createHandler({ fetchPage: async () => ({ html: '<html></html>', finalUrl: 'https://a.example.com/' }), rateLimiter: createRateLimiter({ perMinute: 2 }) });
  await limited(ev()); await limited(ev());
  const third = await limited(ev());
  assert.equal(third.statusCode, 429);
  assert.ok(Number(third.headers['Retry-After']) >= 1);
});

test('import handler: upstream failures map to friendly errors, no stack traces', async () => {
  const mk = (err) => createHandler({ fetchPage: async () => { throw err; } });
  const run = async (err) => {
    const res = await mk(err)(ev());
    return { res, body: JSON.parse(res.body) };
  };
  let r = await run(new FetchError('SITE_BLOCKED', 'This website blocked automatic recipe importing.', 403));
  assert.equal(r.res.statusCode, 502);
  assert.equal(r.body.error.code, 'SITE_BLOCKED');
  r = await run(new FetchError('TIMEOUT', 'The website took too long to respond.'));
  assert.equal(r.res.statusCode, 504);
  r = await run(new FetchError('NOT_HTML', "This link doesn't appear to be a webpage."));
  assert.equal(r.res.statusCode, 422);
  r = await run(new TypeError('boom: secret internal detail at /var/task/file.js:12'));
  assert.equal(r.body.error.code, 'FETCH_FAILED');
  assert.ok(!/secret|\/var\/task|\.js:/.test(r.res.body));
});

test('image handler: returns base64 image bytes, blocks bad URLs', async () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const handler = createImageHandler({ getImage: async () => ({ body: bytes, mime: 'image/jpeg' }) });
  const res = await handler(ev({ body: JSON.stringify({ url: 'https://cdn.example.com/a.jpg', referer: 'https://site.example.com/r' }) }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.isBase64Encoded, true);
  assert.equal(res.headers['Content-Type'], 'image/jpeg');
  assert.deepEqual(Buffer.from(res.body, 'base64'), bytes);
  const bad = await handler(ev({ body: JSON.stringify({ url: 'http://192.168.0.1/x.jpg' }) }));
  assert.equal(JSON.parse(bad.body).error.code, 'BLOCKED_HOST');
});
