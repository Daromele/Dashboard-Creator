// Parser and import-function checks. Run: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRecipeHtml, minutes, clean } from '../netlify/lib/recipe-parser.mjs';
import { normalizeUrl, checkHost, fetchPage, importRecipe } from '../netlify/functions/import-recipe.mjs';
import handler from '../netlify/functions/import-recipe.mjs';

const fx = n => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');

test('WordPress/Yoast @graph with sections, nutrition, rating', () => {
  const r = parseRecipeHtml(fx('wprm-graph.html'), 'https://fern.example/banana/');
  assert.equal(r.found, true);
  assert.equal(r.title, 'Marbled Banana Bread & Chocolate');
  assert.equal(r.description, 'Soft, swirled and very easy.');
  assert.equal(r.author, 'Ada Fern');
  assert.equal(r.sourceName, 'Fern Kitchen');
  assert.deepEqual([r.prepTimeMinutes, r.cookTimeMinutes, r.totalTimeMinutes], [15, 60, 75]);
  assert.equal(r.servings, '1 loaf (10 slices)');
  assert.equal(r.ingredients.length, 6);
  assert.equal(r.ingredients[2], '¾ cup sugar');
  assert.deepEqual(r.instructionSections.map(s => [s.section, s.steps.length]), [['Batter', 2], ['Swirl & bake', 2]]);
  assert.equal(r.instructionSections[0].steps[0], 'Heat oven to 350°F and butter a loaf pan.');
  assert.deepEqual(r.categories, ['Breakfast', 'Baking']);
  assert.deepEqual(r.cuisine, ['American']);
  assert.deepEqual(r.tags, ['banana bread', 'chocolate', 'quick bread']);
  assert.equal(r.nutrition.Calories, '290 kcal');
  assert.equal(r.nutrition.Fat, '11 g');
  assert.equal(r.nutritionBasis, 'Per 1 slice');
  assert.deepEqual(r.sourceRating, { value: '4.8', count: '312' });
  assert.equal(r.imageURLs[0], 'https://fern.example/banana-1x1.jpg');
  assert.ok(r.imageURLs.includes('https://fern.example/og.jpg'));
});

test('array of nodes, multi-type Recipe, relative image, ISO P0DT duration', () => {
  const r = parseRecipeHtml(fx('dotdash-array.html'), 'https://copper.example/chili/');
  assert.equal(r.title, 'Weeknight Chili');
  assert.equal(r.imageURLs[0], 'https://copper.example/img/chili.jpg');
  assert.equal(r.totalTimeMinutes, 65);
  assert.equal(r.servings, '6');
  assert.equal(r.instructionSections.length, 1);
  assert.equal(r.instructionSections[0].section, 'Main');
  assert.equal(r.instructionSections[0].steps.length, 3);
  assert.equal(r.instructionSections[0].steps[0], 'Heat oil in a large pot over medium heat.');
});

test('instructions as one HTML string', () => {
  const r = parseRecipeHtml(fx('string-instructions.html'), 'https://rice.example/');
  assert.deepEqual(r.instructionSections[0].steps, ['Rinse the rice.', 'Cook 15 minutes.', 'Stir in lemon.']);
  assert.equal(r.cookTimeMinutes, 15);
  assert.equal(r.totalTimeMinutes, 15);
  assert.equal(r.sourceName, 'rice.example');
});

test('microdata fallback', () => {
  const r = parseRecipeHtml(fx('microdata.html'), 'https://scone.example/');
  assert.equal(r.found, true);
  assert.equal(r.title, "Grandma's Scones");
  assert.deepEqual(r.ingredients, ['2 cups flour', '1/3 cup sugar', '1 cup cream']);
  assert.equal(r.instructionSections[0].steps.length, 2);
  assert.equal(r.totalTimeMinutes, 35);
});

test('a page without a recipe gives a title and photo only', () => {
  const r = parseRecipeHtml(fx('no-recipe.html'), 'https://x.example/about');
  assert.equal(r.found, false);
  assert.equal(r.title, 'About the Kitchen');
  assert.deepEqual(r.imageURLs, ['https://x.example/about.jpg']);
});

test('durations and text cleanup', () => {
  assert.equal(minutes('PT1H30M'), 90);
  assert.equal(minutes('PT0S'), null);
  assert.equal(minutes('1 hr 20 mins'), 80);
  assert.equal(minutes(''), null);
  assert.equal(clean('a&amp;amp;b <b>c</b>'), 'a&b c');
  assert.equal(clean('▢ 2 cups flour'), '2 cups flour');
  assert.equal(clean('• ½ cup sugar'), '½ cup sugar');
});

test('URL rules: tracking removed, private hosts refused', async () => {
  assert.equal(normalizeUrl('https://a.example/r?utm_source=x&id=2#top'), 'https://a.example/r?id=2');
  assert.equal(normalizeUrl('ftp://a.example/'), '');
  assert.equal(normalizeUrl('https://user:pw@a.example/'), '');
  assert.equal(normalizeUrl('https://a.example:8080/'), '');
  for (const h of ['localhost', '127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.0.4', '[::1]', 'printer.local'])
    await assert.rejects(checkHost(h), { code: 'BAD_URL' }, h);
  await checkHost('93.184.216.34');
});

const fakeFetch = pages => async (url) => {
  const p = pages[url];
  if (!p) return new Response('nope', { status: 404 });
  return new Response(p.body ?? '', { status: p.status ?? 200, headers: p.headers ?? { 'content-type': 'text/html; charset=utf-8' } });
};

test('redirects are followed and checked; blocks and 404s get clear codes', async () => {
  const pages = {
    'https://93.184.216.34/old': { status: 301, headers: { location: '/new?utm_medium=x' } },
    'https://93.184.216.34/new': { body: fx('wprm-graph.html') },
    'https://93.184.216.34/evil': { status: 302, headers: { location: 'http://127.0.0.1/admin' } },
    'https://93.184.216.34/blocked': { status: 403 },
    'https://93.184.216.34/challenge': { body: '<html><title>Just a moment...</title></html>' },
    'https://93.184.216.34/pdf': { headers: { 'content-type': 'application/pdf' } },
  };
  const f = fakeFetch(pages);
  const { finalUrl } = await fetchPage('https://93.184.216.34/old', { fetchImpl: f });
  assert.equal(finalUrl, 'https://93.184.216.34/new');
  await assert.rejects(fetchPage('https://93.184.216.34/evil', { fetchImpl: f }), { code: 'BAD_URL' });
  await assert.rejects(fetchPage('https://93.184.216.34/blocked', { fetchImpl: f }), { code: 'SOURCE_ACCESS_DENIED' });
  await assert.rejects(fetchPage('https://93.184.216.34/missing', { fetchImpl: f }), { code: 'NOT_FOUND' });
  await assert.rejects(fetchPage('https://93.184.216.34/pdf', { fetchImpl: f }), { code: 'NOT_HTML' });
  await assert.rejects(importRecipe('https://93.184.216.34/challenge', { fetchImpl: f }), { code: 'SOURCE_ACCESS_DENIED' });
  const r = await importRecipe('https://93.184.216.34/old', { fetchImpl: f });
  assert.equal(r.sourceUrl, 'https://93.184.216.34/old');
  assert.equal(r.partial, false);
});

test('handler: method, body and URL errors are JSON with a code', async () => {
  const call = async (init) => { const res = await handler(new Request('https://app.example/.netlify/functions/import-recipe', init), { ip: 't' + Math.random() }); return [res.status, await res.json()]; };
  assert.deepEqual((await call({ method: 'GET' }))[0], 405);
  assert.equal((await call({ method: 'POST', body: 'x' }))[1].code, 'BAD_REQUEST');
  const [s, b] = await call({ method: 'POST', body: JSON.stringify({ url: 'not a link' }) });
  assert.equal(s, 400); assert.equal(b.code, 'BAD_URL');
  const [s2, b2] = await call({ method: 'POST', body: JSON.stringify({ url: 'http://localhost/x' }) });
  assert.equal(s2, 422); assert.equal(b2.code, 'BAD_URL');
});

test('handler: rate limit after 20 a minute from one visitor', async () => {
  let last;
  for (let i = 0; i < 21; i++) last = await handler(new Request('https://a.example/', { method: 'POST', body: '{}' }), { ip: 'same-visitor' });
  assert.equal(last.status, 429);
  assert.ok(+last.headers.get('retry-after') > 0);
});
