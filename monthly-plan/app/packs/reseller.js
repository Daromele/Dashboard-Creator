/* ===================================================================================
   NICHE PACK · Reseller Profit Tracker
   For resellers and flippers: every item with what it really cost, where it's listed and for how much; each sale
   with the platform's fees and the shipping label; returns; and the true profit per item, per platform and per
   month, plus running costs, mileage, a profit & loss and Schedule C with cost of goods sold.
   Screens live in the core's ResellerUI module (features.resale) on top of Resale (pure, tested). This block
   gives the edition its identity, sidebar, words, welcome, guide and the fictional reseller behind sample mode.
   =================================================================================== */
const NICHE = {
  id: 'reseller',
  product: {
    name: 'Reseller Profit Tracker', mark: 'R', publisher: 'RESELLER BOOKS', version: '1.0',
    tagline: 'Reseller profit tracker', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Reseller Profit Tracker · Inventory, sales & true profit', themeColor: '#2E2040',
    description: 'Reseller Profit Tracker by JPS Digital Pages. Every item with what it really cost, sales on eBay, Poshmark, Mercari, Depop and more with their fees and shipping, returns, and your true profit per item, platform and month. Inventory value, mileage, profit & loss and Schedule C. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%232E2040"/><path d="M16 30V16h14l18 18-14 14z" fill="none" stroke="%23F0B98F" stroke-width="5" stroke-linejoin="round"/><circle cx="24" cy="24" r="3.5" fill="%23F0B98F"/></svg>',
    notice: 'Reseller Profit Tracker. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Know what you really made.</b>Every item’s cost, every platform’s fees, and the profit that’s actually yours.',
    printTitle: 'Reseller Profit Tracker · JPS Digital Pages',
  },
  build: { file: 'ResellerProfitTracker.html' },
  // browser storage keys, the backup-folder database and download names all start with these
  storage: { key: 'jps-reseller-tracker', file: 'reseller-tracker' },
  // first theme is the default
  themes: ['lavender', 'blush', 'sage', 'fjord', 'linen', 'slate', 'night', 'midnight'],
  features: { goals: false, wealth: false, pl: false, tax: false, taxLines: false, mileage: false, invoices: false, resale: true },
  settings: { hiddenNav: [], rsRate: 700, rsPrefix: '' },

  // type: income | expense | saving (money moved aside: neither income nor spending)
  groups: [
    { id: 'income', label: 'Income', type: 'income' },
    { id: 'bills', label: 'Bills', type: 'expense', fixed: true },
    { id: 'subscriptions', label: 'Subscriptions', type: 'expense', fixed: true, subscription: true },
    { id: 'debt', label: 'Debt payments', type: 'expense', fixed: true, debt: true },
    { id: 'variable', label: 'Variable expenses', type: 'expense' },
    { id: 'sinking', label: 'Sinking funds', type: 'saving' },
    { id: 'savings', label: 'Savings', type: 'saving' },
    { id: 'investment', label: 'Investments', type: 'saving', icon: 'outlook' },
    { id: 'transfer', label: 'Transfers (not counted)', type: 'transfer', debt: true },
  ],
  // [id, name, group]
  categories: [
    ['salary', 'Salary', 'income'], ['side', 'Side hustle', 'income'], ['other-income', 'Other income', 'income'],
    ['housing', 'Rent / mortgage', 'bills'], ['utilities', 'Utilities', 'bills'], ['internet', 'Internet & phone', 'bills'],
    ['memberships', 'Memberships', 'subscriptions'], ['credit', 'Credit card payment', 'debt'],
    ['groceries', 'Groceries', 'variable'], ['transport', 'Transport', 'variable'], ['personal', 'Personal & family', 'variable'],
    ['emergency', 'Emergency savings', 'savings'], ['investing', 'Investment contributions', 'investment'],
    ['own-transfer', 'Transfer between my accounts', 'transfer'], ['platform-payout', 'Platform payouts (already counted)', 'transfer'],
  ],
  aliases: {},
  importHints: {},
  platformDefaults: { sale: 'side', refund: 'side', fees: 'side', ads: 'side', shipping: 'side', feeTax: 'side', payout: '__skip', conversion: '__skip', taxWithheld: 'side', purchase: '', other: 'side' },
  defaults: { category: 'personal', schedule: 'housing', annualCategory: 'housing', payout: 'platform-payout', quickSetup: ['side'] },

  // sidebar: [id, label, icon]; optionalNav can be switched off in Settings
  nav: [['dashboard', 'Home', 'today'], ['rsitems', 'Inventory', 'grid'], ['rsadd', 'Add inventory', 'log'], ['rssales', 'Sales', 'wallet'], ['rsplats', 'Platforms', 'tags'],
    ['rsexp', 'Expenses', 'down'], ['rsmiles', 'Mileage', 'calendar'], ['rspl', 'Profit & loss', 'spark'], ['rstax', 'Schedule C', 'review'], ['rsimport', 'Import bank CSV', 'archive'],
    ['settings', 'Settings & backup', 'palette'], ['guide', 'How it works', 'help']],
  optionalNav: ['rsplats', 'rsmiles', 'rstax', 'rsimport', 'guide'],
  navGroups: [['Your shop', ['dashboard', 'rsitems', 'rsadd', 'rssales', 'rsplats']], ['Money & taxes', ['rsexp', 'rsmiles', 'rspl', 'rstax', 'rsimport']]],
  navGroupRest: 'Make it yours',

  // words used across the screens
  labels: {
    income: 'Sales', expense: 'Expenses', saving: 'Savings & investing', savingShort: 'Contributions', savingOne: 'Contribution',
    incomePlanned: 'Expected sales', incomeReceived: 'Sales', expensesPaid: 'Expenses paid', savedInvested: 'Saved & invested',
    plannedContributions: 'Planned contributions', savingsFilter: 'Savings & investments',
    plannedIncome: 'PLANNED SALES', subscriptionKpi: 'Subscription plan', yourName: 'Your shop name (optional)', yourNameHint: 'e.g. Thrift & Thread',
    greeting: '', greetingPlain: 'Your shop', planTitle: 'Your shop', categoryPlaceholder: 'e.g. Vintage denim',
    categorySub: 'Make it fit your shop.', directionNormal: 'Paid',
    statementKinds: 'a statement',
    importNote: '',
    exitDemo: 'Return to my shop', demoOnly: 'Your shop only', demoNote: 'Fictional reseller. Your own items and sales stay separate.', notePlaceholder: 'e.g. Goodwill bins',
    incomeOne: 'Sale', savedCol: 'Saved', transfer: 'Transfers (not counted)', transferOne: 'Transfer', netHint: 'Sales − every cost',
    savingRateEmpty: 'Record a sale to see your profit', savingRate: '% of sales',
  },
  quickLog: { placeholder: 'mailers 12.99', help: 'Try “mailers 12.99”.', demo: ['mailers', '12.99', 'Supplies'] },

  tourTopics: 'adding items, recording sales and returns, platform fees, true profit, Schedule C and backups',
  // first-run tour; 'backup' is the shared backup slide
  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Your true profit, item by item', text: '<p>What each item cost you, what it sold for, and what the platform and the shipping label took. Home shows the profit that’s actually yours this month.</p><p>Everything stays on your computer: no account, no bank login, no subscription.</p>' },
    { icon: 'log', step: 'AFTER A HAUL', title: 'Add a whole haul in a minute', text: '<p>Add inventory: type the title and what you paid, press Enter, next. Bought a bin or a lot for one price? Its cost is split across the items for you.</p>' },
    { icon: 'wallet', step: 'WHEN IT SELLS', title: 'Sold? Two clicks', text: '<p>Pick the platform and the price; the fee is worked out for you to check. Returns go back on the shelf, and the profit corrects itself.</p>' },
    { icon: 'review', step: 'TAX TIME', title: 'Schedule C, with cost of goods sold', text: '<p>Your inventory at the start and end of the year, what you bought, and every expense on its line. Print it for your tax pro.</p>' },
    'backup',
    { icon: 'grid', step: 'START', title: 'Start with your last haul', text: '<p>A title and what you paid is enough. The rest can wait.</p>', cta: { label: 'Add my first items', action: 'rs-go-add' }, finish: 'Look around first' },
  ],
  guide: {
    title: 'Four steps to knowing your real profit.',
    // [icon, step, what to do, screen label, screen id]
    cards: [
      ['log', '1. Add inventory', 'Title and what you paid, then Enter. A lot or a bin splits its price across the items.', 'Add inventory', 'rsadd'],
      ['grid', '2. List it', 'Add the list price and where it’s listed. Inventory shows the estimated profit on every item.', 'Inventory', 'rsitems'],
      ['wallet', '3. Record the sale', 'Platform, price and shipping; the fee is worked out for you to check. Returns go back on the shelf.', 'Sales', 'rssales'],
      ['review', '4. Tax time', 'Profit & loss for any dates, and Schedule C with cost of goods sold. Print or export.', 'Schedule C', 'rstax'],
    ],
    meanings: [['True profit', 'What a sale left you: price and shipping charged, minus fees, the label, other costs and what the item cost'], ['ROI', 'Profit ÷ what the item cost you'], ['Sell-through', 'Units sold ÷ units you had to sell'], ['Cost of goods sold', 'What the items you sold (or wrote off) cost you']],
    details: [
      ['Lots, bins and bundles', 'Bought several items for one price? Use Bought a lot: the price is split evenly across the items, or by their list prices if you prefer. Add items to the lot as you sort it; the split updates and always adds up to the cent.'],
      ['Several of the same thing', 'Set the quantity. A sale can sell one or several; the cost of each one sold is its share.'],
      ['Platform fees', 'Each platform starts with a typical fee (a share of price + shipping, plus a fixed fee). Fees change: check yours and edit them under Platforms. The sale form fills the fee in for you to check; what you save is what counts, so later fee changes never alter past sales.'],
      ['Returns and refunds', 'Open the sale and choose Return. Say how much you refunded, whether the item came back (it goes back on the shelf, its cost is no longer spent) and any fee the platform gave back. The refund counts on the day it happened.'],
      ['Donated, lost or kept', 'Edit the item and pick what happened. Donated or lost items are written off as a cost. Items you kept for yourself leave your inventory but aren’t a business cost.'],
      ['What counts as profit here', 'Cash basis, like most small sellers: a sale counts on the day it sold, a refund on the day you refunded, an expense on the day you paid. Unsold stock isn’t an expense until it sells or is written off.'],
      ['Running costs', 'Shipping supplies, a storage unit, crosslisting software, an eBay store: add them under Expenses, once or repeating monthly or yearly. They come off your net profit, not any one item.'],
      ['Mileage', 'Log each sourcing trip and post-office run with its miles. The deduction uses the rate you set in Settings; check the current IRS rate each year.'],
      ['Schedule C and cost of goods sold', 'Part III works from your inventory: what you had at the start of the year, plus what you bought, minus what you kept for yourself, minus what’s left at the end. It matches your sales and write-offs.'],
      ['Importing your bank’s CSV', 'Withdrawals become expenses on their Schedule C line; you check every line first. Platform payouts are skipped: your sales already count that money.'],
      ['Is this tax advice?', 'No. It’s a worksheet of your own numbers, laid out like Schedule C, to make tax time easier. Ask a tax pro about your own situation.'],
    ],
  },

  // the fictional reseller behind "Explore sample data": a clothing and home-goods flipper selling on five platforms
  sample: {
    name: 'Thrift & Thread', opening: 0, settings: { rsRate: 700, rsPrefix: 'TT-' },
    note: 'Record each sale as it happens.',
    extraCategories: [],
    amounts: {},
    days: {},
    undated: [],
    spread: { groups: [], days: [], notes: [], share: { default: .5 } },
    goals: [],
    extras: (s, { uid }) => {
      const t = new Date().toISOString().slice(0, 10), pad = n => String(n).padStart(2, '0');
      const addD = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
      const addM = (ym, n) => { const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n, Y = y + Math.floor(m / 12), M = ((m % 12) + 12) % 12 + 1; return `${Y}-${pad(M)}`; };
      const P = { ebay: [1360, 40], poshmark: [2000, 0], mercari: [1290, 50], depop: [330, 45], facebook: [1000, 0], local: [0, 0] };
      const fee = (pl, price, ship) => pl === 'poshmark' && price < 1500 ? 295 : Math.round((price + ship) * P[pl][0] / 10000) + P[pl][1];
      // a steady flipper: a few hauls a week for 14 months; most things sell within a couple of months
      let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const pick = L => L[Math.floor(rnd() * L.length)];
      // [title, category, brand, cost, list, usual platform, label]
      const T = [
        ['Patagonia Better Sweater', 'Clothing', 'Patagonia', 699, 5800, 'ebay', 899], ['Levi’s 501 vintage jeans', 'Clothing', 'Levi’s', 499, 4800, 'ebay', 799],
        ['Le Creuset dutch oven', 'Home & decor', 'Le Creuset', 1500, 13500, 'facebook', 0], ['Coach shoulder bag', 'Bags & accessories', 'Coach', 1200, 8500, 'poshmark', 0],
        ['Pyrex mixing bowl set', 'Home & decor', 'Pyrex', 800, 6000, 'ebay', 1450], ['Nike Air Max sneakers', 'Shoes', 'Nike', 1000, 7000, 'mercari', 1050],
        ['Free People maxi dress', 'Clothing', 'Free People', 450, 3800, 'poshmark', 0], ['Lululemon Define jacket', 'Clothing', 'Lululemon', 799, 6200, 'poshmark', 0],
        ['Carhartt work jacket', 'Clothing', 'Carhartt', 1499, 9800, 'ebay', 1199], ['Hardcover book bundle', 'Books', '', 300, 2800, 'ebay', 699],
        ['Vintage band tee', 'Vintage', '', 300, 4200, 'depop', 499], ['Dooney & Bourke satchel', 'Bags & accessories', 'Dooney & Bourke', 900, 7500, 'poshmark', 0],
        ['Fiesta ware pitcher', 'Home & decor', 'Fiesta', 400, 3200, 'mercari', 1150], ['LEGO set, complete', 'Toys & games', 'LEGO', 800, 4500, 'ebay', 1050],
        ['Madewell leather tote', 'Bags & accessories', 'Madewell', 650, 5200, 'poshmark', 0], ['Dr. Martens boots', 'Shoes', 'Dr. Martens', 1200, 8200, 'ebay', 1199],
        ['Pendleton wool shirt', 'Vintage', 'Pendleton', 600, 6200, 'ebay', 899], ['North Face puffer', 'Clothing', 'The North Face', 2500, 15000, 'ebay', 1450],
        ['Corningware casserole set', 'Home & decor', 'Corningware', 700, 5200, 'ebay', 1499], ['Adidas Samba sneakers', 'Shoes', 'Adidas', 1500, 8800, 'mercari', 1050],
        ['Vintage Disney sweatshirt', 'Vintage', 'Disney', 500, 5200, 'depop', 599], ['Ralph Lauren cable sweater', 'Clothing', 'Ralph Lauren', 499, 4500, 'ebay', 899],
        ['Nintendo handheld (works)', 'Electronics', 'Nintendo', 1200, 6500, 'ebay', 1099], ['Wool winter coat', 'Clothing', 'Banana Republic', 899, 6200, 'poshmark', 0],
        ['Leather belt, vintage', 'Bags & accessories', 'Coach', 200, 2600, 'poshmark', 0], ['Insulated tumbler', 'Home & decor', 'Yeti', 400, 2500, 'mercari', 899],
        ['Linen wide-leg pants', 'Clothing', 'Eileen Fisher', 599, 4500, 'poshmark', 0], ['Denim trucker jacket', 'Vintage', 'Levi’s', 1500, 9200, 'ebay', 1199],
        ['Stand mixer bowl', 'Home & decor', 'KitchenAid', 500, 3800, 'facebook', 0], ['Running shoes', 'Shoes', 'Hoka', 1200, 7200, 'ebay', 1199],
        ['Vintage windbreaker', 'Vintage', 'Nike', 700, 5800, 'depop', 599], ['Fleece vest', 'Clothing', 'Arc’teryx', 1800, 9500, 'ebay', 899],
        ['Cast iron skillet', 'Home & decor', 'Lodge', 600, 4200, 'facebook', 0], ['Board game, complete', 'Toys & games', '', 300, 3000, 'mercari', 1050],
        ['Vinyl record lot', 'Media', '', 500, 4800, 'ebay', 1099], ['Silk scarf', 'Bags & accessories', '', 200, 2800, 'poshmark', 0],
      ];
      const SIZES = ['S', 'M', 'L', 'XL', '8', '9', '10'], WHERE = ['Goodwill', 'Estate sale', 'Garage sale', 'Savers', 'Facebook find', 'Flea market'];
      const r5 = v => Math.round(v / 50) * 50;
      s.rsItems = []; s.rsSales = []; s.rsLots = [];
      let n = 0;
      for (let ago = 425; ago >= 3; ago -= 2) {
        const k = rnd() < 0.55 ? 1 : 2;
        for (let j = 0; j < k; j++) {
          const [name, cat, brand, cost0, list0, pl0, label] = pick(T), id = 'it' + n, bought = addD(t, -ago), toList = Math.floor(rnd() * 4);
          const cost = Math.max(100, r5(cost0 * (0.6 + rnd() * 0.9))), list = r5(list0 * (0.8 + rnd() * 0.45)), listed = addD(bought, toList), size = /Clothing|Vintage|Shoes/.test(cat) ? ', ' + pick(SIZES) : '';
          const pl = rnd() < 0.75 ? pl0 : pick(['ebay', 'mercari', 'poshmark', 'depop']), sku = 'TT-' + String(n + 1).padStart(4, '0');
          s.rsItems.push({ id, sku, title: name + size, cat, ...(brand ? { brand } : {}), qty: 1, cost, bought, source: pick(WHERE), list, ...(listed <= t ? { listed, plats: [pl, ...(pl === 'ebay' && rnd() < 0.5 ? ['mercari'] : [])] } : {}), loc: 'Bin ' + (1 + (n % 12)), added: bought });
          // most sell within ~70 days; about one in eight sits
          const toSell = rnd() < 0.12 ? 0 : Math.round(3 + Math.pow(rnd(), 1.7) * 70), d = addD(listed, toSell);
          if (toSell && d <= t) { const price = r5(list * (0.82 + rnd() * 0.18)), ship = pl === 'ebay' && rnd() < 0.3 ? 899 : pl === 'depop' ? 500 : 0, lab = pl === 'facebook' && rnd() < 0.7 ? 0 : label;
            s.rsSales.push({ id: 'sl' + n, item: id, date: d, plat: pl === 'facebook' && !lab ? 'facebook' : pl, qty: 1, price, ship, fee: pl === 'facebook' && !lab ? 0 : fee(pl, price, ship), label: lab, other: rnd() < 0.08 ? 250 : 0 }); }
          n++;
        }
      }
      // an estate-sale lot of five sweaters for one price, split by list price; two have sold
      const lotD = addD(t, -75);
      s.rsLots.push({ id: 'lot1', name: 'Estate sale: wool sweaters', date: lotD, cost: 4000, source: 'Estate sale', split: 'list' });
      [['Pendleton cardigan, L', 5500], ['Woolrich ragg sweater, M', 4500], ['Irish fisherman sweater, XL', 6500], ['J.Crew lambswool crew, M', 2800], ['L.L.Bean Norwegian sweater, L', 5200]].forEach(([title, list], k) => {
        const id = 'lt' + k; s.rsItems.push({ id, sku: 'TT-' + String(n + 1 + k).padStart(4, '0'), title, cat: 'Vintage', qty: 1, cost: 0, lot: 'lot1', bought: lotD, source: 'Estate sale', list, listed: addD(lotD, 2), plats: ['ebay'], loc: 'Bin 9', added: lotD });
        if (k === 0) s.rsSales.push({ id: 'ls0', item: id, date: addD(lotD, 15), plat: 'ebay', qty: 1, price: 5200, ship: 0, fee: fee('ebay', 5200, 0), label: 1199, other: 0 });
        if (k === 2) s.rsSales.push({ id: 'ls2', item: id, date: addD(lotD, 33), plat: 'ebay', qty: 1, price: 6000, ship: 0, fee: fee('ebay', 6000, 0), label: 1199, other: 0 });
      });
      // a bundle of 12 identical items, five sold locally
      s.rsItems.push({ id: 'bulk', sku: 'TT-' + String(n + 6).padStart(4, '0'), title: 'Pokémon card lots (50 cards)', cat: 'Toys & games', qty: 12, cost: 3600, bought: addD(t, -140), source: 'Flea market', list: 1500, listed: addD(t, -138), plats: ['mercari'], loc: 'Shelf A', added: addD(t, -140) });
      [[-120, 2, 'local', 3000], [-96, 1, 'mercari', 1500], [-61, 2, 'local', 2800]].forEach(([d, q, pl, price], k) => s.rsSales.push({ id: 'bk' + k, item: 'bulk', date: addD(t, d), plat: pl, qty: q, price, ship: 0, fee: pl === 'local' ? 0 : fee(pl, price, 0), label: pl === 'local' ? 0 : 599, other: 0 }));
      // returns: one came back (relisted), one refunded in part
      const sold = s.rsSales.filter(x => x.id.startsWith('sl') && x.plat === 'ebay' && x.date < addD(t, -30));
      const r1 = sold[sold.length - 3]; if (r1) r1.ret = { date: addD(r1.date, 9), refund: r1.price + r1.ship, back: true, feeBack: Math.max(0, r1.fee - 40) };
      const r2 = sold[Math.floor(sold.length / 2)]; if (r2) r2.ret = { date: addD(r2.date, 6), refund: 1000, back: false, feeBack: 0 };
      // one stale item given away, one kept
      const left = s.rsItems.filter(i => !s.rsSales.some(x => x.item === i.id) && i.bought < addD(t, -200));
      if (left[0]) { left[0].status = 'donated'; left[0].gone = addD(t, -10); }
      if (left[1]) { left[1].status = 'kept'; left[1].gone = addD(t, -45); }
      // running costs and sourcing trips
      const y0 = addM(t.slice(0, 7), -13) + '-05';
      s.rsExps = [
        { id: uid(), date: y0, amount: 2999, cat: 'software', note: 'Crosslisting app', repeat: 'monthly' },
        { id: uid(), date: addD(y0, 10), amount: 2195, cat: 'fees', note: 'eBay Starter store', repeat: 'monthly' },
        { id: uid(), date: addD(y0, 3), amount: 8900, cat: 'storage', note: 'Storage unit 5×10', repeat: 'monthly' },
        { id: uid(), date: addD(t, -300), amount: 3899, cat: 'supplies', note: 'Poly mailers, 500', repeat: 'once' },
        { id: uid(), date: addD(t, -150), amount: 4250, cat: 'supplies', note: 'Boxes & tissue paper', repeat: 'once' },
        { id: uid(), date: addD(t, -200), amount: 15999, cat: 'office', note: 'Thermal label printer', repeat: 'once' },
        { id: uid(), date: addD(t, -40), amount: 2499, cat: 'supplies', note: 'Poly mailers, 250', repeat: 'once' },
        { id: uid(), date: addD(t, -25), amount: 1500, cat: 'ads', note: 'Promoted listings boost', repeat: 'once' },
      ];
      s.rsTrips = [];
      for (let k = 0; k < 40; k++) s.rsTrips.push({ id: uid(), date: addD(t, -k * 10 - 2), miles: [18.4, 32, 12.6, 45.2, 22][k % 5], purpose: ['Goodwill run', 'Estate sale', 'Post office drop-off', 'Flea market', 'Thrift circuit'][k % 5] });
    },
  },
};
