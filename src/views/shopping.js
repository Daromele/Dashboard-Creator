/**
 * views/shopping.js — the shopping list: grouped by aisle, checkable, editable,
 * built from recipes or your meal plan, with safe consolidation.
 */
import { h, plural, copyText, fill } from '../util.js';
import { categorizeIngredient } from '../ingredients.js';

import {
  button, iconButton, emptyState, pageHeader, sheet, field, textInput, textArea, selectInput, confirmDialog, toast, actionSheet,
} from '../ui.js';
import {
  getList, groupedItems, onShoppingChange, addCustomItem, updateItem, toggleItem, removeItem, clearChecked, clearList,
  addFromRecipes, SHOPPING_CATEGORIES, itemQuantityText, itemDisplayName, listAsText, uncheckedCount,
} from '../shopping.js';
import { pickRecipes, servingsPickerDialog } from '../pickers.js';
import { getWeekEntries, weekKey } from '../mealplanner.js';
import { getRecipe, baseServings } from '../recipes.js';
import { navigate } from '../router.js';

export function renderShopping() {
  const unsubs = [];
  const listHost = h('div');
  const summary = h('p', { class: 'result-count', 'aria-live': 'polite' });

  function paint() {
    const list = getList();
    const total = list.items.length;
    summary.textContent = total ? `${uncheckedCount()} of ${plural(total, 'item')} to buy` : '';
    if (!total) {
      fill(listHost, emptyState({
        iconName: 'cart',
        title: 'Your shopping list is empty',
        text: 'Create a grocery list from one recipe or your entire meal plan.',
        actions: [
          button({ label: 'Add from recipes', icon: 'recipes', variant: 'primary', onClick: addFromPicker }),
          button({ label: 'Add from meal plan', icon: 'calendar', variant: 'secondary', onClick: addFromPlan }),
          button({ label: 'Add custom item', icon: 'plus', variant: 'secondary', onClick: () => itemDialog() }),
        ],
      }));
      return;
    }
    fill(listHost, ...groupedItems().map((g) => h('section', { class: 'shop-group', 'aria-labelledby': `cat-${g.category.replace(/\W+/g, '')}` },
      h('h2', { class: 'shop-cat', id: `cat-${g.category.replace(/\W+/g, '')}` }, g.category, h('span', { class: 'shop-cat-count' }, String(g.items.filter((i) => !i.checked).length))),
      h('ul', { class: 'shop-list' }, g.items.map(itemRow)))));
  }

  function itemRow(item) {
    const cid = `shop-${item.id}`;
    const qty = itemQuantityText(item);
    const name = itemDisplayName(item);
    return h('li', { class: `shop-item${item.checked ? ' is-checked' : ''}` },
      h('input', { type: 'checkbox', id: cid, checked: item.checked, onchange: () => toggleItem(item.id) }),
      h('label', { for: cid, class: 'shop-label' },
        h('span', { class: 'shop-main' }, qty ? h('strong', { class: 'shop-qty' }, qty) : null, ' ', h('span', { class: 'shop-name' }, name)),
        item.notes ? h('span', { class: 'shop-notes' }, item.notes) : null,
        item.from && item.from.length ? h('span', { class: 'shop-from' }, `For ${item.from.join(', ')}`) : null),
      iconButton({ icon: 'edit', label: `Edit ${name}`, size: 18, onClick: () => itemDialog(item) }));
  }

  // ---- add / edit ----------------------------------------------------------------------
  function itemDialog(item) {
    const editing = !!item;
    const name = textInput({ value: item ? item.name : '', maxlength: 120, placeholder: 'e.g. Bananas', autofocus: '' });
    const qty = textInput({ value: item ? itemQuantityText(item) : '', maxlength: 40, placeholder: 'e.g. 2 cups, 1 lb, 3' });
    const cat = selectInput({ options: SHOPPING_CATEGORIES.map((c) => ({ value: c, label: c })), value: item ? item.category : 'Other' });
    const notes = textArea({ rows: 2, value: item ? item.notes : '', maxlength: 200, placeholder: 'Brand, size, or a reminder' });
    const nameField = field({ label: 'Item', control: name, required: true });
    // changing the name of a NEW item suggests a category
    let catTouched = editing;
    cat.addEventListener('change', () => { catTouched = true; });
    if (!editing) {
      name.addEventListener('blur', () => {
        if (catTouched || !name.value.trim()) return;
        cat.value = categorizeIngredient(name.value);
      });
    }
    const submit = async () => {
      if (!name.value.trim()) { nameField.setError('Enter an item name.'); name.focus(); return; }
      if (editing) await updateItem(item.id, { name: name.value, quantity: qty.value, category: cat.value, notes: notes.value });
      else {
        await addCustomItem({ name: name.value, quantity: qty.value, category: catTouched ? cat.value : categorizeIngredient(name.value), notes: notes.value });
      }
      s.close(true);
    };
    const s = sheet({
      title: editing ? 'Edit item' : 'Add custom item', size: 'sm',
      content: h('form', { class: 'stack', novalidate: '', onsubmit: (e) => { e.preventDefault(); submit(); } },
        nameField, field({ label: 'Quantity', control: qty }), field({ label: 'Category', control: cat, hint: 'Move an item to a different aisle any time.' }), field({ label: 'Notes', control: notes }),
        h('button', { type: 'submit', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' }, 'Save')),
      footer: [
        editing ? button({ label: 'Delete', icon: 'trash', variant: 'danger', onClick: async () => { await removeItem(item.id); s.close(true); toast('Item removed.'); } }) : null,
        button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(null) }),
        button({ label: editing ? 'Save' : 'Add item', variant: 'primary', onClick: submit }),
      ],
    });
  }

  async function addFromPicker() {
    const ids = await pickRecipes({ title: 'Add ingredients from recipes', confirmLabel: 'Next' });
    if (!ids || !ids.length) return;
    const picks = await servingsPickerDialog({ title: 'Choose servings', recipeIds: ids, confirmLabel: 'Add to list' });
    if (!picks) return;
    const res = await addFromRecipes(picks);
    toast(`Added ingredients${res.merged ? ` (${res.merged} combined)` : ''}.`, { tone: 'success' });
  }

  async function addFromPlan() {
    const week = weekKey(new Date());
    const entries = getWeekEntries(week).filter((e) => getRecipe(e.recipeId));
    if (!entries.length) { toast('Nothing is planned this week yet.', { action: { label: 'Open meal plan', onClick: () => navigate('#/plan') } }); return; }
    const defaults = {};
    const ids = [];
    for (const e of entries) {
      const base = baseServings(getRecipe(e.recipeId));
      if (!ids.includes(e.recipeId)) ids.push(e.recipeId);
      if (base) defaults[e.recipeId] = (defaults[e.recipeId] || 0) + (e.servings || base);
    }
    const picks = await servingsPickerDialog({ title: 'Shopping list for this week', recipeIds: ids, defaults, confirmLabel: 'Add to list' });
    if (!picks) return;
    const res = await addFromRecipes(picks);
    toast(`Added this week’s ingredients${res.merged ? ` (${res.merged} combined)` : ''}.`, { tone: 'success' });
  }

  async function doClearChecked() {
    const n = getList().items.filter((i) => i.checked).length;
    if (!n) { toast('No checked items to clear.'); return; }
    await clearChecked();
    toast(`Cleared ${plural(n, 'item')}.`);
  }

  async function doClearList() {
    if (!getList().items.length) return;
    const ok = await confirmDialog({ title: 'Clear the whole list?', message: 'All items will be removed from your shopping list.', confirmLabel: 'Clear list', danger: true });
    if (ok) { await clearList(); toast('Shopping list cleared.'); }
  }

  function openMore() {
    actionSheet({
      title: 'Shopping list',
      actions: [
        { label: 'Add from recipes', icon: 'recipes', onSelect: addFromPicker },
        { label: 'Add from this week’s meal plan', icon: 'calendar', onSelect: addFromPlan },
        { label: 'Copy list as text', icon: 'copy', onSelect: async () => toast((await copyText(listAsText())) ? 'List copied.' : 'Copying isn’t available here.', { tone: 'success' }) },
        { label: 'Clear checked items', icon: 'check', onSelect: doClearChecked },
        { label: 'Clear list…', icon: 'trash', danger: true, onSelect: doClearList },
      ],
    });
  }

  paint();
  unsubs.push(onShoppingChange(paint));
  const el = h('section', { class: 'view view-shopping' },
    pageHeader({
      title: 'Shopping List', subtitle: 'Check items off as you shop.',
      actions: [button({ label: 'Add item', icon: 'plus', variant: 'primary', onClick: () => itemDialog() }), button({ label: 'More', icon: 'more', variant: 'secondary', attrs: { 'aria-label': 'More shopping list actions' }, onClick: openMore })],
    }),
    summary,
    h('div', { class: 'button-row shop-toolbar' },
      button({ label: 'Clear Checked', icon: 'check', variant: 'secondary', onClick: doClearChecked }),
      button({ label: 'Clear List', icon: 'trash', variant: 'ghost', onClick: doClearList })),
    listHost);
  return { el, title: 'Shopping List', destroy() { unsubs.forEach((u) => u()); } };
}
