/* ============================================================
   VIEWS 2 — Income, Savings, Debt, Net Worth, Reports, Settings
   ============================================================ */
// ================= INCOME =================
function openIncomeForm(inc) {
  const isNew = !inc;
  openForm({
    title: isNew ? 'Add income source' : 'Edit income source',
    values: inc || { type: 'Salary', frequency: 'monthly', startDate: D.monthStart(ui.month), owner: 'p1', active: true },
    fields: [
      { key: 'source', label: 'Source', type: 'text', required: true, full: true, placeholder: 'e.g. Salary — Acme Ltd' },
      { key: 'type', label: 'Type', type: 'select', options: INCOME_TYPES }, ownerField(),
      { key: 'amount', label: 'Amount per payment (net)', type: 'number', required: true, min: 0 },
      ...frequencyFields(),
      { key: 'startDate', label: 'First payment date', type: 'date', required: true, hint: 'Payments repeat from this date (pay day = this day of the month for monthly items).' },
      { key: 'endDate', label: 'End date (optional)', type: 'date', advanced: true },
      { key: 'active', label: 'Active', type: 'checkbox', full: true, advanced: true },
    ],
    onSave: vals => {
      const rec = Object.assign({ id: inc ? inc.id : uid() }, vals, { amount: round2(num(vals.amount)), owner: vals.owner || 'p1' });
      commit(s => { if (inc) s.income[s.income.findIndex(b => b.id === inc.id)] = rec; else s.income.push(rec); });
      toast(isNew ? 'Income added' : 'Income updated', 'good');
    },
    onDelete: inc ? () => { commit(s => { s.income = s.income.filter(b => b.id !== inc.id); }); toast('Income deleted'); } : null,
  });
}
views.income = {
  title: 'Income',
  render() {
    const month = ui.month;
    const list = state.income.slice().sort((a, b) => monthlyEquivalent(b) - monthlyEquivalent(a));
    const expected = expectedIncome(month), recorded = sum(incomeTxnsInMonth(month), txnTotal);
    const annual = sum(list.filter(i => i.active !== false), annualAmount);
    const months12 = D.monthsBetween(D.addMonths(month, -5), D.addMonths(month, 6));
    return `
      <div class="grid grid-4">
        ${kpi('Expected ' + D.monthLabel(month), fmt0(expected), 'from income sources')}
        ${kpi('Recorded', fmt0(recorded), 'income transactions', recorded < expected && month <= D.thisMonth() ? 'warn' : '')}
        ${kpi('Monthly average', fmt0(annual / 12), 'annual ÷ 12')}
        ${kpi('Annual', fmt0(annual), `${list.filter(i => i.active !== false).length} active source${list.length === 1 ? '' : 's'}`)}
      </div>
      <div class="card mt"><div class="card-head"><h3>Income sources</h3><button class="btn primary" data-action="incomeAdd">+ Add income</button></div>
        ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Source</th>${isCouple() ? '<th>Owner</th>' : ''}<th class="right">Amount</th><th>Frequency</th><th>Next pay day</th><th class="right">${esc(D.monthLabel(month))}</th><th class="right">Monthly avg</th><th class="actions"></th></tr></thead>
          <tbody>${list.map(i => { const next = nextDue(i, month === D.thisMonth() ? D.today() : D.monthStart(month)); const im = expandRecurring(i, month, month)[0]; return `<tr class="${i.active === false ? 'row-muted' : ''}"><td><b>${esc(i.source)}</b>${i.active === false ? ' <span class="chip">inactive</span>' : ''}<div class="tiny muted">${esc(i.type || '')}</div></td>${isCouple() ? `<td>${ownerChip(i.owner)}</td>` : ''}<td class="right num">${fmt(i.amount)}</td><td class="small">${esc(freqLabel(i))}</td><td class="small nowrap">${next ? esc(D.dateLabel(next)) : '—'}</td><td class="right num">${im.occurrences ? fmt(im.amount) + (im.occurrences > 1 ? ` <span class="tiny muted">×${im.occurrences}</span>` : '') : '<span class="muted">—</span>'}</td><td class="right num muted">${fmt(monthlyEquivalent(i))}</td><td class="actions"><button class="btn sm ghost icon" data-action="incomeEdit" data-id="${i.id}">✎</button></td></tr>`; }).join('')}</tbody>
          <tfoot><tr><td>Total</td>${isCouple() ? '<td></td>' : ''}<td></td><td></td><td></td><td class="right num">${fmt(expected)}</td><td class="right num">${fmt(annual / 12)}</td><td></td></tr></tfoot></table></div>` : emptyBox('No income sources yet', 'Add salaries, freelance income, benefits — the forecast and safe-to-spend use these.', '<button class="btn primary" data-action="incomeAdd">+ Add income</button>')}
      </div>
      ${list.length ? `<div class="card mt"><div class="card-head"><h3>Expected income by month</h3><span class="tiny muted">Weekly and fortnightly pay produce 5- and 3-payday months — shown exactly, not averaged</span></div>
        ${svgBarChart({ groups: months12.map(m => ({ label: D.MONTHS[D.parse(m).m - 1] + (D.parse(m).m === 1 ? ' ' + String(D.parse(m).y).slice(2) : ''), values: isCouple() ? ['p1', 'p2', 'joint'].map(o => sum(list.filter(i => (i.owner || 'p1') === o), i => amountInMonth(i, m))) : [sum(list, i => amountInMonth(i, m))] })), seriesNames: isCouple() ? [S().person1Name, S().person2Name, 'Joint'] : ['Expected income'], colors: isCouple() ? [C.p1, C.p2, C.joint] : [C.good], stacked: true, height: 200 })}</div>` : ''}`;
  }
};

// ================= SAVINGS =================
function openGoalForm(goal) {
  const isNew = !goal;
  openForm({
    title: isNew ? 'Add savings goal' : 'Edit savings goal',
    values: goal || { owner: 'p1', priority: 'medium', current: 0, monthlyContribution: 0 },
    fields: [
      { key: 'name', label: 'Goal', type: 'text', required: true, full: true, placeholder: 'e.g. Emergency fund, Holiday, House deposit' },
      { key: 'target', label: 'Target amount', type: 'number', required: true, min: 0 },
      { key: 'current', label: 'Saved so far', type: 'number', min: 0 },
      { key: 'monthlyContribution', label: 'Monthly contribution', type: 'number', min: 0, hint: 'Used for the projected finish date and safe-to-spend.' },
      { key: 'targetDate', label: 'Target date (optional)', type: 'date' },
      ownerField(), { key: 'priority', label: 'Priority', type: 'select', options: [{ v: 'high', l: 'High' }, { v: 'medium', l: 'Medium' }, { v: 'low', l: 'Low' }], advanced: true },
    ],
    onSave: vals => {
      const rec = Object.assign({ id: goal ? goal.id : uid() }, vals, { target: round2(num(vals.target)), current: round2(num(vals.current)), monthlyContribution: round2(num(vals.monthlyContribution)), owner: vals.owner || 'p1' });
      commit(s => { if (goal) s.goals[s.goals.findIndex(g => g.id === goal.id)] = rec; else s.goals.push(rec); });
      if (rec.target > 0 && rec.current >= rec.target && !(goal && num(goal.current) >= num(goal.target))) celebrate(`🎉 "${rec.name}" is fully funded!`); else toast(isNew ? 'Goal added' : 'Goal updated', 'good');
    },
    onDelete: goal ? () => { commit(s => { s.goals = s.goals.filter(g => g.id !== goal.id); }); toast('Goal deleted'); } : null,
  });
}
function avgMonthlyExpenses(months) {
  const list = D.monthsBetween(D.addMonths(D.thisMonth(), -(months || 3)), D.addMonths(D.thisMonth(), -1)).map(m => sum(expenseTxnsInMonth(m), t => sum(t.splits.filter(sp => sp.category !== 'Savings'), sp => sp.amount))).filter(v => v > 0);
  if (list.length) return sum(list) / list.length;
  const bills = sum(billItems().filter(b => b.active !== false), monthlyEquivalent);
  return bills;
}
views.savings = {
  title: 'Savings',
  render() {
    const goals = state.goals.slice().sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] || 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] || 1) || a.name.localeCompare(b.name));
    const totalTarget = sum(goals, g => g.target), totalSaved = sum(goals, g => g.current), monthly = sum(goals.filter(g => num(g.current) < num(g.target)), g => g.monthlyContribution);
    const savingsAccts = state.accounts.filter(a => a.type === 'savings' || a.type === 'cash');
    const savingsBal = sum(savingsAccts, a => a.balance);
    const avgExp = avgMonthlyExpenses(3);
    const efMonths = S().emergencyMonths || 3;
    const efGoal = goals.find(g => /emergency/i.test(g.name));
    const efHave = efGoal ? num(efGoal.current) : savingsBal;
    const covered = avgExp > 0 ? efHave / avgExp : 0;
    const efTarget = avgExp * efMonths;
    return `
      <div class="grid grid-4">
        ${kpi('Saved toward goals', fmt0(totalSaved), `of ${fmt0(totalTarget)} target`)}
        ${kpi('Overall progress', fmtPct(totalTarget ? totalSaved / totalTarget * 100 : 0), `${goals.filter(g => num(g.current) >= num(g.target) && num(g.target) > 0).length} of ${goals.length} complete`)}
        ${kpi('Monthly contributions', fmt0(monthly), 'across active goals')}
        ${kpi('Emergency cover', `${covered.toFixed(1)} mo`, `target ${efMonths} months`, covered >= efMonths ? 'good' : covered >= 1 ? 'warn' : 'bad')}
      </div>
      <div class="grid grid-3 mt">
        <div style="grid-column:span 2">
          <div class="flex between mb"><h2>Goals</h2><button class="btn primary" data-action="goalAdd">+ Add goal</button></div>
          ${goals.length ? `<div class="grid grid-2">${goals.map(g => { const p = goalProjection(g, D.thisMonth()); const done = p.remaining === 0 && num(g.target) > 0; return `<div class="card">
            <div class="flex between"><div><h3>${esc(g.name)}</h3><div class="tiny muted mt-s">${ownerChip(g.owner)} <span class="chip ${g.priority === 'high' ? 'bad' : g.priority === 'low' ? '' : 'warn'}">${esc(g.priority || 'medium')} priority</span> ${done ? '<span class="chip good">complete</span>' : p.behind ? '<span class="chip warn">behind schedule</span>' : ''}</div></div><button class="btn sm ghost icon" data-action="goalEdit" data-id="${g.id}">✎</button></div>
            <div class="mt"><div class="flex between small"><b class="num">${fmt(g.current)}</b><span class="muted num">${fmt(g.target)}</span></div>${progressBar(p.pct, done ? '' : 'accent')}<div class="flex between tiny muted mt-s"><span>${fmtPct(p.pct)} complete</span><span>${fmt(p.remaining)} to go</span></div></div>
            <table class="small mt"><tbody>
              <tr><td class="muted">Monthly contribution</td><td class="right num">${fmt(g.monthlyContribution)}</td></tr>
              <tr><td class="muted">Projected completion</td><td class="right">${done ? 'Done' : p.projectedMonth ? D.monthLabel(p.projectedMonth) + ` <span class="tiny muted">(${p.monthsNeeded} mo)</span>` : '<span class="warn">No contribution set</span>'}</td></tr>
              ${g.targetDate ? `<tr><td class="muted">Target date</td><td class="right ${p.behind ? 'bad' : 'good'}">${esc(D.dateLabel(g.targetDate))}</td></tr>` : ''}
              ${p.behind && p.requiredMonthly ? `<tr><td class="muted">Needed per month to hit target</td><td class="right num bad">${fmt(p.requiredMonthly)}</td></tr>` : ''}
            </tbody></table>
            <div class="mt-s flex"><button class="btn sm" data-action="goalAddAmount" data-id="${g.id}">+ Add to savings</button></div></div>`; }).join('')}</div>` : emptyBox('No goals yet', 'Emergency fund, holiday, new car, house deposit — give every pound a purpose.', '<button class="btn primary" data-action="goalAdd">+ Add a goal</button>')}
        </div>
        <div>
          <div class="flex between mb"><h2>Emergency fund</h2></div>
          <div class="card">
            <div class="kpi" style="padding:0"><div class="k">Months of expenses covered</div><div class="v ${covered >= efMonths ? 'good' : covered >= 1 ? 'warn' : 'bad'}">${covered.toFixed(1)}</div></div>
            ${progressBar(efMonths ? covered / efMonths * 100 : 0, covered >= efMonths ? '' : 'warn')}
            <table class="small mt"><tbody>
              <tr><td class="muted">Average monthly expenses</td><td class="right num">${fmt(avgExp)}</td></tr>
              <tr><td class="muted">${efGoal ? `In "${esc(efGoal.name)}" goal` : `In savings & cash accounts`}</td><td class="right num">${fmt(efHave)}</td></tr>
              <tr><td class="muted">${efMonths}-month target</td><td class="right num">${fmt(efTarget)}</td></tr>
              <tr><td class="muted">Shortfall</td><td class="right num ${efTarget - efHave > 0 ? 'bad' : 'good'}">${fmt(Math.max(0, efTarget - efHave))}</td></tr>
            </tbody></table>
            <div class="tiny muted mt">Average uses the last 3 months of recorded expenses, excluding the Savings category (or your recurring bills if there are none). ${efGoal ? '' : 'Name a goal "Emergency fund" to track it there instead.'} Change the target months in Settings.</div>
          </div>
          ${savingsAccts.length ? `<div class="card mt"><div class="card-head"><h3>Savings accounts</h3></div><table class="small"><tbody>${savingsAccts.map(a => `<tr><td>${esc(a.name)} ${ownerChip(a.owner)}</td><td class="right num">${fmt(a.balance)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="right num">${fmt(savingsBal)}</td></tr></tfoot></table></div>` : ''}
        </div>
      </div>`;
  }
};

// ================= DEBT =================
function openDebtForm(debt) {
  const isNew = !debt;
  openForm({
    title: isNew ? 'Add debt' : 'Edit debt',
    values: debt || { owner: 'p1', debtType: 'Credit card', extraPayment: 0, startDate: D.today() },
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, full: true, placeholder: 'e.g. Visa card, Car loan' },
      { key: 'debtType', label: 'Type', type: 'select', options: DEBT_TYPES }, ownerField(),
      { key: 'currentBalance', label: 'Current balance', type: 'number', required: true, min: 0 },
      { key: 'originalBalance', label: 'Original balance', type: 'number', min: 0, hint: 'For the progress bar.', advanced: true },
      { key: 'apr', label: 'APR %', type: 'number', required: true, min: 0, max: 200, hint: 'Interest is charged monthly at APR ÷ 12.' },
      { key: 'minPayment', label: 'Minimum monthly payment', type: 'number', required: true, min: 0 },
      { key: 'extraPayment', label: 'Committed extra per month', type: 'number', min: 0, hint: 'Always paid on this debt, on top of the strategy pool.', advanced: true },
      { key: 'startDate', label: 'Start date', type: 'date', advanced: true },
    ],
    onSave: vals => {
      const rec = Object.assign({ id: debt ? debt.id : uid() }, vals, { currentBalance: round2(num(vals.currentBalance)), originalBalance: round2(num(vals.originalBalance) || num(vals.currentBalance)), apr: num(vals.apr), minPayment: round2(num(vals.minPayment)), extraPayment: round2(num(vals.extraPayment)), owner: vals.owner || 'p1' });
      commit(s => { if (debt) s.debts[s.debts.findIndex(d => d.id === debt.id)] = rec; else s.debts.push(rec); });
      toast(isNew ? 'Debt added' : 'Debt updated', 'good');
    },
    onDelete: debt ? () => { commit(s => { s.debts = s.debts.filter(d => d.id !== debt.id); }); toast('Debt deleted'); } : null,
  });
}
views.debt = {
  title: 'Debt',
  render() {
    const debts = state.debts.slice();
    const startMonth = D.thisMonth();
    const extra = num(S().debtExtraPool);
    const sn = simulateDebt(debts, 'snowball', extra, startMonth), av = simulateDebt(debts, 'avalanche', extra, startMonth);
    const cur = ui.debtStrategy === 'avalanche' ? av : sn, other = cur === sn ? av : sn;
    const total = sum(debts, d => d.currentBalance), mins = sum(debts, d => d.minPayment), extras = sum(debts, d => d.extraPayment);
    const interestSaved = round2(other.totalInterest - cur.totalInterest), monthsSaved = other.monthsToDebtFree !== null && cur.monthsToDebtFree !== null ? other.monthsToDebtFree - cur.monthsToDebtFree : null;
    const horizon = Math.max(sn.schedule.length, av.schedule.length);
    const step = horizon > 120 ? Math.ceil(horizon / 120) : 1;
    const idxs = []; for (let i = 0; i < horizon; i += step) idxs.push(i); if (idxs[idxs.length - 1] !== horizon - 1) idxs.push(horizon - 1);
    const labels = idxs.map(i => { const m = D.addMonths(startMonth, i); return D.parse(m).m === 1 || i === 0 ? D.monthLabel(m) : D.MONTHS[D.parse(m).m - 1]; });
    const pts = (sim) => idxs.map(i => i === 0 ? total : sim.schedule[i - 1] ? sim.schedule[i - 1].totalBalance : (sim.schedule.length ? 0 : total));
    const chart = debts.length ? svgLineChart({ labels: [ 'Now', ...labels.slice(1) ], series: [{ name: 'Snowball', color: C.accent, points: pts(sn), width: ui.debtStrategy === 'snowball' ? 2.6 : 1.6, dash: ui.debtStrategy === 'snowball' ? '' : '5 4' }, { name: 'Avalanche', color: C.ink, points: pts(av), width: ui.debtStrategy === 'avalanche' ? 2.6 : 1.6, dash: ui.debtStrategy === 'avalanche' ? '' : '5 4' }], height: 230, dots: horizon <= 60, maxLabels: 10 }) : '';
    const order = debts.filter(d => cur.payoffByDebt[d.id]).sort((a, b) => cur.payoffByDebt[a.id] < cur.payoffByDebt[b.id] ? -1 : 1);
    const cmpRow = (label, a, b, fmtFn, lowerBetter) => `<tr><td class="muted">${label}</td><td class="right num">${fmtFn(a)}</td><td class="right num">${fmtFn(b)}</td></tr>`;
    const monthsFmt = n => n === null ? '<span class="bad">never</span>' : `${n} mo`;
    return `
      <div class="grid grid-5">
        ${kpi('Total debt', fmt0(total), `${debts.length} debt${debts.length === 1 ? '' : 's'}`)}
        ${kpi('Blended APR', fmtPct(blendedApr(debts), 1), 'balance-weighted')}
        ${kpi('Monthly minimums', fmt0(mins), extras ? `+ ${fmt0(extras)} committed extra` : '')}
        ${kpi('Debt-free', cur.neverPaysOff ? 'Never' : cur.debtFreeMonth ? D.monthLabel(cur.debtFreeMonth) : '—', cur.monthsToDebtFree !== null ? `${cur.monthsToDebtFree} months · ${esc(ui.debtStrategy)}` : debts.length ? 'Payments do not cover interest' : '', cur.neverPaysOff ? 'bad' : 'good')}
        ${kpi('Total interest', fmt0(cur.totalInterest), cur.neverPaysOff ? 'over 50 years, still growing' : 'until debt-free', cur.neverPaysOff ? 'bad' : '')}
      </div>
      <div class="flex between flex-wrap mt">
        <div class="flex flex-wrap">
          <div class="seg"><button class="${ui.debtStrategy === 'snowball' ? 'active' : ''}" data-action="debtStrategy" data-s="snowball">Snowball</button><button class="${ui.debtStrategy === 'avalanche' ? 'active' : ''}" data-action="debtStrategy" data-s="avalanche">Avalanche</button></div>
          <label class="small flex" style="gap:6px">Extra per month <input type="number" class="inline-input" style="width:100px;border-color:var(--line2);background:#fff" step="1" min="0" value="${extra || ''}" placeholder="0" data-change="debtExtra"></label>
        </div>
        <button class="btn primary" data-action="debtAdd">+ Add debt</button>
      </div>
      ${debts.length ? `
      <div class="grid grid-3 mt">
        <div class="card" style="grid-column:span 2"><div class="card-head"><h3>Paydown curve</h3><span class="tiny muted">Total balance by month, both strategies</span></div>${chart}
          ${cur.neverPaysOff ? `<div class="callout bad mt small"><b>These payments never clear the debt.</b> Interest each month is more than the minimum payments on at least one debt. Increase the extra payment or the minimums to see a payoff date.</div>` : ''}</div>
        <div class="card"><div class="card-head"><h3>Strategy comparison</h3></div>
          <table class="small"><thead><tr><th></th><th class="right">Snowball</th><th class="right">Avalanche</th></tr></thead><tbody>
            ${cmpRow('Debt-free in', sn.monthsToDebtFree, av.monthsToDebtFree, monthsFmt)}
            ${cmpRow('Total interest', sn.totalInterest, av.totalInterest, fmt)}
            ${cmpRow('Total paid', sn.totalPaid, av.totalPaid, fmt)}
          </tbody></table>
          <div class="callout mt small">${interestSaved > 0 ? `<b>${esc(ui.debtStrategy)}</b> saves <b>${fmt(interestSaved)}</b> in interest${monthsSaved ? ` and ${monthsSaved} month${monthsSaved === 1 ? '' : 's'}` : ''} versus ${esc(ui.debtStrategy === 'snowball' ? 'avalanche' : 'snowball')}.` : interestSaved < 0 ? `<b>${esc(ui.debtStrategy === 'snowball' ? 'Avalanche' : 'Snowball')}</b> would save <b>${fmt(-interestSaved)}</b> in interest${monthsSaved ? ` and ${-monthsSaved} month${-monthsSaved === 1 ? '' : 's'}` : ''}. Snowball's advantage is motivation: small wins first.` : 'Both strategies cost the same here.'}</div>
          <div class="tiny muted mt"><b>Snowball</b>: smallest balance first. <b>Avalanche</b>: highest APR first. Both pay every minimum, then send the extra pool to the target; when a debt clears, its payment rolls into the pool.</div>
        </div>
      </div>
      <div class="section-title"><h2>Your debts</h2><span class="tiny muted">Payoff order (${esc(ui.debtStrategy)}): ${order.map((d, i) => `${i + 1}. ${esc(d.name)}`).join(' → ') || '—'}</span></div>
      <div class="grid grid-3">${debts.sort((a, b) => (cur.payoffByDebt[a.id] || '9999') < (cur.payoffByDebt[b.id] || '9999') ? -1 : 1).map(d => { const orig = Math.max(num(d.originalBalance), num(d.currentBalance)); const paid = orig - num(d.currentBalance); const payoff = cur.payoffByDebt[d.id]; const firstMonth = cur.schedule[0] && cur.schedule[0].perDebt[d.id]; const interestOnDebt = round2(sum(cur.schedule, s => s.perDebt[d.id] ? s.perDebt[d.id].interest : 0)); return `<div class="card">
        <div class="flex between"><div><h3>${esc(d.name)}</h3><div class="tiny muted mt-s">${esc(d.debtType || '')} ${ownerChip(d.owner)}</div></div><button class="btn sm ghost icon" data-action="debtEdit" data-id="${d.id}">✎</button></div>
        <div class="kpi mt" style="padding:0"><div class="v">${fmt(d.currentBalance)}</div><div class="s">${fmtPct(d.apr, 2)} APR · min ${fmt(d.minPayment)}${num(d.extraPayment) ? ` + ${fmt(d.extraPayment)} extra` : ''}</div></div>
        <div class="mt-s">${progressBar(orig ? paid / orig * 100 : 0, 'ink thin')}<div class="flex between tiny muted mt-s"><span>${fmtPct(orig ? paid / orig * 100 : 0)} paid off</span><span>of ${fmt(orig)}</span></div></div>
        <table class="small mt"><tbody>
          <tr><td class="muted">Paid off</td><td class="right">${payoff ? D.monthLabel(payoff) : '<span class="bad">never</span>'}</td></tr>
          <tr><td class="muted">This month's payment</td><td class="right num">${firstMonth ? fmt(firstMonth.payment) : '—'}</td></tr>
          <tr><td class="muted">Interest this month</td><td class="right num">${firstMonth ? fmt(firstMonth.interest) : '—'}</td></tr>
          <tr><td class="muted">Interest until paid</td><td class="right num">${fmt(interestOnDebt)}</td></tr>
        </tbody></table>
        <div class="mt-s"><button class="btn sm" data-action="debtPayment" data-id="${d.id}">Record a payment</button></div></div>`; }).join('')}</div>
      <div class="card mt"><div class="card-head"><h3>Schedule (${esc(ui.debtStrategy)})</h3><button class="btn sm" data-action="debtScheduleCsv">Export schedule CSV</button></div>
        <div class="table-wrap" style="max-height:360px;overflow:auto"><table class="small"><thead><tr><th>Month</th>${debts.map(d => `<th class="right">${esc(d.name)}</th>`).join('')}<th class="right">Payment</th><th class="right">Interest</th><th class="right">Balance</th></tr></thead>
        <tbody>${cur.schedule.slice(0, 120).map(s => `<tr><td class="nowrap">${esc(D.monthLabel(s.month))}</td>${debts.map(d => `<td class="right num ${s.perDebt[d.id] ? '' : 'muted'}">${s.perDebt[d.id] ? fmt(s.perDebt[d.id].balance) : '—'}</td>`).join('')}<td class="right num">${fmt(s.totalPayment)}</td><td class="right num muted">${fmt(sum(Object.values(s.perDebt), p => p.interest))}</td><td class="right num"><b>${fmt(s.totalBalance)}</b></td></tr>`).join('')}${cur.schedule.length > 120 ? `<tr><td colspan="${debts.length + 4}" class="muted center">… ${cur.schedule.length - 120} more months (export for the full schedule)</td></tr>` : ''}</tbody></table></div></div>`
      : emptyBox('No debts tracked', 'Add credit cards, loans and anything else with an interest rate to plan a payoff.', '<button class="btn primary" data-action="debtAdd">+ Add a debt</button>')}`;
  }
};

// ================= NET WORTH =================
function openAccountForm(acct) {
  const isNew = !acct;
  openForm({
    title: isNew ? 'Add account' : 'Edit account',
    values: acct || { type: 'checking', owner: 'p1', balance: 0 },
    fields: [
      { key: 'name', label: 'Account name', type: 'text', required: true, full: true, placeholder: 'e.g. Main checking, ISA, Car' },
      { key: 'type', label: 'Type', type: 'select', options: ACCOUNT_TYPES.map(t => ({ v: t.v, l: t.l })), required: true }, ownerField(),
      { key: 'balance', label: 'Current balance', type: 'number', required: true, hint: 'For liabilities, enter the amount owed as a positive number.' },
      { key: 'notes', label: 'Notes', type: 'text', full: true, advanced: true },
    ],
    onSave: vals => {
      const rec = Object.assign({ id: acct ? acct.id : uid() }, vals, { balance: round2(Math.abs(num(vals.balance))), isLiability: !!accountType(vals.type).liability, owner: vals.owner || 'p1', updatedAt: D.today() });
      commit(s => { if (acct) s.accounts[s.accounts.findIndex(a => a.id === acct.id)] = rec; else s.accounts.push(rec); });
      toast(isNew ? 'Account added' : 'Account updated', 'good');
    },
    onDelete: acct ? () => { commit(s => { s.accounts = s.accounts.filter(a => a.id !== acct.id); }); toast('Account deleted'); } : null,
  });
}
views.networth = {
  title: 'Net Worth',
  render() {
    const nw = netWorth();
    const assets = state.accounts.filter(a => !a.isLiability).sort((a, b) => b.balance - a.balance), liabs = state.accounts.filter(a => a.isLiability).sort((a, b) => b.balance - a.balance);
    const snaps = state.snapshots.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const first = snaps[0], prev = snaps.length > 1 ? snaps[snaps.length - 2] : null, last = snaps[snaps.length - 1];
    const table = (list, title, addLabel) => `<div class="card"><div class="card-head"><h3>${title}</h3><button class="btn sm" data-action="accountAdd">${addLabel}</button></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Account</th><th>Type</th>${isCouple() ? '<th>Owner</th>' : ''}<th class="right">Balance</th><th class="actions"></th></tr></thead><tbody>${list.map(a => `<tr><td><b>${esc(a.name)}</b>${a.notes ? `<div class="tiny muted">${esc(a.notes)}</div>` : ''}</td><td class="small muted">${esc(accountType(a.type).l)}</td>${isCouple() ? `<td>${ownerChip(a.owner)}</td>` : ''}<td class="right"><input class="inline-input" type="number" step="0.01" inputmode="decimal" value="${a.balance}" data-change="accountBalance" data-id="${a.id}" title="Edit balance inline"></td><td class="actions"><button class="btn sm ghost icon" data-action="accountEdit" data-id="${a.id}">✎</button></td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td></td>${isCouple() ? '<td></td>' : ''}<td class="right num">${fmt(sum(list, a => a.balance))}</td><td></td></tr></tfoot></table></div>` : `<div class="muted small">None yet.</div>`}</div>`;
    return `
      <div class="grid grid-4">
        ${kpi('Net worth', fmt0(nw.net), last && prev ? `<span class="${signCls(last.net - prev.net)}">${fmt0(last.net - prev.net, { sign: true })}</span> since ${esc(D.monthLabel(D.monthOf(prev.date)))}` : 'Assets − liabilities − debts', signCls(nw.net))}
        ${kpi('Assets', fmt0(nw.assets), `${assets.length} account${assets.length === 1 ? '' : 's'}`)}
        ${kpi('Liabilities', fmt0(nw.liabilities + nw.debts), `${fmt0(nw.liabilities)} accounts · ${fmt0(nw.debts)} from Debt view`)}
        ${kpi('Since first snapshot', first && last && first !== last ? fmt0(last.net - first.net, { sign: true }) : '—', first ? `since ${esc(D.dateLabel(first.date))}` : 'No snapshots yet', first && last ? signCls(last.net - first.net) : '')}
      </div>
      ${isCouple() ? `<div class="card mt flat"><div class="flex flex-wrap" style="gap:24px">${['p1', 'p2', 'joint'].map(o => { const a = sum(state.accounts.filter(x => !x.isLiability && (x.owner || 'p1') === o), x => x.balance), l = sum(state.accounts.filter(x => x.isLiability && (x.owner || 'p1') === o), x => x.balance) + sum(state.debts.filter(x => (x.owner || 'p1') === o), x => x.currentBalance); return `<div class="small">${ownerChip(o)} <b class="num ${signCls(a - l)}">${fmt0(a - l)}</b> <span class="muted">(${fmt0(a)} − ${fmt0(l)})</span></div>`; }).join('')}</div></div>` : ''}
      <div class="card mt"><div class="card-head"><h3>Net worth over time</h3><div class="flex"><span class="tiny muted">A snapshot is stored automatically each month you make changes</span><button class="btn sm" data-action="snapshotNow">Snapshot now</button></div></div>
        ${snaps.length >= 2 ? svgLineChart({ labels: snaps.map(s => D.monthLabel(D.monthOf(s.date))), series: [{ name: 'Net worth', color: C.ink, points: snaps.map(s => s.net), area: true }, { name: 'Assets', color: C.good, points: snaps.map(s => s.assets), dash: '4 4', width: 1.5 }, { name: 'Liabilities', color: C.accent, points: snaps.map(s => s.liabilities), dash: '4 4', width: 1.5 }], height: 220, maxLabels: 8 }) : `<div class="muted small">The chart appears once there are two or more monthly snapshots. ${snaps.length === 1 ? 'First snapshot recorded ' + esc(D.dateLabel(snaps[0].date)) + '.' : ''}</div>`}
      </div>
      <div class="grid grid-2 mt">${table(assets, 'Assets', '+ Add')}${table(liabs, 'Liabilities', '+ Add')}</div>
      ${state.debts.length ? `<div class="callout mt small">Debts from the <a href="#" data-action="goto" data-view="debt">Debt view</a> (${fmt(nw.debts)}) are included in liabilities automatically — don't add them here as well.</div>` : ''}
      ${snaps.length ? `<div class="card mt"><div class="card-head"><h3>Snapshots</h3></div><div class="table-wrap"><table class="small"><thead><tr><th>Date</th><th class="right">Assets</th><th class="right">Liabilities</th><th class="right">Net worth</th><th class="right">Change</th><th class="actions"></th></tr></thead><tbody>${snaps.slice().reverse().map((s, i, arr) => { const p = arr[i + 1]; return `<tr><td>${esc(D.dateLabel(s.date))}</td><td class="right num">${fmt(s.assets)}</td><td class="right num">${fmt(s.liabilities)}</td><td class="right num"><b>${fmt(s.net)}</b></td><td class="right num ${p ? signCls(s.net - p.net) : ''}">${p ? fmt(s.net - p.net, { sign: true }) : '—'}</td><td class="actions"><button class="btn sm ghost icon" data-action="snapshotDelete" data-date="${s.date}" title="Delete">×</button></td></tr>`; }).join('')}</tbody></table></div></div>` : ''}`;
  }
};

// ================= REPORTS =================
views.reports = {
  title: 'Reports',
  render() {
    const year = ui.reportYear;
    const years = [...new Set(monthsWithData().map(m => m.slice(0, 4)))].sort();
    if (!years.includes(year)) years.push(year);
    const months = D.monthsBetween(year + '-01', year + '-12');
    const sums = months.map(monthSummary);
    const withData = sums.filter(s => s.income || s.expenses);
    const totInc = sum(sums, s => s.income), totExp = sum(sums, s => s.expenses), totNet = totInc - totExp;
    const best = withData.length ? withData.reduce((a, b) => b.net > a.net ? b : a) : null, worst = withData.length ? withData.reduce((a, b) => b.net < a.net ? b : a) : null;
    const highSpend = withData.length ? withData.reduce((a, b) => b.expenses > a.expenses ? b : a) : null;
    const cats = {}; const catByOwner = {};
    for (const m of months) for (const t of expenseTxnsInMonth(m)) for (const s of t.splits) { cats[s.category] = round2((cats[s.category] || 0) + num(s.amount)); const o = t.owner || 'p1'; catByOwner[o] = catByOwner[o] || {}; catByOwner[o][s.category] = round2((catByOwner[o][s.category] || 0) + num(s.amount)); }
    const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const incByType = {}; for (const m of months) for (const t of incomeTxnsInMonth(m)) for (const s of t.splits) incByType[s.category] = round2((incByType[s.category] || 0) + num(s.amount));
    const selMonth = ui.month.startsWith(year) ? ui.month : null;
    const ms = selMonth ? monthSummary(selMonth) : null; const mcats = selMonth ? Object.entries(categoryActuals(selMonth)).sort((a, b) => b[1] - a[1]) : [];
    const mBudget = selMonth ? state.budgets.filter(b => b.month === selMonth) : [];
    return `
      <div class="flex between flex-wrap mb no-print">
        <div class="flex"><label class="small">Year</label><select data-change="reportYear" style="width:auto">${years.map(y => `<option value="${y}"${y === year ? ' selected' : ''}>${y}</option>`).join('')}</select><span class="tiny muted">Monthly report follows the month picker above.</span></div>
        <div class="flex"><button class="btn" data-action="exportYearCsv">Export ${year} CSV</button><button class="btn primary" data-action="print">Print / Save PDF</button></div>
      </div>
      <div class="print-only mb"><h1>Finance report · ${year}</h1><div class="small muted">${esc(isCouple() ? S().person1Name + ' & ' + S().person2Name : S().person1Name)} · generated ${esc(D.dateLabel(D.today()))} · amounts in ${esc(S().currency.code)}</div></div>
      <div class="section-title"><h2>Annual summary ${year}</h2></div>
      <div class="grid grid-4">
        ${kpi('Income', fmt0(totInc), `${withData.length} month${withData.length === 1 ? '' : 's'} with data`)}
        ${kpi('Expenses', fmt0(totExp), totInc ? `${fmtPct(totExp / totInc * 100)} of income` : '')}
        ${kpi('Net saved', fmt0(totNet), totInc ? `${fmtPct((totNet + sum(sums, s => s.saved)) / totInc * 100)} savings rate incl. ${fmt0(sum(sums, s => s.saved))} to savings` : '', signCls(totNet))}
        ${kpi('Average month', fmt0(withData.length ? totExp / withData.length : 0), 'expenses')}
      </div>
      <div class="grid grid-3 mt">
        <div class="card" style="grid-column:span 2"><div class="card-head"><h3>Month by month</h3></div>${svgBarChart({ groups: sums.map(s => ({ label: D.MONTHS[D.parse(s.month).m - 1], values: [s.income, s.expenses] })), seriesNames: ['Income', 'Expenses'], colors: [C.good, C.accent], height: 200 })}</div>
        <div class="card"><div class="card-head"><h3>Highlights</h3></div>
          ${best ? `<table class="small"><tbody>
            <tr><td class="muted">Best month</td><td class="right"><b>${esc(D.monthLabel(best.month))}</b><div class="tiny good">${fmt(best.net, { sign: true })} net</div></td></tr>
            <tr><td class="muted">Toughest month</td><td class="right"><b>${esc(D.monthLabel(worst.month))}</b><div class="tiny ${signCls(worst.net)}">${fmt(worst.net, { sign: true })} net</div></td></tr>
            <tr><td class="muted">Highest spending</td><td class="right"><b>${esc(D.monthLabel(highSpend.month))}</b><div class="tiny">${fmt(highSpend.expenses)}</div></td></tr>
            <tr><td class="muted">Top category</td><td class="right"><b>${catRows[0] ? esc(catRows[0][0]) : '—'}</b><div class="tiny">${catRows[0] ? fmt(catRows[0][1]) : ''}</div></td></tr>
            <tr><td class="muted">Months in surplus</td><td class="right"><b>${withData.filter(s => s.net > 0).length} of ${withData.length}</b></td></tr>
          </tbody></table>` : '<div class="muted small">No transactions recorded in this year.</div>'}
        </div>
      </div>
      <div class="card mt"><div class="card-head"><h3>Monthly summary</h3></div><div class="table-wrap"><table class="small"><thead><tr><th>Month</th><th class="right">Income</th><th class="right">Expenses</th><th class="right">Net</th><th class="right">Savings rate</th><th class="right">Expected income</th><th class="right">Bills due</th></tr></thead>
        <tbody>${sums.map(s => `<tr class="${!s.income && !s.expenses ? 'row-muted' : ''}"><td>${esc(D.monthLabel(s.month))}</td><td class="right num">${fmt(s.income)}</td><td class="right num">${fmt(s.expenses)}</td><td class="right num ${signCls(s.net)}">${fmt(s.net, { sign: true })}</td><td class="right num">${fmtPct(s.savingsRate)}</td><td class="right num muted">${fmt(s.expectedIncome)}</td><td class="right num muted">${fmt(s.expectedBills)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="right num">${fmt(totInc)}</td><td class="right num">${fmt(totExp)}</td><td class="right num ${signCls(totNet)}">${fmt(totNet, { sign: true })}</td><td class="right num">${totInc ? fmtPct(totNet / totInc * 100) : '—'}</td><td class="right num muted">${fmt(sum(sums, s => s.expectedIncome))}</td><td class="right num muted">${fmt(sum(sums, s => s.expectedBills))}</td></tr></tfoot></table></div></div>
      <div class="grid grid-2 mt">
        <div class="card"><div class="card-head"><h3>Spending by category · ${year}</h3></div>${catRows.length ? `<div class="table-wrap"><table class="small"><thead><tr><th>Category</th><th class="right">Total</th><th class="right">Per month</th><th class="right">Share</th>${isCouple() ? `<th class="right">${esc(S().person1Name)}</th><th class="right">${esc(S().person2Name)}</th><th class="right">Joint</th>` : ''}</tr></thead><tbody>${catRows.map(([c, v]) => `<tr><td>${esc(c)}</td><td class="right num">${fmt(v)}</td><td class="right num muted">${fmt(v / Math.max(1, withData.length))}</td><td class="right num">${fmtPct(totExp ? v / totExp * 100 : 0)}</td>${isCouple() ? ['p1', 'p2', 'joint'].map(o => `<td class="right num muted">${fmt((catByOwner[o] || {})[c] || 0)}</td>`).join('') : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="muted small">No spending recorded.</div>'}</div>
        <div class="card"><div class="card-head"><h3>Where it went</h3></div>${svgDonut({ slices: catRows.slice(0, 9).map(([label, value], i) => ({ label, value, color: PALETTE[(i + 1) % PALETTE.length] })).concat(catRows.length > 9 ? [{ label: 'Everything else', value: sum(catRows.slice(9), r => r[1]), color: C.rest }] : []), centre: fmt0(totExp), centreLabel: year })}
          ${Object.keys(incByType).length ? `<div class="mt"><div class="tiny muted mb-s">INCOME BY TYPE</div><table class="small"><tbody>${Object.entries(incByType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="right num">${fmt(v)}</td><td class="right num muted">${fmtPct(totInc ? v / totInc * 100 : 0)}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>
      </div>
      ${ms ? `<div class="page-break"></div><div class="section-title"><h2>Monthly report · ${esc(D.monthLabel(selMonth, true))}</h2></div>
      <div class="grid grid-4">${kpi('Income', fmt0(ms.income))}${kpi('Expenses', fmt0(ms.expenses))}${kpi('Net', fmt0(ms.net), '', signCls(ms.net))}${kpi('Savings rate', fmtPct(ms.savingsRate))}</div>
      <div class="grid grid-2 mt">
        <div class="card"><div class="card-head"><h3>Categories</h3></div>${mcats.length ? `<table class="small"><thead><tr><th>Category</th><th class="right">Spent</th><th class="right">Budget</th><th class="right">Diff</th></tr></thead><tbody>${mcats.map(([c, v]) => { const b = mBudget.find(x => x.category === c); return `<tr><td>${esc(c)}</td><td class="right num">${fmt(v)}</td><td class="right num muted">${b ? fmt(b.planned) : '—'}</td><td class="right num ${b ? signCls(num(b.planned) - v) : ''}">${b ? fmt(num(b.planned) - v, { sign: true }) : ''}</td></tr>`; }).join('')}</tbody></table>` : '<div class="muted small">No spending this month.</div>'}</div>
        <div class="card"><div class="card-head"><h3>Transactions</h3></div><div class="table-wrap" style="max-height:420px;overflow:auto"><table class="small"><tbody>${state.txns.filter(t => t.month === selMonth).sort((a, b) => a.date < b.date ? -1 : 1).map(t => `<tr><td class="nowrap">${esc(D.dateLabel(t.date).slice(0, 6))}</td><td>${esc(t.description)}<div class="tiny muted">${esc(t.splits.map(s => s.category).join(', '))}</div></td><td class="right num ${t.type === 'income' ? 'good' : ''}">${t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''}${fmt(txnTotal(t))}</td></tr>`).join('') || '<tr><td class="muted">None</td></tr>'}</tbody></table></div></div>
      </div>` : ''}`;
  }
};

// ================= SETTINGS =================
views.settings = {
  title: 'Settings',
  render() {
    const s = S(); const c = s.currency;
    const bf = backupFile;
    const sessions = +(storage.get(LS_SESS) || 0);
    const backupHtml = bf.supported ? `
      <div class="flex between flex-wrap"><div><b>${esc(bf.statusText())}</b>${bf.fileName ? ` · <span class="mono small">${esc(bf.fileName)}</span>` : ''}
        <div class="tiny muted">${bf.status === 'linked' ? `Writes 2 seconds after every change. Last write ${bf.lastWrite ? esc(bf.lastWrite.toLocaleTimeString()) : '—'} · last verified ${bf.lastVerified ? esc(bf.lastVerified.toLocaleTimeString()) : 'not yet'} · ${bf.writeCount} writes` : bf.status === 'needs-permission' ? 'The browser needs you to re-allow access to the file after a restart.' : bf.status === 'error' ? esc(bf.lastError) : 'Optional. Choose a file (for example inside a Drive, Dropbox or OneDrive folder) and every change is written there automatically.'}</div></div>
        <div class="flex">${bf.status === 'needs-permission' ? `<button class="btn primary" data-action="backupPermission">Allow access</button>` : ''}${bf.status === 'off' || bf.status === 'error' ? `<button class="btn primary" data-action="backupLink">${bf.status === 'error' ? 'Re-link file' : 'Choose backup file…'}</button>` : ''}${bf.handle ? `<button class="btn" data-action="backupWriteNow">Write now</button><button class="btn" data-action="backupUnlink">Turn off</button>` : ''}</div></div>
      <div class="callout mt small">The planner writes only to a file you choose on your own computer. If that folder happens to sync, your backup travels with it. Nothing is ever sent to us.</div>
      <div class="mt-s"><button class="btn sm ghost" data-action="restoreLkg">Restore last verified copy…</button> <span class="tiny muted">A separate verified copy is kept inside the browser in case the file on disk is damaged.</span></div>`
      : `<div><b>Manual backup only in this browser.</b><div class="tiny muted mt-s">Automatic file backup needs Chrome or Edge. Here, export a JSON backup regularly — you'll get a reminder every ${REMIND_EVERY_SESSIONS} sessions (${sessions} so far).</div></div>`;
    return `
      <div class="grid grid-2">
        <div class="card"><div class="card-head"><h3>Household</h3></div>
          <div class="field"><label>Mode</label><div class="seg"><button class="${!isCouple() ? 'active' : ''}" data-action="setMode" data-mode="single">Just me</button><button class="${isCouple() ? 'active' : ''}" data-action="setMode" data-mode="couple">Couple</button></div><div class="hint">Couple mode adds an owner to every income, bill, debt, goal and transaction, with per-person breakdowns. Switching back hides the owner — nothing is deleted.</div></div>
          <div class="form-grid"><div class="field"><label>${isCouple() ? 'Person 1' : 'Your name'}</label><input type="text" value="${attr(s.person1Name)}" data-change="setting" data-key="person1Name" maxlength="24"></div>${isCouple() ? `<div class="field"><label>Person 2</label><input type="text" value="${attr(s.person2Name)}" data-change="setting" data-key="person2Name" maxlength="24"></div>` : ''}</div>
        </div>
        <div class="card"><div class="card-head"><h3>Currency</h3><span class="chip">display only</span></div>
          <div class="form-grid"><div class="field"><label>Currency</label><select data-change="currency">${CURRENCIES.map(x => `<option value="${x.code}"${x.code === c.code ? ' selected' : ''}>${x.code === 'CUSTOM' ? 'Custom symbol…' : `${x.code} · ${esc(x.name)}`}</option>`).join('')}</select></div>
          ${c.code === 'CUSTOM' ? `<div class="field"><label>Symbol</label><input type="text" value="${attr(c.symbol)}" data-change="currencySymbol" maxlength="5"></div>` : `<div class="field"><label>Preview</label><div style="padding:8px 0" class="num">${fmt(1234.56)} · ${fmt(-89.5)}</div></div>`}</div>
          <div class="hint">Changes the symbol and number format only. Amounts are never converted between currencies.</div>
        </div>
        <div class="card"><div class="card-head"><h3>Planning</h3></div>
          <div class="form-grid">
            <div class="field"><label>Tracking starts</label><input type="month" value="${attr(s.startMonth)}" placeholder="YYYY-MM" data-change="setting" data-key="startMonth"><div class="hint">Budget rollover chains don't reach before this month.</div></div>
            <div class="field"><label>Safety buffer</label><input type="number" step="1" min="0" value="${s.safetyBuffer}" data-change="setting" data-key="safetyBuffer" data-num="1"><div class="hint">Subtracted from safe-to-spend.</div></div>
            <div class="field"><label>Budget rollover</label><select data-change="setting" data-key="budgetRollover"><option value="off"${s.budgetRollover === 'off' ? ' selected' : ''}>Off — each month stands alone</option><option value="surplus"${s.budgetRollover === 'surplus' ? ' selected' : ''}>Surplus only — unspent money carries forward</option><option value="full"${s.budgetRollover === 'full' ? ' selected' : ''}>Full — overspend reduces next month too</option></select></div>
            <div class="field"><label>Emergency fund target</label><select data-change="setting" data-key="emergencyMonths" data-num="1">${[1, 2, 3, 4, 6, 9, 12].map(n => `<option value="${n}"${s.emergencyMonths === n ? ' selected' : ''}>${n} month${n > 1 ? 's' : ''} of expenses</option>`).join('')}</select></div>
            <div class="field full"><label class="check"><input type="checkbox" data-change="setting" data-key="includeSubsInBills" ${s.includeSubsInBills ? 'checked' : ''}> Count subscriptions in bill totals, the calendar and safe-to-spend</label></div>
            <div class="field full"><label>Spendable account types (used for safe-to-spend)</label><div class="flex flex-wrap">${ACCOUNT_TYPES.filter(t => !t.liability).map(t => `<label class="check small"><input type="checkbox" data-change="spendable" data-type="${t.v}" ${(s.spendableTypes || []).includes(t.v) ? 'checked' : ''}> ${esc(t.l)}</label>`).join('')}</div></div>
          </div>
        </div>
        <div class="card"><div class="card-head"><h3>Categories</h3><button class="btn sm" data-action="catAdd">+ Add</button></div>
          <div class="flex flex-wrap">${s.categories.map(cat => `<span class="chip" style="padding:5px 6px 5px 10px;font-size:13px;font-weight:500">${esc(cat)} <button class="x" style="font-size:14px;padding:0 4px" data-action="catRename" data-cat="${attr(cat)}" title="Rename">✎</button><button class="x" style="font-size:16px;padding:0 4px" data-action="catRemove" data-cat="${attr(cat)}" title="Remove">×</button></span>`).join('')}</div>
          <div class="hint mt-s">Renaming a category updates existing transactions and budgets. Removing one keeps the transactions but they show as unbudgeted.</div>
        </div>
      </div>
      <div class="card mt"><div class="card-head"><h3>Appearance</h3><span class="tiny muted">Pick a colour theme — charts and every page follow it</span></div>
        ${themeCardsHtml(s.theme === 'auto' ? currentThemeId() : (s.theme || 'cream'), 'data-action="setTheme" data-theme')}
        <label class="check mt small"><input type="checkbox" data-change="themeAuto" ${s.theme === 'auto' ? 'checked' : ''}> Follow my device's light / dark setting (Cream by day, Charcoal at night)</label>
      </div>
      <div class="card mt"><div class="card-head"><h3>Automatic backup</h3><span class="chip ${bf.status === 'linked' ? 'good' : bf.status === 'needs-permission' || bf.status === 'error' ? 'warn' : ''}">${esc(bf.statusText())}</span></div>${backupHtml}</div>
      <div class="card mt"><div class="card-head"><h3>Your data</h3><span class="tiny muted">${state.savedAt ? 'Last saved ' + esc(fmtDateTime(state.savedAt)) : ''}</span></div>
        <div class="flex flex-wrap">
          <button class="btn primary" data-action="exportJson">Export backup (JSON)</button>
          <label class="btn">Restore from backup… <input type="file" accept=".json,application/json" class="hidden" data-change="importJson"></label>
          <button class="btn" data-action="csvExportAll">Export all transactions (CSV)</button>
          <span class="grow"></span>
          <button class="btn" data-action="loadSample">Load sample data</button>
          <button class="btn" data-action="openWizard">Re-run setup</button>
          <button class="btn" data-action="help">Welcome tour</button>
          <button class="btn ghost" data-action="runTests">Run self-tests</button>
        </div>
        <div class="tiny muted mt">${countsLabel(recordCounts(state))} · ${(serialize().length / 1024).toFixed(0)} KB in browser storage. A JSON backup contains everything and restores on any device.</div>
        <div id="testResults" class="mt"></div>
      </div>
      <div class="card mt" style="border-color:#e6b9b5"><div class="card-head"><h3 class="bad">Danger zone</h3></div>
        <div class="flex flex-wrap"><button class="btn danger" data-action="clearTxns">Delete all transactions</button><button class="btn danger" data-action="resetAll">Erase everything</button></div>
        <div class="tiny muted mt">Export a backup first. Erasing removes all data from this browser and turns off the linked backup (the file itself is not deleted).</div>
      </div>
      <div class="tiny muted mt-l center">Personal Finance Dashboard v${APP_VERSION} · schema ${SCHEMA_VERSION} · Designs by Darowan · Works entirely offline — no accounts, no bank links, no tracking.</div>`;
  }
};
