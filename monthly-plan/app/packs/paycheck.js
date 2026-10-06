/* ===================================================================================
   NICHE PACK · Paycheck Budget Planner
   A budget by payday instead of by month: every bill lands in the paycheck before it's due, spending
   and saving get an amount per paycheck, and each paycheck shows what's left or how short it is.
   The paycheck screens live in the core's PaycheckUI module (features.paycheck) on top of Pay (pure,
   tested); bills, the calendar and payment history are the bills edition's (features.billsTracker).
   This block gives the edition its identity, sidebar, words, welcome, guide and sample household.
   =================================================================================== */
const NICHE = {
  id: 'paycheck',
  product: {
    name: 'Paycheck Budget Planner', mark: 'P', publisher: 'BUDGET BY PAYDAY', version: '1.0',
    tagline: 'Paycheck to paycheck budget', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Paycheck Budget Planner · Budget by payday', themeColor: '#45392A',
    description: 'Paycheck Budget Planner by JPS Digital Pages. A paycheck to paycheck budget: every bill in the paycheck before it is due, spending and saving per paycheck, what each paycheck leaves, and warnings before one runs short. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%2345392A"/><rect x="12" y="20" width="40" height="26" rx="5" fill="none" stroke="%23E8A24A" stroke-width="5"/><circle cx="32" cy="33" r="5" fill="%23E8A24A"/></svg>',
    notice: 'Paycheck Budget Planner. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Every paycheck, planned.</b>Bills come out of the paycheck before they are due; you see what is left before you spend it.',
    printTitle: 'Paycheck Budget Planner · JPS Digital Pages',
  },
  build: { file: 'PaycheckBudgetPlanner.html' },
  // browser storage keys, the backup-folder database and download names all start with these
  storage: { key: 'jps-paycheck-budget', file: 'paycheck-budget' },
  // first theme is the default
  themes: ['linen', 'sage', 'fjord', 'lavender', 'blush', 'slate', 'night', 'midnight'],
  features: { goals: false, wealth: false, pl: false, tax: false, taxLines: false, mileage: false, invoices: false, billsTracker: true, paycheck: true, split: true },
  settings: { hiddenNav: [], splitMethod: '50-30-20' },

  // type: income | expense | saving (money moved aside: neither income nor spending)
  // fixed: a commitment the dashboard reserves for · debt: can be a payoff goal
  // subscription: counted in the insights subscription total
  groups: [
    { id: 'income', label: 'Income', type: 'income' },
    { id: 'bills', label: 'Bills', type: 'expense', fixed: true },
    { id: 'subscriptions', label: 'Subscriptions', type: 'expense', fixed: true, subscription: true },
    { id: 'debt', label: 'Debt payments', type: 'expense', fixed: true, debt: true },
    { id: 'variable', label: 'Variable expenses', type: 'expense' },
    { id: 'sinking', label: 'Sinking funds', type: 'saving' },
    { id: 'savings', label: 'Savings', type: 'saving' },
    { id: 'investment', label: 'Investments', type: 'saving', icon: 'outlook' },
    // money moving between your own accounts: never income, spending or saving. A card payoff from
    // checking belongs here when the card's purchases are already logged as expenses.
    { id: 'transfer', label: 'Transfers (not counted)', type: 'transfer', debt: true },
  ],
  // [id, name, group]
  categories: [
    ['salary', 'Salary', 'income'], ['side', 'Side hustle', 'income'], ['spouse', 'Spouse / partner', 'income'], ['other-income', 'Other income', 'income'],
    ['housing', 'Rent / mortgage', 'bills'], ['utilities', 'Utilities', 'bills'], ['internet', 'Internet & phone', 'bills'], ['insurance', 'Insurance', 'bills'],
    ['streaming', 'Streaming', 'subscriptions'], ['memberships', 'Memberships', 'subscriptions'], ['credit', 'Credit card payment', 'debt'], ['loan', 'Loan payment', 'debt'],
    ['groceries', 'Groceries', 'variable'], ['transport', 'Transport', 'variable'], ['dining', 'Dining & coffee', 'variable'], ['personal', 'Personal & family', 'variable'],
    ['travel', 'Travel fund', 'sinking'], ['annual-bills', 'Annual bills fund', 'sinking'], ['emergency', 'Emergency savings', 'savings'], ['investing', 'Investment contributions', 'investment'],
    // added in v1.9
    ['taxes', 'Taxes paid', 'bills'], ['retirement', 'Retirement contributions', 'investment'],
    ['card-payoff', 'Credit card payoff (purchases already logged)', 'transfer'], ['own-transfer', 'Transfer between my accounts', 'transfer'],
    // added in v2.2
    ['platform-payout', 'PayPal & app transfers (already counted)', 'transfer'],
  ],
  // Quick Log: a word in the description → category id
  aliases: { coffee: 'dining', cafe: 'dining', lunch: 'dining', dinner: 'dining', restaurant: 'dining', takeaway: 'dining', groceries: 'groceries', grocery: 'groceries', supermarket: 'groceries', food: 'groceries', rent: 'housing', mortgage: 'housing', electric: 'utilities', water: 'utilities', gas: 'utilities', utility: 'utilities', phone: 'internet', internet: 'internet', netflix: 'streaming', spotify: 'streaming', streaming: 'streaming', subscription: 'memberships', fuel: 'transport', petrol: 'transport', uber: 'transport', taxi: 'transport', bus: 'transport', train: 'transport', salary: 'salary', paycheck: 'salary', payday: 'salary', freelance: 'side', client: 'side', sidehustle: 'side', partner: 'spouse', spouse: 'spouse', creditcard: 'credit', loan: 'loan', travel: 'travel', holiday: 'travel', emergency: 'emergency', invest: 'investing', investment: 'investing', autopay: 'card-payoff', cardpayment: 'card-payoff', transfer: 'own-transfer', retirement: 'retirement', '401k': 'retirement', ira: 'retirement', pension: 'retirement', irs: 'taxes', taxes: 'taxes', propertytax: 'taxes' },
  // import: words a bank statement's own category column uses → category id
  importHints: {
    groceries: 'groceries', grocery: 'groceries', supermarket: 'groceries', 'food & drink': 'dining', food: 'dining',
    dining: 'dining', restaurants: 'dining', restaurant: 'dining', coffee: 'dining', 'dining out': 'dining',
    gas: 'transport', fuel: 'transport', automotive: 'transport', auto: 'transport', transport: 'transport',
    transportation: 'transport', travel: 'transport', rideshare: 'transport', parking: 'transport',
    'bills & utilities': 'utilities', utilities: 'utilities', bills: 'utilities', 'bills and utilities': 'utilities',
    shopping: 'personal', personal: 'personal', entertainment: 'personal', 'health & wellness': 'personal',
    health: 'personal', fees: 'personal', 'personal care': 'personal',
    rent: 'housing', mortgage: 'housing', home: 'housing', housing: 'housing',
    insurance: 'insurance', phone: 'internet', internet: 'internet',
    salary: 'salary', payroll: 'salary', income: 'salary', paycheck: 'salary',
    'credit card payment': 'card-payoff', 'credit card payments': 'card-payoff', 'card payment': 'card-payoff', payment: 'card-payoff', payments: 'card-payoff',
    transfer: 'own-transfer', transfers: 'own-transfer', 'internal transfer': 'own-transfer',
    taxes: 'taxes', tax: 'taxes', 'federal tax': 'taxes', 'state tax': 'taxes',
    retirement: 'retirement', '401k': 'retirement', ira: 'retirement', 'retirement contributions': 'retirement',
  },
  // platform statements (Etsy, PayPal, Patreon…): sales and the platform's cut both land in side income,
  // so it shows what actually reached you; payouts to your bank are skipped
  platformDefaults: { sale: 'side', refund: 'side', fees: 'side', ads: 'side', shipping: 'side', feeTax: 'side', payout: '__skip', conversion: '__skip', taxWithheld: 'taxes', purchase: '', other: 'side' },
  defaults: { category: 'groceries', schedule: 'housing', annualCategory: 'housing', payout: 'platform-payout', quickSetup: ['salary', 'side', 'spouse', 'housing', 'groceries', 'emergency'] },

  // sidebar: [id, label, icon]; optionalNav can be switched off in Settings
  nav: [['dashboard', 'This paycheck', 'today'], ['paychecks', 'Paycheck plan', 'plan'], ['spending', 'Spending & saving', 'spark'], ['mybills', 'Bills', 'wallet'], ['income', 'Paydays', 'coins'], ['billcal', 'Calendar', 'calendar'], ['pphistory', 'Past paychecks', 'insights'], ['billpay', 'Payment history', 'log'],
    ['settings', 'Settings & backup', 'palette'], ['guide', 'How it works', 'help']],
  optionalNav: ['billcal', 'pphistory', 'billpay', 'guide'],
  navGroups: [['Your paychecks', ['dashboard', 'paychecks', 'spending', 'mybills', 'income', 'billcal', 'pphistory', 'billpay']]],
  navGroupRest: 'Make it yours',

  // words used across the screens
  labels: {
    income: 'Income', expense: 'Expenses', saving: 'Savings & investing', savingShort: 'Contributions', savingOne: 'Contribution',
    incomePlanned: 'Expected income', incomeReceived: 'Income received', expensesPaid: 'Expenses paid', savedInvested: 'Saved & invested',
    plannedContributions: 'Planned contributions', savingsFilter: 'Savings & investments',
    plannedIncome: 'PLANNED INCOME', subscriptionKpi: 'Subscription plan', yourName: 'Your name (optional)', yourNameHint: 'What should we call you?',
    greeting: '’s paycheck', greetingPlain: 'Your paycheck', planTitle: 'Your paycheck plan', categoryPlaceholder: 'e.g. Childcare',
    categorySub: 'Make it fit your bills.', directionNormal: 'Paid',
    statementKinds: 'a statement',
    importNote: '',
    exitDemo: 'Return to my paychecks', demoOnly: 'Your paychecks only', demoNote: 'Fictional household. Your own paychecks and bills stay separate.', notePlaceholder: 'e.g. Weekly shop',
    incomeOne: 'Income', savedCol: 'Saved', transfer: 'Transfers (not counted)', transferOne: 'Transfer', netHint: 'Paycheck − bills − spending − saving',
    savingRateEmpty: 'Add your paycheck to see what you save', savingRate: '% of each paycheck',
  },
  quickLog: { placeholder: 'coffee 4.50', help: 'Try “coffee 4.50”.', demo: ['coffee', '4.50', 'Dining & coffee'] },

  tourTopics: 'your paycheck, bills, spending money and backups',
  // first-run tour; 'backup' is the shared backup slide
  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Budget by paycheck, not by month', text: '<p>You get paid every week, two weeks or twice a month, and bills don’t wait for the end of the month. This planner budgets each paycheck on its own.</p><p>Everything stays on this computer. No bank login, no account.</p>' },
    { icon: 'calendar', step: 'BILLS', title: 'Each bill in the right paycheck', text: '<p>Every bill lands in the paycheck before it’s due, so you always know which paycheck pays rent, and which one has room.</p>' },
    { icon: 'spark', step: 'SPENDING', title: 'Spending money that lasts', text: '<p>Give groceries, gas, fun and savings an amount per paycheck. Log what you spend and see what’s left until payday. A short paycheck shows up early.</p>' },
    'backup',
    { icon: 'wallet', step: 'START', title: 'Start with your paycheck', text: '<p>Add what you take home, how often you’re paid, and your next payday. Then your bills and spending.</p>', cta: { label: 'Add my paycheck', action: 'pp-income-add' }, finish: 'Look around first' },
  ],
  guide: {
    title: 'Four steps to a paycheck plan.',
    // [icon, step, what to do, screen label, screen id]
    cards: [
      ['coins', '1. Paydays', 'Add your take-home pay, how often it comes, and your next payday. A partner’s or side job’s pay too.', 'Paydays', 'income'],
      ['wallet', '2. Bills', 'Add each bill once: amount, how often, next due date. It lands in the paycheck before it’s due.', 'Bills', 'mybills'],
      ['spark', '3. Spending', 'Groceries, gas, fun money and savings: an amount each paycheck or each month.', 'Spending & saving', 'spending'],
      ['plan', '4. Plan ahead', 'See the next paychecks side by side, spot a short one early, and move a bill to even them out.', 'Paycheck plan', 'paychecks'],
    ],
    meanings: [['Left over', 'Paycheck − its bills − spending − saving'], ['Short', 'A paycheck whose bills and plans add up to more than it brings in'], ['This paycheck', 'From your payday to the day before the next one'], ['Each month', 'An amount split by the days each paycheck covers']],
    details: [
      ['Which paycheck pays a bill?', 'The one before it’s due: the paycheck whose dates the due date falls in. Rent due on the 1st comes out of the last paycheck before the 1st.'],
      ['A paycheck is short. What now?', 'Open the Paycheck plan. Use ⇄ on a bill to pay it from an earlier paycheck that has room, trim spending for that paycheck, or turn on <b>Carry what’s left</b> so a good paycheck covers the next.'],
      ['Paid twice a month, or on a weekend?', 'Choose <b>Twice a month</b> and pick the two days (the 15th and the last day, say). If a payday falls on a weekend, pick whether you’re paid the Friday before or the Monday after.'],
      ['My paycheck changes each time', 'Enter a typical amount. When it arrives, confirm what actually came in: the plan uses the real number.'],
      ['Per paycheck or per month?', 'Gas is easy per paycheck. Groceries might be $600 a month: choose <b>Each month</b> and it’s split by the days each paycheck covers, so a longer paycheck gets a bigger share.'],
      ['Two incomes', 'Add both. Every payday from either one starts a new paycheck, and paydays on the same day are counted together. “Each paycheck” amounts follow your main paycheck (pick it on Paydays), so a second income doesn’t add another round of spending.'],
      ['Bills, ticks and the calendar', 'Tick bills off from This paycheck or the Bills screens. Autopay bills tick themselves on their due day. The calendar shows paydays ($) and bills together.'],
    ],
  },

  // the fictional household behind "Explore sample data": two incomes, 11 bills, a spending plan and two months of entries
  sample: {
    name: 'Jamie', opening: 50000, settings: {},
    note: 'Confirm your paycheck when it lands.',
    extraCategories: [],
    amounts: { salary: 4300, housing: 1450, groceries: 650 },
    days: { salary: 1 },
    undated: ['groceries'],
    spread: { groups: ['variable'], days: [3, 16], notes: ['Shop', 'Shop'], share: { default: .5 } },
    goals: [],
    extras: (s, { uid }) => {
      const t = new Date().toISOString().slice(0, 10), pad = n => String(n).padStart(2, '0');
      const add = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
      const dow = d => new Date(d + 'T12:00:00Z').getUTCDay();
      // the Friday payday of the job: the latest Friday on or before today, every two weeks
      let fri = t; while (dow(fri) !== 5) fri = add(fri, -1);
      const Y = +t.slice(0, 4), M = +t.slice(5, 7), ym = (k) => { const m = M - 1 + k, y = Y + Math.floor(m / 12); return `${y}-${pad(((m % 12) + 12) % 12 + 1)}`; };
      const start = add(fri, -84);
      s.ppIncome = [
        { id: 'i-job', name: 'Clinic job', amount: 215000, freq: 'biweekly', start, color: 0, added: add(t, -70) },
        { id: 'i-partner', name: 'Partner', amount: 165000, freq: 'semimonthly', day1: 15, day2: 31, weekend: 'before', start: ym(-3) + '-01', color: 1, added: add(t, -70) },
      ];
      s.btBills = [
        { id: 'b-rent', name: 'Rent', amount: 165000, kind: 'bill', cat: 'housing', freq: 'monthly', start: ym(-6) + '-01', from: 'Checking' },
        { id: 'b-power', name: 'City Power & Light', amount: 11800, kind: 'bill', cat: 'utilities', freq: 'monthly', start: ym(-6) + '-08', varies: true },
        { id: 'b-net', name: 'Bluewave Internet', amount: 7499, kind: 'bill', cat: 'phone', freq: 'monthly', start: ym(-6) + '-12', autopay: true },
        { id: 'b-phone', name: 'Phone plan', amount: 8500, kind: 'bill', cat: 'phone', freq: 'monthly', start: ym(-6) + '-20', autopay: true },
        { id: 'b-car', name: 'Car payment', amount: 31500, kind: 'bill', cat: 'loans', freq: 'monthly', start: ym(-6) + '-18' },
        { id: 'b-ins', name: 'Car insurance', amount: 14200, kind: 'bill', cat: 'insurance', freq: 'monthly', start: ym(-6) + '-26', autopay: true },
        { id: 'b-stu', name: 'Student loan', amount: 22000, kind: 'bill', cat: 'loans', freq: 'monthly', start: ym(-6) + '-03' },
        { id: 'b-care', name: 'Daycare', amount: 21000, kind: 'bill', cat: 'kids', freq: 'biweekly', start: add(fri, -80) },
        { id: 'b-water', name: 'Water & sewer', amount: 6400, kind: 'bill', cat: 'utilities', freq: 'bimonthly', start: ym(-5) + '-22' },
        { id: 'b-stream', name: 'Streaming bundle', amount: 2299, kind: 'sub', cat: 'streaming', freq: 'monthly', start: ym(-6) + '-09', autopay: true },
        { id: 'b-gym', name: 'Gym', amount: 3999, kind: 'sub', cat: 'memberships', freq: 'monthly', start: ym(-6) + '-05', autopay: true },
      ].map((b, i) => ({ ...b, color: i, added: add(t, -70) }));
      s.btCats = [];
      s.ppEnv = [
        { id: 'e-food', name: 'Groceries', kind: 'spend', amount: 65000, per: 'month', color: 0 },
        { id: 'e-gas', name: 'Gas', kind: 'spend', amount: 8000, per: 'check', color: 1 },
        { id: 'e-out', name: 'Eating out', kind: 'spend', amount: 5000, per: 'check', color: 2 },
        { id: 'e-home', name: 'Household', kind: 'spend', amount: 3500, per: 'check', color: 3 },
        { id: 'e-fun', name: 'Fun money', kind: 'spend', amount: 4000, per: 'check', color: 4 },
        { id: 'e-save', name: 'Emergency fund', kind: 'save', amount: 10000, per: 'check', color: 5 },
        { id: 'e-xmas', name: 'Holiday fund', kind: 'save', amount: 4000, per: 'check', color: 6 },
      ];
      // two months of spending, a little each few days
      const plan = { 'e-food': [6400, 3, 'Weekly shop'], 'e-gas': [4200, 6, 'Fill-up'], 'e-out': [2350, 5, 'Takeout'], 'e-home': [1800, 9, 'Hardware store'], 'e-fun': [1500, 8, 'Movies'] };
      s.ppSpend = []; let n = 0;
      for (let d = add(t, -60); d <= t; d = add(d, 1)) for (const [e, [amt, every, note]] of Object.entries(plan)) if ((++n * 7 + d.charCodeAt(9)) % every === 0) s.ppSpend.push({ id: uid(), env: e, date: d, amount: amt + ((n * 37) % 11 - 5) * 100, note });
      // past paychecks confirmed (one a little lower), bills before today paid
      s.ppGot = {}; for (let d = add(fri, -56); d <= t; d = add(d, 14)) s.ppGot['i-job|' + d] = d === add(fri, -28) ? 198050 : 215000;
      // the partner's paychecks, confirmed except the latest one
      if (typeof Pay !== 'undefined') { const P2 = Pay.paydays(s.ppIncome[1], add(t, -62), t); P2.slice(0, -1).forEach(d => { s.ppGot['i-partner|' + d] = 165000; }); }
      s.btLog = []; const due = (b, from, to) => { const out = []; const step = { monthly: 1, bimonthly: 2 }[b.freq]; if (!step) { for (let d = b.start; d <= to; d = add(d, 14)) if (d >= from) out.push(d); return out; }
        for (let k = 0; k < 60; k++) { const y = +b.start.slice(0, 4), m = +b.start.slice(5, 7) - 1 + k * step, Yr = y + Math.floor(m / 12), Mo = m % 12 + 1, dd = `${Yr}-${pad(Mo)}-${b.start.slice(8)}`; if (dd > to) break; if (dd >= from) out.push(dd); } return out; };
      s.btBills.forEach(b => due(b, add(t, -60), add(t, -1)).forEach(d => { if (b.id === 'b-power' && d >= add(t, -4)) return; s.btLog.push({ id: uid(), bill: b.id, due: d, date: d, amount: b.varies ? b.amount + 640 : b.amount, ...(b.autopay ? { note: 'Autopay' } : {}) }); }));
      s.ppMoves = {};
      // a one-off repair that leaves the paycheck after next about $180 short, so the plan has something to fix
      if (typeof Pay !== 'undefined') { const S = { incomes: s.ppIncome, bills: s.btBills, envelopes: s.ppEnv, log: s.btLog, spend: s.ppSpend, got: s.ppGot, moves: {} }, L = Pay.plan(S, t, 3, t);
        if (L[2]) s.btBills.push({ id: 'b-repair', name: 'Car repair', amount: L[2].left + 18000, kind: 'bill', cat: 'transport', freq: 'once', start: add(L[2].start, 2), color: 11, added: t, notes: 'Brakes' }); }
      s.ppCarry = false;
    },
  },
};
