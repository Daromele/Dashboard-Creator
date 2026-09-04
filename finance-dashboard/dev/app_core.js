/* ============================================================
   APP CORE — state, storage, backup, UI helpers, charts
   ============================================================ */
const LS_KEY = 'pfd:v1:state';
const LS_SESS = 'pfd:v1:sessions';
const LS_LAST_EXPORT = 'pfd:v1:lastExportSession';
const LS_UI = 'pfd:v1:ui';
const IDB_NAME = 'pfd-backup', IDB_STORE = 'kv';
const VERIFY_EVERY = 20;
const REMIND_EVERY_SESSIONS = 5;

const DEFAULT_CATEGORIES = ['Housing', 'Utilities', 'Groceries', 'Transport', 'Insurance', 'Health', 'Dining', 'Entertainment', 'Subscriptions', 'Shopping', 'Personal', 'Kids', 'Pets', 'Gifts', 'Education', 'Debt Payments', 'Savings', 'Travel', 'Other'];
const INCOME_TYPES = ['Salary', 'Wages', 'Freelance', 'Business', 'Benefits', 'Rental', 'Investment', 'Pension', 'Other'];
const ACCOUNT_TYPES = [
  { v: 'checking', l: 'Checking / Current', liability: false, spendable: true },
  { v: 'savings', l: 'Savings', liability: false },
  { v: 'cash', l: 'Cash', liability: false, spendable: true },
  { v: 'investment', l: 'Investments', liability: false },
  { v: 'retirement', l: 'Retirement / Pension', liability: false },
  { v: 'property', l: 'Property', liability: false },
  { v: 'vehicle', l: 'Vehicle', liability: false },
  { v: 'other-asset', l: 'Other asset', liability: false },
  { v: 'credit-card', l: 'Credit card', liability: true },
  { v: 'loan', l: 'Loan', liability: true },
  { v: 'mortgage', l: 'Mortgage', liability: true },
  { v: 'other-liability', l: 'Other liability', liability: true },
];
const DEBT_TYPES = ['Credit card', 'Personal loan', 'Car loan', 'Student loan', 'Mortgage', 'Medical', 'Buy now pay later', 'Family loan', 'Other'];
const CURRENCIES = [
  ['USD', '$', 'en-US', 'US Dollar'], ['EUR', '€', 'de-DE', 'Euro'], ['GBP', '£', 'en-GB', 'British Pound'], ['AUD', 'A$', 'en-AU', 'Australian Dollar'],
  ['CAD', 'C$', 'en-CA', 'Canadian Dollar'], ['NZD', 'NZ$', 'en-NZ', 'New Zealand Dollar'], ['CHF', 'CHF', 'de-CH', 'Swiss Franc'], ['JPY', '¥', 'ja-JP', 'Japanese Yen'],
  ['INR', '₹', 'en-IN', 'Indian Rupee'], ['SEK', 'kr', 'sv-SE', 'Swedish Krona'], ['NOK', 'kr', 'nb-NO', 'Norwegian Krone'], ['DKK', 'kr', 'da-DK', 'Danish Krone'],
  ['ZAR', 'R', 'en-ZA', 'South African Rand'], ['BRL', 'R$', 'pt-BR', 'Brazilian Real'], ['MXN', '$', 'es-MX', 'Mexican Peso'], ['SGD', 'S$', 'en-SG', 'Singapore Dollar'],
  ['HKD', 'HK$', 'en-HK', 'Hong Kong Dollar'], ['PLN', 'zł', 'pl-PL', 'Polish Złoty'], ['CZK', 'Kč', 'cs-CZ', 'Czech Koruna'], ['PHP', '₱', 'en-PH', 'Philippine Peso'],
  ['AED', 'AED', 'en-AE', 'UAE Dirham'], ['ILS', '₪', 'he-IL', 'Israeli Shekel'], ['KRW', '₩', 'ko-KR', 'South Korean Won'], ['CUSTOM', '', 'en-US', 'Custom symbol'],
].map(([code, symbol, locale, name]) => ({ code, symbol, locale, name }));

// ---------- Storage wrapper (localStorage with quota detection) ----------
const storage = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) {
    try { localStorage.setItem(k, v); return { ok: true }; }
    catch (e) {
      const quota = !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
      return { ok: false, quota, error: e };
    }
  },
  remove(k) { try { localStorage.removeItem(k); } catch (e) { } },
  available() { try { localStorage.setItem('pfd:probe', '1'); localStorage.removeItem('pfd:probe'); return true; } catch (e) { return false; } },
};

// ---------- IndexedDB key/value (for file handle + last-known-good) ----------
const idb = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      try {
        const rq = indexedDB.open(IDB_NAME, 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore(IDB_STORE);
        rq.onsuccess = () => { this._db = rq.result; res(this._db); };
        rq.onerror = () => rej(rq.error);
      } catch (e) { rej(e); }
    });
  },
  async get(key) { try { const db = await this.open(); return await new Promise((res, rej) => { const r = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch (e) { return undefined; } },
  async set(key, val) { try { const db = await this.open(); await new Promise((res, rej) => { const t = db.transaction(IDB_STORE, 'readwrite'); t.objectStore(IDB_STORE).put(val, key); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; } catch (e) { return false; } },
  async del(key) { try { const db = await this.open(); await new Promise((res, rej) => { const t = db.transaction(IDB_STORE, 'readwrite'); t.objectStore(IDB_STORE).delete(key); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { } },
};

// ---------- State ----------
let state = null;
const ui = { view: 'overview', month: D.thisMonth(), txnFilter: {}, debtStrategy: 'snowball', reportYear: D.thisMonth().slice(0, 4), calendarMode: 'list', budgetShowAll: false };

function defaultSettings() {
  return {
    householdMode: 'single', person1Name: 'Me', person2Name: 'Partner',
    currency: { code: 'USD', symbol: '$', locale: 'en-US' },
    startMonth: D.thisMonth(), safetyBuffer: 0, budgetRollover: 'off', includeSubsInBills: true,
    categories: DEFAULT_CATEGORIES.slice(), spendableTypes: ['checking', 'cash'], onboarded: false, emergencyMonths: 3,
  };
}
function blankState() {
  return { __schema: SCHEMA_VERSION, __app: APP_VERSION, savedAt: null, settings: defaultSettings(), accounts: [], income: [], bills: [], subs: [], txns: [], budgets: [], debts: [], goals: [], snapshots: [], billPaid: {} };
}
function normalizeState(s) {
  const b = blankState();
  const out = Object.assign(b, s);
  out.settings = Object.assign(defaultSettings(), s.settings || {});
  if (!out.settings.currency || typeof out.settings.currency !== 'object') out.settings.currency = defaultSettings().currency;
  if (!Array.isArray(out.settings.categories) || !out.settings.categories.length) out.settings.categories = DEFAULT_CATEGORIES.slice();
  for (const c of COLLECTIONS) if (!Array.isArray(out[c])) out[c] = [];
  if (!out.billPaid || typeof out.billPaid !== 'object') out.billPaid = {};
  for (const t of out.txns) { if (!Array.isArray(t.splits) || !t.splits.length) t.splits = [{ category: t.category || 'Other', amount: num(t.amount) }]; if (!t.month) t.month = D.monthOf(t.date); }
  out.__schema = SCHEMA_VERSION; out.__app = APP_VERSION;
  return out;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function loadState() {
  const raw = storage.get(LS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const v = validateImport(parsed);
    if (!v.ok) { console.warn('Stored state invalid:', v.reason); return null; }
    return normalizeState(migrate(parsed));
  } catch (e) { console.warn('Could not parse stored state', e); return null; }
}
function serialize() { return JSON.stringify(state); }
function persist() {
  state.savedAt = new Date().toISOString();
  state.__app = APP_VERSION; state.__schema = SCHEMA_VERSION;
  const json = serialize();
  const r = storage.set(LS_KEY, json);
  if (!r.ok) toast(r.quota ? 'Browser storage is full. Export a JSON backup now and delete old transactions.' : 'Could not save to browser storage. Export a backup to be safe.', 'bad', 8000);
  backupFile.scheduleWrite();
  return json;
}
function commit(fn, opts) {
  if (typeof fn === 'function') fn(state);
  maybeSnapshot();
  persist();
  if (!opts || !opts.silent) render();
}
function saveUi() { storage.set(LS_UI, JSON.stringify({ view: ui.view, month: ui.month, debtStrategy: ui.debtStrategy, calendarMode: ui.calendarMode })); }
function loadUi() { try { const u = JSON.parse(storage.get(LS_UI) || '{}'); if (u.view) ui.view = u.view; if (u.debtStrategy) ui.debtStrategy = u.debtStrategy; if (u.calendarMode) ui.calendarMode = u.calendarMode; } catch (e) { } }

// ---------- Derived helpers ----------
const S = () => state.settings;
const isCouple = () => S().householdMode === 'couple';
const ownerName = o => o === 'p2' ? S().person2Name : o === 'joint' ? 'Joint' : S().person1Name;
const ownerChip = o => isCouple() ? `<span class="chip ${o || 'p1'}">${esc(ownerName(o || 'p1'))}</span>` : '';
const catList = () => S().categories;
const accountType = v => ACCOUNT_TYPES.find(t => t.v === v) || ACCOUNT_TYPES[0];
const byId = (coll, id) => (state[coll] || []).find(x => x.id === id);

function billItems() {
  const items = state.bills.slice();
  if (S().includeSubsInBills) items.push(...state.subs.map(subAsRecurring));
  return items;
}
function isBillPaid(month, id) { return !!(state.billPaid[month] && state.billPaid[month][id]); }
function expenseTxnsInMonth(month) { return state.txns.filter(t => t.month === month && t.type === 'expense'); }
function incomeTxnsInMonth(month) { return state.txns.filter(t => t.month === month && t.type === 'income'); }
const txnTotal = t => sum(t.splits, s => s.amount);
function categoryActuals(month) {
  const out = {};
  for (const t of expenseTxnsInMonth(month)) for (const s of t.splits) out[s.category || 'Other'] = round2((out[s.category || 'Other'] || 0) + num(s.amount));
  return out;
}
function expectedIncome(month) { return round2(sum(state.income, i => amountInMonth(i, month))); }
function expectedBills(month) { return round2(sum(billItems(), b => amountInMonth(b, month))); }
function monthSummary(month) {
  const income = round2(sum(incomeTxnsInMonth(month), txnTotal));
  const expenses = round2(sum(expenseTxnsInMonth(month), txnTotal));
  const saved = round2(sum(expenseTxnsInMonth(month), t => sum(t.splits.filter(sp => sp.category === 'Savings'), sp => sp.amount)));
  const net = round2(income - expenses);
  // Money moved into the "Savings" category is saved, not spent, so it counts toward the savings rate.
  const savingsRate = income > 0 ? (net + saved) / income * 100 : null;
  return { month, income, expenses, saved, net, savingsRate, expectedIncome: expectedIncome(month), expectedBills: expectedBills(month) };
}
function netWorth() {
  const assets = round2(sum(state.accounts.filter(a => !a.isLiability), a => a.balance));
  const liabilities = round2(sum(state.accounts.filter(a => a.isLiability), a => a.balance));
  const debts = round2(sum(state.debts, d => d.currentBalance));
  return { assets, liabilities, debts, net: round2(assets - liabilities - debts) };
}
function maybeSnapshot() {
  if (!state.accounts.length && !state.debts.length) return;
  const nw = netWorth(); const month = D.thisMonth();
  const i = state.snapshots.findIndex(s => D.monthOf(s.date) === month);
  const snap = { date: D.today(), assets: nw.assets, liabilities: round2(nw.liabilities + nw.debts), net: nw.net };
  if (i >= 0) { if (state.snapshots[i].net === snap.net && state.snapshots[i].assets === snap.assets) return; state.snapshots[i] = snap; }
  else state.snapshots.push(snap);
  state.snapshots.sort((a, b) => a.date < b.date ? -1 : 1);
}
function monthsWithData() {
  const set = new Set([D.thisMonth(), S().startMonth].filter(Boolean));
  for (const t of state.txns) set.add(t.month);
  for (const b of state.budgets) set.add(b.month);
  return [...set].sort();
}
function safeToSpend(month) {
  const today = D.today();
  const inMonth = month === D.thisMonth();
  const from = inMonth ? today : D.monthStart(month), to = D.monthEnd(month);
  const spendable = state.accounts.filter(a => !a.isLiability && (S().spendableTypes || []).includes(a.type));
  const available = round2(sum(spendable, a => a.balance));
  let upcomingBills = 0; const upcomingList = [];
  for (const b of billItems()) {
    if (isBillPaid(month, b.id)) continue;
    const hits = occurrences(b, from, to);
    if (hits.length) { upcomingBills = round2(upcomingBills + hits.length * num(b.amount)); upcomingList.push({ name: b.name, amount: hits.length * num(b.amount), date: hits[0], isSub: !!b._isSub }); }
  }
  const goals = round2(sum(state.goals.filter(g => num(g.current) < num(g.target)), g => g.monthlyContribution));
  const buffer = num(S().safetyBuffer);
  const result = round2(available - upcomingBills - goals - buffer);
  return { available, upcomingBills, upcomingList, goals, buffer, result, accounts: spendable };
}

// ---------- Backup file (File System Access API) ----------
const backupFile = {
  supported: typeof window !== 'undefined' && 'showSaveFilePicker' in window,
  handle: null, status: 'off', writeCount: 0, lastWrite: null, lastVerified: null, timer: null, fileName: '', lastError: '',
  async init() {
    if (!this.supported) { this.status = 'unsupported'; return; }
    try {
      const h = await idb.get('handle');
      if (!h) { this.status = 'off'; return; }
      this.handle = h; this.fileName = h.name || 'backup.json';
      const wc = await idb.get('writeCount'); if (typeof wc === 'number') this.writeCount = wc;
      const p = await h.queryPermission({ mode: 'readwrite' });
      if (p === 'granted') { this.status = 'linked'; await this.checkStale(); }
      else this.status = 'needs-permission';
    } catch (e) { this.status = 'error'; this.lastError = e.message; }
    this.renderStatus();
  },
  async link() {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: 'Finance-Dashboard-Backup.json', types: [{ description: 'JSON backup', accept: { 'application/json': ['.json'] } }] });
      this.handle = h; this.fileName = h.name; this.status = 'linked'; this.writeCount = 0;
      await idb.set('handle', h);
      await this.write(true);
      toast(`Auto-backup linked to ${h.name}`, 'good');
    } catch (e) { if (e.name !== 'AbortError') { this.status = 'error'; this.lastError = e.message; toast('Could not link backup file: ' + e.message, 'bad'); } }
    this.renderStatus(); render();
  },
  async unlink() {
    this.handle = null; this.status = 'off'; this.fileName = '';
    await idb.del('handle');
    this.renderStatus(); render();
    toast('Auto-backup turned off. Your data stays in this browser.', 'default');
  },
  async requestPermission() {
    if (!this.handle) return;
    try {
      const p = await this.handle.requestPermission({ mode: 'readwrite' });
      if (p === 'granted') { this.status = 'linked'; await this.checkStale(); await this.write(true); toast('Auto-backup reconnected', 'good'); }
      else toast('Permission not granted — auto-backup stays paused', 'warn');
    } catch (e) { this.status = 'error'; this.lastError = e.message; }
    this.renderStatus(); render();
  },
  scheduleWrite() {
    if (this.status !== 'linked' || !this.handle) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.write(false), 2000);
  },
  async write(force) {
    if (!this.handle || (this.status !== 'linked' && !force)) return;
    const payload = serialize();
    try {
      const w = await this.handle.createWritable();
      await w.write(payload); await w.close();
      this.writeCount++; this.lastWrite = new Date(); this.status = 'linked';
      idb.set('writeCount', this.writeCount);
      if (force || this.writeCount % VERIFY_EVERY === 0) await this.verify(payload);
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'SecurityError') { this.status = 'needs-permission'; toast('Auto-backup needs permission again', 'warn', 6000, { label: 'Allow', action: 'backupPermission' }); }
      else { this.status = 'error'; this.lastError = e.message; toast('Auto-backup write failed: ' + e.message, 'bad'); }
    }
    this.renderStatus();
  },
  async verify(payload) {
    try {
      const f = await this.handle.getFile();
      const text = await f.text();
      const parsed = JSON.parse(text);
      const a = recordCounts(parsed), b = recordCounts(state);
      const same = JSON.stringify(a) === JSON.stringify(b) && parsed.savedAt === state.savedAt;
      if (same) { this.lastVerified = new Date(); await idb.set('lkg', text); await idb.set('lkgAt', state.savedAt); }
      else { this.status = 'error'; this.lastError = 'Verification mismatch'; toast('Backup verification failed — the file on disk does not match. Export a manual JSON backup.', 'bad', 9000); }
    } catch (e) { this.status = 'error'; this.lastError = 'Verify: ' + e.message; toast('Backup verification failed — the file on disk could not be read back. Export a manual JSON backup.', 'bad', 9000); }
  },
  async checkStale() {
    try {
      const f = await this.handle.getFile();
      if (!f.size) return;
      const parsed = JSON.parse(await f.text());
      const v = validateImport(parsed);
      if (!v.ok) return;
      if (parsed.savedAt && state.savedAt && parsed.savedAt > state.savedAt) {
        await new Promise(resolve => {
          openModal(`<div class="modal narrow"><div class="modal-head"><h3>Backup file is newer</h3></div><div class="modal-body">
            <p>The linked backup file was saved <b>${esc(fmtDateTime(parsed.savedAt))}</b>, which is newer than the data in this browser (saved ${esc(fmtDateTime(state.savedAt))}).</p>
            <p class="small muted">This usually means you used the dashboard on another device or browser. Choose which copy to keep — nothing is overwritten until you pick.</p>
            <div class="small mt"><b>File:</b> ${countsLabel(recordCounts(parsed))}<br><b>This browser:</b> ${countsLabel(recordCounts(state))}</div>
          </div><div class="modal-foot"><button class="btn" data-modal-result="local">Keep this browser's data</button><span class="spacer"></span><button class="btn primary" data-modal-result="file">Restore from file</button></div></div>`,
            { onResult: (r) => { if (r === 'file') { state = normalizeState(migrate(parsed)); buildFormatter(); persist(); toast('Restored from backup file', 'good'); } resolve(); }, sticky: true });
        });
      }
    } catch (e) { console.warn('Stale check failed', e); }
  },
  async lkg() { return await idb.get('lkg'); },
  statusText() {
    return { off: 'Backup off', linked: 'Auto-backup on', 'needs-permission': 'Backup needs permission', error: 'Backup error', unsupported: 'Manual backup only' }[this.status] || this.status;
  },
  renderStatus() {
    const pill = document.getElementById('backupPill'); if (!pill) return;
    pill.className = 'backup-pill ' + this.status;
    document.getElementById('backupPillText').textContent = this.statusText();
  },
};
function countsLabel(c) { return `${c.txns} transactions, ${c.bills} bills, ${c.accounts} accounts, ${c.debts} debts, ${c.goals} goals`; }

// ---------- Formatting ----------
let _fmt = null, _fmt0 = null;
function buildFormatter() {
  const c = S().currency; _fmt = _fmt0 = null;
  if (c.code === 'CUSTOM') return;
  const tryBuild = (o) => { try { const f = new Intl.NumberFormat(c.locale || undefined, Object.assign({ style: 'currency', currency: c.code }, o)); f.format(1); return f; } catch (e) { return null; } };
  _fmt = tryBuild({ currencyDisplay: 'narrowSymbol' }) || tryBuild({});
  _fmt0 = tryBuild({ currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0, minimumFractionDigits: 0 }) || tryBuild({ maximumFractionDigits: 0, minimumFractionDigits: 0 });
}
function fmt(n, opts) {
  n = num(n); const o = opts || {};
  if (Object.is(n, -0)) n = 0;
  let s;
  if (_fmt && !o.compact) s = (o.dec0 && _fmt0 ? _fmt0 : _fmt).format(n);
  else { const c = S().currency; const abs = Math.abs(n); s = (n < 0 ? '-' : '') + (c.symbol || '') + (o.dec0 ? Math.round(abs).toLocaleString() : abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })); }
  if (o.sign && n > 0) s = '+' + s;
  return s;
}
const fmt0 = n => fmt(n, { dec0: true });
const fmtPct = (n, d) => n === null || n === undefined || !Number.isFinite(n) ? '—' : `${n.toFixed(d === undefined ? 0 : d)}%`;
function fmtDateTime(iso) { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } }
function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const attr = s => esc(s);
const cls = (...a) => a.filter(Boolean).join(' ');
const signCls = n => n > 0 ? 'good' : n < 0 ? 'bad' : '';

// ---------- Toasts ----------
function toast(msg, type, ms, action) {
  const root = document.getElementById('toasts'); if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (type && type !== 'default' ? type : '');
  el.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button data-action="${attr(action.action)}">${esc(action.label)}</button>` : '');
  root.appendChild(el);
  const t = setTimeout(() => el.remove(), ms || (type === 'bad' ? 6000 : 3200));
  el.addEventListener('click', () => { clearTimeout(t); el.remove(); });
}

// ---------- Modal ----------
const modalStack = [];
function openModal(html, opts) {
  const o = opts || {};
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = html;
  const root = document.getElementById('modal-root'); root.appendChild(bg);
  const entry = { bg, opts: o, close(result) { if (entry.closed) return; entry.closed = true; bg.remove(); const i = modalStack.indexOf(entry); if (i >= 0) modalStack.splice(i, 1); if (o.onResult) o.onResult(result); if (o.onClose) o.onClose(result); } };
  modalStack.push(entry);
  bg.addEventListener('click', e => {
    if (e.target === bg && !o.sticky) entry.close(null);
    const rb = e.target.closest('[data-modal-result]'); if (rb) entry.close(rb.dataset.modalResult);
    const xb = e.target.closest('[data-modal-close]'); if (xb) entry.close(null);
  });
  const first = bg.querySelector('input:not([type=hidden]),select,textarea,button.primary'); if (first && !o.noFocus) setTimeout(() => first.focus(), 30);
  return entry;
}
function closeTopModal() { const m = modalStack[modalStack.length - 1]; if (m && !m.opts.sticky) m.close(null); }
function confirmDialog(title, body, okLabel, danger) {
  return new Promise(res => {
    openModal(`<div class="modal narrow"><div class="modal-head"><h3>${esc(title)}</h3><button class="x" data-modal-close>×</button></div><div class="modal-body"><p>${body}</p></div>
      <div class="modal-foot"><button class="btn" data-modal-close>Cancel</button><span class="spacer"></span><button class="btn ${danger ? 'danger' : 'primary'}" data-modal-result="ok">${esc(okLabel || 'OK')}</button></div></div>`,
      { onResult: r => res(r === 'ok') });
  });
}

// ---------- Generic form builder ----------
/* field: {key,label,type:'text'|'number'|'select'|'date'|'month'|'checkbox'|'textarea'|'owner'|'category'|'frequency'|'custom', options:[{v,l}]|[...], required, hint, full, show:(vals)=>bool, min, step, placeholder, html:(vals)=>string} */
function fieldHtml(f, vals) {
  const v = vals[f.key];
  const id = 'f_' + f.key;
  const req = f.required ? ' required' : '';
  let input = '';
  const opts = (f.options || []).map(o => typeof o === 'string' ? { v: o, l: o } : o);
  switch (f.type) {
    case 'select': input = `<select id="${id}" name="${f.key}"${req}>${f.placeholder ? `<option value="">${esc(f.placeholder)}</option>` : ''}${opts.map(o => `<option value="${attr(o.v)}"${String(v) === String(o.v) ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`; break;
    case 'checkbox': return `<div class="field ${f.full ? 'full' : ''}"><label class="check"><input type="checkbox" id="${id}" name="${f.key}"${v ? ' checked' : ''}> ${esc(f.label)}</label>${f.hint ? `<div class="hint">${f.hint}</div>` : ''}</div>`;
    case 'textarea': input = `<textarea id="${id}" name="${f.key}" placeholder="${attr(f.placeholder || '')}">${esc(v || '')}</textarea>`; break;
    case 'number': input = `<input type="number" id="${id}" name="${f.key}" value="${v === undefined || v === null || v === '' ? '' : attr(v)}" step="${f.step || '0.01'}"${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined ? ` max="${f.max}"` : ''} placeholder="${attr(f.placeholder || '')}" inputmode="decimal"${req}>`; break;
    case 'custom': input = f.html(vals); break;
    default: input = `<input type="${f.type || 'text'}" id="${id}" name="${f.key}" value="${attr(v || '')}" placeholder="${attr(f.placeholder || '')}"${req}${f.maxlength ? ` maxlength="${f.maxlength}"` : ''}>`;
  }
  return `<div class="field ${f.full ? 'full' : ''}" data-field="${f.key}"><label for="${id}">${esc(f.label)}${f.required ? ' <span class="bad">*</span>' : ''}</label>${input}${f.hint ? `<div class="hint">${f.hint}</div>` : ''}</div>`;
}
function ownerField(extra) { return Object.assign({ key: 'owner', label: 'Owner', type: 'select', options: [{ v: 'p1', l: S().person1Name }, { v: 'p2', l: S().person2Name }, { v: 'joint', l: 'Joint' }], show: () => isCouple() }, extra || {}); }
function categoryField(extra) { return Object.assign({ key: 'category', label: 'Category', type: 'select', options: catList(), required: true }, extra || {}); }
function frequencyFields() {
  return [
    { key: 'frequency', label: 'Frequency', type: 'select', options: Object.keys(FREQ).map(k => ({ v: k, l: FREQ[k].label })), required: true },
    { key: 'customEvery', label: 'Every', type: 'number', step: '1', min: 1, show: v => v.frequency === 'custom' },
    { key: 'customUnit', label: 'Unit', type: 'select', options: [{ v: 'week', l: 'Weeks' }, { v: 'month', l: 'Months' }, { v: 'year', l: 'Years' }], show: v => v.frequency === 'custom' },
  ];
}
function openForm(cfg) {
  const vals = Object.assign({}, cfg.values || {});
  const fields = cfg.fields;
  const body = () => fields.map(f => { const hidden = f.show && !f.show(vals); return hidden ? '' : fieldHtml(f, vals); }).join('');
  const m = openModal(`<div class="modal ${cfg.width || ''}"><form id="genForm" novalidate><div class="modal-head"><h3>${esc(cfg.title)}</h3><button type="button" class="x" data-modal-close>×</button></div>
    <div class="modal-body">${cfg.intro ? `<p class="small muted">${cfg.intro}</p>` : ''}<div class="form-grid" id="formGrid">${body()}</div><div id="formExtra">${cfg.extraHtml ? cfg.extraHtml(vals) : ''}</div><div class="bad small hidden" id="formErr"></div></div>
    <div class="modal-foot">${cfg.onDelete ? `<button type="button" class="btn danger" id="formDelete">Delete</button>` : '<span></span>'}<span class="spacer"></span><button type="button" class="btn" data-modal-close>Cancel</button><button type="submit" class="btn primary">${esc(cfg.submitLabel || 'Save')}</button></div></form></div>`, { sticky: !!cfg.sticky });
  const form = m.bg.querySelector('#genForm');
  const read = () => {
    for (const f of fields) {
      const el = form.querySelector(`[name="${f.key}"]`); if (!el) continue;
      if (f.type === 'checkbox') vals[f.key] = el.checked;
      else if (f.type === 'number') vals[f.key] = el.value === '' ? '' : num(el.value);
      else vals[f.key] = el.value;
    }
    if (cfg.readExtra) cfg.readExtra(form, vals);
  };
  form.addEventListener('input', e => {
    read();
    const t = e.target.name;
    if (fields.some(f => f.show) && fields.find(f => f.key === t) && (e.target.tagName === 'SELECT' || e.target.type === 'checkbox')) {
      // re-render visibility only (keep focus)
      const active = document.activeElement && document.activeElement.name;
      const grid = form.querySelector('#formGrid'); grid.innerHTML = body();
      if (active) { const a = form.querySelector(`[name="${active}"]`); if (a) { a.focus(); if (a.setSelectionRange && a.type === 'text') try { a.setSelectionRange(a.value.length, a.value.length); } catch (er) { } } }
    }
    if (cfg.onInput) cfg.onInput(vals, form);
  });
  form.addEventListener('submit', e => {
    e.preventDefault(); read();
    const err = form.querySelector('#formErr');
    for (const f of fields) {
      if (f.show && !f.show(vals)) continue;
      if (f.required && (vals[f.key] === '' || vals[f.key] === undefined || vals[f.key] === null)) { err.textContent = `${f.label} is required.`; err.classList.remove('hidden'); return; }
      if (f.type === 'date' && vals[f.key] && !D.isValid(vals[f.key])) { err.textContent = `${f.label} is not a valid date.`; err.classList.remove('hidden'); return; }
    }
    const custom = cfg.validate ? cfg.validate(vals) : null;
    if (custom) { err.textContent = custom; err.classList.remove('hidden'); return; }
    m.close('saved');
    cfg.onSave(vals);
  });
  if (cfg.onDelete) form.querySelector('#formDelete').addEventListener('click', async () => { if (await confirmDialog('Delete?', 'This cannot be undone.', 'Delete', true)) { m.close('deleted'); cfg.onDelete(); } });
  if (cfg.after) cfg.after(form, vals, m);
  return m;
}

// ---------- Charts (inline SVG, no libraries) ----------
const PALETTE = ['#2a2824', '#b8643a', '#7a8f6a', '#c9a24e', '#8b6f8e', '#5b7a8c', '#b58a6b', '#9aa69a', '#d4a373', '#6d6875', '#a3b18a', '#e0a458'];
function niceTicks(min, max, n) {
  if (max === min) { max = min + 1; }
  const span = max - min, raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag; const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(round2(v));
  return { lo, hi, ticks };
}
const shortNum = v => { const a = Math.abs(v); const s = a >= 1e6 ? (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : a >= 1e3 ? (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(Math.round(a)); return (v < 0 ? '-' : '') + s; };
function svgLineChart(cfg) {
  const W = cfg.width || 720, H = cfg.height || 220, pl = 48, pr = 14, pt = 12, pb = 28;
  const series = cfg.series.filter(s => s.points.length);
  const labels = cfg.labels || [];
  const n = labels.length;
  if (!series.length || n < 1) return `<div class="empty small">Not enough data to chart yet.</div>`;
  let all = series.flatMap(s => s.points.map(p => p === null ? 0 : p));
  if (cfg.zero !== false) all.push(0);
  const { lo, hi, ticks } = niceTicks(Math.min(...all), Math.max(...all), 5);
  const x = i => pl + (n === 1 ? (W - pl - pr) / 2 : i / (n - 1) * (W - pl - pr));
  const y = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  let g = `<g class="grid">${ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"></line><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end">${cfg.short === false ? t : shortNum(t)}</text>`).join('')}</g>`;
  if (lo < 0 && hi > 0) g += `<line class="axis" x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}"></line>`;
  const every = Math.max(1, Math.ceil(n / (cfg.maxLabels || 8)));
  g += labels.map((l, i) => (i % every === 0 || i === n - 1) ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : '').join('');
  for (const s of series) {
    const pts = s.points.map((p, i) => p === null ? null : [x(i), y(p)]);
    const segs = []; let cur = [];
    pts.forEach(p => { if (p) cur.push(p); else { if (cur.length) segs.push(cur); cur = []; } }); if (cur.length) segs.push(cur);
    const path = segs.map(seg => seg.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')).join(' ');
    if (s.area && segs.length) g += segs.map(seg => `<path d="${seg.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')} L${seg[seg.length - 1][0].toFixed(1)} ${y(Math.max(lo, 0))} L${seg[0][0].toFixed(1)} ${y(Math.max(lo, 0))} Z" fill="${s.color}" opacity="0.10"></path>`).join('');
    g += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.2}" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}></path>`;
    if (cfg.dots !== false) g += pts.map((p, i) => p ? `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${n > 30 ? 2 : 3.2}" fill="${s.color}"><title>${esc(labels[i] || '')} · ${esc(s.name)}: ${esc((cfg.fmt || fmt)(s.points[i]))}</title></circle>` : '').join('');
  }
  const legend = series.length > 1 || cfg.legend ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${attr(cfg.aria || 'Line chart')}">${g}</svg>${legend}`;
}
function svgBarChart(cfg) {
  const W = cfg.width || 720, H = cfg.height || 220, pl = 48, pr = 14, pt = 12, pb = 28;
  const groups = cfg.groups; const k = cfg.seriesNames.length; const n = groups.length;
  if (!n) return `<div class="empty small">Nothing to chart yet.</div>`;
  const stacked = !!cfg.stacked;
  const vals = stacked ? groups.map(gp => sum(gp.values.map(v => Math.max(0, v)))).concat(groups.map(gp => sum(gp.values.map(v => Math.min(0, v))))) : groups.flatMap(gp => gp.values);
  vals.push(0);
  const { lo, hi, ticks } = niceTicks(Math.min(...vals), Math.max(...vals), 5);
  const y = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  const gw = (W - pl - pr) / n, inner = gw * 0.72, bw = stacked ? inner : inner / k;
  let g = `<g class="grid">${ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"></line><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end">${shortNum(t)}</text>`).join('')}</g>`;
  const every = Math.max(1, Math.ceil(n / (cfg.maxLabels || 12)));
  groups.forEach((gp, i) => {
    const x0 = pl + i * gw + (gw - inner) / 2;
    if (i % every === 0 || n <= 12) g += `<text x="${x0 + inner / 2}" y="${H - 8}" text-anchor="middle">${esc(gp.label)}</text>`;
    let posBase = 0, negBase = 0;
    gp.values.forEach((v, j) => {
      const color = cfg.colors[j % cfg.colors.length];
      let top, bottom, xx;
      if (stacked) { if (v >= 0) { top = y(posBase + v); bottom = y(posBase); posBase += v; } else { top = y(negBase); bottom = y(negBase + v); negBase += v; } xx = x0; }
      else { top = y(Math.max(0, v)); bottom = y(Math.min(0, v)); xx = x0 + j * bw; }
      const h = Math.max(0, bottom - top);
      g += `<rect x="${xx.toFixed(1)}" y="${top.toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" rx="2"><title>${esc(gp.label)} · ${esc(cfg.seriesNames[j])}: ${esc((cfg.fmt || fmt)(v))}</title></rect>`;
    });
  });
  const legend = k > 1 ? `<div class="legend">${cfg.seriesNames.map((s, j) => `<span><i style="background:${cfg.colors[j % cfg.colors.length]}"></i>${esc(s)}</span>`).join('')}</div>` : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${attr(cfg.aria || 'Bar chart')}">${g}</svg>${legend}`;
}
function svgDonut(cfg) {
  const size = cfg.size || 150, r = size / 2 - 10, c = 2 * Math.PI * r, cx = size / 2;
  const slices = cfg.slices.filter(s => s.value > 0);
  const total = sum(slices, s => s.value);
  if (!total) return `<div class="empty small">Nothing to chart yet.</div>`;
  let off = 0;
  const circles = slices.map((s, i) => { const len = s.value / total * c; const el = `<circle r="${r}" cx="${cx}" cy="${cx}" fill="none" stroke="${s.color || PALETTE[i % PALETTE.length]}" stroke-width="18" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"><title>${esc(s.label)}: ${esc(fmt(s.value))} (${(s.value / total * 100).toFixed(0)}%)</title></circle>`; off += len; return el; }).join('');
  const centre = cfg.centre !== undefined ? `<text x="${cx}" y="${cx - 4}" text-anchor="middle" style="font-size:13px;fill:var(--ink);font-weight:600">${esc(cfg.centre)}</text><text x="${cx}" y="${cx + 12}" text-anchor="middle">${esc(cfg.centreLabel || '')}</text>` : '';
  const list = cfg.list !== false ? `<div class="list">${slices.map((s, i) => `<div><span><i class="legend-dot" style="display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:7px;vertical-align:-1px;background:${s.color || PALETTE[i % PALETTE.length]}"></i>${esc(s.label)}</span><span class="num">${fmt(s.value)} <span class="muted tiny">${(s.value / total * 100).toFixed(0)}%</span></span></div>`).join('')}</div>` : '';
  return `<div class="donut-wrap"><svg class="chart" style="width:${size}px;flex:0 0 ${size}px" viewBox="0 0 ${size} ${size}" role="img" aria-label="${attr(cfg.aria || 'Donut chart')}">${circles}${centre}</svg>${list}</div>`;
}
function progressBar(pct, cls2) { const p = Math.max(0, Math.min(100, num(pct))); return `<div class="bar ${cls2 || ''}"><i style="width:${p.toFixed(1)}%"></i></div>`; }
