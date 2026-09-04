/* ============================================================
   ACTIONS, SAMPLE DATA, WIZARD, BOOT
   ============================================================ */
// ---------- Rendering ----------
function render() {
  const v = views[ui.view] || views.overview;
  document.getElementById('viewTitle').textContent = v.title;
  document.getElementById('nav').innerHTML = NAV.map(([k, l]) => `<button class="${ui.view === k ? 'active' : ''}" data-action="goto" data-view="${k}">${ICONS[k] || ''}<span>${esc(l)}</span></button>`).join('');
  document.getElementById('monthLabel').textContent = D.monthLabel(ui.month, true);
  document.getElementById('monthNav').style.visibility = ['settings'].includes(ui.view) ? 'hidden' : 'visible';
  const el = document.getElementById('view');
  const y = window.scrollY;
  try { el.innerHTML = v.render(); } catch (e) { console.error(e); el.innerHTML = `<div class="callout bad">Something went wrong rendering this view: ${esc(e.message)}. Your data is safe — try another view, or export a backup from Settings.</div>`; }
  window.scrollTo(0, y);
  backupFile.renderStatus();
  saveUi();
}
function goto(view) { ui.view = view; ui.txnLimit = 200; if (view === 'reports') ui.reportYear = ui.month.slice(0, 4); document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').classList.add('hidden'); window.scrollTo(0, 0); render(); }

// ---------- Actions ----------
const actions = {
  goto: d => goto(d.view),
  toggleSidebar: () => { const sb = document.getElementById('sidebar'); sb.classList.toggle('open'); document.getElementById('scrim').classList.toggle('hidden', !sb.classList.contains('open')); },
  closeSidebar: () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').classList.add('hidden'); },
  monthShift: d => { ui.month = D.addMonths(ui.month, +d.n); if (ui.txnFilter.month !== undefined && ui.txnFilter.month !== '') ui.txnFilter.month = ui.month; if (ui.view === 'reports') ui.reportYear = ui.month.slice(0, 4); render(); },
  monthPick: () => {
    openModal(`<div class="modal narrow"><div class="modal-head"><h3>Go to month</h3><button class="x" data-modal-close>×</button></div><div class="modal-body"><div class="field"><input type="month" id="pickMonth" value="${ui.month}"></div><div class="flex flex-wrap">${monthsWithData().slice(-8).reverse().map(m => `<button class="btn sm" data-pick="${m}">${esc(D.monthLabel(m))}</button>`).join('')}</div></div><div class="modal-foot"><button class="btn" data-action="monthToday" data-modal-close>This month</button><span class="spacer"></span><button class="btn primary" id="pickGo">Go</button></div></div>`, {});
    const m = modalStack[modalStack.length - 1];
    m.bg.querySelector('#pickGo').addEventListener('click', () => { const v = m.bg.querySelector('#pickMonth').value; if (/^\d{4}-\d{2}$/.test(v)) { ui.month = v; if (ui.txnFilter.month) ui.txnFilter.month = v; } m.close(); render(); });
    m.bg.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) { ui.month = b.dataset.pick; if (ui.txnFilter.month) ui.txnFilter.month = ui.month; m.close(); render(); } });
  },
  monthToday: () => { ui.month = D.thisMonth(); if (ui.txnFilter.month) ui.txnFilter.month = ui.month; render(); },
  openWizard: () => openWizard(),
  loadSample: async () => { if (state.txns.length || state.bills.length) { if (!await confirmDialog('Load sample data?', 'This <b>replaces</b> everything currently in the dashboard with the sample household. Export a backup first if you want to keep your data.', 'Replace with sample', true)) return; } loadSampleData(); },
  runTests: () => { const lines = []; const r = runSelfTests(l => lines.push(l)); const el = document.getElementById('testResults'); if (el) el.innerHTML = `<div class="callout ${r.passed === r.total ? 'good' : 'bad'} small"><b>${r.passed}/${r.total} checks passed</b> — frequency engine, debt amortisation, rollover, CSV parsing and import validation, tested against hand-worked examples.${r.passed !== r.total ? '<pre class="mono tiny">' + esc(lines.slice(1).join('\n')) + '</pre>' : ''}</div>`; toast(`${r.passed}/${r.total} self-tests passed`, r.passed === r.total ? 'good' : 'bad'); },
  print: () => window.print(),
  // transactions
  txnAdd: () => openTxnForm(null), txnEdit: d => openTxnForm(byId('txns', d.id)), txnMore: () => { ui.txnLimit = (ui.txnLimit || 200) + 300; render(); },
  csvImport: () => openCsvImport(),
  csvExport: () => { const f = ui.txnFilter; const mf = f.month === undefined ? ui.month : f.month; exportCsv(state.txns.filter(t => !mf || t.month === mf).sort((a, b) => a.date < b.date ? -1 : 1), `transactions-${mf || 'all'}.csv`); },
  csvExportAll: () => { exportCsv(state.txns.slice().sort((a, b) => a.date < b.date ? -1 : 1), `transactions-all-${D.today()}.csv`); markExported(); },
  exportYearCsv: () => { const y = ui.reportYear; exportCsv(state.txns.filter(t => t.month.startsWith(y)).sort((a, b) => a.date < b.date ? -1 : 1), `transactions-${y}.csv`); },
  // bills
  billAdd: () => openBillForm(null), billEdit: d => openBillForm(byId('bills', d.id)), subAdd: () => openSubForm(null), subEdit: d => openSubForm(byId('subs', d.id)),
  calMode: d => { ui.calendarMode = d.mode; render(); },
  // income
  incomeAdd: () => openIncomeForm(null), incomeEdit: d => openIncomeForm(byId('income', d.id)),
  // goals
  goalAdd: () => openGoalForm(null), goalEdit: d => openGoalForm(byId('goals', d.id)),
  goalAddAmount: d => { const g = byId('goals', d.id); openForm({ title: `Add to "${g.name}"`, width: 'narrow', fields: [{ key: 'amount', label: 'Amount to add', type: 'number', required: true, min: 0 }, { key: 'log', label: 'Also record as a "Savings" transaction', type: 'checkbox', full: true }], values: { amount: g.monthlyContribution || '', log: true, }, onSave: v => { commit(s => { const gg = byId('goals', g.id); gg.current = round2(num(gg.current) + num(v.amount)); if (v.log) s.txns.push({ id: uid(), date: D.today(), month: D.thisMonth(), type: 'expense', description: `Savings: ${g.name}`, owner: g.owner || 'p1', paymentMethod: '', notes: '', splits: [{ category: 'Savings', amount: round2(num(v.amount)) }] }); }); toast('Savings updated', 'good'); } }); },
  // debts
  debtAdd: () => openDebtForm(null), debtEdit: d => openDebtForm(byId('debts', d.id)),
  debtStrategy: d => { ui.debtStrategy = d.s; render(); },
  debtPayment: d => { const debt = byId('debts', d.id); openForm({ title: `Record payment · ${debt.name}`, width: 'narrow', fields: [{ key: 'amount', label: 'Payment amount', type: 'number', required: true, min: 0 }, { key: 'date', label: 'Date', type: 'date', required: true }, { key: 'log', label: 'Also record as a "Debt Payments" transaction', type: 'checkbox', full: true }], values: { amount: round2(num(debt.minPayment) + num(debt.extraPayment)), date: D.today(), log: true }, onSave: v => { commit(s => { const dd = byId('debts', debt.id); dd.currentBalance = Math.max(0, round2(num(dd.currentBalance) - num(v.amount))); if (v.log) s.txns.push({ id: uid(), date: v.date, month: D.monthOf(v.date), type: 'expense', description: `Payment: ${debt.name}`, owner: debt.owner || 'p1', paymentMethod: '', notes: '', splits: [{ category: 'Debt Payments', amount: round2(num(v.amount)) }] }); }); toast('Payment recorded', 'good'); } }); },
  debtScheduleCsv: () => { const sim = simulateDebt(state.debts, ui.debtStrategy, num(S().debtExtraPool), D.thisMonth()); const rows = [['Month', ...state.debts.flatMap(d => [`${d.name} payment`, `${d.name} interest`, `${d.name} balance`]), 'Total payment', 'Total balance']]; for (const s of sim.schedule) rows.push([s.month, ...state.debts.flatMap(d => { const p = s.perDebt[d.id]; return p ? [p.payment.toFixed(2), p.interest.toFixed(2), p.balance.toFixed(2)] : ['', '', '']; }), s.totalPayment.toFixed(2), s.totalBalance.toFixed(2)]); downloadText(`debt-schedule-${ui.debtStrategy}.csv`, toCSV(rows), 'text/csv'); },
  // accounts / net worth
  accountAdd: () => openAccountForm(null), accountEdit: d => openAccountForm(byId('accounts', d.id)),
  snapshotNow: () => { commit(s => { const nw = netWorth(); const today = D.today(); s.snapshots = s.snapshots.filter(x => x.date !== today); s.snapshots.push({ date: today, assets: nw.assets, liabilities: round2(nw.liabilities + nw.debts), net: nw.net }); s.snapshots.sort((a, b) => a.date < b.date ? -1 : 1); }); toast('Snapshot saved', 'good'); },
  snapshotDelete: d => { commit(s => { s.snapshots = s.snapshots.filter(x => x.date !== d.date); }); },
  // budget
  budgetCopyPrev: () => { const prev = D.addMonths(ui.month, -1); commit(s => { for (const b of s.budgets.filter(x => x.month === prev)) { const ex = s.budgets.find(x => x.month === ui.month && x.category === b.category); if (ex) ex.planned = b.planned; else s.budgets.push({ id: uid(), month: ui.month, category: b.category, planned: b.planned }); } }); toast(`Copied budget from ${D.monthLabel(prev)}`, 'good'); },
  budgetFromAverage: () => { const months = D.monthsBetween(D.addMonths(ui.month, -3), D.addMonths(ui.month, -1)); const tot = {}; for (const m of months) for (const [c, v] of Object.entries(categoryActuals(m))) tot[c] = (tot[c] || 0) + v; if (!Object.keys(tot).length) { toast('No spending in the previous 3 months to base a budget on', 'warn'); return; } commit(s => { for (const [c, v] of Object.entries(tot)) { const planned = Math.ceil(v / months.length / 5) * 5; const ex = s.budgets.find(x => x.month === ui.month && x.category === c); if (ex) ex.planned = planned; else s.budgets.push({ id: uid(), month: ui.month, category: c, planned }); } }); toast('Budget suggested from your last 3 months (rounded up to 5s)', 'good'); },
  // settings
  setMode: d => { commit(s => { s.settings.householdMode = d.mode; }); },
  catAdd: () => openForm({ title: 'Add category', width: 'narrow', fields: [{ key: 'name', label: 'Category name', type: 'text', required: true, maxlength: 30 }], validate: v => catList().some(c => c.toLowerCase() === v.name.trim().toLowerCase()) ? 'That category already exists.' : null, onSave: v => commit(s => s.settings.categories.push(v.name.trim())) }),
  catRename: d => openForm({ title: 'Rename category', width: 'narrow', values: { name: d.cat }, fields: [{ key: 'name', label: 'New name', type: 'text', required: true, maxlength: 30 }], onSave: v => { const n = v.name.trim(); if (n === d.cat) return; commit(s => { s.settings.categories = s.settings.categories.map(c => c === d.cat ? n : c); for (const t of s.txns) for (const sp of t.splits) if (sp.category === d.cat) sp.category = n; for (const b of s.budgets) if (b.category === d.cat) b.category = n; for (const b of s.bills) if (b.category === d.cat) b.category = n; for (const b of s.subs) if (b.category === d.cat) b.category = n; }); toast('Category renamed everywhere', 'good'); } }),
  catRemove: async d => { if (catList().length <= 1) { toast('Keep at least one category', 'warn'); return; } const used = state.txns.filter(t => t.splits.some(s => s.category === d.cat)).length; if (await confirmDialog('Remove category?', `"${esc(d.cat)}" is used by ${used} transaction${used === 1 ? '' : 's'}. They keep the label but it will no longer be budgetable.`, 'Remove', true)) commit(s => { s.settings.categories = s.settings.categories.filter(c => c !== d.cat); }); },
  exportJson: () => { downloadText(`finance-dashboard-backup-${D.today()}.json`, serialize()); markExported(); toast('Backup downloaded', 'good'); },
  backupLink: () => backupFile.link(), backupUnlink: async () => { if (await confirmDialog('Turn off auto-backup?', 'The file on disk stays as it is; the dashboard just stops writing to it.', 'Turn off')) backupFile.unlink(); },
  backupPermission: () => backupFile.requestPermission(), backupWriteNow: async () => { await backupFile.write(true); toast(backupFile.status === 'linked' ? 'Backup written and verified' : 'Backup write failed', backupFile.status === 'linked' ? 'good' : 'bad'); render(); },
  restoreLkg: async () => { const text = await backupFile.lkg(); if (!text) { toast('No verified copy stored yet', 'warn'); return; } let parsed; try { parsed = JSON.parse(text); } catch (e) { toast('Stored copy is unreadable', 'bad'); return; } const v = validateImport(parsed); if (!v.ok) { toast(v.reason, 'bad'); return; } if (await confirmDialog('Restore verified copy?', `Saved ${esc(fmtDateTime(parsed.savedAt))} · ${countsLabel(recordCounts(parsed))}.<br>This replaces the data currently in the browser.`, 'Restore', true)) { state = normalizeState(migrate(parsed)); buildFormatter(); commit(); toast('Restored', 'good'); } },
  clearTxns: async () => { if (await confirmDialog('Delete all transactions?', `All ${state.txns.length} transactions and paid-flags will be removed. Bills, income, debts, goals and accounts stay.`, 'Delete transactions', true)) { commit(s => { s.txns = []; s.billPaid = {}; }); toast('Transactions deleted'); } },
  resetAll: async () => { if (await confirmDialog('Erase everything?', 'All data in this browser is deleted and the dashboard starts fresh. <b>This cannot be undone.</b> Export a backup first.', 'Erase everything', true)) { storage.remove(LS_KEY); storage.remove(LS_UI); await idb.del('handle'); await idb.del('lkg'); backupFile.handle = null; backupFile.status = backupFile.supported ? 'off' : 'unsupported'; state = blankState(); buildFormatter(); persist(); ui.view = 'overview'; render(); openWizard(); } },
};
const changes = {
  txnFilter: (el) => { ui.txnFilter[el.dataset.key] = el.value; ui.txnLimit = 200; if (el.dataset.key === 'month' && el.value) ui.month = el.value; render(); if (el.dataset.key === 'q') { const i = document.querySelector('input[data-key="q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } },
  togglePaid: el => togglePaid(el.dataset.id, el.dataset.kind, el.checked),
  budgetShowAll: el => { ui.budgetShowAll = el.checked; render(); },
  budgetSet: el => { const cat = el.dataset.cat, v = el.value; commit(s => { const i = s.budgets.findIndex(b => b.month === ui.month && b.category === cat); if (v === '') { if (i >= 0) s.budgets.splice(i, 1); } else if (i >= 0) s.budgets[i].planned = round2(num(v)); else s.budgets.push({ id: uid(), month: ui.month, category: cat, planned: round2(num(v)) }); }); },
  accountBalance: el => { commit(s => { const a = byId('accounts', el.dataset.id); if (a) { a.balance = round2(Math.abs(num(el.value))); a.updatedAt = D.today(); } }); },
  debtExtra: el => commit(s => { s.settings.debtExtraPool = round2(num(el.value)); }),
  reportYear: el => { ui.reportYear = el.value; render(); },
  setting: el => { const k = el.dataset.key; const v = el.type === 'checkbox' ? el.checked : el.dataset.num ? num(el.value) : el.value; commit(s => { s.settings[k] = v; }); },
  spendable: el => commit(s => { const set = new Set(s.settings.spendableTypes || []); if (el.checked) set.add(el.dataset.type); else set.delete(el.dataset.type); s.settings.spendableTypes = [...set]; }),
  currency: el => { const c = CURRENCIES.find(x => x.code === el.value); commit(s => { s.settings.currency = { code: c.code, symbol: c.symbol, locale: c.locale }; buildFormatter(); }); },
  currencySymbol: el => commit(s => { s.settings.currency.symbol = el.value; buildFormatter(); }),
  importJson: async el => {
    const file = el.files[0]; if (!file) return;
    let parsed; try { parsed = JSON.parse(await file.text()); } catch (e) { toast('That file is not valid JSON', 'bad'); return; }
    const v = validateImport(parsed); if (!v.ok) { toast(v.reason, 'bad', 8000); return; }
    const counts = recordCounts(parsed);
    if (await confirmDialog('Restore this backup?', `Saved ${esc(parsed.savedAt ? fmtDateTime(parsed.savedAt) : 'unknown')} · ${countsLabel(counts)}.<br><br>This <b>replaces</b> everything currently in the dashboard.`, 'Restore', true)) { state = normalizeState(migrate(parsed)); buildFormatter(); commit(); toast('Backup restored', 'good'); }
    el.value = '';
  },
};
function markExported() { storage.set(LS_LAST_EXPORT, storage.get(LS_SESS) || '0'); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el) return;
  if (el.closest('#genForm') && (el.dataset.action === 'splitAdd' || el.dataset.action === 'splitRemove')) return; // handled by the form
  if (el.tagName === 'A') e.preventDefault();
  const fn = actions[el.dataset.action]; if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (!el) return; const fn = changes[el.dataset.change]; if (fn) fn(el); });
document.addEventListener('input', e => { const el = e.target; if (el.matches && el.matches('input[type=search][data-change="txnFilter"]')) { clearTimeout(el._t); el._t = setTimeout(() => changes.txnFilter(el), 250); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTopModal(); if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { const f = document.getElementById('genForm'); if (f) f.requestSubmit(); } });
document.addEventListener('keydown', e => { const el = e.target; if (e.key === 'Enter' && el.matches && el.matches('.inline-input')) { el.blur(); } });

// ---------- Sample data ----------
function seededRandom(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function loadSampleData() {
  const rnd = seededRandom(20240229); const R = (a, b) => round2(a + rnd() * (b - a)); const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const s = blankState(); const set = s.settings;
  set.householdMode = 'couple'; set.person1Name = 'Alex'; set.person2Name = 'Sam'; set.onboarded = true;
  set.currency = Object.assign({}, state && state.settings.currency || { code: 'USD', symbol: '$', locale: 'en-US' });
  const now = D.thisMonth(); const start = D.addMonths(now, -6); set.startMonth = start; set.safetyBuffer = 300; set.budgetRollover = 'surplus'; set.emergencyMonths = 3; set.debtExtraPool = 200;
  const monthStartDate = D.monthStart(start);
  const id = () => uid();
  const acct = (name, type, owner, balance) => s.accounts.push({ id: id(), name, type, owner, balance, isLiability: !!accountType(type).liability, updatedAt: D.today() });
  acct('Joint checking', 'checking', 'joint', 3420.55); acct('Alex checking', 'checking', 'p1', 1180.20); acct('Sam checking', 'checking', 'p2', 942.75);
  acct('Emergency savings', 'savings', 'joint', 6800); acct('Holiday fund', 'savings', 'joint', 1450); acct('Index fund ISA', 'investment', 'p1', 12400); acct('Pension', 'retirement', 'p2', 21850); acct('Car (Honda)', 'vehicle', 'joint', 9500);
  s.income.push({ id: id(), source: 'Salary — Northwind Ltd', owner: 'p1', type: 'Salary', amount: 3250, frequency: 'monthly', startDate: D.addDays(monthStartDate, 24), active: true });
  s.income.push({ id: id(), source: 'Wages — Riverside Clinic', owner: 'p2', type: 'Wages', amount: 1180, frequency: 'fortnightly', startDate: D.addDays(monthStartDate, 4), active: true });
  s.income.push({ id: id(), source: 'Freelance design', owner: 'p1', type: 'Freelance', amount: 450, frequency: 'custom', customEvery: 2, customUnit: 'month', startDate: D.addDays(monthStartDate, 14), active: true });
  const bill = (name, category, owner, amount, frequency, dueDay, extra) => s.bills.push(Object.assign({ id: id(), name, category, owner, amount, frequency, dueDay, startDate: monthStartDate, active: true }, extra || {}));
  bill('Rent', 'Housing', 'joint', 1650, 'monthly', 1); bill('Electricity & gas', 'Utilities', 'joint', 138, 'monthly', 15); bill('Water', 'Utilities', 'joint', 42, 'monthly', 20);
  bill('Internet', 'Utilities', 'joint', 55, 'monthly', 8); bill('Car insurance', 'Insurance', 'joint', 96, 'monthly', 12); bill('Phone — Alex', 'Utilities', 'p1', 32, 'monthly', 22);
  bill('Phone — Sam', 'Utilities', 'p2', 28, 'monthly', 22); bill('Home insurance', 'Insurance', 'joint', 312, 'annual', 3, { startDate: D.addMonths(now, 2) + '-03' }); bill('Council tax', 'Housing', 'joint', 172, 'monthly', 1);
  bill('Cleaner', 'Housing', 'joint', 45, 'fortnightly', undefined, { startDate: D.addDays(monthStartDate, 2) });
  const sub = (name, owner, amount, billingCycle, dayOffset, category) => s.subs.push({ id: id(), name, category: category || 'Subscriptions', owner, amount, billingCycle, renewalDate: D.addDays(D.monthStart(now), dayOffset), startDate: monthStartDate, active: true });
  sub('Netflix', 'joint', 15.99, 'monthly', 9); sub('Spotify Duo', 'joint', 14.99, 'monthly', 17); sub('Gym — Alex', 'p1', 39, 'monthly', 1, 'Health'); sub('iCloud', 'p2', 2.99, 'monthly', 27);
  sub('Amazon Prime', 'joint', 95, 'annual', 40); sub('Adobe Creative Cloud', 'p1', 54.99, 'monthly', 5); sub('Pet insurance', 'joint', 23.5, 'monthly', 11, 'Pets');
  s.debts.push({ id: id(), name: 'Visa credit card', owner: 'p1', debtType: 'Credit card', originalBalance: 4200, currentBalance: 2860, apr: 22.9, minPayment: 90, extraPayment: 0, startDate: D.addMonths(start, -8) + '-01' });
  s.debts.push({ id: id(), name: 'Car loan', owner: 'joint', debtType: 'Car loan', originalBalance: 12000, currentBalance: 7150, apr: 6.4, minPayment: 265, extraPayment: 0, startDate: D.addMonths(start, -20) + '-01' });
  s.debts.push({ id: id(), name: 'Student loan — Sam', owner: 'p2', debtType: 'Student loan', originalBalance: 9800, currentBalance: 5320, apr: 4.5, minPayment: 110, extraPayment: 0, startDate: D.addMonths(start, -40) + '-01' });
  s.goals.push({ id: id(), name: 'Emergency fund', owner: 'joint', target: 12000, current: 6800, monthlyContribution: 400, targetDate: D.addMonths(now, 12) + '-01', priority: 'high' });
  s.goals.push({ id: id(), name: 'Japan trip', owner: 'joint', target: 4500, current: 1450, monthlyContribution: 250, targetDate: D.addMonths(now, 9) + '-01', priority: 'medium' });
  s.goals.push({ id: id(), name: 'New laptop', owner: 'p1', target: 1800, current: 620, monthlyContribution: 100, targetDate: D.addMonths(now, 6) + '-01', priority: 'low' });
  s.goals.push({ id: id(), name: 'House deposit', owner: 'joint', target: 40000, current: 12400, monthlyContribution: 500, targetDate: D.addMonths(now, 48) + '-01', priority: 'medium' });
  const budgetPlan = { Housing: 1950, Utilities: 300, Groceries: 700, Transport: 150, Insurance: 100, Health: 45, Dining: 200, Entertainment: 100, Subscriptions: 100, Shopping: 240, Personal: 50, Pets: 90, Gifts: 40, 'Debt Payments': 665, Savings: 1150, Travel: 120 };
  const months = D.monthsBetween(start, now);
  const groc = ['Tesco', 'Aldi', 'Sainsbury\'s', 'Lidl', 'Farmers market', 'Costco']; const dine = ['Pizza night', 'Coffee', 'Lunch out', 'Thai takeaway', 'Brunch with friends', 'Pub dinner']; const shop = ['Amazon order', 'IKEA', 'Clothes — Uniqlo', 'Hardware store', 'Pharmacy', 'Bookshop'];
  const ent = ['Cinema', 'Concert tickets', 'Board game', 'Museum', 'Football match']; const transport = ['Petrol', 'Train tickets', 'Parking', 'Bus pass', 'Car wash'];
  const txn = (date, type, description, owner, category, amount, extra) => s.txns.push(Object.assign({ id: id(), date, month: D.monthOf(date), type, description, owner, paymentMethod: '', notes: '', splits: [{ category, amount: round2(amount) }] }, extra || {}));
  for (const m of months) {
    const isCurrent = m === now; const lastDay = isCurrent ? D.parse(D.today()).d : D.dim(D.parse(m).y, D.parse(m).m);
    const cutoff = D.iso(D.parse(m).y, D.parse(m).m, lastDay);
    for (const [category, planned] of Object.entries(budgetPlan)) s.budgets.push({ id: id(), month: m, category, planned: category === 'Groceries' && m === D.addMonths(now, -2) ? 640 : planned });
    for (const inc of s.income) for (const d of occurrences(inc, D.monthStart(m), cutoff)) txn(d, 'income', inc.source, inc.owner, inc.type, inc.amount);
    for (const b of [...s.bills, ...s.subs.map(subAsRecurring)]) {
      const hits = occurrences(b, D.monthStart(m), cutoff);
      if (!hits.length) continue;
      if (isCurrent && rnd() < 0.25) continue;
      s.billPaid[m] = s.billPaid[m] || {}; s.billPaid[m][b.id] = true;
      txn(hits[0], 'expense', b.name, b.owner, b.category, hits.length * b.amount, { billRef: { id: b.id, month: m }, notes: hits.length > 1 ? `${hits.length} payments this month` : '' });
    }
    const dayIn = (lo, hi) => { const d = Math.min(lastDay, Math.max(1, Math.round(lo + rnd() * (hi - lo)))); return D.iso(D.parse(m).y, D.parse(m).m, d); };
    const n = Math.round(lastDay / 31 * 7);
    for (let i = 0; i < n; i++) txn(dayIn(1, lastDay), 'expense', pick(groc), pick(['joint', 'joint', 'p1', 'p2']), 'Groceries', R(38, 128));
    for (let i = 0; i < Math.round(lastDay / 31 * 5); i++) txn(dayIn(1, lastDay), 'expense', pick(dine), pick(['p1', 'p2', 'joint']), 'Dining', R(9, 68));
    for (let i = 0; i < Math.round(lastDay / 31 * 3); i++) txn(dayIn(1, lastDay), 'expense', pick(transport), pick(['p1', 'p2']), 'Transport', R(18, 75));
    for (let i = 0; i < Math.round(lastDay / 31 * 3); i++) txn(dayIn(1, lastDay), 'expense', pick(shop), pick(['p1', 'p2', 'joint']), 'Shopping', R(15, 110));
    for (let i = 0; i < Math.round(lastDay / 31 * 2); i++) txn(dayIn(1, lastDay), 'expense', pick(ent), pick(['p1', 'p2', 'joint']), 'Entertainment', R(12, 80));
    if (lastDay >= 6) txn(dayIn(3, 6), 'expense', 'Haircut', 'p2', 'Personal', R(30, 45));
    if (lastDay >= 10) txn(dayIn(8, 10), 'expense', 'Dog food & treats', 'joint', 'Pets', R(35, 55));
    if (lastDay >= 5) { txn(dayIn(2, 5), 'expense', 'Visa card payment', 'p1', 'Debt Payments', 290); txn(dayIn(2, 5), 'expense', 'Car loan payment', 'joint', 'Debt Payments', 265); txn(dayIn(2, 5), 'expense', 'Student loan payment', 'p2', 'Debt Payments', 110); }
    if (lastDay >= 26) { txn(dayIn(25, 26), 'expense', 'Transfer to emergency fund', 'joint', 'Savings', 400); txn(dayIn(25, 26), 'expense', 'Transfer to Japan trip', 'joint', 'Savings', 250); txn(dayIn(25, 26), 'expense', 'ISA contribution', 'p1', 'Savings', 500); }
    if (lastDay >= 15 && rnd() < 0.5) txn(dayIn(10, 15), 'expense', 'Weekend away', 'joint', 'Travel', R(120, 320));
    if (lastDay >= 12 && rnd() < 0.6) txn(dayIn(5, 12), 'expense', 'Birthday present', pick(['p1', 'p2']), 'Gifts', R(25, 70));
    if (lastDay >= 20) txn(dayIn(18, 20), 'expense', 'Big shop — Costco', 'joint', 'Groceries', R(160, 240), { splits: [{ category: 'Groceries', amount: 150 }, { category: 'Shopping', amount: 45.5 }, { category: 'Pets', amount: 22 }] });
  }
  for (const t of s.txns) if (t.splits.length > 1) t.notes = 'Split receipt';
  // net worth history
  for (let i = months.length - 1; i >= 1; i--) { const m = months[months.length - 1 - i]; s.snapshots.push({ date: D.monthEnd(m), assets: round2(57543.5 - i * 1180 + (rnd() - 0.5) * 400), liabilities: round2(15330 + i * 470), net: 0 }); }
  for (const sn of s.snapshots) sn.net = round2(sn.assets - sn.liabilities);
  s.txns.sort((a, b) => a.date < b.date ? -1 : 1);
  state = s; buildFormatter(); ui.month = now; ui.txnFilter = {}; ui.debtStrategy = 'snowball';
  commit();
  toast('Sample household loaded — Alex & Sam. Replace it with your own data whenever you like.', 'good', 5000);
}

// ---------- First-run wizard ----------
function openWizard() {
  let step = 0; const vals = { mode: S().householdMode, p1: S().person1Name === 'Me' ? '' : S().person1Name, p2: S().person2Name === 'Partner' ? '' : S().person2Name, currency: S().currency.code, startMonth: S().startMonth || D.thisMonth(), data: (state.txns.length || state.bills.length) ? 'keep' : 'sample' };
  const hasData = !!(state.txns.length || state.bills.length || state.income.length);
  const steps = [
    () => `<h2>Welcome to your Finance Dashboard</h2><p class="muted mt-s">Three quick questions, then you're in. Everything you enter stays in this browser — there's no account, no upload and no bank connection. You can change all of this later in Settings.</p>
      <div class="field mt"><label>Who is this dashboard for?</label><div class="choice"><label><input type="radio" name="mode" value="single" ${vals.mode === 'single' ? 'checked' : ''}><b>Just me</b><span>One set of accounts and goals.</span></label><label><input type="radio" name="mode" value="couple" ${vals.mode === 'couple' ? 'checked' : ''}><b>A couple</b><span>Tag income, bills, debts and goals per person, with joint items and a household split.</span></label></div></div>
      <div class="form-grid mt"><div class="field"><label>Your name</label><input type="text" name="p1" value="${attr(vals.p1)}" placeholder="e.g. Alex" maxlength="24"></div><div class="field" id="wizP2" ${vals.mode === 'couple' ? '' : 'style="display:none"'}><label>Partner's name</label><input type="text" name="p2" value="${attr(vals.p2)}" placeholder="e.g. Sam" maxlength="24"></div></div>`,
    () => `<h2>Currency and start month</h2><p class="muted mt-s">The currency only changes how amounts are displayed — nothing is converted.</p>
      <div class="form-grid mt"><div class="field"><label>Currency</label><select name="currency">${CURRENCIES.filter(c => c.code !== 'CUSTOM').map(c => `<option value="${c.code}"${c.code === vals.currency ? ' selected' : ''}>${c.code} · ${esc(c.name)}</option>`).join('')}</select><div class="hint">Need a different symbol? Pick "Custom" in Settings.</div></div>
      <div class="field"><label>Tracking starts</label><input type="month" name="startMonth" value="${attr(vals.startMonth)}"><div class="hint">Budgets and rollover chains begin here.</div></div></div>`,
    () => `<h2>Start with sample data?</h2><p class="muted mt-s">The sample household (Alex & Sam) has six months of realistic transactions, bills, debts and goals so you can see every page working. Replace it with your own data whenever you're ready — or start empty.</p>
      <div class="choice mt">${hasData ? `<label><input type="radio" name="data" value="keep" ${vals.data === 'keep' ? 'checked' : ''}><b>Keep my data</b><span>Apply the settings above to what's already here.</span></label>` : ''}<label><input type="radio" name="data" value="sample" ${vals.data === 'sample' ? 'checked' : ''}><b>Load the sample household</b><span>Explore with realistic data${hasData ? ' — <b>replaces</b> what is here now' : ''}.</span></label><label><input type="radio" name="data" value="empty" ${vals.data === 'empty' ? 'checked' : ''}><b>Start empty</b><span>Add your own income, bills and accounts.${hasData ? ' <b>Erases</b> current data.' : ''}</span></label></div>
      <div class="callout mt small">Tip: after setup, add your <b>income</b> and <b>bills</b> first — the overview, calendar and safe-to-spend all build from those.</div>`,
  ];
  const m = openModal(`<div class="modal"><div class="modal-body" style="padding-top:22px"><div class="wiz-steps" id="wizSteps"></div><div id="wizBody"></div></div><div class="modal-foot"><button class="btn" id="wizBack">Back</button><span class="spacer"></span><button class="btn ghost" data-modal-close>Skip</button><button class="btn primary" id="wizNext">Next</button></div></div>`, { sticky: true, noFocus: true });
  const body = m.bg.querySelector('#wizBody');
  const read = () => { body.querySelectorAll('input,select').forEach(el => { if (el.type === 'radio') { if (el.checked) vals[el.name] = el.value; } else vals[el.name] = el.value; }); };
  const draw = () => { body.innerHTML = steps[step](); m.bg.querySelector('#wizSteps').innerHTML = steps.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join(''); m.bg.querySelector('#wizBack').style.visibility = step ? 'visible' : 'hidden'; m.bg.querySelector('#wizNext').textContent = step === steps.length - 1 ? 'Finish' : 'Next'; };
  body.addEventListener('change', e => { read(); if (e.target.name === 'mode') { const p2 = body.querySelector('#wizP2'); if (p2) p2.style.display = vals.mode === 'couple' ? '' : 'none'; } });
  m.bg.querySelector('#wizBack').addEventListener('click', () => { read(); step = Math.max(0, step - 1); draw(); });
  m.bg.querySelector('#wizNext').addEventListener('click', () => {
    read();
    if (step < steps.length - 1) { step++; draw(); return; }
    m.close();
    const apply = s => { s.settings.householdMode = vals.mode; s.settings.person1Name = vals.p1.trim() || (vals.mode === 'couple' ? 'Person 1' : 'Me'); s.settings.person2Name = vals.p2.trim() || 'Partner'; const c = CURRENCIES.find(x => x.code === vals.currency) || CURRENCIES[0]; s.settings.currency = { code: c.code, symbol: c.symbol, locale: c.locale }; if (/^\d{4}-\d{2}$/.test(vals.startMonth)) s.settings.startMonth = vals.startMonth; s.settings.onboarded = true; };
    // With the sample household, keep its couple setup and start month unless the user typed their own names.
    const applySample = s => { const c = CURRENCIES.find(x => x.code === vals.currency) || CURRENCIES[0]; s.settings.currency = { code: c.code, symbol: c.symbol, locale: c.locale }; if (vals.p1.trim()) { s.settings.householdMode = vals.mode; s.settings.person1Name = vals.p1.trim(); s.settings.person2Name = vals.p2.trim() || 'Partner'; } s.settings.onboarded = true; };
    if (vals.data === 'sample') { loadSampleData(); commit(applySample); }
    else if (vals.data === 'empty') { state = blankState(); commit(apply); }
    else commit(apply);
    buildFormatter(); ui.view = 'overview'; render();
    if (vals.data !== 'sample') toast('You\'re set up. Start with Income and Bills.', 'good', 5000);
  });
  draw();
}

// ---------- Boot ----------
async function boot() {
  document.getElementById('verLabel').textContent = APP_VERSION;
  if (!storage.available()) toast('This browser is blocking local storage — data will not be saved. Try a normal (non-private) window.', 'bad', 12000);
  const loaded = loadState();
  state = loaded || blankState();
  buildFormatter(); loadUi();
  if (!views[ui.view]) ui.view = 'overview';
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  render();
  await backupFile.init();
  backupFile.renderStatus();
  const sessions = +(storage.get(LS_SESS) || 0) + 1; storage.set(LS_SESS, String(sessions));
  if (!loaded || !state.settings.onboarded) openWizard();
  else if (!backupFile.supported && state.txns.length) {
    const lastExport = +(storage.get(LS_LAST_EXPORT) || 0);
    if (sessions - lastExport >= REMIND_EVERY_SESSIONS && sessions % REMIND_EVERY_SESSIONS === 0) toast('Reminder: this browser can\'t auto-backup. Download a JSON backup to keep your data safe.', 'warn', 12000, { label: 'Export now', action: 'exportJson' });
  }
  if (location.search.includes('selftest')) { const r = runSelfTests(console.log); window.__selfTestResult = r; }
  window.__pfd = { get state() { return state; }, ui, render, runSelfTests, simulateDebt, expandRecurring, occurrences, loadSampleData };
}
document.addEventListener('DOMContentLoaded', boot);
