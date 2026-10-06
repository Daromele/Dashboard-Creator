/* ===================================================================================
   NICHE PACK · Rental Property Tracker
   For small landlords: every property and unit, who rents it, the rent roll (who paid, who's late),
   expenses on their Schedule E lines, and the landlord numbers: cash flow, NOI, cap rate, cash-on-cash.
   Screens live in the core's RentalUI module (features.rental) on top of Rental (pure, tested). This block
   gives the edition its identity, sidebar, words, welcome, guide and the fictional landlord behind sample mode.
   =================================================================================== */
const NICHE = {
  id: 'rental',
  product: {
    name: 'Rental Property Tracker', mark: 'R', publisher: 'LANDLORD BOOKS', version: '1.1',
    tagline: 'Rental property tracker', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Rental Property Tracker · Rent roll, expenses & Schedule E', themeColor: '#1C3C52',
    description: 'Rental Property Tracker by JPS Digital Pages. Properties and units, tenants and leases, a rent roll that shows who paid and who is late, expenses on their Schedule E lines, and your cash flow, NOI, cap rate and cash-on-cash return. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%231C3C52"/><path d="M14 32L32 17l18 15M20 28v19h24V28" fill="none" stroke="%23F2C46D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: 'Rental Property Tracker. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Know every door.</b>Who paid, who’s late, what each property really earns, and Schedule E ready at tax time.',
    printTitle: 'Rental Property Tracker · JPS Digital Pages',
  },
  build: { file: 'RentalPropertyTracker.html' },
  // browser storage keys, the backup-folder database and download names all start with these
  storage: { key: 'jps-rental-tracker', file: 'rental-tracker' },
  // first theme is the default
  themes: ['fjord', 'slate', 'sage', 'linen', 'lavender', 'blush', 'night', 'midnight'],
  features: { goals: false, wealth: false, pl: false, tax: false, taxLines: false, mileage: false, invoices: false, rental: true },
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
  nav: [['dashboard', 'Home', 'today'], ['rentroll', 'Rent roll', 'wallet'], ['props', 'Properties', 'grid'], ['tenants', 'Tenants & leases', 'tags'], ['expenses', 'Finances', 'down'],
    ['rpcal', 'Calendar', 'calendar'], ['rpmaint', 'Repairs', 'edit'],
    ['rppl', 'Profit & loss', 'spark'], ['taxes', 'Schedule E', 'review'], ['rpledger', 'Rent ledger', 'history'], ['rpimport', 'Import bank CSV', 'log'],
    ['rpdocs', 'Letters & notices', 'archive'],
    ['settings', 'Settings & backup', 'palette'], ['guide', 'How it works', 'help']],
  optionalNav: ['rpcal', 'rpmaint', 'rppl', 'taxes', 'rpledger', 'rpimport', 'rpdocs', 'guide'],
  navGroups: [['Your rentals', ['dashboard', 'rentroll', 'props', 'tenants', 'expenses', 'rpcal', 'rpmaint']], ['Money & taxes', ['rppl', 'taxes', 'rpledger', 'rpimport']], ['Paperwork', ['rpdocs']]],
  navGroupRest: 'Make it yours',

  // words used across the screens
  labels: {
    income: 'Income', expense: 'Expenses', saving: 'Savings & investing', savingShort: 'Contributions', savingOne: 'Contribution',
    incomePlanned: 'Expected income', incomeReceived: 'Income received', expensesPaid: 'Expenses paid', savedInvested: 'Saved & invested',
    plannedContributions: 'Planned contributions', savingsFilter: 'Savings & investments',
    plannedIncome: 'PLANNED INCOME', subscriptionKpi: 'Subscription plan', yourName: 'Your name (optional)', yourNameHint: 'What should we call you?',
    greeting: '’s rentals', greetingPlain: 'Your rentals', planTitle: 'Your rentals', categoryPlaceholder: 'e.g. Pest control',
    categorySub: 'Make it fit your rentals.', directionNormal: 'Paid',
    statementKinds: 'a statement',
    importNote: '',
    exitDemo: 'Return to my rentals', demoOnly: 'Your rentals only', demoNote: 'Fictional landlord. Your own properties and tenants stay separate.', notePlaceholder: 'e.g. Check #1042',
    incomeOne: 'Income', savedCol: 'Saved', transfer: 'Transfers (not counted)', transferOne: 'Transfer', netHint: 'Rent received − expenses',
    savingRateEmpty: 'Add rent to see your cash flow', savingRate: '% of rent',
  },
  quickLog: { placeholder: 'coffee 4.50', help: 'Try “coffee 4.50”.', demo: ['coffee', '4.50', 'Dining & coffee'] },

  tourTopics: 'adding properties and tenants, recording rent, expenses, repairs, letters, profit & loss, Schedule E and backups',
  // first-run tour; 'backup' is the shared backup slide
  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Every rental, in one place', text: '<p>Your properties and units, who rents them, what’s come in and what’s gone out. Home shows this month’s cash flow; Finances shows each property’s income, expenses and cash flow for any dates.</p><p>Everything stays on your computer: no bank login, no subscription, no sharing tenant details with anyone.</p>' },
    { icon: 'calendar', step: 'EACH MONTH', title: 'Who paid, who’s late', text: '<p>The rent roll lists every unit: rent due, what arrived and who’s late, with your late fee ready to add.</p>' },
    { icon: 'review', step: 'TAX TIME', title: 'Profit & loss and Schedule E, done as you go', text: '<p>Every expense goes on its Schedule E line, for one property or all of them. Pick any dates for a profit &amp; loss statement; print either for your accountant.</p>' },
    'backup',
    { icon: 'grid', step: 'START', title: 'Start with one property', text: '<p>Its name and units now; the money details whenever you have them.</p>', cta: { label: 'Add my first property', action: 'rp-prop-add' }, finish: 'Look around first' },
  ],
  guide: {
    title: 'Four steps to clear rental books.',
    // [icon, step, what to do, screen label, screen id]
    cards: [
      ['grid', '1. Properties', 'Add each property with its units, what it’s worth and the mortgage payment.', 'Properties', 'props'],
      ['tags', '2. Tenants', 'Add who rents each unit: rent, due day, lease dates and deposit.', 'Tenants & leases', 'tenants'],
      ['calendar', '3. Rent & expenses', 'Record rent as it arrives; add expenses once, with repeats for monthly and yearly ones.', 'Rent roll', 'rentroll'],
      ['review', '4. Tax time', 'Schedule E fills itself: rents and every expense line, by property. Print or export.', 'Schedule E', 'taxes'],
    ],
    meanings: [['Cash flow', 'Rent received minus every expense, mortgage included'], ['NOI', 'Net operating income: rent minus running costs, before the mortgage'], ['Cap rate', 'NOI for a year ÷ what the property is worth'], ['Cash-on-cash', 'A year of cash flow ÷ the cash you put in']],
    details: [
      ['Part payments and late rent', 'Record what arrived, when it arrived. The rent roll shows the rest as still due, and as late once the grace days pass. Add your late fee from the alert when you charge it.'],
      ['The mortgage', 'Enter the monthly payment on the property, and roughly how much of it is interest (your mortgage statement shows it). The interest goes on Schedule E line 12; the principal counts in cash flow but isn’t deductible.'],
      ['Repeating expenses', 'Insurance, property taxes, HOA fees: add them once as monthly or yearly and they appear on their own. Set an end date if one stops.'],
      ['Security deposits', 'Deposits are held, not income. If you keep part of one, record it as a payment for that month.'],
      ['A tenant moves out', 'Edit the lease and set the move-out date. Rent stops after it, the unit shows as vacant, and their history stays.'],
      ['Selling a property', 'Edit it and tick Sold. It leaves your rent and returns, and stays in past Schedule E years.'],
      ['Profit & loss for any dates', 'Profit & loss shows income, running costs, NOI, interest and net income for the dates you pick, one column per property. Expenses do the same: pick the dates and a property to see where the money went.'],
      ['Costs for all your rentals', 'Bookkeeping software, a phone line, mileage to every property: add them as an expense with “General (not one property)”. They count in Profit & loss and Schedule E, but not against one property.'],
      ['Importing your bank’s CSV', 'Download a CSV from your bank and open Import bank CSV. Deposits that match a tenant become rent; withdrawals become expenses on their Schedule E line. You check every line first, mortgage payments are skipped, and lines you brought in before are skipped too.'],
      ['Repairs and tenant requests', 'Log a repair, or a request a tenant phoned in, with how urgent it is. Mark it done with the cost and it goes into your expenses (Repairs, line 14) in one step. Urgent ones show on Home.'],
      ['Letters & notices', 'Welcome letter, rent receipt, late rent, late fee, rent increase, renewal offer, notice of entry, lease violation, notice to vacate, move-out instructions and deposit return. Each fills in from your records; change any words, save your wording, print or copy. Notice rules differ by state: check yours.'],
      ['Cash flow by property', 'Finances: pick the dates, and the Summary by property table shows each property’s income, running costs, NOI, interest, principal and cash flow side by side. Profit & loss has the full statement; the Home chart can show one property.'],
      ['Letters for a group', 'In Letters & notices, “To” can be one tenant, every tenant at one building, every tenant, or nobody (a blank template).'],
      ['The calendar', 'A week view by default (Month is one click away); filter by rent, bills, lease dates and repairs, or by property. Rent due dates (green once paid, red when late), repeating bills and the mortgage, lease ends and move-outs, and scheduled repairs, on one month. Click a rent to record it.'],
      ['Depreciation', 'Not worked out here: it depends on your purchase price, land value and the year you started renting. Your tax pro can add it.'],
      ['Is this tax advice?', 'No. It’s a worksheet of your own numbers, laid out like Schedule E, to make tax time easier.'],
    ],
  },

  // the fictional landlord behind "Explore sample data": three properties, one late tenant, one lease ending, one vacancy
  sample: {
    name: 'Morgan', opening: 0, settings: { rpLandlord: { name: 'Morgan Rentals LLC', phone: '(555) 010-2000', email: 'morgan@example.com' } },
    note: 'Record rent as it arrives.',
    extraCategories: [],
    amounts: {},
    days: {},
    undated: [],
    spread: { groups: [], days: [], notes: [], share: { default: .5 } },
    goals: [],
    extras: (s, { uid }) => {
      const t = new Date().toISOString().slice(0, 10), now = t.slice(0, 7), day = +t.slice(8, 10), pad = n => String(n).padStart(2, '0');
      const addM = (ym, n) => { const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n, Y = y + Math.floor(m / 12), M = ((m % 12) + 12) % 12 + 1; return `${Y}-${pad(M)}`; };
      const addD = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
      const start = addM(now, -17), first = start + '-01';
      s.rpProps = [
        { id: 'p-maple', name: 'Maple Street duplex', kind: 'multi', addr: '12 Maple St', units: [{ id: 'u-ma', name: 'Unit A' }, { id: 'u-mb', name: 'Unit B' }], value: 42000000, price: 36000000, invested: 8500000, loan: { payment: 185000, interest: 130000, start: first }, added: first, color: 0 },
        { id: 'p-oak', name: 'Oak Lane house', kind: 'single', addr: '48 Oak Ln', units: [{ id: 'u-oak', name: 'Whole property' }], value: 38500000, price: 30000000, invested: 7000000, loan: { payment: 160000, interest: 105000, start: first }, added: first, color: 1 },
        { id: 'p-harbor', name: 'Harbor View condo', kind: 'condo', addr: '7 Harbor View, #304', units: [{ id: 'u-hv', name: 'Condo' }], value: 24000000, price: 21500000, invested: 21500000, added: first, color: 2 },
      ];
      // Oak's rent is late on any day the sample opens (its grace is shorter early in the month)
      const oakGrace = day >= 7 ? 5 : 0;
      s.rpLeases = [
        { id: 'l-sam', prop: 'p-maple', unit: 'u-ma', tenant: 'Sam Rivera', rent: 145000, due: 1, grace: 5, lateFee: 5000, deposit: 145000, start: addM(start, -4) + '-01', end: addM(now, 7) + '-30' },
        { id: 'l-priya', prop: 'p-maple', unit: 'u-mb', tenant: 'Priya Shah', rent: 140000, due: 1, grace: 5, lateFee: 5000, deposit: 140000, start: addM(now, -11) + '-01', end: addD(t, 41) },
        { id: 'l-ng', prop: 'p-oak', unit: 'u-oak', tenant: 'The Nguyen family', rent: 210000, due: 1, grace: oakGrace, lateFee: 7500, deposit: 210000, start: start + '-01' },
        { id: 'l-lee', prop: 'p-harbor', unit: 'u-hv', tenant: 'Jordan Lee', rent: 175000, due: 3, grace: 5, lateFee: 5000, deposit: 175000, start: start + '-01', end: addM(now, -1) + '-28', out: addM(now, -1) + '-28' },
      ];
      s.rpPays = [];
      for (let k = 0; k < 18; k++) {
        const m = addM(start, k), cur = m === now;
        const pay = (lease, rent, d, part) => s.rpPays.push({ id: uid(), lease, month: m, date: `${m}-${pad(d)}`, amount: part || rent });
        if (!cur || day >= 1) pay('l-sam', 145000, k % 5 === 2 ? 4 : 1);
        if (m >= addM(now, -11) && (!cur || day >= 2)) pay('l-priya', 140000, k % 4 === 1 ? 3 : 2);
        if (!cur) pay('l-ng', 210000, k === 9 ? 9 : 1); else pay('l-ng', 210000, 1, 100000);
        if (m < now) pay('l-lee', 175000, 3);
        if (k === 9) s.rpPays.push({ id: uid(), lease: 'l-ng', month: m, date: `${m}-09`, amount: 7500, kind: 'fee' });
      }
      const y0 = start, ins = addM(start, 1);
      s.rpExps = [
        { id: uid(), prop: 'p-maple', date: ins + '-15', amount: 138000, cat: 'insurance', note: 'Landlord insurance', repeat: 'yearly' },
        { id: uid(), prop: 'p-maple', date: addM(y0, 2) + '-10', amount: 420000, cat: 'taxes', note: 'Property taxes', repeat: 'yearly' },
        { id: uid(), prop: 'p-maple', date: first.slice(0, 8) + '20', amount: 14000, cat: 'utilities', note: 'Water & sewer', repeat: 'monthly' },
        { id: uid(), prop: 'p-maple', date: first.slice(0, 8) + '12', amount: 8500, cat: 'cleaning', note: 'Lawn & snow', repeat: 'monthly' },
        { id: 'e-plumb', prop: 'p-maple', date: addM(now, -5) + '-18', amount: 34000, cat: 'repairs', note: 'Harbor Plumbing: kitchen leak', repeat: 'once' },
        { id: uid(), prop: 'p-maple', date: addM(now, -2) + '-06', amount: 6400, cat: 'supplies', note: 'Smoke detectors', repeat: 'once' },
        { id: uid(), prop: 'p-oak', date: addM(start, 4) + '-22', amount: 115000, cat: 'insurance', note: 'Landlord insurance', repeat: 'yearly' },
        { id: uid(), prop: 'p-oak', date: addM(y0, 5) + '-10', amount: 360000, cat: 'taxes', note: 'Property taxes', repeat: 'yearly' },
        { id: uid(), prop: 'p-oak', date: addM(now, -9) + '-14', amount: 125000, cat: 'repairs', note: 'Water heater replaced', repeat: 'once' },
        { id: 'e-furn', prop: 'p-oak', date: addM(now, -3) + '-02', amount: 18000, cat: 'repairs', note: 'Northside Heating: furnace service', repeat: 'once' },
        { id: uid(), prop: 'p-harbor', date: first.slice(0, 8) + '05', amount: 32000, cat: 'hoa', note: 'HOA fees', repeat: 'monthly' },
        { id: uid(), prop: 'p-harbor', date: addM(start, 10) + '-28', amount: 52000, cat: 'insurance', note: 'Condo insurance', repeat: 'yearly' },
        { id: uid(), prop: 'p-harbor', date: addM(y0, 8) + '-10', amount: 230000, cat: 'taxes', note: 'Property taxes', repeat: 'yearly' },
        { id: uid(), prop: 'p-harbor', date: addM(now, -1) + '-26', amount: 4500, cat: 'advertising', note: 'Rental listing', repeat: 'once' },
        { id: uid(), prop: 'p-harbor', date: addM(now, -1) + '-29', amount: 22000, cat: 'cleaning', note: 'Turnover cleaning', repeat: 'once' },
        { id: uid(), prop: 'p-harbor', date: addM(now, -6) + '-11', amount: 15000, cat: 'legal', note: 'Lease review', repeat: 'once' },
        // costs for all three rentals, not one
        { id: uid(), prop: '', date: first.slice(0, 8) + '08', amount: 1500, cat: 'other', note: 'Bookkeeping software', repeat: 'monthly' },
        { id: uid(), prop: '', date: addM(start, 3) + '-15', amount: 18500, cat: 'other', note: 'Landlord association dues', repeat: 'yearly' },
      ];
      // repairs: an urgent one a tenant reported, one booked, one to do before listing, and two finished ones already in expenses
      s.rpJobs = [
        { id: uid(), prop: 'p-oak', unit: 'u-oak', lease: 'l-ng', title: 'No hot water upstairs', reported: addD(t, -1), status: 'open', urgent: true, notes: 'Water heater is new; check the pilot light first.' },
        { id: uid(), prop: 'p-maple', unit: 'u-mb', lease: 'l-priya', title: 'Bathroom fan is noisy', reported: addD(t, -6), status: 'scheduled', when: addD(t, 3), vendor: 'Harbor Electric' },
        { id: uid(), prop: 'p-harbor', unit: 'u-hv', title: 'Repaint before listing', reported: addD(t, -20), status: 'open' },
        { id: uid(), prop: 'p-maple', unit: 'u-ma', lease: 'l-sam', title: 'Kitchen leak under the sink', reported: addM(now, -5) + '-15', status: 'done', done: addM(now, -5) + '-18', vendor: 'Harbor Plumbing', cost: 34000, exp: 'e-plumb' },
        { id: uid(), prop: 'p-oak', unit: 'u-oak', title: 'Furnace service', reported: addM(now, -3) + '-01', status: 'done', done: addM(now, -3) + '-02', vendor: 'Northside Heating', cost: 18000, exp: 'e-furn' },
      ];
    },
  },
};
