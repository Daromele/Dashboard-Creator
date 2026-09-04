/* ============================================================
   VIEWS 1 — Overview, Budget, Transactions, Bills
   ============================================================ */
const ICONS = {
  overview: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  income: '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M16.5 7.5A3.5 3.5 0 0 0 13 5h-2.5a3 3 0 0 0 0 6h3a3 3 0 0 1 0 6H11a3.5 3.5 0 0 1-3.5-2.5"/></svg>',
  budget: '<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="11" width="3" height="8"/><rect x="12" y="7" width="3" height="12"/><rect x="17" y="13" width="3" height="6"/></svg>',
  transactions: '<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/></svg>',
  bills: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><path d="M9 15l2 2 4-4"/></svg>',
  savings: '<svg viewBox="0 0 24 24"><path d="M5 12a7 7 0 0 1 14 0v4a2 2 0 0 1-2 2h-1l-1 2h-6l-1-2H7a2 2 0 0 1-2-2z"/><path d="M12 5V3"/><circle cx="15" cy="11" r=".6"/></svg>',
  debt: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/></svg>',
  networth: '<svg viewBox="0 0 24 24"><path d="M4 18l5-6 4 3 7-8"/><path d="M15 7h5v5"/></svg>',
  reports: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 13h6M9 17h6"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};
const NAV = [['overview', 'Overview'], ['income', 'Income'], ['budget', 'Budget'], ['transactions', 'Transactions'], ['bills', 'Bills & Subscriptions'], ['savings', 'Savings'], ['debt', 'Debt'], ['networth', 'Net Worth'], ['reports', 'Reports'], ['settings', 'Settings']];
const views = {};

const kpi = (k, v, s, vc) => `<div class="card kpi"><div class="k">${esc(k)}</div><div class="v ${vc || ''}">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
const emptyBox = (title, text, btn) => `<div class="empty"><h3>${esc(title)}</h3><div class="small">${text}</div>${btn ? `<div class="mt">${btn}</div>` : ''}</div>`;


// ---------- Overview helpers: greeting, insights, first steps ----------
function greetingHtml() {
  const h = new Date().getHours(); const g = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const name = S().person1Name && S().person1Name !== 'Me' ? S().person1Name : '';
  const d = new Date(); const dateStr = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const today = D.today(); const dim = D.dim(D.parse(today).y, D.parse(today).m); const left = dim - D.parse(today).d;
  return `<div class="greet"><div><h2>${esc(g)}${name ? ', ' + esc(name) : ''}.</h2><div class="sub">${esc(dateStr)} · ${left === 0 ? 'last day of the month' : left + ' day' + (left === 1 ? '' : 's') + ' left in ' + D.MONTHS_LONG[d.getMonth()]}</div></div>
    <button class="btn accent no-print" data-action="monthStory" data-month="${attr(ui.month)}">✨ ${esc(D.monthLabel(ui.month))} in review</button></div>`;
}
function insightsHtml(month) {
  const out = []; const today = D.today(); const thisMonth = D.thisMonth();
  const add = (icon, cls, title, sub, view, anchor, extra) => out.push(`<div class="insight" ${view ? `data-action="goto" data-view="${view}" ${anchor ? `data-anchor="${anchor}"` : ''} ${extra || ''} style="cursor:pointer"` : ''}><div class="ic ${cls}">${icon}</div><div><b>${title}</b><span>${sub}</span></div></div>`);
  // next pay day
  const pays = state.income.filter(i => i.active !== false).map(i => ({ i, d: nextDue(i, today) })).filter(x => x.d).sort((a, b) => a.d < b.d ? -1 : 1);
  if (pays.length) { const days = D.daysBetween(today, pays[0].d); add('💵', 'good', days === 0 ? 'Pay day is today' : `Pay day in ${days} day${days === 1 ? '' : 's'}`, `${esc(pays[0].i.source)} · ${fmt(pays[0].i.amount)} on ${esc(D.dateLabel(pays[0].d))}`, 'income', 'sources'); }
  // budget pace
  const budgets = state.budgets.filter(b => b.month === thisMonth); const planned = sum(budgets, b => b.planned);
  if (planned > 0) { const spent = sum(Object.values(categoryActuals(thisMonth))); const { y, m, d } = D.parse(today); const pctMonth = d / D.dim(y, m) * 100; const pctBud = spent / planned * 100; add('🎯', pctBud > pctMonth + 10 ? 'warn' : 'good', `${fmtPct(pctBud)} of budget used`, `with ${fmtPct(pctMonth)} of the month gone${pctBud > pctMonth + 10 ? ' — a little ahead of pace' : pctBud < pctMonth - 10 ? ' — nicely under pace' : ' — right on track'}`, 'budget', 'table'); }
  // biggest category swing between the last two complete months
  const m1 = month < thisMonth ? month : D.addMonths(thisMonth, -1), m0 = D.addMonths(m1, -1);
  const cur = categoryActuals(m1), prev = categoryActuals(m0);
  let best = null; for (const c of Object.keys(cur)) { if ((prev[c] || 0) < 50 || cur[c] < 50) continue; const ch = (cur[c] - prev[c]) / prev[c] * 100; if (!best || Math.abs(ch) > Math.abs(best.ch)) best = { c, ch }; }
  if (best && Math.abs(best.ch) >= 15) add(best.ch > 0 ? '📈' : '📉', best.ch > 0 ? 'warn' : 'good', `${esc(best.c)} ${best.ch > 0 ? 'up' : 'down'} ${Math.abs(best.ch).toFixed(0)}% in ${esc(D.monthLabel(m1))}`, `${fmt0(cur[best.c])} vs ${fmt0(prev[best.c])} in ${esc(D.monthLabel(m0))}`, 'transactions');
  // bills due this week
  const wk = billItems().flatMap(b => occurrences(b, today, D.addDays(today, 7)).filter(d => !isBillPaid(D.monthOf(d), b.id)).map(d => ({ b, d })));
  if (wk.length) add('📅', 'info', `${wk.length} bill${wk.length === 1 ? '' : 's'} due in the next 7 days`, `${fmt(sum(wk, x => x.b.amount))} · first: ${esc(wk.sort((a, b) => a.d < b.d ? -1 : 1)[0].b.name)}`, 'bills', 'bills');
  // subscriptions annual
  const subs = state.subs.filter(x => x.active !== false); if (subs.length >= 2) add('🔁', '', `${subs.length} subscriptions cost ${fmt0(sum(subs, x => annualAmount(subAsRecurring(x))))} a year`, `${fmt0(sum(subs, x => monthlyEquivalent(subAsRecurring(x))))} a month on average`, 'bills', 'subs');
  // debt
  if (state.debts.some(d => num(d.currentBalance) > 0)) { const sim = simulateDebt(state.debts, ui.debtStrategy, num(S().debtExtraPool), thisMonth); const other = simulateDebt(state.debts, ui.debtStrategy === 'snowball' ? 'avalanche' : 'snowball', num(S().debtExtraPool), thisMonth); add('💳', sim.neverPaysOff ? 'bad' : 'info', sim.neverPaysOff ? 'Current payments never clear your debt' : `Debt-free by ${esc(D.monthLabel(sim.debtFreeMonth))}`, sim.neverPaysOff ? 'Add an extra monthly payment to see a date' : `${sim.monthsToDebtFree} months · ${fmt0(sim.totalInterest)} interest${other.totalInterest < sim.totalInterest - 1 ? ` · ${ui.debtStrategy === 'snowball' ? 'avalanche' : 'snowball'} saves ${fmt0(sim.totalInterest - other.totalInterest)}` : ''}`, 'debt', 'comparison'); }
  // emergency fund
  if (state.goals.length || state.accounts.some(a => a.type === 'savings')) { const avg = avgMonthlyExpenses(3); if (avg > 0) { const ef = state.goals.find(g => /emergency/i.test(g.name)); const have = ef ? num(ef.current) : sum(state.accounts.filter(a => a.type === 'savings' || a.type === 'cash'), a => a.balance); const mo = have / avg; add('🛟', mo >= (S().emergencyMonths || 3) ? 'good' : mo >= 1 ? 'warn' : 'bad', `Emergency fund covers ${mo.toFixed(1)} month${mo >= 1.05 || mo < 0.95 ? 's' : ''}`, `target ${S().emergencyMonths || 3} months of expenses`, 'savings', 'emergency'); } }
  // goal about to complete
  const near = state.goals.map(g => ({ g, p: goalProjection(g, thisMonth) })).filter(x => x.p.pct >= 80 && x.p.pct < 100).sort((a, b) => b.p.pct - a.p.pct)[0];
  if (near) add('🏁', 'good', `${esc(near.g.name)} is ${fmtPct(near.p.pct)} there`, `${fmt(near.p.remaining)} to go${near.p.projectedMonth ? ' · done by ' + esc(D.monthLabel(near.p.projectedMonth)) : ''}`, 'savings', 'goals');
  if (!out.length) return '';
  return `<div class="insights">${out.slice(0, 4).join('')}</div>`;
}
function firstSteps() {
  const exported = !!storage.get(LS_LAST_EXPORT);
  return [
    { key: 'income', icon: '💵', title: 'Add your income', sub: 'Enter it once — it posts itself every pay day.', done: state.income.length > 0, action: 'incomeAdd', label: '+ Income' },
    { key: 'bills', icon: '📅', title: 'Add bills & subscriptions', sub: 'The calendar and safe-to-spend build from these.', done: state.bills.length + state.subs.length > 0, action: 'billAdd', label: '+ Bill' },
    { key: 'accounts', icon: '🏦', title: 'Add your accounts', sub: 'Current balances for checking, savings, cards.', done: state.accounts.length > 0, action: 'accountAdd', label: '+ Account' },
    { key: 'budget', icon: '🎯', title: 'Set a simple budget', sub: 'A few categories is enough to start — it copies itself forward each month.', done: state.budgets.some(b => b.month === D.thisMonth()), action: 'goto', view: 'budget', anchor: 'table', label: 'Open budget' },
    { key: 'txn', icon: '🧾', title: 'Log your first expense', sub: 'Or import a CSV from your bank.', done: state.txns.some(t => !t.billRef), action: 'txnAdd', label: '+ Expense' },
    { key: 'backup', icon: '🛡️', title: 'Protect your data', sub: backupFile.supported ? 'Link a backup file — every change is saved to it.' : 'Export a JSON backup you can restore anywhere.', done: backupFile.status === 'linked' || exported, action: 'goto', view: 'settings', anchor: 'backup', label: 'Set up backup' },
  ];
}
function firstStepsHtml() {
  if (S().checklistDismissed) return '';
  const steps = firstSteps(); const done = steps.filter(s => s.done).length;
  const next = steps.find(s => !s.done);
  if (done === steps.length) return `<div class="callout good mb flex between flex-wrap"><span>🎉 <b>You're all set up.</b> Every first step is done — the dashboard is yours.</span><button class="btn sm" data-action="checklistDismiss">Hide this</button></div>`;
  return `<div class="steps-card">
    <div class="steps-head"><div><div class="kicker tiny" style="letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-bottom:4px">Your first steps</div><h3 style="font-size:20px">${next ? esc('Next: ' + next.title.toLowerCase()) : 'All done'}</h3><div class="small muted mt-s">Do these in order and every page comes alive. ${done} of ${steps.length} done.</div></div>
      <div class="flex"><button class="btn sm ghost" data-action="help">Tour</button><button class="btn sm ghost" data-action="checklistDismiss" title="Hide">×</button></div></div>
    ${progressBar(done / steps.length * 100, 'accent thin')}
    <div class="steps-list">${steps.map((st, i) => `<div class="step-item ${st.done ? 'done' : ''} ${st === next ? 'next' : ''}"><div class="n">${st.done ? '✓' : i + 1}</div><div class="grow"><b>${st.icon} ${esc(st.title)}</b><span>${esc(st.sub)}</span>${st.done ? '' : `<button class="btn sm ${st === next ? 'accent' : ''}" data-action="${st.action}" ${st.view ? `data-view="${st.view}"` : ''} ${st.anchor ? `data-anchor="${st.anchor}"` : ''}>${esc(st.label)}</button>`}</div></div>`).join('')}</div>
  </div>`;
}

// ================= OVERVIEW =================
views.overview = {
  title: 'Overview',
  render() {
    const month = ui.month;
    const sm = monthSummary(month);
    const nw = netWorth();
    const hasData = state.txns.length || state.income.length || state.bills.length || state.accounts.length;
    const top = greetingHtml() + insightsHtml(month) + firstStepsHtml();
    if (!hasData) return top;
    const sts = safeToSpend(month);
    const months12 = D.monthsBetween(D.addMonths(month, -11), month);
    const trend = months12.map(monthSummary);
    const firstTxnMonth = state.txns.length ? state.txns.reduce((a, t) => t.month < a ? t.month : a, '9999') : month;
    const gap = (m, v) => m < firstTxnMonth && m < S().startMonth ? null : v;
    const cats = categoryActuals(month);
    const catSlices = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: PALETTE[(i + 1) % PALETTE.length] }));
    const billCats = new Set(billItems().map(b => b.category));
    let fixed = 0, variable = 0;
    for (const t of expenseTxnsInMonth(month)) for (const s of t.splits) { if (t.billRef || billCats.has(s.category)) fixed += num(s.amount); else variable += num(s.amount); }
    const upcoming = billItems().flatMap(b => occurrences(b, D.today(), D.addDays(D.today(), 14)).map(d => ({ date: d, name: b.name, amount: b.amount, isSub: !!b._isSub, paid: isBillPaid(D.monthOf(d), b.id), owner: b.owner }))).sort((a, b) => a.date < b.date ? -1 : 1);
    const budgets = state.budgets.filter(b => b.month === month && num(b.planned) > 0).map(b => ({ cat: b.category, planned: num(b.planned), actual: cats[b.category] || 0 })).sort((a, b) => b.planned - a.planned).slice(0, 6);
    const goals = state.goals.slice().sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] || 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] || 1)).slice(0, 4);
    let coupleHtml = '';
    if (isCouple()) {
      const incBy = { p1: 0, p2: 0, joint: 0 }, expBy = { p1: 0, p2: 0, joint: 0 };
      for (const t of incomeTxnsInMonth(month)) incBy[t.owner || 'p1'] += txnTotal(t);
      for (const t of expenseTxnsInMonth(month)) expBy[t.owner || 'p1'] += txnTotal(t);
      const expInc = { p1: 0, p2: 0, joint: 0 }; for (const i of state.income) expInc[i.owner || 'p1'] += amountInMonth(i, month);
      const row = (k) => `<tr><td>${ownerChip(k)}</td><td class="right num">${fmt(incBy[k])}</td><td class="right num muted">${fmt(expInc[k])}</td><td class="right num">${fmt(expBy[k])}</td><td class="right num ${signCls(incBy[k] - expBy[k])}">${fmt(incBy[k] - expBy[k], { sign: true })}</td><td class="right num">${sm.income ? fmtPct(incBy[k] / sm.income * 100) : '—'}</td></tr>`;
      coupleHtml = `<div class="card"><div class="card-head"><h3>Household split</h3><span class="tiny muted">${esc(D.monthLabel(month))}</span></div><div class="table-wrap"><table><thead><tr><th>Person</th><th class="right">Income</th><th class="right">Expected</th><th class="right">Expenses</th><th class="right">Net</th><th class="right">Share of income</th></tr></thead><tbody>${['p1', 'p2', 'joint'].map(row).join('')}</tbody></table></div>
        <div class="grid grid-2 mt"><div><div class="tiny muted mb-s">CONTRIBUTION BY PERSON</div>${svgDonut({ size: 120, slices: [{ label: S().person1Name, value: incBy.p1, color: C.p1 }, { label: S().person2Name, value: incBy.p2, color: C.p2 }, { label: 'Joint', value: incBy.joint, color: C.joint }] })}</div><div><div class="tiny muted mb-s">EXPENSES BY PERSON</div>${svgDonut({ size: 120, slices: [{ label: S().person1Name, value: expBy.p1, color: C.p1 }, { label: S().person2Name, value: expBy.p2, color: C.p2 }, { label: 'Joint', value: expBy.joint, color: C.joint }] })}</div></div></div>`;
    }
    return top + `
      <div class="grid grid-5">
        ${kpi('Income', fmt0(sm.income), `Expected ${fmt0(sm.expectedIncome)}`)}
        ${kpi('Expenses', fmt0(sm.expenses), `Bills & subs due ${fmt0(sm.expectedBills)}`)}
        ${kpi('Net cash flow', fmt0(sm.net), sm.net >= 0 ? 'Income minus expenses' : 'Spending exceeded income', signCls(sm.net))}
        ${kpi('Savings rate', fmtPct(sm.savingsRate), sm.saved ? `Net + ${fmt0(sm.saved)} saved ÷ income` : 'Net ÷ income', sm.savingsRate === null ? '' : sm.savingsRate >= 20 ? 'good' : sm.savingsRate < 0 ? 'bad' : '')}
        ${kpi('Net worth', fmt0(nw.net), `Assets ${fmt0(nw.assets)} · Owed ${fmt0(nw.liabilities + nw.debts)}`, signCls(nw.net))}
      </div>
      <div class="grid grid-3 mt">
        <div class="card" style="grid-column:span 2"><div class="card-head"><h3>Income vs expenses</h3><span class="tiny muted">Last 12 months · recorded transactions</span></div>
          ${svgLineChart({ labels: months12.map(m => D.MONTHS[D.parse(m).m - 1]), series: [{ name: 'Income', color: C.good, points: trend.map(t => gap(t.month, t.income)), area: true }, { name: 'Expenses', color: C.accent, points: trend.map(t => gap(t.month, t.expenses)), area: true }], height: 230 })}
        </div>
        <div class="card inverse"><div class="card-head"><h3>Safe to spend</h3><span class="chip">estimate</span></div>
          <div class="kpi" style="padding:0"><div class="v ${sts.result >= 0 ? 'good' : ''}" style="font-size:34px">${fmt0(sts.result)}</div><div class="s">${month === D.thisMonth() ? 'For the rest of this month' : 'For ' + D.monthLabel(month)}</div></div>
          <table class="small mt"><tbody>
            <tr><td>Available in ${sts.accounts.length} spendable account${sts.accounts.length === 1 ? '' : 's'}</td><td class="right num">${fmt(sts.available)}</td></tr>
            <tr><td>Bills & subs still due (${sts.upcomingList.length})</td><td class="right num dim">−${fmt(sts.upcomingBills)}</td></tr>
            <tr><td>Goal contributions</td><td class="right num dim">−${fmt(sts.goals)}</td></tr>
            <tr><td>Safety buffer</td><td class="right num dim">−${fmt(sts.buffer)}</td></tr>
          </tbody></table>
          <div class="tiny mt-s dim">Spendable: ${(S().spendableTypes || []).map(t => accountType(t).l).join(', ') || 'none set'} · <a href="#" data-action="goto" data-view="settings" data-anchor="planning">change</a></div>
        </div>
      </div>
      <div class="grid grid-3 mt">
        <div class="card"><div class="card-head"><h3>Spending by category</h3></div>${svgDonut({ slices: catSlices.slice(0, 8).concat(catSlices.length > 8 ? [{ label: 'Other categories', value: sum(catSlices.slice(8), s => s.value), color: C.rest }] : []), centre: fmt0(sm.expenses), centreLabel: 'spent' })}</div>
        <div class="card"><div class="card-head"><h3>Fixed vs variable</h3></div>${svgDonut({ size: 130, slices: [{ label: 'Fixed (bills & subs)', value: fixed, color: C.ink }, { label: 'Variable', value: variable, color: C.accent }] })}
          <div class="tiny muted mt">Fixed = payments marked paid from Bills, or in a bill category.</div></div>
        <div class="card"><div class="card-head"><h3>Due in the next 14 days</h3><button class="btn sm ghost" data-action="goto" data-view="bills" data-anchor="bills">All bills</button></div>
          ${upcoming.length ? `<table class="small"><tbody>${upcoming.slice(0, 8).map(u => `<tr class="${u.paid ? 'row-muted' : ''}"><td class="nowrap">${esc(D.dateLabel(u.date).slice(0, 6))}</td><td>${esc(u.name)}${u.isSub ? ' <span class="tiny muted">sub</span>' : ''} ${ownerChip(u.owner)}</td><td class="right num">${u.paid ? '<span class="chip good">paid</span>' : fmt(u.amount)}</td></tr>`).join('')}</tbody></table>` : '<div class="muted small">Nothing due in the next two weeks.</div>'}
        </div>
      </div>
      <div class="grid grid-2 mt">
        <div class="card"><div class="card-head"><h3>Budget snapshot</h3><button class="btn sm ghost" data-action="goto" data-view="budget" data-anchor="table">Open budget</button></div>
          ${budgets.length ? budgets.map(b => `<div class="mini"><div class="mini-head"><span class="l"><span>${esc(b.cat)}</span></span><span class="v ${b.actual > b.planned ? 'bad' : ''}">${fmt0(b.actual)} <span class="muted">/ ${fmt0(b.planned)}</span></span></div>${progressBar(b.actual / b.planned * 100, b.actual > b.planned ? 'over' : b.actual > b.planned * 0.85 ? 'warn' : '')}</div>`).join('') : `<div class="muted small">No budget set for ${esc(D.monthLabel(month))}.</div>`}
        </div>
        <div class="card"><div class="card-head"><h3>Goals</h3><button class="btn sm ghost" data-action="goto" data-view="savings" data-anchor="goals">All goals</button></div>
          ${goals.length ? goals.map(g => { const p = goalProjection(g, D.thisMonth()); return `<div class="mini"><div class="mini-head"><span class="l"><span>${esc(g.name)}</span>${ownerChip(g.owner)}${p.behind ? '<span class="chip warn">behind</span>' : ''}</span><span class="v">${fmt0(g.current)} <span class="muted">/ ${fmt0(g.target)}</span></span></div>${progressBar(p.pct, 'accent')}</div>`; }).join('') : '<div class="muted small">No savings goals yet.</div>'}
        </div>
      </div>
      ${coupleHtml ? `<div class="mt">${coupleHtml}</div>` : ''}`;
  }
};

// ================= BUDGET =================
views.budget = {
  title: 'Budget',
  render() {
    const month = ui.month, mode = S().budgetRollover;
    const actuals = categoryActuals(month);
    const plannedFn = (mo, cat) => { const b = state.budgets.find(x => x.month === mo && x.category === cat); return b ? num(b.planned) : null; };
    const actualFn = (mo, cat) => categoryActuals(mo)[cat] || 0;
    const rows = catList().map(cat => {
      const planned = plannedFn(month, cat);
      const carry = mode === 'off' ? 0 : rolloverInto(month, cat, mode, plannedFn, actualFn, S().startMonth);
      const effective = round2((planned || 0) + carry);
      const actual = actuals[cat] || 0;
      return { cat, planned, carry, effective, actual, remaining: round2(effective - actual), hasBudget: planned !== null };
    });
    const shown = ui.budgetShowAll ? rows : rows.filter(r => r.hasBudget || r.actual > 0);
    const totPlanned = sum(rows, r => r.effective), totActual = sum(rows, r => r.actual);
    const unbudgeted = rows.filter(r => !r.hasBudget && r.actual > 0);
    const prev = D.addMonths(month, -1); const prevHas = state.budgets.some(b => b.month === prev);
    const hasAny = rows.some(r => r.hasBudget);
    const pctUsed = totPlanned ? totActual / totPlanned * 100 : 0;
    return `
      <div class="grid grid-4">
        ${kpi('Planned', fmt0(totPlanned), mode !== 'off' ? 'Including rollover' : '')}
        ${kpi('Spent', fmt0(totActual), `${fmtPct(pctUsed)} of plan`, totActual > totPlanned && totPlanned ? 'bad' : '')}
        ${kpi('Remaining', fmt0(totPlanned - totActual), '', signCls(totPlanned - totActual))}
        ${kpi('Over budget', String(rows.filter(r => r.hasBudget && r.actual > r.effective).length), 'categories', rows.some(r => r.hasBudget && r.actual > r.effective) ? 'bad' : '')}
      </div>
      <div class="card mt" data-anchor="table">
        <div class="card-head"><h3>${esc(D.monthLabel(month, true))}</h3><div class="flex flex-wrap">
          ${prevHas ? `<button class="btn sm" data-action="budgetCopyPrev">Copy ${esc(D.monthLabel(prev))}</button>` : ''}
          <button class="btn sm" data-action="budgetFromAverage" title="Set each category to its average spend over the last 3 months">Suggest from last 3 months</button>
          <label class="check small"><input type="checkbox" data-change="budgetShowAll" ${ui.budgetShowAll ? 'checked' : ''}> Show all categories</label>
          <button class="btn sm ghost" data-action="goto" data-view="settings" data-anchor="planning">Rollover: ${esc({ off: 'off', surplus: 'surplus', full: 'full' }[mode] || 'off')}</button></div></div>
        ${!hasAny && !shown.length ? emptyBox('No budget for this month', 'Type planned amounts below — every category is editable inline. Press Enter or click away to save. Once set, the budget copies itself into each new month.', '') : ''}
        <div class="table-wrap"><table>
          <thead><tr><th>Category</th><th class="right">Planned</th>${mode !== 'off' ? '<th class="right">Rollover</th><th class="right">Available</th>' : ''}<th class="right">Spent</th><th class="right">Remaining</th><th style="width:26%">Progress</th></tr></thead>
          <tbody>${(shown.length ? shown : rows).map(r => {
            const over = r.hasBudget && r.actual > r.effective; const p = r.effective > 0 ? r.actual / r.effective * 100 : (r.actual > 0 ? 100 : 0);
            return `<tr><td>${esc(r.cat)}${!r.hasBudget && r.actual > 0 ? ' <span class="chip warn" title="Spending with no budget set">unbudgeted</span>' : ''}</td>
              <td class="right"><input class="inline-input" type="number" step="0.01" min="0" inputmode="decimal" value="${r.planned === null ? '' : r.planned}" placeholder="—" data-change="budgetSet" data-cat="${attr(r.cat)}"></td>
              ${mode !== 'off' ? `<td class="right num ${signCls(r.carry)}">${r.carry ? fmt(r.carry, { sign: true }) : '—'}</td><td class="right num">${r.hasBudget ? fmt(r.effective) : '—'}</td>` : ''}
              <td class="right num">${fmt(r.actual)}</td><td class="right num ${over ? 'bad' : r.hasBudget ? 'good' : 'muted'}">${r.hasBudget ? fmt(r.remaining) : '—'}</td>
              <td>${progressBar(p, over ? 'over' : p > 85 ? 'warn' : '')}</td></tr>`;
          }).join('')}</tbody>
          <tfoot><tr><td>Total</td><td class="right num">${fmt(sum(rows, r => r.planned || 0))}</td>${mode !== 'off' ? `<td class="right num">${fmt(sum(rows, r => r.carry))}</td><td class="right num">${fmt(totPlanned)}</td>` : ''}<td class="right num">${fmt(totActual)}</td><td class="right num ${signCls(totPlanned - totActual)}">${fmt(totPlanned - totActual)}</td><td></td></tr></tfoot>
        </table></div>
        ${unbudgeted.length ? `<div class="callout warn mt small"><b>${fmt(sum(unbudgeted, r => r.actual))}</b> spent across ${unbudgeted.length} categor${unbudgeted.length === 1 ? 'y' : 'ies'} with no budget: ${unbudgeted.map(r => esc(r.cat)).join(', ')}.</div>` : ''}
        ${mode !== 'off' ? `<div class="tiny muted mt">Rollover (${mode === 'surplus' ? 'surplus only' : 'full, including overspend'}) carries the unspent amount from the previous month's budget. Chains stop at months with no budget set.</div>` : ''}
      </div>`;
  }
};

// ================= TRANSACTIONS =================
function paymentOptions() { return [{ v: '', l: '— none —' }].concat(state.accounts.map(a => ({ v: a.id, l: a.name })), [{ v: 'cash', l: 'Cash' }, { v: 'other', l: 'Other' }]); }
function paymentLabel(v) { if (!v) return ''; const a = byId('accounts', v); return a ? a.name : v === 'cash' ? 'Cash' : v === 'other' ? 'Other' : v; }
function splitCategories(type) { return type === 'income' ? INCOME_TYPES : type === 'transfer' ? ['Transfer'] : catList(); }
function splitsEditorHtml(vals) {
  const splits = vals.splits && vals.splits.length ? vals.splits : [{ category: '', amount: '' }];
  const cats = splitCategories(vals.type || 'expense');
  return `<div class="field full"><label>${splits.length > 1 ? 'Splits' : 'Category & amount'}</label>
    <div id="splitRows">${splits.map((s, i) => `<div class="flex mb-s split-row"><select name="split_cat_${i}" class="grow">${cats.map(c => `<option value="${attr(c)}"${c === s.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <input type="number" step="0.01" min="0" inputmode="decimal" name="split_amt_${i}" value="${s.amount === '' ? '' : attr(s.amount)}" placeholder="Amount" style="width:130px" required>
      ${splits.length > 1 ? `<button type="button" class="btn sm icon" data-action="splitRemove" data-i="${i}" title="Remove split">×</button>` : ''}</div>`).join('')}</div>
    <div class="flex between"><button type="button" class="btn sm ghost" data-action="splitAdd">+ Add split</button>${splits.length > 1 ? `<span class="small muted">Total: <b id="splitTotal">${fmt(sum(splits, s => s.amount))}</b></span>` : ''}</div></div>`;
}
function readSplits(form, vals) {
  const rows = form.querySelectorAll('.split-row'); const out = [];
  rows.forEach((r, i) => { const c = r.querySelector(`[name="split_cat_${i}"]`), a = r.querySelector(`[name="split_amt_${i}"]`); out.push({ category: c ? c.value : '', amount: a && a.value !== '' ? num(a.value) : '' }); });
  vals.splits = out;
}
function openTxnForm(txn) {
  const isNew = !txn;
  const values = txn ? Object.assign({}, txn, { splits: txn.splits.map(s => Object.assign({}, s)) }) : { date: ui.month === D.thisMonth() ? D.today() : D.monthStart(ui.month), type: 'expense', owner: 'p1', paymentMethod: '', splits: [{ category: catList()[0], amount: '' }] };
  openForm({
    title: isNew ? 'Add transaction' : 'Edit transaction',
    values,
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: [{ v: 'expense', l: 'Expense' }, { v: 'income', l: 'Income' }, { v: 'transfer', l: 'Transfer' }], required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'description', label: 'Description', type: 'text', required: true, full: true, placeholder: 'e.g. Weekly groceries' },
      ownerField(),
      { key: 'paymentMethod', label: 'Paid from', type: 'select', options: paymentOptions(), advanced: true },
      { key: 'notes', label: 'Notes', type: 'text', full: true, advanced: true },
    ],
    extraHtml: splitsEditorHtml, readExtra: readSplits,
    onInput: (vals, form) => { const t = form.querySelector('#splitTotal'); if (t) t.textContent = fmt(sum(vals.splits, s => s.amount)); },
    validate: vals => {
      if (!vals.splits.length) return 'Add at least one category.';
      if (vals.splits.some(s => s.amount === '' || num(s.amount) < 0)) return 'Every split needs an amount.';
      if (sum(vals.splits, s => s.amount) <= 0) return 'Amount must be more than zero.';
      if (vals.splits.some(s => !s.category)) return 'Every split needs a category.';
      return null;
    },
    onSave: vals => {
      const rec = { id: txn ? txn.id : uid(), date: vals.date, month: D.monthOf(vals.date), type: vals.type, description: vals.description.trim(), owner: vals.owner || 'p1', paymentMethod: vals.paymentMethod || '', notes: vals.notes || '', splits: vals.splits.map(s => ({ category: s.category, amount: round2(num(s.amount)) })) };
      if (txn && txn.billRef) rec.billRef = txn.billRef;
      if (txn && txn.incomeRef) rec.incomeRef = txn.incomeRef;
      commit(s => { if (txn) { const i = s.txns.findIndex(t => t.id === txn.id); s.txns[i] = rec; } else s.txns.push(rec); });
      toast(isNew ? 'Transaction added' : 'Transaction updated', 'good');
    },
    onDelete: txn ? () => { commit(s => { s.txns = s.txns.filter(t => t.id !== txn.id); if (txn.billRef && s.billPaid[txn.billRef.month]) { delete s.billPaid[txn.billRef.month][txn.billRef.id]; s.skipped['bill|' + txn.billRef.id + '|' + txn.billRef.month] = true; } if (txn.incomeRef) s.skipped[txn.incomeRef.id + '|' + txn.incomeRef.date] = true; }); toast(txn.incomeRef ? 'Deleted — this pay day will not be re-posted' : 'Transaction deleted'); } : null,
    after: (form, vals, m) => {
      form.addEventListener('click', e => {
        const add = e.target.closest('[data-action="splitAdd"]'), rem = e.target.closest('[data-action="splitRemove"]');
        if (!add && !rem) return;
        e.preventDefault(); e.stopPropagation();
        readSplits(form, vals);
        if (add) vals.splits.push({ category: splitCategories(vals.type)[0], amount: '' });
        if (rem) vals.splits.splice(+rem.dataset.i, 1);
        form.querySelector('#formExtra').innerHTML = splitsEditorHtml(vals);
      });
      form.querySelector('[name="type"]').addEventListener('change', () => { readSplits(form, vals); vals.type = form.querySelector('[name="type"]').value; const cats = splitCategories(vals.type); vals.splits.forEach(s => { if (!cats.includes(s.category)) s.category = cats[0]; }); form.querySelector('#formExtra').innerHTML = splitsEditorHtml(vals); });
    }
  });
}
views.transactions = {
  title: 'Transactions',
  render() {
    const f = ui.txnFilter;
    const monthFilter = f.month === undefined ? ui.month : f.month; // '' = all
    let list = state.txns.slice();
    if (monthFilter) list = list.filter(t => t.month === monthFilter);
    if (f.type) list = list.filter(t => t.type === f.type);
    if (f.owner) list = list.filter(t => (t.owner || 'p1') === f.owner);
    if (f.category) list = list.filter(t => t.splits.some(s => s.category === f.category));
    if (f.q) { const q = f.q.toLowerCase(); list = list.filter(t => (t.description || '').toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q) || t.splits.some(s => (s.category || '').toLowerCase().includes(q))); }
    list.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    const inc = sum(list.filter(t => t.type === 'income'), txnTotal), exp = sum(list.filter(t => t.type === 'expense'), txnTotal);
    const limit = ui.txnLimit || 200; const shown = list.slice(0, limit);
    const allCats = [...new Set([...catList(), ...INCOME_TYPES, 'Transfer'])];
    return `
      <div class="flex between flex-wrap mb">
        <div class="filters" style="margin:0">
          <input type="search" placeholder="Search description, notes, category" value="${attr(f.q || '')}" data-change="txnFilter" data-key="q">
          <select data-change="txnFilter" data-key="month"><option value="">All months</option>${monthsWithData().slice().reverse().map(m => `<option value="${m}"${m === monthFilter ? ' selected' : ''}>${esc(D.monthLabel(m))}</option>`).join('')}</select>
          <select data-change="txnFilter" data-key="type"><option value="">All types</option><option value="expense"${f.type === 'expense' ? ' selected' : ''}>Expenses</option><option value="income"${f.type === 'income' ? ' selected' : ''}>Income</option><option value="transfer"${f.type === 'transfer' ? ' selected' : ''}>Transfers</option></select>
          <select data-change="txnFilter" data-key="category"><option value="">All categories</option>${allCats.map(c => `<option value="${attr(c)}"${f.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>
          ${isCouple() ? `<select data-change="txnFilter" data-key="owner"><option value="">Everyone</option><option value="p1"${f.owner === 'p1' ? ' selected' : ''}>${esc(S().person1Name)}</option><option value="p2"${f.owner === 'p2' ? ' selected' : ''}>${esc(S().person2Name)}</option><option value="joint"${f.owner === 'joint' ? ' selected' : ''}>Joint</option></select>` : ''}
        </div>
        <div class="flex"><button class="btn sm" data-action="csvImport">Import CSV</button><button class="btn sm" data-action="csvExport">Export CSV</button><button class="btn primary" data-action="txnAdd">+ Add</button></div>
      </div>
      <div class="grid grid-3 mb">${kpi('Income', fmt0(inc), `${list.filter(t => t.type === 'income').length} transactions`)}${kpi('Expenses', fmt0(exp), `${list.filter(t => t.type === 'expense').length} transactions`)}${kpi('Net', fmt0(inc - exp), '', signCls(inc - exp))}</div>
      <div class="card" data-anchor="list">
        ${list.length ? `<div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Description</th><th>Category</th>${isCouple() ? '<th>Owner</th>' : ''}<th>Paid from</th><th class="right">Amount</th><th class="actions"></th></tr></thead>
          <tbody>${shown.map(t => { const tot = txnTotal(t); return `<tr data-action="txnEdit" data-id="${t.id}" style="cursor:pointer"><td class="nowrap">${esc(D.dateLabel(t.date))}</td><td>${esc(t.description)}${t.billRef ? ' <span class="chip" title="Created by ticking the bill as paid">bill</span>' : ''}${t.incomeRef ? ' <span class="chip good" title="Posted automatically on pay day">auto</span>' : ''}${t.notes ? `<div class="tiny muted">${esc(t.notes)}</div>` : ''}</td><td>${t.splits.length > 1 ? `<span class="chip" title="${attr(t.splits.map(s => `${s.category} ${fmt(s.amount)}`).join(', '))}">${t.splits.length} splits</span> <span class="tiny muted">${esc(t.splits.map(s => s.category).join(', '))}</span>` : esc(t.splits[0].category)}</td>${isCouple() ? `<td>${ownerChip(t.owner)}</td>` : ''}<td class="muted small">${esc(paymentLabel(t.paymentMethod))}</td><td class="right num ${t.type === 'income' ? 'good' : t.type === 'transfer' ? 'muted' : ''}">${t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}${fmt(tot)}</td><td class="actions"><button class="btn sm ghost icon" data-action="txnEdit" data-id="${t.id}" title="Edit">✎</button></td></tr>`; }).join('')}</tbody>
        </table></div>${list.length > limit ? `<div class="center mt"><button class="btn sm" data-action="txnMore">Show more (${list.length - limit} hidden)</button></div>` : ''}` : emptyBox('No transactions match', 'Add one, import a CSV from your bank, or change the filters.', `<button class="btn primary" data-action="txnAdd">+ Add transaction</button>`)}
      </div>`;
  }
};

// ---------- CSV import ----------
function guessColumn(headers, names) { const h = headers.map(x => String(x).toLowerCase().trim()); for (const n of names) { const i = h.findIndex(x => x === n || x.includes(n)); if (i >= 0) return i; } return -1; }
function openCsvImport() {
  const m = openModal(`<div class="modal wide"><div class="modal-head"><h3>Import transactions from CSV</h3><button class="x" data-modal-close>×</button></div>
    <div class="modal-body"><p class="small muted">Export a CSV from your bank, then map the columns below. Nothing is uploaded — the file is read in this browser only.</p>
    <div class="field"><label>CSV file</label><input type="file" id="csvFile" accept=".csv,text/csv,.txt"></div><div id="csvStage"></div></div>
    <div class="modal-foot"><button class="btn" data-modal-close>Cancel</button><span class="spacer"></span><button class="btn primary" id="csvGo" disabled>Import</button></div></div>`);
  const stage = m.bg.querySelector('#csvStage'), go = m.bg.querySelector('#csvGo');
  let rows = [], headers = [], map = {}, hasHeader = true, dayFirst = false, preview = [];
  const existingKeys = new Set(state.txns.map(t => `${t.date}|${round2(txnTotal(t))}|${(t.description || '').toLowerCase().trim()}`));
  const colSel = (key, label, guess, opt) => `<div class="field"><label>${label}</label><select data-map="${key}"><option value="-1">${opt ? '— not used —' : '— choose —'}</option>${headers.map((h, i) => `<option value="${i}"${i === guess ? ' selected' : ''}>${esc(h || 'Column ' + (i + 1))}</option>`).join('')}</select></div>`;
  function build() {
    headers = hasHeader ? rows[0] : rows[0].map((_, i) => 'Column ' + (i + 1));
    map = { date: guessColumn(headers, ['date', 'posted', 'transaction date']), desc: guessColumn(headers, ['description', 'narrative', 'details', 'memo', 'payee', 'name', 'merchant']), amount: guessColumn(headers, ['amount', 'value', 'sum']), debit: guessColumn(headers, ['debit', 'withdrawal', 'money out', 'out']), credit: guessColumn(headers, ['credit', 'deposit', 'money in', 'in']), category: guessColumn(headers, ['category', 'type']) };
    if (map.amount === -1 && map.debit === -1) map.amount = headers.length > 2 ? headers.length - 1 : -1;
    stage.innerHTML = `<div class="form-grid">${colSel('date', 'Date column', map.date)}${colSel('desc', 'Description column', map.desc)}${colSel('amount', 'Amount column (signed)', map.amount, true)}${colSel('category', 'Category column', map.category, true)}${colSel('debit', 'Debit / money out column', map.debit, true)}${colSel('credit', 'Credit / money in column', map.credit, true)}
      <div class="field"><label>Sign convention</label><select id="csvSign"><option value="neg">Negative = expense, positive = income</option><option value="pos">Positive = expense, negative = income</option><option value="allexp">Everything is an expense</option></select></div>
      <div class="field"><label>Date format</label><select id="csvDay"><option value="0">Month first (US, 03/31/2026)</option><option value="1">Day first (31/03/2026)</option></select><div class="hint">ISO dates (2026-03-31) work either way.</div></div>
      <div class="field"><label>Default category</label><select id="csvCat">${catList().map(c => `<option value="${attr(c)}">${esc(c)}</option>`).join('')}</select></div>
      ${isCouple() ? `<div class="field"><label>Owner</label><select id="csvOwner"><option value="p1">${esc(S().person1Name)}</option><option value="p2">${esc(S().person2Name)}</option><option value="joint">Joint</option></select></div>` : ''}
      <div class="field"><label>Paid from</label><select id="csvPay">${paymentOptions().map(o => `<option value="${attr(o.v)}">${esc(o.l)}</option>`).join('')}</select></div>
      <div class="field full"><label class="check"><input type="checkbox" id="csvHeader" ${hasHeader ? 'checked' : ''}> First row is a header</label><label class="check mt-s"><input type="checkbox" id="csvSkipDup" checked> Skip rows that look like duplicates (same date, amount and description)</label></div></div>
      <div id="csvPreview"></div>`;
    stage.querySelectorAll('select,input').forEach(el => el.addEventListener('change', () => { if (el.id === 'csvHeader') { hasHeader = el.checked; build(); return; } previewBuild(); }));
    previewBuild();
  }
  function previewBuild() {
    stage.querySelectorAll('[data-map]').forEach(s => map[s.dataset.map] = +s.value);
    const sign = stage.querySelector('#csvSign').value; dayFirst = stage.querySelector('#csvDay').value === '1';
    const defCat = stage.querySelector('#csvCat').value, owner = isCouple() ? stage.querySelector('#csvOwner').value : 'p1', pay = stage.querySelector('#csvPay').value, skipDup = stage.querySelector('#csvSkipDup').checked;
    const data = hasHeader ? rows.slice(1) : rows; preview = []; let bad = 0, dups = 0;
    for (const r of data) {
      const date = map.date >= 0 ? parseDateLoose(r[map.date], dayFirst) : null;
      let amt = null, type = 'expense';
      if (map.amount >= 0) { amt = parseAmountLoose(r[map.amount]); if (amt !== null) { if (sign === 'neg') { type = amt < 0 ? 'expense' : 'income'; } else if (sign === 'pos') { type = amt > 0 ? 'expense' : 'income'; } amt = Math.abs(amt); } }
      if ((amt === null || amt === 0) && (map.debit >= 0 || map.credit >= 0)) { const d = map.debit >= 0 ? parseAmountLoose(r[map.debit]) : null, c = map.credit >= 0 ? parseAmountLoose(r[map.credit]) : null; if (d) { amt = Math.abs(d); type = 'expense'; } else if (c) { amt = Math.abs(c); type = 'income'; } }
      const desc = map.desc >= 0 ? String(r[map.desc] || '').trim() : '';
      if (!date || amt === null || amt === 0) { bad++; continue; }
      let cat = map.category >= 0 ? String(r[map.category] || '').trim() : '';
      const pool = type === 'income' ? INCOME_TYPES : catList();
      if (cat) { const hit = pool.find(c => c.toLowerCase() === cat.toLowerCase()); cat = hit || (type === 'income' ? 'Other' : defCat); } else cat = type === 'income' ? 'Other' : defCat;
      const key = `${date}|${round2(amt)}|${desc.toLowerCase()}`; const dup = existingKeys.has(key);
      if (dup) dups++;
      preview.push({ date, month: D.monthOf(date), type, description: desc || '(no description)', owner, paymentMethod: pay, notes: '', splits: [{ category: cat, amount: round2(amt) }], dup, skip: dup && skipDup });
    }
    const toImport = preview.filter(p => !p.skip).length;
    stage.querySelector('#csvPreview').innerHTML = `<div class="callout mt small">${data.length} rows read · <b>${toImport}</b> to import · ${dups} duplicate${dups === 1 ? '' : 's'}${skipDup ? ' (skipped)' : ' (will be imported)'} · ${bad} unreadable row${bad === 1 ? '' : 's'} ignored</div>
      <div class="table-wrap mt"><table class="small"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th class="right">Amount</th><th></th></tr></thead><tbody>${preview.slice(0, 12).map(p => `<tr class="${p.skip ? 'row-muted' : ''}"><td>${p.date}</td><td>${esc(p.description)}</td><td>${esc(p.splits[0].category)}</td><td>${p.type}</td><td class="right num">${fmt(p.splits[0].amount)}</td><td>${p.dup ? '<span class="chip warn">duplicate</span>' : ''}</td></tr>`).join('')}${preview.length > 12 ? `<tr><td colspan="6" class="muted center">… ${preview.length - 12} more</td></tr>` : ''}</tbody></table></div>`;
    go.disabled = toImport === 0;
  }
  m.bg.querySelector('#csvFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text(); rows = parseCSV(text);
    if (rows.length < 1) { stage.innerHTML = '<div class="callout bad">No rows found in that file.</div>'; return; }
    hasHeader = rows[0].every(c => isNaN(parseFloat(c)) || /date|amount/i.test(c)) && rows.length > 1;
    build();
  });
  go.addEventListener('click', () => {
    const add = preview.filter(p => !p.skip).map(p => { const t = Object.assign({ id: uid() }, p); delete t.dup; delete t.skip; return t; });
    commit(s => s.txns.push(...add));
    m.close();
    toast(`Imported ${add.length} transaction${add.length === 1 ? '' : 's'}`, 'good');
  });
}
function exportCsv(list, name) {
  const rows = [['Date', 'Type', 'Description', 'Category', 'Amount', 'Owner', 'Paid from', 'Notes']];
  for (const t of list) for (const s of t.splits) rows.push([t.date, t.type, t.description, s.category, num(s.amount).toFixed(2), isCouple() ? ownerName(t.owner || 'p1') : '', paymentLabel(t.paymentMethod), t.notes || '']);
  downloadText(name || `transactions-${D.today()}.csv`, toCSV(rows), 'text/csv');
}
function downloadText(name, text, mime) {
  const blob = new Blob([text], { type: mime || 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ================= BILLS & SUBSCRIPTIONS =================
function openBillForm(bill) {
  const isNew = !bill;
  openForm({
    title: isNew ? 'Add bill' : 'Edit bill',
    values: bill || { frequency: 'monthly', dueDay: 1, startDate: D.monthStart(ui.month), owner: 'p1', active: true, category: 'Utilities' },
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, full: true, placeholder: 'e.g. Rent, Electricity' },
      categoryField(), ownerField(),
      { key: 'amount', label: 'Amount', type: 'number', required: true, min: 0 },
      ...frequencyFields(),
      { key: 'dueDay', label: 'Due day of month', type: 'number', step: '1', min: 1, max: 31, show: v => stepOf(v).unit !== 'week', hint: 'Days past the month end (e.g. 31 in February) fall on the last day.' },
      { key: 'startDate', label: 'Start date', type: 'date', required: true, hint: 'Weekly items repeat from this date. Monthly items start on the first due day on or after it.', advanced: v => stepOf(v).unit !== 'week' },
      { key: 'endDate', label: 'End date (optional)', type: 'date', advanced: true },
      { key: 'active', label: 'Active', type: 'checkbox', full: true, advanced: true },
    ],
    onSave: vals => {
      const rec = Object.assign({ id: bill ? bill.id : uid() }, vals, { amount: round2(num(vals.amount)), owner: vals.owner || 'p1' });
      commit(s => { if (bill) s.bills[s.bills.findIndex(b => b.id === bill.id)] = rec; else s.bills.push(rec); });
      toast(isNew ? 'Bill added' : 'Bill updated', 'good');
    },
    onDelete: bill ? () => { commit(s => { s.bills = s.bills.filter(b => b.id !== bill.id); }); toast('Bill deleted'); } : null,
  });
}
function openSubForm(sub) {
  const isNew = !sub;
  openForm({
    title: isNew ? 'Add subscription' : 'Edit subscription',
    values: sub || { billingCycle: 'monthly', renewalDate: D.today(), owner: 'p1', active: true, category: 'Subscriptions' },
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, full: true, placeholder: 'e.g. Netflix, Gym' },
      categoryField(), ownerField(),
      { key: 'amount', label: 'Amount per renewal', type: 'number', required: true, min: 0 },
      { key: 'billingCycle', label: 'Billing cycle', type: 'select', options: [{ v: 'weekly', l: 'Weekly' }, { v: 'monthly', l: 'Monthly' }, { v: 'quarterly', l: 'Quarterly' }, { v: 'semiannual', l: 'Every 6 months' }, { v: 'annual', l: 'Annual' }], required: true },
      { key: 'renewalDate', label: 'Next renewal date', type: 'date', required: true, hint: 'Future renewals repeat from this date.' },
      { key: 'startDate', label: 'Started (optional)', type: 'date', hint: 'Lets past months show this subscription.', advanced: true },
      { key: 'endDate', label: 'Cancel date (optional)', type: 'date', advanced: true },
      { key: 'active', label: 'Active', type: 'checkbox', full: true, advanced: true },
    ],
    onSave: vals => {
      const rec = Object.assign({ id: sub ? sub.id : uid() }, vals, { amount: round2(num(vals.amount)), owner: vals.owner || 'p1' });
      commit(s => { if (sub) s.subs[s.subs.findIndex(b => b.id === sub.id)] = rec; else s.subs.push(rec); });
      toast(isNew ? 'Subscription added' : 'Subscription updated', 'good');
    },
    onDelete: sub ? () => { commit(s => { s.subs = s.subs.filter(b => b.id !== sub.id); }); toast('Subscription deleted'); } : null,
  });
}
views.bills = {
  title: 'Bills & Subscriptions',
  render() {
    const month = ui.month, today = D.today();
    const rowsFor = (items, isSub) => items.map(it => {
      const r = isSub ? subAsRecurring(it) : it;
      const inMonth = expandRecurring(r, month, month)[0];
      const next = nextDue(r, month === D.thisMonth() ? today : D.monthStart(month));
      const paid = isBillPaid(month, it.id);
      const overdue = !paid && inMonth.occurrences > 0 && month === D.thisMonth() && occurrences(r, D.monthStart(month), today).length > 0;
      return `<tr class="${it.active === false ? 'row-muted' : ''}"><td><label class="check" title="Mark paid for ${attr(D.monthLabel(month))}"><input type="checkbox" data-change="togglePaid" data-id="${it.id}" data-kind="${isSub ? 'sub' : 'bill'}" ${paid ? 'checked' : ''} ${inMonth.occurrences === 0 ? 'disabled' : ''}></label></td>
        <td><b>${esc(it.name)}</b>${it.active === false ? ' <span class="chip">inactive</span>' : ''}${overdue ? ' <span class="chip bad">due</span>' : ''}<div class="tiny muted">${esc(it.category || '')}</div></td>${isCouple() ? `<td>${ownerChip(it.owner)}</td>` : ''}
        <td class="right num">${fmt(it.amount)}</td><td class="small">${esc(isSub ? (FREQ[it.billingCycle] || FREQ.monthly).label : freqLabel(it))}</td><td class="small nowrap">${next ? esc(D.dateLabel(next)) : '<span class="muted">—</span>'}</td>
        <td class="right num">${inMonth.occurrences ? fmt(inMonth.amount) + (inMonth.occurrences > 1 ? ` <span class="tiny muted">×${inMonth.occurrences}</span>` : '') : '<span class="muted">—</span>'}</td><td class="right num muted">${fmt(monthlyEquivalent(r))}</td>
        <td class="actions"><button class="btn sm ghost icon" data-action="${isSub ? 'subEdit' : 'billEdit'}" data-id="${it.id}" title="Edit">✎</button></td></tr>`;
    }).join('');
    const head = `<thead><tr><th>Paid</th><th>Name</th>${isCouple() ? '<th>Owner</th>' : ''}<th class="right">Amount</th><th>Frequency</th><th>Next due</th><th class="right">This month</th><th class="right">Monthly avg</th><th class="actions"></th></tr></thead>`;
    const bills = state.bills.slice().sort((a, b) => a.name.localeCompare(b.name)), subs = state.subs.slice().sort((a, b) => a.name.localeCompare(b.name));
    const billsMonth = sum(bills, b => amountInMonth(b, month)), subsMonth = sum(subs, s => amountInMonth(subAsRecurring(s), month));
    const subsAnnual = sum(subs.filter(s => s.active !== false), s => annualAmount(subAsRecurring(s))), billsAnnual = sum(bills.filter(b => b.active !== false), annualAmount);
    const paidTotal = sum(billItems().filter(b => isBillPaid(month, b.id)), b => amountInMonth(b, month));
    const due = billsMonth + (S().includeSubsInBills ? subsMonth : 0);
    return `
      <div class="grid grid-4">
        ${kpi('Due ' + D.monthLabel(month), fmt0(due), `${fmt0(paidTotal)} marked paid`)}
        ${kpi('Bills per month', fmt0(billsAnnual / 12), `${fmt0(billsAnnual)} a year · averaged`)}
        ${kpi('Subscriptions per month', fmt0(subsAnnual / 12), `${fmt0(subsAnnual)} a year · ${subs.filter(s => s.active !== false).length} active`)}
        ${kpi('Still to pay', fmt0(Math.max(0, due - paidTotal)), 'this month', due - paidTotal > 0 ? 'warn' : 'good')}
      </div>
      <div class="flex between flex-wrap mt">
        <div class="seg"><button class="${ui.calendarMode === 'list' ? 'active' : ''}" data-action="calMode" data-mode="list">List</button><button class="${ui.calendarMode === 'calendar' ? 'active' : ''}" data-action="calMode" data-mode="calendar">Calendar</button></div>
        <div class="flex flex-wrap"><button class="btn" data-action="markAllDue" title="Tick every bill and subscription that has come due this month">✓ Mark all due as paid</button><button class="btn" data-action="subAdd">+ Subscription</button><button class="btn primary" data-action="billAdd">+ Bill</button></div>
      </div>
      ${ui.calendarMode === 'calendar' ? renderBillCalendar(month) : `
      <div class="card mt" data-anchor="bills"><div class="card-head"><h3>Bills</h3><span class="tiny muted">Tick "Paid" to record the payment as a transaction for ${esc(D.monthLabel(month))}${S().autoPayBills ? ' · auto-ticked on the due date' : ''}</span></div>
        ${bills.length ? `<div class="table-wrap"><table>${head}<tbody>${rowsFor(bills, false)}</tbody><tfoot><tr><td></td><td>Total</td>${isCouple() ? '<td></td>' : ''}<td></td><td></td><td></td><td class="right num">${fmt(billsMonth)}</td><td class="right num">${fmt(billsAnnual / 12)}</td><td></td></tr></tfoot></table></div>` : emptyBox('No bills yet', 'Add rent, utilities, insurance — anything that recurs.', '<button class="btn primary" data-action="billAdd">+ Add a bill</button>')}
      </div>
      <div class="card mt" data-anchor="subs"><div class="card-head"><h3>Subscriptions</h3><span class="tiny muted">${S().includeSubsInBills ? 'Counted in bills totals' : 'Not counted in bills totals (Settings)'}</span></div>
        ${subs.length ? `<div class="table-wrap"><table>${head}<tbody>${rowsFor(subs, true)}</tbody><tfoot><tr><td></td><td>Total</td>${isCouple() ? '<td></td>' : ''}<td></td><td></td><td></td><td class="right num">${fmt(subsMonth)}</td><td class="right num">${fmt(subsAnnual / 12)}</td><td></td></tr></tfoot></table></div>` : emptyBox('No subscriptions yet', 'Streaming, software, gym, memberships — track every renewal.', '<button class="btn" data-action="subAdd">+ Add a subscription</button>')}
      </div>`}`;
  }
};
function renderBillCalendar(month) {
  const { y, m } = D.parse(month); const days = D.dim(y, m); const first = D.weekday(D.monthStart(month)); const today = D.today();
  const byDay = {};
  for (const b of billItems()) for (const d of occurrences(b, D.monthStart(month), D.monthEnd(month))) { const dd = D.parse(d).d; (byDay[dd] = byDay[dd] || []).push({ name: b.name, amount: b.amount, isSub: !!b._isSub, paid: isBillPaid(month, b.id), id: b.id }); }
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<div class="day blank"></div>';
  for (let d = 1; d <= days; d++) { const iso = D.iso(y, m, d); const items = byDay[d] || []; cells += `<div class="day ${iso === today ? 'today' : ''}"><div class="d">${d}${items.length ? ` <span class="muted">· ${fmt0(sum(items, i => i.amount))}</span>` : ''}</div>${items.map(i => `<span class="it ${i.paid ? 'paid' : ''} ${i.isSub ? 'sub' : ''}" title="${attr(i.name + ' ' + fmt(i.amount))}">${esc(i.name)}</span>`).join('')}</div>`; }
  return `<div class="card mt" data-anchor="bills"><div class="card-head"><h3>${esc(D.monthLabel(month, true))}</h3><span class="tiny muted">Dashed = subscription · struck through = paid</span></div><div class="cal">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div></div>`;
}
function togglePaid(id, kind, checked) {
  const month = ui.month;
  const item = kind === 'sub' ? subAsRecurring(byId('subs', id)) : byId('bills', id);
  if (!item) return;
  commit(s => {
    if (checked) { markBillPaid(s, item, month); delete s.skipped['bill|' + id + '|' + month]; }
    else { s.billPaid[month] = s.billPaid[month] || {}; delete s.billPaid[month][id]; s.txns = s.txns.filter(t => !(t.billRef && t.billRef.id === id && t.billRef.month === month)); s.skipped['bill|' + id + '|' + month] = true; }
  });
}
