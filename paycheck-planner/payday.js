/* ===================================================================================
   MODULE · Payday screens (Today and Until payday)
   The engine knows months; this module knows paydays. Pay and bills are the engine's
   repeat schedules, spending is its transactions, and one small record holds what the
   buyer told us their balance was: state.payday = {balance, buffer, asOf, excl}.
   The balance now = that figure + every transaction since (excl lists the ones that
   were already in it when it was typed).
   =================================================================================== */
const Payday = (() => {
  'use strict';
  const HORIZON = 90;
  const pd = () => {
    const p = state.payday && typeof state.payday === 'object' ? state.payday : {};
    return { balance: Number.isInteger(p.balance) ? p.balance : 0, buffer: Number.isInteger(p.buffer) && p.buffer > 0 ? p.buffer : 0,
      asOf: Budget.validDate(p.asOf) ? p.asOf : null, excl: Array.isArray(p.excl) ? p.excl : [] };
  };
  const typeOf = id => { const c = category(id); return c ? Budget.type(c) : 'expense'; };
  const signed = t => { const k = typeOf(t.category); return k === 'income' ? t.amount : k === 'transfer' ? 0 : -t.amount; };
  const nextMonth = m => { const d = new Date(+m.slice(0, 4), +m.slice(5), 1, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  // every schedule occurrence between two dates (inclusive), with its linked transaction if recorded
  function between(from, to) {
    const out = []; let m = from.slice(0, 7);
    while (m <= to.slice(0, 7)) { Budget.occurrences(state, m).forEach(o => { if (o.date >= from && o.date <= to) out.push(o); }); m = nextMonth(m); }
    return out;
  }
  const isPay = o => typeOf(o.category) === 'income';
  const isOut = o => ['expense', 'saving'].includes(typeOf(o.category));
  function balanceNow() {
    const p = pd(); if (!p.asOf) return p.balance;
    const ex = new Set(p.excl);
    return p.balance + state.transactions.filter(t => t.date >= p.asOf && !ex.has(t.id)).reduce((n, t) => n + signed(t), 0);
  }
  // what everyday living costs a day: spending not tied to a bill, over the last 8 weeks
  function burn() {
    const today = Budget.today(), from = Budget.plusDays(today, -56);
    const tx = state.transactions.filter(t => t.date >= from && t.date < today && !t.scheduleKey && typeOf(t.category) === 'expense');
    if (!tx.length) return 0;
    const first = tx.reduce((a, t) => t.date < a ? t.date : a, today);
    const span = Math.max(1, Math.round((new Date(today + 'T12:00') - new Date(first + 'T12:00')) / 864e5));
    if (span < 7) return 0;
    return Math.round(tx.reduce((n, t) => n + t.amount, 0) / span);
  }
  function reckon() {
    const today = Budget.today(), p = pd();
    const hasPay = (state.schedules || []).some(r => typeOf(r.category) === 'income' && r.end >= today);
    const ahead = between(today, Budget.plusDays(today, 400)).filter(o => isPay(o) && o.date > today);
    const payday = ahead[0]?.date || null;
    const since = p.asOf || today;
    // paychecks that were due since the balance was set and haven't been confirmed
    const payDue = between(since, today).filter(o => isPay(o) && !o.transaction);
    const horizon = payday ? Budget.plusDays(payday, -1) : Budget.plusDays(today, 13);
    const owing = between(since, horizon).filter(o => isOut(o) && !o.transaction);
    const owed = owing.reduce((n, o) => n + o.amount, 0);
    const bal = balanceNow();
    const safe = bal - owed - p.buffer;
    const days = payday ? Math.max(1, Math.round((new Date(payday + 'T12:00') - new Date(today + 'T12:00')) / 864e5)) : 14;
    return { today, p, hasPay, hasPlan: hasPay && !!p.asOf, payday, payDue, owing, owed, bal, safe, days, perDay: Math.floor(Math.max(0, safe) / days) };
  }
  // the balance walked forward one day at a time
  function project(extra = {}) {
    const today = Budget.today(), end = Budget.plusDays(today, HORIZON), b = Math.max(0, burn() + (extra.burn || 0));
    const occ = between(pd().asOf || today, end).filter(o => !o.transaction && (isPay(o) || isOut(o)));
    const byDay = {};
    occ.forEach(o => { const d = o.date < today ? today : o.date; (byDay[d] = byDay[d] || []).push(o); });
    let bal = balanceNow(); const pts = []; let low = { bal, date: today };
    for (let i = 0, d = today; i <= HORIZON; i++, d = Budget.plusDays(d, 1)) {
      if (i) bal -= b;
      (byDay[d] || []).forEach(o => { bal += isPay(o) ? o.amount : -o.amount; });
      if (extra.once && i === extra.onceAt) bal -= extra.once;
      pts.push({ date: d, bal, events: byDay[d] || [] });
      if (bal < low.bal) low = { bal, date: d };
    }
    return { pts, low, burn: b };
  }
  const short = d => new Date(d + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const long = d => new Date(d + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const when = (d, today) => d === today ? 'Today' : d === Budget.plusDays(today, 1) ? 'Tomorrow' : d < today ? short(d) + ' · overdue' : short(d);
  const tile = (label, value, note, icon) => `<div class="kpi"><div class="label">${kpiIco(icon)}${label}</div><b class="number">${value}</b><small>${note}</small></div>`;

  // ---------- Today ----------
  function setupCard() {
    const steps = [['Your balance', 'What’s in the accounts you spend from', 'wallet'], ['Your next payday', 'Take-home pay and how often it lands', 'calendar'], ['Bills before then', 'Rent, phone, car, subscriptions', 'plan']];
    return `<section class="hero pp-start"><div><div class="eyebrow">Safe to spend until payday</div><h2 class="pp-start-title">Let’s find your number</h2><p>Three quick questions, about a minute. Everything stays on this computer.</p><div class="hero-foot">${button('Set up my number', 'pp-setup', 'pop')}${button('Explore sample data', 'demo', 'quiet')}</div></div>
      <div class="hero-side">${steps.map(([t, s, i], n) => `<div class="pp-step"><span class="pp-step-n">${String(n + 1).padStart(2, '0')}</span><div><b>${t}</b><small>${s}</small></div>${ico(i)}</div>`).join('')}</div></section>`;
  }
  function todayView() {
    const r = reckon(), today = r.today;
    const head = pagehead(long(today), state.settings.name ? esc(state.settings.name) + ', here’s your number' : 'Safe to spend until payday', '',
      r.hasPlan ? button('Update balance', 'pp-balance', 'quiet') + button('Bills & pay', 'go-scheduled') : '');
    if (!r.hasPlan) return head + setupCard();
    const low = r.safe <= 0;
    const sub = low ? `Your bills before ${r.payday ? short(r.payday) : 'payday'} come to more than you have. No spare spending until then; nothing has gone wrong.`
      : `is yours to spend before <b>${r.payday ? long(r.payday) : 'payday'}</b>. Bills and your cushion are already set aside.`;
    const hero = `<section class="hero"><div><div class="eyebrow">Safe to spend until payday</div><h2 class="hero-big number${low ? ' alert' : ''}" data-count="${Math.max(0, r.safe)}" style="--n:${fmt(Math.max(0, r.safe)).length}">${fmt(Math.max(0, r.safe))}</h2><p>${sub}</p>
      <div class="hero-foot">${button('Can I afford this?', 'pp-afford', 'pop small')}${button('See until payday →', 'pp-outlook', 'quiet small')}</div></div>
      <div class="hero-side"><div class="hero-fact hero-total"><span>Balance now</span><strong>${fmt(r.bal)}</strong></div>
      <div class="hero-fact"><span><i class="hero-dot hb-bills"></i>Bills before payday</span><strong>−${fmt(r.owed)}</strong></div>
      <div class="hero-fact"><span><i class="hero-dot hb-save"></i><button class="pp-inline" data-action="pp-buffer">Cushion · change</button></span><strong>−${fmt(r.p.buffer)}</strong></div>
      <div class="hero-fact hero-profit"><span><i class="hero-dot hb-free"></i>Safe to spend</span><strong>${fmt(Math.max(0, r.safe))}</strong></div>
      ${low ? '' : `<span class="hero-pill">About <b>${fmt(r.perDay)}</b> a day for ${r.days} day${r.days === 1 ? '' : 's'}</span>`}</div></section>`;
    const pay = r.payDue.length ? `<div class="notice"><span><b>Payday: did ${fmt(r.payDue[0].amount)} arrive?</b><br>${esc(r.payDue[0].name)} was due ${when(r.payDue[0].date, today).toLowerCase()}. Confirming adds it to your balance.</span><div class="actions">${button('Yes, it arrived', 'pp-paid', 'small primary', `data-key="${esc(r.payDue[0].key)}"`)}</div></div>` : '';
    const weekFrom = Budget.plusDays(today, -6);
    const week = state.transactions.filter(t => t.date >= weekFrom && t.date <= today && !t.scheduleKey && typeOf(t.category) === 'expense').reduce((n, t) => n + t.amount, 0);
    const b = burn();
    const kpis = `<div class="kpis">${tile('Days until payday', String(r.days), r.payday ? short(r.payday) : 'add your pay', 'calendar')}${tile('Bills before then', fmt(r.owed), r.owing.length ? r.owing.length + (r.owing.length === 1 ? ' bill' : ' bills') + ' to go' : 'all clear', 'plan')}${tile('Spent this week', fmt(week), 'everyday spending, last 7 days', 'log')}${tile('Usual day', b ? fmt(b) : '—', b ? 'average over 8 weeks' : 'log a week to see this', 'history')}</div>`;
    const bills = `<section class="card"><div class="cardhead"><div><h2>Before payday</h2><p>Check a bill off when it leaves your account</p></div><button class="link" data-go="scheduled">Edit bills</button></div>${r.owing.length ? r.owing.map(o => `<div class="row pp-row"><div><strong>${esc(o.name)}</strong><small class="dim${o.date < today ? ' warn' : ''}">${when(o.date, today)}</small></div><span class="number">${fmt(o.amount)}</span><button class="icon-action" data-action="pp-paid" data-key="${esc(o.key)}" title="Mark ${esc(o.name)} paid" aria-label="Mark ${esc(o.name)} paid">${ico('check')}</button></div>`).join('') : empty('Nothing due before payday', 'Bills you add in Bills & pay show up here when they’re due.', 'go-scheduled', 'Bills & pay')}</section>`;
    const recent = state.transactions.filter(t => !t.scheduleKey && typeOf(t.category) === 'expense').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    const spend = `<section class="card"><div class="cardhead"><div><h2>Recent spending</h2><p>Use Quick log at the top: “coffee 4.50”</p></div><button class="link" data-go="activity">All spending</button></div>${recent.length ? recent.map(t => `<div class="row pp-row"><div><strong>${esc(t.note || category(t.category)?.name || '')}</strong><small class="dim">${t.date === today ? 'Today' : short(t.date)} · ${esc(category(t.category)?.name || '')}</small></div><span class="number">−${fmt(t.amount)}</span></div>`).join('') : empty('Nothing logged yet', 'Spent something? Quick log takes one line and comes off your number at once.', 'quick-log', 'Quick log')}</section>`;
    return head + pay + hero + kpis + `<div class="grid2 equal">${bills}${spend}</div>`;
  }

  // ---------- Until payday ----------
  let whatIf = { burn: 0, once: 0 };
  function outlookView() {
    const r = reckon();
    const head = pagehead(r.payday ? 'Next payday · ' + long(r.payday) : 'Next 90 days', 'Until payday', 'Your balance walked forward a day at a time: every payday, every bill, and what everyday living usually costs.',
      r.hasPlan ? button('Can I afford this?', 'pp-afford', 'primary') : '');
    if (!r.hasPlan) return head + `<section class="card">${empty('See your balance day by day until payday, and beyond', 'Add your balance, pay and bills, and this draws every payday and bill ahead of you, and flags the tightest day before it happens.', 'pp-setup', 'Set up my number')}</section>`;
    const P0 = project(), G = whatIf.burn || whatIf.once ? project({ burn: whatIf.burn, once: whatIf.once, onceAt: 30 }) : null;
    const onPay = r.payday ? P0.pts.find(x => x.date === r.payday) : null;
    const kpis = `<div class="kpis">${kpi('Tightest it gets', P0.low.bal, long(P0.low.date), 'outlook', P0.low.bal < 0 ? 'bad' : '')}${onPay ? kpi('On payday', onPay.bal, 'after pay lands ' + short(r.payday), 'calendar') : ''}${kpi('In 90 days', P0.pts.at(-1).bal, 'from ' + fmt(r.bal) + ' today', 'insights')}${tile('Usual day', P0.burn ? fmt(P0.burn) : '—', P0.burn ? 'everyday spending, 8-week average' : 'log a week of spending', 'history')}</div>`;
    const warn = P0.low.bal < 0 ? `<div class="notice warning"><span><b>On ${long(P0.low.date)} this plan runs ${fmt(-P0.low.bal)} short.</b><br>Moving a bill, or holding back a little now, is easier than fixing it that week.</span></div>` : '';
    const step = Math.max(1, Math.round(HORIZON / 12));
    const labels = P0.pts.map((x, i) => i % step === 0 ? short(x.date) : '');
    const series = [{ name: 'Your balance', values: P0.pts.map(x => x.bal), color: 'var(--accent)' }, ...(G ? [{ name: 'What if', values: G.pts.map(x => x.bal), color: 'var(--over)' }] : [])];
    const chart = `<section class="card"><div class="cardhead"><div><h2>Balance from here</h2><p>${short(r.today)} → ${short(P0.pts.at(-1).date)} · lowest ${fmt(P0.low.bal)} on ${short(P0.low.date)}</p></div></div>${areaChart(series, labels, 'Projected balance over the next 90 days')}
      <div class="pp-whatif"><b>What if…</b><label>Everyday spending <select data-pp-wi="burn">${[-2000, -1000, 0, 1000, 2000, 4000].map(v => `<option value="${v}" ${whatIf.burn === v ? 'selected' : ''}>${v ? (v > 0 ? '+' : '−') + fmt(Math.abs(v)) + ' a day' : 'as usual'}</option>`).join('')}</select></label>
      <label>A one-off, 30 days out <select data-pp-wi="once">${[0, 10000, 25000, 50000, 100000].map(v => `<option value="${v}" ${whatIf.once === v ? 'selected' : ''}>${v ? fmt(v) : 'none'}</option>`).join('')}</select></label>
      <span class="small muted">${G ? `Tightest day becomes <b>${short(G.low.date)}</b> at <b>${fmt(G.low.bal)}</b>.` : 'Change a setting to see a second line. Nothing here is saved.'}</span></div></section>`;
    const evs = []; P0.pts.forEach(x => x.events.forEach(o => evs.push({ date: x.date, o, after: x.bal })));
    const table = `<section class="card"><div class="cardhead"><div><h2>What’s scheduled</h2><p>Paydays and bills in the next 90 days, with your balance after each day</p></div><button class="link" data-go="scheduled">Edit bills & pay</button></div>${evs.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Item</th><th class="num">Amount</th><th class="num">Balance that day</th></tr></thead><tbody>${evs.map(e => `<tr><td data-v="${e.date}" class="nowrap">${short(e.date)}</td><td>${esc(e.o.name)}</td><td class="num ${isPay(e.o) ? 'good' : ''}" data-v="${isPay(e.o) ? e.o.amount : -e.o.amount}">${isPay(e.o) ? '+' : '−'}${fmt(e.o.amount)}</td><td class="num${e.after < 0 ? ' bad' : ''}" data-v="${e.after}">${fmt(e.after)}</td></tr>`).join('')}</tbody></table></div>` : empty('Nothing scheduled', 'Add your pay and bills in Bills & pay.', 'go-scheduled', 'Bills & pay')}</section>`;
    return head + warn + kpis + chart + table;
  }

  // ---------- Dialogs ----------
  const field = (name, label, value = '', hint = '', type = 'text', extra = '') => `<label>${label}<input name="${name}" type="${type}" ${type === 'text' ? 'inputmode="decimal" autocomplete="off"' : ''} value="${esc(value)}" ${extra}>${hint ? `<small>${hint}</small>` : ''}</label>`;
  const money2 = c => c ? (c / 100).toFixed(2) : '';
  const guessCat = n => { const s = n.toLowerCase(); return /rent|mortgage/.test(s) ? 'housing' : /phone|internet|wifi|cable/.test(s) ? 'internet' : /electric|power|gas bill|water|utilit/.test(s) ? 'utilities' : /insur/.test(s) ? 'insurance' : /loan|car payment|auto/.test(s) ? 'loan' : /netflix|spotify|hulu|disney|stream/.test(s) ? 'streaming' : /gym|member/.test(s) ? 'memberships' : 'utilities'; };
  function setupForm() {
    const p = pd(), pay = (state.schedules || []).find(r => r.setup && typeOf(r.category) === 'income'), bills = (state.schedules || []).filter(r => r.setup && typeOf(r.category) !== 'income');
    const today = Budget.today(), freq = pay?.frequency || 'biweekly';
    modal('Set up my number', 'Three quick questions. You can change any of it later.', `<form id="pp-setup-form" novalidate><div id="form-error" class="form-error" role="alert" hidden></div>
      <h3 class="sub-head">1 · What you have</h3><div class="fields">${field('balance', 'Money in hand right now', money2(p.asOf ? balanceNow() : 0), 'The total in the accounts you spend from', 'text', 'placeholder="0.00" required')}${field('buffer', 'Cushion to keep untouched', money2(p.buffer), 'Optional. e.g. 50.00, so you never hit zero', 'text', 'placeholder="0.00"')}</div>
      <h3 class="sub-head">2 · Your pay</h3><div class="fields">${field('pay', 'Take-home pay', money2(pay?.amount), '', 'text', 'placeholder="0.00"')}${field('next', 'Next payday', pay ? reckon().payday || today : Budget.plusDays(today, 7), '', 'date')}<label>How often<select name="freq" data-pp-freq>${[['weekly', 'Weekly'], ['biweekly', 'Every two weeks'], ['semimonthly', 'Twice a month (e.g. 15th and last day)'], ['fourweekly', 'Every four weeks'], ['monthly', 'Monthly'], ['custom', 'Every … days (custom)']].map(([v, l]) => `<option value="${v}" ${v === freq ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label class="pp-every" ${freq === 'custom' ? '' : 'hidden'}>Every how many days?<input name="every" type="number" min="1" max="365" value="${pay?.every || ''}" placeholder="e.g. 10"></label></div>
      <h3 class="sub-head">3 · Bills before then</h3><p class="small muted">The main ones that leave on their own. Add more any time in Bills & pay.</p>
      ${[0, 1, 2].map(i => { const b = bills[i]; return `<div class="fields pp-billrow">${field('bn' + i, i ? '' : 'Bill', b?.name || '', '', 'text', `placeholder="${['Rent', 'Phone', 'Car payment'][i]}" inputmode="text"`)}${field('ba' + i, i ? '' : 'Amount', money2(b?.amount), '', 'text', 'placeholder="0.00"')}${field('bd' + i, i ? '' : 'Next due', b ? Budget.occurrences(state, today.slice(0, 7)).find(o => o.id === b.id)?.date || b.start : Budget.plusDays(today, 3 + i * 2), '', 'date')}</div>`; }).join('')}
      ${formFoot('See my number')}</form>`);
  }
  const parse = v => { const s = String(v || '').replace(/[$,\s]/g, ''); if (!s) return null; const n = Math.round(Number(s) * 100); if (!Number.isFinite(n)) throw Error('Enter amounts as numbers, like 1250.00'); return n; };
  function setBalance(cents) {
    const today = Budget.today();
    state.payday = { ...pd(), balance: cents, asOf: today, excl: state.transactions.filter(t => t.date >= today).map(t => t.id) };
  }
  function saveSetup(form) {
    const f = new FormData(form), bal = parse(f.get('balance')), buf = parse(f.get('buffer')) || 0, pay = parse(f.get('pay'));
    if (bal === null) throw Error('Enter your money in hand, even if it is 0.');
    if (!pay || pay <= 0) throw Error('Enter your take-home pay.');
    const next = f.get('next'); if (!Budget.validDate(next)) throw Error('Pick your next payday.');
    const every = parseInt(f.get('every'), 10);
    if (f.get('freq') === 'custom' && !(every >= 1 && every <= 365)) throw Error('Enter how many days apart your paychecks are (1 to 365).');
    const bills = [0, 1, 2].map(i => ({ name: String(f.get('bn' + i) || '').trim(), amount: parse(f.get('ba' + i)), date: f.get('bd' + i) })).filter(b => b.amount > 0);
    if (bills.some(b => !Budget.validDate(b.date))) throw Error('Pick a due date for each bill.');
    commit(() => {
      const keep = (state.schedules || []).filter(r => !r.setup);
      const kept = new Set(keep.map(r => r.id));
      state.transactions.forEach(t => { if (t.scheduleKey && !kept.has(t.scheduleKey.split('@')[0])) delete t.scheduleKey; });
      state.schedules = [...keep, { id: 'pp-pay-' + Budget.uid(), name: 'Paycheck', category: 'salary', amount: pay, frequency: f.get('freq'), start: next, end: '2099-12-31', setup: true, ...(f.get('freq') === 'custom' ? { every: every } : {}) },
        ...bills.map(b => ({ id: 'pp-bill-' + Budget.uid(), name: b.name || 'Bill', category: guessCat(b.name), amount: b.amount, frequency: 'monthly', start: b.date, end: '2099-12-31', setup: true }))];
      setBalance(bal); state.payday.buffer = Math.max(0, buf);
    }, 'Your number is ready');
    closeModal(); go('dashboard', true);
  }
  function ask(kind) {
    const p = pd();
    if (kind === 'balance') modal('Update balance', 'Check your bank app and type what’s there now. Spending and pay are counted from here on.', `<form id="pp-balance-form" novalidate><div id="form-error" class="form-error" role="alert" hidden></div><div class="fields">${field('v', 'Money in hand right now', money2(balanceNow()), '', 'text', 'class="full" required')}</div>${formFoot('Update')}</form>`);
    if (kind === 'buffer') modal('Your cushion', 'Money the app keeps back, so a surprise never takes you to zero. It comes straight off your safe-to-spend.', `<form id="pp-buffer-form" novalidate><div id="form-error" class="form-error" role="alert" hidden></div><div class="fields">${field('v', 'Cushion', money2(p.buffer), 'Use 0 for none', 'text', 'required')}</div>${formFoot('Save')}</form>`);
    if (kind === 'afford') modal('Can I afford this?', 'Type the price. The answer checks every payday and bill for 90 days, not just today.', `<form id="pp-afford-form" novalidate><div id="form-error" class="form-error" role="alert" hidden></div><div class="fields">${field('v', 'How much is it?', '', '', 'text', 'placeholder="0.00" required autofocus')}</div><p id="pp-afford-out" class="pp-answer" role="status"></p><div class="formfoot"><button type="button" class="btn" data-action="dismiss">Close</button><button class="btn primary" type="submit">Check</button></div></form>`);
  }
  function afford(form) {
    const c = parse(new FormData(form).get('v')); if (!c || c <= 0) throw Error('Enter a price greater than zero.');
    const r = reckon(), P0 = project(), low = Math.min(...P0.pts.map(x => x.bal)) - c;
    const out = $('#pp-afford-out');
    if (c <= Math.max(0, r.safe) && low >= r.p.buffer) out.innerHTML = `<b class="good">Yes.</b> You’d still have ${fmt(r.safe - c)} safe to spend until payday, and your balance stays above your cushion for 90 days.`;
    else if (c <= Math.max(0, r.safe)) out.innerHTML = `<b class="warn">Yes for now, but tight later.</b> It fits before payday, but on your tightest day you’d be at ${fmt(low)}.`;
    else out.innerHTML = `<b class="bad">Not before payday.</b> It’s ${fmt(c - Math.max(0, r.safe))} more than is safe to spend now.${r.payday ? ' After ' + short(r.payday) + ' it may fit; see Until payday.' : ''}`;
    $('#form-error').hidden = true;
  }
  function record(key) {
    const [id, date] = key.split('@'), r = (state.schedules || []).find(x => x.id === id); if (!r) return;
    if (state.transactions.some(t => t.scheduleKey === key)) return;
    commit(() => { state.transactions.push({ id: Budget.uid(), date, category: r.category, amount: r.amount, note: r.name, scheduleKey: key }); }, typeOf(r.category) === 'income' ? 'Payday added to your balance' : r.name + ' marked paid');
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]'); if (!b) return;
    const a = b.dataset.action; if (!a.startsWith('pp-')) return;
    switch (a) {
      case 'pp-setup': if ($('#welcome-tour')?.open) $('#welcome-tour').close(); setupForm(); break;
      case 'pp-balance': ask('balance'); break;
      case 'pp-buffer': ask('buffer'); break;
      case 'pp-afford': ask('afford'); break;
      case 'pp-outlook': go('outlook'); break;
      case 'pp-paid': record(b.dataset.key); break;
    }
  });
  document.addEventListener('change', e => {
    if (e.target.matches?.('[data-pp-freq]')) { const box = $('.pp-every'); if (box) box.hidden = e.target.value !== 'custom'; return; }
    const k = e.target.dataset?.ppWi; if (!k) return;
    whatIf[k] = Number(e.target.value) || 0; render();
  });
  document.addEventListener('submit', e => {
    const f = e.target; if (!f.id?.startsWith('pp-')) return; e.preventDefault();
    try {
      if (f.id === 'pp-setup-form') saveSetup(f);
      if (f.id === 'pp-balance-form') { const v = parse(new FormData(f).get('v')); if (v === null) throw Error('Enter your balance.'); commit(() => setBalance(v), 'Balance updated'); closeModal(); }
      if (f.id === 'pp-buffer-form') { const v = parse(new FormData(f).get('v')) || 0; if (v < 0) throw Error('The cushion can’t be negative.'); commit(() => { state.payday = { ...pd(), buffer: v }; }, 'Cushion saved'); closeModal(); }
      if (f.id === 'pp-afford-form') afford(f);
    } catch (err) { formError(err); }
  });
  return { views: { dashboard: todayView, outlook: outlookView }, reckon, project, balanceNow };
})();
