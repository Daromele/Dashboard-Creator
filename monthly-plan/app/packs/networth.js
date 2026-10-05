/* ===================================================================================
   NICHE PACK · Net Worth & FIRE Tracker
   Everything you own and owe in one number, updated once a month, and the road to financial
   independence: the FIRE number, how many years are left, Coast FI and the milestones on the way.
   Accounts, check-ins, the FIRE plan and history live in the core's NetWorthUI module
   (features.netWorth) on top of NetWorth (pure, tested). This block gives the edition its identity,
   sidebar, words, welcome, guide and the fictional household behind sample mode.
   =================================================================================== */
const NICHE = {
  id: 'networth',
  product: {
    name: 'Net Worth & FIRE Tracker', mark: 'N', publisher: 'YOUR ROAD TO FI', version: '1.0',
    tagline: 'Net worth and FIRE tracker', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Net Worth & FIRE Tracker · Road to financial freedom', themeColor: '#16362F',
    description: 'Net Worth & FIRE Tracker by JPS Digital Pages. Every account you own and owe in one number, a two-minute monthly check-in, your net worth over time, your FIRE number, years to financial independence, Coast FI and milestones. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%2316362F"/><path d="M14 46l12-12 8 7 16-19" fill="none" stroke="%23E8B04B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 22h10v10" fill="none" stroke="%23E8B04B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: 'Net Worth & FIRE Tracker. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Watch it grow.</b>One check-in a month, your net worth over time, and the date you could stop working.',
    printTitle: 'Net Worth & FIRE Tracker · JPS Digital Pages',
  },
  build: { file: 'NetWorthFireTracker.html' },
  // browser storage keys, the backup-folder database and download names all start with these
  storage: { key: 'jps-networth-fire', file: 'networth-fire' },
  // first theme is the default
  themes: ['ledger', 'sage', 'fjord', 'linen', 'slate', 'lavender', 'night', 'midnight'],
  features: { goals: false, wealth: false, pl: false, tax: false, taxLines: false, mileage: false, invoices: false, netWorth: true },
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
  nav: [['dashboard', 'Net worth', 'today'], ['nwaccounts', 'Accounts', 'wallet'], ['checkin', 'Monthly check-in', 'check'], ['fire', 'FIRE plan', 'outlook'], ['milestones', 'Milestones', 'spark'], ['nwhistory', 'History', 'insights'],
    ['settings', 'Settings & backup', 'palette'], ['guide', 'How it works', 'help']],
  optionalNav: ['milestones', 'nwhistory', 'guide'],
  navGroups: [['Your money', ['dashboard', 'nwaccounts', 'checkin', 'fire', 'milestones', 'nwhistory']]],
  navGroupRest: 'Make it yours',

  // words used across the screens
  labels: {
    income: 'Income', expense: 'Expenses', saving: 'Savings & investing', savingShort: 'Contributions', savingOne: 'Contribution',
    incomePlanned: 'Expected income', incomeReceived: 'Income received', expensesPaid: 'Expenses paid', savedInvested: 'Saved & invested',
    plannedContributions: 'Planned contributions', savingsFilter: 'Savings & investments',
    plannedIncome: 'PLANNED INCOME', subscriptionKpi: 'Subscription plan', yourName: 'Your name (optional)', yourNameHint: 'What should we call you?',
    greeting: '’s net worth', greetingPlain: 'Your net worth', planTitle: 'Your FIRE plan', categoryPlaceholder: 'e.g. Pension',
    categorySub: 'Make it fit your accounts.', directionNormal: 'Balance',
    statementKinds: 'a statement',
    importNote: '',
    exitDemo: 'Return to my accounts', demoOnly: 'Your accounts only', demoNote: 'Fictional household. Your own accounts stay separate.', notePlaceholder: 'e.g. Bonus invested',
    incomeOne: 'Income', savedCol: 'Saved', transfer: 'Transfers (not counted)', transferOne: 'Transfer', netHint: 'What you own − what you owe',
    savingRateEmpty: 'Add your take-home pay to see your savings rate', savingRate: '% of take-home pay',
  },
  quickLog: { placeholder: 'coffee 4.50', help: 'Try “coffee 4.50”.', demo: ['coffee', '4.50', 'Dining & coffee'] },

  tourTopics: 'adding accounts, the monthly check-in, your FIRE number and backups',
  // first-run tour; 'backup' is the shared backup slide
  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Your whole financial picture, in one number', text: '<p>Add what you own (checking, savings, investments, retirement, your home) and what you owe (mortgage, cards, loans). Your net worth is the difference.</p><p>Everything stays on this computer. No bank login, no account.</p>' },
    { icon: 'check', step: 'EACH MONTH', title: 'A two-minute check-in', text: '<p>Once a month, type in each balance. The chart grows a point, and you see what moved.</p>' },
    { icon: 'outlook', step: 'THE GOAL', title: 'Your FIRE number', text: '<p>Enter what you spend in a year. The app works out how much invested money would cover it for good, how far along you are, and the year you could get there.</p>' },
    'backup',
    { icon: 'wallet', step: 'START', title: 'Start with one account', text: '<p>Add your first account and today’s balance. Your net worth shows up straight away.</p>', cta: { label: 'Add my first account', action: 'nw-add' }, finish: 'Look around first' },
  ],
  guide: {
    title: 'Four steps to your number.',
    // [icon, step, what to do, screen label, screen id]
    cards: [
      ['wallet', '1. List', 'Add every account once: what you own and what you owe, with today’s balance.', 'Accounts', 'nwaccounts'],
      ['check', '2. Check in', 'Once a month, update each balance. It takes two minutes and builds your chart.', 'Monthly check-in', 'checkin'],
      ['outlook', '3. Set your number', 'Enter what you spend a year. See your FIRE number, Coast FI and the year you could get there.', 'FIRE plan', 'fire'],
      ['spark', '4. Celebrate', 'Watch the milestones fall: $10k, $100k, a quarter of the way, Coast FI, FI.', 'Milestones', 'milestones'],
    ],
    meanings: [['Net worth', 'Everything you own minus everything you owe'], ['Toward FI', 'Invested money that can pay for your life one day'], ['FIRE number', 'A year of spending ÷ your withdrawal rate'], ['Coast FI', 'Enough invested to reach FI with no more saving']],
    details: [
      ['What counts toward FI?', 'Investments, retirement accounts, an HSA and crypto count by default: money that can grow and be drawn on. Your home, your car and your checking account don’t. Change it per account with <b>Counts toward financial independence</b>.'],
      ['How is the FIRE number worked out?', 'What you spend in a year divided by your withdrawal rate. At 4% (the “4% rule”) that’s 25 times a year of spending: $40,000 a year needs $1,000,000 invested.'],
      ['What return should I use?', 'A real return: growth after inflation. 5% is a common, middle-of-the-road guess for a mix of stocks and bonds. Lower it to see a cautious plan. Everything is in today’s money.'],
      ['Lean, regular and Fat FIRE', 'Lean is a frugal version of your spending (75%), Fat a generous one (150%). The FIRE plan shows all three with the year each could happen.'],
      ['Coast FI', 'The amount you’d need invested today so that, with no more saving, it grows into your FIRE number by your traditional retirement age. Past it, you only need to cover today’s bills.'],
      ['Missed a month?', 'No problem. A month without a check-in keeps the last balances, so the chart stays smooth. Check in whenever you like; once a month is plenty.'],
      ['Closing or paying off an account', 'Edit it and set it to Closed with the month. It counts as 0 from then on and stays in your history.'],
      ['Is this financial advice?', 'No. It’s a calculator with your own numbers. Returns are a guess, not a promise, and real markets go up and down.'],
    ],
  },

  // the fictional household behind "Explore sample data": 13 accounts and 30 months of check-ins
  sample: {
    name: 'Riley', opening: 50000, settings: {},
    note: 'Check in once a month.',
    extraCategories: [],
    amounts: { salary: 7800, housing: 2100, groceries: 600 },
    days: { salary: 1 },
    undated: ['groceries'],
    spread: { groups: ['variable'], days: [3, 16], notes: ['Shop', 'Shop'], share: { default: .5 } },
    goals: [],
    extras: (s, { uid }) => {
      const t = new Date().toISOString().slice(0, 10), now = t.slice(0, 7), pad = n => String(n).padStart(2, '0');
      const addM = (ym, n) => { const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n, Y = y + Math.floor(m / 12), M = ((m % 12) + 12) % 12 + 1; return `${Y}-${pad(M)}`; };
      const A = [
        { id: 'a-check', name: 'Harbor Bank checking', side: 'asset', type: 'cash', inst: 'Harbor Bank' },
        { id: 'a-ef', name: 'Emergency fund', side: 'asset', type: 'savings', inst: 'Harbor Bank', notes: 'Six months of spending' },
        { id: 'a-idx', name: 'Index fund brokerage', side: 'asset', type: 'invest', fi: true, inst: 'Summit Investing' },
        { id: 'a-401k', name: '401(k)', side: 'asset', type: 'retire', fi: true, inst: 'Northwind Retirement' },
        { id: 'a-roth', name: 'Roth IRA', side: 'asset', type: 'retire', fi: true, inst: 'Summit Investing' },
        { id: 'a-hsa', name: 'HSA', side: 'asset', type: 'hsa', fi: true, inst: 'Northwind Retirement' },
        { id: 'a-btc', name: 'Bitcoin', side: 'asset', type: 'crypto', fi: true },
        { id: 'a-home', name: 'Our house', side: 'asset', type: 'property', notes: 'Estimated value' },
        { id: 'a-car', name: 'Hatchback', side: 'asset', type: 'vehicle' },
        { id: 'a-mort', name: 'Mortgage', side: 'debt', type: 'mortgage', inst: 'Harbor Bank' },
        { id: 'a-visa', name: 'Visa card', side: 'debt', type: 'card', notes: 'Paid in full each month' },
        { id: 'a-stu', name: 'Student loan', side: 'debt', type: 'student' },
        { id: 'a-carl', name: 'Car loan', side: 'debt', type: 'auto', closed: addM(now, -5) },
      ];
      s.nwAccounts = A.map((a, i) => ({ ...a, color: i, added: addM(now, -29) + '-02' }));
      s.nwTypes = [];
      // 30 monthly check-ins: steady saving, a market that mostly rises with one dip, debts paid down
      const N = 30, wob = k => Math.sin(k * 1.7) * .012 + Math.cos(k * .9) * .008, dip = k => (k >= 13 && k <= 16 ? -.035 : k >= 17 && k <= 19 ? .03 : 0);
      let idx = 9200000, k401 = 14800000, roth = 4100000, hsa = 980000, btc = 650000, ef = 1500000, mort = 30400000, stu = 2600000, carl = 1180000, home = 41000000;
      s.nwSnaps = [];
      for (let k = 0; k < N; k++) {
        const m = addM(now, k - N + 1), g = 1.0041 + wob(k) + dip(k);
        idx = Math.round(idx * g + 90000); k401 = Math.round(k401 * g + 110000); roth = Math.round(roth * g + 58300); hsa = Math.round(hsa * (1 + (g - 1) * .8) + 35000); btc = Math.round(btc * (1 + (g - 1) * 3.2));
        ef = Math.min(3000000, ef + 50000); mort = Math.max(0, mort - 64000); stu = Math.max(0, stu - 30000); carl = Math.max(0, carl - 47000); home = Math.round(home * 1.0025);
        const v = { 'a-check': 420000 + ((k * 7919) % 9) * 21000, 'a-ef': ef, 'a-idx': idx, 'a-401k': k401, 'a-roth': roth, 'a-hsa': hsa, 'a-btc': btc, 'a-home': home, 'a-car': Math.max(900000, 1850000 - k * 32000), 'a-mort': mort, 'a-visa': 140000 + ((k * 31) % 7) * 23000, 'a-stu': stu };
        if (m < addM(now, -5)) v['a-carl'] = carl;
        s.nwSnaps.push({ id: uid(), month: m, date: m + '-0' + (2 + k % 5), values: v });
      }
      // this month's check-in isn't done yet, so the reminder shows
      s.nwSnaps.pop();
      s.nwPlan = { spend: 4800000, rate: 400, growth: 500, monthly: 225000, age: 34, retireAge: 60, income: 780000 };
    },
  },
};
