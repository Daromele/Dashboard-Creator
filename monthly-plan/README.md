# Monthly Plan — and the re-skin plan

`Monthly Plan` is a single-file HTML monthly/annual budget planner sold as an Etsy
digital download (JPS Digital Pages). Everything needed to rebuild the listing is here.

## Layout

- `app/MonthlyBudgetPlanner.html` — the product, v1.9. One self-contained file:
  inline CSS/JS, localStorage, optional folder backups via the File System Access API.
  Live copy: https://claude.ai/artifact/A1MLRsPrH9ytRtaX6rnfyM
- `listing-kit/` — buyer files (`START_HERE.txt`, `LICENCE.txt`, `Monthly_Plan_Guide.pdf`)
  plus the seller's mockup deck and `etsy-listing.md` (title, 13 tags, description).
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
