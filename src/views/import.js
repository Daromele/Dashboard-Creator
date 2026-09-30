/**
 * views/import.js — "Paste URL → Import → Review → Save".
 *
 * Tabs: From a link | Paste recipe text. "Enter manually" is one click away.
 * Failure never shows a technical error: it shows
 *   "We couldn't fully detect this recipe."
 * with Try Again / Enter Recipe Manually / Paste Recipe Text / Open Original Recipe,
 * and pre-fills whatever was found.
 */
import {
  h, safeHttpUrl, hostOf, formatDate, isOnline, fill,
} from '../util.js';
import { icon } from '../icons.js';
import {
  button, field, textInput, textArea, pageHeader, segmented, sheet, checkboxRow, spinner, toast,
} from '../ui.js';
import {
  importFromUrl, ImportError, cleanUserUrl, knownUrls, describeFindings, startImageCache, draftFromPastedText, GENERIC_FAIL_TITLE,
} from '../importer.js';
import { findDuplicates, createBlankRecipe } from '../recipes.js';
import { recipeImage } from '../images.js';
import { onPwaEvent } from '../pwa.js';
import { session } from '../state.js';
import { navigate } from '../router.js';

// ---------------------------------------------------------------------------
// Duplicate dialog
// ---------------------------------------------------------------------------

/** Resolves { action: 'open'|'anyway'|'replace', recipe } or null (cancel). */
export function duplicateDialog(matches) {
  return new Promise((resolve) => {
    const top = matches[0];
    const reasonText = (m) => (m.reason === 'url' ? 'Same link' : 'Same title');
    const rows = matches.slice(0, 3).map((m) => h('div', { class: 'dup-row' },
      recipeImage(m.recipe, { variant: 'thumb', className: 'dup-thumb' }),
      h('div', { class: 'dup-text' },
        h('strong', null, m.recipe.title),
        h('span', { class: 'muted' }, `${reasonText(m)} · saved ${formatDate(m.recipe.createdAt)}${m.recipe.sourceName ? ` · ${m.recipe.sourceName}` : ''}`))));
    const s = sheet({
      title: 'This recipe may already be in your library.',
      size: 'md',
      dismissible: true,
      content: h('div', { class: 'stack' },
        h('div', { class: 'stack' }, ...rows),
        h('p', { class: 'muted' }, 'Nothing is changed unless you choose “Replace Existing”. Replacing keeps your rating, favorite, notes, cooking history and collections.')),
      footer: [
        button({ label: 'Cancel', variant: 'ghost', onClick: () => s.close(null) }),
        button({ label: 'Import Anyway', variant: 'secondary', onClick: () => s.close({ action: 'anyway', recipe: top.recipe }) }),
        button({ label: 'Replace Existing', variant: 'secondary', onClick: () => s.close({ action: 'replace', recipe: top.recipe }) }),
        button({ label: 'Open Existing', variant: 'primary', onClick: () => s.close({ action: 'open', recipe: top.recipe }) }),
      ],
    });
    s.closed.then(resolve);
  });
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function renderImport({ query }) {
  let tab = query.tab === 'paste' ? 'paste' : 'link';
  let abort = null;
  let busy = false;
  const unsubs = [];

  // ---- link panel ---------------------------------------------------------------
  const urlInput = textInput({
    type: 'text', inputmode: 'url', placeholder: 'https://www.example.com/your-recipe', value: query.url || '',
    autocapitalize: 'none', spellcheck: 'false', enterkeyhint: 'go', autocomplete: 'off',
  });
  const urlField = field({ label: 'Recipe link', control: urlInput, hint: 'Copy a recipe’s web address, then paste it here.' });
  const offlineNote = h('div', { class: 'callout callout-warn', role: 'status' }, icon('wifiOff', { size: 18 }),
    h('div', null, h('strong', null, 'Internet connection required'), h('p', null, 'Importing a link needs to be online. Your saved recipes still work offline, and you can paste recipe text or enter a recipe manually right now.')));
  const importBtn = button({ label: 'Import Recipe', icon: 'download', variant: 'primary', className: 'btn-lg', type: 'submit' });
  const pasteClipBtn = navigator.clipboard && navigator.clipboard.readText
    ? button({ label: 'Paste from clipboard', icon: 'copy', variant: 'secondary', onClick: async () => {
      try { const t = await navigator.clipboard.readText(); if (t) { urlInput.value = t.trim(); urlField.setError(''); urlInput.focus(); } else toast('The clipboard is empty.'); } catch { toast('Couldn’t read the clipboard. Paste into the box instead.'); }
    } })
    : null;
  const inboxRow = checkboxRow({
    label: 'Save to Inbox', checked: !!session.importToInbox, id: 'import-inbox',
    hint: 'Skip organizing for now — find it later under the Inbox filter.',
    onChange: (on) => { session.importToInbox = on; },
  });
  // Offline, the submit button is disabled (so Enter would do nothing): explain instead.
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !isOnline()) { e.preventDefault(); runImport(urlInput.value); } });
  const status = h('div', { class: 'import-status', 'aria-live': 'polite' });
  const linkForm = h('form', { class: 'stack', novalidate: '', onsubmit: (e) => { e.preventDefault(); runImport(urlInput.value); } },
    urlField,
    h('div', { class: 'button-row' }, importBtn, pasteClipBtn),
    inboxRow);
  const linkPanel = h('div', { class: 'stack-lg' }, offlineNote, linkForm, status,
    h('p', { class: 'fineprint' }, icon('shield', { size: 14 }), ' We read only the one page you paste, to help you organize your personal library. Recipes belong to their authors, so the original link is always kept with each recipe. Nothing you import is stored on our servers.'));

  const paintOffline = () => {
    const off = !isOnline();
    offlineNote.hidden = !off;
    importBtn.disabled = off || busy;
    importBtn.title = off ? 'Internet connection required' : '';
  };
  paintOffline();
  unsubs.push(onPwaEvent((e) => { if (e.type === 'online' || e.type === 'offline') paintOffline(); }));

  // ---- paste panel -------------------------------------------------------------------
  const pName = textInput({ maxlength: 200, placeholder: 'e.g. Grandma’s Banana Bread', autocapitalize: 'sentences' });
  const pUrl = textInput({ type: 'text', inputmode: 'url', placeholder: 'https://… (optional)', autocapitalize: 'none', spellcheck: 'false' });
  const pIng = textArea({ rows: 8, placeholder: '2 cups flour\n1 tsp baking soda\n3 ripe bananas', spellcheck: 'false' });
  const pIns = textArea({ rows: 8, placeholder: '1. Preheat the oven to 350°F.\n2. Mash the bananas.\n3. Mix and bake for 50 minutes.', spellcheck: 'false' });
  const pNameField = field({ label: 'Recipe name', control: pName, required: true });
  const pUrlField = field({ label: 'Source link', control: pUrl, hint: 'If this came from a website, add the address so you can find it again.' });
  const pIngField = field({ label: 'Ingredients', control: pIng, hint: 'Paste one ingredient per line. Bullets and checkboxes are removed for you.' });
  const pInsField = field({ label: 'Instructions', control: pIns, hint: 'Numbered steps are detected. You can also paste a whole recipe with “Ingredients” and “Directions” headings into the Ingredients box.' });
  const pasteForm = h('form', { class: 'stack', novalidate: '', onsubmit: (e) => { e.preventDefault(); reviewPasted(); } },
    pNameField, pUrlField, pIngField, pInsField,
    h('div', { class: 'button-row' }, button({ label: 'Review Recipe', icon: 'check', variant: 'primary', className: 'btn-lg', type: 'submit' })));

  function reviewPasted() {
    pNameField.setError(''); pUrlField.setError(''); pIngField.setError('');
    let problem = false;
    const wholeRecipe = /(^|\n)\s*(directions|instructions|method)\s*:?\s*(\n|$)/i.test(pIng.value) && /ingredients/i.test(pIng.value);
    if (!pName.value.trim() && !wholeRecipe) { pNameField.setError('Give the recipe a name.'); problem = true; }
    const rawUrl = pUrl.value.trim();
    let url = '';
    if (rawUrl) {
      url = safeHttpUrl(/^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
      if (!url) { pUrlField.setError('Enter a full web address, or leave this blank.'); problem = true; }
    }
    if (!pIng.value.trim() && !pIns.value.trim()) { pIngField.setError('Paste the ingredients and/or the instructions.'); problem = true; }
    if (problem) { toast('Please fix the highlighted fields.', { tone: 'error' }); return; }
    const draft = draftFromPastedText({ title: pName.value, ingredients: pIng.value, instructions: pIns.value, sourceUrl: url });
    draft.inbox = !!session.importToInbox;
    session.importDraft = draft;
    session.importMeta = { mode: 'paste' };
    navigate('#/import/review');
  }

  // ---- import flow ---------------------------------------------------------------------------
  function setBusy(on, msg) {
    busy = on;
    paintOffline();
    urlInput.readOnly = on;
    fill(status, on ? h('div', { class: 'import-progress' }, spinner('Importing'), h('span', null, msg || 'Reading the recipe…'),
      button({ label: 'Cancel', variant: 'ghost', className: 'btn-sm', onClick: () => { if (abort) abort.abort(); } })) : null);
  }

  async function runImport(raw, { fresh = false } = {}) {
    if (busy) return;
    urlField.setError('');
    fill(status, );
    let url;
    try { url = cleanUserUrl(raw); } catch (e) {
      urlField.setError(e.message);
      urlInput.focus();
      return;
    }
    if (!isOnline()) { showFailure({ error: new ImportError('OFFLINE'), url }); return; }

    let decision = null;
    // Pre-check: same link already saved? (saves a server request too)
    const pre = findDuplicates({ urls: [url] }).filter((m) => m.reason === 'url');
    if (pre.length) {
      decision = await duplicateDialog(pre);
      if (!decision) return;
      if (decision.action === 'open') { navigate(`#/recipe/${encodeURIComponent(decision.recipe.id)}`); return; }
    }

    abort = new AbortController();
    setBusy(true);
    let result;
    try {
      result = await importFromUrl(url, { signal: abort.signal, fresh });
    } catch (err) {
      setBusy(false);
      if (err instanceof ImportError && err.code === 'CANCELLED') { fill(status, h('p', { class: 'muted' }, 'Import cancelled.')); return; }
      if (err instanceof ImportError && err.inline) { urlField.setError(err.message); urlInput.focus(); return; }
      showFailure({ error: err instanceof ImportError ? err : new ImportError('FETCH_FAILED'), url });
      return;
    }
    setBusy(false);

    // Post-check (title / canonical / final URL) — only for recipes we would actually save. A
    // partial result goes to the recovery screen instead; same-link duplicates were caught above.
    if (!decision && result.status === 'complete') {
      const post = findDuplicates({ urls: knownUrls(result), title: result.draft.title });
      if (post.length) {
        decision = await duplicateDialog(post);
        if (!decision) return;
        if (decision.action === 'open') { navigate(`#/recipe/${encodeURIComponent(decision.recipe.id)}`); return; }
      }
    }
    const replaceId = decision && decision.action === 'replace' ? decision.recipe.id : '';

    const draft = result.draft;
    draft.inbox = !!session.importToInbox && !replaceId;
    if (result.status === 'complete') {
      session.importDraft = draft;
      session.importMeta = { mode: 'import', imagePromise: startImageCache(draft), replaceId, missing: [], partial: false };
      navigate('#/import/review');
      return;
    }
    showFailure({ result, url, replaceId });
  }

  function openReview(draft, meta) {
    session.importDraft = draft;
    session.importMeta = { mode: 'import', imagePromise: draft.image ? startImageCache(draft) : null, partial: true, ...meta };
    navigate('#/import/review');
  }

  function showFailure({ error, result, url, replaceId = '' }) {
    const draft = result ? result.draft : createBlankRecipe({ sourceUrl: safeHttpUrl(url) || '', sourceName: hostOf(url), dateImported: '' });
    const findings = result ? describeFindings(result) : null;
    const original = safeHttpUrl(url);
    const nothingFound = findings && findings.missing.includes('ingredients') && findings.missing.includes('instructions');
    const primaryMsg = error ? error.message : (nothingFound ? "We found the page but couldn't detect structured recipe information." : 'Some parts of this recipe were missing from the page.');
    const hint = error ? error.hint : 'Finish it below — we’ll fill in everything we did find.';
    const offline = error && error.code === 'OFFLINE';

    const card = h('div', { class: 'failure-card', role: 'alert' },
      h('div', { class: 'failure-icon' }, icon(offline ? 'wifiOff' : 'alert', { size: 26 })),
      h('h2', { class: 'failure-title' }, offline ? 'You appear to be offline.' : GENERIC_FAIL_TITLE),
      offline ? null : h('p', { class: 'failure-message' }, primaryMsg),
      h('p', { class: 'muted' }, hint),
      findings && (findings.found.length || findings.missing.length) ? h('dl', { class: 'findings' },
        findings.found.length ? h('div', null, h('dt', null, 'Found'), h('dd', null, findings.found.join(', '))) : null,
        findings.missing.length ? h('div', null, h('dt', null, 'Missing'), h('dd', null, findings.missing.join(', '))) : null) : null,
      h('div', { class: 'failure-actions' },
        button({ label: 'Try Again', icon: 'refresh', variant: 'primary', disabled: offline && !isOnline(), onClick: () => { fill(status, ); runImport(url, { fresh: true }); } }),
        button({ label: 'Enter Recipe Manually', icon: 'edit', variant: 'secondary', onClick: () => openReview(draft, { partial: !!result, missing: findings ? findings.missing : [], replaceId }) }),
        button({ label: 'Paste Recipe Text', icon: 'file', variant: 'secondary', onClick: () => { tab = 'paste'; pName.value = draft.title || ''; pUrl.value = original || ''; fill(status, ); paintTabs(); pName.focus(); } }),
        original ? h('a', { class: 'btn btn-ghost', href: original, target: '_blank', rel: 'noopener noreferrer' }, icon('external', { size: 18 }), h('span', { class: 'btn-label' }, 'Open Original Recipe')) : null));
    fill(status, card);
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ---- layout ---------------------------------------------------------------------------------------------
  const panelHost = h('div');
  const tabs = segmented({
    label: 'Import method', value: tab,
    options: [{ value: 'link', label: 'From a link' }, { value: 'paste', label: 'Paste recipe text' }],
    onChange: (v) => { tab = v; paintTabs(); },
  });
  function paintTabs() {
    tabs.setValue(tab);
    fill(panelHost, tab === 'link' ? linkPanel : pasteForm);
    paintOffline();
  }
  paintTabs();

  const el = h('section', { class: 'view view-import' },
    pageHeader({
      title: 'Import Recipe',
      subtitle: 'Paste a recipe link. Build your personal recipe library.',
      actions: [button({ label: 'Enter manually', icon: 'edit', variant: 'secondary', onClick: () => navigate('#/new') })],
    }),
    tabs, panelHost);

  if (query.url) setTimeout(() => urlInput.focus(), 60); else if (tab === 'link') setTimeout(() => urlInput.focus(), 60);
  return { el, title: 'Import Recipe', destroy() { unsubs.forEach((u) => u()); if (abort) abort.abort(); } };
}
