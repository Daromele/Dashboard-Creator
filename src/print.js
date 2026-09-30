/**
 * print.js — printable layouts and text export. No server-side PDFs: the
 * browser's print dialog ("Save as PDF") does the work.
 *
 *   layout "card"  compact two-column recipe card
 *   layout "full"  full-page recipe with photo, larger type
 */
import { h, formatMinutes, formatDate, safeHttpUrl, fill } from './util.js';
import { renderIngredient, convertTemperaturesInText, scaleServingsText, parseServings } from './ingredients.js';
import { effectiveTotalMinutes } from './recipes.js';
import { imageUrl } from './images.js';

function scaledServings(recipe, factor) {
  if (!recipe.servings || factor === 1) return recipe.servings;
  const n = parseServings(recipe.servings);
  return n ? scaleServingsText(recipe.servings, n * factor) : recipe.servings;
}

function metaPairs(recipe, factor) {
  const pairs = [];
  if (recipe.prepTimeMinutes) pairs.push(['Prep', formatMinutes(recipe.prepTimeMinutes)]);
  if (recipe.cookTimeMinutes) pairs.push(['Cook', formatMinutes(recipe.cookTimeMinutes)]);
  const total = effectiveTotalMinutes(recipe);
  if (total) pairs.push(['Total', formatMinutes(total)]);
  const serv = scaledServings(recipe, factor);
  if (serv) pairs.push(['Serves', serv]);
  return pairs;
}

/** Build the printable DOM for a recipe (text only via h()). */
export function buildPrintLayout(recipe, { layout = 'full', factor = 1, system = 'original', includeNotes = true } = {}) {
  const ingredients = recipe.ingredients.map((i) => renderIngredient(i, { factor, system }));
  const pairs = metaPairs(recipe, factor);
  const source = safeHttpUrl(recipe.sourceUrl);
  const attribution = h('p', { class: 'print-source' },
    source ? `Source: ${recipe.sourceName || source}${recipe.author ? ` · by ${recipe.author}` : ''} — ${source}` : recipe.author ? `By ${recipe.author}` : '',
    recipe.basedOn && recipe.basedOn.url ? ` · My version, based on ${recipe.basedOn.title || 'the original'} (${recipe.basedOn.url})` : null);

  const ingredientList = h('ul', { class: 'print-ingredients' }, ingredients.map((t) => h('li', null, t)));
  const steps = h('div', { class: 'print-steps' }, recipe.instructionSections.map((s) => h('div', { class: 'print-section' },
    recipe.instructionSections.length > 1 || s.section !== 'Main' ? h('h3', null, s.section) : null,
    h('ol', null, s.steps.map((t) => h('li', null, convertTemperaturesInText(t, system)))))));
  const notes = includeNotes && recipe.notes.trim() ? h('div', { class: 'print-notes' }, h('h3', null, 'My Notes'), h('p', null, recipe.notes)) : null;
  const meta = h('p', { class: 'print-meta' }, pairs.map(([k, v]) => h('span', null, h('strong', null, `${k}: `), v)));

  const img = h('img', { class: 'print-photo', alt: '' });
  img.hidden = true;

  const root = h('article', { class: `print-recipe print-${layout}` },
    layout === 'full' ? img : null,
    h('h1', { class: 'print-title' }, recipe.title),
    meta,
    recipe.description && layout === 'full' ? h('p', { class: 'print-desc' }, recipe.description) : null,
    layout === 'card'
      ? h('div', { class: 'print-columns' },
        h('div', { class: 'print-col' }, h('h2', null, 'Ingredients'), ingredientList),
        h('div', { class: 'print-col' }, h('h2', null, 'Instructions'), steps))
      : h('div', null, h('h2', null, 'Ingredients'), ingredientList, h('h2', null, 'Instructions'), steps),
    notes,
    attribution);
  root.__photo = img;
  return root;
}

async function attachPhoto(recipe, article) {
  const img = article.__photo;
  if (!img) return;
  let src = '';
  if (recipe.imageId) src = await imageUrl(recipe.imageId, 'full').catch(() => '');
  if (!src) src = safeHttpUrl(recipe.image);
  if (!src) return;
  img.referrerPolicy = 'no-referrer';
  img.src = src;
  img.hidden = false;
  try { await Promise.race([img.decode(), new Promise((r) => setTimeout(r, 2500))]); } catch { img.hidden = true; }
}

/** Render into #print-root and open the browser print dialog. */
export async function printRecipe(recipe, opts = {}) {
  const root = document.getElementById('print-root');
  if (!root) return;
  const article = buildPrintLayout(recipe, opts);
  fill(root, article);
  root.dataset.layout = opts.layout || 'full';
  if ((opts.layout || 'full') === 'full') await attachPhoto(recipe, article);
  const prevTitle = document.title;
  document.title = recipe.title; // becomes the suggested PDF file name
  const restore = () => { document.title = prevTitle; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  window.print();
}

/** Plain-text version (for clipboard / messages). */
export function recipeAsText(recipe, { factor = 1, system = 'original' } = {}) {
  const lines = [recipe.title, ''];
  const pairs = metaPairs(recipe, factor);
  if (pairs.length) lines.push(pairs.map(([k, v]) => `${k}: ${v}`).join(' | '), '');
  lines.push('INGREDIENTS');
  for (const i of recipe.ingredients) lines.push(`- ${renderIngredient(i, { factor, system })}`);
  lines.push('');
  for (const s of recipe.instructionSections) {
    lines.push(s.section !== 'Main' || recipe.instructionSections.length > 1 ? s.section.toUpperCase() : 'INSTRUCTIONS');
    s.steps.forEach((t, n) => lines.push(`${n + 1}. ${convertTemperaturesInText(t, system)}`));
    lines.push('');
  }
  if (recipe.notes.trim()) lines.push('MY NOTES', recipe.notes.trim(), '');
  const source = safeHttpUrl(recipe.sourceUrl);
  if (source) lines.push(`Source: ${recipe.sourceName || ''} ${source}`.trim());
  if (recipe.lastMade) lines.push(`Last made ${formatDate(recipe.lastMade)}`);
  return lines.join('\n').trim();
}
