# Monthly Plan — and the re-skin plan

`Monthly Plan` is a single-file HTML monthly/annual budget planner sold as an Etsy
digital download (JPS Digital Pages). Everything needed to rebuild the listing is here.

## Layout

- `app/MonthlyBudgetPlanner.html` — the product, v1.8. One self-contained file:
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

## Architecture worth knowing before re-skinning

State lives in one object (see `blank()`): `settings`, `baseline`, `categories`,
`months`, `transactions`, `goals`, `reviews`, `schedules`, `snapshots`. Categories are
`{id, name, group, archived}`, and nearly every view derives from the `group` field —
so a different niche is mostly different category defaults, labels and a few new views,
not a different engine. `Budget` and `CSV` are separate modules with unit tests in
`build/test.js`.

## Planned re-skins

Same engine, niche-specific config: small-business / freelancer P&L (revenue, COGS,
gross margin, tax set-aside, Schedule C mapping) and rental property (Schedule E,
per-property P&L). The intended approach is one shared core with a niche pack at the
top of the file, rather than forked copies.
