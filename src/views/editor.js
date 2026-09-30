/**
 * views/editor.js — one form for four jobs:
 *   mode "new"     create a recipe by hand
 *   mode "edit"    edit a saved recipe
 *   mode "import"  the Import Preview (editable) after fetching a link
 *   mode "paste"   review of pasted recipe text
 *
 * Nothing is saved until the user presses Save. The source URL of an imported
 * recipe can be corrected but never removed.
 */
import {
  h, clear, parseMinutesInput, safeHttpUrl, hostOf, nowIso, uniqueStrings, fill,
} from '../util.js';
import { icon } from '../icons.js';
import {
  button, field, textInput, textArea, checkboxRow, pageHeader, toast, confirmDialog, sheet, nextId,
} from '../ui.js';
import {
  createBlankRecipe, getRecipe, saveRecipe, allRecipes, facets,
} from '../recipes.js';
import { MEAL_CATEGORIES, canonicalCategories } from '../taxonomy.js';
import { listCollections } from '../collections.js';
import {
  recipeImage, addImageFromBlob, deleteImage, cacheRemoteImage,
} from '../images.js';
import { session } from '../state.js';
import { navigate } from '../router.js';
import { requestPersistentStorage } from '../pwa.js';
import { isOnline } from '../util.js';

// ---------------------------------------------------------------------------
// Tag / chip input
// ---------------------------------------------------------------------------

function tagInput({ label, values = [], suggestions = [], placeholder = '', hint }) {
  let items = uniqueStrings(values);
  const id = nextId('tags');
  const listId = `${id}-list`;
  const chips = h('div', { class: 'tag-chips' });
  const input = h('input', { type: 'text', class: 'input', id, list: listId, placeholder, autocomplete: 'off', enterkeyhint: 'enter', autocapitalize: 'words' });
  const datalist = h('datalist', { id: listId }, suggestions.map((s) => h('option', { value: s })));
  const wrap = field({ label, control: input, hint });

  const render = () => {
    clear(chips);
    items.forEach((v, i) => chips.appendChild(h('span', { class: 'tag-chip' }, v, h('button', {
      type: 'button', class: 'tag-remove', 'aria-label': `Remove ${v}`,
      onclick: () => { items.splice(i, 1); render(); wrap.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); },
    }, icon('x', { size: 12 })))));
  };
  const add = (text) => {
    const parts = String(text).split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return;
    items = uniqueStrings([...items, ...parts]);
    render();
    wrap.dispatchEvent(new Event('input', { bubbles: true }));
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input.value); input.value = ''; }
    else if (e.key === 'Backspace' && !input.value && items.length) { items.pop(); render(); }
  });
  input.addEventListener('input', (e) => {
    // choosing a datalist suggestion adds it straight away
    if ((e.inputType === undefined || e.inputType === 'insertReplacementText') && input.value && suggestions.includes(input.value)) { add(input.value); input.value = ''; }
  });
  input.addEventListener('blur', () => { if (input.value.trim()) { add(input.value); input.value = ''; } });
  wrap.insertBefore(chips, input);
  wrap.appendChild(datalist);
  render();
  return { el: wrap, getValues: () => { if (input.value.trim()) { add(input.value); input.value = ''; } return [...items]; } };
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

/**
 * @param {object} o
 * @param {'new'|'edit'|'import'|'paste'} o.mode
 * @param {object} o.recipe   recipe (or draft) to show
 * @param {object} [o.meta]   { imagePromise, replaceId, findings, sourceResult }
 */
export function createRecipeForm({ mode, recipe, meta = {} }) {
  const isEdit = mode === 'edit';
  const isImport = mode === 'import';
  const original = recipe;
  const hadSourceUrl = !!(isEdit && original.sourceUrl);
  const createdImageIds = new Set(); // new photos not yet attached to a saved recipe
  let imageId = recipe.imageId || '';
  let remoteImage = recipe.image || '';
  let imageBusy = false;
  let dirty = false;
  let saving = false;

  const markDirty = () => { dirty = true; window.onbeforeunload = () => 'You have unsaved changes.'; };
  const clearDirty = () => { dirty = false; window.onbeforeunload = null; };

  // ---- basic fields ---------------------------------------------------------
  const title = textInput({ value: recipe.title, maxlength: 200, placeholder: 'e.g. Lemon Herb Couscous', autocapitalize: 'sentences' });
  const titleField = field({ label: 'Recipe name', control: title, required: true });
  const description = textArea({ value: recipe.description, rows: 3, maxlength: 1500, placeholder: 'A short description (optional)' });
  const descField = field({ label: 'Description', control: description });

  // ---- photo ---------------------------------------------------------------------
  const photoBox = h('div', { class: 'photo-box' });
  const photoStatus = h('p', { class: 'field-hint', 'aria-live': 'polite' });
  const fileInput = h('input', { type: 'file', accept: 'image/*', class: 'sr-only', id: nextId('file'), tabindex: '-1', 'aria-label': 'Upload a photo from your device' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    await withImageBusy('Saving photo…', async () => {
      const id = await addImageFromBlob(file);
      createdImageIds.add(id);
      imageId = id;
      markDirty();
    });
  });
  const paintPhoto = () => {
    const preview = { title: title.value || recipe.title || '?', imageId, image: remoteImage };
    fill(photoBox, 
      h('div', { class: 'photo-preview' }, recipeImage(preview, { variant: 'full', className: 'photo-img', alt: 'Recipe photo preview', eager: true })),
      h('div', { class: 'photo-actions' },
        button({ label: imageId || remoteImage ? 'Replace Image' : 'Upload Photo', icon: 'upload', variant: 'secondary', disabled: imageBusy, onClick: () => fileInput.click() }),
        button({ label: 'Use Image Link', icon: 'link', variant: 'ghost', disabled: imageBusy, onClick: openImageUrlDialog }),
        imageId || remoteImage ? button({ label: 'Remove Image', icon: 'trash', variant: 'ghost', disabled: imageBusy, onClick: () => { imageId = ''; remoteImage = ''; markDirty(); paintPhoto(); } }) : null),
      photoStatus);
  };
  async function withImageBusy(msg, fn) {
    imageBusy = true;
    photoStatus.textContent = msg;
    paintPhoto();
    try { await fn(); photoStatus.textContent = ''; } catch (e) {
      photoStatus.textContent = '';
      toast(e && e.message ? e.message : 'That image could not be used.', { tone: 'error' });
    } finally { imageBusy = false; paintPhoto(); }
  }
  function openImageUrlDialog() {
    const input = textInput({ type: 'url', placeholder: 'https://…/photo.jpg', inputmode: 'url', autofocus: '' });
    const f = field({ label: 'Image address', control: input, hint: isOnline() ? 'We download a copy and keep it on this device so it works offline.' : 'You appear to be offline. Connect to download an image from a link.' });
    const s = sheet({
      title: 'Use an image from a link', size: 'sm', content: f,
      footer: [button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(null) }), button({
        label: 'Use image', variant: 'primary',
        onClick: () => {
          const url = safeHttpUrl(input.value.trim());
          if (!url) { f.setError('Enter a full link that starts with https://'); return; }
          s.close(url);
        },
      })],
    });
    s.closed.then(async (url) => {
      if (!url) return;
      await withImageBusy('Downloading image…', async () => {
        if (!isOnline()) throw new Error('You appear to be offline.');
        try {
          const id = await cacheRemoteImage(url, sourceUrl.value);
          createdImageIds.add(id);
          imageId = id;
          remoteImage = url;
        } catch {
          throw new Error("We couldn't download that image. Try uploading it from your device instead.");
        }
        markDirty();
      });
    });
  }

  // While reviewing an import, the photo is cached in the background.
  if (isImport && meta.imagePromise && !imageId) {
    imageBusy = true;
    photoStatus.textContent = 'Saving a copy of the photo for offline use…';
    meta.imagePromise.then((id) => {
      if (id && !imageId && !userTouchedImage) { imageId = id; createdImageIds.add(id); }
    }).finally(() => { imageBusy = false; photoStatus.textContent = ''; paintPhoto(); });
  }
  let userTouchedImage = false;
  fileInput.addEventListener('change', () => { userTouchedImage = true; });
  paintPhoto();

  // ---- source -----------------------------------------------------------------------
  const sourceName = textInput({ value: recipe.sourceName, maxlength: 120, placeholder: 'e.g. Example Kitchen' });
  const sourceUrl = textInput({ type: 'url', value: recipe.sourceUrl, inputmode: 'url', placeholder: 'https://…' });
  const author = textInput({ value: recipe.author, maxlength: 120 });
  const sourceUrlField = field({
    label: 'Original URL', control: sourceUrl,
    hint: hadSourceUrl || isImport ? 'Attribution stays with the recipe. You can correct the link but not remove it.' : 'Optional for recipes you write yourself.',
  });

  // ---- details ---------------------------------------------------------------------------
  const f = facets();
  const catSuggest = uniqueStrings([...MEAL_CATEGORIES, ...f.categories.map((c) => c.value)]);
  const categories = tagInput({ label: 'Category', values: recipe.categories, suggestions: catSuggest, placeholder: 'Breakfast, Dinner…', hint: 'Press Enter to add.' });
  const cuisine = tagInput({ label: 'Cuisine', values: recipe.cuisine, suggestions: f.cuisines.map((c) => c.value), placeholder: 'Italian, Nigerian…' });
  const tags = tagInput({ label: 'Tags', values: recipe.tags, suggestions: f.tags.map((c) => c.value), placeholder: 'quick, vegetarian…' });
  const prep = textInput({ value: recipe.prepTimeMinutes ? String(recipe.prepTimeMinutes) : '', inputmode: 'text', placeholder: 'e.g. 15' });
  const cook = textInput({ value: recipe.cookTimeMinutes ? String(recipe.cookTimeMinutes) : '', inputmode: 'text', placeholder: 'e.g. 30' });
  const total = textInput({ value: recipe.totalTimeMinutes ? String(recipe.totalTimeMinutes) : '', inputmode: 'text', placeholder: 'e.g. 45' });
  const prepField = field({ label: 'Prep time', control: prep, hint: 'Minutes, or 1h 30' });
  const cookField = field({ label: 'Cook time', control: cook });
  const totalField = field({ label: 'Total time', control: total });
  const servings = textInput({ value: recipe.servings, maxlength: 60, placeholder: 'e.g. 4 or 12 cookies' });
  const servingsField = field({ label: 'Servings', control: servings, hint: 'Used for scaling and shopping lists.' });

  // ---- ingredients ---------------------------------------------------------------------------------
  const ingredients = textArea({
    rows: 10, value: recipe.ingredients.map((i) => i.original).join('\n'),
    placeholder: '2 cups all-purpose flour\n1 tsp salt\n3 cloves garlic, minced', spellcheck: 'true',
  });
  const ingredientsField = field({ label: 'Ingredients', control: ingredients, hint: 'One ingredient per line. Write them as you would in a recipe (quantity, unit, ingredient).' });

  // ---- instructions (sections) --------------------------------------------------------------------------
  const sectionsEl = h('div', { class: 'stack section-editors' });
  let sections = (recipe.instructionSections.length ? recipe.instructionSections : [{ section: 'Main', steps: [] }])
    .map((s) => ({ name: s.section === 'Main' && recipe.instructionSections.length <= 1 ? '' : s.section, text: s.steps.join('\n') }));
  const sectionInputs = [];
  const paintSections = () => {
    // capture current DOM values before repaint
    sectionInputs.forEach((si, i) => { if (sections[i]) { sections[i].name = si.name.value; sections[i].text = si.text.value; } });
    sectionInputs.length = 0;
    clear(sectionsEl);
    sections.forEach((sec, i) => {
      const name = textInput({ value: sec.name, maxlength: 120, placeholder: 'Section name, e.g. For the sauce' });
      const text = textArea({ rows: 6, value: sec.text, placeholder: 'Preheat the oven to 350°F.\nMix the dry ingredients.\nBake for 30 minutes.', spellcheck: 'true' });
      sectionInputs.push({ name, text });
      const nameField = sections.length > 1 || sec.name ? field({ label: `Section ${i + 1} name`, control: name }) : null;
      const textField = field({ label: sections.length > 1 ? `Steps for ${sec.name || `section ${i + 1}`}` : 'Instructions', control: text, hint: i === 0 ? 'One step per line. Step numbers are added for you.' : undefined });
      sectionsEl.appendChild(h('div', { class: 'section-editor' },
        nameField, textField,
        sections.length > 1 ? h('div', { class: 'section-tools' }, button({ label: 'Remove section', icon: 'trash', variant: 'ghost', className: 'btn-sm', onClick: () => { sections.splice(i, 1); markDirty(); paintSections(); } })) : null));
    });
    sectionsEl.appendChild(button({ label: 'Add a section', icon: 'plus', variant: 'secondary', className: 'btn-sm', onClick: () => { paintSections(); sections.push({ name: '', text: '' }); markDirty(); paintSections(); sectionInputs[sectionInputs.length - 1].name.focus(); } }));
  };
  paintSections();

  // ---- notes / collections / options ------------------------------------------------------------------------
  const notes = textArea({ rows: 4, value: recipe.notes, placeholder: 'Use less sugar next time. Kids liked this. Bake 5 minutes longer…' });
  const notesField = field({ label: 'My Notes', control: notes, hint: 'Your own notes stay separate from the original instructions.' });
  const selectedCollections = new Set(recipe.collections);
  const cols = listCollections();
  const collectionsEl = h('fieldset', { class: 'fieldset' },
    h('legend', { class: 'field-label' }, 'Collections'),
    cols.length
      ? h('div', { class: 'check-list' }, cols.map((c) => checkboxRow({ label: c.name, checked: selectedCollections.has(c.id), onChange: (on) => { if (on) selectedCollections.add(c.id); else selectedCollections.delete(c.id); markDirty(); } })))
      : h('p', { class: 'field-hint' }, 'No collections yet. Create some on the Collections tab, then add this recipe to them.'));
  const inboxRow = !isEdit ? checkboxRow({ label: 'Save to Inbox', checked: recipe.inbox, hint: 'Skip organizing for now. Find it later under the Inbox filter.', id: 'opt-inbox' }) : null;
  const madeRow = isEdit ? checkboxRow({ label: 'I’ve made this before', checked: recipe.madeBefore, id: 'opt-made' }) : null;

  // ---- actions --------------------------------------------------------------------------------------------------
  const saveBtn = button({ label: isEdit ? 'Save Changes' : 'Save Recipe', icon: 'check', variant: 'primary', onClick: () => save() });
  const cancelBtn = button({ label: 'Cancel', variant: 'secondary', onClick: () => cancel() });
  const viewOriginal = () => {
    const url = safeHttpUrl(sourceUrl.value);
    return url ? h('a', { class: 'btn btn-ghost', href: url, target: '_blank', rel: 'noopener noreferrer' }, icon('external', { size: 18 }), h('span', { class: 'btn-label' }, 'View Original Recipe')) : null;
  };
  const actionsBar = h('div', { class: 'form-actions' });
  const paintActions = () => fill(actionsBar, cancelBtn, viewOriginal(), saveBtn);
  paintActions();
  sourceUrl.addEventListener('input', paintActions);

  // ---- validation + save -------------------------------------------------------------------------------------------
  function validate() {
    const problems = [];
    const fail = (fld, msg) => { fld.setError(msg); problems.push(fld); };
    [titleField, sourceUrlField, prepField, cookField, totalField].forEach((x) => x.setError(''));

    if (!title.value.trim()) fail(titleField, 'Please give the recipe a name.');
    let url = sourceUrl.value.trim();
    if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
    if (url && !safeHttpUrl(url)) fail(sourceUrlField, 'Enter a full web address that starts with http:// or https://');
    if (!url && (hadSourceUrl || (isImport && recipe.sourceUrl))) fail(sourceUrlField, 'The original link can’t be removed from an imported recipe. You can correct it, but not leave it blank.');
    const times = {};
    for (const [key, inp, fld] of [['prep', prep, prepField], ['cook', cook, cookField], ['total', total, totalField]]) {
      const v = parseMinutesInput(inp.value);
      if (Number.isNaN(v)) fail(fld, 'Use minutes like 45, or 1h 30.');
      else if (v != null && (v <= 0 || v > 60 * 24 * 14)) fail(fld, 'That time looks too large.');
      else times[key] = v;
    }
    return { problems, url: safeHttpUrl(url), times };
  }

  function collectSections() {
    sectionInputs.forEach((si, i) => { if (sections[i]) { sections[i].name = si.name.value; sections[i].text = si.text.value; } });
    return sections
      .map((s) => ({ section: s.name.trim() || 'Main', steps: s.text.split('\n').map((l) => l.trim()).filter(Boolean) }))
      .filter((s) => s.steps.length);
  }

  async function save() {
    if (saving) return;
    const { problems, url, times } = validate();
    if (problems.length) {
      toast('Please fix the highlighted fields.', { tone: 'error' });
      const first = problems[0].control;
      first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      first.focus({ preventScroll: true });
      return;
    }
    saving = true;
    saveBtn.disabled = true;
    saveBtn.querySelector('.btn-label').textContent = 'Saving…';
    try {
      // let a pending background photo finish (briefly) so it is saved with the recipe
      if (isImport && meta.imagePromise && imageBusy) await Promise.race([meta.imagePromise, new Promise((r) => setTimeout(r, 8000))]);

      const base = isEdit ? getRecipe(original.id) || original : recipe;
      const existing = meta.replaceId ? getRecipe(meta.replaceId) : null;
      const now = nowIso();
      const sectionsOut = collectSections();
      const ingredientLines = ingredients.value.split('\n').map((l) => l.trim()).filter(Boolean);
      const out = {
        ...base,
        id: existing ? existing.id : base.id,
        title: title.value.trim(),
        description: description.value.trim(),
        image: remoteImage,
        imageId,
        sourceName: sourceName.value.trim() || (url ? hostOf(url) : ''),
        sourceUrl: url,
        author: author.value.trim(),
        prepTimeMinutes: times.prep ?? null,
        cookTimeMinutes: times.cook ?? null,
        totalTimeMinutes: times.total ?? null,
        servings: servings.value.trim(),
        cuisine: cuisine.getValues(),
        categories: canonicalCategories(categories.getValues()),
        tags: tags.getValues(),
        ingredients: ingredientLines,
        instructionSections: sectionsOut,
        notes: notes.value,
        collections: [...selectedCollections],
        inbox: inboxRow ? inboxRow.querySelector('input').checked : base.inbox,
        madeBefore: madeRow ? madeRow.querySelector('input').checked || base.madeCount > 0 : base.madeBefore,
        dateImported: base.dateImported || (isImport || url ? now : ''),
      };
      if (existing) {
        // "Replace Existing": new content, but the user's own data is kept
        Object.assign(out, {
          createdAt: existing.createdAt, favorite: existing.favorite, personalRating: existing.personalRating,
          madeBefore: existing.madeBefore, madeCount: existing.madeCount, lastMade: existing.lastMade,
          collections: uniqueStrings([...existing.collections, ...out.collections]),
          notes: out.notes.trim() ? out.notes : existing.notes, basedOn: existing.basedOn, inbox: false,
        });
      }
      const previousImageId = isEdit ? original.imageId : existing ? existing.imageId : '';
      const saved = await saveRecipe(out);

      // photo bookkeeping: drop replaced/unused images
      createdImageIds.delete(imageId);
      for (const id of createdImageIds) await deleteImage(id).catch(() => {});
      if (previousImageId && previousImageId !== imageId && !allRecipes().some((r) => r.imageId === previousImageId)) await deleteImage(previousImageId).catch(() => {});

      clearDirty();
      session.importDraft = null;
      session.importMeta = null;
      toast(isEdit ? 'Changes saved.' : 'Recipe saved to your library.', { tone: 'success' });
      if (!isEdit) requestPersistentStorage();
      navigate(`#/recipe/${encodeURIComponent(saved.id)}`, { replace: true });
    } catch (err) {
      saving = false;
      saveBtn.disabled = false;
      saveBtn.querySelector('.btn-label').textContent = isEdit ? 'Save Changes' : 'Save Recipe';
      toast(err && err.quota ? 'Your device is out of storage space. Free some space and try again.' : 'We couldn’t save this recipe. Please try again.', { tone: 'error' });
      console.error(err);
    }
  }

  async function cancel() {
    const needsConfirm = dirty || (isImport || mode === 'paste');
    if (needsConfirm) {
      const ok = await confirmDialog({
        title: isEdit ? 'Discard your changes?' : 'Discard this recipe?',
        message: isEdit ? 'Your edits have not been saved.' : 'This recipe has not been saved to your library yet.',
        confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true,
      });
      if (!ok) return;
    }
    await discard();
    if (isEdit) navigate(`#/recipe/${encodeURIComponent(original.id)}`);
    else if (mode === 'import' || mode === 'paste') navigate('#/import');
    else navigate(session.lastListHash || '#/recipes');
  }

  async function discard() {
    clearDirty();
    session.importDraft = null;
    session.importMeta = null;
    for (const id of createdImageIds) await deleteImage(id).catch(() => {});
    createdImageIds.clear();
  }

  // ---- layout ----------------------------------------------------------------------------------------------------------
  const headerTitle = isEdit ? 'Edit Recipe' : isImport ? 'Review Imported Recipe' : mode === 'paste' ? 'Review Pasted Recipe' : 'New Recipe';
  const banners = [];
  if (isImport && meta.partial) {
    const missing = (meta.missing || []).join(' and ');
    banners.push(h('div', { class: 'callout callout-warn', role: 'status' }, icon('alert', { size: 18 }),
      h('div', null, h('strong', null, 'We found part of this recipe.'), h('p', null, missing ? `We couldn’t detect the ${missing}. Fill in what’s missing below, then save.` : 'Check the details below, then save.'))));
  } else if (isImport) {
    banners.push(h('div', { class: 'callout', role: 'status' }, icon('info', { size: 18 }),
      h('div', null, h('strong', null, 'Review before saving.'), h('p', null, `Imported from ${hostOf(recipe.sourceUrl) || 'the web'}. Edit anything you like — nothing is saved until you press Save Recipe.`))));
  } else if (mode === 'paste') {
    banners.push(h('div', { class: 'callout', role: 'status' }, icon('info', { size: 18 }),
      h('div', null, h('strong', null, 'Check the cleaned-up text.'), h('p', null, 'We tidied the lines you pasted. Fix anything that looks off, then save.'))));
  }
  if (meta.replaceId) {
    banners.push(h('div', { class: 'callout callout-warn', role: 'status' }, icon('refresh', { size: 18 }),
      h('div', null, h('strong', null, 'Replacing an existing recipe.'), h('p', null, 'Saving will update your existing copy. Your rating, favorite, notes, cooking history and collections are kept.'))));
  }

  const form = h('form', { class: 'recipe-form stack-lg', novalidate: '', onsubmit: (e) => { e.preventDefault(); save(); } },
    ...banners,
    h('section', { class: 'card-section stack' }, h('h2', { class: 'section-title' }, 'Basics'), titleField, descField),
    h('section', { class: 'card-section stack' }, h('h2', { class: 'section-title' }, 'Photo'), photoBox, fileInput),
    h('section', { class: 'card-section stack' },
      h('h2', { class: 'section-title' }, 'Source'),
      field({ label: 'Source website', control: sourceName }), sourceUrlField, field({ label: 'Author', control: author })),
    h('section', { class: 'card-section stack' },
      h('h2', { class: 'section-title' }, 'Details'),
      categories.el, cuisine.el,
      h('div', { class: 'grid-3' }, prepField, cookField, totalField),
      servingsField),
    h('section', { class: 'card-section stack' }, h('h2', { class: 'section-title' }, 'Ingredients'), ingredientsField),
    h('section', { class: 'card-section stack' }, h('h2', { class: 'section-title' }, 'Instructions'), sectionsEl),
    h('section', { class: 'card-section stack' }, h('h2', { class: 'section-title' }, 'Notes & organization'), notesField, tags.el, collectionsEl, inboxRow, madeRow),
    actionsBar);
  form.addEventListener('input', markDirty);

  const el = h('section', { class: 'view view-editor' },
    pageHeader({ title: headerTitle, back: isEdit ? { href: `#/recipe/${encodeURIComponent(original.id)}`, label: 'Back to recipe' } : undefined }),
    form);

  return {
    el,
    title: headerTitle,
    destroy() { window.onbeforeunload = null; },
    focusTitle() { title.focus(); },
  };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export function renderNewRecipe() {
  const view = createRecipeForm({ mode: 'new', recipe: createBlankRecipe() });
  setTimeout(() => view.focusTitle(), 50);
  return view;
}

export function renderEditRecipe({ params }) {
  const r = getRecipe(params.id);
  if (!r) { navigate('#/recipes', { replace: true }); return { el: h('div') }; }
  return createRecipeForm({ mode: 'edit', recipe: r });
}

/** The Import Preview (also used to finish partially detected or pasted recipes). */
export function renderImportReview() {
  const draft = session.importDraft;
  if (!draft) { navigate('#/import', { replace: true }); return { el: h('div') }; }
  const meta = session.importMeta || {};
  return createRecipeForm({ mode: meta.mode === 'paste' ? 'paste' : 'import', recipe: draft, meta });
}
