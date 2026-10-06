# Monthly Plan — and the re-skin plan

`Monthly Plan` is a single-file HTML monthly/annual budget planner sold as an Etsy
digital download (JPS Digital Pages). Everything needed to rebuild the listing is here.

## Layout

- `app/MonthlyBudgetPlanner.html` — the product, v2.4. One self-contained file:
  inline CSS/JS, localStorage, optional folder backups via the File System Access API.
  Live copy: https://claude.ai/artifact/A1MLRsPrH9ytRtaX6rnfyM
- `listing/monthly-plan/` — the Etsy kit: mockup deck with the listing copy inside, PNGs, Etsy and
  social videos, guide (HTML + PDF, from `build/build_guides.py budget`), `START_HERE.txt`, `LICENCE.txt`
  and the buyer ZIP (git-ignored). Every other edition has its own folder under `listing/`.
- `build/` — the scripts that produced the kit: `shots18b.js` / `themes18.js` capture
  screenshots with Playwright, `build_deck2.py` assembles the mockup deck,
  `build_pdfguide.py` + `render_pdf.js` make the guide PDF, and `validate_deck.py`,
  `geom_deck.js`, `swaptest.js`, `test.js` check the results.
  `build/shots/` holds the captured JPEGs and the base64 font CSS.
- `../.claude/skills/html-app-mockup-deck/` — the mockup-deck build, generalized into a
  reusable skill (config-driven; `assets/example-deck.json` is this product's deck).

## One core, several editions

The planner is built, not hand-edited. Edit the source, then rebuild:

- `app/src/core.html` — the shared engine and UI. Never shipped as-is.
- `app/packs/budget.js` → `app/MonthlyBudgetPlanner.html` (Monthly Plan v1.9, household budget)
- `app/packs/business.js` → `app/SmallBusinessProfitPlan.html` (Profit Plan v1.0, freelancer / small business)
- `app/packs/creator.js` → `app/CreatorPlan.html` (Creator Plan, online creators)
- `app/packs/autonomo.js` → `app/AutonomoPlan.html` (Autónomo Plan, records for a Spanish autónomo and their gestor)
- `app/packs/tracker.js` → `app/IncomeExpenseTracker.html` (Income and Expense Tracker v1.0, private, from your statements)
- `app/packs/debt.js` → `app/DebtFreePlan.html` (Debt Free Plan v1.0, debt payoff tracker)
- `app/packs/bills.js` → `app/BillSubscriptionTracker.html` (Bill & Subscription Tracker v1.0)
- `app/packs/networth.js` → `app/NetWorthFireTracker.html` (Net Worth & FIRE Tracker v1.0)
- `app/packs/paycheck.js` → `app/PaycheckBudgetPlanner.html` (Paycheck Budget Planner v1.0)

**Income and Expense Tracker** (`features.autopilot`, `features.offline`) turns card and bank CSVs into the
whole picture with no typing. `Autopilot` in core is the pure engine: `read` (columns, which way
money runs, card or bank, the account's name from the file), `merchant` (clean names, long numbers
masked), `classify` (card payments and own transfers, your rules, the pack's `merchantDict`, the
statement's own category, then a guess flagged for a look), `pairs` (the same money leaving one of
your accounts and reaching another) and `recurring` (subscriptions and bills). `Auto` holds its
screens: Add statements (drop files, added at once with Undo, import log, accounts), Needs a look
(one choice per place becomes a rule), Subscriptions & bills, and the Money picture dashboard.
`offline` stops every network call. State adds `accounts`, `importFiles` (file → account and sign)
and `importLog`; transactions carry `acct`, a masked `raw` description and `auto` (why, look, pair, batch).

**Bill & Subscription Tracker** (`features.billsTracker`) lists every bill and subscription and when it's due.
`BillCal` in core is the pure engine (tested in `build/test_bills.js`): `occurrences` (weekly to yearly,
month-end dates kept, free trials anchoring the first charge, end/pause/cancel dates), `amountOn` (price
history and trial price), `perMonth`/`perYear`, `month` (paid, autopay, overdue, soon, skipped, totals),
`yearSpread`, `upcomingEvents` (renewals, trials, cancel-by reminders), `priceChanges`, `savedSince`,
`setPrice`. `BillsUI` holds the screens: This month (hero, checklist, coming up, year chart, set-aside
fund), Bills & subscriptions (grid/table, chips), Calendar, Renewals & trials, Yearly cost, Payment
history, plus bill categories in Settings. State adds `btBills`, `btLog` (one entry per bill + due date,
`skip` for skipped) and `btCats`.

**Net Worth & FIRE Tracker** (`features.netWorth`) tracks everything owned and owed, one check-in a month,
and the road to financial independence. `NetWorth` in core is the pure engine (tested in
`build/test_networth.js`): `balanceAt` (a month without a check-in carries the last balance forward; closed
accounts count 0), `totals`, `series`, `pace`, `fireNumber`, `project`, `monthsTo`, `coast`, `reached` and
`guessType`. `NetWorthUI` holds the screens: Net worth (hero, ring, chart with toggles, what moved, road to
FI), Accounts (grid/table, chips, Update balance), Monthly check-in (live totals), FIRE plan (Lean/FIRE/Fat,
Coast FI, what moves the date, what-if slider, projection), Milestones and History, plus account types in
Settings. State adds `nwAccounts`, `nwSnaps` (one per month: `{month, date, values:{accountId: cents}}`),
`nwTypes` and `nwPlan` (`spend`, `rate` and `growth` in basis points, `monthly`, `age`, `retireAge`, `income`).
`Live` (shared with the bills edition) holds the number tweens, row slides and the labeled ring.

**Paycheck Budget Planner** (`features.paycheck` with `features.billsTracker`) budgets by payday. `Pay` in
core is the pure engine (tested in `build/test_paycheck.js`): `paydays` (weekly, every 2 weeks, twice a month
on two days, monthly; weekend paydays move to the Friday before or Monday after), `periods` (payday to the day
before the next, from any income), `envAmount` (each paycheck follows the main income; each month is split
by the days a paycheck covers) and `plan` (bills in the paycheck before they're due, moved bills, confirmed
amounts, spent, left, carry). `PaycheckUI` holds This paycheck, Paycheck plan, Spending & saving, Paydays and
Past paychecks; bills, the calendar (paydays added through `BillsUI.setDayExtra`) and payment history are the
bills edition's screens. State adds `ppIncome`, `ppEnv`, `ppSpend`, `ppGot` (`incomeId|date` → cents),
`ppMoves` (`billId|due` → paycheck start) and `ppCarry`.

**Rental Property Tracker** (`features.rental`, pack `packs/rental.js`, built as `RentalPropertyTracker.html`, storage
key `jps-rental-tracker`). `Rental` in core is the pure engine (tested in `build/test_rental.js`): properties with units and
a loan (interest to Schedule E line 12, principal kept out), leases (rent, due day, grace, late fee, deposit, end,
move-out), payments by rent month and date, expenses that repeat monthly or yearly, the rent roll (paid, part, due,
late, upcoming, vacant), months (cash basis, the month under way stops at today), Schedule E per property, and the
landlord numbers (NOI, cap rate, cash-on-cash, 1% rule, occupancy, deposits) from whole months only, and `pnl` for any
dates and one property, all, or `'__general'` (expenses with no property). `RentalUI` draws Portfolio, Rent roll,
Properties (grid, compact, table; optional photo), Tenants & leases, Expenses (any dates, by property, General),
Calendar, Repairs (tenant requests; done + cost becomes a Repairs expense), Profit & loss, Schedule E, Rent ledger,
Import bank CSV (via `Autopilot.read`) and Letters & notices (11 fill-in templates, `[[key]]` blanks). State:
`rpProps` (+`photo`), `rpLeases`, `rpPays`, `rpExps` (`prop:''` = General), `rpJobs`, `rpTemplates`, `rpImported`,
`settings.rpLandlord`. Flow test: `node build/rental_flow.js`.

**Reseller Profit Tracker** (`features.resale`, pack `packs/reseller.js`, built as `ResellerProfitTracker.html`, storage
key `jps-reseller-tracker`). `Resale` in core is the pure engine (tested in `build/test_resale.js`): items (qty identical
units, own cost or a share of a lot, split evenly or by list price to the cent), sales (price, shipping charged, platform
fee, label, other) with returns (refund, back to stock or not, fees refunded), write-offs (donated, lost) and personal use
(kept), per-item and per-sale true profit, ROI and days to sell, stock and aging, platforms side by side, `pnl` for any
dates and one platform, running costs that repeat plus mileage at `settings.rsRate` (thousandths of a dollar a mile), and
`scheduleC` with Part III cost of goods sold from inventory (begin + purchases − personal use − end, which ties to the
sales and write-offs). Platform fees (`PLATFORMS`, editable as `rsPlats`) only pre-fill new sales; each sale keeps its fee.
`ResellerUI` draws Home, Inventory (grid, compact, table; photo; status chips; search; pages of 24), Add inventory (a
haul in one row per Enter, lot mode), Sales, Platforms (comparison + fee table), Expenses, Mileage, Profit & loss,
Schedule C and Import bank CSV (withdrawals become expenses; deposits are payouts and skipped). State: `rsItems`,
`rsLots`, `rsSales`, `rsExps`, `rsTrips`, `rsPlats`, `rsImported`, `settings.rsRate`, `settings.rsPrefix`.
Flow test: `node build/reseller_flow.js`.

**Budget methods** (`features.split`, in the Monthly Plan and the Paycheck Budget Planner). `Split` in core is
the pure engine (tested in `build/test_split.js`): 50/30/20, 70/20/10, 80/20 and zero-based, each line tagged
need, want, save or debt (guessed from its group or name, changeable on the card), and `bestFit`. `SplitUI` draws
the card on the monthly plan and on This paycheck, and the Settings switch. The card: method pills, one "left to assign" banner, and one column per group (Needs / Wants / Savings & debt, or
the method's own) with a bar toward its share: green within, red over, savings amber until reached. In the paycheck
planner each spending and saving line's amount is an input: bars and banner follow as you type (`SplitUI.refresh`,
using `Pay.envAmount` for this paycheck's share), and the card saves when focus leaves it. The method is
`settings.splitMethod` ('' = off: the Monthly Plan's default; the paycheck pack starts on 50/30/20); changed
tags are in `state.splitTags` (`cat:id`, `bill:id`, `env:id`).

A niche pack is one `const NICHE = {...}` block, inlined as the first script at the top of the
shipped file. It holds product identity, category **groups and their flags**, default categories,
tax-line mapping, Quick Log words, labels, tour and guide copy, themes, storage keys, features
and the sample data. Group flags drive everything:

| flag | effect |
|---|---|
| `type` | `income`, `expense`, or `saving` (a transfer: neither income nor expense, never in profit) |
| `cogs` | cost of goods sold: sits between revenue and gross profit |
| `other` | non-operating income, below operating profit |
| `tax` | counts as money set aside for tax |
| `fixed` / `debt` / `subscription` | reserved on the dashboard / can be a payoff goal / insights total |
| `taxLine` | the tax-form line new categories in the group start on |

Features (`pl`, `tax`, `taxLines`, `mileage`, `invoices`, `wealth`, `goals`) switch screens on.
Each edition uses its own storage keys and tags its backups, so both can run in one browser and
a backup only restores into its own edition.

State lives in one object (see `blank()`): `settings`, `baseline`, `categories`, `months`,
`transactions`, `goals`, `reviews`, `schedules`, `snapshots`, plus `mileage` and `invoices` in
the business edition. `Budget` (pure calculations, incl. `pl`, `taxSetAside`, `taxSummary`,
`receivables`) and `CSV` are separate modules; `Biz` holds the business screens.

## Build and test

```
node build/build_app.js          # rebuild every edition from core + packs
node build/test.js               # module tests: budget vs frozen v1.8, business maths, build is current
node build/ui_parity.js          # budget edition renders exactly like v1.8 (needs git history)
node build/biz_smoke.js [shots]  # drives every business screen and flow in Chromium
node build/autopilot_flow.js     # Income and Expense Tracker: drop statements, pairs, needs a look, re-import, delete import
node build/bills_flow.js         # Bill & Subscription Tracker: add, tick off, varies, skip, price rise, trial, cancel, sample
node build/networth_flow.js      # Net Worth & FIRE Tracker: add (guessed type/side), check-in, update, FIRE plan, close, delete, sample
node build/paycheck_flow.js      # Paycheck Budget Planner: setup steps, paydays, bills per paycheck, spending, confirm, move, carry, sample
node build/rental_flow.js        # Rental: property, tenant, part and late rent, expenses, Schedule E, sample
node build/split_flow.js         # Budget methods: off in Monthly Plan until turned on, on in Paycheck; methods, zero-based, tags
node build/print_audit.js [pdfs]  # prints every screen (Letter + A4); fails on near-empty pages (needs pdfjs-dist)
```

Test harnesses must not touch `localStorage` from Playwright's `addInitScript` on a page they
later reload: on file:// pages that makes headless Chromium intermittently drop the whole store,
which looks like the planner losing data. It is not the app. The same flow without an init
script kept its data in 180 of 180 runs (v1.8, v1.9 and Profit Plan, normal and incognito-style
profiles). `biz_smoke.js` seeds its storage with an ordinary page script instead.

## Next re-skin

Rental property (Schedule E, per-property P&L): a new pack with property groups and Schedule E
lines. Per-property reporting would need a property tag on transactions in the core.

**Shared money engines for apps off the core.** `Docs` in core (tested in `build/test_docs.js`) is the pure invoice and
purchase-order engine: totals with discount, tax (basis points) and delivery in cents, statuses (draft, sent/ordered,
received, part paid, overdue, paid, void), per-kind numbering (INV-0001, PUR-0001), aging, and matching a bank line to
the document it pays. Bakeweek Studio is not built from the core; `node bakeweek/build.js` copies `CSV`, `Autopilot` and
`Docs` from `app/src/core.html` into `bakeweek/Bakeweek_Studio.html` between the SHARED-MONEY markers, so fixes here reach
it on its next build. Run it after changing any of those three, then `node bakeweek/flow_money.js`.

