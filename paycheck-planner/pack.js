/* ===================================================================================
   NICHE PACK · Paycheck to Paycheck Planner (safe-to-spend edition)
   For people who live from one paycheck to the next. One question on the first screen:
   how much can I spend before I next get paid, without missing a bill? Built on the same
   engine as Money Autopilot; this pack starts from the tracker pack (categories, merchant
   list) and changes the product, the screens and the sample.
   =================================================================================== */
Object.assign(NICHE, {
  id: 'paycheck',
  product: {
    name: 'Paycheck to Paycheck Planner', mark: 'P', publisher: 'JPS DIGITAL PAGES', version: '2.0',
    tagline: 'Safe to spend until payday', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Paycheck to Paycheck Planner · Safe to spend until payday', themeColor: '#1F4A3E',
    description: 'Paycheck to Paycheck Planner by JPS Digital Pages. See what is safe to spend until your next payday, with every bill accounted for. Works offline; your data never leaves your computer.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%231F4A3E"/><path d="M22 48V16h13a9 9 0 0 1 0 18H22" fill="none" stroke="%23F2B441" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: 'Paycheck to Paycheck Planner. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Personal-use customer edition.',
    railNote: '<b>One number until payday.</b>What you have, less the bills still to come. Nothing leaves this computer.',
    printTitle: 'Paycheck to Paycheck Planner · JPS Digital Pages',
  },
  build: { file: 'PaycheckToPaycheckPlanner.html' },
  storage: { key: 'jps-paycheck-planner', file: 'paycheck-planner' },
  themes: ['sage', 'ledger', 'linen', 'fjord', 'blush', 'slate', 'night', 'midnight'],
  features: { goals: true, wealth: false, pl: false, tax: false, taxLines: false, mileage: false, invoices: false, autopilot: false, offline: true },
  settings: { hiddenNav: ['calendar', 'insights', 'annual', 'budget', 'goals', 'review', 'import'] },
  defaults: { ...NICHE.defaults, schedule: 'housing', quickSetup: ['salary', 'housing', 'groceries', 'dining'] },

  nav: [['dashboard', 'Today', 'today'], ['outlook', 'Until payday', 'outlook'], ['scheduled', 'Bills & pay', 'plan'], ['activity', 'Spending', 'log'],
    ['calendar', 'Calendar', 'calendar'], ['insights', 'Insights', 'spark'], ['annual', 'Year at a glance', 'insights'], ['budget', 'Spending limits', 'plan'],
    ['goals', 'Savings goals', 'umbrella'], ['review', 'Weekly review', 'review'], ['import', 'Import a statement', 'up'],
    ['settings', 'Settings & backup', 'palette'], ['guide', 'How it works', 'help']],
  optionalNav: ['calendar', 'insights', 'annual', 'budget', 'goals', 'review', 'import', 'guide'],
  navGroups: [['Day to day', ['dashboard', 'outlook', 'scheduled', 'activity']], ['Look back (optional)', ['calendar', 'insights', 'annual', 'budget', 'goals', 'review', 'import']]],
  navGroupRest: 'Make it yours',

  labels: {
    ...NICHE.labels,
    greeting: '’s safe-to-spend', greetingPlain: 'Safe to spend until payday', exitDemo: 'Return to my data',
    importNote: 'Map the columns of a bank or card CSV once. It fills your spending history; your balance does not change.',
  },
  quickLog: { placeholder: 'coffee 4.50', help: 'Spent something? “coffee 4.50”, “gas 40”. It comes off your safe-to-spend at once.', demo: ['coffee', '4.50', 'Restaurants & coffee'] },
  tourTopics: 'your number, bills, logging and backups',

  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Know what’s safe to spend until payday', text: '<p>One question, answered on the first screen: <b>how much can I spend before I next get paid, without missing a bill?</b></p><p>No categories to fill in, no spreadsheets.</p>' },
    { icon: 'plan', step: 'HOW', title: 'What you have, less what’s coming', text: '<p>You enter your balance, your next payday and the bills due before it. The app takes the bills and a small cushion off your balance and shows what’s left.</p>' },
    { icon: 'log', step: 'EVERY DAY', title: 'Logging takes one line', text: '<p>Spent something? Type <b>coffee 4.50</b> in Quick log. It comes off your number straight away. Check off a bill when it leaves, confirm payday when it lands.</p>' },
    'backup',
    { icon: 'check', step: 'START', title: 'Three questions, about a minute', text: '<p>Your balance, your next payday and the bills before it. You can change any of it later.</p>', cta: { label: 'Set up my number', action: 'pp-setup' } },
  ],
  guide: {
    title: 'Set up once. Then glance every day.',
    cards: [
      ['today', '1. Set up', 'Your balance, next payday and the bills before it.', 'Today', 'dashboard'],
      ['log', '2. Log as you go', 'Quick log takes one line: “coffee 4.50”.', 'Spending', 'activity'],
      ['outlook', '3. Look ahead', 'See every payday and bill for 90 days, and the tightest day.', 'Until payday', 'outlook'],
    ],
    meanings: [['Safe to spend', 'Balance − bills before payday − cushion'], ['Balance', 'What you entered, plus pay, less spending since'], ['Cushion', 'Money kept back so you never hit zero'], ['Tightest day', 'The lowest your balance gets in 90 days']],
    details: [
      ['Where does my balance come from?', 'You type it in once from your bank app. After that, every paycheck you confirm adds to it and every bill and purchase you log comes off it. Update it from your bank whenever you like with <b>Update balance</b>.'],
      ['What counts as a bill?', 'Anything that leaves on its own: rent, phone, car, insurance, subscriptions. Add them in <b>Bills &amp; pay</b> with how often they repeat. Bills due before your next payday come off your safe-to-spend.'],
      ['What is the cushion?', 'An amount the app pretends you don’t have, so a surprise never takes you to zero. Set it in setup or with the cushion line on Today.'],
      ['Is my data private?', 'Yes. The app is a single file that runs in your browser with no internet connection. Your data is saved in this browser on this computer. Download a backup now and then, or choose a backup folder.'],
    ],
  },

  // the fictional household behind "Explore sample data": paid every two weeks, a handful of bills
  sample: {
    name: 'Jordan', opening: 0, settings: {}, note: '',
    amounts: {}, days: {}, undated: [], spread: { groups: [], days: [], notes: [], share: { default: 0 } },
    goals: [{ category: 'emergency', kind: 'saving', name: 'A $1,000 cushion', target: 100000, opening: 22000, due: [0, '12-31'] }],
    extras(s, { now, uid, plusDays }) {
      const far = '2099-12-31', month = now.slice(0, 7), prev = m => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 2, 1, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
      const start = prev(prev(prev(month)));
      const day = d => start + '-' + String(d).padStart(2, '0');
      s.schedules = [
        { id: 'pay', name: 'Paycheck', category: 'salary', amount: 148500, frequency: 'biweekly', start: plusDays(now, 9 - 14 * 7), end: far },
        { id: 'rent', name: 'Rent', category: 'housing', amount: 112500, frequency: 'monthly', start: day(1), end: far },
        { id: 'phone', name: 'Phone', category: 'internet', amount: 6500, frequency: 'monthly', start: day(12), end: far },
        { id: 'power', name: 'Electricity', category: 'utilities', amount: 8900, frequency: 'monthly', start: day(18), end: far },
        { id: 'car', name: 'Car insurance', category: 'insurance', amount: 11200, frequency: 'monthly', start: day(22), end: far },
        { id: 'loan', name: 'Student loan', category: 'loan', amount: 18500, frequency: 'monthly', start: day(15), end: far },
        { id: 'netflix', name: 'Netflix', category: 'streaming', amount: 1549, frequency: 'monthly', start: day(9), end: far },
        { id: 'gym', name: 'Gym', category: 'memberships', amount: 2499, frequency: 'monthly', start: day(26), end: far },
      ];
      s.transactions = [];
      // every past payday and bill was confirmed when it happened
      let m = start;
      while (m <= month) {
        Budget.occurrences(s, m).forEach(o => { if (o.date < now) s.transactions.push({ id: uid(), date: o.date, category: o.category, amount: o.amount, note: o.name, scheduleKey: o.key }); });
        const d = new Date(+m.slice(0, 4), +m.slice(5), 1, 12); m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      // everyday spending, logged as it happened
      const shops = [['groceries', 'Groceries', 5400, 4], ['dining', 'Coffee', 520, 2], ['dining', 'Lunch', 1250, 3], ['transport', 'Gas', 4200, 6], ['shopping', 'Target', 2900, 9], ['personal', 'Pharmacy', 1600, 11], ['entertainment', 'Movies', 2400, 13]];
      for (let back = 75; back >= 0; back--) {
        const date = plusDays(now, -back);
        shops.forEach(([cat, note, amt, every], i) => { if ((back + i) % every === 0) s.transactions.push({ id: uid(), date, category: cat, amount: amt + ((back * 37 + i * 101) % 9) * 85, note }); });
      }
      s.transactions.sort((a, b) => a.date.localeCompare(b.date));
      // the balance was checked against the bank app this morning
      s.payday = { balance: 141250, buffer: 15000, asOf: now, excl: [] };
      Object.values(s.months).forEach(x => { x.closed = false; });
    },
  },
});
