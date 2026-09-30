/**
 * views/cook.js — Cooking Mode.
 *
 * Mobile-first, one instruction at a time, large high-contrast text, a
 * checklist of ingredients that doesn't leave the screen, step timers, and a
 * screen wake lock where supported (with an honest fallback message).
 */
import { h, clamp, plural, fill } from '../util.js';
import { icon } from '../icons.js';
import {
  button, iconButton, sheet, emptyState, toast,
} from '../ui.js';
import { getRecipe, baseServings, markMade, undoMade } from '../recipes.js';
import { renderIngredient, convertTemperaturesInText, formatQuantity } from '../ingredients.js';
import { detectDurations, startTimer, notificationState, requestNotificationPermission } from '../timers.js';
import { getSetting, setSetting } from '../settings.js';
import { session, checkedSet } from '../state.js';
import { navigate } from '../router.js';

export function renderCook({ params }) {
  const id = params.id;
  const recipe = getRecipe(id);
  if (!recipe || !recipe.instructionSections.some((s) => s.steps.length)) {
    return {
      title: 'Cooking Mode',
      el: h('section', { class: 'view' }, emptyState({
        iconName: 'book', title: recipe ? 'No instructions yet' : 'Recipe not found',
        text: recipe ? 'Add some steps to this recipe to use Cooking Mode.' : 'It may have been deleted.',
        actions: [button({ label: recipe ? 'Edit recipe' : 'My Recipes', variant: 'primary', onClick: () => navigate(recipe ? `#/recipe/${encodeURIComponent(id)}/edit` : '#/recipes') })],
      })),
    };
  }

  const steps = recipe.instructionSections.flatMap((s) => s.steps.map((text) => ({ text, section: s.section, multi: recipe.instructionSections.length > 1 || s.section !== 'Main' })));
  const total = steps.length;
  const system = session.unitSystem || getSetting('unitSystem');
  const b = baseServings(recipe);
  const servings = session.servings.get(id) || b;
  const factor = b && servings ? servings / b : 1;
  let index = 0;
  let scale = clamp(Number(getSetting('cookTextScale')) || 1, 0.85, 1.7);
  let wakeLock = null;
  let wantWake = !!getSetting('cookWakeLock');
  let wakeMessage = '';

  // ---- elements ---------------------------------------------------------------------
  const stepLabel = h('p', { class: 'cook-step-label', 'aria-live': 'polite' });
  const progress = h('div', { class: 'cook-progress', role: 'progressbar', 'aria-label': 'Recipe progress', 'aria-valuemin': '0', 'aria-valuemax': String(total) }, h('div', { class: 'cook-progress-bar' }));
  const sectionEl = h('p', { class: 'cook-section' });
  const stepText = h('p', { class: 'cook-text' });
  const timersEl = h('div', { class: 'cook-timers' });
  const stage = h('div', { class: 'cook-stage', tabindex: '-1' }, sectionEl, stepText, timersEl);
  const prevBtn = button({ label: 'Previous', icon: 'left', variant: 'secondary', className: 'btn-xl', onClick: () => go(-1) });
  const nextBtn = button({ label: 'Next', icon: 'right', variant: 'primary', className: 'btn-xl', onClick: () => go(1) });
  const wakeNote = h('p', { class: 'cook-note', 'aria-live': 'polite' });

  const wakeBtn = iconButton({ icon: 'sun', label: 'Keep screen awake', pressed: wantWake, variant: 'ghost', onClick: () => toggleWake() });
  const root = h('section', { class: 'cook', style: { '--cook-scale': String(scale) }, 'aria-label': `Cooking mode: ${recipe.title}` },
    h('header', { class: 'cook-top' },
      button({ label: 'Exit', icon: 'x', variant: 'ghost', onClick: () => navigate(`#/recipe/${encodeURIComponent(id)}`) }),
      h('h1', { class: 'cook-title' }, recipe.title),
      h('div', { class: 'cook-tools' },
        iconButton({ icon: 'type', label: 'Smaller text', variant: 'ghost', size: 16, onClick: () => setScale(scale - 0.15) }),
        iconButton({ icon: 'type', label: 'Larger text', variant: 'ghost', size: 24, onClick: () => setScale(scale + 0.15) }),
        wakeBtn,
        button({ label: 'Ingredients', icon: 'list', variant: 'secondary', onClick: openIngredients }))),
    h('div', { class: 'cook-meta' }, stepLabel, progress),
    stage,
    wakeNote,
    h('footer', { class: 'cook-nav' }, prevBtn, nextBtn));

  // ---- behaviour -----------------------------------------------------------------------------
  function paint() {
    const s = steps[index];
    stepLabel.textContent = `Step ${index + 1} of ${total}`;
    progress.setAttribute('aria-valuenow', String(index + 1));
    progress.firstChild.style.width = `${((index + 1) / total) * 100}%`;
    sectionEl.textContent = s.multi ? s.section : '';
    sectionEl.hidden = !s.multi;
    const text = convertTemperaturesInText(s.text, system);
    stepText.textContent = text;
    fill(timersEl, ...detectDurations(text).map((t) => h('button', {
      type: 'button', class: 'btn btn-secondary btn-lg cook-timer-btn',
      onclick: () => {
        startTimer({ label: `${t.label} timer`, seconds: t.seconds, recipeId: id, recipeTitle: recipe.title });
        toast(`${t.label} timer started.`, { tone: 'success' });
        if (notificationState() === 'default') toast('Get an alert when timers finish?', { action: { label: 'Enable alerts', onClick: () => requestNotificationPermission() }, duration: 9000 });
      },
    }, icon('timer', { size: 20 }), `Start ${t.label} timer`)));
    prevBtn.disabled = index === 0;
    const last = index === total - 1;
    fill(nextBtn, icon(last ? 'check' : 'right', { size: 18 }), h('span', { class: 'btn-label' }, last ? 'Finish' : 'Next'));
    nextBtn.classList.toggle('btn-primary', true);
    stage.scrollTop = 0;
  }

  function go(delta) {
    const next = index + delta;
    if (next >= total) { finish(); return; }
    index = clamp(next, 0, total - 1);
    paint();
  }

  function setScale(v) {
    scale = clamp(v, 0.85, 1.7);
    root.style.setProperty('--cook-scale', String(scale));
    setSetting('cookTextScale', Math.round(scale * 100) / 100);
  }

  function openIngredients() {
    const checked = checkedSet(id);
    const list = h('ul', { class: 'ingredient-list ingredient-list-lg' });
    const paintList = () => {
      fill(list, ...recipe.ingredients.map((ing, i) => {
        const cid = `cook-ing-${i}`;
        return h('li', { class: `ingredient${checked.has(i) ? ' is-checked' : ''}` },
          h('input', { type: 'checkbox', id: cid, checked: checked.has(i), onchange: (e) => { if (e.target.checked) checked.add(i); else checked.delete(i); paintList(); setTimeout(() => { const el = document.getElementById(cid); if (el) el.focus(); }, 0); } }),
          h('label', { for: cid }, renderIngredient(ing, { factor, system })));
      }));
    };
    paintList();
    sheet({
      title: `Ingredients${factor !== 1 ? ` (${formatQuantity(servings)} servings)` : ''}`, size: 'lg', className: 'cook-sheet',
      content: recipe.ingredients.length ? list : h('p', { class: 'muted' }, 'No ingredients listed.'),
      footer: [button({ label: 'Back to cooking', variant: 'primary', onClick: function () { this.closest('dialog').close(); } })],
    });
  }

  function finish() {
    const s = sheet({
      title: 'All done!', size: 'sm',
      content: h('p', null, `That’s the last step of ${recipe.title}. Enjoy your meal!`),
      footer: [
        button({ label: 'Back to recipe', variant: 'secondary', onClick: () => s.close('back') }),
        button({ label: 'Mark as Made', icon: 'check', variant: 'primary', onClick: () => s.close('made') }),
      ],
    });
    s.closed.then(async (r) => {
      if (r === 'made') {
        const res = await markMade(id);
        if (res) toast(`Marked as made — ${plural(res.recipe.madeCount, 'time')} now.`, { tone: 'success', action: { label: 'Undo', onClick: () => undoMade(id, res.entry.id) } });
      }
      if (r) navigate(`#/recipe/${encodeURIComponent(id)}`);
    });
  }

  // ---- wake lock (graceful fallback) ----------------------------------------------------------------------
  async function acquireWake() {
    if (!wantWake) return;
    if (!('wakeLock' in navigator)) {
      wakeMessage = 'Your browser can’t keep the screen on automatically. If it dims while you cook, change your device’s auto-lock setting.';
      wakeNote.textContent = wakeMessage;
      return;
    }
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
      wakeNote.textContent = '';
    } catch {
      wakeNote.textContent = 'Couldn’t keep the screen awake (battery saver may be on).';
    }
  }
  async function toggleWake() {
    wantWake = !wantWake;
    wakeBtn.setAttribute('aria-pressed', String(wantWake));
    await setSetting('cookWakeLock', wantWake);
    if (wantWake) await acquireWake();
    else { wakeNote.textContent = ''; if (wakeLock) { await wakeLock.release().catch(() => {}); wakeLock = null; } }
  }
  const onVisible = () => { if (document.visibilityState === 'visible' && wantWake && !wakeLock) acquireWake(); };
  document.addEventListener('visibilitychange', onVisible);

  // ---- keyboard + swipe ----------------------------------------------------------------------------------
  const onKey = (e) => {
    if (document.querySelector('dialog[open]')) return;
    const tag = (e.target && e.target.tagName) || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  };
  document.addEventListener('keydown', onKey);

  let touchStart = null;
  stage.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; touchStart = { x: t.clientX, y: t.clientY }; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 60) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  document.body.classList.add('is-cooking');
  paint();
  acquireWake();
  setTimeout(() => stage.focus({ preventScroll: true }), 50);

  return {
    el: root,
    title: `Cooking: ${recipe.title}`,
    destroy() {
      document.body.classList.remove('is-cooking');
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisible);
      if (wakeLock) wakeLock.release().catch(() => {});
    },
  };
}
