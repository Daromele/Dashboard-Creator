/**
 * views/planner.js — weekly meal planner (Monday → Sunday).
 * Add recipes from your library, move/duplicate/remove meals, jump between
 * weeks, and turn the week into a shopping list.
 */
import {
  h, formatDateShort, weekdayName, isoDate, parseIsoDate, plural, addDays, formatMinutes, fill,
} from '../util.js';

import {
  button, iconButton, emptyState, pageHeader, actionSheet, sheet, field, selectInput, confirmDialog, toast, checkboxRow, badge,
} from '../ui.js';
import {
  SLOTS, weekKey, weekDates, shiftWeek, getWeekEntries, addEntry, removeEntry, moveEntry, duplicateEntry, clearWeek,
  onPlanChange, currentTitle,
} from '../mealplanner.js';
import { getRecipe, recipeCount, onRecipesChange, baseServings, effectiveTotalMinutes } from '../recipes.js';
import { recipeImage } from '../images.js';
import { getSetting, setSetting } from '../settings.js';
import { pickRecipes, servingsPickerDialog } from '../pickers.js';
import { addFromRecipes } from '../shopping.js';
import { session } from '../state.js';
import { navigate } from '../router.js';

function weekLabel(weekStart) {
  const d = weekDates(weekStart);
  const sameYear = d[0].getFullYear() === d[6].getFullYear();
  const yr = (x) => x.getFullYear();
  return `${formatDateShort(d[0])}${sameYear ? '' : `, ${yr(d[0])}`} – ${formatDateShort(d[6])}, ${yr(d[6])}`;
}

/** Day + meal chooser used for Move and Duplicate. Resolves { date, slot } or null. */
function slotDialog({ title, confirmLabel, date, slot }) {
  return new Promise((resolve) => {
    const dateInput = h('input', { type: 'date', class: 'input', value: isoDate(date) });
    const slotSel = selectInput({ options: SLOTS.map((s) => ({ value: s.id, label: s.label })), value: slot });
    const dateField = field({ label: 'Date', control: dateInput });
    const s = sheet({
      title, size: 'sm',
      content: h('div', { class: 'stack' }, dateField, field({ label: 'Meal', control: slotSel })),
      footer: [button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(null) }), button({
        label: confirmLabel, variant: 'primary',
        onClick: () => { const d = parseIsoDate(dateInput.value); if (!d) { dateField.setError('Choose a date.'); return; } s.close({ date: d, slot: slotSel.value }); },
      })],
    });
    s.closed.then(resolve);
  });
}

export function renderPlanner({ query }) {
  let week = query.week && parseIsoDate(query.week) ? weekKey(parseIsoDate(query.week)) : session.planWeek || weekKey(new Date());
  session.planWeek = week;
  const unsubs = [];
  const today = isoDate(new Date());

  const labelEl = h('div', { class: 'week-label', 'aria-live': 'polite' });
  const grid = h('div', { class: 'day-grid' });
  const emptyHost = h('div');
  const jump = h('input', { type: 'date', class: 'input input-inline', 'aria-label': 'Jump to the week containing this date', value: isoDate(weekDates(week)[0]) });
  jump.addEventListener('change', () => { const d = parseIsoDate(jump.value); if (d) go(weekKey(d)); });

  function go(w) {
    week = w;
    session.planWeek = w;
    jump.value = isoDate(weekDates(w)[0]);
    paint();
  }

  const nav = h('div', { class: 'week-nav' },
    iconButton({ icon: 'left', label: 'Previous week', variant: 'secondary', onClick: () => go(shiftWeek(week, -1)) }),
    labelEl,
    iconButton({ icon: 'right', label: 'Next week', variant: 'secondary', onClick: () => go(shiftWeek(week, 1)) }));

  const snackRow = checkboxRow({ label: 'Show snacks', checked: getSetting('showSnacks'), id: 'plan-snacks', onChange: async (on) => { await setSetting('showSnacks', on); paint(); } });

  function visibleSlots() { return SLOTS.filter((s) => !s.optional || getSetting('showSnacks')); }

  function paint() {
    const entries = getWeekEntries(week);
    const dates = weekDates(week);
    const isThisWeek = week === weekKey(new Date());
    fill(labelEl, h('strong', null, weekLabel(week)), isThisWeek ? badge('This week', 'neutral') : h('button', { type: 'button', class: 'link-btn', onclick: () => go(weekKey(new Date())) }, 'Jump to this week'));

    fill(emptyHost, entries.length ? '' : recipeCount()
      ? emptyState({ iconName: 'calendar', title: 'Nothing planned this week', text: 'Add recipes from your library to plan your week.' })
      : emptyState({ iconName: 'calendar', title: 'Your plan is ready when your recipes are', text: 'Add recipes from your library to plan your week.', actions: [button({ label: 'Import a recipe', variant: 'primary', icon: 'download', onClick: () => navigate('#/import') })] }));

    fill(grid, ...dates.map((date, day) => {
      const iso = isoDate(date);
      const isToday = iso === today;
      const hid = `day-${week}-${day}`;
      return h('section', { class: `day-card${isToday ? ' is-today' : ''}`, 'aria-labelledby': hid },
        h('header', { class: 'day-head' }, h('h2', { id: hid, class: 'day-name' }, weekdayName(date)), h('span', { class: 'day-date' }, formatDateShort(date)), isToday ? badge('Today', 'neutral') : null),
        ...visibleSlots().map((slot) => {
          const list = entries.filter((e) => e.day === day && e.slot === slot.id);
          return h('div', { class: 'slot' },
            h('h3', { class: 'slot-name' }, slot.label),
            list.map((e) => entryRow(e, date)),
            button({ label: 'Add Recipe', icon: 'plus', variant: 'ghost', className: 'btn-sm slot-add', attrs: { 'aria-label': `Add recipe to ${weekdayName(date)} ${slot.label}` }, onClick: () => addToSlot(day, slot, date) }));
        }));
    }));
  }

  function entryRow(e, date) {
    const r = getRecipe(e.recipeId);
    const title = currentTitle(e);
    const meta = r ? [formatMinutes(effectiveTotalMinutes(r)), e.servings ? `${e.servings} servings` : ''].filter(Boolean).join(' · ') : 'Recipe removed';
    return h('div', { class: 'plan-entry' },
      r ? h('a', { class: 'plan-link', href: `#/recipe/${encodeURIComponent(r.id)}` }, recipeImage(r, { variant: 'thumb', className: 'plan-thumb' }), h('span', { class: 'plan-text' }, h('span', { class: 'plan-title' }, title), meta ? h('span', { class: 'plan-meta' }, meta) : null))
        : h('span', { class: 'plan-link' }, h('span', { class: 'plan-text' }, h('span', { class: 'plan-title' }, title), h('span', { class: 'plan-meta' }, meta))),
      iconButton({ icon: 'more', label: `Actions for ${title}`, size: 18, onClick: () => entryMenu(e, date) }));
  }

  async function addToSlot(day, slot, date) {
    const ids = await pickRecipes({ title: `Add to ${weekdayName(date)} ${slot.label}`, confirmLabel: 'Add' });
    if (!ids || !ids.length) return;
    for (const recipeId of ids) {
      const r = getRecipe(recipeId);
      await addEntry(week, { day, slot: slot.id, recipeId, servings: r ? baseServings(r) : null });
    }
    toast(`Added ${plural(ids.length, 'recipe')} to ${weekdayName(date)} ${slot.label.toLowerCase()}.`, { tone: 'success' });
  }

  function entryMenu(e, date) {
    const r = getRecipe(e.recipeId);
    actionSheet({
      title: currentTitle(e),
      actions: [
        r ? { label: 'Open recipe', icon: 'recipes', onSelect: () => navigate(`#/recipe/${encodeURIComponent(r.id)}`) } : null,
        { label: 'Move…', icon: 'move', onSelect: async () => { const t = await slotDialog({ title: 'Move meal', confirmLabel: 'Move', date, slot: e.slot }); if (!t) return; await moveEntry(week, e.id, { day: (t.date.getDay() + 6) % 7, slot: t.slot, weekStart: weekKey(t.date) }); toast('Meal moved.', { tone: 'success' }); } },
        { label: 'Duplicate…', icon: 'copy', onSelect: async () => { const t = await slotDialog({ title: 'Duplicate meal', confirmLabel: 'Duplicate', date: addDays(date, 1), slot: e.slot }); if (!t) return; await duplicateEntry(week, e.id, { day: (t.date.getDay() + 6) % 7, slot: t.slot, weekStart: weekKey(t.date) }); toast('Meal duplicated.', { tone: 'success' }); } },
        { label: 'Remove from plan', icon: 'trash', danger: true, onSelect: async () => { await removeEntry(week, e.id); toast('Removed from your plan.'); } },
      ],
    });
  }

  async function weekToShopping() {
    const entries = getWeekEntries(week).filter((e) => getRecipe(e.recipeId));
    if (!entries.length) { toast('Plan some meals first, then add them to your shopping list.'); return; }
    const defaults = {};
    const ids = [];
    for (const e of entries) {
      const r = getRecipe(e.recipeId);
      const base = baseServings(r);
      if (!ids.includes(e.recipeId)) ids.push(e.recipeId);
      if (base) defaults[e.recipeId] = (defaults[e.recipeId] || 0) + (e.servings || base);
    }
    const picks = await servingsPickerDialog({ title: 'Shopping list for this week', recipeIds: ids, defaults, confirmLabel: 'Add ingredients' });
    if (!picks) return;
    const res = await addFromRecipes(picks);
    toast(`Added this week’s ingredients${res.merged ? ` (${res.merged} combined)` : ''}.`, { tone: 'success', action: { label: 'View list', onClick: () => navigate('#/shopping') } });
  }

  async function clearThisWeek() {
    if (!getWeekEntries(week).length) return;
    const ok = await confirmDialog({ title: 'Clear this week?', message: 'All meals planned for this week will be removed. Your recipes are not affected.', confirmLabel: 'Clear week', danger: true });
    if (ok) { await clearWeek(week); toast('Week cleared.'); }
  }

  paint();
  unsubs.push(onPlanChange(paint), onRecipesChange(() => paint()));

  const el = h('section', { class: 'view view-planner' },
    pageHeader({ title: 'Meal Plan', subtitle: 'Plan your week from your own recipes.' }),
    h('div', { class: 'planner-controls' }, nav,
      h('div', { class: 'planner-extras' },
        h('label', { class: 'jump-label' }, h('span', null, 'Jump to date'), jump),
        snackRow)),
    emptyHost, grid,
    h('div', { class: 'planner-footer' },
      button({ label: 'Add week to shopping list', icon: 'cart', variant: 'primary', onClick: weekToShopping }),
      button({ label: 'Clear week', icon: 'trash', variant: 'ghost', onClick: clearThisWeek })));
  return { el, title: 'Meal Plan', destroy() { unsubs.forEach((u) => u()); } };
}
