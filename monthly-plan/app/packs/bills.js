/* ===================================================================================
   NICHE PACK · Bill & Subscription Tracker
   Every bill and subscription, when it's due, what it costs a month and a year, and what renews or
   ends next. The bills, payments, calendar, renewals and yearly cost live in the core's BillsUI module
   (features.billsTracker) on top of BillCal (pure, tested). This block gives the edition its identity,
   sidebar, words, welcome, guide and the fictional household behind sample mode.
   =================================================================================== */
const NICHE = {
  id: 'bills',
  product: {
    name: 'Bill & Subscription Tracker', mark: 'B', publisher: 'NEVER MISS A DUE DATE', version: '1.0',
    tagline: 'Bill and subscription tracker', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Bill & Subscription Tracker · Never miss a due date', themeColor: '#63304A',
    description: 'Bill & Subscription Tracker by JPS Digital Pages. Every bill and subscription in one place: due dates, a monthly checklist, a calendar, renewals, free trials, price rises and what it all costs a year. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%2363304A"/><rect x="16" y="14" width="32" height="38" rx="5" fill="none" stroke="%23E9A85C" stroke-width="5"/><path d="M24 30l6 6 11-12" fill="none" stroke="%23E9A85C" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: 'Bill & Subscription Tracker. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Paid on time, every time.</b>Tick each bill off, see what renews next, and cut what you don’t use.',
    printTitle: 'Bill & Subscription Tracker · JPS Digital Pages',
  },
  build: { file: 'BillSubscriptionTracker.html' },
  // browser storage keys, the backup-folder database and download names all start with these
  storage: { key: 'jps-bill-tracker', file: 'bill-tracker' },
  // first theme is the default
  themes: ['blush', 'lavender', 'sage', 'fjord', 'linen', 'slate', 'night', 'midnight'],
  features: { goals: false, wealth: false, pl: false, tax: false, taxLines: false, mileage: false, invoices: false, billsTracker: true },
  settings: { hiddenNav: [] },

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
  nav: [['dashboard', 'This month', 'today'], ['mybills', 'Bills & subscriptions', 'wallet'], ['billcal', 'Calendar', 'calendar'], ['renewals', 'Renewals & trials', 'history'], ['yearcost', 'Yearly cost', 'insights'], ['billpay', 'Payment history', 'log'],
    ['settings', 'Settings & backup', 'palette'], ['guide', 'How it works', 'help']],
  optionalNav: ['billcal', 'renewals', 'yearcost', 'billpay', 'guide'],
  navGroups: [['Your bills', ['dashboard', 'mybills', 'billcal', 'renewals', 'yearcost', 'billpay']]],
  navGroupRest: 'Make it yours',

  // words used across the screens
  labels: {
    income: 'Income', expense: 'Expenses', saving: 'Savings & investing', savingShort: 'Contributions', savingOne: 'Contribution',
    incomePlanned: 'Expected income', incomeReceived: 'Income received', expensesPaid: 'Expenses paid', savedInvested: 'Saved & invested',
    plannedContributions: 'Planned contributions', savingsFilter: 'Savings & investments',
    plannedIncome: 'PLANNED INCOME', subscriptionKpi: 'Subscription plan', yourName: 'Your name (optional)', yourNameHint: 'What should we call you?',
    greeting: '’s month at a glance', greetingPlain: 'Your month at a glance', planTitle: 'Your monthly plan', categoryPlaceholder: 'e.g. Childcare',
    categorySub: 'Make your budget fit your life.', directionNormal: 'Income received / expense paid / contribution',
    statementKinds: 'a bank or PayPal statement',
    importNote: 'Card and bank statements work best. Spending in another currency is converted at a rate you choose on the review screen. A PayPal statement, or one from a side hustle such as Etsy or YouTube, is recognised too; what you earn there is filed as side income.',
    exitDemo: 'Return to my bills', demoOnly: 'Your bills only', demoNote: 'Fictional household. Your own bills stay separate.', notePlaceholder: 'e.g. Weekly groceries',
    incomeOne: 'Income', savedCol: 'Saved', transfer: 'Transfers (not counted)', transferOne: 'Transfer', netHint: 'Income − expenses − savings',
    savingRateEmpty: 'Log income to see your savings rate', savingRate: '% of income received',
  },
  quickLog: { placeholder: 'coffee 4.50', help: 'Try “coffee 4.50”, “rent 1200”, or “salary 2400”.', demo: ['coffee', '4.50', 'Dining & coffee'] },

  tourTopics: 'adding bills, ticking them off, renewals and backups',
  // first-run tour; 'backup' is the shared backup slide
  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Every bill, in one place', text: '<p>Rent, utilities, insurance, phone, streaming, memberships: add each one once and the app knows when it’s due, every time.</p><p>Everything stays on this computer. No bank login, no account.</p>' },
    { icon: 'check', step: 'EACH MONTH', title: 'Tick them off as you pay', text: '<p>This month lists what’s due. Tick each bill off, or let autopay ones tick themselves on their due day. Overdue ones turn red.</p>' },
    { icon: 'history', step: 'AHEAD', title: 'No surprises', text: '<p>See yearly renewals and free trials before they charge, get a reminder to cancel by a date you choose, and spot price rises.</p>' },
    'backup',
    { icon: 'wallet', step: 'START', title: 'Start with one bill', text: '<p>Add your first bill: its amount, how often it comes, and the next date it’s due. Your month fills in straight away.</p>', cta: { label: 'Add my first bill', action: 'bt-add' }, finish: 'Look around first' },
  ],
  guide: {
    title: 'Four steps to never missing a bill.',
    // [icon, step, what to do, screen label, screen id]
    cards: [
      ['wallet', '1. List', 'Add each bill and subscription once: amount, how often, the next due date, and whether it’s on autopay.', 'Bills & subscriptions', 'mybills'],
      ['check', '2. Tick off', 'Each month, tick bills off as you pay them. Autopay ones count as paid on their due day.', 'This month', 'dashboard'],
      ['calendar', '3. Look ahead', 'See every due date on the calendar, and the heavy months when yearly bills land.', 'Calendar', 'billcal'],
      ['history', '4. Trim', 'Catch free trials and renewals before they charge, and cancel what you don’t use.', 'Renewals & trials', 'renewals'],
    ],
    meanings: [['Every month', 'All your bills averaged to one month'], ['Left to pay', 'This month’s bills not ticked off yet'], ['Autopay', 'Counts as paid on its due day'], ['Set aside', 'Yearly bills ÷ 12, saved monthly']],
    details: [
      ['How often can a bill repeat?', 'Every week, every 2 weeks, every month, every 2 months, every 3 months, every 6 months, every year, or just once. Bills due on the 29th, 30th or 31st fall on the last day of shorter months.'],
      ['What does autopay do?', 'A bill on autopay counts as paid on its due day, so you don’t have to tick it. If a payment didn’t go through, click it to untick it, or mark it with the real amount.'],
      ['A bill whose amount changes (electric, water)', 'Tick <b>The amount changes</b> on the bill and enter a typical amount. When you mark it paid, you’re asked what you actually paid, and the history keeps the real number.'],
      ['When a price goes up', 'Edit the bill, type the new amount and the date it starts. The old price stays on past months, the rise shows in Renewals & trials, and the yearly cost updates.'],
      ['Free trials and cancel-by reminders', 'Add a subscription with the date its free trial ends: it costs nothing until then, and you’re warned a week before. Any bill can have a <b>Remind me to cancel by</b> date too.'],
      ['Skipping a month', 'Open the payment and choose <b>Skip this one</b> (a waived fee, a paused month). Skipped bills don’t count as due.'],
      ['Pausing or cancelling', 'Set a bill to Paused or Cancelled with the date. It stays in your history; nothing is due after that date, and a cancelled bill counts what you’ve saved since.'],
    ],
  },

  // the fictional household behind "Explore sample data": 18 bills and a year of payments
  sample: {
    name: 'Sam', opening: 50000, settings: {},
    note: 'Cancel the trial before it charges.',
    extraCategories: [],
    amounts: { salary: 4200, side: 300, housing: 1650, utilities: 210, internet: 85, insurance: 140, streaming: 45, groceries: 560, transport: 190, dining: 150, personal: 170, emergency: 200 },
    days: { salary: 1, side: 20, insurance: 26 },
    undated: ['groceries', 'transport', 'dining', 'personal'],
    spread: { groups: ['variable'], days: [3, 9, 16, 23, 28], notes: ['Weekly shop', 'Top-up', 'Weekend', 'Weekly shop', 'Month end'], share: { dining: .24, default: .17 } },
    goals: [],
    extras: (s, { year, uid }) => {
      const t = new Date().toISOString().slice(0, 10), Y = +t.slice(0, 4), pad = n => String(n).padStart(2, '0');
      const add = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
      const dayOf = n => Math.min(28, +add(t, n).slice(8)), mon = (day, y = Y - 1) => `${y}-01-${pad(day)}`;
      const ann = n => { const d = add(t, n); return `${+d.slice(0, 4) - 1}${d.slice(4)}`; };   // a yearly date that comes round in n days
      const B = [
        { id: 'b-rent', name: 'Rent', amount: 165000, kind: 'bill', cat: 'housing', freq: 'monthly', start: mon(1), from: 'Checking' },
        { id: 'b-power', name: 'City Power & Light', amount: 11800, kind: 'bill', cat: 'utilities', freq: 'monthly', start: mon(dayOf(-2)), varies: true, from: 'Checking' },
        { id: 'b-water', name: 'Water & sewer', amount: 6400, kind: 'bill', cat: 'utilities', freq: 'bimonthly', start: `${Y - 1}-02-${pad(dayOf(3))}`, from: 'Checking' },
        { id: 'b-net', name: 'Bluewave Internet', amount: 7499, kind: 'bill', cat: 'phone', freq: 'monthly', start: mon(12), autopay: true, from: 'Visa ••4821' },
        { id: 'b-phone', name: 'Phone plan', amount: 8500, kind: 'bill', cat: 'phone', freq: 'monthly', start: mon(dayOf(6)), autopay: true, from: 'Visa ••4821' },
        { id: 'b-car', name: 'Car insurance', amount: 68400, kind: 'bill', cat: 'insurance', freq: 'semiannual', start: ann(24).slice(0, 4) + '-' + add(t, 24).slice(5, 7) + '-' + pad(dayOf(24)), from: 'Checking' },
        { id: 'b-renters', name: 'Renters insurance', amount: 16800, kind: 'bill', cat: 'insurance', freq: 'yearly', start: `${Y - 1}-03-15`, autopay: true },
        { id: 'b-loan', name: 'Car payment', amount: 31500, kind: 'bill', cat: 'loans', freq: 'monthly', start: mon(18), autopay: true, from: 'Checking' },
        { id: 'b-reg', name: 'Car registration', amount: 9600, kind: 'bill', cat: 'transport', freq: 'yearly', start: `${Y - 1}-07-10` },
        { id: 'b-daycare', name: 'After-school club', amount: 18000, kind: 'bill', cat: 'kids', freq: 'monthly', start: mon(5), from: 'Checking' },
        { id: 'b-netflix', name: 'Netflix', amount: 1799, kind: 'sub', cat: 'streaming', freq: 'monthly', start: mon(dayOf(9)), autopay: true, from: 'Visa ••4821', prices: [{ from: mon(dayOf(9)), amount: 1549 }, { from: add(t, -40).slice(0, 8) + pad(dayOf(9)), amount: 1799 }] },
        { id: 'b-spotify', name: 'Spotify Family', amount: 1999, kind: 'sub', cat: 'streaming', freq: 'monthly', start: mon(21), autopay: true, from: 'Visa ••4821' },
        { id: 'b-disney', name: 'Disney+', amount: 1399, kind: 'sub', cat: 'streaming', freq: 'monthly', start: add(t, -25), autopay: true, trial: { until: add(t, 5), amount: 0 } },
        { id: 'b-icloud', name: 'iCloud+ 200 GB', amount: 299, kind: 'sub', cat: 'software', freq: 'monthly', start: mon(14), autopay: true },
        { id: 'b-prime', name: 'Amazon Prime', amount: 13900, kind: 'sub', cat: 'memberships', freq: 'yearly', start: ann(18), autopay: true },
        { id: 'b-gym', name: 'Peak Fitness', amount: 4999, kind: 'sub', cat: 'memberships', freq: 'monthly', start: mon(3), autopay: true, cancelBy: add(t, 10), notes: 'Haven’t been since spring' },
        { id: 'b-domain', name: 'Website domain', amount: 2299, kind: 'sub', cat: 'software', freq: 'yearly', start: ann(55) },
        { id: 'b-hulu', name: 'Hulu', amount: 1899, kind: 'sub', cat: 'streaming', freq: 'monthly', start: `${Y - 1}-04-11`, status: 'cancelled', stopped: add(t, -120) },
        { id: 'b-mag', name: 'Magazine', amount: 1200, kind: 'sub', cat: 'memberships', freq: 'monthly', start: `${Y - 1}-06-02`, status: 'paused', stopped: add(t, -45) },
      ];
      s.btBills = B.map((b, i) => ({ ...b, color: i, added: `${Y - 1}-12-28` }));
      s.btCats = [];
      // a year of payments: paid on the due day (a few a little late), nothing yet for what's due ahead
      const due = (b, from, to) => { const out = []; const st = b.start; const last = b.stopped ? add(b.stopped, -1) : to;
        const step = { monthly: 1, bimonthly: 2, quarterly: 3, semiannual: 6, yearly: 12 }[b.freq] || 1;
        for (let k = 0; k < 400; k++) { const y = +st.slice(0, 4), m = +st.slice(5, 7) - 1 + k * step, Yr = y + Math.floor(m / 12), Mo = m % 12 + 1, dim = new Date(Date.UTC(Yr, Mo, 0)).getUTCDate(), d = `${Yr}-${pad(Mo)}-${pad(Math.min(+st.slice(8), dim))}`;
          if (d > last || d > to) break; if (d >= from) out.push(d); } return out; };
      s.btLog = []; let n = 0;
      s.btBills.forEach(b => { if (b.trial) return; due(b, `${Y}-01-01`, add(t, -1)).forEach(d => {
        if (b.id === 'b-power' && d >= add(t, -3)) return;                       // the overdue one
        const late = (++n % 9 === 0) && !b.autopay ? 3 : 0, amt = b.varies ? b.amount + ((n * 37) % 23 - 11) * 100 : (b.prices ? (b.prices.filter(p => p.from <= d).at(-1) || b.prices[0]).amount : b.amount);
        s.btLog.push({ id: uid(), bill: b.id, due: d, date: add(d, late), amount: amt, ...(b.autopay ? { note: 'Autopay' } : {}) }); }); });
    },
  },
};
