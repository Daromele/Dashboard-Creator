/* ===================================================================================
   NICHE PACK · Creator Plan (YouTubers, streamers, podcasters & online creators)
   Built on the Profit Plan engine: the same P&L, tax set-aside, Schedule C summary,
   invoices and business health, with creator income streams (ad revenue, brand deals,
   memberships, affiliates, digital products), creator costs, income streams set up as
   channels, creator wording and a fictional creator for the sample.
   =================================================================================== */
const NICHE = {
  id: 'creator',
  product: {
    name: 'Creator Plan', mark: 'C', publisher: 'JPS DIGITAL PAGES', version: '1.0',
    tagline: 'Books for YouTubers, streamers & online creators', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Creator Plan · Income Streams, Brand Deals, P&amp;L &amp; Tax Set-Aside', themeColor: '#2A1F3D',
    description: 'Creator Plan by JPS Digital Pages. Track ad revenue, brand deals, memberships, affiliates and product sales in one place, see profit for each income stream, chase late sponsor invoices and set money aside for tax. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%232A1F3D"/><path d="M42 20a15 15 0 1 0 0 24" fill="none" stroke="%23F0A6B8" stroke-width="6" stroke-linecap="round"/><path d="M29 26l10 6-10 6z" fill="%23F0A6B8"/></svg>',
    notice: 'Creator Plan. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Every stream, one clear picture.</b>See what each platform really pays. Chase brand deals. Put tax money aside.',
    printTitle: 'Creator Plan · JPS Digital Pages',
  },
  build: { file: 'CreatorPlan.html' },
  storage: { key: 'jps-creator-plan', file: 'creator-plan' },
  editions: { budget: 'Monthly Plan, the household budget edition', business: 'Profit Plan, the small-business edition' },
  themes: ['blush', 'lavender', 'fjord', 'sage', 'slate', 'night', 'midnight'],
  features: { goals: true, wealth: false, pl: true, tax: true, taxLines: true, mileage: false, invoices: true, channels: true },
  // taxRate in basis points (2500 = 25%)
  settings: { taxRate: 2500, mileageRate: 0, distanceUnit: 'mi' },
  tourTopics: 'income streams, brand deals, tax set-asides and backups',
  // offered as one-click income streams in Settings
  suggestedChannels: ['YouTube', 'TikTok', 'Instagram', 'Twitch', 'Patreon', 'Substack', 'Podcast', 'Etsy', 'Shopify', 'Brand deals', 'Affiliates'],

  // type: income | expense | saving (money moved aside: not income, not an expense)
  // cogs: cost of goods sold · other: income below operating profit · tax: counts as tax set aside
  // fixed: a commitment the dashboard reserves for · debt: can be a payoff goal
  // taxLine: the Schedule C line a new category in this group starts on
  groups: [
    { id: 'revenue', label: 'Creator income', type: 'income', taxLine: 'L1' },
    { id: 'other-income', label: 'Other income', type: 'income', other: true, taxLine: 'L6' },
    { id: 'cogs', label: 'Merch & product costs', type: 'expense', cogs: true, taxLine: 'L38' },
    { id: 'production', label: 'Production & gear', type: 'expense', taxLine: 'L22' },
    { id: 'tools', label: 'Tools & overheads', type: 'expense', fixed: true, subscription: true, taxLine: 'L27b' },
    { id: 'growth', label: 'Growth & platform fees', type: 'expense', taxLine: 'L8' },
    { id: 'team', label: 'Editors, team & agents', type: 'expense', taxLine: 'L11' },
    { id: 'operations', label: 'Running the business', type: 'expense', taxLine: 'L27b' },
    { id: 'travel', label: 'Travel & meals', type: 'expense', taxLine: 'L24a' },
    { id: 'owner', label: 'Your pay & draws', type: 'saving' },
    { id: 'tax', label: 'Tax set-aside & payments', type: 'saving', tax: true, icon: 'shield' },
    { id: 'reserve', label: 'Business savings', type: 'saving', icon: 'umbrella' },
    { id: 'loans', label: 'Loan repayments', type: 'saving', fixed: true, debt: true },
    { id: 'transfer', label: 'Card payments & own transfers', type: 'transfer', debt: true },
  ],
  // [id, name, group, Schedule C line]
  categories: [
    ['ad-revenue', 'Ad revenue (AdSense, TikTok, Reels)', 'revenue', 'L1'], ['sponsorships', 'Sponsorships & brand deals', 'revenue', 'L1'], ['memberships', 'Memberships (Patreon, channel, Substack)', 'revenue', 'L1'],
    ['affiliate', 'Affiliate income', 'revenue', 'L1'], ['digital-products', 'Digital products & courses', 'revenue', 'L1'], ['merch', 'Merch & physical products', 'revenue', 'L1'],
    ['tips', 'Tips, donations & gifted subs', 'revenue', 'L1'], ['licensing', 'Licensing & usage fees', 'revenue', 'L1'],
    ['other-biz-income', 'Other business income', 'other-income', 'L6'], ['interest', 'Bank interest', 'other-income', 'N'],
    ['merch-production', 'Merch production (print on demand, runs)', 'cogs', 'L38'], ['postage', 'Shipping & packaging', 'cogs', 'L39'],
    ['equipment', 'Cameras, mics & lighting', 'production', 'L13'], ['props', 'Props, sets & materials', 'production', 'L22'], ['music-stock', 'Music, stock footage & fonts', 'production', 'L27b'],
    ['software', 'Editing software & apps', 'tools', 'L18'], ['phone-internet', 'Phone & internet', 'tools', 'L25'], ['website', 'Website, hosting & email', 'tools', 'L27b'], ['studio', 'Studio or workspace rent', 'tools', 'L20b'],
    ['advertising', 'Ads & promotion', 'growth', 'L8'], ['platform-fees', 'Platform & payment fees', 'growth', 'L10'], ['giveaways', 'Giveaways & PR packages', 'growth', 'L27b'],
    ['editors', 'Editors, designers & thumbnails', 'team', 'L11'], ['assistants', 'Assistants & moderators', 'team', 'L11'], ['agent-fees', 'Agent & management commission', 'team', 'L10'],
    ['professional', 'Accountant & legal', 'operations', 'L17'], ['training', 'Courses & coaching', 'operations', 'L27b'], ['insurance', 'Insurance', 'operations', 'L15'], ['bank-fees', 'Bank charges', 'operations', 'L27b'], ['licences', 'Licences & business taxes', 'operations', 'L23'],
    ['content-travel', 'Travel for content & events', 'travel', 'L24a'], ['meals', 'Business meals', 'travel', 'L24b'],
    ['owner-draw', 'Pay yourself (owner’s draw)', 'owner'], ['owner-retirement', 'Your retirement (SEP-IRA / Solo 401k)', 'owner'],
    ['tax-reserve', 'Tax savings transfer', 'tax'], ['est-tax', 'Income tax paid (estimated & year-end)', 'tax'],
    ['biz-savings', 'Rainy-day fund', 'reserve'], ['gear-fund', 'Gear upgrade fund', 'reserve'],
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
  // Quick Log: a word in the description → category id. Words match inside longer words and earlier
  // ones win, so specific names (epidemic, adsense, fee) come before short ones (mic, ads).
  aliases: { epidemic: 'music-stock', artlist: 'music-stock', envato: 'music-stock', printful: 'merch-production', printify: 'merch-production', capcut: 'software', descript: 'software', premiere: 'software', finalcut: 'software', squarespace: 'website', vidcon: 'content-travel', airbnb: 'content-travel', fees: 'platform-fees', fee: 'platform-fees', stripe: 'platform-fees', paypal: 'platform-fees', adsense: 'ad-revenue', creatorfund: 'ad-revenue', youtube: 'ad-revenue', tiktok: 'ad-revenue', reels: 'ad-revenue', patreon: 'memberships', substack: 'memberships', membership: 'memberships', members: 'memberships', sponsorship: 'sponsorships', sponsor: 'sponsorships', affiliate: 'affiliate', associates: 'affiliate', amazon: 'affiliate', gumroad: 'digital-products', ebook: 'digital-products', etsy: 'digital-products', superchat: 'tips', kofi: 'tips', donation: 'tips', licensing: 'licensing', license: 'licensing', lunch: 'meals', dinner: 'meals', coffee: 'meals', meal: 'meals', flight: 'content-travel', hotel: 'content-travel', uber: 'content-travel', shipping: 'postage', postage: 'postage', packaging: 'postage', camera: 'equipment', lens: 'equipment', mic: 'equipment', microphone: 'equipment', light: 'equipment', lighting: 'equipment', tripod: 'equipment', laptop: 'equipment', props: 'props', prop: 'props', materials: 'props', music: 'music-stock', stock: 'music-stock', font: 'music-stock', adobe: 'software', canva: 'software', notion: 'software', software: 'software', phone: 'phone-internet', internet: 'phone-internet', hosting: 'website', domain: 'website', studio: 'studio', ads: 'advertising', promo: 'advertising', boost: 'advertising', giveaway: 'giveaways', editor: 'editors', editing: 'editors', thumbnail: 'editors', designer: 'editors', moderator: 'assistants', assistant: 'assistants', manager: 'agent-fees', agent: 'agent-fees', commission: 'agent-fees', accountant: 'professional', lawyer: 'professional', course: 'training', coaching: 'training', insurance: 'insurance', draw: 'owner-draw', irs: 'est-tax', estimated: 'est-tax', taxpot: 'tax-reserve', setaside: 'tax-reserve', autopay: 'card-payoff', cardpayment: 'card-payoff', transfer: 'own-transfer', sep: 'owner-retirement', solo401k: 'owner-retirement', retirement: 'owner-retirement', brand: 'sponsorships', deal: 'sponsorships', tips: 'tips', bits: 'tips', preset: 'digital-products', merch: 'merch', interest: 'interest' },
  importHints: {
    'credit card payment': 'card-payoff', 'credit card payments': 'card-payoff', 'card payment': 'card-payoff', payment: 'card-payoff', payments: 'card-payoff',
    transfer: 'own-transfer', transfers: 'own-transfer', 'internal transfer': 'own-transfer',
    taxes: 'est-tax', tax: 'est-tax', 'federal tax': 'est-tax', retirement: 'owner-retirement',
    advertising: 'advertising', software: 'software', shipping: 'postage', postage: 'postage', electronics: 'equipment',
    travel: 'content-travel', 'dining out': 'meals', restaurants: 'meals', insurance: 'insurance',
    fees: 'bank-fees', 'bank fees': 'bank-fees', income: 'sponsorships', deposit: 'ad-revenue', sales: 'digital-products',
  },
  defaults: { category: 'ad-revenue', schedule: 'software', annualCategory: 'ad-revenue', quickSetup: ['ad-revenue', 'sponsorships', 'memberships', 'editors', 'software', 'tax-reserve'] },

  nav: [['dashboard', 'Dashboard', 'today'], ['pl', 'Profit & loss', 'insights'], ['budget', 'Monthly targets', 'plan'], ['activity', 'Transactions', 'log'], ['invoices', 'Brand deals & invoices', 'table'], ['tax', 'Quarterly tax', 'shield'], ['taxlines', 'Schedule C summary', 'tags'], ['annual', 'Annual overview', 'outlook'], ['goals', 'Reserves & goals', 'umbrella'], ['scheduled', 'Recurring costs', 'calendar'], ['calendar', 'Calendar', 'calendar'], ['insights', 'Creator health', 'spark'], ['review', 'Weekly review', 'review'], ['settings', 'Settings & backup', 'palette'], ['guide', 'How to use', 'help']],
  optionalNav: ['invoices', 'annual', 'goals', 'scheduled', 'calendar', 'insights', 'review', 'guide'],
  navGroups: [['Your creator business', ['dashboard', 'pl', 'budget', 'activity', 'invoices']], ['Tax time', ['tax', 'taxlines']], ['Your rhythm', ['annual', 'goals', 'scheduled', 'calendar', 'insights', 'review']]],
  navGroupRest: 'Make it yours',

  labels: {
    income: 'Income', expense: 'Expenses', saving: 'Transfers & draws', savingShort: 'Transfers', savingOne: 'Transfer',
    incomePlanned: 'Expected income', incomeReceived: 'Income received', expensesPaid: 'Expenses paid', savedInvested: 'Transfers & draws',
    plannedContributions: 'Planned transfers', savingsFilter: 'Transfers & draws',
    plannedIncome: 'PLANNED INCOME', subscriptionKpi: 'Overheads plan', yourName: 'Creator or business name', yourNameHint: 'Shown on your statements and exports',
    greeting: ' · the month at a glance', greetingPlain: 'Your creator business at a glance', planTitle: 'Your monthly targets', categoryPlaceholder: 'e.g. Twitch subs',
    categorySub: 'Shape the categories around how you actually earn and spend.', directionNormal: 'Money in / cost paid / transfer',
    exitDemo: 'Return to my books', demoOnly: 'Your books only', notePlaceholder: 'e.g. AdSense payout · August',
    incomeOne: 'Income', savedCol: 'Transfers', netHint: 'Income − expenses − transfers',
    savingRateEmpty: 'Log income to see the share moved aside', savingRate: '% of income received',
    transfer: 'Card payments & own transfers', transferOne: 'Transfer',
    noPlan: 'No monthly target set', editPlan: 'Edit targets',
    rhythmPlan: 'Set this month’s income and cost targets', incomeWeek: 'Income this week', channelOne: 'Income stream', channelShort: 'stream', healthEyebrow: 'Creator health', healthTitle: 'How healthy is your creator business?', channelsTitle: 'Income streams', channelsIntro: 'Add a stream for each place you earn (YouTube, TikTok, Patreon, Etsy, brand deals…) and tag income, and the costs that belong to it, with that stream. Profit &amp; loss then shows profit for each stream. Leave shared costs like software untagged.', reviewDaysNote: 'Days with at least one payout or cost logged.',
    reviewChecks: ['I matched this week’s payouts and costs to my bank and card statements.', 'I followed up on brand-deal invoices that are due or late.', 'I moved this week’s tax set-aside and checked the bills coming next.'],
    goalsEyebrow: 'Build a cushion', goalsTitle: 'Reserves, goals & loan payoff', goalsPlanTitle: 'This month’s transfers', goalsPlanSub: 'Draws, tax pot and reserves planned for', heroBills: 'Unpaid bills & fixed costs', heroSave: 'Planned transfers to make', heroFree: 'Free to use',
    heroLead: 'Free to use once unpaid fixed costs and planned transfers, like the tax pot and your own pay, are covered.',
  },
  quickLog: { placeholder: 'adsense payout 1840', help: 'Try “adsense payout 1840”, “patreon 1320”, “editor 450”, “epidemic sound 15” or “new mic 129”.', demo: ['editor', '450', 'Editors, designers & thumbnails'] },

  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Every income stream, in one calm place', text: '<p>Ad revenue, brand deals, memberships, affiliates and product sales, next to what it costs to make the content. Profit, tax money and a year-end summary build themselves.</p><p>Everything stays in this browser. No logins to your platforms, no subscription.</p>' },
    { icon: 'insights', step: 'STREAMS', title: 'See what each platform really pays', text: '<p>Tag income and its costs with a stream (YouTube, Patreon, TikTok, Etsy, brand deals…). <b>Profit &amp; loss</b> shows profit for each one, and <b>Creator health</b> warns you when one platform carries too much of your income.</p>' },
    { icon: 'table', step: 'BRAND DEALS', title: 'Get paid for every sponsorship', text: '<p>Log each brand deal as an invoice. <b>Brand deals &amp; invoices</b> shows what is owed and how late it is, and writes a polite reminder when a sponsor pays late.</p>' },
    { icon: 'umbrella', step: 'TAX', title: 'Put tax money aside as the payouts land', text: '<p>Choose a set-aside rate. <b>Quarterly tax</b> compares what you should have put aside with what you have.</p><p><b>Not tax, legal or financial advice.</b> The rates and form lines use the figures you enter. Tax rules differ by country and change every year, so confirm them with a tax professional.</p>' },
    'backup',
    { icon: 'check', step: 'START', title: 'Start with your last payout', text: '<p>Add your most recent AdSense, Patreon or sponsor payment, or import a month of bank transactions. Your dashboard fills in from there.</p>', cta: { label: 'Add a transaction', action: 'welcome-log' } },
  ],
  guide: {
    title: 'Four moves. Every stream accounted for.',
    cards: [
      ['spark', '1. Log', 'Quick Log payouts and costs as they happen, or import a bank CSV each month and tag each payout with its income stream.', 'Transactions', 'activity'],
      ['insights', '2. Compare streams', 'Read the P&L for the month, the quarter or the year, with profit for each income stream underneath.', 'Profit & loss', 'pl'],
      ['shield', '3. Set tax aside', 'Move your set-aside each month and see it against each due date. A savings rule, not tax advice.', 'Quarterly tax', 'tax'],
      ['tags', '4. Hand over', 'Download a line-by-line summary and every transaction for your accountant or tax preparer.', 'Schedule C summary', 'taxlines'],
    ],
    meanings: [['Income', 'Every payout, deal and sale'], ['Gross profit', 'Income − merch costs'], ['Net profit', 'Gross profit − running costs'], ['Transfers', 'Tax pot, your pay, card payoffs']],
    details: [
      ['Income streams', 'Add a stream for each place you earn in <b>Settings → Income streams</b> (one click for YouTube, TikTok, Patreon and more), or type a new one on a transaction. Tag payouts and the costs that clearly belong to a stream, such as Patreon fees or a shoot for one sponsor. Leave shared costs like software untagged. Profit &amp; loss shows profit for each stream, and you can view the statement for one stream at a time. On import, tag rows in bulk; Creator Plan offers to remember the stream for similar descriptions.'],
      ['Payouts and platform fees', 'Most platforms pay you after taking their cut. If you log only the payout, your income is what landed in the bank and the fee never appears; that is fine for a simple picture. To see what each platform costs you, log the gross amount as income and the platform’s fee under <b>Platform &amp; payment fees</b>, tagged with the same stream.'],
      ['Brand deals', 'Log each sponsorship as an invoice when you agree it, with the brand as the client. It becomes income on the day you mark it paid. Overdue deals get a <b>Reminder</b> button that writes a polite chase-up you can copy into an email.'],
      ['Creator health', 'Shows your <b>cash runway</b> (how many months your tracked cash would cover costs if payouts stopped), your <b>break-even income</b>, margins month by month, costs against their usual level, and whether one platform, brand or client carries too much of your income. It reads only what you record and is not financial advice.'],
      ['Dig into any number', 'Click a card at the top of the dashboard to see the transactions behind it; <b>Avg. monthly cash flow</b> opens the Annual overview. Click a slice of any donut to list its transactions. On Transactions, pick a group and then a category, sort any column, and read the total of what is shown at the bottom.'],
      ['Gear, gifted products and big purchases', 'Log cameras, lenses and lighting under <b>Cameras, mics &amp; lighting</b>. Your accountant decides what is expensed now and what is depreciated. Products brands send you for free may count as income where you live; ask your tax professional and log them as <b>Other business income</b> if so.'],
      ['Not tax, legal or financial advice', 'Creator Plan organises your own records. Every tax figure it shows, from the set-aside to the form lines, comes from the rates, categories and rules you enter. It does not know your tax position, and tax rules differ by country and change every year. Check with a qualified tax professional or accountant before you file, claim or pay tax.'],
      ['Outside the US', 'Income, streams, profit, cash flow and brand deals work anywhere: set your currency in Settings. The <b>Schedule C summary</b> uses US line numbers and the <b>Quarterly tax</b> due dates follow the US estimated-tax calendar. Elsewhere, treat the category totals and set-aside figures as a starting point for your own return and your own payment dates. If a platform pays in another currency, log the amount that arrived in your account.'],
      ['Importing from your bank', 'On the import screen, filter by status to see only the rows that are not ready, fix their category or stream, and import them from the button at the top or bottom. When you change a category or stream, Creator Plan offers to update similar rows and remember the choice for future imports.'],
      ['Paying yourself, tax money and retirement', 'Paying yourself, moving money to your tax pot, income tax you pay and your own retirement contributions are not business expenses, so they never reduce profit. Your accountant will want the totals, which appear under Transfers.'],
      ['Business credit cards and your own transfers', 'If you log or import the card’s purchases, those are the expenses. Paying the card from the business account is then a transfer: use <b>Business card payoff (purchases already logged)</b>, which is never counted.'],
      ['Starting over', 'Settings → <b>Start fresh</b> clears the books in one step. Keep your categories, streams and settings, or erase everything. Download a backup first if you might want the data again.'],
    ],
  },

  // the fictional creator behind "Explore sample data": a DIY and crafts YouTuber with a Patreon,
  // digital patterns on Etsy, affiliate links and regular brand deals
  sample: {
    name: 'Maya Makes', opening: 380000, settings: { goalImages: true, goalsLayout: 'grid' },
    note: 'Chase the two late sponsor invoices and top up the tax pot before the September payment.',
    amounts: { 'ad-revenue': 2400, sponsorships: 3000, memberships: 1400, affiliate: 450, 'digital-products': 900, editors: 900, software: 85, 'music-stock': 30, props: 180, equipment: 120, 'phone-internet': 80, advertising: 60, 'platform-fees': 200, professional: 50, 'owner-draw': 2500, 'tax-reserve': 1200, 'biz-savings': 200 },
    days: { memberships: 1, software: 3, 'music-stock': 5, 'phone-internet': 12, professional: 20, 'ad-revenue': 21, editors: 25, 'owner-draw': 28, 'tax-reserve': 28, 'biz-savings': 28 },
    undated: ['sponsorships', 'affiliate', 'digital-products', 'props', 'equipment', 'advertising', 'platform-fees'],
    unscheduled: ['ad-revenue', 'sponsorships', 'memberships', 'affiliate', 'digital-products', 'props', 'equipment', 'advertising', 'platform-fees'],
    spread: { groups: [], days: [], notes: [], share: { default: 1 } },
    // ad rates climb into the holidays; memberships grow a little each month;
    // brand deals arrive as invoice payments (see extras); fees are worked out from payouts
    actual: (id, month, planned) => {
      if (id === 'ad-revenue') return Math.round(planned * [0.78, 0.72, 0.8, 0.84, 0.9, 0.88, 0.86, 0.92, 1.02, 1.15, 1.35, 1.55][month - 1]);
      if (id === 'memberships') return Math.round(planned * (0.9 + 0.02 * month));
      if (id === 'affiliate') return Math.round(planned * [0.7, 0.6, 0.8, 0.9, 1, 0.9, 1.3, 1.1, 1, 1.2, 1.8, 2.1][month - 1]);
      if (id === 'digital-products') return Math.round(planned * [1.2, 1.1, 0.9, 0.8, 0.9, 0.8, 0.7, 1.1, 1.3, 1.1, 1.2, 1.6][month - 1]);
      if (id === 'sponsorships' || id === 'platform-fees') return 0;
      if (id === 'equipment') return month % 4 === 0 ? planned * 7 : 0;
      if (id === 'props') return Math.round(planned * (month % 2 ? 1.15 : 0.8));
      if (id === 'advertising') return month % 3 === 1 ? planned * 2 : 0;
      return planned;
    },
    snapshots: false,
    goals: [
      { category: 'tax-reserve', kind: 'saving', name: 'Tax pot for this year', target: 1500000, opening: 0, due: [0, '12-31'], image: 'emergency' },
      { category: 'biz-savings', kind: 'saving', name: 'Three slow months covered', target: 900000, opening: 300000, due: [1, '03-31'], image: 'investing' },
    ],
    extras: (s, { m, year, now, uid, totals }) => {
      const monthNo = +m.slice(5, 7), key = i => `${year}-${String(i).padStart(2, '0')}`;
      s.channels = [{ id: 'ch-yt', name: 'YouTube' }, { id: 'ch-patreon', name: 'Patreon' }, { id: 'ch-etsy', name: 'Etsy' }, { id: 'ch-brands', name: 'Brand deals' }, { id: 'ch-aff', name: 'Affiliates' }];
      s.channelRules = { adsense: 'ch-yt', youtube: 'ch-yt', patreon: 'ch-patreon', etsy: 'ch-etsy', sponsor: 'ch-brands', amazon: 'ch-aff' };
      // brand deals as invoices: paid ones sit in income, the latest are still open, two of them late
      const brands = ['Lumen Paints', 'Craftbox Co.', 'Brightside Tools', 'Hearth & Loom', 'Pixel Paper'], deals = ['60-second integration', 'Dedicated video', 'Shorts + Instagram package', 'Tutorial sponsorship'];
      s.invoices = []; let n = 2200;
      for (let i = Math.max(1, monthNo - 8); i <= monthNo; i++) {
        [8, 22].forEach((d, j) => {
          if (j && i % 2) return;   // one deal most months, two in even months
          const issued = `${key(i)}-${String(d).padStart(2, '0')}`; if (issued > now) return;
          const due = new Date(Date.UTC(+year, i - 1, d + 30)).toISOString().slice(0, 10);
          const amount = [250000, 180000, 320000, 120000, 400000][(i + j * 2) % 5];
          const inv = { id: uid(), number: 'BD-' + (++n), client: brands[(i + j * 3) % 5], issued, due, amount, category: 'sponsorships', note: deals[(i + j) % 4], channel: 'ch-brands' };
          if (i < monthNo - 1) {
            const paidOn = new Date(Date.UTC(+year, i - 1, d + 26)).toISOString().slice(0, 10);
            if (paidOn <= now) { const t = { id: uid(), date: paidOn, category: 'sponsorships', amount, note: `${inv.client} · ${inv.note}`, channel: 'ch-brands' }; s.transactions.push(t); inv.paid = { date: paidOn, tx: t.id }; }
          }
          s.invoices.push(inv);
        });
      }
      // payouts get their platform's name and stream; platforms' cuts become fee entries
      const extra = [];
      s.transactions.forEach(t => {
        if (t.category === 'ad-revenue') { t.channel = 'ch-yt'; t.note = 'AdSense payout'; }
        else if (t.category === 'memberships') { t.channel = 'ch-patreon'; t.note = 'Patreon payout';
          extra.push({ id: uid(), date: t.date, category: 'platform-fees', amount: Math.round(t.amount * 0.08), note: 'Patreon platform fee', channel: 'ch-patreon' }); }
        else if (t.category === 'digital-products') { t.channel = 'ch-etsy'; t.note = 'Etsy payout · sewing patterns';
          extra.push({ id: uid(), date: t.date, category: 'platform-fees', amount: Math.round(t.amount * 0.1), note: 'Etsy fees', channel: 'ch-etsy' }); }
        else if (t.category === 'affiliate') { t.channel = 'ch-aff'; t.note = 'Amazon Associates'; }
        else if (['editors', 'music-stock', 'props', 'equipment'].includes(t.category)) t.channel = 'ch-yt';
        else if (t.category === 'advertising') t.channel = 'ch-etsy';
      });
      s.transactions.push(...extra);
      // cash carries forward: each month opens with the month before's closing balance
      for (let i = 2; i <= 12; i++) s.months[key(i)].opening = totals(s, key(i - 1)).cash;
    },
  },
};
