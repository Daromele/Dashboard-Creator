/* ===================================================================================
   NICHE PACK · Autónomo Plan (self-employed in Spain, English edition)
   A recordkeeping edition: enter each payment and receipt once, in its own currency, with
   the euro rate and its evidence links; filter any period and print a gestor report.
   Every record belongs to one of the activities below. The IVA / IRPF / cuota estimate
   screens from the Profit Plan engine stay available behind a setting (off by default).
   Figures are indicative, for review with a gestor, not a tax calculation.
   =================================================================================== */
const NICHE = {
  id: 'autonomo',
  product: {
    name: 'Autónomo Plan', mark: 'A', publisher: 'JPS DIGITAL PAGES', version: '0.9',
    tagline: 'Records & gestor reports for autónomos in Spain', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Autónomo Plan · Income, Expense &amp; Evidence Records for the Self-employed in Spain', themeColor: '#2A1F3D',
    description: 'Autónomo Plan by JPS Digital Pages. Record every payment and receipt once, in any currency with its euro value, attach evidence links, filter by period, activity or platform, and print a gestor report in euros. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%232A1F3D"/><path d="M18 48 32 16l14 32M23 37h18" fill="none" stroke="%23F2B544" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: 'Autónomo Plan. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Enter once, report anytime.</b>Every payment and receipt with its evidence, ready for your gestor in one PDF.',
    printTitle: 'Autónomo Plan · JPS Digital Pages',
  },
  build: { file: 'AutonomoPlan.html' },
  storage: { key: 'jps-autonomo-plan', file: 'autonomo-plan' },
  editions: { budget: 'Monthly Plan, the household budget edition', business: 'Profit Plan, the business edition', creator: 'Creator Plan, the creator edition' },
  themes: ['ledger', 'sage', 'fjord', 'slate', 'linen', 'night', 'midnight'],
  // records: every income and expense is one record with its evidence; vat: the IVA & IRPF
  // estimate screens, shown only when switched on in Settings
  features: { goals: true, wealth: false, pl: true, tax: true, taxLines: true, mileage: false, invoices: true, channels: true, vat: true, records: true },
  // the four activities every record belongs to
  activities: [['digital', 'Digital Studio'], ['ai', 'AI Training / Contract Work'], ['prof', 'Other Professional Activity'], ['other', 'Other']],
  evidenceTypes: [['statement', 'Platform statement / CSV'], ['screenshot', 'Screenshot'], ['payment', 'Payment confirmation'], ['taxform', '1099 / tax form'], ['invoice', 'Invoice'], ['bank', 'Bank / payment-processor transaction'], ['drive', 'Google Drive file'], ['other', 'Other']],
  accounts: [['business-bank', 'Business bank'], ['personal-bank', 'Personal bank'], ['paypal', 'PayPal'], ['payoneer', 'Payoneer'], ['stripe', 'Stripe'], ['other', 'Other']],
  // payers and platforms a new planner starts with: [id, name, activity, usual currency]. Rename or add your own shops.
  seedPayers: [['py-etsy', 'Etsy', 'digital', 'USD'], ['py-youtube', 'YouTube / Google AdSense', 'digital', 'USD'], ['py-patreon', 'Patreon', 'digital', 'USD'], ['py-fourthwall', 'Fourthwall', 'digital', 'USD'], ['py-cmarket', 'Creative Market', 'digital', 'USD'], ['py-cfabrica', 'Creative Fabrica', 'digital', 'USD'], ['py-website', 'Website sales', 'digital', 'EUR'], ['py-payhip', 'Payhip', 'digital', 'USD'], ['py-gumroad', 'Gumroad', 'digital', 'USD'], ['py-affiliate', 'Affiliate income', 'digital', 'USD'], ['py-sponsor', 'Sponsorships', 'digital', 'USD'], ['py-ai', 'AI training client', 'ai', 'USD']],
  // income category for each activity; platform fees on an income record count against this cost category
  categoryActivity: { 'inc-digital': 'digital', 'inc-ai': 'ai', 'inc-prof': 'prof', 'inc-other': 'other' },
  incomeCategory: { digital: 'inc-digital', ai: 'inc-ai', prof: 'inc-prof', other: 'inc-other' },
  feesCategory: 'platform-fees',
  suggestedChannels: ['Etsy', 'YouTube / Google AdSense', 'Patreon', 'Fourthwall', 'Creative Market', 'Creative Fabrica', 'Payhip', 'Gumroad', 'Website sales', 'Affiliate income', 'Sponsorships', 'AI training client'],
  suggestedTags: ['Digital products', 'Memberships', 'Ad revenue', 'Affiliates', 'Sponsorships', 'AI training', 'Services', 'Studio tools', 'Admin & compliance'],
  // the usual tag for a payer, by name (a name that starts with one of these counts too, e.g. "Etsy — My Shop")
  channelTags: { etsy: 'Digital products', payhip: 'Digital products', gumroad: 'Digital products', fourthwall: 'Digital products', 'creative market': 'Digital products', 'creative fabrica': 'Digital products', 'website sales': 'Digital products', patreon: 'Memberships', 'buy me a coffee': 'Memberships', 'ko-fi': 'Memberships', youtube: 'Ad revenue', 'affiliate income': 'Affiliates', sponsorships: 'Sponsorships', 'ai training client': 'AI training', clients: 'Services' },
  // taxRate is unused by the Spanish tax screens but kept so a backup validates like the other editions
  settings: { currency: 'EUR', dateFormat: 'dmy', taxRate: 2000, hiddenNav: [], es: { exempt130: false, lowIncome: 0, plana: false, planaUntil: '', cadence: 'quarterly', docsDay: 10, estimates: true } },
  tourTopics: 'records, evidence, the gestor report and backups',

  // type: income | expense | saving (money moved aside) · cogs: purchases for what you sell
  // cuota: your own Seguridad Social payment, which the cuota bracket check reads
  groups: [
    { id: 'revenue', label: 'Income', type: 'income', taxLine: 'I1' },
    { id: 'other-income', label: 'Other income', type: 'income', other: true, taxLine: 'I2' },
    { id: 'selling', label: 'Selling & marketing', type: 'expense', taxLine: 'G8' },
    { id: 'tools', label: 'Software, hosting & design', type: 'expense', subscription: true, taxLine: 'G8' },
    { id: 'office', label: 'Office & equipment', type: 'expense', taxLine: 'G12' },
    { id: 'services', label: 'Professional & bank fees', type: 'expense', taxLine: 'G7' },
    { id: 'travel', label: 'Travel & learning', type: 'expense', taxLine: 'G8' },
    { id: 'social', label: 'Cuota de autónomos', type: 'expense', fixed: true, cuota: true, taxLine: 'G4', icon: 'shield' },
    { id: 'other-expense', label: 'Other expenses', type: 'expense', taxLine: 'G13' },
    { id: 'owner', label: 'Your own pay', type: 'saving' },
    { id: 'tax', label: 'Tax pot & Hacienda', type: 'saving', tax: true, icon: 'shield' },
    { id: 'reserve', label: 'Business savings', type: 'saving', icon: 'umbrella' },
    { id: 'loans', label: 'Loan repayments', type: 'saving', fixed: true, debt: true },
    { id: 'transfer', label: 'Card payments & own transfers', type: 'transfer', debt: true },
  ],
  // [id, name, group, Renta line, usual IVA rate (used only by the optional estimates)]
  categories: [
    ['inc-digital', 'Digital Studio income', 'revenue', 'I1', 0], ['inc-ai', 'AI training & contract income', 'revenue', 'I1', 0], ['inc-prof', 'Other professional income', 'revenue', 'I1', 2100], ['inc-other', 'Other income', 'other-income', 'I2', 0], ['interest', 'Bank interest', 'other-income', 'N', 0],
    ['platform-fees', 'Platform fees', 'selling', 'G8', 0], ['advertising', 'Advertising', 'selling', 'G8', 2100],
    ['software', 'Software / subscriptions', 'tools', 'G8', 2100], ['hosting', 'Hosting / domains', 'tools', 'G8', 2100], ['design-assets', 'Design assets', 'tools', 'G8', 2100],
    ['office-equipment', 'Office / equipment', 'office', 'G12', 2100],
    ['professional', 'Professional fees', 'services', 'G7', 2100], ['bank-fees', 'Bank / payment fees', 'services', 'G8', 0],
    ['travel', 'Travel / business', 'travel', 'G8', 1000], ['education', 'Education / research', 'travel', 'G8', 2100],
    ['cuota', 'Cuota de autónomos (Seguridad Social)', 'social', 'G4', 0],
    ['other-expense', 'Other', 'other-expense', 'G13', 2100],
    ['owner-draw', 'Owner’s draw', 'owner'],
    ['tax-pot', 'Tax pot transfer', 'tax'], ['iva-paid', 'IVA paid (Modelo 303)', 'tax'], ['irpf-paid', 'IRPF paid (Modelo 130 & Renta)', 'tax'], ['withholding-paid', 'Withholding paid (Modelos 111 & 115)', 'tax'],
    ['rainy-day', 'Rainy-day fund', 'reserve'],
    ['loan-repay', 'Business loan repayment', 'loans'],
    ['card-payoff', 'Card payoff (purchases already logged)', 'transfer'], ['own-transfer', 'Transfer between my accounts', 'transfer'], ['platform-payout', 'Platform payouts (already recorded)', 'transfer'],
  ],
  // The activity section of the Renta (Modelo 100), direct estimation. Box numbers change every
  // year, so the lines carry their Spanish names rather than numbers.
  taxForm: { name: 'Renta', long: 'Renta (Modelo 100) · business income, estimación directa', parts: { income: 'Income', other: 'Other income', expense: 'Deductible expenses', none: 'Not part of the activity' } },
  taxLines: [
    { id: 'I1', line: '—', label: 'Operating income (ingresos de explotación)', part: 'income' },
    { id: 'I2', line: '—', label: 'Other income, grants included (otros ingresos)', part: 'other' },
    { id: 'G1', line: '—', label: 'Purchases & materials (consumos de explotación)', part: 'expense' },
    { id: 'G2', line: '—', label: 'Wages (sueldos y salarios)', part: 'expense' },
    { id: 'G3', line: '—', label: 'Staff Seguridad Social (a cargo de la empresa)', part: 'expense' },
    { id: 'G4', line: '—', label: 'Your own Seguridad Social (del titular)', part: 'expense' },
    { id: 'G5', line: '—', label: 'Rent (arrendamientos y cánones)', part: 'expense' },
    { id: 'G6', line: '—', label: 'Repairs & maintenance (reparaciones y conservación)', part: 'expense' },
    { id: 'G7', line: '—', label: 'Professional services (servicios de profesionales independientes)', part: 'expense' },
    { id: 'G8', line: '—', label: 'Other outside services (otros servicios exteriores)', part: 'expense' },
    { id: 'G9', line: '—', label: 'Utilities (suministros)', part: 'expense', note: 'Working from home: usually 30% of the share of the home used for work, if it is declared on your 036/037.' },
    { id: 'G10', line: '—', label: 'Deductible taxes (tributos fiscalmente deducibles)', part: 'expense' },
    { id: 'G11', line: '—', label: 'Financial costs (gastos financieros)', part: 'expense' },
    { id: 'G12', line: '—', label: 'Depreciation (amortizaciones)', part: 'expense', note: 'Shown at the full purchase price. Items over about €300 are usually depreciated over several years; your gestor applies the tables.' },
    { id: 'G13', line: '—', label: 'Other deductible costs (otros conceptos fiscalmente deducibles)', part: 'expense', note: 'Meals while working away count up to the daily limits (about €26.67 in Spain, €48.08 abroad) when paid electronically.' },
    { id: 'N', line: '—', label: 'Not part of the activity (bank interest, personal)', part: 'none', exclude: true },
  ],
  // Modelo 303 and 130 periods: the 20th of April, July and October, and 30 January
  taxQuarters: [
    { label: 'Q1', months: [1, 3], due: '04-20' },
    { label: 'Q2', months: [4, 6], due: '07-20' },
    { label: 'Q3', months: [7, 9], due: '10-20' },
    { label: 'Q4', months: [10, 12], due: '01-30', nextYear: true },
  ],
  // Quick Log: a word in the description → category id. Earlier words win, so specific ones come first.
  aliases: { cuota: 'cuota', autonomos: 'cuota', reta: 'cuota', gestoria: 'professional', gestor: 'professional', asesoria: 'professional', accountant: 'professional', taxpot: 'tax-pot', hucha: 'tax-pot', etsyfee: 'platform-fees', fees: 'platform-fees', comision: 'platform-fees', stripe: 'bank-fees', paypal: 'bank-fees', payoneer: 'bank-fees', hosting: 'hosting', domain: 'hosting', dominio: 'hosting', squarespace: 'hosting', shopify: 'hosting', adobe: 'software', canva: 'software', figma: 'software', notion: 'software', chatgpt: 'software', midjourney: 'software', software: 'software', subscription: 'software', envato: 'design-assets', font: 'design-assets', fonts: 'design-assets', mockup: 'design-assets', ads: 'advertising', pinterest: 'advertising', publicidad: 'advertising', promo: 'advertising', laptop: 'office-equipment', ordenador: 'office-equipment', portatil: 'office-equipment', monitor: 'office-equipment', printer: 'office-equipment', course: 'education', curso: 'education', book: 'education', libro: 'education', flight: 'travel', hotel: 'travel', renfe: 'travel', vueling: 'travel', taxi: 'travel', uber: 'travel', etsy: 'inc-digital', patreon: 'inc-digital', youtube: 'inc-digital', adsense: 'inc-digital', gumroad: 'inc-digital', payhip: 'inc-digital', fourthwall: 'inc-digital', affiliate: 'inc-digital', sponsor: 'inc-digital', annotation: 'inc-ai', labeling: 'inc-ai', evaluation: 'inc-ai', training: 'inc-ai', client: 'inc-prof', cliente: 'inc-prof', factura: 'inc-prof', invoice: 'inc-prof', interest: 'interest', interes: 'interest', transfer: 'own-transfer', traspaso: 'own-transfer' },
  importHints: {
    'credit card payment': 'card-payoff', 'card payment': 'card-payoff', 'pago tarjeta': 'card-payoff', transfer: 'own-transfer', traspaso: 'own-transfer', transferencia: 'own-transfer',
    'seguridad social': 'cuota', 'tgss': 'cuota', 'cuota autonomos': 'cuota', 'aeat': 'iva-paid', 'agencia tributaria': 'iva-paid', hacienda: 'iva-paid',
    advertising: 'advertising', software: 'software', 'office supplies': 'office', shipping: 'shipping', correos: 'shipping',
    travel: 'travel', restaurants: 'meals', restaurantes: 'meals', fuel: 'transport', gasolina: 'transport', insurance: 'insurance', seguros: 'insurance',
    fees: 'bank-fees', comisiones: 'bank-fees', 'bank fees': 'bank-fees', income: 'services', ingreso: 'services', ingresos: 'services', sales: 'product-sales',
  },
  defaults: { category: 'inc-digital', schedule: 'software', annualCategory: 'inc-digital', payout: 'platform-payout', quickSetup: ['inc-digital', 'inc-ai', 'software', 'cuota', 'professional', 'tax-pot'] },
  platformDefaults: { sale: 'inc-digital', refund: 'inc-digital', fees: 'platform-fees', ads: 'advertising', shipping: 'other-expense', feeTax: 'platform-fees', payout: '__skip', conversion: '__skip', taxWithheld: 'irpf-paid', purchase: '', other: '',
    platforms: { paypal: { sale: 'inc-prof', refund: 'inc-prof' }, stripe: { sale: 'inc-prof', refund: 'inc-prof' } } },

  nav: [['dashboard', 'Dashboard', 'today'], ['income', 'Income', 'down'], ['expenses', 'Expenses', 'up'], ['evidence', 'Evidence', 'link'], ['payers', 'Payers & platforms', 'globe'], ['invoices', 'Invoices', 'table'], ['report', 'Gestor report', 'print'], ['filings', 'Checklist & dates', 'check'], ['taxlines', 'Year-end summary', 'tags'], ['tax', 'IVA & IRPF estimates', 'shield'], ['activity', 'All transactions', 'log'], ['pl', 'Profit & loss', 'insights'], ['annual', 'Annual overview', 'outlook'], ['budget', 'Monthly targets', 'plan'], ['scheduled', 'Recurring costs', 'calendar'], ['goals', 'Reserves & goals', 'umbrella'], ['calendar', 'Calendar', 'calendar'], ['insights', 'Business health', 'spark'], ['review', 'Weekly review', 'review'], ['settings', 'Settings & backup', 'palette'], ['guide', 'How to use', 'help']],
  optionalNav: ['filings', 'taxlines', 'activity', 'pl', 'annual', 'invoices', 'budget', 'scheduled', 'goals', 'calendar', 'insights', 'review', 'guide'],
  // the estimate screens only appear when switched on in Settings
  estimateNav: ['tax', 'taxlines'],
  navGroups: [['Records', ['dashboard', 'income', 'expenses', 'evidence', 'payers', 'invoices']], ['For your gestor', ['report', 'filings', 'taxlines', 'tax']], ['Your business', ['activity', 'pl', 'annual', 'insights', 'review']], ['Plan ahead', ['budget', 'scheduled', 'goals', 'calendar']]],
  navGroupRest: 'Settings & help',

  labels: {
    channelShort: 'platform', channelOne: 'Payer / platform', channelsTitle: 'Payers & platforms', channelPlaceholder: 'e.g. Etsy, Patreon, a client',
    income: 'Revenue', expense: 'Expenses', saving: 'Transfers & draws', savingShort: 'Transfers', savingOne: 'Transfer',
    incomePlanned: 'Expected revenue', incomeReceived: 'Money received', expensesPaid: 'Money paid out', savedInvested: 'Transfers & draws',
    plannedContributions: 'Planned transfers', savingsFilter: 'Transfers & draws',
    plannedIncome: 'PLANNED REVENUE', subscriptionKpi: 'Overheads plan', yourName: 'Business or trading name', yourNameHint: 'Shown on your statements and exports',
    greeting: ' · the month at a glance', greetingPlain: 'Your business at a glance', planTitle: 'Your monthly targets', categoryPlaceholder: 'e.g. Photography sessions',
    categorySub: 'Shape the categories around how your business really runs.', directionNormal: 'Money in / cost paid / transfer',
    budgetOver: 'over target by', budgetLeft: 'under target by', repeatNote: 'Copy this month’s targets into months that have none, then adjust the months that need something different.', repeatButton: 'Repeat these targets',
    openingLabel: 'Opening cash balance', recurringButton: 'Recurring costs', planNoun: 'targets', txFormNote: 'Enter the amount that moved in your bank, then the IVA and any IRPF withholding on the invoice or receipt.',
    quickSetupSave: 'Save starting targets', importSub: 'Map the columns, review the rows, then add them to your books.',
    calendarTitle: 'Your business calendar', scheduleEmpty: 'Add your cuota de autónomos, rent, a subscription, or a regular transfer to your tax pot.',
    quickSetupNote: 'You can add the rest of your categories, dates and transfers in Monthly targets. This sets targets; it does not record any sales or costs.',
    importFrom: 'Use a CSV export from your bank, PayPal, a selling platform or another bookkeeping app.',
    exitDemo: 'Return to my books', demoOnly: 'Your books only', notePlaceholder: 'e.g. Factura 2026-014 · Estudio Norte',
    incomeOne: 'Revenue', savedCol: 'Transfers', netHint: 'Money in − money out − transfers, IVA included',
    savingRateEmpty: 'Log revenue to see the share moved aside', savingRate: '% of money received',
    transfer: 'Card payments & own transfers', transferOne: 'Transfer',
    noPlan: 'No monthly target set', editPlan: 'Edit targets',
    rhythmPlan: 'Set this month’s revenue and cost targets', incomeWeek: 'Money in this week', reviewDaysNote: 'Days with at least one sale or cost logged.',
    reviewChecks: ['I matched this week’s entries to my bank statement and set the IVA on each.', 'I followed up on invoices that are due or late.', 'I moved this week’s share of IVA and IRPF into the tax pot.'],
    goalsEyebrow: 'Build a cushion', goalsTitle: 'Reserves, goals & loan payoff', goalsPlanTitle: 'This month’s transfers', goalsPlanSub: 'Draws, tax pot and reserves planned for', heroBills: 'Unpaid bills & fixed costs', heroSave: 'Planned transfers to make', heroFree: 'Free to use',
    heroLead: 'Free to use once unpaid fixed costs and planned transfers, like the tax pot and your draw, are covered. IVA you collected is not yours: keep it in the tax pot.',
    statementKinds: 'a bank or platform statement',
    importNote: 'Amounts in another currency are converted at a rate you choose on the review screen. Statements from Etsy, Shopify, PayPal, Stripe and similar platforms are recognised, and each sale is split from the platform’s fees. Imported rows take their category’s usual IVA; check it before you import.',
  },
  quickLog: { placeholder: 'factura cliente 1210', help: 'Try “factura cliente 1210”, “adobe 24.19”, “correos 6.50” or “cuota 294”. The category’s usual IVA is applied; edit the entry to change it.', demo: ['correos', '6.50', 'Packaging & shipping to customers'] },

  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Enter once. Report anytime.', text: '<p>Record each payment you receive and each cost you pay, once, with a link to its proof. Autónomo Plan keeps them together and turns any period into a report for your gestor.</p><p>Everything stays in this browser. No bank login, no subscription.</p>' },
    { icon: 'globe', step: 'CURRENCIES', title: 'Earn in dollars, report in euros', text: '<p>Enter each amount in the currency it was paid in, with the euro rate for that day. The report shows the euro figures your gestor needs, with the original amount and rate beside each one.</p>' },
    { icon: 'link', step: 'EVIDENCE', title: 'The proof sits with the record', text: '<p>Paste a Google Drive or Dropbox link to the invoice, statement or screenshot. Records without one are marked <b>Missing</b>, so the gaps show before your gestor asks.</p>' },
    { icon: 'print', step: 'GESTOR', title: 'One report for any period', text: '<p><b>Gestor report</b> prints a month, a quarter or the year: totals by activity and platform, every record, and an appendix of evidence links. Save it as a PDF and send it.</p><p><b>Not tax, legal or financial advice.</b> Figures are indicative; your gestor files the forms.</p>' },
    { icon: 'table', step: 'IMPORT', title: 'Or bring in a statement', text: '<p>Import a bank CSV, or a statement from Etsy, PayPal, Stripe and similar platforms: each sale is split from its fees, and amounts in another currency are converted at a rate you choose. Imported rows arrive as records marked <b>Missing</b> until you add their evidence.</p>', cta: { label: 'Import a statement', action: 'welcome-import' } },
    'backup',
    { icon: 'check', step: 'START', title: 'Start with one payment', text: '<p>Add the last payment you received, with its rate and a link to its confirmation. Your dashboard fills in from there.</p><p>Want a clean slate later? <b>Settings → Start fresh</b> clears the books in one step.</p>', cta: { label: 'Add a record', action: 'welcome-log' } },
  ],
  guide: {
    title: 'Enter once. Store. Filter. Report.',
    cards: [
      ['down', '1. Record income', 'Each payout as it lands: gross, refunds, fees and payout in the original currency, with the euro rate.', 'Income', 'income'],
      ['up', '2. Record costs', 'Each receipt with its vendor, category and the business share you use.', 'Expenses', 'expenses'],
      ['link', '3. Link the proof', 'Paste the Drive link to the invoice or statement. Missing evidence shows up straight away.', 'Evidence', 'evidence'],
      ['print', '4. Send the report', 'Pick a month, a quarter or the year and save the gestor report as a PDF.', 'Gestor report', 'report'],
    ],
    meanings: [['Base', 'The amount before IVA'], ['IVA repercutido', 'IVA you charged and owe'], ['IVA soportado', 'IVA you paid and can deduct'], ['Retención', 'IRPF a client kept back for you']],
    details: [
      ['Income records', 'One record per payout or statement: the date, the activity it belongs to, the payer or platform, and the amounts as the platform shows them (gross, refunds, fees and the payout that reached you), in their own currency. Add the euro rate and the euro figures follow. The report counts gross income less refunds, with platform fees as a cost.'],
      ['Monthly statements, one record per shop', 'On Income, choose <b>Import statements</b> and pick the month’s CSV statements, several shops at once. Each becomes one income record: sales less the tax buyers paid (Etsy collects and passes it on), refunds, platform fees (with any tax on them) and the payout, in the statement’s currency with your rate to euros. Etsy Ads become a separate Advertising expense. Choose which shop each file belongs to the first time; after that the app recognises a shop by its listings. Importing the same shop and month again replaces the record. Etsy: Shop Manager › Finances › Monthly statements › Download CSV. PDF statements can’t be read, but you can link one as evidence.'],
      ['Expense records', 'One record per receipt or invoice: vendor, category, amount in its currency, euro rate and the share used for the business (100% unless it is shared with personal use). The deductible figure is indicative; your gestor decides what counts.'],
      ['Which euro rate?', 'Use the rate for the day the money arrived or left: the one your bank or PayPal applied when you converted, or the ECB reference rate for that day. Autónomo Plan remembers the last rate for each currency and suggests it for the next record.'],
      ['Evidence links', 'Keep the files in Google Drive, Dropbox or OneDrive and paste a share link on the record, with its type (invoice, statement, payment confirmation…). A record with at least one link is Complete, one without is Missing; you can mark one Needs review, and tick Reviewed once you have checked it. Share the folder with your gestor, or set links to “anyone with the link”, so they open from the PDF.'],
      ['Payers & platforms', 'Each payer remembers its activity, currency and account, so a new record starts filled in. Attach a yearly document to a payer, such as a US 1099 form, and it appears in the evidence appendix for that year.'],
      ['The gestor report', 'Choose a period (a month, a quarter, the year, or any dates) and add a note if needed. The report opens ready to print: a summary, totals by activity and by platform, every income and expense record with its original currency and rate, and an appendix of evidence links. In the print dialog choose <b>Save as PDF</b>.'],
      ['Duplicate and repeat', 'Open a record and choose Duplicate to start next month’s from it: the payer, activity, currency and amounts carry over, and you update the date and figures.'],
      ['IVA & IRPF estimates', 'The <b>IVA &amp; IRPF</b> screen estimates each quarter’s Modelo 303 and 130 from your records, your cuota bracket and the Renta, so you can compare with your gestor’s figures. On an income record, set the IVA you charged and any IRPF a Spanish client withheld (0% for sales abroad and most platform sales). On an expense, tick <b>Spanish IVA I can deduct</b> when the receipt is a full invoice with your NIF; that IVA counts on the 303 and is left out of the cost. You can switch the estimates off in Settings → Spain.'],
      ['Take home', 'The dark panel on the dashboard shows, for this month, this quarter or the year to date: revenue (gross less refunds, before IVA), less platform fees, business expenses and your cuota, which gives your profit; less income tax at the rate the year points to, which leaves your take home. Months without a cuota record count the one you expect: €80 when <b>Tarifa plana</b> is ON (switch it on the panel or in Settings → Spain), otherwise the cuota you usually pay. IVA is shown apart because it belongs to Hacienda.'],
      ['Set aside each month', 'The dashboard and the IVA &amp; IRPF screen show what to move to your tax account each month: the month’s IVA (charged less deductible) plus IRPF on its profit, at 20% for the Modelo 130 or your estimated income-tax rate if that is higher, less what clients withheld. Move it when the month ends and the quarter’s payments are covered.'],
      ['How an entry works: amount, IVA and withholding', 'Enter the amount that actually moved in your bank. For an invoice of €1,000 base with 21% IVA and 15% IRPF withholding, you receive €1,060: log €1,060, IVA 21%, withholding 15%. Autónomo Plan works back to the €1,000 base, the €210 IVA you owe Hacienda and the €150 your client paid Hacienda for you. For a receipt, enter what you paid and its IVA rate; the IVA is what you can deduct.'],
      ['Which IVA rate?', 'Most services and goods carry 21%. Some carry 10% (for example hotels, restaurants and passenger transport) or 4% (for example books and some basic foods). Some are exempt (0%): insurance, most bank charges, many medical and education services, and the cuota itself. Invoices from abroad under reverse charge (inversión del sujeto pasivo), such as fees from platforms based in Ireland, show no Spanish IVA: log them at 0% and ask your gestor how they go on the 303. When a receipt is only a simplified ticket, you usually cannot deduct its IVA: log it at 0%.'],
      ['IRPF withholding on your invoices', 'When you invoice a Spanish business or professional for professional services, they keep back IRPF withholding (retención): 15% normally, or 7% in the year you register and the next two. It counts towards your income tax. Invoices to private individuals, and sales of goods, usually carry none. Set the rate on each invoice and on the payment when it arrives.'],
      ['Modelo 303 (IVA), each quarter', 'IVA you charged on sales minus IVA you paid on deductible costs, from 1 January, 1 April, 1 July and 1 October. It is due by the 20th of April, July and October, and 30 January for the fourth quarter, moved to Monday when the day falls on a weekend. A negative result is carried forward to the next quarter; in the fourth you can ask for a refund instead.'],
      ['Modelo 130 (IRPF instalment), each quarter', 'Twenty per cent of your net profit from 1 January, less the withholding on your invoices and the instalments already due. Autónomo Plan takes off the general 5% allowance for costs that are hard to evidence (gastos de difícil justificación), up to €2,000 a year. If at least 70% of last year’s income had withholding, you do not file it: tick that in Settings. If last year’s net profit was €12,000 or less, choose the small quarterly deduction in Settings.'],
      ['Your cuota de autónomos', 'Since 2023 the cuota follows your real net income in 15 brackets. Seguridad Social takes your net profit, adds back the cuota you paid, and takes off 7% for general costs. The IVA & IRPF quarters screen works out that monthly figure from your entries, the bracket it falls in and its minimum cuota (31.5% of the minimum base, 2026 tables), and compares it with what you pay. Once a year, Seguridad Social compares your declared income with your brackets and asks for the difference or refunds it. The tarifa plana (€80 a month for the first 12 months) is not regularised: add its end date in Settings.'],
      ['Tax pot and paying Hacienda', 'Log each move into your tax pot as a Tax pot transfer. When Hacienda takes a 303 or 130 payment straight from your business account, log it as IVA paid or IRPF paid. If it comes out of the pot account, do not log it again: the move into the pot already counted. The quarters screen compares what should be set aside with what you have.'],
      ['Working from home', 'If part of your home is declared as your workplace (on the 036/037), you can usually deduct 30% of the share of the home used for work from water, electricity, gas, phone and internet. Log only that deductible share in Home office utilities, with the bill’s IVA. Rent or mortgage costs on the home follow different rules: ask your gestor.'],
      ['Meals, travel and cars', 'Meals while working away from your usual place are deductible up to daily limits when paid electronically: log them in Meals while working away. Travel and hotels for the business are deductible. Cars are rarely deductible for IRPF unless the activity needs one (for example transport or sales reps); the IVA on a car is usually deductible at 50% at most. Ask your gestor.'],
      ['Invoices and Verifactu', 'Record here the invoices you issue, with their base, IVA and withholding, to follow who owes you. Autónomo Plan is not invoicing software: from 1 July 2027, invoices from autónomos must be produced by software that meets the Verifactu rules. Number invoices in an unbroken series and keep copies.'],
      ['Selling on Etsy, Amazon and other platforms', 'Platform sales start at 0% IVA because who charges the IVA depends on what you sell and to whom: for many digital sales to EU consumers the platform collects it, and B2B or cross-border rules differ. Set the right rate with your gestor, and ask whether you need the ROI (intra-EU operator) registration, Modelo 349 or the OSS. Import the platform’s statement so each sale is split from its fees.'],
      ['Year-end summary and the Renta', 'The Year-end summary groups the year by the lines of the Renta activity section, with the 5% allowance, the IVA totals by rate and the withholding you had. A rough income-tax estimate uses the general 2026 scale and the personal allowance only; your region’s scale, family allowances and reductions change it. Hand the CSVs to your gestor.'],
      ['Checklist & gestor', 'The Checklist lists, for each quarter, the documents your gestor needs (invoices you issued, invoices and receipts for your costs, bank and platform statements, cuota receipts, rent and payroll where they apply) and the forms that follow: Modelo 303, 130, and 111 or 115 when you withheld tax. The year adds the January summaries (390, 190, 180), the 347 in February, the Renta and the papers each needs, such as your clients’ withholding certificates. Set in Settings whether your gestor wants documents every month or every quarter, and by which day. Tick items as you go; the <b>IVA book CSV</b> buttons export the period’s issued or received side with base, IVA and withholding.'],
      ['Dates to remember', 'Modelos 303, 130, 111 and 115: 1–20 April, July and October, and 1–30 January. Modelo 390 (annual IVA summary): by 30 January. Modelo 347 (anyone you dealt with for more than €3,005.06 in the year): February. Renta: April to 30 June.'],
      ['Tags, channels and bulk changes', 'Group income by where it comes from (channels: clients, Etsy, Amazon…) and by kind (tags: services, digital products…). Tick rows in Transactions to change their category, channel, tag or IVA in one step. Every change can be undone.'],
      ['Money in other currencies (imports)', 'Imports convert rows in another currency at a rate you set on the review screen.'],
      ['Not tax, legal or financial advice', 'Autónomo Plan organises your own records and estimates from them, using the 2026 rules as published. It does not know your full situation, regional rules or the latest changes. Your gestor or asesor, or the Agencia Tributaria and Seguridad Social, have the final word. Check before you file or pay.'],
      ['Starting over', 'Settings → <b>Start fresh</b> clears the books in one step. Keep your categories and settings, or erase everything. Download a backup first if you might want the data again.'],
    ],
  },

  // the fictional autónoma behind "Explore sample data": a Valencia designer with two Etsy shops,
  // Patreon and YouTube in dollars, AI-training contract work paid into a personal account, and
  // everyday costs. Most records carry a Drive link; a few are left without, to show the warnings.
  sample: {
    name: 'Studio Lumen', opening: 420000, settings: { goalImages: true, goalsLayout: 'grid' },
    note: 'Attach the September Etsy statements before sending the Q3 package.',
    amounts: { cuota: 89, software: 60, professional: 70 },
    days: { cuota: 30, software: 3, professional: 5 },
    undated: [], unscheduled: [],
    spread: { groups: [], days: [], notes: [], share: { default: 0 } },
    snapshots: false,
    goals: [{ category: 'tax-pot', kind: 'saving', name: 'Money for the gestor’s quarters', target: 400000, opening: 0, due: [0, '12-31'], image: 'emergency' }],
    extras: (s, { m, year, now, uid, totals }) => {
      const monthNo = +m.slice(5, 7), pad = n => String(n).padStart(2, '0'), link = k => `https://drive.google.com/file/d/sample-${k}/view`;
      const usd = [1.09, 1.08, 1.08, 1.07, 1.08, 1.08, 1.09, 1.10, 1.11, 1.11, 1.12, 1.12].map(x => Math.round(1e6 / x) / 1e6);   // EUR per 1 USD
      s.tags = [['tg-digital', 'Digital products'], ['tg-members', 'Memberships'], ['tg-ads', 'Ad revenue'], ['tg-ai', 'AI training'], ['tg-tools', 'Studio tools'], ['tg-admin', 'Admin & compliance'], ['tg-mkt', 'Marketing']].map(([id, name], i) => ({ id, name, color: i + 1 }));
      s.channels = [
        { id: 'py-etsy-a', name: 'Etsy — Lumen Patterns', act: 'digital', cur: 'USD', acct: 'business-bank', tag: 'tg-digital' },
        { id: 'py-etsy-b', name: 'Etsy — Lumen Prints', act: 'digital', cur: 'USD', acct: 'business-bank', tag: 'tg-digital' },
        { id: 'py-patreon', name: 'Patreon', act: 'digital', cur: 'USD', acct: 'paypal', tag: 'tg-members' },
        { id: 'py-youtube', name: 'YouTube / Google AdSense', act: 'digital', cur: 'USD', acct: 'business-bank', tag: 'tg-ads' },
        { id: 'py-cfabrica', name: 'Creative Fabrica', act: 'digital', cur: 'USD', acct: 'paypal', tag: 'tg-digital' },
        { id: 'py-ai', name: 'Northstar AI', act: 'ai', cur: 'USD', acct: 'personal-bank', tag: 'tg-ai', evidence: [{ id: 'ev-1099', type: 'taxform', url: link('1099-northstar'), name: '1099-NEC Northstar AI.pdf', year: +year - 1 }] },
      ];
      s.transactions = s.transactions.filter(t => ['cuota', 'software', 'professional'].includes(t.category));
      // the recurring costs become records too, with their evidence
      s.transactions.forEach((t, i) => { const vendor = { cuota: 'Seguridad Social (TGSS)', software: 'Canva', professional: 'Gestoría Martín' }[t.category];
        t.note = { cuota: 'Monthly cuota (tarifa plana)', software: 'Canva Pro subscription', professional: 'Monthly gestoría fee' }[t.category];
        t.rec = { kind: 'expense', act: 'digital', vendor, cur: 'EUR', rate: 1, amount: t.amount, vatShown: t.category === 'cuota' ? 0 : Math.round(t.amount * 21 / 121), pct: 100, acct: 'business-bank', evidence: i % 7 === 3 ? [] : [{ id: uid(), type: t.category === 'cuota' ? 'bank' : 'invoice', url: link(t.category + '-' + t.date), name: '' }] }; });
      const inc = (date, payer, desc, gross, refunds, fees, type, ev = true, extra = {}) => { const p = s.channels.find(c => c.id === payer), rate = p.cur === 'EUR' ? 1 : usd[+date.slice(5, 7) - 1], payout = gross - refunds - fees;
        if (date > now) return;
        s.transactions.push({ id: uid(), date, category: p.act === 'ai' ? 'inc-ai' : 'inc-digital', channel: payer, amount: Math.round(payout * rate), note: desc,
          rec: { kind: 'income', act: p.act, cur: p.cur, rate, gross, refunds, fees, payout, acct: p.acct, evidence: ev ? [{ id: uid(), type, url: link(payer + '-' + date), name: '' }] : [], ...extra } }); };
      const exp = (date, vendor, category, desc, amount, cur, vatShown, pct, ev = true) => { if (date > now) return; const rate = cur === 'EUR' ? 1 : usd[+date.slice(5, 7) - 1];
        s.transactions.push({ id: uid(), date, category, amount: Math.round(amount * rate), note: desc, rec: { kind: 'expense', act: 'digital', vendor, cur, rate, amount, vatShown, pct, acct: 'business-bank', evidence: ev ? [{ id: uid(), type: 'invoice', url: link(category + '-' + date), name: '' }] : [] } }); };
      for (let i = 1; i <= monthNo; i++) {
        const k = `${year}-${pad(i)}`, end = `${k}-${pad(new Date(+year, i, 0).getDate())}`, season = [0.8, 0.85, 1, 1.05, 0.95, 0.9, 0.7, 0.75, 1.1, 1.2, 1.35, 1.5][i - 1];
        inc(end, 'py-etsy-a', `${new Date(+year, i - 1, 15).toLocaleString('en-GB', { month: 'long' })} platform activity`, Math.round(85000 * season), 3000, Math.round(14000 * season), 'statement', !(i === monthNo && monthNo > 1));
        inc(end, 'py-etsy-b', `${new Date(+year, i - 1, 15).toLocaleString('en-GB', { month: 'long' })} platform activity`, Math.round(32000 * season), 0, Math.round(5200 * season), 'statement', i !== monthNo);
        inc(`${k}-05`, 'py-patreon', 'Monthly Patreon payout', 41000 + i * 800, 0, 3900 + i * 80, 'payment');
        if (i % 2 === 0) inc(`${k}-21`, 'py-youtube', 'AdSense payment', 18000 + i * 1500, 0, 0, 'payment');
        inc(`${k}-15`, 'py-cfabrica', 'Monthly earnings (from the payments page)', 9500 + (i % 3) * 1200, 0, 0, 'screenshot', i % 4 !== 2);
        [8, 22].forEach(d => inc(`${k}-${pad(d)}`, 'py-ai', 'AI response evaluation tasks', 12000 + ((i + d) % 5) * 2500, 0, 0, 'payment', !(i === monthNo - 1 && d === 22)));
        exp(`${k}-11`, 'Etsy Ads', 'advertising', 'Etsy Ads', 4000 + i * 300, 'USD', 0, 100);
        if (i % 3 === 1) exp(`${k}-14`, 'Creative Market', 'design-assets', 'Font and mockup licences', 6900, 'USD', 0, 100, i !== 7);
        if (i % 6 === 2) exp(`${k}-09`, 'SiteGround', 'hosting', 'Hosting renewal', 17988, 'EUR', 3122, 100);
        if (i === 4) exp(`${k}-18`, 'PcComponentes', 'office-equipment', 'Monitor 27"', 32900, 'EUR', 5710, 80);
        if (i === 6) exp(`${k}-12`, 'Domestika', 'education', 'Illustration course', 3990, 'EUR', 692, 100, false);
      }
      // costs by kind, for the expense tag chart
      const costTag = { software: 'tg-tools', hosting: 'tg-tools', 'design-assets': 'tg-tools', 'office-equipment': 'tg-tools', education: 'tg-tools', cuota: 'tg-admin', professional: 'tg-admin', advertising: 'tg-mkt' };
      s.transactions.forEach(t => { if (t.rec?.kind === 'expense' && costTag[t.category]) t.tag = costTag[t.category]; });
      s.checklist = {};
      [[1, '04'], [2, '07']].forEach(([q, mm]) => ['issued', 'received', 'bank', 'platforms', 'cuota'].forEach(k => { const d = `${year}-${mm}-08`; if (d <= now) s.checklist[`${year}-Q${q}:${k}`] = d; }));
      s.invoices = [];
      for (let i = 2; i <= 12; i++) { const prev = `${year}-${pad(i - 1)}`, key = `${year}-${pad(i)}`; s.months[key].opening = totals(s, prev).cash; }
    },
  },
};
