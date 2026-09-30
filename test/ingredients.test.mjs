import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIngredient, renderIngredient, formatQuantity, parseServings, scaleServingsText,
  convertTemperaturesInText, categorizeIngredient, makeShoppingEntry, consolidateEntries,
  entryQuantityText, entryDisplayName, normalizeName, convertMeasure,
} from '../src/ingredients.js';

test('parseIngredient: basic quantity, unit, ingredient', () => {
  const p = parseIngredient('2 cups all-purpose flour');
  assert.equal(p.original, '2 cups all-purpose flour');
  assert.equal(p.quantity, '2');
  assert.equal(p.unit, 'cups');
  assert.equal(p.ingredient, 'all-purpose flour');
  assert.equal(p.quantityValue, 2);
});

test('parseIngredient: fractions, unicode fractions, mixed numbers', () => {
  assert.equal(parseIngredient('1 1/2 tsp salt').quantityValue, 1.5);
  assert.equal(parseIngredient('½ cup sugar').quantityValue, 0.5);
  assert.equal(parseIngredient('1½ cups milk').quantityValue, 1.5);
  assert.equal(parseIngredient('1-1/2 cups milk').quantityValue, 1.5);
  assert.equal(parseIngredient('0.25 cup oil').quantityValue, 0.25);
});

test('parseIngredient: ranges', () => {
  const p = parseIngredient('2-3 tablespoons olive oil');
  assert.equal(p.quantityValue, 2);
  assert.equal(p.quantityMax, 3);
  assert.equal(p.unitKey, 'tbsp');
  const q = parseIngredient('1 to 2 cloves garlic');
  assert.equal(q.quantityMax, 2);
});

test('parseIngredient: notes, size notes and equivalent measures', () => {
  const g = parseIngredient('3 cloves garlic, minced');
  assert.equal(g.ingredient, 'garlic');
  assert.equal(g.note, 'minced');
  const c = parseIngredient('2 (14 oz) cans diced tomatoes');
  assert.equal(c.sizeNote, '(14 oz)');
  assert.equal(c.unitKey, 'can');
  assert.equal(c.ingredient, 'diced tomatoes');
  const m = parseIngredient('1 cup (240 ml) milk');
  assert.equal(m.alt.value, 240);
  assert.equal(m.ingredient, 'milk');
});

test('parseIngredient: attached units and failures keep the original', () => {
  assert.equal(parseIngredient('250g flour').unitKey, 'g');
  assert.deepEqual(parseIngredient('Salt to taste'), { original: 'Salt to taste' });
  assert.deepEqual(parseIngredient('3-inch piece ginger'), { original: '3-inch piece ginger' });
  assert.deepEqual(parseIngredient('2x'), { original: '2x' });
  assert.deepEqual(parseIngredient('2 cups'), { original: '2 cups' });
  assert.deepEqual(parseIngredient(''), { original: '' });
});

test('formatQuantity: clean fractions', () => {
  assert.equal(formatQuantity(0.5), '½');
  assert.equal(formatQuantity(0.25), '¼');
  assert.equal(formatQuantity(0.75), '¾');
  assert.equal(formatQuantity(1.5), '1½');
  assert.equal(formatQuantity(2), '2');
  assert.equal(formatQuantity(1 / 3), '⅓');
  assert.equal(formatQuantity(2.33333), '2⅓');
  assert.equal(formatQuantity(1.06), '1 1/16');
  assert.equal(formatQuantity(1.4), '1.4');
  assert.equal(formatQuantity(1.057, 1 / 8), '1');
});

test('renderIngredient: scaling keeps unparsed text and never invents amounts', () => {
  const flour = parseIngredient('1 1/2 cups flour');
  assert.equal(renderIngredient(flour, { factor: 2 }), '3 cups flour');
  assert.equal(renderIngredient(flour, { factor: 0.5 }), '¾ cup flour');
  assert.equal(renderIngredient(flour, { factor: 1 }), '1 1/2 cups flour');
  const salt = parseIngredient('Salt to taste');
  assert.equal(renderIngredient(salt, { factor: 4 }), 'Salt to taste');
  assert.equal(renderIngredient(parseIngredient('2 tsp vanilla'), { factor: 2 }), '4 tsp vanilla');
  assert.equal(renderIngredient(parseIngredient('1 teaspoon salt'), { factor: 3 }), '3 teaspoons salt');
  assert.equal(renderIngredient(parseIngredient('2 large eggs'), { factor: 0.5 }), '1 large egg');
  assert.equal(renderIngredient(parseIngredient('1 onion, diced'), { factor: 3 }), '3 onions, diced');
  assert.equal(renderIngredient(parseIngredient('2-3 tbsp oil'), { factor: 2 }), '4–6 tbsp oil');
});

test('renderIngredient: container sizes are not scaled, equivalent measures are', () => {
  assert.equal(renderIngredient(parseIngredient('2 (14 oz) cans tomatoes'), { factor: 2 }), '4 (14 oz) cans tomatoes');
  assert.equal(renderIngredient(parseIngredient('1 cup (240 ml) milk'), { factor: 2 }), '2 cups (480 ml) milk');
});

test('renderIngredient: safe unit conversion', () => {
  assert.equal(renderIngredient(parseIngredient('8 oz cream cheese'), { system: 'metric' }), '225 g cream cheese');
  assert.equal(renderIngredient(parseIngredient('1 lb beef'), { system: 'metric' }), '455 g beef');
  assert.equal(renderIngredient(parseIngredient('1 cup milk'), { system: 'metric' }), '240 ml milk');
  assert.equal(renderIngredient(parseIngredient('500 g flour'), { system: 'us' }), '1 lb flour'.replace('1 lb', '1⅛ lb'));
  assert.equal(renderIngredient(parseIngredient('250 ml milk'), { system: 'us' }), '1 cup milk');
  // tsp/tbsp untouched in metric, no density guessing for cups of flour -> grams
  assert.equal(renderIngredient(parseIngredient('2 tbsp butter'), { system: 'metric' }), '2 tbsp butter');
  assert.equal(renderIngredient(parseIngredient('1 cup flour'), { system: 'metric' }), '240 ml flour');
  // original untouched when there is nothing safe to convert
  assert.equal(renderIngredient(parseIngredient('3 cloves garlic'), { system: 'metric' }), '3 cloves garlic');
  assert.equal(renderIngredient(parseIngredient('Salt'), { system: 'metric' }), 'Salt');
  assert.equal(convertMeasure(1, 'clove', 'metric'), null);
});

test('convertTemperaturesInText', () => {
  assert.equal(convertTemperaturesInText('Bake at 350°F for 30 minutes.', 'metric'), 'Bake at 175°C for 30 minutes.');
  assert.equal(convertTemperaturesInText('Preheat to 180°C.', 'us'), 'Preheat to 355°F.');
  assert.equal(convertTemperaturesInText('Bake at 350°F.', 'original'), 'Bake at 350°F.');
  assert.equal(convertTemperaturesInText('Bake at 350 degrees F.', 'metric'), 'Bake at 175°C.');
});

test('parseServings / scaleServingsText', () => {
  assert.equal(parseServings('4'), 4);
  assert.equal(parseServings('Serves 6'), 6);
  assert.equal(parseServings('Makes 24 cookies'), 24);
  assert.equal(parseServings('4-6 servings'), 4);
  assert.equal(parseServings('a few'), null);
  assert.equal(scaleServingsText('24 cookies', 12), '12 cookies');
  assert.equal(scaleServingsText('4 servings', 6), '6 servings');
});

test('categorizeIngredient', () => {
  assert.equal(categorizeIngredient('yellow onion'), 'Produce');
  assert.equal(categorizeIngredient('boneless chicken thighs'), 'Meat & Seafood');
  assert.equal(categorizeIngredient('whole milk'), 'Dairy');
  assert.equal(categorizeIngredient('coconut milk'), 'Pantry');
  assert.equal(categorizeIngredient('peanut butter'), 'Pantry');
  assert.equal(categorizeIngredient('butter'), 'Dairy');
  assert.equal(categorizeIngredient('black pepper'), 'Pantry');
  assert.equal(categorizeIngredient('bell pepper'), 'Produce');
  assert.equal(categorizeIngredient('tortillas'), 'Bakery');
  assert.equal(categorizeIngredient('frozen peas'), 'Frozen');
  assert.equal(categorizeIngredient('chicken broth'), 'Pantry');
  assert.equal(categorizeIngredient('ground beef'), 'Meat & Seafood');
  assert.equal(categorizeIngredient('xyzzy'), 'Other');
});

test('consolidation: onions combine, incompatible units do not', () => {
  const merged = consolidateEntries([
    makeShoppingEntry('1 onion'),
    makeShoppingEntry('2 onions'),
    makeShoppingEntry('½ onion'),
  ]);
  assert.equal(merged.length, 1);
  assert.equal(entryQuantityText(merged[0]), '3½');
  assert.equal(entryDisplayName(merged[0]), 'onions');

  const milk = consolidateEntries([makeShoppingEntry('1 cup milk'), makeShoppingEntry('250 ml milk')]);
  assert.equal(milk.length, 2);

  const tsp = consolidateEntries([makeShoppingEntry('1 tbsp sugar'), makeShoppingEntry('1 tsp sugar')]);
  assert.equal(tsp.length, 1);
  assert.equal(entryQuantityText(tsp[0]), '1⅓ tbsp');

  const cups = consolidateEntries([makeShoppingEntry('1 cup flour'), makeShoppingEntry('1 cup flour')]);
  assert.equal(entryQuantityText(cups[0]), '2 cups');

  const raw = consolidateEntries([makeShoppingEntry('Salt to taste'), makeShoppingEntry('salt to taste')]);
  assert.equal(raw.length, 1);

  // different can sizes stay separate
  const cans = consolidateEntries([makeShoppingEntry('1 (14 oz) can tomatoes'), makeShoppingEntry('1 (28 oz) can tomatoes')]);
  assert.equal(cans.length, 2);
  // scale factor applies
  const scaled = makeShoppingEntry('2 cups rice', 1.5);
  assert.equal(entryQuantityText(scaled), '3 cups');
});

test('normalizeName', () => {
  assert.equal(normalizeName('Large Onions, diced'), 'onion');
  assert.equal(normalizeName('fresh tomatoes (ripe)'), 'tomato');
  assert.equal(normalizeName('hummus'), 'hummus');
});
