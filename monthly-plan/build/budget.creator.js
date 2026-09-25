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
const Budget = ((P) => {
  const THEMES=P.themes.slice();
  const MAX_QUICK_MEMORY=500,MAX_CHANNELS=30;
  const CURRENCIES=['USD','EUR','GBP','CAD','AUD','NZD','INR','NGN','ZAR','JPY','CNY','CHF','SEK','NOK','DKK','PLN','CZK','HUF','RON','BGN','TRY','RUB','UAH','ILS','AED','SAR','QAR','KWD','EGP','KES','GHS','TZS','UGX','MAD','BRL','MXN','ARS','CLP','COP','PEN','SGD','HKD','MYR','THB','PHP','IDR','VND','KRW','TWD','PKR','BDT','LKR','NPR','ISK','HRK','RSD'];
  const DATE_FORMATS={auto:'Match my device',dmy:'21 Sep 2026',mdy:'Sep 21, 2026',ymd:'2026-09-21'};
  // A group's flags drive every view: type (income | expense | saving = money moved aside, e.g.
  // savings | transfer = money moving between your own accounts, never counted anywhere), fixed (counts as a commitment), debt (can be a payoff goal),
  // cogs (cost of goods sold), other (non-operating income), tax (money set aside for tax).
  const GROUP_DEFS = Object.fromEntries(P.groups.map(g=>[g.id,g]));
  const GROUPS = Object.fromEntries(P.groups.map(g=>[g.id,g.label]));
  const group = c => GROUP_DEFS[c&&c.group] || {};
  const type = c => group(c).type || 'expense';
  const isDebt = c => !!group(c).debt;
  const counted = c => ['income','expense'].includes(type(c));   // on a profit & loss
  const TAX_LINES = P.taxLines ? Object.fromEntries(P.taxLines.map(l=>[l.id,l])) : null;
  const uid = () => globalThis.crypto?.randomUUID?.() || 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const validMonth = x => typeof x==='string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(x) && +x.slice(0,4)>=1900 && +x.slice(0,4)<=9998;
  const days = m => new Date(+m.slice(0,4),+m.slice(5,7),0,12).getDate();
  const validDate = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && validMonth(x.slice(0,7)) && +x.slice(8)>=1 && +x.slice(8)<=days(x.slice(0,7));
  const shift = (m,n) => {const d=new Date(+m.slice(0,4),+m.slice(5)-1+n,1,12);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  const cents = s => {if(!/^\d{1,8}(\.\d{1,2})?$/.test(String(s).trim())) throw Error('Use a positive amount with up to two decimal places.');return Math.round(Number(s)*100);};
  const blank = () => ({version:1,...(P.id!=='budget'?{niche:P.id}:{}),settings:{name:'',currency:'USD',symbol:'',dateFormat:'auto',theme:THEMES[0],hiddenNav:[],...JSON.parse(JSON.stringify(P.settings||{}))},baseline:{},
    categories:P.categories.map(([id,name,group,taxLine])=>({id,name,group,archived:false,...(taxLine?{taxLine}:{})})),
    months:{},transactions:[],goals:[],reviews:{},schedules:[],snapshots:{},quickMemory:{},importMap:{},...(P.features.mileage?{mileage:[]}:{}),...(P.features.invoices?{invoices:[]}:{}),...(P.features.channels?{channels:[],channelRules:{}}:{})});
  const month = (s,m) => s.months[m] || {plan:{},opening:0,note:'',closed:false};
  // The usual amounts repeat every month; a month stores only the categories it changes.
  const planFor = (s,m) => ({...(s.baseline||{}),...(month(s,m).plan||{})});
  const overrides = (s,m) => {const b=s.baseline||{},p=month(s,m).plan||{},out={};
    if(!Object.keys(b).length)return out;
    for(const id of Object.keys(p))if(!b[id]||b[id].amount!==p[id].amount||b[id].day!==p[id].day)out[id]=true;
    return out;};
  const txCache = new WeakMap();
  function byMonth(s){const arr=s.transactions,hit=txCache.get(arr);if(hit&&hit.len===arr.length)return hit.map;
    const map=new Map();for(const t of arr){const k=t.date.slice(0,7),a=map.get(k);a?a.push(t):map.set(k,[t]);}
    txCache.set(arr,{len:arr.length,map});return map;}
  const invalidate = s => {if(s&&s.transactions)txCache.delete(s.transactions);};
  const EMPTY=[];
  const transactions = (s,m) => byMonth(s).get(m) || EMPTY;
  const actual = (s,m,id) => transactions(s,m).filter(t=>t.category===id).reduce((a,t)=>a+t.amount,0);
  const rows = (s,m) => {
    const tx=transactions(s,m),sums=new Map(),used=new Set(),plan=planFor(s,m);
    tx.forEach(t=>{sums.set(t.category,(sums.get(t.category)||0)+t.amount);used.add(t.category);});
    return s.categories.filter(c=>!c.archived||plan[c.id]||used.has(c.id)).map(c=>({...c,type:type(c),planned:plan[c.id]?.amount||0,day:plan[c.id]?.day||0,actual:sums.get(c.id)||0}));
  };
  const totals = (s,m) => {
    const r=rows(s,m), out={income:{plan:0,actual:0},expense:{plan:0,actual:0},saving:{plan:0,actual:0}};
    r.forEach(c=>{if(!out[c.type])return;out[c.type].plan+=c.planned;out[c.type].actual+=c.actual;});
    out.unassigned=out.income.plan-out.expense.plan-out.saving.plan;
    out.remaining=out.expense.plan-out.expense.actual;
    out.net=out.income.actual-out.expense.actual-out.saving.actual;
    out.cash=month(s,m).opening+out.net;
    return out;
  };
  const annual = (s,y) => Array.from({length:12},(_,i)=>{const m=`${y}-${String(i+1).padStart(2,'0')}`;return {month:m,...totals(s,m),hasPlan:Object.values(planFor(s,m)).some(p=>p.amount>0),closed:month(s,m).closed};});
  const goalProgress = (s,g,m) => {
    const end=m+'-'+String(days(m)).padStart(2,'0');
    const inWindow=end<g.start?[]:s.transactions.filter(t=>t.category===g.category && t.date>=g.start && t.date<=end);
    const saved=end<g.start?0:g.opening+inWindow.reduce((a,t)=>a+t.amount,0);
    const remaining=Math.max(0,g.target-saved);
    const months=Math.max(1,(+g.due.slice(0,4)-+m.slice(0,4))*12+(+g.due.slice(5,7)-+m.slice(5,7))+1);
    return {saved,remaining,counted:inWindow.length,everLogged:s.transactions.some(t=>t.category===g.category),monthly:Math.ceil(remaining/months),percent:Math.max(0,Math.min(100,Math.round(saved/g.target*100)))};
  };
  const due = (s,m) => rows(s,m).filter(c=>c.day && c.planned>0).map(c=>({...c,date:m+'-'+String(Math.min(c.day,days(m))).padStart(2,'0'),remaining:Math.max(0,c.planned-c.actual)})).sort((a,b)=>a.date.localeCompare(b.date));
  const FREQUENCIES={once:'Once',weekly:'Weekly',biweekly:'Every two weeks',monthly:'Monthly',quarterly:'Every three months',annual:'Yearly'};
  const plusDays=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function occurrences(s,m){
    const from=m+'-01',to=m+'-'+String(days(m)).padStart(2,'0'),linked=new Map(s.transactions.filter(t=>t.scheduleKey).map(t=>[t.scheduleKey,t]));
    const result=[];
    (s.schedules||[]).forEach(r=>{
      if(r.start>to||r.end<from)return;
      let dates=[];
      if(r.frequency==='once'){if(r.start>=from&&r.start<=to)dates=[r.start];}
      else if(['weekly','biweekly'].includes(r.frequency)){
        const step=r.frequency==='weekly'?7:14;
        const daysBetween=Math.round((Date.UTC(+from.slice(0,4),+from.slice(5,7)-1,1)-Date.UTC(+r.start.slice(0,4),+r.start.slice(5,7)-1,+r.start.slice(8)))/86400000);
        let d=plusDays(r.start,Math.max(0,Math.ceil(daysBetween/step))*step);
        while(d<=to&&validDate(d)){dates.push(d);d=plusDays(d,step);}
      }else{
        const step={monthly:1,quarterly:3,annual:12}[r.frequency],delta=(+m.slice(0,4)-+r.start.slice(0,4))*12+(+m.slice(5,7)-+r.start.slice(5,7));
        if(delta>=0&&delta%step===0)dates=[m+'-'+String(Math.min(+r.start.slice(8),days(m))).padStart(2,'0')];
      }
      dates.filter(d=>d>=r.start&&d<=r.end).forEach(date=>{const key=r.id+'@'+date;result.push({...r,date,key,transaction:linked.get(key)||null});});
    });
    return result.sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name)||a.key.localeCompare(b.key));
  }
  function schedulePlan(s,m){const sums={};occurrences(s,m).forEach(o=>{sums[o.category]=(sums[o.category]||0)+o.amount;});return sums;}
  function reserves(s,m,asOf=today()){
    const cutoff=asOf<m+'-01'?m+'-00':asOf>m+'-'+String(days(m)).padStart(2,'0')?m+'-'+String(days(m)).padStart(2,'0'):asOf;
    const partial={...s,transactions:s.transactions.filter(t=>t.date<=cutoff)},t=totals(partial,m),r=rows(partial,m),pending={};
    occurrences(partial,m).filter(o=>!o.transaction).forEach(o=>pending[o.category]=(pending[o.category]||0)+o.amount);
    for(const c of s.categories){if(pending[c.id]&&!r.some(row=>row.id===c.id))r.push({...c,type:type(c),planned:0,actual:0});}
    const fixed=r.filter(c=>group(c).fixed).reduce((n,c)=>n+Math.max(0,c.planned-c.actual,pending[c.id]||0),0);
    const saving=r.filter(c=>c.type==='saving').reduce((n,c)=>n+Math.max(0,c.planned-c.actual,pending[c.id]||0),0);
    return {cash:t.cash,fixed,saving,after:t.cash-fixed-saving,cutoff};
  }
  function annualCategories(s,y){const months=Array.from({length:12},(_,i)=>`${y}-${String(i+1).padStart(2,'0')}`),all=months.map(m=>new Map(rows(s,m).map(c=>[c.id,c])));return s.categories.filter(c=>!c.archived||all.some(r=>r.has(c.id))).map(c=>({...c,months:months.map((m,i)=>({month:m,plan:all[i].get(c.id)?.planned||0,actual:all[i].get(c.id)?.actual||0}))}));}
  function snapshotTotals(v){const assets=v.cash+v.savings+v.investments+v.other;return {assets,debts:v.debts,net:assets-v.debts};}
  // Bank descriptions carry changing numbers ("WHOLE FOODS #123", "AMAZON MKTP US*2K4AB"). The
  // match key keeps the first few words without digits, so the same merchant matches itself.
  const matchKey = text => String(text||'').toLowerCase().replace(/\b(refund|returned|reversal|withdrawal)\b/g,' ').split(/[^a-z0-9]+/).filter(w=>w.length>1&&!/\d/.test(w)).slice(0,4).join(' ');
  // "whole foods" and "whole foods market" are the same merchant: one key starts the other, on whole words
  const sameMerchant = (a,b) => !!a&&!!b&&(a===b||a.startsWith(b+' ')||b.startsWith(a+' '));
  // the most specific rule wins: "amazon prime" beats "amazon"
  const ruleFor = (s,note) => {const k=matchKey(note);if(!k)return '';
    const hit=Object.entries(s.categoryRules||{}).filter(([r])=>r===k||k.startsWith(r+' ')).sort((a,b)=>b[0].length-a[0].length).find(([,id])=>s.categories.some(c=>c.id===id&&!c.archived));
    return hit?hit[1]:'';};
  const quickKey = text => String(text||'').toLowerCase().replace(/\b(refund|returned|reversal|withdrawal)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim().slice(0,80);
  function parseQuick(text,categories,memory={}){
    const raw=String(text||'').trim(),match=raw.match(/(?:^|\s)(?:[$€£₦₹R]\s*)?((?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,8})(?:\.[0-9]{1,2})?|[0-9]{1,8},[0-9]{1,2})\s*$/);
    if(!match)throw Error('End the entry with an amount, like “coffee 4.50”.');
    const note=raw.slice(0,match.index).trim(),numeric=match[1].includes('.')?match[1].replace(/,/g,''):match[1].replace(',','.'),amount=cents(numeric);
    if(!note)throw Error('Add a short description before the amount.');
    const words=note.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(),reverse=/\b(refund|returned|reversal|withdrawal)\b/.test(words);
    const aliases=P.aliases;
    let category='',source='';const remembered=memory[quickKey(note)];
    if(remembered&&categories.some(c=>c.id===remembered&&!c.archived)){category=remembered;source='memory';}
    if(!category)for(const c of categories){const n=c.name.toLowerCase();if(words===n||words.includes(n)){category=c.id;break;}}
    if(!category){for(const [word,id] of Object.entries(aliases)){if(words.replace(/ /g,'').includes(word)&&categories.some(c=>c.id===id&&!c.archived)){category=id;break;}}}
    return {note,amount:reverse?-amount:amount,category,...(source==='memory'?{source}: {})};
  }
  // ---- Business editions: profit & loss, tax set-aside, tax-line summary, mileage, receivables.
  // Cash basis throughout: a sale counts when the money arrives, a cost when it is paid.
  const monthsBetween=(from,to)=>{const out=[];for(let m=from.slice(0,7);m<=to.slice(0,7)&&out.length<1200;m=shift(m,1))out.push(m);return out;};
  const endOf=m=>m+'-'+String(days(m)).padStart(2,'0');
  // channel: undefined = every transaction, '' = only untagged (shared) ones, an id = that channel only
  const inChannel=(t,ch)=>ch===undefined||(ch===''?!t.channel:t.channel===ch);
  function categorySums(s,from,to,ch){const sums=new Map();
    for(const m of monthsBetween(from,to))for(const t of transactions(s,m))if(t.date>=from&&t.date<=to&&inChannel(t,ch))sums.set(t.category,(sums.get(t.category)||0)+t.amount);
    return sums;}
  function pl(s,from,to,ch){
    const sums=categorySums(s,from,to,ch),lines=f=>s.categories.filter(c=>sums.get(c.id)&&f(c,group(c))).map(c=>({id:c.id,name:c.name,group:c.group,taxLine:taxLineFor(c),amount:sums.get(c.id)}));
    const section=l=>({lines:l,total:l.reduce((n,x)=>n+x.amount,0)});
    const revenue=section(lines((c,g)=>g.type==='income'&&!g.other)),cogs=section(lines((c,g)=>g.type==='expense'&&g.cogs));
    const opexGroups=P.groups.filter(g=>g.type==='expense'&&!g.cogs).map(g=>({id:g.id,label:g.label,...section(lines(c=>c.group===g.id))})).filter(g=>g.lines.length);
    const opex={groups:opexGroups,total:opexGroups.reduce((n,g)=>n+g.total,0)},other=section(lines((c,g)=>g.type==='income'&&g.other));
    const transfers=section(lines((c,g)=>g.type==='saving'||g.type==='transfer')),gross=revenue.total-cogs.total,operating=gross-opex.total;
    return {from,to,revenue,cogs,gross,grossMargin:revenue.total>0?gross/revenue.total:null,opex,operating,other,net:operating+other.total,netMargin:revenue.total>0?(operating+other.total)/revenue.total:null,transfers};
  }
  const plMonth=(s,m,ch)=>pl(s,m+'-01',endOf(m),ch);
  // Profit by sales channel. Each channel's own sales and costs give its channel profit; untagged
  // costs are shared by the whole business, so they come off once, after the channels.
  function channelProfit(s,from,to){
    const row=(id,name)=>{const p=pl(s,from,to,id);return {id,name,revenue:p.revenue.total,other:p.other.total,cogs:p.cogs.total,opex:p.opex.total,costs:p.cogs.total+p.opex.total,profit:p.net,margin:p.netMargin};};
    const channels=(s.channels||[]).map(c=>row(c.id,c.name)),shared=row('','Shared'),all=pl(s,from,to);
    return {channels,shared,net:all.net,revenue:all.revenue.total};
  }
  // Business health, from recorded activity only. The basis is up to three recent months with
  // entries, ending before the current (unfinished) month, so a half-month never skews averages.
  function health(s,m,asOf=today()){
    const cur=asOf.slice(0,7),end=m<cur?m:shift(cur,-1),basis=[];
    for(let k=end,i=0;i<12&&basis.length<3;i++,k=shift(k,-1))if(transactions(s,k).length)basis.unshift(k);
    const n=basis.length,from=n?basis[0]+'-01':'',to=n?endOf(basis[n-1]):'',P=n?pl(s,from,to):null,avg=x=>n?Math.round(x/n):0;
    const rev=avg(P?.revenue.total||0),cogs=avg(P?.cogs.total||0),opex=avg(P?.opex.total||0),costs=cogs+opex;
    const gm=P&&P.revenue.total>0?P.gross/P.revenue.total:null,netMargin=P&&P.revenue.total>0?P.net/P.revenue.total:null;
    const cash=totals(s,m<=cur?m:cur).cash,runway=costs>0?Math.max(0,cash)/costs:null,breakEven=gm>0?Math.round(opex/gm):null;
    const isCost=id=>{const c=s.categories.find(c=>c.id===id);return c&&group(c).type==='expense';};
    const nowSums=categorySums(s,m+'-01',endOf(m)),baseSums=n?categorySums(s,from,to):new Map();
    const changes=[...new Set([...nowSums.keys(),...baseSums.keys()])].filter(isCost).map(id=>{const now=nowSums.get(id)||0,base=Math.round((baseSums.get(id)||0)/(n||1));
      return {id,name:s.categories.find(c=>c.id===id).name,now,avg:base,diff:now-base};}).filter(x=>x.now||x.avg).sort((a,b)=>b.diff-a.diff);
    const yFrom=shift(end,-11)+'-01',yTo=endOf(end);
    let topChannel=null;if((s.channels||[]).length){const C=channelProfit(s,yFrom,yTo),tot=C.channels.reduce((a,c)=>a+c.revenue,0)+C.shared.revenue,best=[...C.channels].sort((a,b)=>b.revenue-a.revenue)[0];
      if(best&&tot>0&&best.revenue>0)topChannel={name:best.name,share:best.revenue/tot,amount:best.revenue};}
    const byClient=new Map();(s.invoices||[]).filter(i=>i.paid&&i.paid.date>=yFrom&&i.paid.date<=yTo).forEach(i=>byClient.set(i.client,(byClient.get(i.client)||0)+i.amount));
    const invTotal=[...byClient.values()].reduce((a,v)=>a+v,0),client=[...byClient.entries()].sort((a,b)=>b[1]-a[1])[0];
    const topClient=client&&invTotal>0?{name:client[0],amount:client[1],share:client[1]/invTotal,clients:byClient.size}:null;
    const margins=Array.from({length:6},(_,i)=>shift(m,i-5)).map(k=>{const p=plMonth(s,k);return {month:k,future:k>cur,revenue:p.revenue.total,net:p.net,margin:p.revenue.total>0?p.net/p.revenue.total:null};});
    return {basis,n,rev,cogs,opex,costs,gm,netMargin,cash,runway,breakEven,changes,topChannel,topClient,margins};
  }
  const channelFor=(s,note)=>{const k=matchKey(note);if(!k)return '';
    const hit=Object.entries(s.channelRules||{}).filter(([r])=>r===k||k.startsWith(r+' ')).sort((a,b)=>b[0].length-a[0].length).find(([,id])=>(s.channels||[]).some(c=>c.id===id));
    return hit?hit[1]:'';};
  // What should be in the tax pot: the rate applied to profit so far this year. A loss month
  // lowers the year-to-date figure, so a month's share is the change in that running total.
  function taxSetAside(s,y,rate=s.settings.taxRate||0,asOf=today()){
    let ytdNet=0,ytdShould=0,ytdHave=0;const cutoff=asOf.slice(0,7);
    const months=Array.from({length:12},(_,i)=>{const m=`${y}-${String(i+1).padStart(2,'0')}`,p=plMonth(s,m);
      const have=s.categories.filter(c=>group(c).tax).reduce((n,c)=>n+actual(s,m,c.id),0);
      ytdNet+=p.net;const before=ytdShould;ytdShould=Math.max(0,Math.round(ytdNet*rate/10000));ytdHave+=have;
      return {month:m,future:m>cutoff,revenue:p.revenue.total,net:p.net,should:ytdShould-before,have,ytdNet,ytdShould,ytdHave,balance:ytdHave-ytdShould};});
    const quarters=(P.taxQuarters||[]).map(q=>{const inQ=months.slice(q.months[0]-1,q.months[1]),last=inQ[inQ.length-1];
      return {label:q.label,from:inQ[0].month,to:last.month,due:(+y+(q.nextYear?1:0))+'-'+q.due,net:inQ.reduce((n,x)=>n+x.net,0),should:inQ.reduce((n,x)=>n+x.should,0),have:inQ.reduce((n,x)=>n+x.have,0),balance:last.balance};});
    const now=months.filter(x=>!x.future).at(-1)||months[0];
    return {year:y,rate,months,quarters,ytdNet:now.ytdNet,ytdShould:now.ytdShould,ytdHave:now.ytdHave,balance:now.balance};
  }
  const taxLineFor=c=>{if(!TAX_LINES)return '';const own=c.taxLine;if(own&&TAX_LINES[own])return own;return (P.categoryTaxLines||{})[c.id]||group(c).taxLine||'';};
  const mileageAmount=(miles,rate)=>Math.round(miles*rate/100);   // miles in tenths, rate in tenths of a cent
  function mileageTotals(s,from,to){const list=(s.mileage||[]).filter(t=>t.date>=from&&t.date<=to),miles=list.reduce((n,t)=>n+t.miles,0);
    return {trips:list.length,miles,amount:mileageAmount(miles,s.settings.mileageRate||0),rate:s.settings.mileageRate||0};}
  // Groups the P&L by tax-form line, in the order an accountant reads the form.
  function taxSummary(s,from,to){
    const p=pl(s,from,to),by=new Map(),unmapped=[],excluded=[];
    const add=(line,item)=>{if(!by.has(line))by.set(line,[]);by.get(line).push(item);};
    const every=[...p.revenue.lines,...p.cogs.lines,...p.opex.groups.flatMap(g=>g.lines),...p.other.lines];
    every.forEach(l=>{if(!l.taxLine)unmapped.push(l);else if(TAX_LINES[l.taxLine].exclude)excluded.push(l);else add(l.taxLine,l);});
    const mileage=P.features.mileage?mileageTotals(s,from,to):null;
    if(mileage&&mileage.amount&&P.mileageLine)add(P.mileageLine,{id:'mileage',name:`Standard mileage · ${(mileage.miles/10).toLocaleString('en-US',{maximumFractionDigits:1})} ${s.settings.distanceUnit==='km'?'km':'mi'}`,amount:mileage.amount,mileage:true});
    const lines=P.taxLines.filter(l=>!l.exclude).map(l=>{const items=by.get(l.id)||[];return {...l,items,amount:items.reduce((n,x)=>n+x.amount,0)};});
    const sum=part=>lines.filter(l=>l.part===part).reduce((n,l)=>n+l.amount,0);
    const totals={gross:sum('income'),cogs:sum('cogs'),other:sum('other'),expenses:sum('expense')};
    totals.grossProfit=totals.gross-totals.cogs;totals.grossIncome=totals.grossProfit+totals.other;totals.net=totals.grossIncome-totals.expenses;
    return {from,to,lines,totals,unmapped,excluded,mileage,pl:p};
  }
  function receivables(s,asOf=today()){
    const ageDays=d=>Math.round((Date.UTC(+asOf.slice(0,4),+asOf.slice(5,7)-1,+asOf.slice(8))-Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8)))/864e5);
    const open=(s.invoices||[]).filter(i=>!i.paid).map(i=>({...i,overdue:Math.max(0,ageDays(i.due))}));
    const buckets=[['current','Not yet due',x=>x.overdue===0],['d30','1–30 days late',x=>x.overdue>0&&x.overdue<=30],['d60','31–60 days late',x=>x.overdue>30&&x.overdue<=60],['d90','61–90 days late',x=>x.overdue>60&&x.overdue<=90],['older','Over 90 days late',x=>x.overdue>90]]
      .map(([id,label,f])=>{const list=open.filter(f);return {id,label,count:list.length,amount:list.reduce((n,x)=>n+x.amount,0)};});
    return {open,buckets,total:open.reduce((n,x)=>n+x.amount,0),overdue:open.filter(x=>x.overdue>0).reduce((n,x)=>n+x.amount,0)};
  }
  function protectClosedSchedules(before,after){
    for(const [m,v] of Object.entries(before.months)){if(!v.closed)continue;
      const signature=s=>occurrences(s,m).map(o=>[o.key,o.category,o.amount,o.name]);
      if(JSON.stringify(signature(before))!==JSON.stringify(signature(after)))throw Error('This would change a schedule in a closed month. Reopen that month or create a new schedule starting later.');
    }
    return after;
  }
  function validate(s){
    const fail=()=>{throw Error(`This is not a valid ${P.product.name} backup. Your current data has not been changed.`);};
    const str=(x,max=300)=>typeof x==='string'&&x.length<=max;
    const amount=x=>Number.isSafeInteger(x)&&Math.abs(x)<=9999999999;
    const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
    const id=x=>str(x,80)&&/^[A-Za-z0-9_-]+$/.test(x)&&!['__proto__','prototype','constructor'].includes(x);
    if(object(s)&&typeof s.version==='number'&&s.version>1)throw Error(`This backup was saved by a newer version of ${P.product.name}. Open your newest planner file and restore it there. Your current data has not been changed.`);
    // each edition keeps its own categories and tax lines, so a backup only restores into its own edition
    if(object(s)&&(s.niche??'budget')!==P.id){const from=P.editions?.[s.niche??'budget'];throw Error(`This backup belongs to ${from?from:'a different planner edition'}. Open that planner file and restore it there. Your current data has not been changed.`);}
    if(object(s)&&object(s.settings)&&!THEMES.includes(s.settings.theme))s.settings.theme=THEMES[0];
    if(object(s)&&object(s.settings)){
     if(s.settings.symbol===undefined)s.settings.symbol='';
     if(!Object.hasOwn(DATE_FORMATS,s.settings.dateFormat))s.settings.dateFormat='auto';
    }
    if(!object(s)||s.version!==1||!object(s.settings)||!str(s.settings.name,100)||!str(s.settings.symbol,6)||!CURRENCIES.includes(s.settings.currency)||!Array.isArray(s.categories)||!s.categories.length||s.categories.length>300||!object(s.months)||!Array.isArray(s.transactions)||s.transactions.length>100000||!Array.isArray(s.goals)||!object(s.reviews))fail();
    const optionalNav=P.optionalNav;
    if(!Array.isArray(s.settings.hiddenNav))s.settings.hiddenNav=[];
    s.settings.hiddenNav=optionalNav.filter(x=>s.settings.hiddenNav.includes(x));
    const ids=new Set();s.categories.forEach(c=>{if(!object(c)||!id(c.id)||ids.has(c.id)||!str(c.name,80)||!c.name.trim()||!Object.hasOwn(GROUPS,c.group)||typeof c.archived!=='boolean')fail();ids.add(c.id);});
    Object.entries(s.months).forEach(([m,v])=>{if(!validMonth(m)||!object(v)||!object(v.plan)||!amount(v.opening)||!str(v.note,3000)||typeof v.closed!=='boolean')fail();Object.entries(v.plan).forEach(([c,p])=>{if(!ids.has(c)||!object(p)||!amount(p.amount)||p.amount<0||!Number.isInteger(p.day)||p.day<0||p.day>31)fail();});});
    if(s.seededFrom!==undefined&&!validMonth(s.seededFrom))delete s.seededFrom;
    if(s.baseline===undefined){
     // upgrading a planner written before plans repeated: adopt the latest month that was planned
     const planned=Object.keys(s.months).filter(m=>Object.keys(s.months[m].plan||{}).length).sort();
     s.baseline=planned.length?JSON.parse(JSON.stringify(s.months[planned[planned.length-1]].plan)):{};
     if(planned.length)s.seededFrom=planned[planned.length-1];
    }
    if(!object(s.baseline))fail();
    Object.entries(s.baseline).forEach(([c,p])=>{if(!ids.has(c)||!object(p)||!amount(p.amount)||p.amount<0||!Number.isInteger(p.day)||p.day<0||p.day>31)delete s.baseline[c];});
    if(s.schedules===undefined)s.schedules=[];
    if(s.snapshots===undefined)s.snapshots={};
    if(s.quickMemory===undefined)s.quickMemory={};
    if(!Array.isArray(s.schedules)||s.schedules.length>500||!object(s.snapshots)||!object(s.quickMemory))fail();
    if(s.importMap===undefined)s.importMap={};
    if(!object(s.importMap))s.importMap={};
    Object.entries(s.importMap).forEach(([k,v])=>{if(!str(k,120)||!ids.has(v))delete s.importMap[k];});
    Object.entries(s.quickMemory).forEach(([k,v])=>{if(!str(k,80)||!k||!ids.has(v))delete s.quickMemory[k];});
    // rules you confirmed: similar descriptions → category. Stale ones are dropped, never fatal.
    if(s.categoryRules!==undefined){if(!object(s.categoryRules))s.categoryRules={};
     Object.entries(s.categoryRules).forEach(([k,v])=>{if(!str(k,80)||!k||!ids.has(v))delete s.categoryRules[k];});
     const rk=Object.keys(s.categoryRules);if(rk.length>MAX_QUICK_MEMORY)for(const k of rk.slice(0,rk.length-MAX_QUICK_MEMORY))delete s.categoryRules[k];}
    const qk=Object.keys(s.quickMemory);if(qk.length>MAX_QUICK_MEMORY)for(const k of qk.slice(0,qk.length-MAX_QUICK_MEMORY))delete s.quickMemory[k];
    const scheduleIds=new Set();s.schedules.forEach(r=>{if(!object(r)||!id(r.id)||scheduleIds.has(r.id)||!str(r.name,100)||!r.name.trim()||!ids.has(r.category)||!amount(r.amount)||r.amount<=0||!validDate(r.start)||!validDate(r.end)||r.end<r.start||!Object.hasOwn(FREQUENCIES,r.frequency))fail();scheduleIds.add(r.id);});
    Object.entries(s.snapshots).forEach(([m,v])=>{if(!validMonth(m)||!object(v)||!str(v.note,1000)||['cash','savings','investments','other','debts'].some(k=>!amount(v[k])||v[k]<0))fail();if(v.debtMix===undefined)v.debtMix={credit:0,loans:0,mortgage:0,other:v.debts};if(!object(v.debtMix)||['credit','loans','mortgage','other'].some(k=>!amount(v.debtMix[k])||v.debtMix[k]<0)||Object.values(v.debtMix).reduce((n,x)=>n+x,0)!==v.debts)fail();});
    const keys=new Set();s.transactions.forEach(t=>{if(t.scheduleKey!==undefined){if(!str(t.scheduleKey,100)||!/^([A-Za-z0-9_-]+)@(\d{4}-\d{2}-\d{2})$/.test(t.scheduleKey)||!scheduleIds.has(t.scheduleKey.split('@')[0])||!validDate(t.scheduleKey.split('@')[1])||keys.has(t.scheduleKey))fail();keys.add(t.scheduleKey);const r=s.schedules.find(r=>r.id===t.scheduleKey.split('@')[0]);if(r.category!==t.category||t.amount<=0)fail();}});
    const tids=new Set();s.transactions.forEach(t=>{if(!object(t)||!id(t.id)||tids.has(t.id)||!validDate(t.date)||!ids.has(t.category)||!amount(t.amount)||!t.amount||!str(t.note,500))fail();tids.add(t.id);});
    // sales channels: a bad or unknown tag is dropped, never fatal, so an old backup always restores
    if(P.features.channels){
     if(!Array.isArray(s.channels))s.channels=[];
     const chIds=new Set(),chNames=new Set();
     s.channels=s.channels.filter(c=>{const ok=object(c)&&id(c.id)&&!chIds.has(c.id)&&str(c.name,40)&&c.name.trim()&&!chNames.has(c.name.trim().toLowerCase());if(ok){chIds.add(c.id);chNames.add(c.name.trim().toLowerCase());}return ok;}).slice(0,MAX_CHANNELS);
     if(!object(s.channelRules))s.channelRules={};
     Object.entries(s.channelRules).forEach(([k,v])=>{if(!str(k,80)||!k||!chIds.has(v))delete s.channelRules[k];});
     s.transactions.forEach(t=>{if(t.channel!==undefined&&!chIds.has(t.channel))delete t.channel;});
    }
    s.categories.forEach(c=>{if(c.taxLine!==undefined&&!(TAX_LINES&&typeof c.taxLine==='string'&&Object.hasOwn(TAX_LINES,c.taxLine)))delete c.taxLine;});
    if(P.features.tax){const r=s.settings.taxRate;if(r===undefined)s.settings.taxRate=P.settings.taxRate;else if(!Number.isInteger(r)||r<0||r>9000)fail();}
    if(P.features.mileage){const r=s.settings.mileageRate;if(r===undefined)s.settings.mileageRate=P.settings.mileageRate;else if(!Number.isInteger(r)||r<0||r>100000)fail();
     if(!['mi','km'].includes(s.settings.distanceUnit))s.settings.distanceUnit=P.settings.distanceUnit||'mi';
     if(s.mileage===undefined)s.mileage=[];if(!Array.isArray(s.mileage)||s.mileage.length>20000)fail();
     const mids=new Set();s.mileage.forEach(t=>{if(!object(t)||!id(t.id)||mids.has(t.id)||!validDate(t.date)||!str(t.purpose,200)||!t.purpose.trim()||!str(t.route??'',200)||!Number.isSafeInteger(t.miles)||t.miles<=0||t.miles>10000000)fail();mids.add(t.id);});}
    if(P.features.invoices){if(s.invoices===undefined)s.invoices=[];if(!Array.isArray(s.invoices)||s.invoices.length>5000)fail();
     const iids=new Set();s.invoices.forEach(v=>{const c=s.categories.find(c=>c.id===v.category);
      if(!object(v)||!id(v.id)||iids.has(v.id)||!str(v.number,40)||!str(v.client,100)||!v.client.trim()||!validDate(v.issued)||!validDate(v.due)||v.due<v.issued||!amount(v.amount)||v.amount<=0||!c||type(c)!=='income'||!str(v.note??'',500))fail();
      if(v.channel!==undefined&&!(s.channels||[]).some(c=>c.id===v.channel))delete v.channel;
      if(v.paid!==undefined){if(!object(v.paid)||!validDate(v.paid.date))fail();if(v.paid.tx!==undefined&&!tids.has(v.paid.tx))delete v.paid.tx;}
      iids.add(v.id);});}
    const gids=new Set(),cats=new Set();s.goals.forEach(g=>{
     const gc=s.categories.find(c=>c.id===g.category);
     if(gc&&g.kind===undefined)g.kind=isDebt(gc)?'debt':'saving';
     const fits=gc&&(g.kind==='debt'?isDebt(gc):type(gc)==='saving');
     if(!object(g)||!id(g.id)||gids.has(g.id)||cats.has(g.category)||!ids.has(g.category)||!['saving','debt'].includes(g.kind)||!fits||!str(g.name,100)||!amount(g.target)||g.target<=0||!amount(g.opening)||g.opening<0||!validDate(g.start)||!validDate(g.due)||g.due<g.start)fail();
     // a damaged or oversized photo is dropped rather than failing the whole restore
     if(g.image!==undefined&&(typeof g.image!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(g.image)||g.image.length>900000))delete g.image;
     if(g.kind==='debt')delete g.image;
     gids.add(g.id);cats.add(g.category);});
    Object.entries(s.reviews).forEach(([k,r])=>{if(!validDate(k)||!object(r)||!str(r.win,3000)||!str(r.change,3000)||!Array.isArray(r.checks)||r.checks.length!==3||r.checks.some(x=>typeof x!=='boolean')||typeof r.done!=='boolean')fail();});
    return s;
  }
  // Embedded covers keep the fictional sample fully usable as a single offline HTML file.
  const SAMPLE_GOAL_IMAGES={travel:"",emergency:"",investing:""};
  // The fictional sample is described by the pack (P.sample); this only turns it into records.
  function sample(m=today().slice(0,7)){
    const S=P.sample,s=blank();s.settings.name=S.name;Object.assign(s.settings,S.settings||{});
    (S.extraCategories||[]).forEach(([id,name,group,taxLine])=>s.categories.push({id,name,group,archived:false,...(taxLine?{taxLine}:{})}));
    const year=m.slice(0,4),now=today(),amounts=S.amounts,spread=S.spread;
    for(let i=1;i<=12;i++){
      const key=`${year}-${String(i).padStart(2,'0')}`,past=key<m;
      s.months[key]={opening:S.opening,closed:past,note:key===m?S.note:'',plan:{}};
      Object.entries(amounts).forEach(([id,a],j)=>{const day=S.days[id]||Math.min(28,j+1);s.months[key].plan[id]={amount:a*100,day:S.undated.includes(id)?0:day};
        if(key>m)return;
        const c=s.categories.find(c=>c.id===id),real=S.actual?S.actual(id,i,a):a;
        if(spread.groups.includes(c.group)){
          spread.days.forEach((d,n)=>{const date=`${key}-${String(d).padStart(2,'0')}`;if(date<=now)s.transactions.push({id:uid(),date,category:id,amount:Math.round(real*100*(spread.share[id]??spread.share.default)+(past?(i%3)*100:0)),note:spread.notes[n]});});
        }else{const date=key+'-'+String(day).padStart(2,'0');if(date<=now&&real)s.transactions.push({id:uid(),date,category:id,amount:Math.round(real*100),note:c.name});}
      });
    }
    s.baseline=JSON.parse(JSON.stringify(s.months[m].plan));
    for(const key of Object.keys(s.months))if(key>m)s.months[key].plan={};
    s.schedules=s.categories.filter(c=>!spread.groups.includes(c.group)&&!(S.unscheduled||[]).includes(c.id)&&amounts[c.id]).map(c=>({id:'sample-'+c.id,name:c.name,category:c.id,amount:amounts[c.id]*100,frequency:'monthly',start:year+'-01-'+String(s.months[year+'-01'].plan[c.id].day).padStart(2,'0'),end:year+'-12-31'}));
    s.transactions.forEach(t=>{const r=s.schedules.find(r=>r.category===t.category);if(r)t.scheduleKey=r.id+'@'+t.date;});
    if(S.snapshots)for(let i=1;i<=+m.slice(5,7);i++){const credit=Math.max(0,198000-i*22000),personal=Math.max(0,240000-i*18000),car=Math.max(0,510000-i*30000),loans=personal+car,mortgage=Math.max(0,300000-i*10000),debts=credit+loans+mortgage;s.snapshots[year+'-'+String(i).padStart(2,'0')]={cash:120000+i*18000,savings:190000+i*70000,investments:600000+i*41000,other:150000,debts,debtMix:{credit,loans,mortgage,other:0},note:'Fictional month-end statement balances.'};}
    s.goals=S.goals.map(g=>({id:uid(),category:g.category,kind:g.kind,name:g.name,target:g.target,opening:g.opening,start:year+'-01-01',due:(+year+g.due[0])+'-'+g.due[1],...(g.image?{image:SAMPLE_GOAL_IMAGES[g.image]}:{})}));
    if(S.extras)S.extras(s,{m,year,now,uid,days,shift,plusDays,totals:(st,mm)=>{invalidate(st);return totals(st,mm);}});
    return s;
  }
  return {P,GROUP_DEFS,group,isDebt,counted,matchKey,sameMerchant,ruleFor,channelFor,channelProfit,health,MAX_CHANNELS,TAX_LINES,taxLineFor,pl,plMonth,monthsBetween,endOf,taxSetAside,mileageAmount,mileageTotals,taxSummary,receivables,planFor,overrides,CURRENCIES,DATE_FORMATS,THEMES,MAX_QUICK_MEMORY,invalidate,FREQUENCIES,plusDays,occurrences,schedulePlan,reserves,annualCategories,snapshotTotals,quickKey,parseQuick,protectClosedSchedules,GROUPS,type,uid,today,validMonth,validDate,days,shift,cents,blank,month,transactions,actual,rows,totals,annual,goalProgress,due,validate,sample};
})(NICHE);
if(typeof module!=='undefined')module.exports=Budget;
