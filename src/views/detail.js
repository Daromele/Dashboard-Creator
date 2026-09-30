/**
 * views/detail.js — the recipe screen, optimised for actually cooking:
 * big readable ingredients/steps, serving scaling, unit conversion,
 * step timers, personal notes, rating, cooking history.
 */
import {
  h, formatMinutes, formatDate, safeHttpUrl, hostOf, debounce, isoDate, parseIsoDate, copyText, slugify, plural, fill,
} from '../util.js';
import { icon } from '../icons.js';
import {
  button, iconButton, chip, segmented, starRating, emptyState, toast, confirmDialog, actionSheet, sheet, field, selectInput, badge, textArea,
} from '../ui.js';
import {
  getRecipe, onRecipesChange, toggleFavorite, setRating, setNotes, markMade, undoMade, getHistory, duplicateRecipe, deleteRecipes,
  setInbox, baseServings, effectiveTotalMinutes, saveRecipe,
} from '../recipes.js';
import { renderIngredient, convertTemperaturesInText, UNIT_SYSTEMS, formatQuantity, scaleServingsText } from '../ingredients.js';
import { detectDurations, startTimer, notificationState, requestNotificationPermission } from '../timers.js';
import { recipeImage, deleteImage } from '../images.js';
import { getSetting } from '../settings.js';
import { session, checkedSet } from '../state.js';
import { navigate } from '../router.js';
import { getCollection } from '../collections.js';
import { editRecipeCollections, servingsPickerDialog } from '../pickers.js';
import { addFromRecipes } from '../shopping.js';
import { addEntry, SLOTS, weekKey } from '../mealplanner.js';
import { printRecipe, recipeAsText } from '../print.js';
import { downloadBackup } from '../backup.js';

export function renderDetail({ params }) {
  const id = params.id;
  if (!getRecipe(id)) {
    return {
      title: 'Recipe not found',
      el: h('section', { class: 'view' }, emptyState({
        iconName: 'search', title: 'Recipe not found', text: 'It may have been deleted, or the link is out of date.',
        actions: [button({ label: 'Back to My Recipes', variant: 'primary', onClick: () => navigate('#/recipes') })],
      })),
    };
  }

  let recipe = getRecipe(id);
  const base = () => baseServings(recipe);

  // view state -----------------------------------------------------------------
  const initialServings = () => {
    if (session.servings.has(id)) return session.servings.get(id);
    if (getSetting('servingsBehavior') === 'remember' && recipe.preferredServings) return recipe.preferredServings;
    return base();
  };
  let servings = initialServings(); // number | null
  let multiplier = 1; // used when the recipe has no parseable yield
  let system = session.unitSystem || getSetting('unitSystem');
  let notesSaving = false;

  const factor = () => (base() && servings ? servings / base() : multiplier);

  // regions ---------------------------------------------------------------------
  const headEl = h('div');
  const summaryEl = h('div');
  const controlsEl = h('div');
  const ingredientsEl = h('div');
  const instructionsEl = h('div');
  const metaEl = h('div');
  const notesStatus = h('span', { class: 'field-hint notes-status', 'aria-live': 'polite' });
  const notesArea = textArea({ rows: 4, value: recipe.notes, id: 'my-notes', placeholder: 'Use less sugar next time. Kids liked this. Add spinach…' });
  let notesDirty = false;
  const saveNotes = debounce(async () => {
    if (!notesDirty) return;
    notesDirty = false;
    notesSaving = true;
    try { await setNotes(id, notesArea.value); notesStatus.textContent = 'Saved'; } catch { notesStatus.textContent = 'Couldn’t save — try again'; }
    notesSaving = false;
  }, 700);
  notesArea.addEventListener('input', () => { notesDirty = true; notesStatus.textContent = 'Saving…'; saveNotes(); });
  notesArea.addEventListener('blur', () => saveNotes.flush());
  const notesEl = h('section', { class: 'card-section stack' },
    h('h2', { class: 'section-title' }, 'My Notes'),
    h('label', { class: 'sr-only', for: 'my-notes' }, 'My notes for this recipe'),
    notesArea,
    h('p', { class: 'field-hint' }, 'Your notes are private and stay separate from the original instructions. ', notesStatus));

  const root = h('article', { class: 'view view-detail' }, headEl, summaryEl, controlsEl, ingredientsEl, instructionsEl, notesEl, metaEl);

  // header -------------------------------------------------------------------------
  function paintHead() {
    const url = safeHttpUrl(recipe.sourceUrl);
    const based = recipe.basedOn;
    const basedUrl = based && safeHttpUrl(based.url);
    const sourceLine = h('p', { class: 'source-line' },
      url ? ['From ', h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, recipe.sourceName || hostOf(url)), recipe.author ? ` · by ${recipe.author}` : null]
        : recipe.author ? `By ${recipe.author}` : recipe.sample ? 'A fictional sample recipe for trying the app' : 'My own recipe');
    const basedLine = based ? h('p', { class: 'source-line based-on' }, icon('copy', { size: 14 }), ' My Version · Based on ',
      basedUrl ? h('a', { href: basedUrl, target: '_blank', rel: 'noopener noreferrer' }, based.title || based.sourceName || hostOf(basedUrl)) : (based.title || 'another recipe'),
      based.sourceName && based.title ? ` (${based.sourceName})` : null) : null;

    const fav = h('button', {
      type: 'button', class: `btn btn-secondary btn-fav${recipe.favorite ? ' is-on' : ''}`, 'aria-pressed': String(recipe.favorite),
      onclick: () => toggleFavorite(id),
    }, icon('heart', { size: 18 }), h('span', { class: 'btn-label' }, recipe.favorite ? 'Favorited' : 'Favorite'));

    const rating = h('div', { class: 'rating-row' },
      h('span', { class: 'rating-label', id: 'rating-label' }, 'Your rating'),
      starRating({ value: recipe.personalRating, label: 'Your rating', onChange: (v) => setRating(id, v) }));

    const madeLine = recipe.madeCount
      ? `Made ${plural(recipe.madeCount, 'time')}${recipe.lastMade ? ` · Last made ${formatDate(recipe.lastMade)}` : ''}`
      : 'Not made yet';

    fill(headEl, 
      h('a', { class: 'back-link', href: session.lastListHash || '#/recipes' }, icon('left', { size: 18 }), 'Recipes'),
      recipe.imageId || safeHttpUrl(recipe.image) ? h('div', { class: 'hero' }, recipeImage(recipe, { variant: 'full', className: 'hero-img', alt: '', eager: true })) : null,
      h('div', { class: 'detail-head stack' },
        h('div', { class: 'badge-row' }, recipe.sample ? badge('Sample Recipe', 'sample') : null, recipe.inbox ? badge('In Inbox', 'inbox') : null, recipe.basedOn ? badge('My Version', 'neutral') : null),
        h('h1', { class: 'recipe-title' }, recipe.title),
        sourceLine, basedLine,
        url ? h('a', { class: 'btn btn-secondary btn-block-mobile', href: url, target: '_blank', rel: 'noopener noreferrer' }, icon('external', { size: 18 }), h('span', { class: 'btn-label' }, 'View Original Recipe')) : null,
        recipe.description ? h('p', { class: 'recipe-desc' }, recipe.description) : null,
        recipe.inbox ? h('div', { class: 'callout' }, icon('inbox', { size: 18 }), h('div', null, h('p', null, 'This recipe is in your Inbox. Add categories or collections, then move it out.'), h('div', { class: 'callout-actions' },
          button({ label: 'Organize…', variant: 'secondary', className: 'btn-sm', onClick: () => editRecipeCollections(id) }),
          button({ label: 'Move out of Inbox', variant: 'primary', className: 'btn-sm', onClick: async () => { await setInbox(id, false); toast('Moved out of your Inbox.', { tone: 'success' }); } })))) : null,
        h('div', { class: 'action-row' }, fav, rating),
        h('div', { class: 'cook-row' },
          button({ label: 'Start Cooking', icon: 'play', variant: 'primary', className: 'btn-lg', onClick: startCooking }),
          button({ label: 'Made It', icon: 'check', variant: 'secondary', className: 'btn-lg', onClick: madeIt })),
        h('p', { class: 'made-line', 'aria-live': 'polite' }, madeLine),
        h('div', { class: 'tool-row' },
          button({ label: 'Edit', icon: 'edit', onClick: () => navigate(`#/recipe/${encodeURIComponent(id)}/edit`) }),
          button({ label: 'Meal Plan', icon: 'calendar', attrs: { 'aria-label': 'Add to Meal Plan' }, onClick: addToPlan }),
          button({ label: 'Shopping', icon: 'cart', attrs: { 'aria-label': 'Add Ingredients to Shopping List' }, onClick: addToShopping }),
          button({ label: 'Print', icon: 'printer', attrs: { 'aria-label': 'Print or export' }, onClick: openExport }),
          button({ label: 'More', icon: 'more', attrs: { 'aria-label': 'More actions' }, onClick: openMore }))));
  }

  function paintSummary() {
    const items = [
      ['Prep', formatMinutes(recipe.prepTimeMinutes)],
      ['Cook', formatMinutes(recipe.cookTimeMinutes)],
      ['Total', formatMinutes(effectiveTotalMinutes(recipe))],
      ['Servings', recipe.servings ? (servings && base() && servings !== base() ? scaleServingsText(recipe.servings, servings) : recipe.servings) : ''],
      ['Cuisine', recipe.cuisine.join(', ')],
      ['Category', recipe.categories.join(', ')],
    ].filter(([, v]) => v);
    fill(summaryEl, items.length ? h('dl', { class: 'summary-grid' }, items.map(([k, v]) => h('div', { class: 'summary-item' }, h('dt', null, k), h('dd', null, v)))) : null);
  }

  // scaling + units ---------------------------------------------------------------------
  function paintControls() {
    const b = base();
    const scaled = factor() !== 1;
    let scale;
    if (b) {
      const presets = [...new Set([Math.max(1, Math.round(b / 2)), b, Math.round(b * 1.5), b * 2, b * 3].map((x) => Math.round(x)))].sort((x, y) => x - y);
      const dec = iconButton({ icon: 'minus', label: 'Fewer servings', variant: 'secondary', disabled: servings <= 1, onClick: () => setServings(Math.max(1, Math.ceil(servings) - 1)) });
      const inc = iconButton({ icon: 'plus', label: 'More servings', variant: 'secondary', onClick: () => setServings(Math.floor(servings) + 1) });
      scale = h('div', { class: 'scale-block' },
        h('div', { class: 'stepper', role: 'group', 'aria-label': 'Servings' }, dec, h('div', { class: 'stepper-value', 'aria-live': 'polite' }, h('strong', null, formatQuantity(servings)), h('span', null, ' servings')), inc),
        h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Quick servings' }, presets.map((n) => chip({ label: String(n), selected: servings === n, onClick: () => setServings(n) }))));
    } else {
      const mult = [0.5, 1, 2, 3];
      scale = h('div', { class: 'scale-block' },
        h('p', { class: 'field-hint' }, 'This recipe doesn’t list a serving size, so scale it by a multiple.'),
        h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Scale recipe' }, mult.map((m) => chip({ label: m === 0.5 ? '½×' : `${m}×`, selected: multiplier === m, onClick: () => { multiplier = m; paintControls(); paintIngredients(); paintSummary(); } }))));
    }
    const units = segmented({
      label: 'Units', options: UNIT_SYSTEMS, value: system,
      onChange: (v) => { system = v; session.unitSystem = v; paintIngredients(); paintInstructions(); },
    });
    fill(controlsEl, h('section', { class: 'card-section stack controls' },
      h('div', { class: 'controls-row' },
        h('div', null, h('h2', { class: 'control-title' }, 'Servings'), scale),
        h('div', null, h('h2', { class: 'control-title' }, 'Units'), units)),
      scaled ? h('p', { class: 'field-hint' }, 'Amounts are scaled. Ingredients that can’t be scaled safely are left as written, and the original recipe is never changed.', ' ',
        h('button', { type: 'button', class: 'link-btn', onClick: () => { servings = base(); multiplier = 1; session.servings.delete(id); paintAll(); } }, 'Reset to original')) : null,
      system !== 'original' ? h('p', { class: 'field-hint' }, 'Unit conversion only changes volume ↔ volume and weight ↔ weight. Cups are never converted to grams.') : null));
  }

  function setServings(n) {
    servings = Math.max(0.5, n);
    session.servings.set(id, servings);
    if (getSetting('servingsBehavior') === 'remember') saveRecipe({ ...recipe, preferredServings: servings }, { touch: false, silent: true }).catch(() => {});
    paintControls(); paintSummary(); paintIngredients();
  }

  // ingredients ---------------------------------------------------------------------------
  function paintIngredients() {
    const checked = checkedSet(id);
    const f = factor();
    if (!recipe.ingredients.length) {
      fill(ingredientsEl, h('section', { class: 'card-section stack' }, h('h2', { class: 'section-title' }, 'Ingredients'), h('p', { class: 'muted' }, 'No ingredients yet. '), button({ label: 'Add ingredients', variant: 'secondary', onClick: () => navigate(`#/recipe/${encodeURIComponent(id)}/edit`) })));
      return;
    }
    const items = recipe.ingredients.map((ing, i) => {
      const text = renderIngredient(ing, { factor: f, system });
      const cid = `ing-${i}`;
      const changed = text !== ing.original;
      return h('li', { class: `ingredient${checked.has(i) ? ' is-checked' : ''}` },
        h('input', { type: 'checkbox', id: cid, checked: checked.has(i), onchange: (e) => { if (e.target.checked) checked.add(i); else checked.delete(i); paintIngredients(); setTimeout(() => { const el = document.getElementById(cid); if (el) el.focus(); }, 0); } }),
        h('label', { for: cid, title: changed ? `Original: ${ing.original}` : null }, text));
    });
    fill(ingredientsEl, h('section', { class: 'card-section stack' },
      h('div', { class: 'section-head' }, h('h2', { class: 'section-title' }, 'Ingredients'),
        checked.size ? h('button', { type: 'button', class: 'link-btn', onclick: () => { checked.clear(); paintIngredients(); } }, 'Clear checks') : null),
      h('ul', { class: 'ingredient-list' }, items)));
  }

  // instructions -----------------------------------------------------------------------------
  function paintInstructions() {
    if (!recipe.instructionSections.length) {
      fill(instructionsEl, h('section', { class: 'card-section stack' }, h('h2', { class: 'section-title' }, 'Instructions'), h('p', { class: 'muted' }, 'No instructions yet.'), button({ label: 'Add instructions', variant: 'secondary', onClick: () => navigate(`#/recipe/${encodeURIComponent(id)}/edit`) })));
      return;
    }
    const multi = recipe.instructionSections.length > 1;
    const blocks = recipe.instructionSections.map((s) => h('div', { class: 'instruction-section' },
      multi || s.section !== 'Main' ? h('h3', { class: 'subsection-title' }, s.section) : null,
      h('ol', { class: 'steps' }, s.steps.map((raw) => {
        const text = convertTemperaturesInText(raw, system);
        const timers = detectDurations(text);
        return h('li', { class: 'step' },
          h('p', null, text),
          timers.length ? h('div', { class: 'timer-row' }, timers.map((t) => h('button', {
            type: 'button', class: 'timer-btn',
            title: t.secondsMax > t.seconds ? `Range in recipe: ${t.text}` : null,
            onclick: () => beginTimer(t),
          }, icon('timer', { size: 16 }), `Start ${t.label} timer`))) : null);
      }))));
    fill(instructionsEl, h('section', { class: 'card-section stack' }, h('h2', { class: 'section-title' }, 'Instructions'), ...blocks));
  }

  function beginTimer(t) {
    startTimer({ label: `${t.label} timer`, seconds: t.seconds, recipeId: id, recipeTitle: recipe.title });
    toast(`${t.label} timer started.`, { tone: 'success' });
    if (notificationState() === 'default') {
      toast('Want an alert when timers finish, even with the app in the background?', { action: { label: 'Enable alerts', onClick: () => requestNotificationPermission() }, duration: 9000 });
    }
  }

  // tags / collections / source info / history ---------------------------------------------------
  async function paintMeta() {
    const cols = recipe.collections.map(getCollection).filter(Boolean);
    const history = recipe.madeCount ? await getHistory(id) : [];
    const sr = recipe.sourceRating;
    fill(metaEl, 
      h('section', { class: 'card-section stack' },
        h('h2', { class: 'section-title' }, 'Tags & collections'),
        recipe.tags.length ? h('div', { class: 'chip-row wrap' }, recipe.tags.map((t) => h('a', { class: 'chip chip-link', href: `#/recipes?tag=${encodeURIComponent(t)}` }, icon('tag', { size: 13 }), t))) : h('p', { class: 'muted' }, 'No tags.'),
        h('div', { class: 'chip-row wrap' }, cols.length ? cols.map((c) => h('a', { class: 'chip chip-link', href: `#/collection/${encodeURIComponent(c.id)}` }, icon('folder', { size: 13 }), c.name)) : h('span', { class: 'muted' }, 'Not in any collection.'),
          button({ label: 'Edit collections', icon: 'folder', variant: 'ghost', className: 'btn-sm', onClick: () => editRecipeCollections(id) }))),
      sr || recipe.nutrition ? h('section', { class: 'card-section stack' },
        h('h2', { class: 'section-title' }, 'From the source'),
        sr ? h('p', { class: 'source-rating' }, `Rated ${sr.value}/5${sr.count ? ` by ${sr.count.toLocaleString()} people` : ''} on ${recipe.sourceName || 'the original site'}.`, h('span', { class: 'field-hint' }, ' This is the website’s rating, separate from yours.')) : null,
        recipe.nutrition ? h('details', { class: 'details' }, h('summary', null, 'Nutrition (as published by the source)'), h('dl', { class: 'nutrition' }, Object.entries(recipe.nutrition).map(([k, v]) => h('div', null, h('dt', null, nutritionLabel(k)), h('dd', null, v))))) : null) : null,
      history.length ? h('section', { class: 'card-section stack' },
        h('details', { class: 'details' }, h('summary', null, `Cooking history (${history.length})`), h('ul', { class: 'history-list' }, history.slice(0, 15).map((e) => h('li', null, formatDate(e.madeAt)))))) : null);
  }

  const nutritionLabel = (k) => k.replace(/Content$/, '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

  // actions ------------------------------------------------------------------------------------------
  function startCooking() {
    session.servings.set(id, servings);
    navigate(`#/cook/${encodeURIComponent(id)}`);
  }

  async function madeIt() {
    const res = await markMade(id);
    if (!res) return;
    toast(`Nice! Marked as made — ${plural(res.recipe.madeCount, 'time')} now.`, { tone: 'success', action: { label: 'Undo', onClick: () => undoMade(id, res.entry.id) } });
  }

  async function addToShopping() {
    const picks = await servingsPickerDialog({ title: 'Add to shopping list', recipeIds: [id], defaults: servings ? { [id]: servings } : {}, confirmLabel: 'Add ingredients' });
    if (!picks) return;
    const res = await addFromRecipes(picks);
    toast(`Ingredients added to your shopping list${res.merged ? ` (${res.merged} combined with items already there)` : ''}.`, { tone: 'success', action: { label: 'View list', onClick: () => navigate('#/shopping') } });
  }

  function addToPlan() {
    const today = new Date();
    const dateInput = h('input', { type: 'date', class: 'input', value: isoDate(today) });
    const slotSel = selectInput({ options: SLOTS.map((s) => ({ value: s.id, label: s.label })), value: 'dinner' });
    const dateField = field({ label: 'Date', control: dateInput });
    const s = sheet({
      title: 'Add to Meal Plan', size: 'sm',
      content: h('div', { class: 'stack' }, dateField, field({ label: 'Meal', control: slotSel })),
      footer: [button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(null) }), button({
        label: 'Add to plan', variant: 'primary',
        onClick: () => {
          const d = parseIsoDate(dateInput.value);
          if (!d) { dateField.setError('Choose a date.'); return; }
          s.close({ d, slot: slotSel.value });
        },
      })],
    });
    s.closed.then(async (r) => {
      if (!r) return;
      const week = weekKey(r.d);
      const day = (r.d.getDay() + 6) % 7;
      await addEntry(week, { day, slot: r.slot, recipeId: id, servings });
      toast('Added to your meal plan.', { tone: 'success', action: { label: 'View plan', onClick: () => navigate(`#/plan?week=${week}`) } });
    });
  }

  function openExport() {
    actionSheet({
      title: 'Print / Export',
      actions: [
        { label: 'Print — Recipe Card layout', icon: 'printer', hint: 'Compact two-column card', onSelect: () => printRecipe(recipe, { layout: 'card', factor: factor(), system }) },
        { label: 'Print — Full Page layout', icon: 'printer', hint: 'Large type with photo. Choose “Save as PDF” in the print dialog.', onSelect: () => printRecipe(recipe, { layout: 'full', factor: factor(), system }) },
        { label: 'Download recipe as JSON', icon: 'download', hint: 'Can be restored from Settings → Restore Backup', onSelect: async () => { try { await downloadBackup({ recipeIds: [id], fileName: `${slugify(recipe.title)}.json` }); toast('Recipe exported.', { tone: 'success' }); } catch { toast('The export could not be created.', { tone: 'error' }); } } },
        { label: 'Copy as text', icon: 'copy', onSelect: async () => toast((await copyText(recipeAsText(recipe, { factor: factor(), system }))) ? 'Recipe copied.' : 'Copying isn’t available here.', { tone: 'success' }) },
      ],
    });
  }

  function openMore() {
    actionSheet({
      title: recipe.title,
      actions: [
        { label: 'Create My Version', icon: 'copy', hint: 'An editable copy that keeps “Based on” attribution', onSelect: async () => { const copy = await duplicateRecipe(id, { asMyVersion: true }); toast('Created your version. Make it yours!', { tone: 'success' }); navigate(`#/recipe/${encodeURIComponent(copy.id)}/edit`); } },
        { label: 'Duplicate', icon: 'copy', hint: 'A plain copy of this recipe', onSelect: async () => { const copy = await duplicateRecipe(id, { asMyVersion: false }); toast('Recipe duplicated.', { tone: 'success' }); navigate(`#/recipe/${encodeURIComponent(copy.id)}`); } },
        { label: 'Collections…', icon: 'folder', onSelect: () => editRecipeCollections(id) },
        recipe.inbox ? { label: 'Move out of Inbox', icon: 'inbox', onSelect: () => setInbox(id, false) } : { label: 'Move to Inbox', icon: 'inbox', onSelect: () => setInbox(id, true) },
        { label: 'Delete recipe…', icon: 'trash', danger: true, onSelect: deleteIt },
      ],
    });
  }

  async function deleteIt() {
    const ok = await confirmDialog({
      title: 'Delete this recipe?',
      message: `“${recipe.title}” will be permanently removed from this device, along with your notes and cooking history. Meal plan entries for it are removed too.`,
      confirmLabel: 'Delete recipe', danger: true,
    });
    if (!ok) return;
    navigate(session.lastListHash || '#/recipes', { replace: true });
    await deleteRecipes([id], { imageCleanup: deleteImage });
    toast('Recipe deleted.');
  }

  // painting -------------------------------------------------------------------------------------------
  function paintAll() {
    paintHead(); paintSummary(); paintControls(); paintIngredients(); paintInstructions();
    paintMeta().catch(console.error);
  }

  paintAll();
  const unsub = onRecipesChange((evt) => {
    if (evt.id !== id && !(evt.ids && evt.ids.includes(id))) return;
    if (evt.type === 'remove') return;
    const fresh = getRecipe(id);
    if (!fresh) return;
    recipe = fresh;
    if (notesSaving) return; // our own notes autosave: don't disturb typing
    if (document.activeElement !== notesArea && notesArea.value !== recipe.notes) notesArea.value = recipe.notes;
    paintAll();
  });

  return { el: root, title: recipe.title, destroy() { unsub(); saveNotes.flush(); } };
}
