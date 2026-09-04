/* ============================================================
   FINANCE ENGINE — pure functions, no DOM.
   This block is shared by the app and the self-test harness.
   ============================================================ */
'use strict';
const SCHEMA_VERSION = 1;
const APP_VERSION = '1.0.0';

// ---------- Date utilities (all ISO strings, no timezone math) ----------
const D = (() => {
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const parse = s => { const [y, m, d] = String(s).split('-').map(Number); return { y, m, d: d || 1 }; };
  const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();          // m is 1-12
  const clampDay = (y, m, d) => Math.min(Math.max(1, d), dim(y, m));
  const epochDay = s => { const { y, m, d } = parse(s); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
  const fromEpochDay = n => { const t = new Date(n * 86400000); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
  const addDays = (s, n) => fromEpochDay(epochDay(s) + n);
  const daysBetween = (a, b) => epochDay(b) - epochDay(a);
  const monthIndex = ym => { const { y, m } = parse(ym); return y * 12 + (m - 1); };
  const fromMonthIndex = i => `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`;
  const addMonths = (ym, n) => fromMonthIndex(monthIndex(ym) + n);
  const monthDiff = (a, b) => monthIndex(b) - monthIndex(a);
  const monthsBetween = (a, b) => { const out = []; for (let i = monthIndex(a); i <= monthIndex(b); i++) out.push(fromMonthIndex(i)); return out; };
  const monthOf = s => String(s).slice(0, 7);
  const monthStart = ym => ym + '-01';
  const monthEnd = ym => { const { y, m } = parse(ym); return iso(y, m, dim(y, m)); };
  const today = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
  const thisMonth = () => today().slice(0, 7);
  const weekday = s => new Date(Date.UTC(parse(s).y, parse(s).m - 1, parse(s).d)).getUTCDay(); // 0=Sun
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthLabel = (ym, long) => { const { y, m } = parse(ym); return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`; };
  const dateLabel = s => { if (!s) return ''; const { y, m, d } = parse(s); return `${d} ${MONTHS[m - 1]} ${y}`; };
  const isValid = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && (() => { const { y, m, d } = parse(s); return m >= 1 && m <= 12 && d >= 1 && d <= dim(y, m); })();
  return { pad, iso, parse, dim, clampDay, addDays, daysBetween, monthIndex, fromMonthIndex, addMonths, monthDiff, monthsBetween, monthOf, monthStart, monthEnd, today, thisMonth, weekday, monthLabel, dateLabel, isValid, MONTHS, MONTHS_LONG };
})();

const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const sum = (arr, f) => arr.reduce((a, x) => a + (f ? num(f(x)) : num(x)), 0);

// ---------- Frequency engine ----------
const FREQ = {
  weekly:      { label: 'Weekly',        unit: 'week',  every: 1, perYear: 52 },
  fortnightly: { label: 'Fortnightly',   unit: 'week',  every: 2, perYear: 26 },
  monthly:     { label: 'Monthly',       unit: 'month', every: 1, perYear: 12 },
  quarterly:   { label: 'Quarterly',     unit: 'month', every: 3, perYear: 4 },
  semiannual:  { label: 'Every 6 months',unit: 'month', every: 6, perYear: 2 },
  annual:      { label: 'Annual',        unit: 'year',  every: 1, perYear: 1 },
  custom:      { label: 'Custom' },
};

function stepOf(item) {
  if (item.frequency === 'custom') {
    const every = Math.max(1, Math.round(num(item.customEvery) || 1));
    const unit = ['week', 'month', 'year'].includes(item.customUnit) ? item.customUnit : 'month';
    const perYear = unit === 'week' ? 52 / every : unit === 'month' ? 12 / every : 1 / every;
    return { unit, every, perYear };
  }
  return FREQ[item.frequency] || FREQ.monthly;
}
function freqLabel(item) {
  if (item.frequency === 'custom') { const s = stepOf(item); return `Every ${s.every} ${s.unit}${s.every > 1 ? 's' : ''}`; }
  return (FREQ[item.frequency] || FREQ.monthly).label;
}
const annualAmount = item => num(item.amount) * stepOf(item).perYear;
const monthlyEquivalent = item => annualAmount(item) / 12;

/** All occurrence dates (ISO) of a recurring item within [fromISO, toISO], inclusive. */
function occurrences(item, fromISO, toISO) {
  if (!item || item.active === false) return [];
  if (!num(item.amount) && item.amount !== undefined && item.amount !== null && num(item.amount) === 0 && item.allowZero !== true) { /* zero-amount items still produce dates */ }
  const step = stepOf(item);
  const start = D.isValid(item.startDate) ? item.startDate : fromISO;
  const end = D.isValid(item.endDate) ? item.endDate : null;
  const lo = fromISO, hi = toISO;
  if (lo > hi) return [];
  if (end && end < lo) return [];
  if (start > hi) return [];
  const out = [];
  if (step.unit === 'week') {
    const stepDays = 7 * step.every;
    let cur = start;
    if (cur < lo) { const k = Math.ceil(D.daysBetween(start, lo) / stepDays); cur = D.addDays(start, k * stepDays); }
    while (cur <= hi && (!end || cur <= end)) { out.push(cur); cur = D.addDays(cur, stepDays); }
  } else {
    const stepMonths = step.unit === 'year' ? 12 * step.every : step.every;
    const s = D.parse(start);
    const dueDay = num(item.dueDay) >= 1 ? Math.min(31, Math.round(num(item.dueDay))) : s.d;
    let idx = s.y * 12 + (s.m - 1);
    const loIdx = D.monthIndex(lo);
    if (idx < loIdx) { const k = Math.ceil((loIdx - idx) / stepMonths); idx += k * stepMonths; }
    // The occurrence in lo's month may fall before lo but a step earlier may still land >= lo? No: an earlier
    // step lands in an earlier month, which is < lo by definition. So starting at idx is safe.
    for (let guard = 0; guard < 100000; guard++) {
      const y = Math.floor(idx / 12), m = (idx % 12) + 1;
      const date = D.iso(y, m, D.clampDay(y, m, dueDay));
      if (date > hi) break;
      if (end && date > end) break;
      if (date >= lo && date >= start) out.push(date);
      idx += stepMonths;
    }
  }
  return out;
}

/** Returns [{ month:'YYYY-MM', amount, occurrences }] for every month in [fromMonth, toMonth]. */
function expandRecurring(item, fromMonth, toMonth) {
  const months = D.monthsBetween(fromMonth, toMonth);
  const counts = Object.fromEntries(months.map(m => [m, 0]));
  for (const d of occurrences(item, D.monthStart(fromMonth), D.monthEnd(toMonth))) counts[D.monthOf(d)]++;
  const amt = num(item.amount);
  return months.map(m => ({ month: m, occurrences: counts[m], amount: round2(counts[m] * amt) }));
}

/** Total amount an item produces in one month. */
function amountInMonth(item, month) { return expandRecurring(item, month, month)[0].amount; }

/** Next occurrence on/after fromISO (searches 3 years ahead), or null. */
function nextDue(item, fromISO) {
  const hits = occurrences(item, fromISO, D.addDays(fromISO, 3 * 366));
  return hits.length ? hits[0] : null;
}

/** Normalise a subscription record into a recurring item the engine understands. */
function subAsRecurring(sub) {
  const cycle = sub.billingCycle || 'monthly';
  const anchor = D.isValid(sub.renewalDate) ? sub.renewalDate : (D.isValid(sub.startDate) ? sub.startDate : D.today());
  return {
    id: sub.id, name: sub.name, category: sub.category || 'Subscriptions', owner: sub.owner, amount: sub.amount,
    frequency: cycle, dueDay: cycle === 'weekly' || cycle === 'fortnightly' ? undefined : D.parse(anchor).d,
    startDate: D.isValid(sub.startDate) && sub.startDate < anchor ? sub.startDate : anchor,
    endDate: sub.endDate, active: sub.active, _isSub: true,
  };
}

// ---------- Debt engine ----------
/**
 * Simulate paying down a set of debts.
 * strategy: 'snowball' (smallest balance first) | 'avalanche' (highest APR first)
 * extraPool: extra money per month directed at the target debt (on top of every debt's min + extra).
 * Returns { schedule:[{month, perDebt:{id:{payment,interest,principal,balance}}, totalBalance, totalPayment}],
 *           payoffByDebt:{id:'YYYY-MM'}, totalInterest, totalPaid, monthsToDebtFree, debtFreeMonth, neverPaysOff }
 */
function simulateDebt(debts, strategy, extraPool, startMonth, opts) {
  const maxMonths = (opts && opts.maxMonths) || 600;
  const live = (debts || []).filter(d => num(d.currentBalance) > 0).map(d => ({
    id: d.id, balance: round2(num(d.currentBalance)), apr: num(d.apr), min: round2(num(d.minPayment)), extra: round2(num(d.extraPayment)),
  }));
  const schedule = [], payoffByDebt = {};
  let totalInterest = 0, totalPaid = 0, month = startMonth, pool = round2(num(extraPool));
  const sorter = strategy === 'avalanche'
    ? (a, b) => (b.apr - a.apr) || (a.balance - b.balance)
    : (a, b) => (a.balance - b.balance) || (b.apr - a.apr);
  for (let i = 0; i < maxMonths; i++) {
    const open = live.filter(d => d.balance > 0);
    if (!open.length) break;
    let available = pool;
    for (const d of open) {
      d.interest = round2(d.balance * d.apr / 100 / 12);
      d.balance = round2(d.balance + d.interest);
      totalInterest = round2(totalInterest + d.interest);
      const committed = round2(d.min + d.extra);
      const pay = Math.min(d.balance, committed);
      d.balance = round2(d.balance - pay);
      d.paid = pay;
      available = round2(available + (committed - pay));    // unused committed money joins this month's pool
    }
    for (const d of open.slice().sort(sorter)) {
      if (available <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(d.balance, available);
      d.balance = round2(d.balance - pay);
      d.paid = round2(d.paid + pay);
      available = round2(available - pay);
    }
    const perDebt = {};
    let totalBalance = 0, totalPayment = 0;
    for (const d of open) {
      perDebt[d.id] = { payment: d.paid, interest: d.interest, principal: round2(d.paid - d.interest), balance: d.balance };
      totalBalance = round2(totalBalance + d.balance);
      totalPayment = round2(totalPayment + d.paid);
      totalPaid = round2(totalPaid + d.paid);
      if (d.balance <= 0 && !payoffByDebt[d.id]) { payoffByDebt[d.id] = month; pool = round2(pool + d.min + d.extra); }
    }
    schedule.push({ month, perDebt, totalBalance, totalPayment });
    month = D.addMonths(month, 1);
  }
  const neverPaysOff = live.some(d => d.balance > 0);
  return {
    schedule, payoffByDebt, totalInterest: round2(totalInterest), totalPaid: round2(totalPaid),
    monthsToDebtFree: neverPaysOff ? null : schedule.length,
    debtFreeMonth: neverPaysOff || !schedule.length ? null : schedule[schedule.length - 1].month,
    neverPaysOff,
  };
}

function blendedApr(debts) {
  const tot = sum(debts, d => d.currentBalance);
  return tot > 0 ? sum(debts, d => num(d.currentBalance) * num(d.apr)) / tot : 0;
}

// ---------- Budget rollover ----------
/**
 * Carry-over into `month` for `category` given planned/actual lookups.
 * mode: 'off' | 'surplus' (only positive carry) | 'full' (overspend reduces next month)
 * plannedFn(month, cat) -> number|null (null = no budget set that month, chain stops)
 * actualFn(month, cat) -> number
 */
function rolloverInto(month, category, mode, plannedFn, actualFn, floorMonth, _depth) {
  if (mode === 'off' || !mode) return 0;
  const depth = _depth || 0;
  if (depth > 120) return 0;
  const prev = D.addMonths(month, -1);
  if (floorMonth && prev < floorMonth) return 0;
  const planned = plannedFn(prev, category);
  if (planned === null || planned === undefined) return 0;
  const carryIn = rolloverInto(prev, category, mode, plannedFn, actualFn, floorMonth, depth + 1);
  const left = round2(num(planned) + carryIn - num(actualFn(prev, category)));
  return mode === 'surplus' ? Math.max(0, left) : left;
}

// ---------- Goals ----------
function goalProjection(goal, fromMonth) {
  const remaining = Math.max(0, num(goal.target) - num(goal.current));
  const monthly = num(goal.monthlyContribution);
  const pct = num(goal.target) > 0 ? Math.min(100, num(goal.current) / num(goal.target) * 100) : 0;
  let monthsNeeded = null, projectedMonth = null;
  if (remaining === 0) { monthsNeeded = 0; projectedMonth = fromMonth; }
  else if (monthly > 0) { monthsNeeded = Math.ceil(remaining / monthly); projectedMonth = D.addMonths(fromMonth, monthsNeeded); }
  const targetMonth = goal.targetDate ? D.monthOf(goal.targetDate) : null;
  const behind = !!(targetMonth && (projectedMonth === null || projectedMonth > targetMonth));
  let requiredMonthly = null;
  if (targetMonth && remaining > 0) { const n = Math.max(1, D.monthDiff(fromMonth, targetMonth)); requiredMonthly = round2(remaining / n); }
  return { remaining, pct, monthsNeeded, projectedMonth, behind, requiredMonthly };
}

// ---------- CSV ----------
function parseCSV(text) {
  const rows = []; let row = [], field = '', inQ = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
function toCSV(rows) {
  const esc = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return rows.map(r => r.map(esc).join(',')).join('\r\n');
}
/** Accepts 2026-01-31, 31/01/2026, 01/31/2026 (dayFirst flag decides), 31-01-2026, 20260131, "Jan 31 2026". */
function parseDateLoose(v, dayFirst) {
  const s = String(v || '').trim();
  let m;
  if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return safeIso(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/))) {
    let y = +m[3]; if (y < 100) y += 2000;
    const a = +m[1], b = +m[2];
    if (a > 12 && b <= 12) return safeIso(y, b, a);
    if (b > 12 && a <= 12) return safeIso(y, a, b);
    return dayFirst ? safeIso(y, b, a) : safeIso(y, a, b);
  }
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return safeIso(+m[1], +m[2], +m[3]);
  const t = Date.parse(s);
  if (!isNaN(t)) { const d = new Date(t); return D.iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
  return null;
  function safeIso(y, mo, d) { const iso = D.iso(y, mo, d); return D.isValid(iso) ? iso : null; }
}
function parseAmountLoose(v) {
  let s = String(v === null || v === undefined ? '' : v).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/^-/.test(s)) { neg = true; s = s.slice(1); }
  if (/-$/.test(s)) { neg = true; s = s.slice(0, -1); }
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return null;
  // decide decimal separator: last of . or , if followed by exactly 2 digits
  const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

// ---------- Schema validation & migration ----------
const COLLECTIONS = ['accounts', 'income', 'bills', 'subs', 'txns', 'budgets', 'debts', 'goals', 'snapshots'];
function validateImport(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, reason: 'Not a JSON object.' };
  if (typeof obj.__schema !== 'number') return { ok: false, reason: 'Missing schema version — this does not look like a Finance Dashboard backup.' };
  if (obj.__schema > SCHEMA_VERSION) return { ok: false, reason: `This backup was made by a newer version (schema ${obj.__schema}). Update the app before restoring it.` };
  if (!obj.settings || typeof obj.settings !== 'object') return { ok: false, reason: 'Backup has no settings block.' };
  for (const c of COLLECTIONS) if (obj[c] !== undefined && !Array.isArray(obj[c])) return { ok: false, reason: `Field "${c}" is not a list.` };
  return { ok: true };
}
function migrate(obj) {
  const s = JSON.parse(JSON.stringify(obj));
  if (typeof s.__schema !== 'number') s.__schema = 1;
  // future: if (s.__schema === 1) { ...; s.__schema = 2; }
  return s;
}
function recordCounts(obj) { const o = {}; for (const c of COLLECTIONS) o[c] = Array.isArray(obj[c]) ? obj[c].length : 0; return o; }

// ---------- Self tests ----------
function runSelfTests(log) {
  const results = []; const out = log || (() => {});
  const T = (name, fn) => { try { const r = fn(); if (r === true || r === undefined) results.push({ name, ok: true }); else results.push({ name, ok: false, detail: String(r) }); } catch (e) { results.push({ name, ok: false, detail: e.message }); } };
  const eq = (a, b, msg) => JSON.stringify(a) === JSON.stringify(b) ? true : `${msg || ''} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`;
  const near = (a, b, tol, msg) => Math.abs(a - b) <= (tol === undefined ? 0.005 : tol) ? true : `${msg || ''} expected ~${b} got ${a}`;

  // Dates
  T('dim leap year', () => eq([D.dim(2024, 2), D.dim(2023, 2), D.dim(2100, 2), D.dim(2000, 2)], [29, 28, 28, 29]));
  T('addDays across year', () => eq(D.addDays('2025-12-30', 3), '2026-01-02'));
  T('addMonths', () => eq([D.addMonths('2026-11', 3), D.addMonths('2026-01', -1)], ['2027-02', '2025-12']));
  T('monthsBetween', () => eq(D.monthsBetween('2025-11', '2026-02'), ['2025-11', '2025-12', '2026-01', '2026-02']));

  // Frequency engine
  const m = (o) => Object.assign({ amount: 100, active: true }, o);
  T('monthly dueDay 31 clamps (leap Feb)', () => eq(occurrences(m({ frequency: 'monthly', dueDay: 31, startDate: '2024-01-01' }), '2024-01-01', '2024-04-30'), ['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']));
  T('monthly dueDay 31 clamps (non-leap Feb)', () => eq(occurrences(m({ frequency: 'monthly', dueDay: 31, startDate: '2023-01-01' }), '2023-02-01', '2023-02-28'), ['2023-02-28']));
  T('monthly dueDay 30 in Feb', () => eq(occurrences(m({ frequency: 'monthly', dueDay: 30, startDate: '2026-01-01' }), '2026-02-01', '2026-03-31'), ['2026-02-28', '2026-03-30']));
  T('monthly dueDay 29 in Feb', () => eq(occurrences(m({ frequency: 'monthly', dueDay: 29, startDate: '2026-01-01' }), '2026-02-01', '2026-02-28'), ['2026-02-28']));
  T('fortnightly 3-payday months', () => {
    const r = expandRecurring(m({ frequency: 'fortnightly', startDate: '2026-01-02' }), '2026-01', '2026-12');
    const occ = r.map(x => x.occurrences);
    return eq(occ, [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2]) === true && eq(sum(occ), 26, 'total') === true && eq(r[0].amount, 300, 'jan amount');
  });
  T('weekly 5-Friday month', () => eq(expandRecurring(m({ frequency: 'weekly', startDate: '2026-01-02' }), '2026-01', '2026-02').map(x => x.occurrences), [5, 4]));
  T('weekly starting before range aligns', () => eq(occurrences(m({ frequency: 'weekly', startDate: '2025-12-05' }), '2026-01-01', '2026-01-31'), ['2026-01-02', '2026-01-09', '2026-01-16', '2026-01-23', '2026-01-30']));
  T('item ending mid-range', () => eq(expandRecurring(m({ frequency: 'monthly', dueDay: 10, startDate: '2026-01-01', endDate: '2026-03-15' }), '2026-01', '2026-05').map(x => x.occurrences), [1, 1, 1, 0, 0]));
  T('item ending before due day', () => eq(expandRecurring(m({ frequency: 'monthly', dueDay: 10, startDate: '2026-01-01', endDate: '2026-03-05' }), '2026-01', '2026-04').map(x => x.occurrences), [1, 1, 0, 0]));
  T('item starting mid-range after due day', () => eq(occurrences(m({ frequency: 'monthly', dueDay: 10, startDate: '2026-02-15' }), '2026-01-01', '2026-04-30'), ['2026-03-10', '2026-04-10']));
  T('item starting mid-range before due day', () => eq(occurrences(m({ frequency: 'monthly', dueDay: 20, startDate: '2026-02-15' }), '2026-01-01', '2026-03-31'), ['2026-02-20', '2026-03-20']));
  T('inactive produces nothing', () => eq(occurrences(m({ frequency: 'monthly', dueDay: 1, startDate: '2026-01-01', active: false }), '2026-01-01', '2026-12-31'), []));
  T('quarterly from anchor', () => eq(occurrences(m({ frequency: 'quarterly', dueDay: 15, startDate: '2026-01-15' }), '2026-01-01', '2026-12-31'), ['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']));
  T('quarterly range starting mid-cycle', () => eq(occurrences(m({ frequency: 'quarterly', dueDay: 15, startDate: '2025-02-15' }), '2026-01-01', '2026-12-31'), ['2026-02-15', '2026-05-15', '2026-08-15', '2026-11-15']));
  T('semiannual', () => eq(occurrences(m({ frequency: 'semiannual', startDate: '2025-03-01' }), '2026-01-01', '2026-12-31'), ['2026-03-01', '2026-09-01']));
  T('annual on Feb 29 anchor', () => eq(occurrences(m({ frequency: 'annual', startDate: '2024-02-29' }), '2024-01-01', '2028-12-31'), ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']));
  T('custom every 2 months', () => eq(occurrences(m({ frequency: 'custom', customEvery: 2, customUnit: 'month', startDate: '2026-01-05' }), '2026-01-01', '2026-06-30'), ['2026-01-05', '2026-03-05', '2026-05-05']));
  T('custom every 3 weeks', () => eq(occurrences(m({ frequency: 'custom', customEvery: 3, customUnit: 'week', startDate: '2026-01-01' }), '2026-01-01', '2026-02-28'), ['2026-01-01', '2026-01-22', '2026-02-12']));
  T('custom every 2 years', () => eq(occurrences(m({ frequency: 'custom', customEvery: 2, customUnit: 'year', startDate: '2024-06-01' }), '2024-01-01', '2029-12-31'), ['2024-06-01', '2026-06-01', '2028-06-01']));
  T('monthly equivalents', () => near(monthlyEquivalent(m({ frequency: 'weekly' })), 433.33, 0.01) === true && near(monthlyEquivalent(m({ frequency: 'fortnightly' })), 216.67, 0.01) === true && near(monthlyEquivalent(m({ frequency: 'quarterly', amount: 300 })), 100) === true && near(monthlyEquivalent(m({ frequency: 'custom', customEvery: 2, customUnit: 'week' })), 216.67, 0.01));
  T('nextDue', () => eq(nextDue(m({ frequency: 'monthly', dueDay: 31, startDate: '2025-01-01' }), '2026-02-10'), '2026-02-28'));
  T('sub normalisation (annual renewal)', () => eq(occurrences(subAsRecurring({ amount: 120, billingCycle: 'annual', renewalDate: '2026-05-20', active: true }), '2026-01-01', '2027-12-31'), ['2026-05-20', '2027-05-20']));
  T('sub normalisation (monthly, started earlier)', () => eq(occurrences(subAsRecurring({ amount: 10, billingCycle: 'monthly', renewalDate: '2026-03-07', startDate: '2025-11-07', active: true }), '2026-01-01', '2026-03-31'), ['2026-01-07', '2026-02-07', '2026-03-07']));

  // Debt engine — hand-worked: 1000 @ 12% APR, min 100
  T('debt single: month 1-3 hand values', () => {
    const r = simulateDebt([{ id: 'a', currentBalance: 1000, apr: 12, minPayment: 100 }], 'snowball', 0, '2026-01');
    const s = r.schedule;
    return eq([s[0].perDebt.a.interest, s[0].perDebt.a.balance], [10, 910], 'm1') === true
      && eq([s[1].perDebt.a.interest, s[1].perDebt.a.balance], [9.1, 819.1], 'm2') === true
      && eq([s[2].perDebt.a.interest, s[2].perDebt.a.balance], [8.19, 727.29], 'm3');
  });
  T('debt single: payoff in 11 months, interest = paid - principal', () => {
    const r = simulateDebt([{ id: 'a', currentBalance: 1000, apr: 12, minPayment: 100 }], 'snowball', 0, '2026-01');
    return eq(r.monthsToDebtFree, 11, 'months') === true && eq(r.payoffByDebt.a, '2026-11', 'payoff') === true
      && near(r.totalPaid - 1000, r.totalInterest, 0.001, 'identity') === true && near(r.totalInterest, 58.98, 0.001, 'interest (10+9.10+8.19+7.27+6.35+5.41+4.46+3.51+2.54+1.57+0.58)');
  });
  T('debt zero APR exact', () => {
    const r = simulateDebt([{ id: 'a', currentBalance: 1000, apr: 0, minPayment: 250 }], 'avalanche', 0, '2026-01');
    return eq(r.monthsToDebtFree, 4) === true && eq(r.totalInterest, 0) === true && eq(r.schedule[3].perDebt.a.payment, 250);
  });
  T('snowball cascade rolls freed minimum', () => {
    const r = simulateDebt([{ id: 'A', currentBalance: 300, apr: 0, minPayment: 100 }, { id: 'B', currentBalance: 1000, apr: 0, minPayment: 100 }], 'snowball', 0, '2026-01');
    return eq(r.payoffByDebt.A, '2026-03', 'A') === true && eq(r.payoffByDebt.B, '2026-07', 'B') === true && eq(r.schedule[3].perDebt.B.payment, 200, 'B m4 gets 200') === true && eq(r.monthsToDebtFree, 7);
  });
  T('short final payment frees remainder same month', () => {
    // A: 150 @0% min 100 → month 2 pays 50, the other 50 goes to B that month
    const r = simulateDebt([{ id: 'A', currentBalance: 150, apr: 0, minPayment: 100 }, { id: 'B', currentBalance: 1000, apr: 0, minPayment: 100 }], 'snowball', 0, '2026-01');
    return eq(r.schedule[1].perDebt.A.payment, 50) === true && eq(r.schedule[1].perDebt.B.payment, 150);
  });
  T('avalanche targets highest APR, snowball smallest balance', () => {
    const debts = [{ id: 'big', currentBalance: 1000, apr: 20, minPayment: 50 }, { id: 'small', currentBalance: 500, apr: 5, minPayment: 25 }];
    const av = simulateDebt(debts, 'avalanche', 100, '2026-01'), sn = simulateDebt(debts, 'snowball', 100, '2026-01');
    return eq(av.schedule[0].perDebt.big.payment, 150, 'av big') === true && eq(av.schedule[0].perDebt.small.payment, 25, 'av small') === true
      && eq(sn.schedule[0].perDebt.small.payment, 125, 'sn small') === true && eq(sn.schedule[0].perDebt.big.payment, 50, 'sn big') === true
      && (av.totalInterest < sn.totalInterest ? true : 'avalanche should cost less interest');
  });
  T('per-debt extra payment is committed and rolls', () => {
    const r = simulateDebt([{ id: 'A', currentBalance: 200, apr: 0, minPayment: 50, extraPayment: 50 }, { id: 'B', currentBalance: 1000, apr: 0, minPayment: 100 }], 'snowball', 0, '2026-01');
    return eq(r.payoffByDebt.A, '2026-02') === true && eq(r.schedule[2].perDebt.B.payment, 200);
  });
  T('never pays off is flagged and capped', () => {
    const r = simulateDebt([{ id: 'a', currentBalance: 1000, apr: 24, minPayment: 10 }], 'snowball', 0, '2026-01');
    return eq(r.neverPaysOff, true) === true && eq(r.schedule.length, 600) === true && eq(r.monthsToDebtFree, null);
  });
  T('no debts', () => { const r = simulateDebt([], 'snowball', 0, '2026-01'); return eq(r.schedule.length, 0) === true && eq(r.neverPaysOff, false); });
  T('blended APR', () => near(blendedApr([{ currentBalance: 1000, apr: 20 }, { currentBalance: 3000, apr: 4 }]), 8));

  // Rollover
  T('rollover surplus only', () => {
    const planned = { '2026-01': 100, '2026-02': 100, '2026-03': 100 }, actual = { '2026-01': 60, '2026-02': 170 };
    const p = (mo) => planned[mo] === undefined ? null : planned[mo], a = (mo) => actual[mo] || 0;
    return eq(rolloverInto('2026-02', 'x', 'surplus', p, a), 40, 'feb') === true && eq(rolloverInto('2026-03', 'x', 'surplus', p, a), 0, 'mar (overspent by 30 → 0)') === true && eq(rolloverInto('2026-03', 'x', 'full', p, a), -30, 'mar full') === true && eq(rolloverInto('2026-02', 'x', 'off', p, a), 0, 'off');
  });
  T('rollover stops where no budget exists', () => eq(rolloverInto('2026-02', 'x', 'full', () => null, () => 0), 0));

  // Goals
  T('goal projection', () => { const g = goalProjection({ target: 1200, current: 200, monthlyContribution: 250, targetDate: '2026-04-30' }, '2026-01'); return eq([g.remaining, g.monthsNeeded, g.projectedMonth, g.behind, g.requiredMonthly], [1000, 4, '2026-05', true, 333.33]); });
  T('goal complete', () => eq(goalProjection({ target: 100, current: 100, monthlyContribution: 0 }, '2026-01').pct, 100));

  // CSV
  T('csv parse quotes/newlines', () => eq(parseCSV('a,b\r\n"x, y","line1\nline2"\n"q""q",2'), [['a', 'b'], ['x, y', 'line1\nline2'], ['q"q', '2']]));
  T('csv roundtrip', () => { const rows = [['d', 'e'], ['1,2', 'he said "hi"']]; return eq(parseCSV(toCSV(rows)), rows); });
  T('date loose', () => eq([parseDateLoose('2026-03-04'), parseDateLoose('04/03/2026', true), parseDateLoose('03/04/2026', false), parseDateLoose('31/01/2026'), parseDateLoose('20260131'), parseDateLoose('nope')], ['2026-03-04', '2026-03-04', '2026-03-04', '2026-01-31', '2026-01-31', null]));
  T('amount loose', () => eq([parseAmountLoose('$1,234.56'), parseAmountLoose('(45.00)'), parseAmountLoose('-12'), parseAmountLoose('1.234,56'), parseAmountLoose('€ 99'), parseAmountLoose('')], [1234.56, -45, -12, 1234.56, 99, null]));

  // Validation
  T('import validation', () => eq([validateImport({ __schema: 1, settings: {} }).ok, validateImport({ __schema: 99, settings: {} }).ok, validateImport({}).ok, validateImport({ __schema: 1, settings: {}, txns: 'no' }).ok], [true, false, false, false]));

  const passed = results.filter(r => r.ok).length;
  out(`Self-tests: ${passed}/${results.length} passed`);
  results.filter(r => !r.ok).forEach(r => out(`  FAIL ${r.name}: ${r.detail}`));
  return { passed, total: results.length, results };
}
