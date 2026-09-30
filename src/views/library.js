/**
 * views/library.js — the recipe browser (My Recipes, and each collection's page).
 *
 * Performance notes (targets 2,000+ recipes):
 *   - all data is in memory; search is a substring scan over precomputed text
 *   - the grid renders in chunks (48 at a time, more on scroll / "Show more")
 *   - card elements are cached by a signature, so a small change (favourite,
 *     rating) rebuilds one card instead of the whole grid
 *   - images are thumbnails, loaded lazily when near the viewport
 *   - typing in search is debounced
 */
import { h, debounce, formatMinutes, plural, isoDate, fill } from '../util.js';
import { icon } from '../icons.js';
import {
  button, iconButton, chip, emptyState, pageHeader, choiceDialog, sheet, field, selectInput, confirmDialog,
  toast, ratingDisplay, badge, actionSheet, promptDialog,
} from '../ui.js';
import {
  queryRecipes, facets, allRecipes, recipeCount, inboxCount, onRecipesChange, SORT_OPTIONS, QUICK_FILTERS,
  toggleFavorite, deleteRecipes, getRecipe, setInbox, effectiveTotalMinutes,
} from '../recipes.js';
import { recipeImage, deleteImage } from '../images.js';
import {
  listCollections, onCollectionsChange, getCollection, addRecipesToCollection, removeRecipesFromCollection, createCollection,
} from '../collections.js';
import { session } from '../state.js';
import { navigate } from '../router.js';
import { loadSampleData } from '../sample-data.js';
import { downloadBackup } from '../backup.js';
import { addFromRecipes } from '../shopping.js';
import { servingsPickerDialog } from '../pickers.js';

const PAGE = 48;

export function renderLibrary({ query }) {
  // Deep links like #/recipes?quick=inbox
  if (query.quick) { session.library.quick = query.quick; }
  if (query.tag) { session.library.tag = query.tag; }
  if (query.collection) { session.library.collection = query.collection; }
  if (query.category) { session.library.category = query.category; }
  return createBrowser({ title: 'My Recipes', state: session.library, primaryActions: true });
}

/**
 * @param {object} o
 * @param {string} o.title
 * @param {object} o.state        filter/sort state object (mutated in place)
 * @param {string} [o.fixedCollection] lock the list to one collection (collection pages)
 * @param {object} [o.header]     pageHeader overrides (subtitle/actions/back)
 */
export function createBrowser({ title, state, fixedCollection = '', header = {}, primaryActions = false }) {
  let results = [];
  let shown = PAGE;
  let selecting = false;
  const selected = new Set();
  const cardCache = new Map();
  const unsubs = [];
  let destroyed = false;

  const effective = () => ({ ...state, collection: fixedCollection || state.collection });

  // ---- header ---------------------------------------------------------------
  const countEl = h('p', { class: 'result-count', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const headerEl = h('div');
  const buildHeader = () => {
    const actions = header.actions || (primaryActions ? [
      button({ label: 'Import Recipe', icon: 'download', variant: 'primary', onClick: () => navigate('#/import') }),
      button({ label: 'New', icon: 'plus', variant: 'secondary', attrs: { 'aria-label': 'Create a recipe manually' }, onClick: () => navigate('#/new') }),
    ] : null);
    fill(headerEl, pageHeader({ title, subtitle: header.subtitle, actions, back: header.back }));
  };

  // ---- search ---------------------------------------------------------------
  const searchInput = h('input', {
    type: 'search', class: 'search-input', placeholder: 'Search your recipes', value: state.text,
    'aria-label': 'Search recipes', autocomplete: 'off', enterkeyhint: 'search', spellcheck: 'false',
  });
  const clearBtn = iconButton({ icon: 'x', label: 'Clear search', size: 16, onClick: () => { searchInput.value = ''; state.text = ''; searchInput.focus(); apply(true); } });
  clearBtn.hidden = !state.text;
  const onSearch = debounce(() => { state.text = searchInput.value; clearBtn.hidden = !state.text; apply(true); }, 140);
  searchInput.addEventListener('input', onSearch);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onSearch.flush(); searchInput.blur(); } });
  const searchBox = h('div', { class: 'search-box', role: 'search' }, icon('search', { size: 18, className: 'search-icon' }), searchInput, clearBtn);

  // ---- toolbar ----------------------------------------------------------------
  const filterBtn = button({ label: 'Filter', icon: 'filter', onClick: openFilters, className: 'btn-tool' });
  const sortBtn = button({ label: 'Sort', icon: 'sort', onClick: openSort, className: 'btn-tool' });
  const selectBtn = button({ label: 'Select', icon: 'checkSquare', onClick: () => setSelecting(!selecting), className: 'btn-tool' });
  const toolbar = h('div', { class: 'toolbar' }, filterBtn, sortBtn, selectBtn);
  const chipsEl = h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Quick filters' });

  const gridEl = h('div', { class: 'recipe-grid' });
  const moreBtn = button({ label: 'Show more', variant: 'secondary', onClick: () => { shown += PAGE; paint(); } });
  const moreWrap = h('div', { class: 'more-wrap' }, moreBtn);
  const emptyWrap = h('div');
  const bulkBar = h('div', { class: 'bulk-bar', hidden: true, role: 'region', 'aria-label': 'Bulk actions' });

  const root = h('section', { class: 'view view-library' }, headerEl, searchBox, toolbar, chipsEl, countEl, emptyWrap, gridEl, moreWrap, bulkBar);

  // infinite scroll: reveal the next chunk when the button nears the viewport
  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting) && !moreWrap.hidden) { shown += PAGE; paint(); } }, { rootMargin: '400px' });
    io.observe(moreBtn);
  }

  // ---- filtering -----------------------------------------------------------------
  function activeAdvancedCount() {
    return [state.category, state.cuisine, fixedCollection ? '' : state.collection, state.tag].filter(Boolean).length;
  }

  function apply(resetPaging) {
    if (destroyed) return;
    if (resetPaging) shown = PAGE;
    results = queryRecipes({ ...effective() });
    // drop selections that no longer exist
    for (const id of [...selected]) if (!getRecipe(id)) selected.delete(id);
    paint();
  }

  const reapply = debounce(() => apply(false), 40);

  function paintChips() {
    const items = [...QUICK_FILTERS];
    if (inboxCount() > 0 || state.quick === 'inbox') items.splice(1, 0, { value: 'inbox', label: 'Inbox', count: inboxCount(), inbox: true });
    fill(chipsEl, ...items.map((q) => chip({
      label: q.label,
      selected: state.quick === q.value,
      count: q.count,
      iconName: q.inbox ? 'inbox' : undefined,
      onClick: () => { state.quick = q.value; shown = PAGE; apply(false); },
    })));
  }

  function paintToolbar() {
    const n = activeAdvancedCount();
    fill(filterBtn, icon('filter', { size: 18 }), h('span', { class: 'btn-label' }, 'Filter'), n ? h('span', { class: 'count-badge', 'aria-label': `${n} active` }, String(n)) : null);
    const cur = SORT_OPTIONS.find((o) => o.value === state.sort) || SORT_OPTIONS[0];
    fill(sortBtn, icon('sort', { size: 18 }), h('span', { class: 'btn-label' }, `Sort: ${cur.short}`));
    sortBtn.setAttribute('aria-label', `Sort: ${cur.label}. Change sort order`);
    selectBtn.classList.toggle('is-active', selecting);
    selectBtn.setAttribute('aria-pressed', String(selecting));
    selectBtn.querySelector('.btn-label').textContent = selecting ? 'Done' : 'Select';
  }

  function paint() {
    paintChips();
    paintToolbar();
    const total = fixedCollection ? allRecipes().filter((r) => r.collections.includes(fixedCollection)).length : recipeCount();
    const filtering = state.text || state.quick !== 'all' || activeAdvancedCount();
    countEl.textContent = results.length === total || !filtering ? plural(results.length, 'recipe') : `${results.length} of ${plural(total, 'recipe')}`;

    const visible = results.slice(0, shown);
    if (!results.length) {
      fill(gridEl, );
      fill(emptyWrap, total === 0 ? emptyForNoRecipes() : emptyForNoMatches());
    } else {
      fill(emptyWrap, );
      fill(gridEl, ...visible.map(cardFor));
    }
    moreWrap.hidden = shown >= results.length;
    if (cardCache.size > visible.length + 300) { // prune stale cached cards
      const keep = new Set(visible.map((r) => r.id));
      for (const k of cardCache.keys()) if (!keep.has(k)) cardCache.delete(k);
    }
    paintBulk();
  }

  function emptyForNoRecipes() {
    if (fixedCollection) {
      return emptyState({
        iconName: 'folder', title: 'This collection is empty', text: 'Add recipes from your library to organize them here.',
        actions: [button({ label: 'Add recipes', variant: 'primary', icon: 'plus', onClick: () => header.onAddRecipes && header.onAddRecipes() })],
      });
    }
    return emptyState({
      iconName: 'recipes',
      title: 'No recipes yet.',
      text: 'Paste your first recipe link to start your library.',
      actions: [
        button({ label: 'Import Recipe', variant: 'primary', icon: 'download', onClick: () => navigate('#/import') }),
        button({ label: 'Create Recipe', variant: 'secondary', icon: 'plus', onClick: () => navigate('#/new') }),
        button({ label: 'Load Sample Recipes', variant: 'ghost', onClick: async () => { const n = await loadSampleData(); toast(`Added ${plural(n, 'sample recipe')}. You can remove them any time in Settings.`, { tone: 'success' }); } }),
      ],
    });
  }

  function emptyForNoMatches() {
    return emptyState({
      iconName: 'search', title: 'No recipes match', text: 'Try a different word, or clear your filters.',
      actions: [button({ label: 'Clear search & filters', variant: 'secondary', onClick: resetAll })],
    });
  }

  function resetAll() {
    Object.assign(state, { text: '', quick: 'all', category: '', cuisine: '', tag: '' });
    if (!fixedCollection) state.collection = '';
    searchInput.value = '';
    clearBtn.hidden = true;
    apply(true);
  }

  // ---- cards -----------------------------------------------------------------------
  function cardFor(r) {
    const sel = selected.has(r.id);
    const sig = [r.updatedAt, r.favorite, r.personalRating, r.imageId, r.inbox, r.sample, selecting, sel, r.lastMade].join('|');
    const hit = cardCache.get(r.id);
    if (hit && hit.sig === sig) return hit.el;
    const el = buildCard(r, sel);
    cardCache.set(r.id, { sig, el });
    return el;
  }

  function buildCard(r, sel) {
    const time = formatMinutes(effectiveTotalMinutes(r));
    const meta = [r.categories[0], time].filter(Boolean).join(' · ');
    const link = h('a', {
      class: 'card-link',
      href: `#/recipe/${encodeURIComponent(r.id)}`,
      onclick: (e) => {
        if (selecting) { e.preventDefault(); toggleSelect(r.id); } else { session.lastListHash = location.hash; }
      },
    },
    h('div', { class: 'card-media' },
      recipeImage(r, { variant: 'thumb', className: 'card-img' }),
      h('div', { class: 'card-badges' }, r.sample ? badge('Sample Recipe', 'sample') : null, r.inbox ? badge('Inbox', 'inbox') : null)),
    h('div', { class: 'card-body' },
      h('h3', { class: 'card-title' }, r.title),
      h('p', { class: 'card-meta' }, meta || h('span', { class: 'sr-only' }, 'No category or time')),
      ratingDisplay(r.personalRating, { size: 13 })));

    const fav = h('button', {
      type: 'button',
      class: `fav-btn${r.favorite ? ' is-on' : ''}`,
      'aria-pressed': String(r.favorite),
      'aria-label': `${r.favorite ? 'Remove from' : 'Add to'} favorites: ${r.title}`,
      onclick: (e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(r.id); },
    }, icon('heart', { size: 20 }));

    const selectBox = selecting ? h('button', {
      type: 'button',
      class: `select-box${sel ? ' is-on' : ''}`,
      role: 'checkbox',
      'aria-checked': String(sel),
      'aria-label': `Select ${r.title}`,
      onclick: (e) => { e.preventDefault(); toggleSelect(r.id); },
    }, sel ? icon('check', { size: 18 }) : null) : null;

    return h('article', { class: `recipe-card${sel ? ' is-selected' : ''}`, dataset: { id: r.id } }, link, selecting ? selectBox : fav);
  }

  // ---- selection / bulk ----------------------------------------------------------------
  function setSelecting(on) {
    selecting = on;
    if (!on) selected.clear();
    cardCache.clear();
    paint();
  }

  function toggleSelect(id) {
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    const r = getRecipe(id);
    if (r) {
      cardCache.delete(id);
      const old = gridEl.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (old) old.replaceWith(cardFor(r));
    }
    paintBulk();
  }

  function paintBulk() {
    bulkBar.hidden = !selecting;
    document.body.classList.toggle('has-bulk-bar', selecting);
    if (!selecting) return;
    const n = selected.size;
    fill(bulkBar, 
      h('span', { class: 'bulk-count', 'aria-live': 'polite' }, n ? `${n} selected` : 'Select recipes'),
      button({ label: n === results.length && n ? 'Clear' : 'Select all', variant: 'ghost', className: 'btn-sm', onClick: () => { if (selected.size === results.length) selected.clear(); else results.forEach((r) => selected.add(r.id)); cardCache.clear(); paint(); } }),
      button({ label: 'Actions', icon: 'more', variant: 'primary', disabled: !n, onClick: openBulkActions }),
      button({ label: 'Done', variant: 'secondary', onClick: () => setSelecting(false) }));
  }

  function openBulkActions() {
    const ids = [...selected];
    const n = ids.length;
    if (!n) return;
    const anyInbox = ids.some((id) => (getRecipe(id) || {}).inbox);
    actionSheet({
      title: `${plural(n, 'recipe')} selected`,
      actions: [
        { label: 'Add to Collection', icon: 'folder', onSelect: () => bulkAddToCollection(ids) },
        { label: 'Remove from Collection', icon: 'minus', onSelect: () => bulkRemoveFromCollection(ids) },
        { label: 'Add to Shopping List', icon: 'cart', onSelect: () => bulkShopping(ids) },
        anyInbox ? { label: 'Move out of Inbox', icon: 'inbox', onSelect: async () => { for (const id of ids) await setInbox(id, false); toast('Moved out of your Inbox.', { tone: 'success' }); } } : null,
        { label: 'Export as JSON', icon: 'download', hint: 'A backup-format file you can restore later', onSelect: () => bulkExport(ids) },
        { label: 'Delete…', icon: 'trash', danger: true, onSelect: () => bulkDelete(ids) },
      ],
    });
  }

  async function bulkAddToCollection(ids) {
    const cols = listCollections();
    const options = [...cols.map((c) => ({ value: c.id, label: c.name })), { value: '__new', label: '＋ New collection…' }];
    const pick = await choiceDialog({ title: 'Add to collection', options });
    if (!pick) return;
    let id = pick;
    if (pick === '__new') {
      const name = await promptDialog({ title: 'New collection', label: 'Collection name', confirmLabel: 'Create' });
      if (!name) return;
      try { id = (await createCollection(name)).id; } catch (e) { toast(e.message, { tone: 'error' }); return; }
    }
    const n = await addRecipesToCollection(id, ids);
    toast(`Added ${plural(n, 'recipe')} to “${(getCollection(id) || {}).name}”.`, { tone: 'success' });
    setSelecting(false);
  }

  async function bulkRemoveFromCollection(ids) {
    const inUse = listCollections().filter((c) => ids.some((id) => (getRecipe(id) || { collections: [] }).collections.includes(c.id)));
    if (!inUse.length) { toast('None of the selected recipes are in a collection.'); return; }
    const pick = fixedCollection && inUse.some((c) => c.id === fixedCollection)
      ? fixedCollection
      : await choiceDialog({ title: 'Remove from collection', options: inUse.map((c) => ({ value: c.id, label: c.name })) });
    if (!pick) return;
    const n = await removeRecipesFromCollection(pick, ids);
    toast(`Removed ${plural(n, 'recipe')} from “${(getCollection(pick) || {}).name}”.`, { tone: 'success' });
    setSelecting(false);
  }

  async function bulkShopping(ids) {
    const picks = await servingsPickerDialog({ title: 'Add to shopping list', recipeIds: ids, confirmLabel: 'Add ingredients' });
    if (!picks) return;
    const res = await addFromRecipes(picks);
    toast(`Added ingredients to your shopping list${res.merged ? ` (${res.merged} combined)` : ''}.`, { tone: 'success', action: { label: 'View list', onClick: () => navigate('#/shopping') } });
    setSelecting(false);
  }

  async function bulkExport(ids) {
    try {
      await downloadBackup({ recipeIds: ids, fileName: `RecipeLibrary_Recipes_${isoDate()}.json` });
      toast(`Exported ${plural(ids.length, 'recipe')}.`, { tone: 'success' });
    } catch (e) { toast('The export could not be created.', { tone: 'error' }); }
  }

  async function bulkDelete(ids) {
    const ok = await confirmDialog({
      title: `Delete ${plural(ids.length, 'recipe')}?`,
      message: 'These recipes will be permanently removed from this device, including their notes and cooking history. This cannot be undone.',
      confirmLabel: `Delete ${ids.length}`,
      danger: true,
    });
    if (!ok) return;
    await deleteRecipes(ids, { imageCleanup: deleteImage });
    toast(`Deleted ${plural(ids.length, 'recipe')}.`);
    setSelecting(false);
  }

  // ---- filter & sort dialogs -----------------------------------------------------------------
  function openSort() {
    choiceDialog({ title: 'Sort recipes', options: SORT_OPTIONS, value: state.sort }).then((v) => {
      if (v) { state.sort = v; apply(true); }
    });
  }

  function openFilters() {
    const f = facets();
    const cols = listCollections();
    const opt = (list, label) => [{ value: '', label }, ...list.map((x) => ({ value: x.value, label: `${x.value} (${x.count})` }))];
    const catSel = selectInput({ options: opt(f.categories, 'Any category'), value: matchCase(f.categories, state.category) });
    const cuiSel = selectInput({ options: opt(f.cuisines, 'Any cuisine'), value: matchCase(f.cuisines, state.cuisine) });
    const tagSel = selectInput({ options: opt(f.tags, 'Any tag'), value: matchCase(f.tags, state.tag) });
    const colSel = fixedCollection ? null : selectInput({ options: [{ value: '', label: 'Any collection' }, ...cols.map((c) => ({ value: c.id, label: c.name }))], value: state.collection });
    const s = sheet({
      title: 'Filter recipes',
      content: h('div', { class: 'stack' },
        field({ label: 'Category', control: catSel }),
        field({ label: 'Cuisine', control: cuiSel }),
        colSel ? field({ label: 'Collection', control: colSel }) : null,
        field({ label: 'Tag', control: tagSel })),
      footer: [
        button({ label: 'Reset', variant: 'ghost', onClick: () => { state.category = ''; state.cuisine = ''; state.tag = ''; if (!fixedCollection) state.collection = ''; s.close(true); } }),
        button({
          label: 'Show recipes', variant: 'primary',
          onClick: () => {
            state.category = catSel.value; state.cuisine = cuiSel.value; state.tag = tagSel.value;
            if (colSel) state.collection = colSel.value;
            s.close(true);
          },
        }),
      ],
    });
    s.closed.then((changed) => { if (changed) apply(true); });
  }

  const matchCase = (list, v) => (list.find((x) => x.value.toLowerCase() === String(v).toLowerCase()) || { value: '' }).value;

  // ---- wiring ----------------------------------------------------------------------------------------
  buildHeader();
  unsubs.push(onRecipesChange(() => { reapply(); }));
  unsubs.push(onCollectionsChange(() => { cardCache.clear(); reapply(); }));
  apply(false);

  return {
    el: root,
    title,
    rebuildHeader: buildHeader,
    refresh: () => apply(false),
    destroy() {
      destroyed = true;
      unsubs.forEach((u) => u());
      if (io) io.disconnect();
      onSearch.cancel();
      reapply.cancel();
      document.body.classList.remove('has-bulk-bar');
    },
  };
}
