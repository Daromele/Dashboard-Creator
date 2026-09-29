/* ===================================================================================
   NICHE PACK · Autónomo Plan (self-employed in Spain, English edition)
   The Profit Plan engine with Spain's rules around it: every entry carries its IVA and
   any IRPF withholding, the quarterly screen works out Modelo 303 and Modelo 130 from
   what you record, the cuota de autónomos bracket follows your real net income, and the
   year-end summary uses the lines of the Renta activity section (estimación directa).
   Figures come from the 2026 rules as published; they are estimates, not a filed form.
   =================================================================================== */
const NICHE = {
  id: 'autonomo',
  product: {
    name: 'Autónomo Plan', mark: 'A', publisher: 'JPS DIGITAL PAGES', version: '0.9',
    tagline: 'Books, IVA & IRPF for autónomos in Spain', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Autónomo Plan · IVA, IRPF, P&amp;L &amp; Cuota for the Self-employed in Spain', themeColor: '#2A1F3D',
    description: 'Autónomo Plan by JPS Digital Pages. Track income and expenses with IVA and IRPF withholding, see profit by month, quarter or year, estimate Modelo 303 and Modelo 130 each quarter, check your cuota de autónomos bracket and hand your gestor a year-end summary. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%232A1F3D"/><path d="M18 48 32 16l14 32M23 37h18" fill="none" stroke="%23F2B544" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: 'Autónomo Plan. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Know what is really yours.</b>Log income and costs with their IVA. See what Hacienda will ask for each quarter before it does.',
    printTitle: 'Autónomo Plan · JPS Digital Pages',
  },
  build: { file: 'AutonomoPlan.html' },
  storage: { key: 'jps-autonomo-plan', file: 'autonomo-plan' },
  editions: { budget: 'Monthly Plan, the household budget edition', business: 'Profit Plan, the business edition', creator: 'Creator Plan, the creator edition' },
  themes: ['ledger', 'sage', 'fjord', 'slate', 'linen', 'night', 'midnight'],
  // vat: entries carry IVA and IRPF withholding; the tax screens follow Spain's quarterly forms
  features: { goals: true, wealth: false, pl: true, tax: true, taxLines: true, mileage: false, invoices: true, channels: true, vat: true },
  suggestedChannels: ['Clients', 'Etsy', 'Amazon', 'Shopify', 'Payhip', 'Gumroad', 'Wallapop', 'Patreon', 'YouTube', 'Ko-fi'],
  suggestedTags: ['Services', 'Digital products', 'Physical products', 'Courses & workshops', 'Ad revenue', 'Memberships'],
  channelTags: { clients: 'Services', etsy: 'Digital products', payhip: 'Digital products', gumroad: 'Digital products', amazon: 'Physical products', shopify: 'Physical products', wallapop: 'Physical products', patreon: 'Memberships', 'ko-fi': 'Memberships', youtube: 'Ad revenue' },
  // taxRate is unused by the Spanish tax screens but kept so a backup validates like the other editions
  settings: { currency: 'EUR', dateFormat: 'dmy', taxRate: 2000, es: { exempt130: false, lowIncome: 0, planaUntil: '' } },
  tourTopics: 'IVA, IRPF, the cuota, imports and backups',

  // type: income | expense | saving (money moved aside) · cogs: purchases for what you sell
  // cuota: your own Seguridad Social payment, which the cuota bracket check reads
  groups: [
    { id: 'revenue', label: 'Sales & services', type: 'income', taxLine: 'I1' },
    { id: 'other-income', label: 'Other income', type: 'income', other: true, taxLine: 'I2' },
    { id: 'purchases', label: 'Purchases & materials', type: 'expense', cogs: true, taxLine: 'G1' },
    { id: 'overhead', label: 'Overheads', type: 'expense', fixed: true, subscription: true, taxLine: 'G8' },
    { id: 'marketing', label: 'Marketing & selling', type: 'expense', taxLine: 'G8' },
    { id: 'operations', label: 'Running the business', type: 'expense', taxLine: 'G8' },
    { id: 'social', label: 'Cuota de autónomos', type: 'expense', fixed: true, cuota: true, taxLine: 'G4', icon: 'shield' },
    { id: 'people', label: 'Freelancers & staff', type: 'expense', taxLine: 'G7' },
    { id: 'travel', label: 'Travel & meals', type: 'expense', taxLine: 'G8' },
    { id: 'owner', label: 'Your own pay', type: 'saving' },
    { id: 'tax', label: 'Tax pot & Hacienda', type: 'saving', tax: true, icon: 'shield' },
    { id: 'reserve', label: 'Business savings', type: 'saving', icon: 'umbrella' },
    { id: 'loans', label: 'Loan repayments', type: 'saving', fixed: true, debt: true },
    { id: 'transfer', label: 'Card payments & own transfers', type: 'transfer', debt: true },
  ],
  // [id, name, group, Renta line, usual IVA rate in basis points]
  categories: [
    ['services', 'Services & projects', 'revenue', 'I1', 2100], ['product-sales', 'Product sales', 'revenue', 'I1', 2100], ['platform-sales', 'Platform sales (Etsy, Amazon…)', 'revenue', 'I1', 0], ['retainers', 'Retainers & subscriptions', 'revenue', 'I1', 2100],
    ['grants', 'Grants & subsidies', 'other-income', 'I2', 0], ['other-activity', 'Other activity income', 'other-income', 'I2', 2100], ['interest', 'Bank interest', 'other-income', 'N', 0],
    ['materials', 'Materials & supplies for products', 'purchases', 'G1', 2100], ['stock', 'Goods bought for resale', 'purchases', 'G1', 2100], ['shipping', 'Packaging & shipping to customers', 'purchases', 'G8', 2100],
    ['software', 'Software & subscriptions', 'overhead', 'G8', 2100], ['phone-internet', 'Phone & internet', 'overhead', 'G9', 2100], ['coworking', 'Office or coworking rent', 'overhead', 'G5', 2100], ['home-utilities', 'Home office utilities (deductible share)', 'overhead', 'G9', 2100], ['insurance', 'Business insurance', 'overhead', 'G8', 0], ['website', 'Website & hosting', 'overhead', 'G8', 2100],
    ['advertising', 'Advertising & promotion', 'marketing', 'G8', 2100], ['platform-fees', 'Platform & payment fees', 'marketing', 'G8', 0],
    ['gestoria', 'Gestoría & accountant', 'operations', 'G7', 2100], ['office', 'Office supplies', 'operations', 'G8', 2100], ['equipment', 'Equipment & computers', 'operations', 'G12', 2100], ['training', 'Training & courses', 'operations', 'G8', 2100], ['repairs', 'Repairs & maintenance', 'operations', 'G6', 2100], ['bank-fees', 'Bank charges', 'operations', 'G8', 0], ['loan-interest', 'Loan interest', 'operations', 'G11', 0], ['local-taxes', 'Local taxes & fees', 'operations', 'G10', 0],
    ['cuota', 'Cuota de autónomos (Seguridad Social)', 'social', 'G4', 0],
    ['freelancers', 'Freelancers you hire', 'people', 'G7', 2100], ['wages', 'Wages', 'people', 'G2', 0], ['staff-ss', 'Seguridad Social for staff', 'people', 'G3', 0],
    ['travel', 'Business travel & hotels', 'travel', 'G8', 1000], ['meals', 'Meals while working away (dietas)', 'travel', 'G13', 1000], ['transport', 'Transport, fuel & parking', 'travel', 'G8', 2100],
    ['owner-draw', 'Owner’s draw', 'owner'], ['pension', 'Private pension plan', 'owner'],
    ['tax-pot', 'Tax pot transfer', 'tax'], ['iva-paid', 'IVA paid (Modelo 303)', 'tax'], ['irpf-paid', 'IRPF paid (Modelo 130 & Renta)', 'tax'], ['withholding-paid', 'Withholding paid (Modelos 111 & 115)', 'tax'],
    ['rainy-day', 'Rainy-day fund', 'reserve'], ['equipment-fund', 'Equipment fund', 'reserve'],
    ['loan-repay', 'Business loan repayment', 'loans'],
    ['card-payoff', 'Card payoff (purchases already logged)', 'transfer'], ['own-transfer', 'Transfer between my accounts', 'transfer'], ['platform-payout', 'Platform payouts (already imported)', 'transfer'],
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
  aliases: { cuota: 'cuota', autonomos: 'cuota', reta: 'cuota', gestoria: 'gestoria', gestor: 'gestoria', asesoria: 'gestoria', accountant: 'gestoria', modelo303: 'iva-paid', modelo130: 'irpf-paid', renta: 'irpf-paid', hacienda: 'iva-paid', taxpot: 'tax-pot', hucha: 'tax-pot', movistar: 'phone-internet', vodafone: 'phone-internet', orange: 'phone-internet', digi: 'phone-internet', fibra: 'phone-internet', phone: 'phone-internet', internet: 'phone-internet', iberdrola: 'home-utilities', endesa: 'home-utilities', naturgy: 'home-utilities', luz: 'home-utilities', electricity: 'home-utilities', coworking: 'coworking', alquiler: 'coworking', correos: 'shipping', seur: 'shipping', mrw: 'shipping', gls: 'shipping', envio: 'shipping', shipping: 'shipping', postage: 'shipping', packaging: 'shipping', adobe: 'software', canva: 'software', figma: 'software', notion: 'software', software: 'software', subscription: 'software', hosting: 'website', domain: 'website', dominio: 'website', seguro: 'insurance', insurance: 'insurance', publicidad: 'advertising', advert: 'advertising', promo: 'advertising', stripe: 'platform-fees', paypal: 'platform-fees', comision: 'platform-fees', fees: 'platform-fees', curso: 'training', course: 'training', formacion: 'training', portatil: 'equipment', ordenador: 'equipment', laptop: 'equipment', camera: 'equipment', material: 'materials', materials: 'materials', papeleria: 'office', printer: 'office', ink: 'office', vueling: 'travel', iberia: 'travel', ryanair: 'travel', hotel: 'travel', flight: 'travel', renfe: 'transport', cabify: 'transport', taxi: 'transport', uber: 'transport', metro: 'transport', gasolina: 'transport', fuel: 'transport', parking: 'transport', comida: 'meals', menu: 'meals', lunch: 'meals', dinner: 'meals', restaurante: 'meals', freelance: 'freelancers', contractor: 'freelancers', nomina: 'wages', payroll: 'wages', retirada: 'owner-draw', draw: 'owner-draw', factura: 'services', invoice: 'services', cliente: 'services', client: 'services', proyecto: 'services', project: 'services', etsy: 'platform-sales', amazon: 'platform-sales', venta: 'product-sales', sale: 'product-sales', order: 'product-sales', subvencion: 'grants', interes: 'interest', interest: 'interest', transfer: 'own-transfer', traspaso: 'own-transfer' },
  importHints: {
    'credit card payment': 'card-payoff', 'card payment': 'card-payoff', 'pago tarjeta': 'card-payoff', transfer: 'own-transfer', traspaso: 'own-transfer', transferencia: 'own-transfer',
    'seguridad social': 'cuota', 'tgss': 'cuota', 'cuota autonomos': 'cuota', 'aeat': 'iva-paid', 'agencia tributaria': 'iva-paid', hacienda: 'iva-paid',
    advertising: 'advertising', software: 'software', 'office supplies': 'office', shipping: 'shipping', correos: 'shipping',
    travel: 'travel', restaurants: 'meals', restaurantes: 'meals', fuel: 'transport', gasolina: 'transport', insurance: 'insurance', seguros: 'insurance',
    fees: 'bank-fees', comisiones: 'bank-fees', 'bank fees': 'bank-fees', income: 'services', ingreso: 'services', ingresos: 'services', sales: 'product-sales',
  },
  defaults: { category: 'services', schedule: 'software', annualCategory: 'services', payout: 'platform-payout', quickSetup: ['services', 'product-sales', 'cuota', 'software', 'gestoria', 'tax-pot'] },
  platformDefaults: { sale: 'platform-sales', refund: 'platform-sales', fees: 'platform-fees', ads: 'advertising', shipping: 'shipping', feeTax: 'platform-fees', payout: '__skip', conversion: '__skip', taxWithheld: 'irpf-paid', purchase: '', other: '',
    platforms: { paypal: { sale: 'services', refund: 'services' }, stripe: { sale: 'services', refund: 'services' }, youtube: { sale: 'other-activity', refund: 'other-activity' }, patreon: { sale: 'retainers', refund: 'retainers' }, substack: { sale: 'retainers', refund: 'retainers' } } },

  nav: [['dashboard', 'Dashboard', 'today'], ['activity', 'Transactions', 'log'], ['pl', 'Profit & loss', 'insights'], ['annual', 'Annual overview', 'outlook'], ['insights', 'Business health', 'spark'], ['review', 'Weekly review', 'review'], ['budget', 'Monthly targets', 'plan'], ['scheduled', 'Recurring costs', 'calendar'], ['goals', 'Reserves & goals', 'umbrella'], ['calendar', 'Calendar', 'calendar'], ['invoices', 'Invoices', 'table'], ['tax', 'IVA & IRPF quarters', 'shield'], ['taxlines', 'Year-end summary', 'tags'], ['settings', 'Settings & backup', 'palette'], ['guide', 'How to use', 'help']],
  optionalNav: ['invoices', 'annual', 'goals', 'scheduled', 'calendar', 'insights', 'review', 'guide'],
  navGroups: [['Your business', ['dashboard', 'activity', 'pl', 'annual', 'insights', 'review']], ['Plan ahead', ['budget', 'scheduled', 'goals', 'calendar']], ['Invoices & Hacienda', ['invoices', 'tax', 'taxlines']]],
  navGroupRest: 'Settings & help',

  labels: {
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
    { icon: 'today', step: 'WELCOME', title: 'Your autónomo books, in one calm place', text: '<p>Log what comes in and what goes out, with its IVA and any IRPF withholding, or import your bank CSV. Profit, IVA, your IRPF instalments and a year-end summary build themselves.</p><p>Everything stays in this browser. No bank login, no subscription.</p>' },
    { icon: 'insights', step: 'PROFIT', title: 'Profit without the IVA muddle', text: '<p>Every entry is the amount that moved in your bank. Autónomo Plan takes the IVA and withholding out, so <b>Profit &amp; loss</b> shows your real income and costs, the way Hacienda counts them.</p>' },
    { icon: 'shield', step: 'HACIENDA', title: 'See each quarter coming', text: '<p><b>IVA &amp; IRPF quarters</b> estimates Modelo 303 and Modelo 130 from your entries, with the due dates, and checks your cuota de autónomos bracket against your real net income.</p><p><b>Not tax, legal or financial advice.</b> The figures are estimates from what you record. Your gestor or asesor files the forms and knows your situation.</p>' },
    { icon: 'table', step: 'IMPORT', title: 'Bring in a month of bank transactions', text: '<p>Import a CSV from your bank, or a statement from Etsy, Shopify, PayPal or Stripe. Rows take their category’s usual IVA; change it where a receipt says otherwise.</p>', cta: { label: 'Import a bank CSV', action: 'welcome-import' } },
    'backup',
    { icon: 'check', step: 'START', title: 'Start with your cuota and one invoice', text: '<p>Log this month’s cuota de autónomos and a payment you received. Your dashboard and the quarter estimate fill in from there.</p><p>Want a clean slate later? <b>Settings → Start fresh</b> clears the books in one step.</p>', cta: { label: 'Add a transaction', action: 'welcome-log' } },
  ],
  guide: {
    title: 'Four moves. A quarter with no surprises.',
    cards: [
      ['spark', '1. Log with IVA', 'Log income and costs as they happen, or import a bank CSV each month. Check the IVA and withholding on each entry.', 'Transactions', 'activity'],
      ['insights', '2. Check profit', 'Read the P&L for the month, the quarter or the year so far. Amounts are before IVA, the way Hacienda counts them.', 'Profit & loss', 'pl'],
      ['shield', '3. Watch the quarter', 'See the Modelo 303 and 130 estimates and their due dates, and move the money to your tax pot before they fall due.', 'IVA & IRPF quarters', 'tax'],
      ['tags', '4. Hand over', 'Download the year by Renta line, the IVA totals and every transaction for your gestor.', 'Year-end summary', 'taxlines'],
    ],
    meanings: [['Base', 'The amount before IVA'], ['IVA repercutido', 'IVA you charged and owe'], ['IVA soportado', 'IVA you paid and can deduct'], ['Retención', 'IRPF a client kept back for you']],
    details: [
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
      ['Dates to remember', 'Modelos 303, 130, 111 and 115: 1–20 April, July and October, and 1–30 January. Modelo 390 (annual IVA summary): by 30 January. Modelo 347 (anyone you dealt with for more than €3,005.06 in the year): February. Renta: April to 30 June.'],
      ['Tags, channels and bulk changes', 'Group income by where it comes from (channels: clients, Etsy, Amazon…) and by kind (tags: services, digital products…). Tick rows in Transactions to change their category, channel, tag or IVA in one step. Every change can be undone.'],
      ['Money in other currencies', 'Record what reached or left your account in euros, and open <b>In another currency?</b> on the transaction to keep the original amount. Imports convert rows in another currency at a rate you set on the review screen.'],
      ['Not tax, legal or financial advice', 'Autónomo Plan organises your own records and estimates from them, using the 2026 rules as published. It does not know your full situation, regional rules or the latest changes. Your gestor or asesor, or the Agencia Tributaria and Seguridad Social, have the final word. Check before you file or pay.'],
      ['Starting over', 'Settings → <b>Start fresh</b> clears the books in one step. Keep your categories and settings, or erase everything. Download a backup first if you might want the data again.'],
    ],
  },

  // the fictional autónoma behind "Explore sample data": a Valencia illustrator who takes client
  // commissions (with IVA and 15% withholding) and sells digital patterns on Etsy
  sample: {
    name: 'Estudio Salvia', opening: 850000, settings: { goalImages: true, goalsLayout: 'grid', es: { exempt130: false, lowIncome: 0, planaUntil: '' } },
    note: 'Send the reminder to Mar Azul and keep the pot ahead of the October 303.',
    amounts: { services: 2800, 'platform-sales': 700, retainers: 600, materials: 90, shipping: 40, software: 60, 'phone-internet': 45, coworking: 220, 'home-utilities': 30, insurance: 25, website: 15, advertising: 80, 'platform-fees': 70, gestoria: 70, office: 25, training: 40, cuota: 350, meals: 45, 'owner-draw': 1300, 'tax-pot': 750, 'rainy-day': 100 },
    days: { retainers: 1, coworking: 1, software: 3, website: 4, 'phone-internet': 12, insurance: 15, cuota: 30, gestoria: 5, 'owner-draw': 28, 'tax-pot': 28, 'rainy-day': 28 },
    undated: ['services', 'platform-sales', 'materials', 'shipping', 'advertising', 'platform-fees', 'office', 'meals', 'training', 'home-utilities'],
    unscheduled: ['services', 'platform-sales', 'office', 'meals', 'training'],
    spread: { groups: ['purchases', 'marketing'], days: [4, 11, 18, 25], notes: ['Pattern batch', 'Restock', 'Pattern batch', 'Month end'], share: { default: .26 } },
    actual: (id, month, planned) => {
      const season = [0.8, 0.85, 1.0, 1.05, 0.95, 0.9, 0.6, 0.5, 1.1, 1.2, 1.35, 1.5][month - 1];
      if (id === 'services') return Math.round(planned * 0.4 * [0.9, 1.1, 1.25, 0.8, 1.3, 1.05, 0.7, 0.4, 1.2, 1, 1.1, 1.3][month - 1]);
      if (['platform-sales', 'materials', 'shipping', 'platform-fees'].includes(id)) return Math.round(planned * season);
      if (id === 'meals') return month % 2 ? planned : Math.round(planned * 0.6);
      if (id === 'office' || id === 'training') return month % 3 === 0 ? planned * 2 : 0;
      return planned;
    },
    snapshots: false,
    goals: [
      { category: 'tax-pot', kind: 'saving', name: 'IVA & IRPF pot for this year', target: 1100000, opening: 0, due: [0, '12-31'], image: 'emergency' },
      { category: 'rainy-day', kind: 'saving', name: 'Three months of costs in reserve', target: 600000, opening: 200000, due: [1, '06-30'], image: 'investing' },
    ],
    extras: (s, { m, year, now, uid, totals }) => {
      const clients = ['Mar Azul Editorial', 'Café Nómada', 'Estudio Norte', 'Libros Brisa', 'Taller Olmo'];
      const monthNo = +m.slice(5, 7), gross = (base, v, r) => Math.round(base * (10000 + v - r) / 10000);
      // every entry takes its category's usual IVA; the bank amount includes it
      const vatOf = Object.fromEntries(s.categories.map(c => [c.id, c.vat || 0]));
      s.transactions.forEach(t => { const v = vatOf[t.category]; if (v) { t.vat = v; t.amount = gross(t.amount, v, 0); } });
      // invoices to businesses: 21% IVA and 15% withholding. Paid ones sit in revenue; the rest are receivables
      s.invoices = [];
      let n = 0;
      for (let i = Math.max(1, monthNo - 4); i <= monthNo; i++) {
        const key = `${year}-${String(i).padStart(2, '0')}`;
        [6, 19].forEach((d, j) => {
          const issued = `${key}-${String(d).padStart(2, '0')}`; if (issued > now) return;
          const due = new Date(Date.UTC(+year, i - 1, d + 30)).toISOString().slice(0, 10);
          const amount = [120000, 65000, 180000, 45000, 90000][(i + j) % 5];
          const inv = { id: uid(), number: `${year}-${String(++n).padStart(3, '0')}`, client: clients[(i * 2 + j) % 5], issued, due, amount, vat: 2100, ret: 1500, category: 'services', note: j ? 'Editorial illustrations' : 'Brand illustrations, phase ' + (i % 3 + 1) };
          if (i < monthNo - 2 || (i === monthNo - 2 && j === 0)) {
            const paidOn = new Date(Date.UTC(+year, i - 1, d + 21)).toISOString().slice(0, 10);
            if (paidOn <= now) { const t = { id: uid(), date: paidOn, category: 'services', amount: gross(amount, 2100, 1500), vat: 2100, ret: 1500, note: `Factura ${inv.number} · ${inv.client}` }; s.transactions.push(t); inv.paid = { date: paidOn, tx: t.id }; }
          }
          s.invoices.push(inv);
        });
      }
      // two channels: commissions from clients and a pattern shop on Etsy
      s.tags = [{ id: 'tg-services', name: 'Services', color: 1 }, { id: 'tg-digital', name: 'Digital products', color: 2 }];
      s.channels = [{ id: 'ch-clients', name: 'Clients', tag: 'tg-services' }, { id: 'ch-etsy', name: 'Etsy', tag: 'tg-digital' }];
      s.channelRules = { etsy: 'ch-etsy', factura: 'ch-clients' };
      s.transactions.forEach(t => {
        if (['services', 'retainers'].includes(t.category)) t.channel = 'ch-clients';
        else if (['platform-sales', 'platform-fees'].includes(t.category)) { t.channel = 'ch-etsy'; if (t.category === 'platform-sales') t.note = 'Etsy deposit · sewing patterns'; }
      });
      s.invoices.forEach(v => { v.channel = 'ch-clients'; });
      for (let i = 2; i <= 12; i++) {
        const prev = `${year}-${String(i - 1).padStart(2, '0')}`, key = `${year}-${String(i).padStart(2, '0')}`;
        s.months[key].opening = totals(s, prev).cash;
      }
    },
  },
};
