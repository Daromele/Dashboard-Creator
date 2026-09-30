import test from 'node:test';
import assert from 'node:assert/strict';

import { detectDurations, formatTimerLabel, formatClock } from '../src/timers.js';
import {
  cleanUserUrl, ImportError, parseInstructionText, cleanIngredientLines, draftFromPastedText,
  splitWholeRecipeText, draftFromImport,
} from '../src/importer.js';
import { normalizeUrl, normalizeTitle, normalizeRecipe, createBlankRecipe } from '../src/recipes.js';
import { canonicalCategory, canonicalCategories } from '../src/taxonomy.js';
import {
  formatMinutes, parseMinutesInput, isoDate, startOfWeek, addDays, normalizeText, safeHttpUrl,
} from '../src/util.js';

test('detectDurations finds obvious durations', () => {
  const d = detectDurations('Bake for 25 minutes, then rest 10 mins.');
  assert.deepEqual(d.map((x) => x.seconds), [1500, 600]);
  assert.equal(d[0].label, '25-minute');
  assert.equal(detectDurations('Simmer for 1 hour and 30 minutes.')[0].seconds, 5400);
  assert.equal(detectDurations('Cook 1 hour 15 minutes')[0].seconds, 4500);
  const range = detectDurations('Fry 2-3 minutes per side')[0];
  assert.equal(range.seconds, 120);
  assert.equal(range.secondsMax, 180);
  assert.equal(detectDurations('Microwave for 30 seconds')[0].seconds, 30);
  assert.equal(detectDurations('Chill for half an hour'.replace('half an hour', '1½ hours'))[0].seconds, 5400);
  assert.equal(detectDurations('Let rest for a minute.')[0].seconds, 60);
  assert.equal(detectDurations('Bake for twenty minutes')[0].seconds, 1200);
});

test('detectDurations ignores non-durations', () => {
  assert.deepEqual(detectDurations('Preheat oven to 350°F and add 2 cups flour.'), []);
  assert.deepEqual(detectDurations('Use a 9-inch pan.'), []);
  assert.deepEqual(detectDurations(''), []);
});

test('timer labels and clock', () => {
  assert.equal(formatTimerLabel(1500), '25-minute');
  assert.equal(formatTimerLabel(5400), '1 hr 30 min');
  assert.equal(formatTimerLabel(45), '45-second');
  assert.equal(formatClock(65), '1:05');
  assert.equal(formatClock(3725), '1:02:05');
  assert.equal(formatClock(0), '0:00');
});

test('cleanUserUrl accepts sloppy input and rejects junk', () => {
  assert.equal(cleanUserUrl('  https://www.example.com/recipe/soup#comments '), 'https://www.example.com/recipe/soup');
  assert.equal(cleanUserUrl('example.com/recipe'), 'https://example.com/recipe');
  assert.equal(cleanUserUrl('Look at this https://example.com/a?b=1 yum'), 'https://example.com/a?b=1');
  assert.equal(cleanUserUrl('<https://example.com/x>'), 'https://example.com/x');
  for (const bad of ['', '   ', 'not a url', 'ftp://example.com/x', 'javascript:alert(1)', 'http://localhost']) {
    assert.throws(() => cleanUserUrl(bad), ImportError, bad);
  }
});

test('normalizeUrl / normalizeTitle for duplicate detection', () => {
  assert.equal(normalizeUrl('https://www.Example.com/Soup/?utm_source=x&id=2#top'), 'example.com/Soup?id=2');
  assert.equal(normalizeUrl('http://example.com/soup/'), normalizeUrl('https://www.example.com/soup'));
  assert.equal(normalizeUrl('https://m.example.com/soup/amp'), 'example.com/soup');
  assert.equal(normalizeUrl(''), '');
  assert.equal(normalizeTitle('Grandma’s Best Soup Recipe!'), 'grandma s best soup');
  assert.equal(normalizeTitle('Crème Brûlée'), 'creme brulee');
});

test('normalizeRecipe: fills defaults, re-parses ingredients, clamps values (migration hook)', () => {
  const r = normalizeRecipe({
    title: '  Soup ',
    ingredients: ['2 cups broth', { original: '1 onion, diced' }, '', null, { text: 'Salt to taste' }],
    instructions: ['Boil.', 'Serve.'], // legacy field name
    personalRating: 9,
    madeCount: '3',
    categories: ['Main Course', 'dinner', 'Soup'],
    tags: 'a, b, A',
  });
  assert.equal(r.title, 'Soup');
  assert.equal(r.schemaVersion, 1);
  assert.equal(r.ingredients.length, 3);
  assert.equal(r.ingredients[0].quantityValue, 2);
  assert.deepEqual(r.ingredients[2], { original: 'Salt to taste' });
  assert.deepEqual(r.instructionSections, [{ section: 'Main', steps: ['Boil.', 'Serve.'] }]);
  assert.equal(r.personalRating, null);
  assert.equal(r.madeCount, 3);
  assert.equal(r.madeBefore, true);
  assert.deepEqual(r.categories, ['Dinner', 'Soup']);
  assert.deepEqual(r.tags, ['a', 'b']);
  assert.ok(r.id && r.createdAt && r.updatedAt);
  // idempotent
  assert.deepEqual(normalizeRecipe(r), r);
  // garbage in -> valid empty recipe out
  assert.equal(normalizeRecipe(null).title, '');
  assert.deepEqual(normalizeRecipe('junk').ingredients, []);
});

test('createBlankRecipe has the documented model', () => {
  const r = createBlankRecipe();
  for (const k of ['id', 'title', 'description', 'image', 'sourceName', 'sourceUrl', 'author', 'datePublished', 'dateImported',
    'prepTimeMinutes', 'cookTimeMinutes', 'totalTimeMinutes', 'servings', 'cuisine', 'categories', 'tags', 'ingredients',
    'instructionSections', 'notes', 'personalRating', 'favorite', 'madeBefore', 'madeCount', 'lastMade', 'collections', 'createdAt', 'updatedAt']) {
    assert.ok(k in r, `missing ${k}`);
  }
  assert.notEqual(createBlankRecipe().id, createBlankRecipe().id);
});

test('draftFromImport keeps attribution and drops unsafe image URLs', () => {
  const d = draftFromImport({
    recipe: { title: 'T', image: 'javascript:alert(1)', sourceName: 'Ex', ingredients: [{ original: '1 cup rice' }], instructionSections: [{ section: 'Main', steps: ['Cook.'] }] },
    source: { finalUrl: 'https://ex.com/r', requestedUrl: 'https://ex.com/r?utm=1' },
  });
  assert.equal(d.sourceUrl, 'https://ex.com/r');
  assert.equal(d.image, '');
  assert.equal(d.ingredients[0].quantityValue, 1);
  assert.ok(d.dateImported);
});

test('paste text: ingredient cleanup', () => {
  const lines = cleanIngredientLines('Ingredients:\n\n• 2 cups flour\n☐ 1 tsp salt\n\n\nFor the sauce:\n- 1 can tomatoes\n');
  assert.deepEqual(lines, ['2 cups flour', '1 tsp salt', '1 can tomatoes']);
});

test('paste text: numbered, paragraph and per-line instructions', () => {
  assert.deepEqual(parseInstructionText('1. Mix the flour.\n2) Add water and\nstir well.\nStep 3: Bake.'), [
    { section: 'Main', steps: ['Mix the flour.', 'Add water and stir well.', 'Bake.'] },
  ]);
  assert.deepEqual(parseInstructionText('Mix the flour.\n\nAdd water.\nStir.\n\nBake it.'), [
    { section: 'Main', steps: ['Mix the flour.', 'Add water. Stir.', 'Bake it.'] },
  ]);
  assert.deepEqual(parseInstructionText('Mix the flour.\nAdd water.\nBake it.'), [
    { section: 'Main', steps: ['Mix the flour.', 'Add water.', 'Bake it.'] },
  ]);
  const sectioned = parseInstructionText('For the filling:\n1. Slice apples.\n2. Toss.\nFor the topping:\n1. Rub butter.');
  assert.deepEqual(sectioned.map((s) => s.section), ['For the filling', 'For the topping']);
  assert.deepEqual(sectioned[0].steps, ['Slice apples.', 'Toss.']);
  assert.deepEqual(parseInstructionText(''), []);
});

test('paste text: a whole recipe pasted in one box is split by headings', () => {
  const split = splitWholeRecipeText('Garlic Bread\n\nIngredients\n1 loaf bread\n2 cloves garlic\n\nDirections\n1. Mix.\n2. Bake.\n\nNotes\nGood warm.');
  assert.equal(split.title, 'Garlic Bread');
  assert.equal(split.ingredients.split('\n').filter(Boolean).length, 2);
  assert.match(split.instructions, /Bake/);
  assert.equal(split.notes, 'Good warm.');
  const draft = draftFromPastedText({ title: '', ingredients: 'Garlic Bread\nIngredients\n1 loaf bread\n2 cloves garlic\nDirections\n1. Mix.\n2. Bake.', instructions: '' });
  assert.equal(draft.title, 'Garlic Bread');
  assert.equal(draft.ingredients.length, 2);
  assert.deepEqual(draft.instructionSections[0].steps, ['Mix.', 'Bake.']);
  const simple = draftFromPastedText({ title: 'Toast', ingredients: '2 slices bread\nbutter', instructions: 'Toast it.', sourceUrl: 'https://ex.com/toast' });
  assert.equal(simple.sourceUrl, 'https://ex.com/toast');
  assert.equal(simple.sourceName, 'ex.com');
});

test('taxonomy', () => {
  assert.equal(canonicalCategory('Main Course'), 'Dinner');
  assert.equal(canonicalCategory('appetizers'), 'Snacks');
  assert.equal(canonicalCategory('DESSERT'), 'Desserts');
  assert.equal(canonicalCategory('Side dish'), 'Side Dish');
  assert.deepEqual(canonicalCategories('Dinner, Main Course; Soup'), ['Dinner', 'Soup']);
});

test('util: minutes, dates, text', () => {
  assert.equal(formatMinutes(75), '1 hr 15 min');
  assert.equal(formatMinutes(45), '45 min');
  assert.equal(formatMinutes(120), '2 hr');
  assert.equal(formatMinutes(null), '');
  assert.equal(parseMinutesInput('45'), 45);
  assert.equal(parseMinutesInput('1h 30'), 90);
  assert.equal(parseMinutesInput('1:30'), 90);
  assert.equal(parseMinutesInput('1.5 hours'), 90);
  assert.equal(parseMinutesInput(''), null);
  assert.ok(Number.isNaN(parseMinutesInput('soon')));
  // Monday-based weeks, local dates
  const wed = new Date(2026, 8, 30); // Wed Sep 30 2026
  assert.equal(isoDate(startOfWeek(wed)), '2026-09-28');
  assert.equal(isoDate(startOfWeek(new Date(2026, 9, 4))), '2026-09-28'); // Sunday belongs to the previous Monday
  assert.equal(isoDate(addDays(new Date(2026, 9, 31), 1)), '2026-11-01');
  assert.equal(normalizeText('Crème Brûlée'), 'creme brulee');
  assert.equal(safeHttpUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpUrl('https://ex.com/a'), 'https://ex.com/a');
  assert.equal(safeHttpUrl('https://not a url with spaces'), '');
  assert.equal(safeHttpUrl('https://ex ample.com/'), '');
  assert.equal(safeHttpUrl('data:text/html,hi'), '');
  assert.equal(safeHttpUrl('https://xn--caf-dma.example/'), 'https://xn--caf-dma.example/');
});
