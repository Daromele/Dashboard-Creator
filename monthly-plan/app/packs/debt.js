/* ===================================================================================
   NICHE PACK · Debt Free Plan (debt payoff tracker edition)
   One goal: debt freedom. The debts, payments, payoff strategies, what-if tools and progress
   screens live in the core's Debts module (features.debt). This block gives the edition its
   identity, its sidebar, its words and the fictional sample household with six debts. The
   budget screens stay available, switched off by default, to help find extra money.
   =================================================================================== */
const NICHE = {
  id: 'debt',
  product: {
    name: 'Debt Free Plan', mark: 'D', publisher: 'DEBT PAYOFF TRACKER', version: '1.0',
    tagline: 'Debt payoff tracker', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Debt Free Plan · Debt Payoff Tracker', themeColor: '#1F3A33',
    description: 'Debt Free Plan by JPS Digital Pages. List your debts, pick a payoff strategy (snowball, avalanche and more), see your debt-free date, log payments and watch every balance fall. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%231F3A33"/><path d="M22 16v32h8a16 16 0 0 0 0-32z" fill="none" stroke="%23F2B441" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: 'Debt Free Plan. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Every payment counts.</b>Pick a plan, pay a little extra, and watch the balances fall to zero.',
    printTitle: 'Debt Free Plan · Debt Payoff Tracker',
  },
  build: { file: 'DebtFreePlan.html' },
  // browser storage keys, the backup-folder database and download names all start with these
  storage: { key: 'jps-debt-free-plan', file: 'debt-free-plan' },
  // first theme is the default
  themes: ['sage', 'fjord', 'lavender', 'linen', 'blush', 'slate', 'night', 'midnight'],
  features: { goals: false, wealth: false, pl: false, tax: false, taxLines: false, mileage: false, invoices: false, debt: true },
  settings: { hiddenNav: ['budget', 'activity', 'cuts'] },

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
  nav: [['dashboard', 'Debt freedom', 'today'], ['debts', 'My debts', 'wallet'], ['plan', 'Payoff plan', 'plan'], ['payments', 'Payments', 'log'], ['debtimport', 'Import statements', 'up'], ['whatif', 'What if', 'spark'], ['progress', 'Progress', 'outlook'], ['duedates', 'Due dates', 'calendar'],
    ['budget', 'Monthly budget', 'plan'], ['activity', 'Transactions', 'log'], ['cuts', 'Find extra money', 'scissors'], ['settings', 'Settings & backup', 'palette'], ['guide', 'How it works', 'help']],
  optionalNav: ['debtimport', 'whatif', 'progress', 'duedates', 'budget', 'activity', 'cuts', 'guide'],
  navGroups: [['Debt freedom', ['dashboard', 'debts', 'plan', 'payments', 'debtimport', 'whatif', 'progress', 'duedates']], ['Find extra money', ['budget', 'activity', 'cuts']]],
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
    exitDemo: 'Return to my debts', demoOnly: 'Your debts only', notePlaceholder: 'e.g. Weekly groceries',
    incomeOne: 'Income', savedCol: 'Saved', transfer: 'Transfers (not counted)', transferOne: 'Transfer', netHint: 'Income − expenses − savings',
    savingRateEmpty: 'Log income to see your savings rate', savingRate: '% of income received',
  },
  quickLog: { placeholder: 'coffee 4.50', help: 'Try “coffee 4.50”, “rent 1200”, or “salary 2400”.', demo: ['coffee', '4.50', 'Dining & coffee'] },

  // first-run tour; 'backup' is the shared backup slide
  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'One goal: debt free', text: '<p>List what you owe, choose how to pay it down, and see the exact month you will be debt free.</p><p>Everything stays on this computer. No bank login, no account.</p>' },
    { icon: 'plan', step: 'PLAN', title: 'Pick the plan that fits you', text: '<p><b>Snowball</b> clears small debts first for quick wins. <b>Avalanche</b> pays the least interest. Compare five strategies side by side, then pick one.</p>' },
    { icon: 'spark', step: 'TRACK', title: 'Log payments, watch the balances fall', text: '<p>Each month the plan says what to pay on every debt. Log it in one click, and the progress tracker fills in as you go.</p>' },
    'backup',
    { icon: 'check', step: 'START', title: 'Start with one debt', text: '<p>Add your first debt: its balance, interest rate and minimum payment. Your debt-free date appears straight away.</p>', cta: { label: 'Add my first debt', action: 'debt-add' } },
  ],
  guide: {
    title: 'Four moves to debt freedom.',
    // [icon, step, what to do, screen label, screen id]
    cards: [
      ['wallet', '1. List', 'Add every debt: balance, interest rate, minimum payment and due day.', 'My debts', 'debts'],
      ['plan', '2. Plan', 'Set what you can pay each month in total and pick a strategy. The plan shows what to pay on each debt.', 'Payoff plan', 'plan'],
      ['log', '3. Pay', 'Log each payment, or mark the month as paid in one click. Update a balance from a statement any time.', 'Payments', 'payments'],
      ['outlook', '4. Watch', 'See balances fall, color in the tracker, and test what an extra $50 or a balance transfer would do.', 'Progress', 'progress'],
    ],
    meanings: [['Minimum', 'What each lender requires'], ['Extra', 'Your budget above the minimums'], ['Rollover', 'A cleared debt’s payment moves to the next'], ['Debt-free date', 'The month the last debt reaches zero']],
    details: [
      ['Importing statement downloads', 'On <b>Import statements</b>, drop the CSV, OFX or QFX files you download from a card, a loan or your checking account (look for “Download activity” or “Export”). A card or loan file brings its payments, purchases, fees, refunds and the interest the lender charged; that interest replaces the app’s estimate for the month. A checking file gives only the payments it sent to your debts. You check every line before it’s saved, lines already logged are skipped, and the app remembers which debt each file and payee belongs to. PDF statements can’t be read: use <b>Update a balance</b> for those.'],
      ['Snowball, avalanche and the rest', '<b>Avalanche</b> sends every extra dollar to the highest interest rate: it costs the least. <b>Snowball</b> clears the smallest balance first: you see debts disappear sooner. <b>Cash flow</b> clears the debt that frees the most monthly minimum for its size. <b>Credit score</b> pays down the cards closest to their limit first. <b>Your order</b> follows the order you set. Whatever you pick, a cleared debt’s payment rolls over to the next one.'],
      ['How interest is worked out', 'Each month a debt is charged its APR ÷ 12 on the balance, before that month’s payments, like a card statement. A promotional rate (0% balance transfer, for example) applies until its end month, then the standard rate. Real lenders charge daily, so a statement can differ by a few cents or dollars: update the balance from your statement whenever you like.'],
      ['Keeping balances right', 'The app estimates each balance from the one you entered: interest each month, minus the payments you log, plus new charges. When a statement arrives, use <b>Update balance</b> to enter the real number; the estimate restarts from there.'],
      ['Card minimums', 'Choose <b>Card style</b> for a credit card: the minimum is 1% of the balance plus that month’s interest, never below the amount you enter. It falls as the balance falls, which is why paying only the minimum takes so long.'],
      ['Not financial advice', 'Debt Free Plan works from the numbers you enter. It does not know your lender’s exact terms, fees or rules. Check big decisions, like a consolidation loan or a balance transfer, with your lender or a qualified adviser.'],
    ],
  },

  // the fictional household behind "Explore sample data": a budget and six debts
  sample: {
    name: 'Alex', opening: 50000, settings: {},
    note: 'Keep dining within plan: every dollar saved goes to the card.',
    extraCategories: [['car-loan', 'Car loan payment', 'debt'], ['student', 'Student loan payment', 'debt']],
    amounts: { salary: 3600, side: 450, housing: 1450, utilities: 180, internet: 90, insurance: 120, streaming: 25, credit: 400, loan: 260, 'car-loan': 340, student: 210, groceries: 520, transport: 180, dining: 140, personal: 160, emergency: 150 },
    days: { salary: 1, side: 20, insurance: 26, loan: 27, 'car-loan': 18, student: 12 },
    undated: ['groceries', 'transport', 'dining', 'personal'],
    spread: { groups: ['variable'], days: [3, 9, 16, 23, 28], notes: ['Weekly shop', 'Top-up', 'Weekend', 'Weekly shop', 'Month end'], share: { dining: .24, default: .17 } },
    goals: [],
    // six debts, entered last January, with a year of payments logged against them
    extras: (s, { m, year, uid }) => {
      const since = (+year) + '-01-05', D = [
        { id: 'd-visa', name: 'Visa card', kind: 'card', balance: 640000, apr: 2449, min: 3500, minMode: 'card', due: 22, limit: 800000, lender: 'Harbor Bank', color: 1 },
        { id: 'd-store', name: 'Store card', kind: 'card', balance: 260000, apr: 2899, min: 7500, minMode: 'fixed', due: 9, limit: 300000, color: 2 },
        { id: 'd-car', name: 'Car loan', kind: 'auto', balance: 1420000, apr: 649, min: 34000, minMode: 'fixed', due: 18, lender: 'Credit union', color: 3 },
        { id: 'd-student', name: 'Student loan', kind: 'student', balance: 2280000, apr: 499, min: 21000, minMode: 'fixed', due: 12, color: 4 },
        { id: 'd-personal', name: 'Personal loan', kind: 'personal', balance: 420000, apr: 1199, min: 16000, minMode: 'fixed', due: 3, color: 5 },
        { id: 'd-medical', name: 'Medical bill', kind: 'medical', balance: 140000, apr: 0, min: 5000, minMode: 'fixed', due: 27, note: 'Interest-free payment plan', color: 6 },
      ];
      s.debts = D.map(d => ({ ...d, since, start: d.balance }));
      s.debtPlan = { budget: 150000, strategy: 'avalanche', custom: ['d-store', 'd-medical', 'd-visa', 'd-personal', 'd-car', 'd-student'], extras: [{ id: 'x-tax', month: (+year + 1) + '-04', amount: 150000, note: 'Tax refund' }] };
      // a payment on each due day so far: the plan amounts, as if the household followed it
      const months = []; for (let i = 1; i <= +m.slice(5, 7); i++) months.push(year + '-' + String(i).padStart(2, '0'));
      s.debtLog = [];
      months.forEach((mo, i) => D.forEach(d => {
        const day = String(d.due).padStart(2, '0'), date = mo + '-' + day;
        if (date <= since || date > new Date().toISOString().slice(0, 10)) return;
        const amt = d.id === 'd-visa' ? 52000 : d.id === 'd-store' ? (i < 4 ? 13000 : 7500) : d.min;
        s.debtLog.push({ id: uid(), debt: d.id, date, amount: amt, kind: 'payment' });
      }));
      // a statement balance for the Visa in the spring, and one new charge
      s.debtLog.push({ id: uid(), debt: 'd-visa', date: year + '-03-25', amount: 9800, kind: 'charge', note: 'Car repair' });
    },
  },
};
