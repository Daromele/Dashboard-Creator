/* ============================================================
   MONTH IN REVIEW — a full-screen, swipeable recap built from the user's own numbers
   ============================================================ */
/** Everything the recap needs for one month. Pure read of state; no side effects. */
function storyStats(month) {
  const sm = monthSummary(month), prevMonth = D.addMonths(month, -1), pm = monthSummary(prevMonth);
  const cats = categoryActuals(month), prevCats = categoryActuals(prevMonth);
  const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const txns = expenseTxnsInMonth(month);
  const biggest = txns.slice().sort((a, b) => txnTotal(b) - txnTotal(a))[0] || null;
  const incomeTxns = incomeTxnsInMonth(month);
  // Biggest category mover, ignoring amounts too small to be interesting either month.
  let mover = null;
  for (const [c, v] of catRows.concat(Object.entries(prevCats).filter(([c]) => !(c in cats)))) {
    const now = cats[c] || 0, before = prevCats[c] || 0;
    if (now < 25 && before < 25) continue;
    const diff = round2(now - before);
    if (!mover || Math.abs(diff) > Math.abs(mover.diff)) mover = { cat: c, now, before, diff, pct: before > 0 ? diff / before * 100 : null };
  }
  // Bills that actually fell due in the month, and how many were ticked off.
  const due = billItems().filter(b => occurrences(b, D.monthStart(month), D.monthEnd(month)).length);
  const billsPaid = due.filter(b => isBillPaid(month, b.id));
  const budgets = state.budgets.filter(b => b.month === month && num(b.planned) > 0).map(b => ({ cat: b.category, planned: num(b.planned), actual: cats[b.category] || 0 }));
  const overBudget = budgets.filter(b => b.actual > b.planned).sort((a, b) => (b.actual - b.planned) - (a.actual - a.planned));
  // Spending days vs quiet days (only up to today when the month is still running).
  const lastDay = month === D.thisMonth() ? D.today() : D.monthEnd(month);
  const elapsed = D.daysBetween(D.monthStart(month), lastDay) + 1;
  const spentDays = new Set(txns.map(t => t.date).filter(d => d <= lastDay));
  const byDay = {}; for (const t of txns) byDay[t.date] = round2((byDay[t.date] || 0) + txnTotal(t));
  const busiest = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0] || null;
  // Averages from the three months before this one, so "typical" excludes the month being reviewed.
  const prev3 = [1, 2, 3].map(k => monthSummary(D.addMonths(month, -k))).filter(s => s.income || s.expenses);
  const avgExpenses = prev3.length ? round2(sum(prev3, s => s.expenses) / prev3.length) : null;
  const avgRate = prev3.filter(s => s.savingsRate !== null).length ? sum(prev3.filter(s => s.savingsRate !== null), s => s.savingsRate) / prev3.filter(s => s.savingsRate !== null).length : null;
  // Net worth from the stored snapshots either side of the month.
  const snapIn = state.snapshots.filter(s => D.monthOf(s.date) <= month).slice(-1)[0] || null;
  const snapBefore = state.snapshots.filter(s => D.monthOf(s.date) < month).slice(-1)[0] || null;
  const goalsHit = state.goals.filter(g => num(g.target) > 0 && num(g.current) >= num(g.target));
  const debtLeft = round2(sum(state.debts, d => d.currentBalance));
  const sim = state.debts.some(d => num(d.currentBalance) > 0) ? simulateDebt(state.debts, ui.debtStrategy, num(S().debtExtraPool), D.thisMonth()) : null;
  return {
    month, prevMonth, sm, pm, cats, catRows, txnCount: txns.length, biggest, payDays: incomeTxns.length,
    mover, due: due.length, billsPaid: billsPaid.length, budgets, overBudget, withinBudget: budgets.length - overBudget.length,
    elapsed, quietDays: Math.max(0, elapsed - spentDays.size), busiest, avgExpenses, avgRate,
    snapIn, snapBefore, goalsHit, debtLeft, sim, hasData: !!(sm.income || sm.expenses),
  };
}
/** Turns the numbers into slides. Slides with nothing to say are dropped. */
function storySlides(st) {
  const sl = [], sm = st.sm;
  const label = D.monthLabel(st.month, true);
  const bar = (rows, max) => `<div class="story-bars">${rows.map(r => `<div class="sb"><div class="sb-head"><span>${esc(r.label)}</span><b>${fmt0(r.value)}</b></div><div class="sb-track"><i style="width:${Math.max(2, r.value / max * 100).toFixed(1)}%;background:${r.color}"></i></div></div>`).join('')}</div>`;
  sl.push({ kicker: 'Month in review', title: label, big: '', sub: `${esc(isCouple() ? S().person1Name + ' & ' + S().person2Name : S().person1Name)} · ${st.txnCount} transaction${st.txnCount === 1 ? '' : 's'} recorded`, art: '📖', body: `<p class="story-p">A short recap of the month, built from what you logged. ${st.month === D.thisMonth() ? 'The month is still running, so this covers it so far.' : ''}</p>` });
  if (sm.income) sl.push({
    kicker: 'Money in', title: 'You brought in', big: fmt0(sm.income), tone: 'good', art: '💵',
    sub: `across ${st.payDays} income transaction${st.payDays === 1 ? '' : 's'}`,
    body: `<p class="story-p">${sm.expectedIncome ? `You expected ${fmt0(sm.expectedIncome)} from your income sources — ${sm.income >= sm.expectedIncome ? `that's ${fmt0(sm.income - sm.expectedIncome)} <b>more</b> than planned.` : `${fmt0(sm.expectedIncome - sm.income)} of it hasn't landed yet.`}` : 'Add your income sources and next month this page can compare what you expected with what arrived.'}</p>`,
  });
  if (sm.expenses) sl.push({
    kicker: 'Money out', title: 'You spent', big: fmt0(sm.expenses), art: '🧾',
    sub: st.avgExpenses ? `${sm.expenses > st.avgExpenses ? fmt0(sm.expenses - st.avgExpenses) + ' above' : fmt0(st.avgExpenses - sm.expenses) + ' below'} your 3-month average of ${fmt0(st.avgExpenses)}` : `over ${st.txnCount} transaction${st.txnCount === 1 ? '' : 's'}`,
    body: `${st.biggest ? `<p class="story-p">Biggest single entry: <b>${esc(st.biggest.description)}</b> at ${fmt(txnTotal(st.biggest))} on ${esc(D.dateLabel(st.biggest.date))}.</p>` : ''}${st.quietDays ? `<p class="story-p">${st.quietDays} of ${st.elapsed} day${st.elapsed === 1 ? '' : 's'} passed without a single expense logged.</p>` : ''}`,
  });
  if (st.catRows.length) {
    const top = st.catRows.slice(0, 4), max = top[0][1];
    sl.push({
      kicker: 'Where it went', title: `${esc(st.catRows[0][0])} led the month`, big: fmt0(st.catRows[0][1]), art: '🍰',
      sub: `${fmtPct(sm.expenses ? st.catRows[0][1] / sm.expenses * 100 : 0)} of everything you spent`,
      body: bar(top.map(([label2, value], i) => ({ label: label2, value, color: PALETTE[(i + 1) % PALETTE.length] })), max),
    });
  }
  if (st.mover && Math.abs(st.mover.diff) >= 25) {
    const up = st.mover.diff > 0;
    sl.push({
      kicker: 'The big change', title: `${esc(st.mover.cat)} went ${up ? 'up' : 'down'}`, big: fmt0(Math.abs(st.mover.diff)), tone: up ? 'warn' : 'good', art: up ? '📈' : '📉',
      sub: `${up ? 'more' : 'less'} than ${esc(D.monthLabel(st.prevMonth))}${st.mover.pct === null ? '' : ` · ${Math.abs(st.mover.pct).toFixed(0)}% ${up ? 'up' : 'down'}`}`,
      body: `<p class="story-p">${fmt0(st.mover.now)} this month against ${fmt0(st.mover.before)} last month.${up ? ' Worth a look before it settles in as normal.' : ' Nicely done.'}</p>`,
    });
  }
  if (st.budgets.length) sl.push({
    kicker: 'Against plan', title: st.overBudget.length ? `${st.withinBudget} of ${st.budgets.length} categories stayed in budget` : 'Every budget held', big: '', tone: st.overBudget.length ? '' : 'good', art: '🎯',
    sub: `${fmt0(sum(st.budgets, b => b.actual))} spent of ${fmt0(sum(st.budgets, b => b.planned))} planned`,
    body: st.overBudget.length ? `<p class="story-p">Furthest over: <b>${esc(st.overBudget[0].cat)}</b>, ${fmt0(st.overBudget[0].actual - st.overBudget[0].planned)} above its ${fmt0(st.overBudget[0].planned)} plan.</p>` : `<p class="story-p">Every category you planned for came in at or under its number. That is the hard part done.</p>`,
  });
  if (st.due) sl.push({
    kicker: 'Bills', title: `${st.billsPaid} of ${st.due} bills ticked off`, big: '', art: '📅', tone: st.billsPaid === st.due ? 'good' : '',
    sub: st.billsPaid === st.due ? 'nothing left outstanding for this month' : `${st.due - st.billsPaid} still unticked`,
    body: `<p class="story-p">Bills and subscriptions due in ${esc(D.monthLabel(st.month))} came to ${fmt0(sm.expectedBills)}.</p>`,
  });
  if (sm.income) sl.push({
    kicker: 'Kept', title: sm.net >= 0 ? 'You kept' : 'You overspent by', big: fmt0(Math.abs(sm.net)), tone: sm.net >= 0 ? 'good' : 'bad', art: sm.net >= 0 ? '🏦' : '⚠️',
    sub: `savings rate ${fmtPct(sm.savingsRate)}${st.avgRate !== null ? ` · 3-month average ${fmtPct(st.avgRate)}` : ''}`,
    body: `<p class="story-p">${sm.saved ? `${fmt0(sm.saved)} of that moved into the Savings category. ` : ''}${st.avgRate !== null && sm.savingsRate !== null ? (sm.savingsRate >= st.avgRate ? 'That is your better side of normal.' : 'A little below your recent average — one month rarely matters, a run of them does.') : 'Keep logging and next month gets a comparison.'}</p>`,
  });
  if (st.snapIn && st.snapBefore && st.snapIn.net !== st.snapBefore.net) {
    const diff = round2(st.snapIn.net - st.snapBefore.net);
    sl.push({
      kicker: 'Net worth', title: diff >= 0 ? 'Net worth grew' : 'Net worth slipped', big: fmt0(Math.abs(diff)), tone: diff >= 0 ? 'good' : 'warn', art: '📊',
      sub: `now ${fmt0(st.snapIn.net)}, from ${fmt0(st.snapBefore.net)}`,
      body: `<p class="story-p">Assets ${fmt0(st.snapIn.assets)} against ${fmt0(st.snapIn.liabilities)} owed, taken from your monthly snapshots.</p>`,
    });
  }
  if (st.sim) sl.push({
    kicker: 'Debt', title: st.sim.neverPaysOff ? 'Your debts need more than the minimums' : `Debt-free by ${esc(D.monthLabel(st.sim.debtFreeMonth))}`, big: fmt0(st.debtLeft), art: '💳', tone: st.sim.neverPaysOff ? 'warn' : '',
    sub: st.sim.neverPaysOff ? 'still owed — interest is outrunning the payments' : `still owed · ${st.sim.monthsToDebtFree} month${st.sim.monthsToDebtFree === 1 ? '' : 's'} to go`,
    body: `<p class="story-p">${st.sim.neverPaysOff ? 'Add even a small extra monthly payment on the Debt page and a payoff date appears.' : `On the ${esc(ui.debtStrategy)} plan, with ${fmt0(st.sim.totalInterest)} of interest left to pay.`}</p>`,
  });
  if (st.goalsHit.length) sl.push({
    kicker: 'Goals', title: st.goalsHit.length === 1 ? `${esc(st.goalsHit[0].name)} is fully funded` : `${st.goalsHit.length} goals fully funded`, big: '', tone: 'good', art: '🎉',
    sub: `${fmt0(sum(st.goalsHit, g => g.current))} saved across ${st.goalsHit.length === 1 ? 'it' : 'them'}`,
    body: `<p class="story-p">${st.goalsHit.map(g => esc(g.name)).join(', ')} — target reached. Time to pick the next one.</p>`,
  });
  // Closing slide: one concrete suggestion, chosen from what the month actually showed.
  let next = { text: 'Keep logging as you go — a full month of entries is what makes every page on this dashboard sharp.', action: 'txnAdd', label: 'Add an expense' };
  if (!st.budgets.length) next = { text: 'You have no budget set for this month. A handful of categories is enough to make the pace tracker work.', action: 'goto', view: 'budget', anchor: 'table', label: 'Set a budget' };
  else if (st.overBudget.length) next = { text: `Try trimming <b>${esc(st.overBudget[0].cat)}</b> next month, or raise its plan to something you'll actually hit.`, action: 'goto', view: 'budget', anchor: 'table', label: 'Adjust the budget' };
  else if (st.due && st.billsPaid < st.due) next = { text: 'A few bills are still unticked. Marking them paid keeps safe-to-spend honest.', action: 'goto', view: 'bills', anchor: 'bills', label: 'Open bills' };
  else if (sm.savingsRate !== null && sm.savingsRate < 10) next = { text: 'Your savings rate is under 10%. Even a small automatic goal contribution changes the shape of a year.', action: 'goto', view: 'savings', anchor: 'goals', label: 'Open savings' };
  else if (st.sim && !st.sim.neverPaysOff) next = { text: `Adding to the extra payment pool moves your debt-free date earlier than ${esc(D.monthLabel(st.sim.debtFreeMonth))}.`, action: 'goto', view: 'debt', anchor: 'comparison', label: 'Open debt' };
  sl.push({
    kicker: 'That was ' + label, title: sm.net >= 0 ? 'A month in the black.' : 'A month to learn from.', big: '', art: '✨',
    sub: `${fmt0(sm.income)} in · ${fmt0(sm.expenses)} out · ${fmt0(sm.net, { sign: true })} net`,
    body: `<p class="story-p">${next.text}</p>`, cta: next, last: true,
  });
  return sl;
}
/** The full-screen recap itself. Arrows, swipe, tap the sides, Esc to leave. */
function openStory(month) {
  const mo = month || ui.month;
  const st = storyStats(mo);
  if (!st.hasData) {
    openModal(`<div class="modal narrow"><div class="modal-head"><h3>Month in review</h3><button class="x" data-modal-close>×</button></div><div class="modal-body"><p>There's nothing recorded in <b>${esc(D.monthLabel(mo))}</b> yet, so there's no story to tell. Log a few transactions — or pick a month that has some — and come back.</p></div><div class="modal-foot"><span class="spacer"></span><button class="btn primary" data-action="txnAdd" data-modal-close>Add an expense</button></div></div>`);
    return;
  }
  const slides = storySlides(st);
  let i = 0;
  const m = openModal(`<div class="modal story"><div class="story-top"><div class="story-segs" id="storySegs"></div><button class="x" data-modal-close title="Close">×</button></div>
    <div class="story-stage" id="storyStage"></div>
    <button class="story-tap left" id="storyPrev" aria-label="Previous"></button><button class="story-tap right" id="storyNext" aria-label="Next"></button>
    <div class="story-foot"><button class="btn ghost sm" id="storyBack">Back</button><span class="story-count" id="storyCount"></span><button class="btn primary sm" id="storyFwd">Next</button></div></div>`, { noFocus: true });
  const stage = m.bg.querySelector('#storyStage');
  const draw = () => {
    const s = slides[i];
    stage.innerHTML = `<div class="story-slide ${s.tone || ''}" key="${i}">
      <div class="story-art">${s.art}</div>
      <div class="story-kicker">${esc(s.kicker)}</div>
      <h2 class="story-title">${s.title}</h2>
      ${s.big ? `<div class="story-big">${s.big}</div>` : ''}
      ${s.sub ? `<div class="story-sub">${s.sub}</div>` : ''}
      ${s.body || ''}
      ${s.cta ? `<button class="btn accent mt" data-story-cta="${attr(s.cta.action)}" ${s.cta.view ? `data-view="${attr(s.cta.view)}"` : ''} ${s.cta.anchor ? `data-anchor="${attr(s.cta.anchor)}"` : ''}>${esc(s.cta.label)} →</button>` : ''}
    </div>`;
    m.bg.querySelector('#storySegs').innerHTML = slides.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('');
    m.bg.querySelector('#storyCount').textContent = `${i + 1} / ${slides.length}`;
    m.bg.querySelector('#storyBack').style.visibility = i ? 'visible' : 'hidden';
    m.bg.querySelector('#storyFwd').textContent = i === slides.length - 1 ? 'Done' : 'Next';
    if (slides[i].last && st.sm.net > 0) celebrate();
  };
  const go = n => { const k = Math.max(0, Math.min(slides.length - 1, n)); if (k === i) return; i = k; draw(); };
  const next = () => { if (i < slides.length - 1) go(i + 1); else m.close(); };
  m.bg.querySelector('#storyFwd').addEventListener('click', next);
  m.bg.querySelector('#storyNext').addEventListener('click', next);
  m.bg.querySelector('#storyBack').addEventListener('click', () => go(i - 1));
  m.bg.querySelector('#storyPrev').addEventListener('click', () => go(i - 1));
  m.bg.addEventListener('click', e => { const b = e.target.closest('[data-story-cta]'); if (!b) return; m.close(); if (b.dataset.storyCta === 'goto') goto(b.dataset.view, { anchor: b.dataset.anchor, month: mo }); else actions[b.dataset.storyCta](); });
  document.addEventListener('keydown', function key(e) {
    if (m.closed) { document.removeEventListener('keydown', key); return; }
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  });
  let sx = null; m.bg.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  m.bg.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (dx < -50) next(); if (dx > 50) go(i - 1); });
  draw();
}
