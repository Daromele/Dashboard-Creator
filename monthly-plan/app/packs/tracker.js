/* ===================================================================================
   NICHE PACK · Money Autopilot (income & expense tracker edition)
   For people who want the picture without the bookkeeping: drop in card and bank
   statements, and the app sorts, pairs and sums them by itself. Everything stays on
   the buyer's computer: no bank login, no account linking, no network at all.
   Product identity, categories, the merchant list, labels, copy and the sample live
   here; the engine below is shared with every other edition.
   =================================================================================== */
const NICHE = {
  id: 'tracker',
  product: {
    name: 'Money Autopilot', mark: 'A', publisher: 'MONEY TRACKER', version: '1.0',
    tagline: 'Income & expense tracker', site: 'https://www.jpsdigitalpages.com', siteLabel: 'JPS Digital Pages',
    title: 'Money Autopilot · Private Income & Expense Tracker', themeColor: '#1f3b36',
    description: 'Money Autopilot by JPS Digital Pages. Drop in your card and bank statements and see where your money goes, sorted automatically. No bank login. Works offline; your data never leaves your computer.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="%231f3b36"/><path d="M16 46 32 16l16 30M22 36h20" fill="none" stroke="%23f2c879" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    notice: 'Money Autopilot. Copyright (c) 2026 JPS Digital Pages. All rights reserved.\n     Personal-use customer edition.',
    railNote: '<b>Your money, sorted for you.</b>Statements in, the whole picture out. Nothing leaves this computer.',
    printTitle: 'Money Autopilot · JPS Digital Pages',
  },
  build: { file: 'MoneyAutopilot.html' },
  storage: { key: 'jps-money-autopilot', file: 'money-autopilot' },
  themes: ['fjord', 'sage', 'lavender', 'linen', 'blush', 'slate', 'night', 'midnight'],
  // autopilot: statements import themselves · offline: the app never goes online, except to look up
  // exchange rates (currencies and dates only) once you switch that on
  features: { goals: true, wealth: true, pl: false, tax: false, taxLines: false, mileage: false, invoices: false, autopilot: true, offline: true },
  settings: { hiddenNav: ['paychecks', 'budget', 'goals', 'scheduled', 'calendar', 'wealth', 'review'] },

  groups: [
    { id: 'income', label: 'Money in', type: 'income' },
    { id: 'bills', label: 'Bills', type: 'expense', fixed: true },
    { id: 'subscriptions', label: 'Subscriptions', type: 'expense', fixed: true, subscription: true },
    { id: 'debt', label: 'Loan payments', type: 'expense', fixed: true, debt: true },
    { id: 'variable', label: 'Everyday spending', type: 'expense' },
    { id: 'savings', label: 'Savings', type: 'saving' },
    { id: 'investment', label: 'Investing', type: 'saving', icon: 'outlook' },
    // money moving between your own accounts: a card payment from checking, savings top-ups
    { id: 'transfer', label: 'Between your accounts (not counted)', type: 'transfer', debt: true },
  ],
  // [id, name, group]
  categories: [
    ['salary', 'Paychecks', 'income'], ['side', 'Side income', 'income'], ['interest', 'Interest & dividends', 'income'], ['other-income', 'Other money in', 'income'],
    ['housing', 'Rent / mortgage', 'bills'], ['utilities', 'Utilities', 'bills'], ['internet', 'Phone & internet', 'bills'], ['insurance', 'Insurance', 'bills'], ['taxes', 'Taxes', 'bills'],
    ['streaming', 'Streaming & music', 'subscriptions'], ['software', 'Apps & software', 'subscriptions'], ['memberships', 'Gym & memberships', 'subscriptions'],
    ['loan', 'Loan payments', 'debt'],
    ['groceries', 'Groceries', 'variable'], ['dining', 'Restaurants & coffee', 'variable'], ['transport', 'Gas & transport', 'variable'], ['shopping', 'Shopping', 'variable'],
    ['health', 'Health & pharmacy', 'variable'], ['personal', 'Personal care', 'variable'], ['entertainment', 'Fun & entertainment', 'variable'], ['travel', 'Travel', 'variable'],
    ['kids-pets', 'Kids & pets', 'variable'], ['gifts', 'Gifts & donations', 'variable'], ['home', 'Home & garden', 'variable'], ['fees', 'Fees & interest charges', 'variable'],
    ['cash', 'Cash & ATM', 'variable'], ['people', 'Venmo, Zelle & checks', 'variable'], ['unsorted', 'Not sorted yet', 'variable'],
    ['emergency', 'Savings', 'savings'], ['investing', 'Investing & retirement', 'investment'],
    ['card-payoff', 'Credit card payments', 'transfer'], ['own-transfer', 'Transfers between my accounts', 'transfer'], ['platform-payout', 'PayPal & app transfers', 'transfer'], ['inside-investing', 'Inside investment accounts', 'transfer'],
  ],
  // the categories the Autopilot falls back on
  // savings: money moved to savings · investing: money moved to brokerage or retirement · invested: what happens inside those accounts
  autopilot: { savings: 'emergency', investing: 'investing', invested: 'inside-investing', payoff: 'card-payoff', transfer: 'own-transfer', salary: 'salary', interest: 'interest', otherIncome: 'other-income', unsorted: 'unsorted', people: 'people', rent: 'housing' },
  // known merchants: [pattern on the lower-case description, category, the name shown]. First match wins,
  // so the specific ones ("amazon prime") come before the general ones ("amazon").
  merchantDict: [
    // subscriptions
    [/netflix/, 'streaming', 'Netflix'], [/spotify/, 'streaming', 'Spotify'], [/hulu/, 'streaming', 'Hulu'], [/disney ?\+|disneyplus|disney plus/, 'streaming', 'Disney+'],
    [/\bhbo\b|\bmax\.com|hbomax/, 'streaming', 'Max'], [/paramount/, 'streaming', 'Paramount+'], [/peacock/, 'streaming', 'Peacock'], [/youtube ?premium|youtube ?tv|google \*youtube/, 'streaming', 'YouTube'],
    [/apple\.com\/bill|apple music|itunes/, 'streaming', 'Apple'], [/audible/, 'streaming', 'Audible'], [/sirius ?xm/, 'streaming', 'SiriusXM'], [/pandora/, 'streaming', 'Pandora'], [/crunchyroll/, 'streaming', 'Crunchyroll'],
    [/amazon ?prime|amzn ?prime|prime ?video|prime membership|amazon\.com\*prime|\bprime\*[a-z0-9]/, 'streaming', 'Amazon Prime'], [/kindle unlimited/, 'streaming', 'Kindle Unlimited'],
    [/openai|chatgpt/, 'software', 'ChatGPT'], [/anthropic|claude\.ai/, 'software', 'Claude'], [/adobe/, 'software', 'Adobe'], [/microsoft|msft|xbox/, 'software', 'Microsoft'], [/google \*(storage|one|workspace|gsuite)|google one/, 'software', 'Google One'],
    [/icloud/, 'software', 'iCloud'], [/dropbox/, 'software', 'Dropbox'], [/\bcanva\b/, 'software', 'Canva'], [/\bnotion\b/, 'software', 'Notion'], [/1password|lastpass|dashlane/, 'software', 'Password manager'],
    [/nordvpn|expressvpn|surfshark/, 'software', 'VPN'], [/grammarly/, 'software', 'Grammarly'], [/duolingo/, 'software', 'Duolingo'], [/patreon/, 'software', 'Patreon'], [/substack/, 'software', 'Substack'],
    [/nytimes|new york times|wsj|washington post|the atlantic/, 'software', 'News subscription'], [/linkedin/, 'software', 'LinkedIn'], [/zoom\.us|zoom video/, 'software', 'Zoom'], [/github/, 'software', 'GitHub'],
    [/planet fitness/, 'memberships', 'Planet Fitness'], [/equinox/, 'memberships', 'Equinox'], [/la fitness/, 'memberships', 'LA Fitness'], [/24 hour fitness/, 'memberships', '24 Hour Fitness'], [/anytime fitness/, 'memberships', 'Anytime Fitness'],
    [/orangetheory/, 'memberships', 'Orangetheory'], [/peloton/, 'memberships', 'Peloton'], [/classpass/, 'memberships', 'ClassPass'], [/\bymca\b/, 'memberships', 'YMCA'], [/costco member|costco annual/, 'memberships', 'Costco membership'],
    [/walmart\+|walmart plus/, 'memberships', 'Walmart+'], [/dashpass/, 'memberships', 'DashPass'], [/uber one/, 'memberships', 'Uber One'],
    // bills
    [/comcast|xfinity/, 'internet', 'Xfinity'], [/verizon/, 'internet', 'Verizon'], [/at&t|\batt\b|at ?& ?t/, 'internet', 'AT&T'], [/t-mobile|tmobile/, 'internet', 'T-Mobile'], [/spectrum|charter comm/, 'internet', 'Spectrum'],
    [/cox comm/, 'internet', 'Cox'], [/mint mobile/, 'internet', 'Mint Mobile'], [/google \*fi|google fi/, 'internet', 'Google Fi'], [/\bvisible\b/, 'internet', 'Visible'], [/cricket wireless/, 'internet', 'Cricket'], [/\boptimum\b/, 'internet', 'Optimum'], [/frontier comm/, 'internet', 'Frontier'],
    [/pg&e|pacific gas|con ?ed|coned|duke energy|dominion energy|georgia power|\bfpl\b|florida power|southern california edison|\bsce\b|xcel|ameren|eversource|national grid|pseg|dte energy|consumers energy|entergy|oncor|reliant|txu|\baps\b|\bsrp\b|electric|power co/, 'utilities', 'Electricity'],
    [/water (dept|district|utility|bill)|city of .* water|american water|aqua america/, 'utilities', 'Water'],
    // Spain and Europe: water, power and gas companies, and phone and internet providers
    [/emasesa/, 'utilities', 'EMASESA'], [/canal de isabel/, 'utilities', 'Canal de Isabel II'], [/aigues de/, 'utilities', 'Aigües de Barcelona'], [/aqualia/, 'utilities', 'Aqualia'], [/hidralia/, 'utilities', 'Hidralia'], [/endesa/, 'utilities', 'Endesa'], [/iberdrola/, 'utilities', 'Iberdrola'], [/naturgy|gas natural fenosa/, 'utilities', 'Naturgy'], [/holaluz/, 'utilities', 'Holaluz'], [/repsol (luz|electricidad)/, 'utilities', 'Repsol Luz'], [/totalenergies/, 'utilities', 'TotalEnergies'], [/octopus energy/, 'utilities', 'Octopus Energy'],
    [/movistar/, 'internet', 'Movistar'], [/vodafone/, 'internet', 'Vodafone'], [/orange esp/, 'internet', 'Orange'], [/\\bdigi\\b/, 'internet', 'DIGI'], [/pepephone/, 'internet', 'Pepephone'], [/masmovil/, 'internet', 'MásMóvil'], [/yoigo/, 'internet', 'Yoigo'], [/jazztel/, 'internet', 'Jazztel'], [/lowi/, 'internet', 'Lowi'], [/simyo/, 'internet', 'Simyo'], [/finetwork/, 'internet', 'Finetwork'],
    [/aguas de|aguas municipalizadas|acciona agua/, 'utilities', 'Water'], [/socalgas|so cal gas|nicor|peoples gas|gas company|atmos energy|piedmont natural|spire\b/, 'utilities', 'Gas bill'], [/waste management|republic services/, 'utilities', 'Trash'],
    [/geico/, 'insurance', 'GEICO'], [/progressive/, 'insurance', 'Progressive'], [/state farm/, 'insurance', 'State Farm'], [/allstate/, 'insurance', 'Allstate'], [/liberty mutual/, 'insurance', 'Liberty Mutual'], [/usaa ins|usaa p&c/, 'insurance', 'USAA Insurance'],
    [/farmers ins/, 'insurance', 'Farmers'], [/nationwide/, 'insurance', 'Nationwide'], [/lemonade/, 'insurance', 'Lemonade'], [/metlife|prudential|northwestern mutual|haven life|ladder life/, 'insurance', 'Life insurance'],
    [/\brent\b|\brent payment|apartments|property mgmt|property management|landlord|zillow rent|avail\.co|appfolio|buildium|rentcafe|yardi|bilt/, 'housing', 'Rent'], [/mortgage|mtg pmt|rocket mortgage|mr\.? cooper|loancare|wells fargo home|pennymac|freedom mortgage/, 'housing', 'Mortgage'], [/\bhoa\b|homeowners assoc/, 'housing', 'HOA'],
    [/irs\b|us treasury|treas tax|franchise tax|dept of revenue|department of revenue|state tax/, 'taxes', 'Taxes'],
    [/navient|nelnet|mohela|aidvantage|great lakes|sallie mae|edfinancial|student loan|dept of ed/, 'loan', 'Student loan'], [/toyota financial|honda financial|ford credit|gm financial|ally auto|capital one auto|santander consumer|carmax auto|auto loan/, 'loan', 'Car loan'], [/sofi loan|lending ?club|upstart|best egg|marcus loan|prosper/, 'loan', 'Personal loan'],
    // everyday
    [/whole ?foods|wholefds/, 'groceries', 'Whole Foods'], [/trader joe/, 'groceries', 'Trader Joe’s'], [/kroger/, 'groceries', 'Kroger'], [/safeway/, 'groceries', 'Safeway'], [/publix/, 'groceries', 'Publix'], [/\baldi\b/, 'groceries', 'Aldi'],
    [/\bh-?e-?b\b/, 'groceries', 'H-E-B'], [/wegmans/, 'groceries', 'Wegmans'], [/albertsons/, 'groceries', 'Albertsons'], [/food lion/, 'groceries', 'Food Lion'], [/stop & shop|stop and shop/, 'groceries', 'Stop & Shop'], [/giant eagle|giant food/, 'groceries', 'Giant'],
    [/sprouts/, 'groceries', 'Sprouts'], [/meijer/, 'groceries', 'Meijer'], [/hy-?vee/, 'groceries', 'Hy-Vee'], [/winco/, 'groceries', 'WinCo'], [/ralphs/, 'groceries', 'Ralphs'], [/vons\b/, 'groceries', 'Vons'], [/harris teeter/, 'groceries', 'Harris Teeter'], [/shoprite/, 'groceries', 'ShopRite'],
    [/instacart/, 'groceries', 'Instacart'], [/costco/, 'groceries', 'Costco'], [/sam'?s club/, 'groceries', 'Sam’s Club'], [/grocery|supermarket|market basket|food mart/, 'groceries', ''],
    [/starbucks/, 'dining', 'Starbucks'], [/dunkin/, 'dining', 'Dunkin’'], [/mcdonald/, 'dining', 'McDonald’s'], [/chipotle/, 'dining', 'Chipotle'], [/chick-?fil-?a/, 'dining', 'Chick-fil-A'], [/taco bell/, 'dining', 'Taco Bell'], [/\bsubway\b/, 'dining', 'Subway'],
    [/panera/, 'dining', 'Panera'], [/wendy/, 'dining', 'Wendy’s'], [/burger king/, 'dining', 'Burger King'], [/domino/, 'dining', 'Domino’s'], [/pizza hut/, 'dining', 'Pizza Hut'], [/sweetgreen/, 'dining', 'Sweetgreen'], [/shake shack/, 'dining', 'Shake Shack'], [/in-n-out/, 'dining', 'In-N-Out'],
    [/panda express/, 'dining', 'Panda Express'], [/five guys/, 'dining', 'Five Guys'], [/popeyes/, 'dining', 'Popeyes'], [/kfc\b/, 'dining', 'KFC'], [/dutch bros/, 'dining', 'Dutch Bros'], [/peet'?s coffee/, 'dining', 'Peet’s'],
    [/doordash/, 'dining', 'DoorDash'], [/uber ?eats/, 'dining', 'Uber Eats'], [/grubhub/, 'dining', 'Grubhub'], [/postmates/, 'dining', 'Postmates'], [/seamless/, 'dining', 'Seamless'],
    [/restaurant|\bgrill\b|\bcafe\b|coffee|bistro|pizza|sushi|taqueria|kitchen|diner|bakery|bar & grill|brewing|tst\*|\btoast\b/, 'dining', ''],
    [/\buber\b(?! ?eats| one)|\blyft\b/, 'transport', 'Uber & Lyft'], [/shell oil|\bshell\b/, 'transport', 'Shell'], [/chevron/, 'transport', 'Chevron'], [/exxon|mobil\b/, 'transport', 'Exxon'], [/\bbp\b|bp#/, 'transport', 'BP'], [/sunoco/, 'transport', 'Sunoco'],
    [/marathon petro|speedway/, 'transport', 'Speedway'], [/wawa/, 'transport', 'Wawa'], [/sheetz/, 'transport', 'Sheetz'], [/circle k/, 'transport', 'Circle K'], [/7-eleven|7 eleven/, 'transport', '7-Eleven'], [/quiktrip|\bqt\b/, 'transport', 'QuikTrip'], [/valero/, 'transport', 'Valero'], [/\barco\b/, 'transport', 'ARCO'],
    [/e-?zpass|fastrak|sunpass|\btolls?\b/, 'transport', 'Tolls'], [/parking|parkmobile|spothero/, 'transport', 'Parking'], [/\bmta\b|metro ?card|bart\b|clipper|ventra|septa|wmata|caltrain|amtrak|transit/, 'transport', 'Transit'], [/jiffy lube|valvoline|autozone|o'?reilly auto|advance auto|pep boys|firestone|discount tire|car wash/, 'transport', 'Car care'], [/dmv|motor vehicle/, 'transport', 'DMV'],
    [/gas station|fuel/, 'transport', ''],
    [/amazon|amzn/, 'shopping', 'Amazon'], [/walmart|wal-mart/, 'shopping', 'Walmart'], [/\btarget\b/, 'shopping', 'Target'], [/best buy/, 'shopping', 'Best Buy'], [/apple store|apple\.com(?!\/bill)/, 'shopping', 'Apple Store'], [/ebay/, 'shopping', 'eBay'], [/etsy/, 'shopping', 'Etsy'],
    [/tj ?maxx|marshalls|homegoods|ross stores|burlington/, 'shopping', 'Off-price stores'], [/\bmacy'?s?\b|nordstrom|\bkohl'?s\b|old navy|\bgap\b|banana republic|\bh&m\b|\bzara\b|uniqlo|\bnike\b|lululemon/, 'shopping', 'Clothing'], [/shein|temu|wish\.com|aliexpress/, 'shopping', 'Online shopping'],
    [/dollar tree|dollar general|family dollar|five below/, 'shopping', 'Dollar stores'], [/michaels|hobby lobby|joann/, 'shopping', 'Crafts'], [/ikea/, 'home', 'IKEA'], [/home depot/, 'home', 'Home Depot'], [/lowe'?s/, 'home', 'Lowe’s'], [/bed bath|wayfair|crate|pottery barn|west elm/, 'home', 'Home goods'], [/ace hardware|true value/, 'home', 'Hardware'],
    [/\bcvs\b/, 'health', 'CVS'], [/walgreens/, 'health', 'Walgreens'], [/rite aid/, 'health', 'Rite Aid'], [/pharmacy|medical|hospital|clinic|dental|dentist|orthodont|optometr|\bvision\b|urgent care|labcorp|quest diag|kaiser|doctor|dr\.? /, 'health', ''],
    [/great clips|supercuts|\bsalon\b|barber|\bspa\b|\bnails?\b|\bulta\b|sephora/, 'personal', ''],
    [/amc theat|regal cinema|cinemark|fandango|ticketmaster|stubhub|live nation|eventbrite|steam games|steampowered|playstation|nintendo|xbox live|bowling|golf|museum|concert/, 'entertainment', ''],
    [/airbnb/, 'travel', 'Airbnb'], [/vrbo/, 'travel', 'Vrbo'], [/marriott/, 'travel', 'Marriott'], [/hilton/, 'travel', 'Hilton'], [/hyatt/, 'travel', 'Hyatt'], [/expedia/, 'travel', 'Expedia'], [/booking\.com/, 'travel', 'Booking.com'],
    [/delta air|united air|american air|southwest|jetblue|alaska air|spirit air|frontier air|airline/, 'travel', 'Flights'], [/hertz|enterprise rent|avis|budget rent|national car/, 'travel', 'Car rental'], [/\bhotel\b|\bmotel\b|\binn\b|\bresort\b/, 'travel', ''],
    [/petco|petsmart|chewy|veterinar|\bvet\b|banfield/, 'kids-pets', 'Pets'], [/daycare|child care|childcare|kindercare|tuition|school/, 'kids-pets', 'Kids'],
    [/gofundme|red cross|unicef|donation|charity|church|tithe/, 'gifts', 'Donations'], [/1-800-flowers|ftd\b|edible arrangements/, 'gifts', 'Gifts'],
    [/annual fee|late fee|overdraft|nsf fee|service fee|monthly maintenance|foreign transaction fee|interest charge|finance charge|purchase interest|cash advance fee|atm fee/, 'fees', ''],
    [/atm|cash withdrawal/, 'cash', 'Cash withdrawal'],
    [/venmo/, 'people', 'Venmo'], [/zelle/, 'people', 'Zelle'], [/cash ?app|square cash/, 'people', 'Cash App'], [/apple cash/, 'people', 'Apple Cash'], [/^check\b|check #|check paid/, 'people', 'Check'],
    // money in
    [/irs treas.*tax ref|tax refund|state.*tax ref/, 'other-income', 'Tax refund'], [/etsy deposit|etsy inc|shopify|stripe|paypal transfer|square inc|gumroad|upwork|fiverr|doordash dasher|uber .*pay|lyft .*pay|instacart shopper/, 'side', 'Side income'],
    [/dividend|interest paid|interest earned|int earned/, 'interest', 'Interest'], [/robinhood|fidelity|vanguard|schwab|e\*trade|etrade|betterment|wealthfront|acorns|\bstash\b|m1 finance|coinbase/, 'investing', 'Investing'],
    [/ally bank|marcus|amex savings|capital one 360|discover savings|sofi savings|high yield/, 'emergency', 'Savings'],
  ],
  // words a statement's own Category column uses (Chase, Amex, Capital One, Discover…) → category id
  importHints: {
    groceries: 'groceries', grocery: 'groceries', supermarkets: 'groceries', 'merchandise & supplies-groceries': 'groceries',
    'food & drink': 'dining', dining: 'dining', restaurants: 'dining', restaurant: 'dining', 'restaurant-restaurant': 'dining', 'fast food': 'dining', coffee: 'dining',
    gas: 'transport', 'gas/automotive': 'transport', automotive: 'transport', 'auto & transport': 'transport', transportation: 'transport', 'transportation-fuel': 'transport', parking: 'transport', fuel: 'transport',
    'bills & utilities': 'utilities', utilities: 'utilities', 'phone/cable': 'internet', internet: 'internet', 'communications': 'internet',
    shopping: 'shopping', merchandise: 'shopping', 'general merchandise': 'shopping', 'merchandise & supplies': 'shopping', 'department stores': 'shopping', 'clothing': 'shopping',
    'health & wellness': 'health', health: 'health', medical: 'health', pharmacy: 'health', 'personal': 'personal', 'personal care': 'personal',
    entertainment: 'entertainment', 'travel': 'travel', 'airfare': 'travel', 'lodging': 'travel', 'travel/ entertainment': 'travel', 'home': 'home', 'home improvement': 'home',
    'gifts & donations': 'gifts', 'charity': 'gifts', education: 'kids-pets', 'pets': 'kids-pets',
    'fees & adjustments': 'fees', fees: 'fees', 'fees & charges': 'fees', interest: 'fees',
    insurance: 'insurance', rent: 'housing', mortgage: 'housing', taxes: 'taxes',
    'professional services': 'shopping', 'services': 'shopping',
  },
  platformDefaults: { sale: 'side', refund: 'side', fees: 'side', ads: 'side', shipping: 'side', feeTax: 'side', payout: '__skip', conversion: '__skip', taxWithheld: 'taxes', purchase: '', other: 'side' },
  defaults: { category: 'unsorted', schedule: 'housing', annualCategory: 'groceries', payout: 'platform-payout', quickSetup: ['salary', 'housing', 'groceries', 'dining', 'shopping', 'emergency'] },
  aliases: { coffee: 'dining', lunch: 'dining', dinner: 'dining', restaurant: 'dining', groceries: 'groceries', grocery: 'groceries', rent: 'housing', mortgage: 'housing', gas: 'transport', uber: 'transport', salary: 'salary', paycheck: 'salary', netflix: 'streaming', spotify: 'streaming', gym: 'memberships', amazon: 'shopping' },

  nav: [['dashboard', 'Money picture', 'today'], ['activity', 'Transactions', 'log'], ['recurring', 'Subscriptions & bills', 'calendar'],
    ['annual', 'Year at a glance', 'insights'], ['years', 'Year over year', 'years'], ['cuts', 'Cut back', 'scissors'], ['invest', 'Net worth', 'umbrella'], ['paychecks', 'Paychecks', 'coins'], ['insights', 'Insights', 'spark'], ['import', 'Add statements', 'up'], ['inbox', 'Needs a look', 'check'], ['accounts', 'Accounts', 'wallet'], ['budget', 'Spending limits', 'plan'], ['goals', 'Savings & goals', 'umbrella'], ['scheduled', 'Reminders', 'history'],
    ['calendar', 'Calendar', 'calendar'], ['wealth', 'Monthly snapshots', 'outlook'], ['review', 'Weekly review', 'review'], ['settings', 'Settings & backup', 'palette'], ['guide', 'How it works', 'help']],
  optionalNav: ['cuts', 'recurring', 'annual', 'years', 'invest', 'paychecks', 'insights', 'budget', 'goals', 'scheduled', 'calendar', 'wealth', 'review', 'guide'],
  navGroups: [['Your money', ['dashboard', 'activity', 'recurring', 'annual', 'years', 'cuts', 'invest', 'paychecks', 'insights']], ['Autopilot', ['import', 'inbox', 'accounts']], ['Plan (optional)', ['budget', 'goals', 'scheduled', 'calendar', 'wealth', 'review']]],
  navGroupRest: 'Make it yours',

  labels: {
    demoNote: 'Fictional household. Your own money stays separate.',
    income: 'Money in', expense: 'Spending', saving: 'Saved & invested', savingShort: 'Saved', savingOne: 'Saving',
    incomePlanned: 'Expected money in', incomeReceived: 'Money in', expensesPaid: 'Spent', savedInvested: 'Saved & invested',
    plannedContributions: 'Planned saving', savingsFilter: 'Savings & investing',
    plannedIncome: 'EXPECTED MONEY IN', subscriptionKpi: 'Subscriptions', yourName: 'Your name (optional)', yourNameHint: 'What should we call you?',
    greeting: '’s money picture', greetingPlain: 'Your money picture', planTitle: 'Spending limits (optional)', categoryPlaceholder: 'e.g. Childcare',
    categorySub: 'Rename, add or hide categories. The Autopilot uses what you set here.', directionNormal: 'Money in / money out / saving',
    statementKinds: 'card and bank statements',
    importNote: 'Card and bank statements are read automatically. For anything else, map the columns by hand.',
    exitDemo: 'Return to my money', demoOnly: 'Your data only', notePlaceholder: 'e.g. Whole Foods',
    incomeOne: 'Money in', savedCol: 'Saved', transfer: 'Between your accounts', transferOne: 'Transfer', netHint: 'Money in − spending − saving',
    savingRateEmpty: 'Add statements to see what you keep', savingRate: '% of money in',
    editPlan: 'Spending limits',
  },
  quickLog: { placeholder: 'cash lunch 12', help: 'For cash you spent: “lunch 12”, “farmers market 30”.', demo: ['coffee', '4.50', 'Restaurants & coffee'] },

  welcome: [
    { icon: 'today', step: 'WELCOME', title: 'Your money, sorted for you', text: '<p>Drop in your card and bank statements. Money Autopilot reads them, sorts every transaction and shows where your money goes.</p><p>No bank login, no account linking, no typing.</p>' },
    { icon: 'shield', step: 'PRIVATE', title: 'Nothing leaves this computer', text: '<p>Your statements are read right here, in this file. There is no server, no account and no internet connection. Long card and account numbers are hidden as soon as a file is read.</p>' },
    { icon: 'up', step: 'AUTOMATIC', title: 'Statements in, picture out', text: '<p>Download CSV statements from each card and bank (most have a <b>Download</b> or <b>Export</b> button) and drop them all in at once. Card payments and transfers between your accounts are paired, so nothing counts twice.</p>' },
    { icon: 'check', step: 'LEARNS', title: 'It asks only when it’s unsure', text: '<p>The few transactions it can’t place wait in <b>Needs a look</b>. Pick a category once and every future one from the same place follows.</p>' },
    'backup',
    { icon: 'up', step: 'START', title: 'Add your first statements', text: '<p>Start with last month from every card and bank account. You can add older months any time; repeats are skipped.</p>', cta: { label: 'Add statements', action: 'import' }, finish: 'Look around first' },
  ],
  guide: {
    title: 'Three steps. Then it runs itself.',
    cards: [
      ['up', '1. Download', 'From each card and bank, download last month’s transactions as CSV.', 'Add statements', 'import'],
      ['spark', '2. Drop them in', 'All files at once. Sorting, pairing and repeats are automatic.', 'Add statements', 'import'],
      ['check', '3. Glance', 'Clear the few in Needs a look, then read your money picture.', 'Needs a look', 'inbox'],
    ],
    meanings: [['Money in', 'Paychecks and other income'], ['Spending', 'Everything that left, less refunds'], ['Kept', 'Money in − spending'], ['Not counted', 'Card payments and your own transfers']],
    details: [
      ['Where do I get the CSV files?', 'Sign in to your bank or card website, open the account, and look for <b>Download</b>, <b>Export</b> or the download icon on the transactions list. Choose <b>CSV</b> (sometimes called “Spreadsheet” or “Comma delimited”) and a date range. Chase, Bank of America, Wells Fargo, Citi, Capital One, Amex, Discover, US Bank, Ally and most credit unions offer it.'],
      ['Why aren’t card payments counted?', 'Your card purchases are already counted as spending. The payment from checking to the card is the same money moving between your own accounts, so counting it again would double your spending. The Autopilot pairs the payment on both sides and leaves it out of every total.'],
      ['What if it sorts something wrong?', 'Change the category on the transaction. You’re asked whether to change the others from the same place and remember it for next time. Your choice always wins over the built-in list.'],
      ['What if I add the same month twice?', 'Transactions already in the app are skipped, even when two statements overlap by a few days. Two identical purchases on the same day in one file are both kept.'],
      ['Savings, brokerage and retirement accounts', 'Drop their files in with the rest. A savings account’s transactions CSV works like checking: money moved there from checking counts as <b>saved</b>, not spent. From a brokerage or IRA (Fidelity, Vanguard, Schwab…), the <b>positions</b> or <b>holdings</b> download gives each account’s balance, and the <b>activity</b> download adds contributions, dividends and fees; nothing inside those accounts counts as spending. A 401(k) that only offers PDFs: open <b>Savings & investments</b> and type its balance with <b>Update balance</b> each quarter.'],
      ['Net worth and credit card balances', 'Net worth is everything you own (checking, savings, investments, retirement) less what you owe (credit cards, loans, a mortgage). Card downloads don’t include the balance, so type what you owe on each card once with <b>Enter balance</b>; every statement after that keeps it current. Until then the app estimates it from the charges since your last payment, which is right if you pay in full each month. Loans and a mortgage: add them with <b>Add an account by hand</b> and update the balance now and then.'],
      ['Gross pay, taxes and retirement (Paychecks)', 'Your bank only sees take-home pay. Switch on <b>Paychecks</b> in Settings › Simplify your sidebar, then enter one recent pay stub per employer: gross pay, taxes, 401(k), insurance and the rest. Every paycheck for that take-home amount is broken down by itself; a bonus or overtime check is estimated from it until you enter its own stub.'],
      ['Is my data really private?', 'Yes. The app is a single file that runs in your browser with no internet connection. Your data is saved in this browser on this computer. Download a backup now and then, or choose a backup folder, so a cleared browser can’t take it with it.'],
    ],
  },

  // the fictional household behind "Explore sample data": built in extras, from statements-like rows
  sample: {
    name: 'Jordan', opening: 0, settings: {},
    note: '',
    amounts: {}, days: {}, undated: [], spread: { groups: [], days: [], notes: [], share: { default: 0 } },
    goals: [
      { category: 'emergency', kind: 'saving', name: 'Three months of cushion', target: 900000, opening: 250000, due: [1, '06-30'] },
    ],
    // a year of a two-account household, the way their statements would read
    extras(s, { m, year, now, uid }) {
      const A = { chk: 'acc-chk', card: 'acc-card', amex: 'acc-amex', sav: 'acc-sav' };
      s.accounts = [{ id: A.chk, name: 'Checking ••4410', kind: 'bank' }, { id: A.card, name: 'Chase ••5471', kind: 'card' }, { id: A.amex, name: 'Amex ••1009', kind: 'card' }, { id: A.sav, name: 'Ally Savings ••7720', kind: 'savings' }, { id: 'acc-brk', name: 'Fidelity Individual ••5678', kind: 'invest' }, { id: 'acc-401k', name: 'Acme 401(k)', kind: 'retire' }, { id: 'acc-car', name: 'Car loan', kind: 'loan' }];
      const tx = (date, category, amount, note, acct, why = 'merchant', look = false) => { if (date <= now) s.transactions.push({ id: uid(), date, category, amount, note, acct, auto: { why, ...(look ? { look: true } : {}) } }); };
      const d = (mo, day) => `${year}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const last = +m.slice(5, 7), bal = { sav: [], brk: [], k: [] };
      for (let mo = 1; mo <= last; mo++) {
        const w = mo % 3, card = {};
        const buy = (day, cat, amt, note, acct = A.card) => { tx(d(mo, day), cat, amt, note, acct); card[acct] = (card[acct] || 0) + amt; };
        tx(d(mo, 1), 'salary', 312000, 'Acme Corp Payroll', A.chk, 'paycheck'); tx(d(mo, 15), 'salary', 312000, 'Acme Corp Payroll', A.chk, 'paycheck');
        if (mo % 2 === 0) tx(d(mo, 20), 'side', 42000 + w * 8500, 'Etsy Deposit', A.chk);
        tx(d(mo, 1), 'housing', 185000, 'Rent', A.chk); tx(d(mo, 12), 'utilities', 9800 + (mo < 4 || mo > 9 ? 4200 : 1400) + w * 700, 'Electricity', A.chk);
        buy(3, 'internet', 7999, 'Xfinity'); buy(9, 'internet', 6500, 'Verizon'); tx(d(mo, 22), 'insurance', 13200, 'GEICO', A.chk);
        buy(5, 'streaming', 1549, 'Netflix'); buy(7, 'streaming', 1199, 'Spotify'); buy(14, 'software', 2000, 'ChatGPT', A.amex); buy(18, 'memberships', 2499, 'Planet Fitness'); buy(26, 'software', 299, 'iCloud', A.amex);
        if (mo >= 6) buy(11, 'streaming', 1899, 'Hulu', A.amex);
        tx(d(mo, 25), 'loan', 28500, 'Student loan', A.chk);
        [4, 11, 18, 25].forEach((day, i) => buy(day, 'groceries', 9800 + ((mo + i) % 4) * 1850, i % 2 ? 'Trader Joe’s' : 'Whole Foods'));
        [2, 6, 9, 13, 16, 20, 23, 27].forEach((day, i) => buy(day, 'dining', 650 + ((mo * 3 + i) % 5) * 410, ['Starbucks', 'Chipotle', 'Starbucks', 'DoorDash', 'Sweetgreen', 'Starbucks', 'Panera', 'Restaurants'][i], i % 3 ? A.card : A.amex));
        buy(8, 'transport', 4600 + w * 900, 'Shell'); buy(21, 'transport', 4300 + w * 700, 'Chevron'); buy(17, 'transport', 1850 + w * 600, 'Uber & Lyft', A.amex);
        buy(10, 'shopping', 4200 + (mo % 4) * 2300, 'Amazon', A.amex); buy(19, 'shopping', 3100 + w * 1600, 'Target'); if (mo === 11 || mo === 12) buy(6, 'gifts', 18500, 'Gifts', A.amex);
        buy(24, 'health', 1800 + w * 700, 'CVS'); if (mo % 3 === 0) buy(15, 'personal', 4500, 'Great Clips');
        if (mo % 2) buy(28, 'entertainment', 3200, 'AMC Theatres', A.amex);
        if (mo === 7) { buy(3, 'travel', 46800, 'Flights', A.amex); buy(19, 'travel', 61200, 'Airbnb', A.amex); }
        if (mo === 4) tx(d(mo, 12), 'shopping', -3999, 'Amazon', A.amex, 'refund');
        tx(d(mo, 16), 'emergency', 40000, 'Transfer to Savings', A.chk, 'transfer'); tx(d(mo, 16), 'own-transfer', -40000, 'Transfer from Checking', A.sav, 'transfer'); tx(d(mo, 28), 'interest', 1150 + mo * 140, 'Interest Paid', A.sav, 'interest');
        tx(d(mo, 3), 'investing', 25000, 'Fidelity', A.chk, 'transfer'); tx(d(mo, 3), 'inside-investing', -25000, 'Electronic Funds Transfer Received', 'acc-brk', 'contribution'); if (mo % 3 === 0) tx(d(mo, 27), 'inside-investing', -4130 - mo * 60, 'Dividend Received', 'acc-brk', 'dividend');
        // month-end balances, as the statements would show them
        const end = d(mo, 28); if (end <= now) { bal.sav.push({ date: end, value: 640000 + mo * 41300 + mo * mo * 90, how: 'file' }); bal.brk.push({ date: end, value: 1820000 + mo * 25000 + Math.round(Math.sin(mo) * 60000) + mo * 9000, how: 'file' }); if (mo % 3 === 0) bal.k.push({ date: d(mo, 28), value: 4100000 + mo * 108000 + (mo === 6 ? -90000 : 0), how: 'manual' }); }
        // the cards are paid in full from checking a few days after the statement closes: paired, not counted
        Object.entries(card).forEach(([acct, sum], i) => { const day = 27 - i * 2; tx(d(mo, day), 'card-payoff', sum, acct === A.amex ? 'Amex Epayment' : 'Chase Card Autopay', A.chk, 'card payment'); tx(d(mo, day), 'card-payoff', -sum, 'Payment Thank You', acct, 'card payment'); });
        // the sample opens on the last full month early in a month: a couple of unclear ones wait there
        if (mo === (+now.slice(8, 10) < 10 && last > 1 ? last - 1 : last)) { tx(d(mo, 9), 'people', 6000, 'Venmo', A.chk, 'guess', true); tx(d(mo, 3), 'unsorted', 2750, 'Blue Door Studio', A.card, 'guess', true); tx(d(mo, 14), 'people', 12000, 'Zelle', A.chk, 'guess', true); }
      }
      // the usual pay stub behind each $3,120 deposit (Paychecks tab)
      s.payStubs = { usual: { 'acme corp payroll': { name: 'Acme Corp Payroll', gross: 447000, lines: { fed: 45000, state: 17000, ss: 27900, medicare: 6500, k401: 27000, health: 9600, hsa: 2000 } } }, exact: {} };
      // the Amex balance was typed in once and statements keep it current; the Chase card is still estimated
      s.balances = { [A.chk]: [{ date: d(1, 28), value: 412700, how: 'file' }], [A.sav]: bal.sav, 'acc-brk': bal.brk, 'acc-401k': bal.k, [A.amex]: [{ date: d(1, 2), value: 38450, how: 'manual' }], 'acc-car': [{ date: d(1, 31), value: 1460000, how: 'manual' }, { date: d(Math.max(1, last - 1), 28), value: 1460000 - (last - 2) * 26500, how: 'manual' }] };
      s.categoryRules = { 'rent': 'housing' };
      // nothing here is budgeted, so no month is closed
      Object.values(s.months).forEach(x => { x.closed = false; });
    },
  },
};
