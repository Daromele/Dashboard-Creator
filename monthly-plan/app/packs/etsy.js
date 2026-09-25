/* ===================================================================================
   NICHE PACK · Shop Insights for Etsy sellers
   The Profit Plan books, re-skinned for people who sell on Etsy, often from several shops.
   Etsy's own exports (payment account statement, sold order items, listings, reviews) are
   read by app/src/etsy.js; this block holds identity, categories and their Schedule C lines,
   labels, navigation, copy and the two fictional sample shops.
   =================================================================================== */
const NICHE = {
  id: 'etsy',
  product: {
    name: 'Shop Insights', mark: 'S', publisher: 'JPS DIGITAL PAGES', version: '1.0',
    tagline: 'Profit & shop analytics for Etsy sellers', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Shop Insights · Etsy take-home, fees, products &amp; reviews', themeColor: '#3A2419',
    description: 'Shop Insights by JPS Digital Pages. Drop in your Etsy exports and see true take-home after every Etsy fee, product and listing performance, coupons, customers, reviews and quarterly tax, for one shop or several. Works offline. Not affiliated with Etsy, Inc.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%233A2419"/><path d="M42 20c-3-3-7-4-11-4-6 0-10 3-10 8 0 11 22 6 22 17 0 5-5 8-11 8-5 0-9-2-12-5" fill="none" stroke="%23F2B441" stroke-width="6" stroke-linecap="round"/></svg>',
    notice: 'Shop Insights for Etsy sellers. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition. Not affiliated with, or endorsed by, Etsy, Inc.',
    railNote: '<b>Know what each shop really keeps.</b>Import your Etsy files. See take-home after every fee, what sells and what buyers say.',
    printTitle: 'Shop Insights · JPS Digital Pages',
  },
  build: { file: 'ShopInsightsEtsy.html', modules: ['etsy'] },
  storage: { key: 'jps-shop-insights', file: 'shop-insights' },
  editions: { budget: 'Monthly Plan, the household budget edition', business: 'Profit Plan, the small-business edition' },
  themes: ['kiln', 'ledger', 'sage', 'linen', 'fjord', 'slate', 'night', 'midnight'],
  features: { goals: true, wealth: false, pl: true, tax: true, taxLines: true, mileage: false, invoices: false, shops: true, etsy: true },
  // taxRate in basis points (2500 = 25%) · shop: '' shows every shop together
  settings: { taxRate: 2500, shop: '' },

  groups: [
    { id: 'revenue', label: 'Etsy sales', type: 'income', taxLine: 'L1' },
    { id: 'other-income', label: 'Other income', type: 'income', other: true, taxLine: 'L6' },
    { id: 'cogs', label: 'Cost of goods sold', type: 'expense', cogs: true, taxLine: 'L38' },
    { id: 'etsy-fees', label: 'Etsy fees', type: 'expense', etsy: true, taxLine: 'L10' },
    { id: 'etsy-marketing', label: 'Etsy Ads & Etsy Plus', type: 'expense', etsy: true, taxLine: 'L8' },
    { id: 'overhead', label: 'Tools & overheads', type: 'expense', fixed: true, subscription: true, taxLine: 'L27b' },
    { id: 'operations', label: 'Running the shop', type: 'expense', taxLine: 'L22' },
    { id: 'owner', label: 'Owner’s pay & draws', type: 'saving' },
    { id: 'tax', label: 'Tax set-aside & payments', type: 'saving', tax: true, icon: 'shield' },
    { id: 'reserve', label: 'Business savings', type: 'saving', icon: 'umbrella' },
    // Etsy paying out to your bank, and moves between your own accounts: never counted
    { id: 'transfer', label: 'Etsy deposits & own transfers', type: 'transfer', debt: true },
  ],
  // [id, name, group, Schedule C line]. The ids in the first two blocks are what the Etsy importer writes to.
  categories: [
    ['etsy-sales', 'Etsy order payments', 'revenue', 'L1'], ['etsy-refunds', 'Refunds to buyers', 'revenue', 'L1'],
    ['buyer-tax', 'Sales tax & VAT paid by buyers (Etsy remits it)', 'revenue', 'L1'], ['other-sales', 'Other sales (markets, wholesale)', 'revenue', 'L1'],
    ['other-biz-income', 'Other business income', 'other-income', 'L6'], ['interest', 'Bank interest', 'other-income', 'N'],
    ['materials', 'Materials & supplies for products', 'cogs', 'L38'], ['packaging', 'Packaging', 'cogs', 'L38'], ['printing', 'Printing & production', 'cogs', 'L39'], ['shipping-labels', 'Shipping labels & postage', 'cogs', 'L39'],
    ['transaction-fees', 'Transaction fees', 'etsy-fees', 'L10'], ['processing-fees', 'Payment processing fees', 'etsy-fees', 'L10'], ['listing-fees', 'Listing fees', 'etsy-fees', 'L10'],
    ['fee-tax', 'Tax on Etsy fees', 'etsy-fees', 'L23'], ['other-etsy-fees', 'Other Etsy fees & adjustments', 'etsy-fees', 'L10'],
    ['etsy-ads', 'Etsy Ads', 'etsy-marketing', 'L8'], ['offsite-ads', 'Offsite Ads fees', 'etsy-marketing', 'L8'], ['etsy-plus', 'Etsy Plus subscription', 'etsy-marketing', 'L8'], ['other-marketing', 'Other marketing', 'etsy-marketing', 'L8'],
    ['software', 'Software & apps', 'overhead', 'L18'], ['phone-internet', 'Phone & internet', 'overhead', 'L25'], ['website', 'Website & domain', 'overhead', 'L27b'],
    ['equipment', 'Equipment & tools', 'operations', 'L13'], ['office', 'Office supplies', 'operations', 'L18'], ['photography', 'Photography & props', 'operations', 'L27b'],
    ['professional', 'Accountant & legal', 'operations', 'L17'], ['licences', 'Licences & business taxes', 'operations', 'L23'], ['bank-fees', 'Bank charges', 'operations', 'L27b'],
    ['owner-draw', 'Owner’s draw', 'owner'], ['owner-retirement', 'Owner retirement (SEP-IRA / Solo 401k)', 'owner'],
    ['tax-reserve', 'Tax savings transfer', 'tax'], ['est-tax', 'Income tax paid (estimated & year-end)', 'tax'],
    ['biz-savings', 'Rainy-day fund', 'reserve'],
    ['etsy-deposit', 'Etsy deposit to your bank', 'transfer'], ['card-payoff', 'Business card payoff (purchases already logged)', 'transfer'], ['own-transfer', 'Transfer between own accounts', 'transfer'],
  ],
  // what the dashboard and fee screens call "Etsy revenue", "Etsy costs" and "ads"
  etsy: {
    revenue: ['etsy-sales', 'etsy-refunds', 'buyer-tax'],
    ads: ['etsy-ads', 'offsite-ads'],
    // where each export lives, for the import screen
    exports: [
      ['statement', 'Payment account statement', 'Shop Manager → Finances → Payment account → Download CSV (one month at a time)', 'etsy_statement_2026_9.csv'],
      ['orders', 'Sold order items', 'Shop Manager → Settings → Options → Download data → Orders: “Order items”', 'EtsySoldOrderItems2026.csv'],
      ['listings', 'Listings', 'Shop Manager → Settings → Options → Download data → Listings', 'EtsyListingsDownload.csv'],
      ['reviews', 'Reviews', 'Your Etsy account data download (Privacy settings → Download data)', 'reviews.json'],
    ],
  },
  taxForm: { name: 'Schedule C', long: 'Schedule C (Form 1040) · Profit or Loss From Business' },
  taxLines: [
    { id: 'L1', line: '1', label: 'Gross receipts or sales', part: 'income' },
    { id: 'L6', line: '6', label: 'Other income', part: 'other' },
    { id: 'L36', line: '36', label: 'Purchases less cost of items withdrawn for personal use', part: 'cogs' },
    { id: 'L37', line: '37', label: 'Cost of labor', part: 'cogs' },
    { id: 'L38', line: '38', label: 'Materials and supplies', part: 'cogs' },
    { id: 'L39', line: '39', label: 'Other costs', part: 'cogs' },
    { id: 'L8', line: '8', label: 'Advertising', part: 'expense' },
    { id: 'L10', line: '10', label: 'Commissions and fees', part: 'expense' },
    { id: 'L11', line: '11', label: 'Contract labor', part: 'expense' },
    { id: 'L13', line: '13', label: 'Depreciation and section 179 expense', part: 'expense', note: 'Your accountant decides what to expense now and what to depreciate.' },
    { id: 'L15', line: '15', label: 'Insurance (other than health)', part: 'expense' },
    { id: 'L16b', line: '16b', label: 'Other interest', part: 'expense' },
    { id: 'L17', line: '17', label: 'Legal and professional services', part: 'expense' },
    { id: 'L18', line: '18', label: 'Office expense', part: 'expense' },
    { id: 'L20b', line: '20b', label: 'Rent or lease: other business property', part: 'expense' },
    { id: 'L22', line: '22', label: 'Supplies', part: 'expense' },
    { id: 'L23', line: '23', label: 'Taxes and licenses', part: 'expense' },
    { id: 'L25', line: '25', label: 'Utilities', part: 'expense' },
    { id: 'L27b', line: '27b', label: 'Other expenses (itemised in Part V)', part: 'expense' },
    { id: 'N', line: '—', label: 'Not on Schedule C (personal, or reported elsewhere)', part: 'none', exclude: true },
  ],
  taxQuarters: [
    { label: 'Q1', months: [1, 3], due: '04-15' },
    { label: 'Q2', months: [4, 5], due: '06-15' },
    { label: 'Q3', months: [6, 8], due: '09-15' },
    { label: 'Q4', months: [9, 12], due: '01-15', nextYear: true },
  ],
  aliases: { market: 'other-sales', craftfair: 'other-sales', fair: 'other-sales', wholesale: 'other-sales', postage: 'shipping-labels', shipping: 'shipping-labels', usps: 'shipping-labels', label: 'shipping-labels', stamps: 'shipping-labels', packaging: 'packaging', mailers: 'packaging', boxes: 'packaging', tissue: 'packaging', clay: 'materials', glaze: 'materials', fabric: 'materials', yarn: 'materials', beads: 'materials', paper: 'materials', materials: 'materials', supplies: 'materials', print: 'printing', printing: 'printing', printful: 'printing', printify: 'printing', canva: 'software', adobe: 'software', erank: 'software', marmalead: 'software', software: 'software', app: 'software', phone: 'phone-internet', internet: 'phone-internet', domain: 'website', camera: 'photography', props: 'photography', photo: 'photography', kiln: 'equipment', printer: 'equipment', equipment: 'equipment', accountant: 'professional', bookkeeper: 'professional', licence: 'licences', license: 'licences', pinterest: 'other-marketing', instagram: 'other-marketing', etsyads: 'etsy-ads', ads: 'etsy-ads', draw: 'owner-draw', irs: 'est-tax', estimated: 'est-tax', taxpot: 'tax-reserve', setaside: 'tax-reserve', deposit: 'etsy-deposit', transfer: 'own-transfer', sale: 'other-sales', interest: 'interest' },
  importHints: {
    'credit card payment': 'card-payoff', 'card payment': 'card-payoff', payment: 'card-payoff', transfer: 'own-transfer', transfers: 'own-transfer',
    taxes: 'est-tax', tax: 'est-tax', advertising: 'other-marketing', software: 'software', 'office supplies': 'office', shipping: 'shipping-labels', postage: 'shipping-labels',
    supplies: 'materials', fees: 'bank-fees', 'bank fees': 'bank-fees', income: 'other-sales', sales: 'other-sales', deposit: 'etsy-deposit', etsy: 'etsy-deposit',
  },
  defaults: { category: 'materials', schedule: 'software', annualCategory: 'etsy-sales', quickSetup: ['materials', 'packaging', 'shipping-labels', 'software', 'tax-reserve', 'other-sales'] },

  nav: [['dashboard', 'Dashboard', 'today'], ['etsy-import', 'Import Etsy files', 'up'], ['shops', 'Shops', 'globe'],
    ['pl', 'Profit & loss', 'insights'], ['fees', 'Fees & ads', 'coins'], ['activity', 'Transactions', 'log'], ['annual', 'Year & cash flow', 'outlook'],
    ['products', 'Products & listings', 'tags'], ['coupons', 'Coupons & discounts', 'wallet'], ['customers', 'Customers', 'compass'], ['reviews', 'Reviews', 'review'], ['seasonality', 'Seasonality', 'calendar'],
    ['tax', 'Quarterly tax', 'shield'], ['taxlines', 'Schedule C summary', 'table'],
    ['budget', 'Monthly targets', 'plan'], ['goals', 'Reserves & goals', 'umbrella'], ['scheduled', 'Recurring costs', 'calendar'], ['settings', 'Settings & backup', 'palette'], ['guide', 'How to use', 'help']],
  optionalNav: ['shops', 'coupons', 'customers', 'seasonality', 'annual', 'budget', 'goals', 'scheduled', 'guide'],
  navGroups: [['Your shops', ['dashboard', 'etsy-import', 'shops']], ['Money', ['pl', 'fees', 'activity', 'annual']], ['What sells', ['products', 'coupons', 'customers', 'reviews', 'seasonality']], ['Tax time', ['tax', 'taxlines']]],
  navGroupRest: 'Make it yours',

  labels: {
    income: 'Revenue', expense: 'Expenses', saving: 'Transfers & draws', savingShort: 'Transfers', savingOne: 'Transfer',
    incomePlanned: 'Expected revenue', incomeReceived: 'Revenue received', expensesPaid: 'Expenses paid', savedInvested: 'Transfers & draws',
    plannedContributions: 'Planned transfers', savingsFilter: 'Transfers & draws', incomeAllocated: 'Your revenue, allocated',
    plannedIncome: 'PLANNED REVENUE', subscriptionKpi: 'Overheads plan', yourName: 'Business name', yourNameHint: 'Shown on your statements and exports',
    greeting: ' · the month at a glance', greetingPlain: 'Your shops at a glance', planTitle: 'Your monthly targets', categoryPlaceholder: 'e.g. Craft fair stall fees',
    categorySub: 'Etsy lines arrive in their own categories. Add your own for costs Etsy does not see.', directionNormal: 'Money in / cost paid / transfer',
    exitDemo: 'Return to my shops', demoOnly: 'Your shops only', notePlaceholder: 'e.g. Clay order · 25 lb',
    incomeOne: 'Revenue', savedCol: 'Transfers', netHint: 'Revenue − expenses − transfers',
    savingRateEmpty: 'Log revenue to see the share moved aside', savingRate: '% of revenue received',
    transfer: 'Etsy deposits & own transfers', transferOne: 'Transfer',
  },
  quickLog: { placeholder: 'clay order 42.50', help: 'For costs Etsy does not see. Try “clay order 42.50”, “mailers 18”, “canva 12.99” or “craft fair sale 240”.', demo: ['mailers', '18.00', 'Packaging'] },

  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Every Etsy shop you run, in one calm place', text: '<p>Drop in the files Etsy already gives you. See what each shop really keeps after every fee, what sells, and what buyers say.</p><p>Everything stays in this browser. No Etsy login, no server, no subscription.</p>' },
    { icon: 'up', step: 'IMPORT', title: 'Four Etsy files, read for you', text: '<p>Your <b>payment account statement</b>, <b>sold order items</b>, <b>listings</b> and <b>reviews</b>. Choose which shop they belong to and drop them in together. Anything already imported is skipped.</p>' },
    { icon: 'coins', step: 'TAKE-HOME', title: 'The money after Etsy', text: '<p>Sales tax buyers paid is taken back out, then transaction, processing and listing fees, Etsy Ads and Etsy Plus. What is left is your <b>take-home</b>, order by order and month by month.</p>' },
    'backup',
    { icon: 'check', step: 'START', title: 'Start with this month’s statement', text: '<p>Add your shop, then import one payment account statement. The dashboard fills in from there.</p>', cta: { label: 'Import Etsy files', action: 'go-etsy-import' } },
  ],
  guide: {
    title: 'Four moves. Every shop, understood.',
    cards: [
      ['up', '1. Import', 'Each month, download the payment account statement and sold order items for every shop and drop them in.', 'Import Etsy files', 'etsy-import'],
      ['coins', '2. Check take-home', 'See revenue after buyer tax, every Etsy fee and ad, and what each order left you.', 'Fees & ads', 'fees'],
      ['tags', '3. Improve listings', 'Find best sellers, listings that never sell, and listings short of photos or tags.', 'Products & listings', 'products'],
      ['shield', '4. Set tax aside', 'Put money aside as you go and hand your accountant a Schedule C summary.', 'Quarterly tax', 'tax'],
    ],
    meanings: [['Revenue', 'Order payments − sales tax buyers paid − refunds'], ['Etsy costs', 'Fees, Etsy Ads, Offsite Ads and Etsy Plus, after credits'], ['Take-home', 'Revenue − Etsy costs'], ['Net profit', 'Take-home − your own costs']],
    details: [
      ['Sales tax and VAT buyers pay', 'Etsy adds sales tax or VAT to the buyer’s payment and then takes it straight back to pay the state. The statement shows both. Shop Insights records the tax as a minus line under revenue, so it is never counted as income or as a cost.'],
      ['Several shops', 'Every import belongs to one shop. The shop picker at the top shows one shop or all of them together; every screen and printout follows it. Costs you log with <b>All shops</b> selected are shared costs: they appear in the combined view only.'],
      ['Importing twice is safe', 'Each statement line, order, item and review is recognised when it comes back, so an overlapping or repeated file never counts twice. A listings file replaces that shop’s listings, because it is a snapshot of the shop today.'],
      ['Privacy', 'The sold order items file includes buyer names and addresses. Shop Insights keeps only the country and a scrambled key to count repeat buyers. Names and addresses are never stored.'],
      ['Listings and sales', 'Etsy’s listings file has no listing number, so listings are matched to sales by the start of their title. A listing you renamed may show as unsold.'],
      ['Tax lines and your accountant', 'Each category carries a Schedule C line. It is an organised record, not tax advice or a filed return. Shop Insights is not affiliated with Etsy, Inc.'],
    ],
  },

  // two fictional shops: an art-print shop with Etsy Plus and a pottery studio that buys its labels on Etsy
  sample: {
    name: 'Fern & Kiln Studio', opening: 150000, settings: { goalImages: false, goalsLayout: 'grid', shop: '' },
    note: 'Holiday stock: reorder mailers before November and raise the mug price.',
    amounts: { printing: 180, materials: 240, packaging: 90, software: 25, 'owner-draw': 900, 'tax-reserve': 400 },
    days: { software: 3, 'owner-draw': 28, 'tax-reserve': 28 },
    undated: ['printing', 'materials', 'packaging'],
    unscheduled: ['printing', 'materials', 'packaging'],
    spread: { groups: ['cogs'], days: [4, 11, 18, 25], notes: ['Restock', 'Supplies run', 'Restock', 'Month end'], share: { default: .26 } },
    actual: (id, month, planned) => ['printing', 'materials', 'packaging'].includes(id) ? Math.round(planned * [0.7, 0.75, 0.85, 0.9, 1, 0.9, 0.85, 0.9, 1, 1.2, 1.6, 1.9][month - 1]) : planned,
    snapshots: false,
    goals: [{ category: 'tax-reserve', kind: 'saving', name: 'Tax pot for this year', target: 600000, opening: 0, due: [0, '12-31'] }],
    extras: (s, { year, now, uid, days, plusDays }) => {
      let seed = 20260924; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
      const pick = (list, w) => { let r = rnd() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; } return list[list.length - 1]; };
      const pad = n => String(n).padStart(2, '0'), cents = n => Math.round(n * 100);
      s.shops = [{ id: 'fern', name: 'Fern & Fable Prints' }, { id: 'kiln', name: 'Copper Kiln Ceramics' }];
      // the shared costs from the plan belong to one shop or the other; software and draws stay shared
      s.transactions.forEach(t => { if (t.category === 'printing') t.shop = 'fern'; if (['materials', 'packaging'].includes(t.category)) t.shop = 'kiln'; });
      const E = s.etsy = { orders: [], items: [], listings: [], reviews: [], imports: [] };
      const season = [0.7, 0.75, 0.85, 0.9, 1, 0.9, 0.85, 0.9, 1, 1.2, 1.6, 1.9];
      const countries = [['United States', 68, 0.065], ['United Kingdom', 9, 0.2], ['Canada', 8, 0], ['Australia', 5, 0], ['Germany', 4, 0.19], ['France', 2, 0.2], ['Netherlands', 2, 0.21], ['Ireland', 2, 0.23]];
      const words = { 5: ['Beautiful, even better in person!', 'Arrived quickly and so well packed.', 'Perfect gift, my sister loved it.', 'Gorgeous quality. Will order again.', 'Exactly as pictured.', ''], 4: ['Lovely, took a little longer to arrive.', 'Nice, colours slightly different to the photos.'], 3: ['Fine, but the corner was bent.'], 2: ['Smaller than I expected.'], 1: ['Arrived broken. The seller did offer a refund.'] };
      const shops = [
        { id: 'fern', orders: 34, ship: 4.5, freeOver: 35, label: 0, ads: [1.2, 2.8], plus: true, codes: [['WELCOME10', 0.1], ['FALL20', 0.2], ['THANKYOU15', 0.15]],
          list: [['Botanical Fern Print, Vintage Style Wall Art, Green Leaf Poster', 18, 9, 10, 13], ['Mushroom Art Print, Cottagecore Forest Illustration', 16, 8, 10, 13], ['Wildflower Meadow Print, Watercolor Botanical Poster', 22, 6, 9, 13],
            ['Moth Art Print Set of 3, Dark Academia Wall Decor', 38, 5, 10, 12], ['Lemon Tree Kitchen Print, Mediterranean Wall Art', 14, 4, 8, 13], ['Printable Fern Wall Art, Instant Download Botanical Set of 6', 6.5, 7, 10, 13, true],
            ['Frog on Toadstool Greeting Card, Blank Inside', 4.5, 6, 6, 9], ['Birch Forest Print, Minimalist Nature Poster', 20, 3, 10, 13], ['Herb Garden Chart Print, Kitchen Botanical Poster', 18, 3, 7, 11],
            ['Personalized Birth Flower Print, Custom Name Art', 28, 5, 10, 13], ['Ocean Waves Printable Art, Digital Download', 5.5, 2, 5, 13, true], ['Pressed Flower Bookmark, Handmade Botanical Gift', 9, 3, 10, 13],
            ['Snail and Strawberry Art Print, Whimsical Nursery Decor', 15, 2, 4, 8], ['Autumn Leaves Print Set of 2, Fall Decor', 26, 0, 10, 13]] },
        { id: 'kiln', orders: 12, ship: 9, freeOver: 75, label: 8.25, ads: [0.8, 1.8], plus: false, codes: [['KILN10', 0.1], ['SPRING15', 0.15]],
          list: [['Handmade Ceramic Mug, Speckled Stoneware Coffee Cup', 38, 9, 10, 13], ['Stoneware Planter with Drainage, Small Handmade Pot', 34, 5, 10, 13], ['Ceramic Ring Dish, Speckled Jewelry Tray', 18, 6, 8, 13],
            ['Handmade Pottery Bowl, Rustic Ramen Bowl', 46, 4, 10, 12], ['Ceramic Vase, Minimalist Bud Vase, Wheel Thrown', 42, 3, 10, 13], ['Set of 2 Espresso Cups, Handmade Stoneware', 52, 3, 9, 13],
            ['Ceramic Spoon Rest, Kitchen Gift for Cook', 22, 4, 6, 10], ['Large Serving Platter, Handmade Stoneware Dish', 68, 1, 10, 13], ['Ceramic Incense Holder, Handmade Pottery', 20, 2, 7, 13],
            ['Custom Name Mug, Personalized Pottery Gift', 48, 1, 10, 13], ['Terracotta Butter Dish, Handmade Kitchen Pottery', 44, 0, 3, 6]] },
      ];
      let orderNo = 2900000000, txNo = 3100000000;
      for (const sh of shops) {
        const tx = (date, category, amount, note, ref) => { if (amount && date <= now && date.slice(0, 4) === year) s.transactions.push({ id: uid(), date, category, amount, note, shop: sh.id, ...(ref ? { ref } : {}) }); };
        sh.list.forEach(([title, price, , photos, tags, digital], i) => E.listings.push({ id: `${sh.id}-l${i}`, shop: sh.id, title, price: cents(price), qty: digital ? 999 : 3 + (i * 7) % 20, photos, tags, sku: '', variations: i % 3 === 0 ? 1 : 0 }));
        const buyers = []; let balance = 0;
        for (const y of [String(+year - 1), year]) for (let mo = 1; mo <= 12; mo++) {
          const m = `${y}-${pad(mo)}`, dim = days(m);
          if (m + '-01' > now) break;
          const n = Math.round(sh.orders * season[mo - 1] * (0.85 + rnd() * 0.3) * (y === year ? 1.15 : 1));
          for (let k = 0; k < n; k++) {
            const date = `${m}-${pad(1 + Math.floor(rnd() * dim))}`; if (date > now) continue;
            const id = String(++orderNo), lines = rnd() < 0.8 ? 1 : 2, chosen = [];
            for (let j = 0; j < lines; j++) chosen.push(pick(sh.list.map((l, i) => i), sh.list.map(l => l[2])));
            let list = 0, physical = false, units = 0;
            chosen.forEach(i => { const [name, price, , , , digital] = sh.list[i], qty = rnd() < 0.9 ? 1 : 2; list += cents(price) * qty; units += qty; physical = physical || !digital;
              E.items.push({ id: String(++txNo), order: id, shop: sh.id, listing: String(1400000000 + i + (sh.id === 'kiln' ? 500 : 0)), name, qty, price: cents(price), total: cents(price) * qty, sku: '' }); });
            const code = rnd() < 0.2 ? sh.codes[Math.floor(rnd() * sh.codes.length)] : null, discount = code ? Math.round(list * code[1]) : 0;
            const shipping = physical && list - discount < cents(sh.freeOver) ? cents(sh.ship) : 0;
            const [country, , rate] = pick(countries, countries.map(c => c[1])), tax = Math.round((list - discount + shipping) * rate);
            let buyer; if (buyers.length && rnd() < 0.14) buyer = buyers[Math.floor(rnd() * buyers.length)]; else { buyer = sh.id[0] + (buyers.length + 1).toString(36); buyers.push(buyer); }
            E.orders.push({ id, shop: sh.id, date, buyer, country, coupon: code ? code[0] : '', discount, shipDiscount: 0, shipping, tax, list, units });
            // the payment account statement for the same order
            const paid = list - discount + shipping, first = sh.list[chosen[0]][0];
            tx(date, 'etsy-sales', paid + tax, `Payment for Order #${id}`, 'o' + id);
            if (tax) tx(date, 'buyer-tax', -tax, country === 'United States' ? 'Sales tax paid by buyer' : 'VAT paid by buyer', 'o' + id);
            tx(date, 'transaction-fees', Math.round(paid * 0.065), `Transaction fee: ${first}`, 'o' + id);
            tx(date, 'processing-fees', Math.round((paid + tax) * 0.03) + 25, 'Processing fee', 'o' + id);
            chosen.forEach(i => tx(date, 'listing-fees', 20, 'Listing fee', 'l' + (1400000000 + i + (sh.id === 'kiln' ? 500 : 0))));
            if (sh.label && physical) tx(date, 'shipping-labels', cents(sh.label), 'USPS shipping label', 'o' + id);
            if (sh.id === 'kiln' && rnd() < 0.06) tx(date, 'offsite-ads', Math.round(paid * 0.15), `Offsite Ads fee: ${first}`, 'o' + id);
            if (y === year && date <= now) balance += paid - Math.round(paid * 0.065) - Math.round((paid + tax) * 0.03) - 25;
            if (rnd() < 0.3) { const d = plusDays(date, 8 + Math.floor(rnd() * 16)); if (d <= now) { const stars = pick([5, 4, 3, 2, 1], [86, 9, 3, 1, 1]), w = words[stars];
              E.reviews.push({ id: 'r' + id, shop: sh.id, date: d, stars, message: w[Math.floor(rnd() * w.length)], order: id }); } }
          }
          if (y !== year) continue;
          for (let d = 1; d <= dim; d++) { const date = `${m}-${pad(d)}`; if (date > now) break;
            const ads = cents(sh.ads[0] + rnd() * (sh.ads[1] - sh.ads[0])); tx(date, 'etsy-ads', ads, 'Etsy Ads'); balance -= ads;
            // Etsy pays out every Monday
            if (new Date(date + 'T12:00:00').getDay() === 1 && balance > 2000) { const out = Math.floor(balance * 0.9); tx(date, 'etsy-deposit', out, `$${(out / 100).toFixed(2)} sent to your bank account`); balance -= out; } }
          if (sh.plus) { tx(m + '-01', 'etsy-plus', 1000, 'Etsy Plus subscription fee'); tx(m + '-01', 'listing-fees', -300, 'Credit for listing fee'); tx(m + '-01', 'etsy-ads', -500, 'Credit for Etsy Ads fee'); balance -= 200; }
          if (sh.id === 'kiln') tx(`${m}-${pad(Math.min(28, m === now.slice(0, 7) ? +now.slice(8) : 28))}`, 'fee-tax', 60 + Math.round(rnd() * 40), 'Tax: Transaction');
          if (mo % 3 === 0) tx(`${m}-15`, 'transaction-fees', -Math.round(200 + rnd() * 300), 'Share & Save refund');
        }
        const stamp = now;
        [['statement', `etsy_statement_${year}_${+now.slice(5, 7)}.csv`, s.transactions.filter(t => t.shop === sh.id && t.ref).length], ['orders', `EtsySoldOrderItems${year}.csv`, E.items.filter(i => i.shop === sh.id).length],
          ['listings', 'EtsyListingsDownload.csv', sh.list.length], ['reviews', 'reviews.json', E.reviews.filter(r => r.shop === sh.id).length]]
          .forEach(([kind, name, rows]) => E.imports.push({ shop: sh.id, kind, name, at: stamp, rows }));
      }
      s.transactions.sort((a, b) => a.date.localeCompare(b.date));
    },
  },
};
