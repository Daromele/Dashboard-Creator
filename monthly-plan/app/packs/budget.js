/* ===================================================================================
   NICHE PACK · Monthly Plan (household budget edition)
   Everything that makes this edition a budget planner lives in this block: product
   identity, category groups and their flags, default categories, Quick Log words,
   screen labels, theme choices and the sample household. The engine below is shared
   with every other edition — change this block, not the code under it.
   =================================================================================== */
const NICHE = {
  id: 'budget',
  product: {
    name: 'Monthly Plan', mark: 'M', publisher: 'JPS DIGITAL PAGES', version: '2.2',
    tagline: 'Monthly & annual budget', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Monthly Plan · Monthly & Annual Budget', themeColor: '#382750',
    description: 'Monthly Plan by JPS Digital Pages. Plan your monthly budget, track your spending, and see the whole year clearly. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%23382750"/><path d="M15 46V18l17 18 17-18v28" fill="none" stroke="%23F4BD98" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: "Monthly Plan. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Adapted from the owner's Payday Plan ADHD template. Personal-use customer edition.",
    railNote: '<b>A plan for your real life.</b>Plan the month. Follow your progress. Make room for what matters.',
    printTitle: 'Monthly Plan · JPS Digital Pages',
  },
  build: { file: 'MonthlyBudgetPlanner.html' },
  // browser storage keys, the backup-folder database and download names all start with these
  storage: { key: 'jps-monthly-plan', file: 'monthly-plan' },
  // first theme is the default
  themes: ['lavender', 'sage', 'linen', 'fjord', 'blush', 'slate', 'night', 'midnight'],
  features: { goals: true, wealth: true, pl: false, tax: false, taxLines: false, mileage: false, invoices: false },
  settings: {},

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
    ['platform-payout', 'Platform payouts & top-ups (already imported)', 'transfer'],
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
  nav: [['dashboard', 'Monthly dashboard', 'today'], ['annual', 'Annual dashboard', 'insights'], ['budget', 'Monthly budget', 'plan'], ['activity', 'Transactions', 'log'], ['goals', 'Savings & goals', 'umbrella'], ['scheduled', 'Recurring payments', 'calendar'], ['calendar', 'Calendar', 'calendar'], ['wealth', 'Wealth snapshots', 'outlook'], ['insights', 'Insights', 'spark'], ['review', 'Weekly review', 'review'], ['settings', 'Settings & backup', 'palette'], ['guide', 'How to use', 'help']],
  optionalNav: ['annual', 'goals', 'scheduled', 'calendar', 'wealth', 'insights', 'review', 'guide'],
  navGroups: [['Your money', ['dashboard', 'annual', 'budget', 'activity', 'goals', 'scheduled']], ['Your rhythm', ['calendar', 'wealth', 'insights', 'review']]],
  navGroupRest: 'Make it yours',

  // words used across the screens
  labels: {
    income: 'Income', expense: 'Expenses', saving: 'Savings & investing', savingShort: 'Contributions', savingOne: 'Contribution',
    incomePlanned: 'Expected income', incomeReceived: 'Income received', expensesPaid: 'Expenses paid', savedInvested: 'Saved & invested',
    plannedContributions: 'Planned contributions', savingsFilter: 'Savings & investments',
    plannedIncome: 'PLANNED INCOME', subscriptionKpi: 'Subscription plan', yourName: 'Your name (optional)', yourNameHint: 'What should we call you?',
    greeting: '’s month at a glance', greetingPlain: 'Your month at a glance', planTitle: 'Your monthly plan', categoryPlaceholder: 'e.g. Childcare',
    categorySub: 'Make your budget fit your life.', directionNormal: 'Income received / expense paid / contribution',
    exitDemo: 'Return to my budget', demoOnly: 'Your budget only', notePlaceholder: 'e.g. Weekly groceries',
    incomeOne: 'Income', savedCol: 'Saved', transfer: 'Transfers (not counted)', transferOne: 'Transfer', netHint: 'Income − expenses − savings',
    savingRateEmpty: 'Log income to see your savings rate', savingRate: '% of income received',
  },
  quickLog: { placeholder: 'coffee 4.50', help: 'Try “coffee 4.50”, “rent 1200”, or “salary 2400”.', demo: ['coffee', '4.50', 'Dining & coffee'] },

  // first-run tour; 'backup' is the shared backup slide
  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Your whole year, in one calm place', text: '<p>Plan one month at a time, then watch your annual picture build automatically.</p><p>You can start small and add detail whenever you are ready.</p>' },
    { icon: 'plan', step: 'PLAN', title: 'Give every amount a purpose', text: '<p>Set expected income, spending limits and contributions. <b>Left to assign</b> shows what still needs a job.</p>' },
    { icon: 'spark', step: 'TRACK', title: 'Log everyday money in one line', text: '<p>Type <code>coffee 4.50</code>. Quick Log learns the category you confirm and remembers it next time.</p>' },
    'backup',
    { icon: 'check', step: 'START', title: 'Start with one transaction', text: '<p>Add anything you spent today — a coffee is enough. The dashboard fills in from there, and you can set your monthly plan whenever you are ready.</p>', cta: { label: 'Add a transaction', action: 'welcome-log' } },
  ],
  guide: {
    title: 'Four moves. One calmer routine.',
    // [icon, step, what to do, screen label, screen id]
    cards: [
      ['plan', '1. Plan', 'Set income, limits and contributions. Apply recurring amounts when useful.', 'Monthly budget', 'budget'],
      ['spark', '2. Track', 'Quick Log everyday items. Import a bank CSV, then match scheduled payments.', 'Transactions', 'activity'],
      ['review', '3. Reflect', 'Check the dashboard, complete a weekly review and adjust the plan.', 'Weekly review', 'review'],
      ['calendar', '4. Close', 'Reconcile, save a snapshot, back up and close the month.', 'Calendar', 'calendar'],
    ],
    meanings: [['Plan', 'What you intend'], ['Actual', 'What you logged'], ['Cash flow', 'Income − outgoings'], ['Wealth', 'Assets − debt']],
    details: [
      ['A side hustle on Etsy, PayPal or Patreon', 'On the Import screen, a statement from Etsy, Shopify, PayPal, Stripe, YouTube, Patreon or a similar platform is recognised automatically. Sales and the platform’s fees both land in <b>Side hustle</b>, so it shows what actually reached you, and payouts to your bank are skipped. After that, deposits from that platform in your bank file go to <b>Platform payouts &amp; top-ups (already imported)</b>, which is never counted, so nothing is counted twice.'],
      ['Money in other currencies', 'Record what reached or left your account in your own currency, and open <b>In another currency?</b> on the transaction to keep the original amount; the rate you enter works the amount out for you and is remembered. Imports convert rows in another currency at a rate you set on the review screen. The rates you use are listed in <b>Settings → Other currencies</b>.'],
      ['Dig into any number', 'Click a card at the top of the dashboard to see the transactions behind it; <b>Avg. monthly cash flow</b> opens the Annual dashboard. Click a slice of any donut to list its transactions. On Transactions, pick a group and then a category, sort any column, and read the total of what is shown at the bottom.'],
      ['Transfers, refunds and credit cards', 'If you log or import your credit-card purchases, those are the expenses. The payment from your checking account to the card is then a transfer: put it in <b>Credit card payoff (purchases already logged)</b>, which is never counted as spending. If you do not track the card’s purchases, use <b>Credit card payment</b> instead, so the payment counts as the expense. Moves between your own accounts go in <b>Transfer between my accounts</b>. Record a savings transfer once, and use reversal for a refund or withdrawal.'],
      ['Recurring payments and closed months', 'Schedules are reminders, never automatic payments. Record or match the actual entry. Closing a month protects its budget, transactions and scheduled history until you reopen it.'],
    ],
  },

  // the fictional household behind "Explore sample data"
  sample: {
    name: 'Alex', opening: 50000, settings: { goalImages: true, goalsLayout: 'grid' },
    note: 'Build a little breathing room. Keep dining within plan and make the travel transfer.',
    extraCategories: [['car-loan', 'Car loan payment', 'debt']],
    amounts: { salary: 3600, side: 450, spouse: 1800, housing: 1550, utilities: 180, internet: 90, insurance: 120, streaming: 35, memberships: 45, credit: 220, loan: 180, 'car-loan': 300, groceries: 520, transport: 180, dining: 160, personal: 180, travel: 250, 'annual-bills': 120, emergency: 500, investing: 400 },
    // day of the month each amount lands; the rest fall on their position in the list
    days: { salary: 1, spouse: 1, side: 20, insurance: 26, memberships: 24, loan: 27, 'annual-bills': 25, 'car-loan': 18 },
    undated: ['groceries', 'transport', 'dining', 'personal'],
    spread: { groups: ['variable'], days: [3, 9, 16, 23, 28], notes: ['Weekly shop', 'Top-up', 'Weekend', 'Weekly shop', 'Month end'], share: { dining: .24, default: .17 } },
    snapshots: true,
    goals: [
      { category: 'travel', kind: 'saving', name: 'A holiday, already paid for', target: 300000, opening: 40000, due: [0, '12-31'], image: 'travel' },
      { category: 'emergency', kind: 'saving', name: 'Build a cushion', target: 1000000, opening: 150000, due: [1, '06-30'], image: 'emergency' },
      { category: 'investing', kind: 'saving', name: 'Invest consistently', target: 480000, opening: 0, due: [0, '12-31'], image: 'investing' },
      { category: 'credit', kind: 'debt', name: 'Clear the credit card', target: 264000, opening: 66000, due: [0, '12-31'] },
      { category: 'loan', kind: 'debt', name: 'Pay off the personal loan', target: 300000, opening: 60000, due: [1, '06-30'] },
      { category: 'car-loan', kind: 'debt', name: 'Finish the car loan', target: 600000, opening: 90000, due: [1, '12-31'] },
    ],
  },
};
