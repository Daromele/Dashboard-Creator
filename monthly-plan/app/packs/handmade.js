/* ===================================================================================
   NICHE PACK · Handmade Inventory Tracker
   For makers: materials with what they really cost, products with their recipes, batches that use the materials up,
   sales on every channel, craft fairs with planned, taken and sold, stock counts and adjustments that are never lost,
   and the true profit per piece, per channel and per month.
   Screens live in the core's HandmadeUI module (features.handmade) on top of Handmade (pure, tested). This block gives
   the edition its identity, sidebar, words, welcome, guide and the fictional maker behind sample mode.
   =================================================================================== */
const NICHE = {
  id: 'handmade',
  product: {
    name: 'Handmade Inventory Tracker', mark: 'H', publisher: 'MAKER STOCK & PROFIT', version: '1.0',
    tagline: 'Handmade inventory tracker', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Handmade Inventory Tracker · Materials, products & true profit', themeColor: '#45392A',
    description: 'Handmade Inventory Tracker by JPS Digital Pages. Materials with their real cost, product recipes, batches that use materials up, sales on Etsy, at craft fairs and everywhere else, stock counts, low-stock alerts and the true profit per piece. Works offline.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%2345392A"/><path d="M14 26l18-10 18 10v20l-18 10-18-10z" fill="none" stroke="%23E8A24A" stroke-width="4.5" stroke-linejoin="round"/><path d="M14 26l18 10 18-10M32 36v20" fill="none" stroke="%23E8A24A" stroke-width="4.5" stroke-linejoin="round"/></svg>',
    notice: 'Handmade Inventory Tracker. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Built on the Monthly Plan core. Personal-use customer edition.',
    railNote: '<b>Know what each piece really costs.</b>Materials in, pieces made, sold everywhere: stock and profit that add up.',
    printTitle: 'Handmade Inventory Tracker · JPS Digital Pages',
  },
  build: { file: 'HandmadeInventoryTracker.html' },
  // browser storage keys, the backup-folder database and download names all start with these
  storage: { key: 'jps-handmade-inventory', file: 'handmade-inventory' },
  // first theme is the default
  themes: ['linen', 'sage', 'blush', 'lavender', 'fjord', 'slate', 'night', 'midnight'],
  features: { goals: false, wealth: false, pl: false, tax: false, taxLines: false, mileage: false, invoices: false, handmade: true },
  settings: { hiddenNav: [], hmRate: 2000, hmPrefix: '' },

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
    ['housing', 'Rent / mortgage', 'bills'], ['utilities', 'Utilities', 'bills'], ['memberships', 'Memberships', 'subscriptions'],
    ['groceries', 'Groceries', 'variable'], ['personal', 'Personal & family', 'variable'], ['emergency', 'Emergency savings', 'savings'],
    ['investing', 'Investment contributions', 'investment'], ['own-transfer', 'Transfer between my accounts', 'transfer'], ['platform-payout', 'Shop payouts (already counted)', 'transfer'],
  ],
  aliases: {},
  importHints: {},
  platformDefaults: { sale: 'side', refund: 'side', fees: 'side', ads: 'side', shipping: 'side', feeTax: 'side', payout: '__skip', conversion: '__skip', taxWithheld: 'side', purchase: '', other: 'side' },
  defaults: { category: 'personal', schedule: 'housing', annualCategory: 'housing', payout: 'platform-payout', quickSetup: ['side'] },

  // sidebar: [id, label, icon]; optionalNav can be switched off in Settings
  nav: [['dashboard', 'Home', 'today'], ['hmprods', 'Products', 'grid'], ['hmmats', 'Materials', 'tags'], ['hmmake', 'Make a batch', 'spark'], ['hmsales', 'Sales', 'wallet'], ['hmevents', 'Craft fairs & events', 'calendar'],
    ['hmrestock', 'Restock list', 'log'], ['hmlog', 'Stock history', 'history'], ['hmexp', 'Expenses', 'down'], ['hmpl', 'Profit & loss', 'review'],
    ['settings', 'Settings & backup', 'palette'], ['guide', 'How it works', 'help']],
  optionalNav: ['hmevents', 'hmrestock', 'hmlog', 'hmexp', 'guide'],
  navGroups: [['Your workshop', ['dashboard', 'hmprods', 'hmmats', 'hmmake', 'hmsales', 'hmevents']], ['Stock & money', ['hmrestock', 'hmlog', 'hmexp', 'hmpl']]],
  navGroupRest: 'Make it yours',

  labels: {
    income: 'Sales', expense: 'Expenses', saving: 'Savings & investing', savingShort: 'Contributions', savingOne: 'Contribution',
    incomePlanned: 'Expected sales', incomeReceived: 'Sales', expensesPaid: 'Expenses paid', savedInvested: 'Saved & invested',
    plannedContributions: 'Planned contributions', savingsFilter: 'Savings & investments',
    plannedIncome: 'PLANNED SALES', subscriptionKpi: 'Subscription plan', yourName: 'Your shop name (optional)', yourNameHint: 'e.g. Willow & Wick',
    greeting: '', greetingPlain: 'Your workshop', planTitle: 'Your workshop', categoryPlaceholder: 'e.g. Candles',
    categorySub: 'Make it fit your shop.', directionNormal: 'Paid',
    statementKinds: 'a statement',
    importNote: '',
    exitDemo: 'Return to my workshop', demoOnly: 'Your workshop only', demoNote: 'Fictional candle and soap maker. Your own materials and sales stay separate.', notePlaceholder: 'e.g. Spring batch',
    incomeOne: 'Sale', savedCol: 'Saved', transfer: 'Transfers (not counted)', transferOne: 'Transfer', netHint: 'Sales − every cost',
    savingRateEmpty: 'Record a sale to see your profit', savingRate: '% of sales',
  },
  quickLog: { placeholder: 'mailers 12.99', help: 'Try “mailers 12.99”.', demo: ['mailers', '12.99', 'Shipping supplies'] },

  tourTopics: 'materials, recipes, making batches, recording sales, craft fairs, stock counts and backups',
  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'What each piece really costs', text: '<p>Your materials with what you paid, each product’s recipe, and every batch you make. The app works out what a piece costs, what’s on the shelf and what you really kept after every sale.</p><p>Everything stays on your computer: no account, no subscription.</p>' },
    { icon: 'tags', step: 'MATERIALS', title: 'Buy, use, never lose track', text: '<p>Record what you buy and its cost. Making a batch uses the materials up for you. Stock counts and breakages are logged with a reason, so the numbers always add up.</p>' },
    { icon: 'calendar', step: 'SELLING', title: 'Etsy, craft fairs and everywhere else', text: '<p>Record sales on each channel, plan a craft fair with what to make and take, then see what the day really made after the booth fee.</p>' },
    'backup',
    { icon: 'grid', step: 'START', title: 'Start with one product', text: '<p>Its materials and recipe now; the sales whenever they happen.</p>', cta: { label: 'Add my first material', action: 'hm-mat-add' }, finish: 'Look around first' },
  ],
  guide: {
    title: 'Four steps to stock and profit that add up.',
    cards: [
      ['tags', '1. Materials', 'Add each material and record what you buy: quantity and total cost. Its average cost updates itself.', 'Materials', 'hmmats'],
      ['grid', '2. Products', 'Add a product with its recipe: how much of each material one piece uses, plus packaging and your time.', 'Products', 'hmprods'],
      ['spark', '3. Make a batch', 'Say what you made. The materials are used up and the pieces join your stock at what they cost.', 'Make a batch', 'hmmake'],
      ['wallet', '4. Sell', 'Record sales on Etsy, at fairs or anywhere. Profit counts fees, shipping and what the pieces cost.', 'Sales', 'hmsales'],
    ],
    meanings: [['Average cost', 'What one unit of a material cost you, averaged over what you bought'], ['Cost per piece', 'Materials and packaging for one piece, at today’s average costs'], ['True profit', 'What a sale left after fees, shipping and what the pieces cost'], ['Sell-through', 'Pieces sold ÷ pieces you took to the event']],
    details: [
      ['Why can’t I just type my stock?', 'Stock is worked out from what you bought, made, sold and adjusted, in date order. That way every unit can be traced and nothing goes missing. To start, record what you already have as a stock count.'],
      ['Starting with what I already have', 'Materials: record a purchase with today’s date and roughly what it cost. Finished pieces: open the product and use Stock count; they’re valued at today’s recipe cost.'],
      ['Stock counts', 'Stock history → Count stock: type what’s really on the shelf and every difference is saved as an adjustment, with the reason “Stock count”.'],
      ['Breakages, gifts and samples', 'Use Adjust on a material or product and pick the reason. Damaged, lost, gifts and samples are a business cost; things you kept for yourself are not.'],
      ['Changing a recipe', 'Each batch keeps the recipe it was made with, so changing a recipe only affects new batches.'],
      ['Labor', 'Set your hourly rate in Settings and the minutes a piece takes. Labor shows in pricing, not in what stock is worth: tax rules count your own time differently.'],
      ['Craft fairs', 'Plan an event with the booth fee and what you plan to make and take. On the day, Record sales takes a quick tally. Afterwards it shows what sold, what came home and what the day really made.'],
      ['Channel fees', 'Etsy and website fees start as typical rates in Settings; fees change, so check yours. Each sale keeps the fee it was saved with.'],
      ['Making with too little stock', 'You can save a batch even if a material looks short (maybe you didn’t record a purchase). It’s flagged on Home and in Stock history until a purchase or count fixes it.'],
      ['Is this tax advice?', 'No. The profit & loss is a worksheet of your own numbers. Materials count as a cost when the pieces made from them sell, which is how inventory businesses usually report.'],
    ],
  },

  // the fictional maker behind "Explore sample data": a candle and soap studio selling on Etsy, its website, shops and fairs
  sample: {
    name: 'Willow & Wick', opening: 0, settings: { hmRate: 2000, hmPrefix: 'WW-' },
    note: 'Record each batch and sale as it happens.',
    extraCategories: [], amounts: {}, days: {}, undated: [],
    spread: { groups: [], days: [], notes: [], share: { default: .5 } },
    goals: [],
    extras: (s, { uid }) => {
      const t = new Date().toISOString().slice(0, 10);
      const addD = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
      let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const r3 = x => Math.round(x * 1000) / 1000;
      // [id, name, unit, cost per buy (cents), qty per buy, reorder at, supplier]
      const M = [['soy', 'Soy wax', 'lb', 4500, 20, 8, 'Lakeshore Supply'], ['coco', 'Coconut wax blend', 'lb', 6200, 10, 4, 'Lakeshore Supply'], ['jar8', 'Amber jar 8 oz', 'each', 4800, 36, 12, 'Glassworks Co.'],
        ['tin4', 'Travel tin 4 oz', 'each', 2400, 48, 12, 'Glassworks Co.'], ['wick', 'Cotton wicks', 'each', 1200, 100, 30, 'Lakeshore Supply'], ['cedar', 'Cedar & sage oil', 'oz', 3600, 16, 6, 'Fragrance Barn'],
        ['lav', 'Lavender oil', 'oz', 3200, 16, 6, 'Fragrance Barn'], ['cit', 'Citrus grove oil', 'oz', 3000, 16, 6, 'Fragrance Barn'], ['soapb', 'Goat milk soap base', 'lb', 3800, 10, 4, 'Meadow Soap Supply'],
        ['oat', 'Ground oatmeal', 'oz', 900, 32, 8, 'Meadow Soap Supply'], ['label', 'Printed labels', 'each', 2500, 250, 60, 'Print Corner'], ['box', 'Kraft gift boxes', 'each', 3000, 50, 15, 'Print Corner']];
      s.hmMats = M.map(([id, name, unit, , , reorder, supplier]) => ({ id, name, unit, reorder, supplier }));
      // [id, name, price, labor min, packaging, recipe, weekly demand, usual channel]
      const P = [['cedar8', 'Cedar & Sage candle, 8 oz', 2800, 12, 0, [['soy', 0.45], ['jar8', 1], ['wick', 1], ['cedar', 0.6], ['label', 1]], 4.2],
        ['lav8', 'Lavender Fields candle, 8 oz', 2800, 12, 0, [['soy', 0.45], ['jar8', 1], ['wick', 1], ['lav', 0.6], ['label', 1]], 3.6],
        ['cit4', 'Citrus Grove travel tin', 1600, 8, 0, [['coco', 0.22], ['tin4', 1], ['wick', 1], ['cit', 0.3], ['label', 1]], 3.4],
        ['melts', 'Wax melts, 6 pack', 1200, 6, 35, [['soy', 0.25], ['cedar', 0.15], ['cit', 0.15], ['label', 1]], 2.6],
        ['oats', 'Oatmeal & honey soap', 900, 5, 0, [['soapb', 0.28], ['oat', 0.5], ['label', 1]], 4.5],
        ['lavs', 'Lavender goat milk soap', 900, 5, 0, [['soapb', 0.28], ['lav', 0.15], ['label', 1]], 3.8],
        ['gift', 'Cozy night gift box', 4800, 15, 0, [['soy', 0.45], ['jar8', 1], ['wick', 1], ['lav', 0.6], ['soapb', 0.28], ['oat', 0.5], ['label', 2], ['box', 1]], 1.2]];
      s.hmProds = P.map(([id, name, price, labor, pack, bom], i) => ({ id, sku: 'WW-' + String(i + 1).padStart(3, '0'), name, price, labor, pack, bom: bom.map(([m, q]) => ({ m, q })), reorder: id === 'gift' ? 2 : 6, chan: 'etsy', cat: /soap/.test(name) ? 'Soap' : id === 'gift' ? 'Gift sets' : 'Candles' }));
      s.hmBuys = []; s.hmBatches = []; s.hmSales = []; s.hmAdj = []; s.hmEvents = [];
      const stockM = Object.fromEntries(M.map(m => [m[0], 0])), stockP = Object.fromEntries(P.map(p => [p[0], 0]));
      const buy = (m, d) => { const x = M.find(z => z[0] === m), price = Math.round(x[3] * (0.92 + rnd() * 0.16)); s.hmBuys.push({ id: uid(), mat: m, date: d, qty: x[4], cost: price, supplier: x[6] }); stockM[m] = r3(stockM[m] + x[4]); };
      const make = (p, q, d) => { const x = P.find(z => z[0] === p); for (const [m, n] of x[5]) { while (stockM[m] < n * q) buy(m, addD(d, -1)); } for (const [m, n] of x[5]) stockM[m] = r3(stockM[m] - n * q); s.hmBatches.push({ id: uid(), prod: p, date: d, qty: q, bom: x[5].map(([m, qq]) => ({ m, q: qq })), pack: x[4] }); stockP[p] += q; };
      const fee = (ch, price, ship) => ch === 'etsy' ? Math.round((price + ship) * 950 / 10000) + 45 : ch === 'web' ? Math.round((price + ship) * 290 / 10000) + 30 : 0;
      const sell = (p, q, d, ch, ev) => { if (stockP[p] < q) return; const x = P.find(z => z[0] === p), price = Math.round(x[2] * q * (ch === 'wholesale' ? 0.5 : 1)), ship = ch === 'etsy' || ch === 'web' ? (rnd() < 0.5 ? 595 : 0) : 0, label = ch === 'etsy' || ch === 'web' ? 650 + (q > 1 ? 150 : 0) : 0;
        s.hmSales.push({ id: uid(), prod: p, date: d, qty: q, chan: ch, price, ship, fee: fee(ch, price, ship), label, other: 0, ...(ev ? { event: ev } : {}) }); stockP[p] -= q; };
      // 12 months: make on Mondays, sell through the week, and three craft fairs along the way
      const start = addD(t, -364), fairs = [[-300, 'Spring makers market', 6500, 7], [-200, 'Summer street fair', 8500, 8], [-80, 'Harvest craft fair', 9500, 9]].map(([off, name, booth, hours], i) => ({ d: addD(t, off), name, booth, hours, i }));
      for (let d = start, k = 0; d < t; d = addD(d, 1), k++) {
        const dow = k % 7, holiday = +d.slice(5, 7) >= 11;
        fairs.filter(f => addD(f.d, -3) === d).forEach(f => P.slice(0, 6).forEach(([p]) => { const want = 12 + f.i * 2 + 4; if (stockP[p] < want) make(p, Math.ceil((want - stockP[p]) / 6) * 6, d); }));
        fairs.filter(f => f.d === d).forEach(f => { const id = 'ev' + f.i, plan = [];
          P.slice(0, 6).forEach(([p]) => { const take = Math.max(0, Math.min(stockP[p], 12 + f.i * 2)); plan.push({ prod: p, planned: 12 + f.i * 2, taken: take }); const n = Math.round(take * (0.45 + rnd() * 0.35)); for (let j = 0; j < n; j++) sell(p, 1, d, 'fair', id); });
          s.hmEvents.push({ id, name: f.name, date: d, booth: f.booth, costs: [], hours: f.hours, plan }); });
        const adj = (ref, kind, q, reason, note) => { const st = kind === 'mat' ? stockM : stockP; if (q < 0 && st[ref] < -q) return; st[ref] = r3(st[ref] + q); s.hmAdj.push({ id: uid(), [kind]: ref, date: d, qty: q, reason, note }); };
        if (d === addD(t, -150)) adj('jar8', 'mat', -3, 'damaged', 'Cracked in shipping');
        if (d === addD(t, -60)) adj('cedar8', 'prod', -2, 'sample', 'Photo shoot');
        if (d === addD(t, -40)) adj('gift', 'prod', -1, 'gift', 'Giveaway winner');
        if (d === addD(t, -30)) adj('wick', 'mat', 12, 'count', 'Monthly count');
        if (dow === 0) P.forEach(([p, , , , , , wk]) => { const want = Math.ceil(wk * (holiday ? 2.4 : 1.4)); if (stockP[p] < want) make(p, Math.max(6, Math.ceil((want - stockP[p]) / 6) * 6), d); });
        P.forEach(([p, , , , , , wk]) => { let n = wk * (holiday ? 1.6 : 1) / 7; while (n > 0) { if (rnd() < Math.min(1, n)) { const r = rnd(), ch = r < 0.62 ? 'etsy' : r < 0.82 ? 'web' : r < 0.92 ? 'local' : 'wholesale'; sell(p, ch === 'wholesale' ? 6 : 1, d, ch); } n -= 1; } });
      }
      // the fair sales above were recorded one by one; card fees on fair sales
      s.hmSales.filter(x => x.chan === 'fair').forEach((x, i) => { if (i % 3) x.fee = Math.round(x.price * 0.026 + 15); });
      s.hmEvents.push({ id: 'ev9', name: 'Holiday makers market', date: addD(t, 24), booth: 12000, costs: [{ d: 'Table cover & signs', a: 3500 }], hours: 9, plan: P.slice(0, 7).map(([p], i) => ({ prod: p, planned: i === 6 ? 8 : 24, taken: 0 })) });
      // a supplies run two days ago tops up everything but the two left low on purpose
      M.forEach(([m, , , , , reorder]) => { if (!['tin4', 'cit'].includes(m) && stockM[m] < reorder * 1.6) buy(m, addD(t, -2)); });
      // the odd breakage, sample and giveaway (done inside the year above), and a count today that leaves two materials low
      ['tin4', 'cit'].forEach(m => { const have = stockM[m], keep = m === 'tin4' ? 8 : 4; if (have > keep) { s.hmAdj.push({ id: uid(), mat: m, date: t, qty: -r3(have - keep), reason: 'count', note: 'Monthly count' }); stockM[m] = keep; } });
      const y0 = addD(t, -360);
      s.hmExps = [
        { id: uid(), date: y0, amount: 1000, cat: 'fees', note: 'Etsy Plus', repeat: 'monthly' },
        { id: uid(), date: addD(y0, 4), amount: 2900, cat: 'software', note: 'Website plan', repeat: 'monthly' },
        { id: uid(), date: addD(y0, 9), amount: 15000, cat: 'studio', note: 'Shared studio space', repeat: 'monthly' },
        { id: uid(), date: addD(t, -280), amount: 8900, cat: 'shipsup', note: 'Mailer boxes & crinkle paper', repeat: 'once' },
        { id: uid(), date: addD(t, -120), amount: 6400, cat: 'shipsup', note: 'Mailer boxes, 100', repeat: 'once' },
        { id: uid(), date: addD(t, -200), amount: 24900, cat: 'tools', note: 'Pouring pot & thermometer set', repeat: 'once' },
        { id: uid(), date: addD(t, -45), amount: 3500, cat: 'ads', note: 'Etsy ads, holiday push', repeat: 'once' },
        { id: uid(), date: addD(y0, 30), amount: 18000, cat: 'insurance', note: 'Product liability insurance', repeat: 'yearly' },
      ];
    },
  },
};
