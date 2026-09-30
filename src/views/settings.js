/**
 * views/settings.js — Appearance, Default Serving Size Behavior, Units, Backup,
 * Data Management, PWA / Offline, Privacy, About.
 */
import {
  h, formatDate, plural, readFileAsText, APP_VERSION, fill,
} from '../util.js';
import { icon } from '../icons.js';
import {
  button, pageHeader, segmented, sheet, confirmDialog, strongConfirm, toast, field, selectInput, checkboxRow, showBanner, removeBanner,
} from '../ui.js';
import {
  THEMES, getSetting, setSetting,
} from '../settings.js';
import { UNIT_SYSTEMS } from '../ingredients.js';
import {
  downloadBackup, validateBackupText, restoreBackup, getFolderStatus, chooseBackupFolder, removeBackupFolder,
  reauthorizeFolder, backupToFolder, getBackupMeta, deleteAllData, onDataReloaded,
} from '../backup.js';
import { recipeCount } from '../recipes.js';
import { listCollections } from '../collections.js';
import { allPlans } from '../mealplanner.js';
import { itemCount } from '../shopping.js';
import { loadSampleData, clearSampleData, sampleRecipesLoaded } from '../sample-data.js';
import {
  canInstall, promptInstall, isStandalone, isIOS, swSupported, offlineStatus, checkForUpdates, refreshAppFiles, requestPersistentStorage, isStoragePersistent, onPwaEvent, applyUpdate,
} from '../pwa.js';
import { storageEstimate } from '../db.js';

import { isOnline } from '../util.js';

const fmtBytes = (n) => (n > 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

function group(title, ...children) {
  return h('section', { class: 'card-section stack settings-group', 'aria-label': title }, h('h2', { class: 'section-title' }, title), ...children);
}

export function renderSettings() {
  const unsubs = [];

  // ---- Appearance -------------------------------------------------------------------
  const themeGroup = h('div', { class: 'theme-grid', role: 'radiogroup', 'aria-label': 'Theme' });
  const paintThemes = () => {
    const cur = getSetting('theme');
    fill(themeGroup, ...THEMES.map((t) => h('button', {
      type: 'button', class: `theme-card${cur === t.id ? ' is-selected' : ''}`, role: 'radio', 'aria-checked': String(cur === t.id),
      onclick: async () => { await setSetting('theme', t.id); paintThemes(); },
    },
    h('span', { class: 'swatches', 'aria-hidden': 'true' }, t.swatch.map((c) => h('span', { class: 'swatch', style: { background: c } }))),
    h('span', { class: 'theme-name' }, t.label),
    cur === t.id ? icon('check', { size: 16 }) : null)));
  };
  paintThemes();

  // ---- Serving behaviour / units -------------------------------------------------------------
  const servingsSeg = segmented({
    label: 'Default serving size behavior', value: getSetting('servingsBehavior'),
    options: [{ value: 'original', label: 'Recipe’s servings' }, { value: 'remember', label: 'Remember my choice' }],
    onChange: (v) => setSetting('servingsBehavior', v),
  });
  const unitsSeg = segmented({
    label: 'Default units', value: getSetting('unitSystem'), options: UNIT_SYSTEMS, onChange: (v) => setSetting('unitSystem', v),
  });

  // ---- Backup ----------------------------------------------------------------------------------
  const lastBackup = h('p', { class: 'field-hint', 'aria-live': 'polite' });
  const paintLast = async () => {
    const m = await getBackupMeta();
    lastBackup.textContent = m.lastBackupDate ? `Last backup: ${formatDate(m.lastBackupDate)} (${m.lastBackupMethod === 'folder' ? 'backup folder' : 'downloaded'})${m.lastBackupStatus === 'failed' ? ' — last attempt failed' : ''}.` : 'You haven’t made a backup yet.';
  };
  paintLast();

  const restoreInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', tabindex: '-1', 'aria-label': 'Choose a backup file' });
  restoreInput.addEventListener('change', async () => {
    const file = restoreInput.files && restoreInput.files[0];
    restoreInput.value = '';
    if (file) await restoreFlow(file);
  });

  const exportBtn = button({
    label: 'Export Full Backup', icon: 'download', variant: 'primary',
    onClick: async () => {
      exportBtn.disabled = true;
      try { const bytes = await downloadBackup(); toast(`Backup saved (${fmtBytes(bytes)}).`, { tone: 'success' }); paintLast(); } catch (e) { console.error(e); toast('The backup could not be created.', { tone: 'error' }); }
      exportBtn.disabled = false;
    },
  });

  // automatic folder backup
  const folderHost = h('div', { class: 'stack' });
  async function paintFolder() {
    const st = await getFolderStatus();
    const freq = selectInput({
      options: [{ value: 'off', label: 'Off' }, { value: 'daily', label: 'Daily' }, { value: 'every3', label: 'Every 3 Days' }, { value: 'weekly', label: 'Weekly' }],
      value: getSetting('backupFrequency'),
      onchange: async (e) => { await setSetting('backupFrequency', e.target.value); toast(e.target.value === 'off' ? 'Automatic backups are off.' : 'Backup schedule saved.', { tone: 'success' }); },
    });
    const retention = selectInput({
      options: [{ value: 'all', label: 'Keep all backups' }, { value: '7', label: 'Keep latest 7' }, { value: '14', label: 'Keep latest 14' }, { value: '30', label: 'Keep latest 30' }],
      value: String(getSetting('backupRetention')),
      onchange: async (e) => { await setSetting('backupRetention', e.target.value); },
    });
    const parts = [
      h('p', { class: 'muted' }, 'Choose a folder on your device. If you choose a folder synchronized with a cloud service, your backups can sync through that provider automatically.'),
    ];
    if (!st.supported) {
      parts.push(h('div', { class: 'callout' }, icon('info', { size: 18 }), h('div', null, h('p', null, 'This browser can’t write to a folder you choose. That feature works in Chrome, Edge and other Chromium browsers on desktop and Android. Everywhere else, use Export Full Backup — and set a schedule below to get a reminder when a backup is due.'))));
    } else {
      parts.push(h('div', { class: 'folder-status' },
        icon('folder', { size: 18 }),
        h('span', null, st.hasFolder ? h('strong', null, st.name) : 'No folder chosen yet.', st.hasFolder ? (st.permission === 'granted' ? ' — ready' : ' — needs permission') : ''),
      ));
      parts.push(h('div', { class: 'button-row' },
        button({
          label: st.hasFolder ? 'Change folder' : 'Choose folder', icon: 'folder', variant: 'secondary',
          onClick: async () => {
            try { const name = await chooseBackupFolder(); if (name) toast(`Backups will go to “${name}”.`, { tone: 'success' }); } catch (e) { toast(e.message === 'permission-denied' ? 'Permission to use that folder wasn’t granted.' : 'That folder couldn’t be used.', { tone: 'error' }); }
            paintFolder();
          },
        }),
        st.hasFolder && st.permission !== 'granted' ? button({ label: 'Allow access', variant: 'secondary', onClick: async () => { const p = await reauthorizeFolder(); toast(p === 'granted' ? 'Folder access restored.' : 'Access wasn’t granted.', { tone: p === 'granted' ? 'success' : 'error' }); removeBanner('backup'); paintFolder(); } }) : null,
        st.hasFolder ? button({ label: 'Remove folder', variant: 'ghost', onClick: async () => { await removeBackupFolder(); paintFolder(); } }) : null));
    }
    parts.push(field({ label: 'Backup Frequency', control: freq, hint: 'A backup is created when you open the app and enough time has passed. An installed web app can’t run while it is closed, so nothing happens in the background.' }));
    if (st.supported) {
      parts.push(field({ label: 'Backup retention', control: retention, hint: 'Only used if you choose a limit. Then older files named RecipeLibrary_Backup_YYYY-MM-DD.json in your backup folder are deleted automatically. Other files are never touched.' }));
      parts.push(h('div', { class: 'button-row' }, button({
        label: 'Backup Now', icon: 'hardDrive', variant: 'secondary', disabled: !st.hasFolder,
        onClick: async (ev) => {
          const btn = ev.currentTarget; btn.disabled = true;
          const res = await backupToFolder({ interactive: true });
          if (res.ok) { toast(`Backup saved as ${res.file}.`, { tone: 'success' }); removeBanner('backup'); } else toast(res.error || 'The backup failed.', { tone: 'error' });
          btn.disabled = false; paintLast(); paintFolder();
        },
      })));
    }
    fill(folderHost, ...parts);
  }
  paintFolder();

  const backupGroup = group('Backup',
    h('p', { class: 'muted' }, 'Your recipes live only on this device. Backups are plain JSON files you own — keep one somewhere safe.'),
    h('div', { class: 'button-row' }, exportBtn, button({ label: 'Restore Backup', icon: 'upload', variant: 'secondary', onClick: () => restoreInput.click() }), restoreInput),
    checkboxRow({ label: 'Include recipe photos in backups', checked: getSetting('backupIncludeImages'), id: 'bk-images', hint: 'Turn off for smaller files. Photos can be downloaded again from the original links.', onChange: (on) => setSetting('backupIncludeImages', on) }),
    lastBackup,
    h('hr', { class: 'rule' }),
    h('h3', { class: 'subsection-title' }, 'Automatic Backup Folder'),
    folderHost);

  // ---- Data management ----------------------------------------------------------------------------
  const dataStats = h('p', { class: 'muted', 'aria-live': 'polite' });
  const sampleInfo = h('p', { class: 'field-hint' });
  const paintData = () => {
    dataStats.textContent = `${plural(recipeCount(), 'recipe')}, ${plural(listCollections().length, 'collection')}, ${plural(allPlans().length, 'planned week')}, ${plural(itemCount(), 'shopping item')} on this device.`;
    const n = sampleRecipesLoaded();
    sampleInfo.textContent = n ? `${plural(n, 'sample recipe')} currently loaded. They are clearly labeled “Sample Recipe”.` : 'Fictional recipes for trying the app out. They are clearly labeled “Sample Recipe”.';
  };
  paintData();
  const refreshData = () => { paintData(); paintFolder(); };
  unsubs.push(onDataReloaded(refreshData));

  const dataGroup = group('Data Management',
    dataStats,
    h('div', { class: 'button-row' },
      button({ label: 'Load Sample Data', variant: 'secondary', onClick: async () => { const n = await loadSampleData(); toast(n ? `Added ${plural(n, 'sample recipe')}.` : 'Sample recipes are already loaded.', { tone: 'success' }); paintData(); } }),
      button({ label: 'Clear Sample Data', variant: 'secondary', onClick: async () => { const n = sampleRecipesLoaded(); if (!n) { toast('There is no sample data to clear.'); return; } await clearSampleData(); toast(`Removed ${plural(n, 'sample recipe')}.`, { tone: 'success' }); paintData(); } })),
    sampleInfo,
    h('hr', { class: 'rule' }),
    h('div', { class: 'danger-zone stack' },
      h('h3', { class: 'subsection-title' }, 'Delete All Data'),
      h('p', { class: 'muted' }, 'Permanently removes every recipe, photo, collection, meal plan, shopping list and setting from this device.'),
      button({ label: 'Delete All Data…', icon: 'trash', variant: 'danger', onClick: deleteAllFlow })));

  async function deleteAllFlow() {
    const dl = button({ label: 'Download a backup first', icon: 'download', variant: 'secondary', onClick: async () => { try { await downloadBackup(); toast('Backup downloaded.', { tone: 'success' }); } catch { toast('The backup could not be created.', { tone: 'error' }); } } });
    const ok = await strongConfirm({
      title: 'Delete all data?',
      message: h('div', { class: 'stack' }, h('p', null, `This will erase ${plural(recipeCount(), 'recipe')} and everything else stored by this app on this device. It cannot be undone.`), dl),
      phrase: 'DELETE', confirmLabel: 'Delete everything',
      checkboxLabel: 'I understand my data will be permanently deleted.',
    });
    if (!ok) return;
    await deleteAllData();
    toast('All data deleted.');
    paintThemes(); paintData();
    location.hash = '#/recipes';
  }

  // ---- PWA / offline --------------------------------------------------------------------------------------
  const pwaHost = h('div', { class: 'stack' });
  async function paintPwa() {
    const off = await offlineStatus();
    const est = await storageEstimate();
    const persisted = await isStoragePersistent();
    const rows = [];
    const row = (label, value) => h('div', { class: 'kv' }, h('dt', null, label), h('dd', null, value));
    rows.push(h('dl', { class: 'kv-list' },
      row('App', isStandalone() ? 'Installed' : 'Running in the browser'),
      row('Offline support', !off.supported ? 'Not available in this browser or on this address (needs HTTPS)' : off.controlled ? `Ready — ${off.cachedFiles} app files saved for offline use` : 'Setting up… reload once to finish'),
      row('Saved on this device', est ? `${fmtBytes(est.usage)} used${est.quota ? ` of about ${fmtBytes(est.quota)}` : ''}` : 'Unknown'),
      row('Protected from cleanup', persisted ? 'Yes' : 'Not yet')));
    rows.push(h('p', { class: 'muted' }, 'Saved recipes, collections, plans and lists work without a connection. Only importing a recipe link needs the internet.'));
    const btns = [];
    if (!isStandalone()) {
      if (canInstall()) btns.push(button({ label: 'Install app', icon: 'smartphone', variant: 'primary', onClick: async () => { const r = await promptInstall(); if (r === 'accepted') toast('Installing…', { tone: 'success' }); paintPwa(); } }));
      else if (isIOS()) rows.push(h('div', { class: 'callout' }, icon('smartphone', { size: 18 }), h('p', null, 'To install on iPhone or iPad: tap the Share button in Safari, then “Add to Home Screen”.')));
      else rows.push(h('p', { class: 'field-hint' }, 'To install, use your browser’s menu (“Install app” or “Add to Home screen”).'));
    }
    if (!persisted) btns.push(button({ label: 'Protect my data', icon: 'shield', variant: 'secondary', onClick: async () => { const ok = await requestPersistentStorage(); toast(ok ? 'Your data is now protected from automatic cleanup.' : 'The browser didn’t grant that. Keeping regular backups is the safest option.', { tone: ok ? 'success' : 'info' }); paintPwa(); } }));
    btns.push(button({
      label: 'Check for updates', icon: 'refresh', variant: 'secondary',
      onClick: async () => {
        if (!isOnline()) { toast('You appear to be offline.'); return; }
        const found = await checkForUpdates();
        if (found) showBanner({ id: 'update', message: 'A new version is ready.', actions: [{ label: 'Reload now', onClick: applyUpdate }], dismissible: true });
        else toast('You’re up to date.', { tone: 'success' });
      },
    }));
    if (swSupported()) btns.push(button({
      label: 'Refresh app files', variant: 'ghost',
      onClick: async () => {
        if (!isOnline()) { toast('Connect to the internet first — the app files need to be downloaded again.', { tone: 'error' }); return; }
        if (await confirmDialog({ title: 'Refresh app files?', message: 'This clears the saved copy of the app and downloads it again. Your recipes are not affected.', confirmLabel: 'Refresh' })) refreshAppFiles();
      },
    }));
    rows.push(h('div', { class: 'button-row' }, ...btns));
    fill(pwaHost, ...rows);
  }
  paintPwa();
  unsubs.push(onPwaEvent((e) => { if (['installable', 'installed', 'sw-ready'].includes(e.type)) paintPwa(); }));

  // ---- layout ---------------------------------------------------------------------------------------------------
  const el = h('section', { class: 'view view-settings' },
    pageHeader({ title: 'Settings' }),
    group('Appearance', h('p', { class: 'muted' }, 'Choose a color theme. The layout stays the same.'), themeGroup),
    group('Default Serving Size Behavior', h('p', { class: 'muted' }, 'When you open a recipe, should it start at its own serving size or at the size you chose last time?'), servingsSeg),
    group('Units', h('p', { class: 'muted' }, 'The default keeps each recipe’s original units. You can switch US/Metric on any recipe. Only safe conversions are made — volume to volume and weight to weight.'), unitsSeg),
    backupGroup,
    dataGroup,
    group('PWA / Offline', pwaHost),
    group('Privacy',
      h('ul', { class: 'plain-list' },
        h('li', null, 'Your recipe library stays on this device, in your browser’s storage. It is not uploaded anywhere.'),
        h('li', null, 'When you import a link, the address is sent to this app’s server function, which fetches that one page and returns the recipe. Nothing is stored on the server and recipe contents aren’t logged.'),
        h('li', null, 'There are no accounts, ads or analytics. Your backups are files you control.'),
        h('li', null, 'Recipes belong to their original authors. This app is for organizing your own personal collection and always keeps the source link.'))),
    group('About',
      h('p', null, h('strong', null, 'Recipe Library Studio'), ` · version ${APP_VERSION}`),
      h('p', { class: 'muted' }, 'Paste a recipe link. Build your personal recipe library. Works offline once installed.'),
      h('p', { class: 'field-hint' }, 'Fonts: Playfair Display and Montserrat, licensed under the SIL Open Font License.')));

  async function restoreFlow(file) {
    let text;
    try { text = await readFileAsText(file); } catch { toast('That file couldn’t be read.', { tone: 'error' }); return; }
    const v = validateBackupText(text);
    if (!v.ok) {
      const s = sheet({ title: 'This backup can’t be restored', size: 'sm', content: h('div', { class: 'stack' }, h('div', { class: 'callout callout-warn' }, icon('alert', { size: 18 }), h('div', null, v.errors.map((e) => h('p', null, e)))), h('p', { class: 'muted' }, 'Your current data has not been changed.')), footer: [button({ label: 'OK', variant: 'primary', onClick: () => s.close() })] });
      return;
    }
    const sum = v.summary;
    const line = (n, word, plur) => (n ? h('li', null, h('strong', null, String(n)), ` ${n === 1 ? word : plur || `${word}s`}`) : null);
    let mode = 'merge';
    const safety = checkboxRow({ label: 'Download a backup of my current data first', checked: recipeCount() > 0, id: 'restore-safety' });
    const modeSeg = segmented({ label: 'Restore method', value: mode, options: [{ value: 'merge', label: 'Merge With Existing Data' }, { value: 'replace', label: 'Replace Existing Data' }], onChange: (m) => { mode = m; note.textContent = noteText(); } });
    const noteText = () => (mode === 'merge'
      ? 'Adds everything from the backup. If a recipe exists in both, the one edited most recently is kept. Nothing is deleted.'
      : `Erases what is on this device now (${plural(recipeCount(), 'recipe')}) and replaces it with the backup.`);
    const note = h('p', { class: 'field-hint', 'aria-live': 'polite' }, noteText());
    const s = sheet({
      title: 'Restore backup', size: 'md',
      content: h('div', { class: 'stack' },
        h('p', { class: 'muted' }, `Backup from ${sum.createdAt ? formatDate(sum.createdAt) : 'an unknown date'}${sum.appVersion ? ` (app version ${sum.appVersion})` : ''} contains:`),
        h('ul', { class: 'summary-list' },
          line(sum.recipes, 'Recipe'), line(sum.collections, 'Collection'), line(sum.mealPlans, 'Meal Plan'), line(sum.shoppingLists, 'Shopping List'),
          sum.images ? line(sum.images, 'photo') : null),
        v.warnings.length ? h('div', { class: 'callout callout-warn' }, icon('alert', { size: 18 }), h('div', null, v.warnings.map((w) => h('p', null, w)))) : null,
        modeSeg, note, safety),
      footer: [button({ label: 'Cancel', variant: 'secondary', onClick: () => s.close(null) }), button({ label: 'Restore', variant: 'primary', onClick: () => s.close({ mode, safety: safety.querySelector('input').checked }) })],
    });
    const choice = await s.closed;
    if (!choice) return;
    if (choice.mode === 'replace' && recipeCount() + listCollections().length > 0) {
      const ok = await confirmDialog({ title: 'Replace everything?', message: `Your current ${plural(recipeCount(), 'recipe')} and other data will be replaced by the backup. This can’t be undone${choice.safety ? ' (a safety backup is being downloaded first)' : ''}.`, confirmLabel: 'Replace my data', danger: true });
      if (!ok) return;
    }
    try {
      if (choice.safety && recipeCount() > 0) await downloadBackup({ fileName: `RecipeLibrary_BeforeRestore_${new Date().toISOString().slice(0, 10)}.json` });
      const res = await restoreBackup(v.clean, choice.mode);
      toast(res.mode === 'replace'
        ? `Restored ${plural(res.recipes, 'recipe')}.`
        : `Merged: ${res.recipesAdded} new, ${res.recipesUpdated} updated, ${res.recipesKept} kept as-is.`, { tone: 'success' });
      paintThemes(); paintData(); paintFolder();
    } catch (err) {
      console.error(err);
      toast(err && err.quota ? 'Your device is out of storage space, so nothing was changed.' : 'The restore failed and your existing data was left untouched.', { tone: 'error' });
    }
  }

  return { el, title: 'Settings', destroy() { unsubs.forEach((u) => u()); } };
}
