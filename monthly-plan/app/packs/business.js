/* ===================================================================================
   NICHE PACK · Profit Plan (freelancer & small-business edition)
   Everything that makes this edition a set of business books lives in this block:
   product identity, category groups and their flags (revenue, cost of goods sold,
   overheads, tax set-aside), default categories and their Schedule C lines, the
   estimated-tax calendar, Quick Log words, labels, theme choices and the sample
   business. The engine below is shared with the budget edition.
   =================================================================================== */
const NICHE = {
  id: 'business',
  product: {
    name: 'Profit Plan', mark: 'P', publisher: 'JPS DIGITAL PAGES', version: '1.0',
    tagline: 'Freelance & small-business books', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Profit Plan · Sales, Expenses, P&amp;L &amp; Quarterly Tax', themeColor: '#182635',
    description: 'Profit Plan by JPS Digital Pages. Track sales and expenses, see profit and loss by month, quarter or year, set money aside for quarterly tax and hand your accountant a Schedule C summary. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%23182635"/><path d="M22 48V16h12a9 9 0 0 1 0 18H22" fill="none" stroke="%23E3A73B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: 'Profit Plan. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Know what you really made.</b>Log sales and costs. Watch profit. Put tax money aside before it is due.',
    printTitle: 'Profit Plan · JPS Digital Pages',
  },
  build: { file: 'ProfitPlanBusiness.html' },
  storage: { key: 'jps-profit-plan', file: 'profit-plan' },
  editions: { budget: 'Monthly Plan, the household budget edition' },
  themes: ['ledger', 'sage', 'fjord', 'slate', 'linen', 'night', 'midnight'],
  features: { goals: true, wealth: false, pl: true, tax: true, taxLines: true, mileage: true, invoices: true, channels: true },
  // taxRate in basis points (2500 = 25%). mileageRate in thousandths of the currency per distance unit
  // (700 = 0.70 per mile or km); it starts at 0 because the allowed rate differs by country and year.
  settings: { taxRate: 2500, mileageRate: 0, distanceUnit: 'mi' },
  tourTopics: 'profit, tax set-asides, imports and backups',

  // type: income | expense | saving (money moved aside: not income, not an expense)
  // cogs: cost of goods sold, sits between revenue and gross profit
  // other: income below operating profit · tax: counts as tax set aside
  // fixed: a commitment the dashboard reserves for · debt: can be a payoff goal
  // taxLine: the Schedule C line a new category in this group starts on
  groups: [
    { id: 'revenue', label: 'Sales & revenue', type: 'income', taxLine: 'L1' },
    { id: 'other-income', label: 'Other income', type: 'income', other: true, taxLine: 'L6' },
    { id: 'cogs', label: 'Cost of goods sold', type: 'expense', cogs: true, taxLine: 'L38' },
    { id: 'overhead', label: 'Overheads', type: 'expense', fixed: true, subscription: true, taxLine: 'L27b' },
    { id: 'marketing', label: 'Marketing & selling', type: 'expense', taxLine: 'L8' },
    { id: 'operations', label: 'Running the business', type: 'expense', taxLine: 'L22' },
    { id: 'people', label: 'Contractors & staff', type: 'expense', taxLine: 'L11' },
    { id: 'travel', label: 'Vehicle, travel & meals', type: 'expense', taxLine: 'L24a' },
    { id: 'owner', label: 'Owner’s pay & draws', type: 'saving' },
    { id: 'tax', label: 'Tax set-aside & payments', type: 'saving', tax: true, icon: 'shield' },
    { id: 'reserve', label: 'Business savings', type: 'saving', icon: 'umbrella' },
    { id: 'loans', label: 'Loan repayments', type: 'saving', fixed: true, debt: true },
    // money moving between the business's own accounts: never income, expense or saving
    { id: 'transfer', label: 'Card payments & own transfers', type: 'transfer', debt: true },
  ],
  // [id, name, group, Schedule C line]
  categories: [
    ['client-work', 'Client projects', 'revenue', 'L1'], ['product-sales', 'Product sales', 'revenue', 'L1'], ['retainers', 'Retainers & subscriptions', 'revenue', 'L1'],
    ['other-biz-income', 'Other business income', 'other-income', 'L6'], ['interest', 'Bank interest', 'other-income', 'N'],
    ['materials', 'Materials & supplies for products', 'cogs', 'L38'], ['inventory', 'Stock bought for resale', 'cogs', 'L36'], ['postage', 'Packaging & postage to customers', 'cogs', 'L39'],
    ['software', 'Software & subscriptions', 'overhead', 'L18'], ['phone-internet', 'Phone & internet', 'overhead', 'L25'], ['workspace', 'Workspace rent', 'overhead', 'L20b'], ['insurance', 'Business insurance', 'overhead', 'L15'], ['website', 'Website & hosting', 'overhead', 'L27b'],
    ['advertising', 'Advertising & promotion', 'marketing', 'L8'], ['platform-fees', 'Platform & payment fees', 'marketing', 'L10'],
    ['office', 'Office supplies', 'operations', 'L18'], ['equipment', 'Equipment & computers', 'operations', 'L13'], ['professional', 'Accountant & legal', 'operations', 'L17'], ['licences', 'Licences & business taxes', 'operations', 'L23'], ['training', 'Training & education', 'operations', 'L27b'], ['bank-fees', 'Bank charges', 'operations', 'L27b'], ['loan-interest', 'Loan interest', 'operations', 'L16b'],
    ['contractors', 'Contractors & freelancers', 'people', 'L11'], ['wages', 'Wages', 'people', 'L26'],
    ['fuel', 'Fuel, parking & tolls', 'travel', 'L9'], ['business-travel', 'Business travel', 'travel', 'L24a'], ['meals', 'Business meals', 'travel', 'L24b'],
    ['owner-draw', 'Owner’s draw', 'owner'], ['owner-retirement', 'Owner retirement (SEP-IRA / Solo 401k)', 'owner'],
    ['tax-reserve', 'Tax savings transfer', 'tax'], ['est-tax', 'Income tax paid (estimated & year-end)', 'tax'],
    ['biz-savings', 'Rainy-day fund', 'reserve'], ['equipment-fund', 'Equipment fund', 'reserve'],
    ['loan-repay', 'Business loan repayment', 'loans'],
    ['card-payoff', 'Business card payoff (purchases already logged)', 'transfer'], ['own-transfer', 'Transfer between business accounts', 'transfer'],
  ],
  // US Schedule C (Form 1040). part: income | other | cogs (Part III) | expense (Part II)
  taxForm: { name: 'Schedule C', long: 'Schedule C (Form 1040) · Profit or Loss From Business' },
  taxLines: [
    { id: 'L1', line: '1', label: 'Gross receipts or sales', part: 'income' },
    { id: 'L6', line: '6', label: 'Other income', part: 'other' },
    { id: 'L36', line: '36', label: 'Purchases less cost of items withdrawn for personal use', part: 'cogs' },
    { id: 'L37', line: '37', label: 'Cost of labor', part: 'cogs' },
    { id: 'L38', line: '38', label: 'Materials and supplies', part: 'cogs' },
    { id: 'L39', line: '39', label: 'Other costs', part: 'cogs' },
    { id: 'L8', line: '8', label: 'Advertising', part: 'expense' },
    { id: 'L9', line: '9', label: 'Car and truck expenses', part: 'expense' },
    { id: 'L10', line: '10', label: 'Commissions and fees', part: 'expense' },
    { id: 'L11', line: '11', label: 'Contract labor', part: 'expense' },
    { id: 'L13', line: '13', label: 'Depreciation and section 179 expense', part: 'expense', note: 'Your accountant decides what to expense now and what to depreciate.' },
    { id: 'L14', line: '14', label: 'Employee benefit programs', part: 'expense' },
    { id: 'L15', line: '15', label: 'Insurance (other than health)', part: 'expense' },
    { id: 'L16a', line: '16a', label: 'Mortgage interest (paid to banks)', part: 'expense' },
    { id: 'L16b', line: '16b', label: 'Other interest', part: 'expense' },
    { id: 'L17', line: '17', label: 'Legal and professional services', part: 'expense' },
    { id: 'L18', line: '18', label: 'Office expense', part: 'expense' },
    { id: 'L19', line: '19', label: 'Pension and profit-sharing plans', part: 'expense' },
    { id: 'L20a', line: '20a', label: 'Rent or lease: vehicles, machinery, equipment', part: 'expense' },
    { id: 'L20b', line: '20b', label: 'Rent or lease: other business property', part: 'expense' },
    { id: 'L21', line: '21', label: 'Repairs and maintenance', part: 'expense' },
    { id: 'L22', line: '22', label: 'Supplies', part: 'expense' },
    { id: 'L23', line: '23', label: 'Taxes and licenses', part: 'expense' },
    { id: 'L24a', line: '24a', label: 'Travel', part: 'expense' },
    { id: 'L24b', line: '24b', label: 'Deductible meals', part: 'expense', note: 'Shown at the full amount spent. Business meals are usually 50% deductible.' },
    { id: 'L25', line: '25', label: 'Utilities', part: 'expense' },
    { id: 'L26', line: '26', label: 'Wages (less employment credits)', part: 'expense' },
    { id: 'L27b', line: '27b', label: 'Other expenses (itemised in Part V)', part: 'expense' },
    { id: 'N', line: '—', label: 'Not on Schedule C (personal, or reported elsewhere)', part: 'none', exclude: true },
  ],
  mileageLine: 'L9',
  // US estimated-tax periods (Form 1040-ES): months covered and the payment due date
  taxQuarters: [
    { label: 'Q1', months: [1, 3], due: '04-15' },
    { label: 'Q2', months: [4, 5], due: '06-15' },
    { label: 'Q3', months: [6, 8], due: '09-15' },
    { label: 'Q4', months: [9, 12], due: '01-15', nextYear: true },
  ],
  // Quick Log: a word in the description → category id. Earlier words win, so costs come first.
  aliases: { lunch: 'meals', dinner: 'meals', coffee: 'meals', meal: 'meals', restaurant: 'meals', fuel: 'fuel', petrol: 'fuel', parking: 'fuel', toll: 'fuel', flight: 'business-travel', hotel: 'business-travel', train: 'business-travel', uber: 'business-travel', taxi: 'business-travel', postage: 'postage', shipping: 'postage', usps: 'postage', stamps: 'postage', packaging: 'postage', fabric: 'materials', yarn: 'materials', materials: 'materials', beads: 'materials', stock: 'inventory', inventory: 'inventory', wholesale: 'inventory', adobe: 'software', canva: 'software', figma: 'software', notion: 'software', software: 'software', subscription: 'software', phone: 'phone-internet', internet: 'phone-internet', cowork: 'workspace', studio: 'workspace', insurance: 'insurance', hosting: 'website', domain: 'website', squarespace: 'website', ads: 'advertising', advert: 'advertising', promo: 'advertising', stripe: 'platform-fees', paypal: 'platform-fees', fees: 'platform-fees', etsyfee: 'platform-fees', printer: 'office', ink: 'office', paper: 'office', laptop: 'equipment', camera: 'equipment', accountant: 'professional', bookkeeper: 'professional', lawyer: 'professional', licence: 'licences', license: 'licences', course: 'training', contractor: 'contractors', freelancer: 'contractors', assistant: 'contractors', payroll: 'wages', draw: 'owner-draw', irs: 'est-tax', estimated: 'est-tax', taxpot: 'tax-reserve', setaside: 'tax-reserve', retainer: 'retainers', autopay: 'card-payoff', cardpayment: 'card-payoff', transfer: 'own-transfer', sep: 'owner-retirement', solo401k: 'owner-retirement', retirement: 'owner-retirement', invoice: 'client-work', client: 'client-work', project: 'client-work', sale: 'product-sales', order: 'product-sales', etsy: 'product-sales', shopify: 'product-sales', interest: 'interest' },
  importHints: {
    'credit card payment': 'card-payoff', 'credit card payments': 'card-payoff', 'card payment': 'card-payoff', payment: 'card-payoff', payments: 'card-payoff',
    transfer: 'own-transfer', transfers: 'own-transfer', 'internal transfer': 'own-transfer',
    taxes: 'est-tax', tax: 'est-tax', 'federal tax': 'est-tax', retirement: 'owner-retirement',
    advertising: 'advertising', software: 'software', 'office supplies': 'office', shipping: 'postage', postage: 'postage',
    travel: 'business-travel', 'dining out': 'meals', restaurants: 'meals', fuel: 'fuel', gas: 'fuel', insurance: 'insurance',
    fees: 'bank-fees', 'bank fees': 'bank-fees', income: 'client-work', deposit: 'client-work', sales: 'product-sales',
  },
  defaults: { category: 'client-work', schedule: 'software', annualCategory: 'client-work', quickSetup: ['client-work', 'product-sales', 'materials', 'software', 'advertising', 'tax-reserve'] },

  nav: [['dashboard', 'Dashboard', 'today'], ['pl', 'Profit & loss', 'insights'], ['budget', 'Monthly targets', 'plan'], ['activity', 'Transactions', 'log'], ['invoices', 'Invoices', 'table'], ['tax', 'Quarterly tax', 'shield'], ['taxlines', 'Schedule C summary', 'tags'], ['mileage', 'Mileage log', 'compass'], ['annual', 'Annual overview', 'outlook'], ['goals', 'Reserves & goals', 'umbrella'], ['scheduled', 'Recurring costs', 'calendar'], ['calendar', 'Calendar', 'calendar'], ['insights', 'Insights', 'spark'], ['review', 'Weekly review', 'review'], ['settings', 'Settings & backup', 'palette'], ['guide', 'How to use', 'help']],
  optionalNav: ['invoices', 'mileage', 'annual', 'goals', 'scheduled', 'calendar', 'insights', 'review', 'guide'],
  navGroups: [['Your business', ['dashboard', 'pl', 'budget', 'activity', 'invoices']], ['Tax time', ['tax', 'taxlines', 'mileage']], ['Your rhythm', ['annual', 'goals', 'scheduled', 'calendar', 'insights', 'review']]],
  navGroupRest: 'Make it yours',

  labels: {
    income: 'Revenue', expense: 'Expenses', saving: 'Transfers & draws', savingShort: 'Transfers', savingOne: 'Transfer',
    incomePlanned: 'Expected revenue', incomeReceived: 'Revenue received', expensesPaid: 'Expenses paid', savedInvested: 'Transfers & draws',
    plannedContributions: 'Planned transfers', savingsFilter: 'Transfers & draws', incomeAllocated: 'Your revenue, allocated',
    plannedIncome: 'PLANNED REVENUE', subscriptionKpi: 'Overheads plan', yourName: 'Business name', yourNameHint: 'Shown on your statements and exports',
    greeting: ' · the month at a glance', greetingPlain: 'Your business at a glance', planTitle: 'Your monthly targets', categoryPlaceholder: 'e.g. Stock photography',
    categorySub: 'Shape the categories around how your business really runs.', directionNormal: 'Money in / cost paid / transfer',
    exitDemo: 'Return to my books', demoOnly: 'Your books only', notePlaceholder: 'e.g. Invoice 1042 · Acme Studio',
    incomeOne: 'Revenue', savedCol: 'Transfers', netHint: 'Revenue − expenses − transfers',
    savingRateEmpty: 'Log revenue to see the share moved aside', savingRate: '% of revenue received',
    transfer: 'Card payments & own transfers', transferOne: 'Transfer',
  },
  quickLog: { placeholder: 'client invoice 1200', help: 'Try “client invoice 1200”, “canva 12.99”, “postage 8.40” or “lunch with client 32”.', demo: ['postage', '8.40', 'Packaging & postage to customers'] },

  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Your business books, in one calm place', text: '<p>Log what comes in and what goes out, or import your bank CSV. Profit, cash flow, tax money and a year-end summary build themselves.</p><p>Everything stays in this browser. No bank login, no subscription.</p>' },
    { icon: 'insights', step: 'PROFIT', title: 'See what you made, and where the cash went', text: '<p><b>Profit &amp; loss</b> shows sales, minus what the products cost you, minus running costs, for a month, a quarter, the year so far or any dates you choose. Print it when you need it.</p><p>The <b>Annual overview</b> adds a cash flow statement: what came in, what went out and what you moved aside.</p>' },
    { icon: 'umbrella', step: 'TAX', title: 'Put tax money aside as you go', text: '<p>Choose a set-aside rate. <b>Quarterly tax</b> compares what you should have put aside with what you have.</p><p><b>Not tax, legal or financial advice.</b> The rates, mileage values and form lines use the figures you enter. Tax rules differ by country and change every year, so confirm them with a tax professional.</p>' },
    { icon: 'table', step: 'IMPORT', title: 'Bring in a month of bank transactions', text: '<p>Import a CSV from your bank. Filter by status to fix anything not ready, then import from the top of the list.</p><p>Correct a category once and Profit Plan offers to fix similar transactions and remember the choice.</p>', cta: { label: 'Import a bank CSV', action: 'welcome-import' } },
    'backup',
    { icon: 'check', step: 'START', title: 'Start with one sale or one cost', text: '<p>Log a payment you received or something you paid for today. Your dashboard fills in from there.</p><p>Want a clean slate later? <b>Settings → Start fresh</b> clears the books in one step.</p>', cta: { label: 'Add a transaction', action: 'welcome-log' } },
  ],
  guide: {
    title: 'Four moves. Books you can hand over.',
    cards: [
      ['spark', '1. Log', 'Quick Log sales and costs as they happen, or import a bank CSV each month and fix anything marked not ready.', 'Transactions', 'activity'],
      ['insights', '2. Check profit', 'Read the P&L for the month, the quarter or the year so far, and the cash flow in the Annual overview. Print either.', 'Profit & loss', 'pl'],
      ['shield', '3. Set tax aside', 'Move your set-aside each month and see it against each due date. A savings rule, not tax advice.', 'Quarterly tax', 'tax'],
      ['tags', '4. Hand over', 'Download a line-by-line summary and every transaction for your accountant or tax preparer.', 'Schedule C summary', 'taxlines'],
    ],
    meanings: [['Revenue', 'Money in from sales'], ['Gross profit', 'Revenue − cost of goods'], ['Net profit', 'Gross profit − running costs'], ['Transfers', 'Tax pot, draws, card payoffs']],
    details: [
      ['Not tax, legal or financial advice', 'Profit Plan organises your own records. Every tax figure it shows, from the set-aside to the mileage value and the form lines, comes from the rates, categories and rules you enter. It does not know your tax position, and tax rules differ by country and change every year. Check with a qualified tax professional or accountant before you file, claim or pay tax.'],
      ['Outside the US', 'Profit, cash flow, transactions, invoices and the mileage log work anywhere: set your currency in Settings, and choose miles or kilometres. The <b>Schedule C summary</b> uses US line numbers and the <b>Quarterly tax</b> due dates follow the US estimated-tax calendar. Elsewhere, treat the category totals and set-aside figures as a starting point for your own return and your own payment dates.'],
      ['Mileage rate', 'The mileage rate starts at zero because every country sets its own, and it changes most years (for example the IRS rate in the US, or HMRC’s in the UK). Enter the rate that applies to you in <b>Settings → Tax &amp; mileage</b>. Trips logged before you set it are valued at the new rate.'],
      ['Importing from your bank', 'On the import screen, filter by status to see only the rows that are not ready, fix their category or date, and import them from the button at the top or bottom. When you change a category, Profit Plan offers to update similar transactions and to remember the choice for future imports. Remembered rules are listed in Settings, where you can remove them.'],
      ['Selling in more than one place', 'Add a sales channel for each place you sell (Etsy, Shopify, YouTube, client work…) in <b>Settings → Sales channels</b>, or just type a new one on a transaction. Tag sales and the costs that clearly belong to a channel, such as its fees and postage. Leave shared costs like software untagged. Profit &amp; loss then shows profit for each channel before shared costs, and you can view the statement for one channel at a time. On import, tag rows in bulk; Profit Plan offers to remember the channel for similar descriptions.'],
      ['Owner’s draws, tax money and retirement', 'Paying yourself, moving money to your tax pot, income tax you pay, your own retirement contributions and loan principal are not business expenses, so they never reduce profit. Loan interest is an expense; record it separately. Your accountant will want the totals for retirement contributions and tax paid, which appear under Transfers.'],
      ['Business credit cards and your own transfers', 'If you log or import the card’s purchases, those are the expenses. Paying the card from the business account is then a transfer: use <b>Business card payoff (purchases already logged)</b>, which is never counted. Moving money between your own business accounts is a transfer too.'],
      ['Tax pot and tax payments', 'Log each move into your tax pot as a Tax savings transfer. If you later pay the tax from that pot, do not log the payment again; log Estimated tax payments only when you pay straight from the business account.'],
      ['Cash basis, refunds and invoices', 'A sale counts when the money arrives and a cost when you pay it. Record a refund you give as a reversal on the sale’s category. An invoice becomes revenue when you mark it paid.'],
      ['Tax lines and your accountant', 'Each category carries a Schedule C line, which you can change. The summary groups your year by line so your accountant can check it quickly. It is an organised record, not tax advice or a filed return.'],
      ['Starting over', 'Settings → <b>Start fresh</b> clears the books in one step. Keep your categories and settings, or erase everything. Download a backup first if you might want the data again.'],
    ],
  },

  // the fictional studio behind "Explore sample data": a designer who also sells prints
  sample: {
    name: 'Juniper Studio', opening: 420000, settings: { goalImages: true, goalsLayout: 'grid', mileageRate: 700, distanceUnit: 'mi' },
    note: 'Chase the late invoices and keep the tax pot topped up before the September payment.',
    amounts: { 'client-work': 5600, 'product-sales': 1600, retainers: 900, materials: 260, postage: 180, software: 95, 'phone-internet': 80, workspace: 350, insurance: 45, website: 25, advertising: 220, 'platform-fees': 120, office: 40, professional: 60, contractors: 600, meals: 70, 'owner-draw': 2000, 'tax-reserve': 1400, 'biz-savings': 200 },
    days: { retainers: 1, workspace: 1, software: 3, website: 4, 'phone-internet': 12, insurance: 15, 'owner-draw': 28, 'tax-reserve': 28, 'biz-savings': 28, professional: 20, contractors: 25 },
    undated: ['client-work', 'product-sales', 'materials', 'postage', 'advertising', 'platform-fees', 'office', 'meals'],
    unscheduled: ['client-work', 'product-sales', 'office', 'meals'],
    spread: { groups: ['cogs', 'marketing'], days: [4, 11, 18, 25], notes: ['Order batch', 'Restock', 'Order batch', 'Month end'], share: { default: .26 } },
    // client work and print sales rise and fall through the year; costs follow sales
    actual: (id, month, planned) => {
      const season = [0.7, 0.8, 1.0, 1.1, 0.95, 0.9, 0.75, 0.85, 1.15, 1.2, 1.35, 1.5][month - 1];
      // the rest of client revenue arrives as invoice payments (see extras)
      if (id === 'client-work') return Math.round(planned * 0.46 * [0.9, 1.1, 1.25, 0.8, 1.3, 1.05, 0.6, 0.95, 1.2, 1, 1.1, 1.3][month - 1]);
      if (['product-sales', 'materials', 'postage', 'platform-fees'].includes(id)) return Math.round(planned * season);
      if (id === 'meals') return month % 2 ? planned : Math.round(planned * 0.6);
      if (id === 'office') return month % 3 === 0 ? planned * 2 : 0;
      return planned;
    },
    snapshots: false,
    goals: [
      { category: 'tax-reserve', kind: 'saving', name: 'Tax pot for this year', target: 1600000, opening: 0, due: [0, '12-31'], image: 'emergency' },
      { category: 'biz-savings', kind: 'saving', name: 'Three months of costs in reserve', target: 700000, opening: 250000, due: [1, '06-30'], image: 'investing' },
    ],
    extras: (s, { m, year, now, uid, totals }) => {
      // a few invoices: paid ones already sit in revenue, open ones are receivables
      const clients = ['Acme Studio', 'Northwind Co.', 'Fable & Finch', 'Orchard Health', 'Bright Harbor'];
      const monthNo = +m.slice(5, 7);
      s.invoices = [];
      let n = 1040;
      for (let i = Math.max(1, monthNo - 4); i <= monthNo; i++) {
        const key = `${year}-${String(i).padStart(2, '0')}`;
        [6, 19].forEach((d, j) => {
          const issued = `${key}-${String(d).padStart(2, '0')}`; if (issued > now) return;
          const due = new Date(Date.UTC(+year, i - 1, d + 30)).toISOString().slice(0, 10);
          const amount = [180000, 95000, 240000, 60000, 135000][(i + j) % 5];
          const inv = { id: uid(), number: String(++n), client: clients[(i * 2 + j) % 5], issued, due, amount, category: 'client-work', note: j ? 'Design sprint' : 'Brand refresh, phase ' + (i % 3 + 1) };
          // older invoices are paid; the last five are still open, three of them late
          if (i < monthNo - 2 || (i === monthNo - 2 && j === 0)) {
            const paidOn = new Date(Date.UTC(+year, i - 1, d + 21)).toISOString().slice(0, 10);
            if (paidOn <= now) { const t = { id: uid(), date: paidOn, category: 'client-work', amount, note: `Invoice ${inv.number} · ${inv.client}` }; s.transactions.push(t); inv.paid = { date: paidOn, tx: t.id }; }
          }
          s.invoices.push(inv);
        });
      }
      // business mileage: client visits and supply runs
      s.mileage = [];
      const trips = [['Client workshop · Acme Studio', 'Studio → Acme HQ → Studio', 286], ['Print shop pick-up', 'Studio → Riverside Print → Studio', 94], ['Photo shoot on location', 'Studio → Harbor Park → Studio', 412], ['Craft fair stall', 'Studio → Fairgrounds → Studio', 238]];
      for (let i = 1; i <= monthNo; i++) {
        const key = `${year}-${String(i).padStart(2, '0')}`;
        [5, 14, 22].forEach((d, j) => {
          const date = `${key}-${String(d).padStart(2, '0')}`; if (date > now) return;
          const [purpose, route, miles] = trips[(i + j) % trips.length];
          s.mileage.push({ id: uid(), date, purpose, route, miles });
        });
      }
      // three sales channels: design clients, an Etsy shop and the studio's own web shop.
      // Their sales and direct costs are tagged; rent, software and the like stay shared.
      s.channels = [{ id: 'ch-clients', name: 'Design clients' }, { id: 'ch-etsy', name: 'Etsy' }, { id: 'ch-web', name: 'Web shop' }];
      s.channelRules = { 'etsy': 'ch-etsy', 'invoice': 'ch-clients' };
      // product sales and their costs split roughly 60/40 between Etsy and the web shop
      const seen = {};
      s.transactions.forEach(t => {
        if (['client-work', 'retainers', 'contractors'].includes(t.category)) t.channel = 'ch-clients';
        else if (t.category === 'platform-fees') t.channel = 'ch-etsy';
        else if (['product-sales', 'materials', 'postage', 'advertising'].includes(t.category)) {
          const n = seen[t.category] = (seen[t.category] || 0) + 1;
          t.channel = n % 5 === 1 || n % 5 === 3 ? 'ch-web' : 'ch-etsy';
        }
      });
      s.invoices.forEach(v => { v.channel = 'ch-clients'; });
      // cash carries forward: each month opens with the month before's closing balance
      for (let i = 2; i <= 12; i++) {
        const prev = `${year}-${String(i - 1).padStart(2, '0')}`, key = `${year}-${String(i).padStart(2, '0')}`;
        s.months[key].opening = totals(s, prev).cash;
      }
    },
  },
};
