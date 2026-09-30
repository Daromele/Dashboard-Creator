/**
 * ingredients.js — pure ingredient helpers (no DOM, no storage).
 *
 * Shared by the browser app AND the Netlify function, so it must stay free of
 * browser-only APIs. Responsibilities:
 *   - parse "2 cups all-purpose flour" into { quantity, unit, ingredient, … }
 *   - scale quantities and render them with clean fractions (½, ¼, ¾)
 *   - safe unit conversion (US <-> metric) — never volume <-> weight
 *   - consolidate shopping entries when quantities can safely be combined
 *   - categorise ingredients for the shopping list
 *
 * Golden rule: the ORIGINAL ingredient text is never destroyed. If anything
 * looks uncertain the original string is what gets displayed.
 */

// ---------------------------------------------------------------------------
// Fractions
// ---------------------------------------------------------------------------

const FRAC_TEXT = {
  '¼': '1/4', '½': '1/2', '¾': '3/4', '⅓': '1/3', '⅔': '2/3',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
  '⅙': '1/6', '⅚': '5/6', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅐': '1/7', '⅑': '1/9', '⅒': '1/10',
};
const FRAC_CHARS = Object.keys(FRAC_TEXT).join('');
const FRAC_CHAR_RE = new RegExp(`[${FRAC_CHARS}]`, 'g');
const DIGIT_FRAC_RE = new RegExp(`(\\d)\\s*([${FRAC_CHARS}])`, 'g');

/** Display fractions, ascending. Used by formatQuantity. */
const DISPLAY_FRACTIONS = [
  [1 / 16, '1/16'], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'],
  [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'],
];

/** "1½" -> "1 1/2", "½" -> "1/2". */
export function normalizeQuantityText(s) {
  return String(s)
    .replace(DIGIT_FRAC_RE, (_m, d, f) => `${d} ${FRAC_TEXT[f]}`)
    .replace(FRAC_CHAR_RE, (f) => FRAC_TEXT[f])
    .replace(/⁄/g, '/');
}

/**
 * Format a number as a friendly quantity using common fractions.
 *   0.5 -> "½", 0.25 -> "¼", 0.75 -> "¾", 1.5 -> "1½", 2 -> "2"
 * Values that are not close to a common fraction fall back to <= 2 decimals.
 * `snap` (e.g. 1/8) forces rounding to a grid first — used after unit
 * conversion, where "1.057 cups" should read "1 cup".
 */
export function formatQuantity(n, snap = 0) {
  if (typeof n !== 'number' || !isFinite(n)) return '';
  if (n <= 0) return '0';
  if (snap > 0) n = Math.max(snap, Math.round(n / snap) * snap);
  let whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  if (frac < 0.02) return String(whole);
  if (frac > 0.98) return String(whole + 1);
  let best = null;
  for (const [val, sym] of DISPLAY_FRACTIONS) {
    const d = Math.abs(frac - val);
    if (d <= 0.02 && (!best || d < best.d)) best = { d, sym };
  }
  if (best) {
    if (best.sym === '1/16') return whole ? `${whole} 1/16` : '1/16';
    return `${whole || ''}${best.sym}`;
  }
  return String(parseFloat(n.toFixed(2)));
}

function formatRange(v, max, snap) {
  const a = formatQuantity(v, snap);
  if (max == null || Math.abs(max - v) < 1e-9) return a;
  return `${a}–${formatQuantity(max, snap)}`;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

/**
 * Unit table. `fam` groups units that can be converted/combined with each
 * other safely (exact definitions). `f` is the factor to the family base unit:
 *   vol-us: teaspoons   vol-metric: ml   wt-us: ounces   wt-metric: grams
 * Units in the "other" families (clove, can, pinch…) are never converted.
 */
const UNIT_DEFS = [
  { key: 'tsp', fam: 'vol-us', f: 1, sing: 'teaspoon', plur: 'teaspoons', short: ['tsp', 'tsps'], names: ['teaspoon', 'teaspoons', 'tsp', 'tsps'] },
  { key: 'tbsp', fam: 'vol-us', f: 3, sing: 'tablespoon', plur: 'tablespoons', short: ['tbsp', 'tbsps', 'tbs', 'tbl'], names: ['tablespoon', 'tablespoons', 'tbsp', 'tbsps', 'tbs', 'tbl'] },
  { key: 'fl oz', fam: 'vol-us', f: 6, sing: 'fluid ounce', plur: 'fluid ounces', short: ['fl oz', 'floz'], names: ['fl oz', 'fluid ounce', 'fluid ounces', 'floz'] },
  { key: 'cup', fam: 'vol-us', f: 48, sing: 'cup', plur: 'cups', short: ['c'], names: ['cup', 'cups', 'c'] },
  { key: 'pint', fam: 'vol-us', f: 96, sing: 'pint', plur: 'pints', short: ['pt'], names: ['pint', 'pints', 'pt'] },
  { key: 'quart', fam: 'vol-us', f: 192, sing: 'quart', plur: 'quarts', short: ['qt', 'qts'], names: ['quart', 'quarts', 'qt', 'qts'] },
  { key: 'gallon', fam: 'vol-us', f: 768, sing: 'gallon', plur: 'gallons', short: ['gal'], names: ['gallon', 'gallons', 'gal'] },
  { key: 'ml', fam: 'vol-metric', f: 1, sing: 'milliliter', plur: 'milliliters', short: ['ml'], names: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'] },
  { key: 'l', fam: 'vol-metric', f: 1000, sing: 'liter', plur: 'liters', short: ['l'], names: ['l', 'liter', 'liters', 'litre', 'litres'] },
  { key: 'oz', fam: 'wt-us', f: 1, sing: 'ounce', plur: 'ounces', short: ['oz'], names: ['oz', 'ounce', 'ounces'] },
  { key: 'lb', fam: 'wt-us', f: 16, sing: 'pound', plur: 'pounds', short: ['lb', 'lbs'], names: ['lb', 'lbs', 'pound', 'pounds'] },
  { key: 'g', fam: 'wt-metric', f: 1, sing: 'gram', plur: 'grams', short: ['g', 'gr'], names: ['g', 'gram', 'grams', 'gr'] },
  { key: 'kg', fam: 'wt-metric', f: 1000, sing: 'kilogram', plur: 'kilograms', short: ['kg', 'kgs'], names: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'] },
];

// Container-ish / countable units: recognised for parsing, never converted.
const OTHER_UNITS = [
  ['pinch', 'pinches'], ['dash', 'dashes'], ['clove', 'cloves'], ['can', 'cans'], ['jar', 'jars'],
  ['package', 'packages'], ['packet', 'packets'], ['bag', 'bags'], ['box', 'boxes'], ['bunch', 'bunches'],
  ['sprig', 'sprigs'], ['stalk', 'stalks'], ['head', 'heads'], ['slice', 'slices'], ['stick', 'sticks'],
  ['piece', 'pieces'], ['handful', 'handfuls'], ['fillet', 'fillets'], ['sheet', 'sheets'],
  ['cube', 'cubes'], ['bottle', 'bottles'], ['container', 'containers'], ['knob', 'knobs'],
];
for (const [sing, plur] of OTHER_UNITS) {
  UNIT_DEFS.push({ key: sing, fam: `other:${sing}`, f: 1, sing, plur, names: [sing, plur] });
}

const UNIT_BY_NAME = new Map();
const UNIT_BY_KEY = new Map();
for (const u of UNIT_DEFS) {
  UNIT_BY_KEY.set(u.key, u);
  for (const n of u.names) UNIT_BY_NAME.set(n, u);
}

const CONVERTIBLE = new Set(['vol-us', 'vol-metric', 'wt-us', 'wt-metric']);

/** Look up a unit by any alias ("Tablespoons", "tbsp.", "fl. oz"). */
export function lookupUnit(text) {
  if (!text) return null;
  const t = String(text).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
  return UNIT_BY_NAME.get(t) || null;
}

export function unitFamily(unitKey) {
  const u = UNIT_BY_KEY.get(unitKey);
  return u ? u.fam : '';
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const NUM_PATTERNS = [
  [/^(\d+)\s+(\d+)\/(\d+)/, (m) => +m[1] + +m[2] / +m[3], (m) => +m[3] !== 0], // 1 1/2
  [/^(\d+)-(\d+)\/(\d+)/, (m) => +m[1] + +m[2] / +m[3], (m) => +m[3] !== 0], // 1-1/2
  [/^(\d+)\/(\d+)/, (m) => +m[1] / +m[2], (m) => +m[2] !== 0], // 1/2
  [/^(\d*\.\d+)/, (m) => parseFloat(m[1]), () => true], // 1.5 / .5
  [/^(\d+)/, (m) => parseInt(m[1], 10), () => true], // 2
];

/** Read a leading number. Returns { value, text, len } or null. */
function readNumber(s) {
  for (const [re, val, ok] of NUM_PATTERNS) {
    const m = s.match(re);
    if (m && ok(m)) return { value: val(m), text: m[0], len: m[0].length };
  }
  return null;
}

/** Split at the first comma that is not inside parentheses. */
function splitTopLevelComma(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ',' && depth === 0) return [s.slice(0, i), s.slice(i + 1)];
  }
  return [s, ''];
}

/** Match a unit at the start of `s`. Returns { def, text, len } or null. */
function readUnit(s) {
  // two-word units first ("fl oz", "fluid ounces")
  const two = s.match(/^([A-Za-z]+\.?\s+[A-Za-z]+\.?)(?=$|[\s,)(])/);
  if (two) {
    const def = lookupUnit(two[1]);
    if (def) return { def, text: two[1].replace(/\.$/, ''), len: two[1].length };
  }
  const one = s.match(/^([A-Za-z]+)\.?(?=$|[\s,)(])/);
  if (one) {
    const def = lookupUnit(one[1]);
    if (def) return { def, text: one[1], len: one[0].length };
  }
  return null;
}

/**
 * Parse one ingredient line.
 *
 * Success:  { original, quantity, unit, ingredient, quantityValue, [quantityMax],
 *             [unitKey], [note], [sizeNote], [alt] }
 * Failure:  { original }           ← always safe to display
 *
 *   "2 cups all-purpose flour"        -> 2 / cups / all-purpose flour
 *   "3 cloves garlic, minced"         -> 3 / cloves / garlic (note: minced)
 *   "1 (14 oz) can tomatoes"          -> 1 / can / tomatoes (sizeNote "(14 oz)")
 *   "1 cup (240 ml) milk"             -> 1 / cup / milk (alt 240 ml)
 *   "Salt to taste"                   -> { original }
 */
export function parseIngredient(input) {
  const original = String(input == null ? '' : input).trim();
  if (!original) return { original: '' };

  let s = normalizeQuantityText(original).replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const num = readNumber(s);
  if (!num || num.value <= 0) return { original };

  let rest = s.slice(num.len);
  let value = num.value;
  let max = null;
  let qtyText = num.text;

  // Range: "1-2", "2 to 3", "1 or 2"
  const rangeM = rest.match(/^\s*(?:-|\bto\b|\bor\b)\s*(?=\d|\.)/i);
  if (rangeM) {
    const after = rest.slice(rangeM[0].length);
    const n2 = readNumber(after);
    if (n2 && n2.value >= value) {
      max = n2.value;
      qtyText = `${num.text}-${n2.text}`;
      rest = after.slice(n2.len);
    }
  }

  // "3-inch piece" (hyphenated adjective) is not a quantity we can scale.
  if (/^-[A-Za-z]/.test(rest)) return { original };

  const adjacent = rest.length > 0 && !/^\s/.test(rest);
  rest = rest.replace(/^\s+/, '');

  // Size note before the unit: "2 (14 oz) cans tomatoes"
  let sizeNote = '';
  const sizeM = rest.match(/^(\([^)]*\))\s*/);
  if (sizeM) {
    sizeNote = sizeM[1];
    rest = rest.slice(sizeM[0].length);
  }

  // Unit
  let unitText = '';
  let unitKey = '';
  const unit = readUnit(rest);
  if (unit) {
    unitText = unit.text;
    unitKey = unit.def.key;
    rest = rest.slice(unit.len).replace(/^\s+/, '');
  } else if (adjacent) {
    // "2lb" is fine, "2x" or "3rd" is not a quantity.
    return { original };
  }

  // Equivalent measure after the unit: "1 cup (240 ml) milk"
  let alt = null;
  if (unitKey && CONVERTIBLE.has(unitFamily(unitKey))) {
    const altM = rest.match(/^\(([^)]*)\)\s*/);
    if (altM) {
      const inner = altM[1].trim();
      const an = readNumber(inner);
      if (an) {
        const au = lookupUnit(inner.slice(an.len).trim());
        if (au && CONVERTIBLE.has(au.fam)) {
          alt = { value: an.value, unit: inner.slice(an.len).trim(), unitKey: au.key };
          rest = rest.slice(altM[0].length);
        }
      }
    }
  }

  rest = rest.replace(/^of\s+/i, '').trim();
  const [namePart, notePart] = splitTopLevelComma(rest);
  const ingredient = namePart.trim().replace(/[\s:;]+$/, '');
  if (!ingredient) return { original };
  const note = notePart.trim();

  const out = {
    original,
    quantity: qtyText,
    unit: unitText,
    ingredient,
    quantityValue: value,
  };
  if (max != null) out.quantityMax = max;
  if (unitKey) out.unitKey = unitKey;
  if (note) out.note = note;
  if (sizeNote) out.sizeNote = sizeNote;
  if (alt) out.alt = alt;
  return out;
}

/** Display name for an ingredient object (parsed or not). */
export function ingredientName(ing) {
  if (!ing) return '';
  return ing.ingredient || ing.original || '';
}

// ---------------------------------------------------------------------------
// Light pluralisation (countable nouns only — never guess on uncountables)
// ---------------------------------------------------------------------------

const COUNTABLE = new Set([
  'egg', 'onion', 'tomato', 'potato', 'carrot', 'lemon', 'lime', 'apple', 'banana', 'orange',
  'avocado', 'shallot', 'cucumber', 'pepper', 'peach', 'pear', 'tortilla', 'bun', 'roll',
  'cookie', 'patty', 'fillet', 'sausage', 'breast', 'thigh', 'drumstick', 'steak', 'chop',
  'slice', 'stalk', 'sprig', 'leaf', 'yolk', 'white', 'clove', 'bean', 'chili', 'chile', 'jalapeno',
  'mushroom', 'cracker', 'biscuit', 'muffin', 'bagel', 'wrap', 'pita', 'date', 'fig', 'plum', 'beet',
]);

function singularizeWord(w) {
  const lw = w.toLowerCase();
  if (/(ss|us|is)$/.test(lw)) return w; // hummus, asparagus, molasses, swiss
  if (lw.endsWith('ies') && lw.length > 4) return w.slice(0, -3) + 'y';
  if (/(oes)$/.test(lw)) return w.slice(0, -2);
  if (/(ches|shes|xes|sses)$/.test(lw)) return w.slice(0, -2);
  if (lw.endsWith('s') && !lw.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function pluralizeWord(w) {
  const lw = w.toLowerCase();
  if (lw.endsWith('s')) return w;
  if (/[^aeiou]y$/.test(lw)) return w.slice(0, -1) + 'ies';
  if (/(o)$/.test(lw) && /(tomato|potato|avocado)$/.test(lw) === false) return w + 's';
  if (/(tomato|potato)$/.test(lw)) return w + 'es';
  if (/(ch|sh|x)$/.test(lw)) return w + 'es';
  return w + 's';
}

/** Singular/plural toggle for the last word of a unitless ingredient head. */
function adjustNoun(text, value) {
  const m = text.match(/^([^(,]*?)(\s*)([(,].*)?$/);
  if (!m) return text;
  const head = m[1];
  const words = head.split(' ');
  const last = words[words.length - 1];
  if (!last) return text;
  const single = singularizeWord(last);
  if (!COUNTABLE.has(single.toLowerCase())) return text;
  const plural = value > 1 + 1e-9;
  words[words.length - 1] = plural ? pluralizeWord(single) : single;
  return words.join(' ') + (m[2] || '') + (m[3] || '');
}

/** Simplified key for matching the "same" ingredient across recipes. */
const DROP_WORDS = new Set([
  'fresh', 'large', 'medium', 'small', 'ripe', 'whole', 'boneless', 'skinless', 'chopped',
  'diced', 'minced', 'sliced', 'grated', 'shredded', 'peeled', 'organic', 'extra', 'finely',
  'roughly', 'optional', 'about', 'big', 'thinly', 'freshly', 'packed', 'heaping', 'level',
]);

export function normalizeName(name) {
  let n = String(name || '').toLowerCase();
  n = n.replace(/\([^)]*\)/g, ' ').split(',')[0];
  n = n.replace(/[^a-z0-9\s'-]/g, ' ');
  const words = n.split(/\s+/).filter((w) => w && !DROP_WORDS.has(w));
  if (!words.length) return n.trim();
  words[words.length - 1] = singularizeWord(words[words.length - 1]);
  return words.join(' ');
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

const ML_PER_TSP = 4.92892;
const G_PER_OZ = 28.3495;

function roundMl(ml) {
  if (ml < 100) return Math.max(5, Math.round(ml / 5) * 5);
  return Math.round(ml / 10) * 10;
}
function roundGrams(g) {
  if (g < 30) return Math.max(1, Math.round(g));
  return Math.round(g / 5) * 5;
}

/**
 * Convert one measurement to the requested system ('us' | 'metric').
 * `refValue` decides the target unit (so both ends of a range share a unit).
 * Returns { value, unit, unitKey, snap } or null when no safe conversion applies.
 * Only exact volume<->volume and weight<->weight conversions — never
 * volume<->weight. tsp/tbsp are left alone in metric mode (used worldwide).
 */
export function convertMeasure(value, unitKey, system, refValue = value) {
  const def = UNIT_BY_KEY.get(unitKey);
  if (!def || !CONVERTIBLE.has(def.fam)) return null;

  if (system === 'metric') {
    if (def.fam === 'vol-us') {
      if (unitKey === 'tsp' || unitKey === 'tbsp') return null;
      const ml = value * def.f * ML_PER_TSP;
      const refMl = refValue * def.f * ML_PER_TSP;
      if (refMl >= 1000) return { value: Math.round((ml / 1000) * 100) / 100, unit: 'l', unitKey: 'l' };
      return { value: roundMl(ml), unit: 'ml', unitKey: 'ml', exact: true };
    }
    if (def.fam === 'wt-us') {
      const g = value * def.f * G_PER_OZ;
      const refG = refValue * def.f * G_PER_OZ;
      if (refG >= 1000) return { value: Math.round((g / 1000) * 100) / 100, unit: 'kg', unitKey: 'kg' };
      return { value: roundGrams(g), unit: 'g', unitKey: 'g', exact: true };
    }
    return null;
  }

  if (system === 'us') {
    if (def.fam === 'vol-metric') {
      const ml = value * def.f;
      const refMl = refValue * def.f;
      if (refMl < 15) return { value: ml / ML_PER_TSP, unit: 'tsp', unitKey: 'tsp', snap: 0.25 };
      if (refMl < 60) return { value: ml / ML_PER_TSP / 3, unit: 'tbsp', unitKey: 'tbsp', snap: 0.25 };
      if (refMl < 950) return { value: ml / ML_PER_TSP / 48, unit: 'cup', unitKey: 'cup', snap: 0.125 };
      if (refMl < 3700) return { value: ml / ML_PER_TSP / 192, unit: 'quart', unitKey: 'quart', snap: 0.25 };
      return { value: ml / ML_PER_TSP / 768, unit: 'gallon', unitKey: 'gallon', snap: 0.25 };
    }
    if (def.fam === 'wt-metric') {
      const g = value * def.f;
      const refG = refValue * def.f;
      if (refG < 454) return { value: g / G_PER_OZ, unit: 'oz', unitKey: 'oz', snap: 0.25 };
      return { value: g / G_PER_OZ / 16, unit: 'lb', unitKey: 'lb', snap: 0.125 };
    }
    return null;
  }
  return null;
}

/**
 * Display label for a unit. Abbreviations the author typed ("tsp", "lb") are
 * kept as-is; full words follow singular/plural by value. After a conversion
 * (`canonical`) metric/US weight units use their short form ("g", "oz").
 */
function unitLabel(unitKey, originalText, value, canonical = false) {
  const def = UNIT_BY_KEY.get(unitKey);
  if (!def) return originalText || '';
  if (originalText && def.short) {
    const lo = originalText.toLowerCase().replace(/\./g, '').trim();
    if (def.short.includes(lo)) return originalText;
  }
  if (canonical && def.short && ['ml', 'l', 'g', 'kg', 'oz', 'lb', 'tsp', 'tbsp'].includes(def.key)) {
    return def.key === 'l' ? 'L' : def.short[0];
  }
  return value > 1 + 1e-9 ? def.plur : def.sing;
}

/**
 * Render an ingredient with a scale factor and/or unit system.
 * Unparsed ingredients (and anything uncertain) come back unchanged.
 *   renderIngredient(parse('1 1/2 cups flour'), { factor: 2 }) -> "3 cups flour"
 */
export function renderIngredient(ing, opts = {}) {
  const factor = opts.factor == null ? 1 : opts.factor;
  const system = opts.system || 'original';
  if (!ing) return '';
  if (ing.quantityValue == null || !isFinite(ing.quantityValue) || !(factor > 0) || !isFinite(factor)) {
    return ing.original || ing.ingredient || '';
  }

  let v = ing.quantityValue * factor;
  let mx = ing.quantityMax != null ? ing.quantityMax * factor : null;
  let unitText = ing.unit || '';
  let unitKey = ing.unitKey || '';
  let snap = 0;
  let converted = false;
  let alt = ing.alt || null;

  if (system !== 'original' && unitKey) {
    const ref = mx != null ? mx : v;
    const c1 = convertMeasure(v, unitKey, system, ref);
    if (c1) {
      const c2 = mx != null ? convertMeasure(mx, unitKey, system, ref) : null;
      v = c1.value;
      if (c2) mx = c2.value;
      unitKey = c1.unitKey;
      unitText = c1.unit;
      snap = c1.snap || 0;
      if (snap) {
        // Snap first so singular/plural follows what is actually displayed.
        v = Math.max(snap, Math.round(v / snap) * snap);
        if (mx != null) mx = Math.max(snap, Math.round(mx / snap) * snap);
      }
      converted = true;
      alt = null; // the equivalent measure would now be redundant
    }
  }

  if (!converted && factor === 1) return ing.original;

  const shown = mx != null ? mx : v;
  const qty = formatRange(v, mx, snap);
  const parts = [qty];
  if (ing.sizeNote) parts.push(ing.sizeNote);
  if (unitKey || unitText) parts.push(unitLabel(unitKey, converted ? '' : unitText, shown, converted));
  if (alt) {
    const av = alt.value * factor;
    parts.push(`(${formatQuantity(av)} ${alt.unit})`);
  }
  let name = ing.ingredient || '';
  if (!unitKey && !unitText && factor !== 1) name = adjustNoun(name, shown);
  parts.push(name);
  let text = parts.filter(Boolean).join(' ');
  if (ing.note) text += `, ${ing.note}`;
  return text;
}

/** Parse a servings string: "4", "Serves 4", "4-6 servings", "Makes 24 cookies". */
export function parseServings(text) {
  if (text == null) return null;
  const s = normalizeQuantityText(String(text));
  const n = readNumber(s.slice(Math.max(0, s.search(/\d/))));
  if (!n || s.search(/\d/) < 0) return null;
  return n.value > 0 && n.value < 10000 ? n.value : null;
}

/** Replace the first number in a yield string with the scaled one. */
export function scaleServingsText(text, newCount) {
  const s = String(text || '');
  if (!/\d/.test(s)) return String(newCount);
  return s.replace(/\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?/, String(formatQuantity(newCount)));
}

// ---------------------------------------------------------------------------
// Temperatures inside instruction text
// ---------------------------------------------------------------------------

const TEMP_RE = /(\d{2,3})\s?(?:°|º|˚|degrees?)\s?(F|C|Fahrenheit|Celsius)\b/gi;

/** Convert oven temperatures inside free text. system: 'us' | 'metric' | 'original'. */
export function convertTemperaturesInText(text, system) {
  if (!text || system === 'original' || !system) return text;
  return String(text).replace(TEMP_RE, (m, num, scale) => {
    const n = parseInt(num, 10);
    const isF = /^f/i.test(scale);
    if (system === 'metric' && isF && n >= 100 && n <= 600) {
      return `${Math.round((((n - 32) * 5) / 9) / 5) * 5}°C`;
    }
    if (system === 'us' && !isF && n >= 50 && n <= 320) {
      return `${Math.round(((n * 9) / 5 + 32) / 5) * 5}°F`;
    }
    return m;
  });
}

// ---------------------------------------------------------------------------
// Shopping: categories + consolidation
// ---------------------------------------------------------------------------

export const SHOPPING_CATEGORIES = ['Produce', 'Meat & Seafood', 'Dairy', 'Bakery', 'Pantry', 'Frozen', 'Other'];

// Ordered rules: first match wins. Specific pantry phrases come before the
// generic produce/meat/dairy words they would otherwise collide with.
const CATEGORY_RULES = [
  ['Frozen', /\b(frozen|ice cream|sorbet|popsicle)\b/],
  ['Pantry', /\b(coconut|almond|oat|soy|rice|cashew) milk\b|\b(peanut|almond|cashew|sunflower seed) butter\b|cream of (tartar|mushroom|chicken|celery)|\b(chicken|beef|vegetable|veggie|fish) (broth|stock|bouillon)\b|\b(tomato|curry|chili|chilli|garlic|onion|cocoa|baking|protein|mustard|ginger|cumin|paprika) (paste|sauce|powder|soda|flakes)\b|\bcanned\b|\bcan of\b|\b(black|white|cayenne|red|ground) pepper\b|peppercorns?|\b(lemon|lime|orange) juice\b|\bsoy sauce\b|\bhot sauce\b|\bfish sauce\b/],
  ['Meat & Seafood', /\b(chicken|beef|pork|bacon|sausages?|ham|turkey|lamb|steaks?|shrimps?|prawns?|salmon|tuna|cod|tilapia|halibut|fish|crab|lobster|scallops?|mussels?|clams?|anchov(y|ies)|mince|ribs?|brisket|prosciutto|chorizo|pancetta|veal|duck|meatballs?|hot dogs?|salami|pepperoni)\b/],
  ['Dairy', /\b(milk|butter|cheeses?|cheddar|mozzarella|parmesan|parmigiano|feta|ricotta|mascarpone|gouda|gruyere|brie|cream|yogh?urt|eggs?|ghee|buttermilk|half-and-half|creme fraiche|cottage cheese|paneer|halloumi)\b/],
  ['Produce', /\b(onions?|garlic|tomato(es)?|potato(es)?|carrots?|celery|peppers?|lettuce|spinach|kale|arugula|basil|cilantro|coriander|parsley|mint|dill|chives?|thyme|rosemary|sage|lemons?|limes?|apples?|bananas?|berries|strawberr(y|ies)|blueberr(y|ies)|raspberr(y|ies)|avocados?|cucumbers?|zucchini|courgettes?|mushrooms?|ginger|scallions?|green onions?|shallots?|leeks?|broccoli|cauliflower|cabbage|corn|squash|pumpkin|eggplant|aubergines?|peas|radish(es)?|beets?|beetroot|turnips?|parsnips?|sweet potato(es)?|yams?|oranges?|grapes?|mangos?|mangoes|pineapple|peaches|peach|pears?|plums?|cherries|melon|watermelon|kiwi|jalape[nñ]os?|chil(i|li|e)s?|herbs?|greens|asparagus|artichokes?|fennel|bok choy|sprouts|okra|plantains?|cassava|scotch bonnet)\b/],
  ['Bakery', /\b(breads?|buns?|rolls?|tortillas?|pita|baguette|bagels?|naan|croissants?|brioche|sourdough|flatbread|wraps?|english muffins?|ciabatta)\b/],
  ['Pantry', /\b(flour|sugar|salt|oil|vinegar|rice|pasta|noodles?|spaghetti|macaroni|penne|couscous|quinoa|oats?|oatmeal|cereal|honey|syrup|molasses|vanilla|yeast|baking|nuts?|almonds?|walnuts?|pecans?|cashews?|peanuts?|pistachios?|seeds?|lentils?|chickpeas?|beans?|stock|broth|bouillon|sauce|ketchup|mayo|mayonnaise|mustard|spices?|seasoning|cinnamon|cumin|paprika|oregano|turmeric|nutmeg|cloves?|cardamom|chocolate|cocoa|chips|raisins|dates|jam|jelly|wine|beer|coffee|tea|water|cornstarch|cornflour|breadcrumbs|panko|tahini|miso|tofu|coconut|olives?|capers|pickles?|dried|can|jar|extract|gelatin|sprinkles|marshmallows?|crackers?)\b/],
];

export function categorizeIngredient(name) {
  const n = String(name || '').toLowerCase();
  for (const [cat, re] of CATEGORY_RULES) if (re.test(n)) return cat;
  return 'Other';
}

/**
 * Build a shopping entry from an ingredient (parsed object or plain string),
 * scaled by `factor`. Entries carry everything needed to merge safely.
 */
export function makeShoppingEntry(ing, factor = 1) {
  const p = typeof ing === 'string' ? parseIngredient(ing) : ing || { original: '' };
  if (p.quantityValue == null) {
    const name = (p.original || p.ingredient || '').trim();
    return { name, key: `raw:${normalizeName(name)}`, value: null, max: null, unitKey: '', unit: '', fam: '', sizeNote: '', note: '', raw: true };
  }
  return {
    name: p.ingredient,
    key: normalizeName(p.ingredient),
    value: p.quantityValue * factor,
    max: p.quantityMax != null ? p.quantityMax * factor : null,
    unitKey: p.unitKey || '',
    unit: p.unit || '',
    fam: p.unitKey ? unitFamily(p.unitKey) : '',
    sizeNote: p.sizeNote || '',
    note: p.note || '',
    raw: false,
  };
}

/** Are two entries safe to add together? */
export function canMerge(a, b) {
  if (a.key !== b.key || a.sizeNote !== b.sizeNote) return false;
  if (a.raw || b.raw) return a.raw && b.raw;
  if (a.unitKey === b.unitKey) return true;
  // different units: only inside one exact-conversion family (tsp<->tbsp<->cup, oz<->lb, g<->kg, ml<->l)
  return !!a.fam && a.fam === b.fam && CONVERTIBLE.has(a.fam);
}

const UPGRADES = {
  tsp: [3, 'tbsp', 3], // 3 tsp -> 1 tbsp
  tbsp: [16, 'cup', 16],
  oz: [16, 'lb', 16],
  g: [1000, 'kg', 1000],
  ml: [1000, 'l', 1000],
};

/** Merge b into a (caller must have checked canMerge). Returns a new entry. */
export function mergeEntries(a, b) {
  if (a.raw) return { ...a };
  const out = { ...a };
  const da = UNIT_BY_KEY.get(a.unitKey);
  const db = UNIT_BY_KEY.get(b.unitKey);
  const factor = da && db ? db.f / da.f : 1; // b's unit expressed in a's unit
  out.value = a.value + b.value * factor;
  const aMax = a.max != null ? a.max : a.value;
  const bMax = b.max != null ? b.max : b.value;
  const maxTotal = aMax + bMax * factor;
  out.max = a.max != null || b.max != null ? maxTotal : null;
  // Tidy up: promote to a bigger unit when the total is large
  const up = UPGRADES[out.unitKey];
  if (up && out.value >= up[0]) {
    out.value = out.value / up[2];
    if (out.max != null) out.max = out.max / up[2];
    out.unitKey = up[1];
    out.unit = up[1];
  }
  if (b.note && !String(out.note || '').includes(b.note)) out.note = [out.note, b.note].filter(Boolean).join('; ');
  return out;
}

/** Text for an entry's quantity+unit, e.g. "3½ onions"-style: "3½" + " cup(s)". */
export function entryQuantityText(entry) {
  if (entry.value == null) return '';
  const shown = entry.max != null ? entry.max : entry.value;
  const qty = formatRange(entry.value, entry.max, 0);
  const unit = entry.unitKey ? unitLabel(entry.unitKey, entry.unit, shown) : '';
  return [qty, entry.sizeNote, unit].filter(Boolean).join(' ');
}

/** Count of unitless items needs a matching noun: "3½ onions". */
export function entryDisplayName(entry) {
  if (entry.value == null || entry.unitKey) return entry.name;
  const shown = entry.max != null ? entry.max : entry.value;
  return adjustNoun(entry.name, shown);
}

/**
 * Consolidate a list of entries: merge what can be merged safely, keep the
 * rest separate (1 cup milk + 250 ml milk stay two lines).
 */
export function consolidateEntries(entries) {
  const out = [];
  for (const e of entries) {
    const idx = out.findIndex((x) => canMerge(x, e));
    if (idx >= 0) out[idx] = mergeEntries(out[idx], e);
    else out.push({ ...e });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Unit-system helpers for the UI
// ---------------------------------------------------------------------------

export const UNIT_SYSTEMS = [
  { value: 'original', label: 'Original' },
  { value: 'us', label: 'US' },
  { value: 'metric', label: 'Metric' },
];
