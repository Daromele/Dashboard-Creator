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

## One core, two editions

The planner is built, not hand-edited. Edit the source, then rebuild:

- `app/src/core.html` — the shared engine and UI. Never shipped as-is.
- `app/packs/budget.js` → `app/MonthlyBudgetPlanner.html` (Monthly Plan v1.9, household budget)
- `app/packs/business.js` → `app/ProfitPlanBusiness.html` (Profit Plan v1.0, freelancer / small business)

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
node build/build_app.js          # rebuild both editions from core + packs
node build/test.js               # module tests: budget vs frozen v1.8, business maths, build is current
node build/ui_parity.js          # budget edition renders exactly like v1.8 (needs git history)
node build/biz_smoke.js [shots]  # drives every business screen and flow in Chromium
```

## Next re-skin

Rental property (Schedule E, per-property P&L): a new pack with property groups and Schedule E
lines. Per-property reporting would need a property tag on transactions in the core.
