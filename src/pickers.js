/**
 * pickers.js — reusable dialogs that several screens share:
 *   pickRecipes()            search your library and choose one or many recipes
 *   servingsPickerDialog()   choose servings for each recipe before building a shopping list
 *   editRecipeCollections()  tick which collections a recipe belongs to
 */
import { h, debounce, formatMinutes, plural, fill } from './util.js';
import { icon } from './icons.js';
import { button, sheet, textInput, toast, nextId, checkboxRow } from './ui.js';
import { queryRecipes, getRecipe, recipeCount, effectiveTotalMinutes, baseServings } from './recipes.js';
import { recipeImage } from './images.js';
import { listCollections, createCollection, setRecipeCollections } from './collections.js';

const MAX_ROWS = 60;

/**
 * @returns {Promise<string[]|null>} ids of chosen recipes, or null if cancelled
 */
export function pickRecipes({ title = 'Choose recipes', multiple = true, confirmLabel = 'Add', exclude = [], initialText = '' } = {}) {
  return new Promise((resolve) => {
    const chosen = new Set();
    const excluded = new Set(exclude);
    const input = h('input', { type: 'search', class: 'search-input', placeholder: 'Search your recipes…', 'aria-label': 'Search your recipes', autocomplete: 'off', value: initialText });
    const list = h('div', { class: 'pick-list' });
    const note = h('p', { class: 'muted pick-note', 'aria-live': 'polite' });
    const confirmBtn = button({ label: confirmLabel, variant: 'primary', disabled: true, onClick: () => s.close([...chosen]) });

    const updateConfirm = () => {
      confirmBtn.disabled = chosen.size === 0;
      confirmBtn.querySelector('.btn-label').textContent = chosen.size ? `${confirmLabel} (${chosen.size})` : confirmLabel;
    };

    const paint = () => {
      const rows = queryRecipes({ text: input.value, sort: input.value ? 'recent' : 'alpha' }).filter((r) => !excluded.has(r.id));
      fill(list, );
      if (!rows.length) {
        note.textContent = recipeCount() ? 'No recipes match your search.' : 'Your library is empty. Add some recipes first.';
      } else {
        note.textContent = rows.length > MAX_ROWS ? `Showing ${MAX_ROWS} of ${rows.length}. Search to narrow the list.` : '';
      }
      for (const r of rows.slice(0, MAX_ROWS)) {
        const meta = [r.categories[0], formatMinutes(effectiveTotalMinutes(r))].filter(Boolean).join(' · ');
        const inner = [
          recipeImage(r, { variant: 'thumb', className: 'pick-thumb' }),
          h('span', { class: 'pick-text' }, h('span', { class: 'pick-title' }, r.title), meta ? h('span', { class: 'pick-meta' }, meta) : null),
        ];
        if (multiple) {
          const cid = nextId('pick');
          const cb = h('input', { type: 'checkbox', id: cid, checked: chosen.has(r.id), onchange: (e) => { if (e.target.checked) chosen.add(r.id); else chosen.delete(r.id); updateConfirm(); } });
          list.appendChild(h('label', { class: 'pick-row', for: cid }, cb, ...inner));
        } else {
          list.appendChild(h('button', { type: 'button', class: 'pick-row', onclick: () => s.close([r.id]) }, ...inner, icon('plus', { size: 18 })));
        }
      }
    };

    input.addEventListener('input', debounce(paint, 120));
    const s = sheet({
      title,
      size: 'lg',
      content: h('div', { class: 'stack' }, h('div', { class: 'search-box', role: 'search' }, icon('search', { size: 18, className: 'search-icon' }), input), note, list),
      footer: multiple ? [button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(null) }), confirmBtn] : [button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(null) })],
    });
    paint();
    updateConfirm();
    s.closed.then((r) => resolve(r));
    setTimeout(() => input.focus(), 40);
  });
}

/**
 * Choose servings per recipe. Resolves [{ recipeId, servings }] or null.
 * Recipes without a parseable yield are added "as written".
 */
export function servingsPickerDialog({ title = 'Choose servings', recipeIds, confirmLabel = 'Add', defaults = {} }) {
  return new Promise((resolve) => {
    const rows = [];
    const list = h('div', { class: 'stack servings-list' });
    for (const id of recipeIds) {
      const r = getRecipe(id);
      if (!r) continue;
      const base = baseServings(r);
      const start = defaults[id] || base;
      if (base) {
        const input = h('input', { type: 'number', class: 'input servings-input', min: '1', max: '999', step: '1', inputmode: 'numeric', value: String(start), id: nextId('srv') });
        rows.push({ id, input, base });
        list.appendChild(h('div', { class: 'servings-row' },
          h('label', { class: 'servings-title', for: input.id }, r.title, h('span', { class: 'field-hint' }, `Recipe makes ${r.servings}`)),
          input));
      } else {
        rows.push({ id, input: null, base: null });
        list.appendChild(h('div', { class: 'servings-row' }, h('span', { class: 'servings-title' }, r.title, h('span', { class: 'field-hint' }, 'No serving size listed — ingredients are added as written.'))));
      }
    }
    if (!rows.length) { resolve(null); return; }
    const submit = () => {
      const out = rows.map(({ id, input }) => {
        const v = input ? parseFloat(input.value) : NaN;
        return { recipeId: id, servings: v > 0 ? v : null };
      });
      s.close(out);
    };
    const s = sheet({
      title,
      size: 'md',
      content: h('div', { class: 'stack' }, h('p', { class: 'muted' }, `${plural(rows.length, 'recipe')}. Quantities are scaled to the servings you pick.`), list),
      footer: [button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(null) }), button({ label: confirmLabel, variant: 'primary', onClick: submit })],
    });
    s.closed.then((r) => resolve(r));
  });
}

/** Tick/untick collections for one recipe (and create new ones inline). */
export function editRecipeCollections(recipeId) {
  return new Promise((resolve) => {
    const r = getRecipe(recipeId);
    if (!r) { resolve(false); return; }
    const selected = new Set(r.collections);
    const listEl = h('div', { class: 'stack check-list' });
    const newInput = textInput({ placeholder: 'New collection name', maxlength: 60, 'aria-label': 'New collection name' });
    const newError = h('p', { class: 'field-error', role: 'alert', hidden: true });

    const paint = () => {
      const cols = listCollections();
      fill(listEl, ...(cols.length
        ? cols.map((c) => checkboxRow({ label: c.name, checked: selected.has(c.id), onChange: (on) => { if (on) selected.add(c.id); else selected.delete(c.id); } }))
        : [h('p', { class: 'muted' }, 'You have no collections yet. Create one below.')]));
    };
    const addNew = async () => {
      const name = newInput.value.trim();
      if (!name) return;
      try {
        const c = await createCollection(name);
        selected.add(c.id);
        newInput.value = '';
        newError.hidden = true;
        paint();
      } catch (e) { newError.textContent = e.message; newError.hidden = false; }
    };
    newInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addNew(); } });

    paint();
    const s = sheet({
      title: 'Collections',
      content: h('div', { class: 'stack' },
        listEl,
        h('div', { class: 'inline-form' }, newInput, button({ label: 'Create', icon: 'plus', variant: 'secondary', onClick: addNew })),
        newError),
      footer: [
        button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(false) }),
        button({ label: 'Save', variant: 'primary', onClick: async () => { await setRecipeCollections(recipeId, [...selected]); toast('Collections updated.', { tone: 'success' }); s.close(true); } }),
      ],
    });
    s.closed.then((ok) => resolve(ok === true));
  });
}
