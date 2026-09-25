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

## One core, three editions

The planner is built, not hand-edited. Edit the source, then rebuild:

- `app/src/core.html` — the shared engine and UI. Never shipped as-is.
- `app/packs/budget.js` → `app/MonthlyBudgetPlanner.html` (Monthly Plan v1.9, household budget)
- `app/packs/business.js` → `app/ProfitPlanBusiness.html` (Profit Plan v1.0, freelancer / small business)
- `app/packs/etsy.js` + `app/src/etsy.js` → `app/ShopInsightsEtsy.html` (Shop Insights v1.0, Etsy sellers with one or several shops)

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

## The Etsy edition (Shop Insights)

A pack can ask for extra screens with `build.modules`: each `app/src/<name>.js` is inlined just before
the app starts and fills the core's `Ext` hooks (extra views, the top-bar shop picker, the shop name on
printouts, the shop tag on new transactions). Budget and Profit Plan list no modules, so their built files
do not change.

- **Shops.** `state.shops` lists them; `settings.shop` is the one on screen (`''` = all shops). Every
  transaction may carry `shop`, and `Budget.transactions` reads only the chosen shop, so the P&L, tax,
  cash flow and every total follow the picker. Costs logged with All shops picked have no shop: they are
  shared and count in the combined view only.
- **Etsy data.** `state.etsy` holds `orders`, `items`, `listings`, `reviews` and an `imports` log, each
  tagged with its shop. `Budget.validate` checks all of it.
- **Importers** (`EtsyData` in `app/src/etsy.js`, pure and tested) recognise the payment account statement,
  sold order items, listings and reviews.json by their columns. Statement lines become transactions with an
  order or listing reference (`ref`) and a duplicate key (`src`). The sale keeps the buyer's full payment; the
  sales tax / VAT Etsy takes back is a minus line under revenue, so revenue is net of it and it is never income
  or a cost. Credits reduce the fee they belong to; deposits are transfers. Orders, items and reviews are keyed
  by Etsy's IDs, and a file whose orders belong to another shop is refused. A listings file replaces that
  shop's listings. Buyer names and addresses are never stored: only country and a hashed buyer key.
- **Months without a statement** are estimated from sold orders (`syncEstimates`, lines marked `est`) at the
  seller's fee rates; importing that month's statement replaces them.
- **Fee rates** (`settings.fees`, with country presets in the pack's `etsy.presets`) drive the estimates, the
  pricing calculator (`pricing`, `priceFor`) and profit per product (`productProfit`, which shares a period's
  fees and ads out by sales and subtracts the seller's cost per item from `state.etsy.costs`).
- **Goals.** `settings.goals` holds a monthly revenue goal per shop (`''` = all shops together).
- **Test data.** `build/etsy_fixtures.js` writes synthetic files in Etsy's layouts. Never commit a seller's
  real exports: the sold order items file holds buyers' names and addresses.

## Build and test

```
node build/build_app.js          # rebuild every edition from core + packs
node build/test.js               # module tests: budget vs frozen v1.8, business and Etsy maths, build is current
node build/ui_parity.js          # budget edition renders exactly like v1.8 (needs git history)
node build/biz_smoke.js [shots]  # drives every business screen and flow in Chromium
node build/etsy_smoke.js [shots] # drives the Etsy edition: shops, imports, goals, costs, pricing, fee rates, sample
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
