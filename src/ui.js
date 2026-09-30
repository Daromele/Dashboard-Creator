/**
 * ui.js — shared UI components: dialogs (native <dialog>), toasts, form fields,
 * chips, star ratings, segmented controls, empty states, banners.
 *
 * Everything is built with h() (textContent only) and is keyboard/screen-reader
 * friendly: real buttons, labelled inputs, focus trapped in modal dialogs by the
 * browser, Escape closes, focus returns to the trigger.
 */
import { h, clear } from './util.js';
import { icon } from './icons.js';

let counter = 0;
export const nextId = (prefix = 'id') => `${prefix}-${++counter}`;

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

/**
 * button({ label, icon, variant: 'primary'|'secondary'|'ghost'|'danger', onClick, type, disabled, title })
 */
export function button({ label, icon: iconName, variant = 'secondary', onClick, type = 'button', disabled, title, className = '', attrs = {} }) {
  return h('button', {
    type,
    class: `btn btn-${variant} ${className}`.trim(),
    onclick: onClick,
    disabled,
    title,
    ...attrs,
  }, iconName ? icon(iconName, { size: 18 }) : null, label ? h('span', { class: 'btn-label' }, label) : null);
}

/** Icon-only button; `label` becomes its accessible name. */
export function iconButton({ icon: iconName, label, onClick, variant = 'ghost', pressed, className = '', size = 20, disabled, attrs = {} }) {
  return h('button', {
    type: 'button',
    class: `icon-btn icon-btn-${variant} ${className}`.trim(),
    'aria-label': label,
    title: label,
    'aria-pressed': pressed === undefined ? null : String(!!pressed),
    onclick: onClick,
    disabled,
    ...attrs,
  }, icon(iconName, { size }));
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

let openDialogs = 0;

/**
 * Open a modal sheet (bottom sheet on phones, centred dialog on larger screens).
 * Returns { el, body, close(result), closed: Promise<result> }.
 */
export function sheet({ title, content, footer, size = 'md', dismissible = true, className = '', onClose }) {
  const titleId = nextId('sheet-title');
  const dialog = h('dialog', { class: `sheet sheet-${size} ${className}`.trim(), 'aria-labelledby': titleId });
  let result = null;
  let resolveClosed;
  const closed = new Promise((r) => { resolveClosed = r; });

  const api = {
    el: dialog,
    closed,
    close(res) { result = res === undefined ? null : res; if (dialog.open) dialog.close(); },
  };

  const header = h('header', { class: 'sheet-header' },
    h('h2', { id: titleId, class: 'sheet-title' }, title),
    dismissible ? iconButton({ icon: 'x', label: 'Close', onClick: () => api.close(null) }) : null);
  const body = h('div', { class: 'sheet-body' }, content);
  api.body = body;
  const footerEl = footer ? h('footer', { class: 'sheet-footer' }, footer) : null;
  api.footer = footerEl;
  dialog.appendChild(h('div', { class: 'sheet-inner' }, header, body, footerEl));

  dialog.addEventListener('close', () => {
    openDialogs = Math.max(0, openDialogs - 1);
    document.body.classList.toggle('modal-open', openDialogs > 0);
    dialog.remove();
    if (onClose) onClose(result);
    resolveClosed(result);
  });
  dialog.addEventListener('cancel', (e) => { if (!dismissible) e.preventDefault(); });
  dialog.addEventListener('mousedown', (e) => { dialog.__downOnBackdrop = e.target === dialog; });
  dialog.addEventListener('click', (e) => { if (dismissible && e.target === dialog && dialog.__downOnBackdrop) api.close(null); });

  document.body.appendChild(dialog);
  openDialogs++;
  document.body.classList.add('modal-open');
  dialog.showModal();
  return api;
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const s = sheet({
      title,
      size: 'sm',
      content: h('div', { class: 'sheet-message' }, typeof message === 'string' ? h('p', null, message) : message),
      footer: [
        button({ label: cancelLabel, variant: 'secondary', onClick: () => s.close(false) }),
        button({ label: confirmLabel, variant: danger ? 'danger' : 'primary', onClick: () => s.close(true), attrs: { autofocus: '' } }),
      ],
    });
    s.closed.then((r) => resolve(r === true));
  });
}

/** Ask for one line of text. Resolves the trimmed string, or null when cancelled. */
export function promptDialog({ title, label, value = '', placeholder = '', confirmLabel = 'Save', hint = '', maxLength = 120, validate }) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', class: 'input', value, placeholder, maxlength: maxLength, autocomplete: 'off', autofocus: '' });
    const error = h('p', { class: 'field-error', role: 'alert', hidden: true });
    const f = field({ label, control: input, hint, errorEl: error });
    const form = h('form', { class: 'stack', novalidate: '' }, f);
    const submit = () => {
      const v = input.value.trim();
      const msg = validate ? validate(v) : (v ? '' : 'Please enter a value.');
      if (msg) { error.textContent = msg; error.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
      s.close(v);
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    const s = sheet({
      title,
      size: 'sm',
      content: form,
      footer: [
        button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(null) }),
        button({ label: confirmLabel, variant: 'primary', onClick: submit }),
      ],
    });
    s.closed.then((r) => resolve(r));
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}

/** Type-to-confirm for destructive actions (e.g. Delete All Data). */
export function strongConfirm({ title, message, phrase = 'DELETE', confirmLabel = 'Delete', checkboxLabel }) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', class: 'input', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-describedby': 'strong-hint' });
    const cb = checkboxLabel ? h('input', { type: 'checkbox', id: 'strong-cb' }) : null;
    const confirmBtn = button({ label: confirmLabel, variant: 'danger', disabled: true, onClick: () => s.close(true) });
    const update = () => { confirmBtn.disabled = !(input.value.trim() === phrase && (!cb || cb.checked)); };
    input.addEventListener('input', update);
    if (cb) cb.addEventListener('change', update);
    const s = sheet({
      title,
      size: 'sm',
      content: h('div', { class: 'stack' },
        h('div', { class: 'sheet-message' }, typeof message === 'string' ? h('p', null, message) : message),
        cb ? h('label', { class: 'check-row', for: 'strong-cb' }, cb, h('span', null, checkboxLabel)) : null,
        field({ label: `Type ${phrase} to confirm`, control: input, hint: 'This cannot be undone.', hintId: 'strong-hint' })),
      footer: [button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(false) }), confirmBtn],
    });
    s.closed.then((r) => resolve(r === true));
  });
}

/** Choose one option from a list (sort order, etc.). Resolves the value or null. */
export function choiceDialog({ title, options, value, hint }) {
  return new Promise((resolve) => {
    const list = h('div', { class: 'choice-list', role: 'radiogroup', 'aria-label': title },
      options.map((o) => h('button', {
        type: 'button',
        class: `choice${o.value === value ? ' is-selected' : ''}`,
        role: 'radio',
        'aria-checked': String(o.value === value),
        onclick: () => s.close(o.value),
      },
      h('span', { class: 'choice-text' }, h('span', { class: 'choice-label' }, o.label), o.hint ? h('span', { class: 'choice-hint' }, o.hint) : null),
      o.value === value ? icon('check', { size: 18 }) : null)));
    const s = sheet({ title, size: 'sm', content: [hint ? h('p', { class: 'muted' }, hint) : null, list] });
    s.closed.then(resolve);
  });
}

/** A list of actions (used for "More…" menus; no hover needed). */
export function actionSheet({ title, actions }) {
  const s = sheet({
    title,
    size: 'sm',
    content: h('div', { class: 'action-list' }, actions.filter(Boolean).map((a) => h('button', {
      type: 'button',
      class: `action-item${a.danger ? ' is-danger' : ''}`,
      disabled: a.disabled,
      onclick: () => { s.close(); if (a.onSelect) setTimeout(a.onSelect, 0); },
    }, a.icon ? icon(a.icon, { size: 20 }) : null, h('span', { class: 'action-text' }, h('span', { class: 'action-label' }, a.label), a.hint ? h('span', { class: 'action-hint' }, a.hint) : null)))),
  });
  return s;
}

// ---------------------------------------------------------------------------
// Toasts & banners
// ---------------------------------------------------------------------------

/**
 * Modal <dialog>s live in the browser's top layer, above everything else, so a
 * toast shown while one is open has to live INSIDE that dialog to be visible.
 */
function toastHost() {
  const open = document.querySelectorAll('dialog[open]');
  const dlg = open[open.length - 1];
  if (dlg) {
    let region = dlg.querySelector(':scope > .toast-region');
    if (!region) {
      region = h('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite' });
      dlg.appendChild(region);
    }
    return region;
  }
  return document.getElementById('toast-region');
}

export function toast(message, { tone = 'info', action, duration } = {}) {
  const region = toastHost();
  if (!region) return () => {};
  const el = h('div', { class: `toast toast-${tone}` },
    tone === 'error' ? icon('alert', { size: 18 }) : tone === 'success' ? icon('check', { size: 18 }) : icon('info', { size: 18 }),
    h('span', { class: 'toast-text' }, message),
    action ? h('button', { type: 'button', class: 'toast-action', onclick: () => { remove(); action.onClick(); } }, action.label) : null,
    iconButton({ icon: 'x', label: 'Dismiss message', onClick: () => remove(), size: 16, className: 'toast-close' }));
  let timer;
  const remove = () => { clearTimeout(timer); el.remove(); };
  region.appendChild(el);
  while (region.children.length > 3) region.firstChild.remove();
  timer = setTimeout(remove, duration || (action ? 8000 : tone === 'error' ? 7000 : 4000));
  return remove;
}

/** Persistent inline banner above the page (offline notice, backup due, update ready…). */
export function showBanner({ id, message, tone = 'info', actions = [], dismissible = true, iconName }) {
  const region = document.getElementById('banner-region');
  if (!region) return () => {};
  if (id) region.querySelectorAll(`[data-banner="${id}"]`).forEach((e) => e.remove());
  const el = h('div', { class: `banner banner-${tone}`, dataset: { banner: id || '' } },
    icon(iconName || (tone === 'warn' ? 'alert' : 'info'), { size: 18 }),
    h('span', { class: 'banner-text' }, message),
    h('span', { class: 'banner-actions' }, actions.map((a) => button({ label: a.label, variant: 'secondary', className: 'btn-sm', onClick: () => { if (a.dismiss !== false) remove(); a.onClick(); } }))),
    dismissible ? iconButton({ icon: 'x', label: 'Dismiss', onClick: () => remove(), size: 16 }) : null);
  const remove = () => el.remove();
  region.appendChild(el);
  return remove;
}

export function removeBanner(id) {
  const region = document.getElementById('banner-region');
  if (region) region.querySelectorAll(`[data-banner="${id}"]`).forEach((e) => e.remove());
}

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

/**
 * field({ label, control, hint, required, errorEl }) → labelled form row.
 * The label is tied to the control with for/id; hint and error are announced
 * via aria-describedby.
 */
export function field({ label, control, hint, required, errorEl, hintId, className = '' }) {
  const id = control.id || nextId('f');
  control.id = id;
  const describedBy = [];
  const hintEl = hint ? h('p', { class: 'field-hint', id: hintId || `${id}-hint` }, hint) : null;
  if (hintEl) describedBy.push(hintEl.id);
  const err = errorEl || h('p', { class: 'field-error', role: 'alert', hidden: true });
  err.id = err.id || `${id}-error`;
  describedBy.push(err.id);
  control.setAttribute('aria-describedby', describedBy.join(' '));
  if (required) control.setAttribute('aria-required', 'true');
  const wrap = h('div', { class: `field ${className}`.trim() },
    h('label', { class: 'field-label', for: id }, label, required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
    control, hintEl, err);
  wrap.setError = (msg) => {
    err.textContent = msg || '';
    err.hidden = !msg;
    if (msg) control.setAttribute('aria-invalid', 'true'); else control.removeAttribute('aria-invalid');
  };
  wrap.control = control;
  return wrap;
}

export function textInput(props = {}) { return h('input', { type: 'text', class: 'input', autocomplete: 'off', ...props }); }
export function textArea(props = {}) { return h('textarea', { class: 'input textarea', rows: 4, ...props }); }
export function selectInput({ options, value, ...props }) {
  const sel = h('select', { class: 'input select', ...props }, options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
  return sel;
}

export function checkboxRow({ label, checked, onChange, id, hint }) {
  const cid = id || nextId('cb');
  const input = h('input', { type: 'checkbox', id: cid, checked: !!checked, onchange: onChange ? (e) => onChange(e.target.checked) : null });
  return h('label', { class: 'check-row', for: cid }, input, h('span', null, label, hint ? h('span', { class: 'check-hint' }, hint) : null));
}

// ---------------------------------------------------------------------------
// Chips, segmented control, stars
// ---------------------------------------------------------------------------

export function chip({ label, selected = false, onClick, count, className = '', iconName }) {
  return h('button', {
    type: 'button',
    class: `chip${selected ? ' is-selected' : ''} ${className}`.trim(),
    'aria-pressed': String(!!selected),
    onclick: onClick,
  }, iconName ? icon(iconName, { size: 14 }) : null, label, count != null ? h('span', { class: 'chip-count' }, String(count)) : null);
}

/** Radio-style segmented control with roving tabindex + arrow keys. */
export function segmented({ options, value, onChange, label, className = '' }) {
  const wrap = h('div', { class: `segmented ${className}`.trim(), role: 'radiogroup', 'aria-label': label });
  let current = value;
  const render = () => {
    clear(wrap);
    options.forEach((o, i) => {
      const selected = o.value === current;
      const btn = h('button', {
        type: 'button',
        class: `seg${selected ? ' is-selected' : ''}`,
        role: 'radio',
        'aria-checked': String(selected),
        tabindex: selected || (current == null && i === 0) ? '0' : '-1',
        onclick: () => { current = o.value; render(); onChange(o.value); btn2focus(o.value); },
        onkeydown: (e) => {
          const idx = options.findIndex((x) => x.value === current);
          let next = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = options[(idx + 1) % options.length];
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = options[(idx - 1 + options.length) % options.length];
          if (next) { e.preventDefault(); current = next.value; render(); onChange(next.value); btn2focus(next.value); }
        },
      }, o.label);
      btn.dataset.value = o.value;
      wrap.appendChild(btn);
    });
  };
  const btn2focus = (v) => { const el = wrap.querySelector(`[data-value="${CSS.escape(String(v))}"]`); if (el) el.focus(); };
  render();
  wrap.setValue = (v) => { current = v; render(); };
  return wrap;
}

/** Interactive 1–5 star rating (radiogroup). Clicking the current star clears it. */
export function starRating({ value = null, onChange, label = 'Your rating', size = 24 }) {
  let current = value;
  const wrap = h('div', { class: 'stars', role: 'radiogroup', 'aria-label': label });
  const btns = [1, 2, 3, 4, 5].map((n) => h('button', {
    type: 'button',
    class: 'star-btn',
    role: 'radio',
    'aria-label': `${n} ${n === 1 ? 'star' : 'stars'}`,
    onclick: () => set(current === n ? null : n, true),
    onkeydown: (e) => {
      if (['ArrowRight', 'ArrowUp'].includes(e.key)) { e.preventDefault(); set(Math.min(5, (current || 0) + 1), true, true); }
      else if (['ArrowLeft', 'ArrowDown'].includes(e.key)) { e.preventDefault(); set(Math.max(1, (current || 2) - 1), true, true); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); set(null, true); }
    },
  }, icon('star', { size })));
  const paint = () => {
    btns.forEach((b, i) => {
      const n = i + 1;
      b.classList.toggle('is-on', current != null && n <= current);
      b.setAttribute('aria-checked', String(current === n));
      b.tabIndex = (current ? current === n : n === 1) ? 0 : -1;
    });
  };
  function set(v, notify, focus) {
    current = v;
    paint();
    if (focus && v) btns[v - 1].focus();
    if (notify && onChange) onChange(v);
  }
  wrap.append(...btns);
  paint();
  wrap.setValue = (v) => set(v, false);
  return wrap;
}

/** Read-only stars with a text alternative (not colour-only). */
export function ratingDisplay(value, { size = 14, label = 'Your rating' } = {}) {
  if (!value) return null;
  const wrap = h('span', { class: 'stars-static', role: 'img', 'aria-label': `${label}: ${value} out of 5` });
  for (let n = 1; n <= 5; n++) wrap.appendChild(h('span', { class: n <= value ? 'star-on' : 'star-off' }, icon('star', { size })));
  return wrap;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function emptyState({ iconName = 'recipes', title, text, actions = [] }) {
  return h('div', { class: 'empty-state' },
    h('div', { class: 'empty-icon' }, icon(iconName, { size: 32 })),
    h('h2', { class: 'empty-title' }, title),
    text ? h('p', { class: 'empty-text' }, text) : null,
    actions.length ? h('div', { class: 'empty-actions' }, actions) : null);
}

export function spinner(label = 'Loading') {
  return h('span', { class: 'spinner', role: 'status', 'aria-label': label });
}

/** Page header: serif title + optional subtitle + actions. */
export function pageHeader({ title, subtitle, actions, back }) {
  return h('header', { class: 'page-header' },
    back ? h('a', { class: 'back-link', href: back.href }, icon('left', { size: 18 }), back.label) : null,
    h('div', { class: 'page-header-row' },
      h('div', { class: 'page-header-text' },
        h('h1', { class: 'page-title' }, title),
        subtitle ? h('p', { class: 'page-subtitle' }, subtitle) : null),
      actions ? h('div', { class: 'page-actions' }, actions) : null));
}

export function badge(text, tone = 'neutral') {
  return h('span', { class: `badge badge-${tone}` }, text);
}
