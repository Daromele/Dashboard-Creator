/**
 * views/collections.js — Collections index (+ Recipe Inbox entry point) and
 * single-collection pages (which reuse the recipe browser).
 */
import { h, plural, fill } from '../util.js';
import { icon } from '../icons.js';
import {
  button, iconButton, emptyState, pageHeader, promptDialog, confirmDialog, actionSheet, toast, chip,
} from '../ui.js';
import {
  listCollections, createCollection, renameCollection, deleteCollection, moveCollection, getCollection,
  collectionRecipeCount, onCollectionsChange, addRecipesToCollection, SUGGESTED_COLLECTIONS, CollectionError,
} from '../collections.js';
import { inboxCount, onRecipesChange, allRecipes } from '../recipes.js';
import { createBrowser } from './library.js';
import { pickRecipes } from '../pickers.js';
import { navigate, refresh } from '../router.js';

async function askNewCollection() {
  const name = await promptDialog({
    title: 'New collection', label: 'Collection name', placeholder: 'e.g. Weeknight Dinner', confirmLabel: 'Create', maxLength: 60,
    hint: 'A recipe can belong to more than one collection.',
  });
  if (!name) return null;
  try { return await createCollection(name); } catch (e) {
    toast(e instanceof CollectionError ? e.message : 'The collection could not be created.', { tone: 'error' });
    return null;
  }
}

export function renderCollections() {
  const listHost = h('div');
  const unsubs = [];

  function paint() {
    const cols = listCollections();
    const inbox = inboxCount();
    const children = [];

    if (inbox > 0) {
      children.push(h('a', { class: 'inbox-card', href: '#/recipes?quick=inbox' },
        icon('inbox', { size: 22 }),
        h('span', { class: 'inbox-text' }, h('strong', null, 'Recipe Inbox'), h('span', { class: 'muted' }, `${plural(inbox, 'recipe')} waiting to be organized`)),
        h('span', { class: 'count-badge count-badge-lg' }, String(inbox)),
        icon('right', { size: 18 })));
    }

    if (!cols.length) {
      children.push(emptyState({
        iconName: 'folder',
        title: 'Create collections to organize recipes your way.',
        text: 'Collections work like folders, but a recipe can live in several at once. Start with a suggestion or make your own.',
        actions: [
          h('div', { class: 'chip-row wrap center' }, SUGGESTED_COLLECTIONS.map((name) => chip({ label: `+ ${name}`, onClick: async () => { try { await createCollection(name); } catch (e) { toast(e.message, { tone: 'error' }); } } }))),
          button({ label: 'New collection', icon: 'plus', variant: 'primary', onClick: askNewCollection }),
        ],
      }));
    } else {
      children.push(h('ul', { class: 'collection-list' }, cols.map((c, i) => {
        const n = collectionRecipeCount(c.id);
        return h('li', { class: 'collection-item' },
          h('a', { class: 'collection-link', href: `#/collection/${encodeURIComponent(c.id)}` },
            h('span', { class: 'collection-icon' }, icon('folder', { size: 20 })),
            h('span', { class: 'collection-text' }, h('strong', null, c.name), h('span', { class: 'muted' }, plural(n, 'recipe')))),
          h('div', { class: 'collection-tools' },
            iconButton({ icon: 'arrowUp', label: `Move ${c.name} up`, size: 18, disabled: i === 0, onClick: () => moveCollection(c.id, -1) }),
            iconButton({ icon: 'arrowDown', label: `Move ${c.name} down`, size: 18, disabled: i === cols.length - 1, onClick: () => moveCollection(c.id, 1) }),
            iconButton({ icon: 'more', label: `More actions for ${c.name}`, size: 18, onClick: () => collectionMenu(c) })));
      })));
      // suggestions not created yet
      const missing = SUGGESTED_COLLECTIONS.filter((s) => !cols.some((c) => c.name.toLowerCase() === s.toLowerCase())).slice(0, 5);
      if (missing.length) {
        children.push(h('div', { class: 'stack' }, h('h2', { class: 'section-title' }, 'Suggestions'),
          h('div', { class: 'chip-row wrap' }, missing.map((name) => chip({ label: `+ ${name}`, onClick: async () => { try { await createCollection(name); } catch (e) { toast(e.message, { tone: 'error' }); } } })))));
      }
    }
    fill(listHost, ...children);
  }

  function collectionMenu(c) {
    actionSheet({
      title: c.name,
      actions: [
        { label: 'Open', icon: 'folder', onSelect: () => navigate(`#/collection/${encodeURIComponent(c.id)}`) },
        { label: 'Rename', icon: 'edit', onSelect: () => renameFlow(c) },
        { label: 'Delete collection…', icon: 'trash', danger: true, onSelect: () => deleteFlow(c) },
      ],
    });
  }

  paint();
  unsubs.push(onCollectionsChange(paint), onRecipesChange(() => paint()));
  const el = h('section', { class: 'view view-collections' },
    pageHeader({ title: 'Collections', subtitle: 'Folders for your recipes — a recipe can be in several.', actions: [button({ label: 'New collection', icon: 'plus', variant: 'primary', onClick: askNewCollection })] }),
    listHost);
  return { el, title: 'Collections', destroy() { unsubs.forEach((u) => u()); } };
}

async function renameFlow(c) {
  const name = await promptDialog({ title: 'Rename collection', label: 'Collection name', value: c.name, confirmLabel: 'Rename', maxLength: 60 });
  if (!name || name === c.name) return;
  try { await renameCollection(c.id, name); toast('Collection renamed.', { tone: 'success' }); } catch (e) { toast(e.message, { tone: 'error' }); }
}

async function deleteFlow(c) {
  const n = collectionRecipeCount(c.id);
  const ok = await confirmDialog({
    title: `Delete “${c.name}”?`,
    message: n ? `The ${plural(n, 'recipe')} in this collection will NOT be deleted — they just won't be in this collection any more.` : 'This collection is empty.',
    confirmLabel: 'Delete collection', danger: true,
  });
  if (!ok) return false;
  await deleteCollection(c.id);
  toast('Collection deleted.');
  return true;
}

export function renderCollection({ params }) {
  const id = params.id;
  const c = getCollection(id);
  if (!c) {
    return { title: 'Collection not found', el: h('section', { class: 'view' }, emptyState({ iconName: 'folder', title: 'Collection not found', actions: [button({ label: 'All collections', variant: 'primary', onClick: () => navigate('#/collections') })] })) };
  }
  const state = { text: '', quick: 'all', category: '', cuisine: '', collection: id, tag: '', sort: 'alpha' };
  const addRecipes = async () => {
    const members = allRecipes().filter((r) => r.collections.includes(id)).map((r) => r.id);
    const picked = await pickRecipes({ title: `Add to “${getCollection(id).name}”`, exclude: members, confirmLabel: 'Add' });
    if (!picked || !picked.length) return;
    const n = await addRecipesToCollection(id, picked);
    toast(`Added ${plural(n, 'recipe')}.`, { tone: 'success' });
  };
  const browser = createBrowser({
    title: c.name,
    state,
    fixedCollection: id,
    header: {
      back: { href: '#/collections', label: 'Collections' },
      onAddRecipes: addRecipes,
      actions: [
        button({ label: 'Add recipes', icon: 'plus', variant: 'primary', onClick: addRecipes }),
        button({ label: 'Rename', icon: 'edit', variant: 'secondary', onClick: async () => { await renameFlow(getCollection(id)); refresh(); } }),
        button({ label: 'Delete', icon: 'trash', variant: 'ghost', onClick: async () => { if (await deleteFlow(getCollection(id))) navigate('#/collections', { replace: true }); } }),
      ],
    },
  });
  return browser;
}
