# Personal Finance Dashboard

Single-file, offline personal finance manager sold as a digital download (Designs by Darowan).

## Deliverables (what goes in the buyer's ZIP)

| File | Purpose |
|---|---|
| `Personal_Finance_Dashboard.html` | The app. One file, no build, no CDN, no network calls. |
| `Quick_Start_Guide.pdf` | Two-page getting-started guide. |
| `User_Guide.pdf` | Every screen and calculation, backup/restore, troubleshooting, FAQ. |
| `OPEN-ME-FIRST.txt` | Opening instructions. |
| `LICENCE.txt` | Personal-use licence. |

## Listing material (not shipped to buyers)

| File | Purpose |
|---|---|
| `listing/etsy-listing.txt` | Title, 13 keywords, plain-text description. |
| `listing/finance-dashboard-etsy-mockups.html` | 14 screenshot-ready 1500×1125 slides, editable copy. Open in Chrome, DevTools → capture node screenshot per `<section class="slide">`. |
| `listing/assets/` | Product screenshots used by the deck and guides. |

## Development

The shipped HTML is built by concatenating the parts in `dev/` (dev-time only; buyers never run this):

```sh
./dev/build.sh                       # -> Personal_Finance_Dashboard.html
node dev/test-browser.mjs            # headless Chromium pass over file:// (46 engine self-tests + UI flows)
node dev/test-backup.mjs             # auto-backup path with a mocked File System Access handle
node dev/capture-shots.mjs           # refresh listing/assets screenshots (sample data)
python3 dev/build-deck.py && node dev/geometry-check.mjs   # rebuild + verify the mockup deck
python3 dev/guides/build-guides.py && node dev/guides/render-guides.mjs   # rebuild the PDFs
```

Engine self-tests also run in-app (Settings → Run self-tests) or by opening the file with `?selftest` and reading the console.

### Source layout

- `dev/engine.js` — date utilities, frequency engine (`expandRecurring`, `occurrences`), debt simulation (`simulateDebt`), rollover, goal projection, CSV parsing, import validation/migration, self-tests. Pure functions, no DOM.
- `dev/app_core.js` — state, localStorage wrapper with quota detection, IndexedDB key/value, `backupFile` module (link, debounced write, verification every 20th write, last-known-good copy, staleness check), formatting, toasts, modals, generic form builder, SVG charts.
- `dev/app_views1.js` — Overview, Budget, Transactions (+ CSV import/export), Bills & Subscriptions (+ calendar).
- `dev/app_views2.js` — Income, Savings, Debt, Net Worth, Reports, Settings.
- `dev/app_story.js` — "Month in review": `storyStats(month)` gathers the month's numbers, `storySlides(st)` turns them into slides (ones with nothing to say are dropped), `openStory(month)` is the full-screen player.
- `dev/app_boot.js` — render loop, action/change dispatch, sample data generator, first-run wizard, boot.

### Decisions on the spec's open questions

- **Net worth snapshots**: automatic. One snapshot per calendar month, updated whenever net worth changes; a manual "Snapshot now" exists too.
- **Budget rollover**: shipped as a setting (`off` default, `surplus`, `full`). Chains stop at the first month with no budget or at the configured start month.
- **Multi-year data**: no cap. Reports pick any year that has data.

### Notes

- Six colour themes (`THEMES` in `dev/app_core.js`) drive CSS variables and the chart palette; `auto` follows the OS light/dark setting.
- Responsive: `.card` is a container-query context (`container-type:inline-size`), so cards restyle from their own width, not the viewport's — under 400px charts stack and centre, under 330px `.t-stack` tables fold to two lines. Bare tables live in `.table-wrap` so they scroll inside their card. The browser suite sweeps all ten views at 1024px and 390px asserting no page or card overflow.
- Sidebar collapses to a 68px icon rail (`body.rail`, the footer button or `[`); the state is persisted in the UI blob and mobile keeps the full off-canvas menu.
- Layout: every row of cards in a `.grid` shares a height (`align-items:stretch`, cards are flex columns); `.push-b` pins a card's footnote to the baseline and charts centre in the leftover space. `.grid.ragged` opts a row out. Corner radii come from `--r` / `--r-sm` / `--r-lg` only — round corners are reserved for genuinely circular things (dots, avatars, the step numerals).
- **Month in review** (`dev/app_story.js`): full-screen recap of the month in the top bar, opened from the Overview greeting or Reports (`data-action="monthStory"`). Arrow keys, swipe and edge taps move between slides. Slides are data-driven — a month with nothing recorded gets a short "nothing here yet" dialog instead.
- First-run flow: 4-step wizard (household, currency, theme, data) → 7-slide welcome tour → "Your first steps" checklist on the Overview. Quick add (`N`) is the single entry point for every record type; forms fold non-essential fields under "More options".

- Bill "paid" ticks create a linked expense transaction (and remove it when unticked), so budget, savings rate, reports and safe-to-spend stay consistent.
- Savings rate counts outflows in the "Savings" category as saved, not spent.
- Transactions do not adjust account balances; balances are user-maintained snapshots (documented in the guide).
- Cross-browser hardening: the one `:has()` rule has a `.sel` class fallback, and `<input type=month>` (unsupported in Firefox/Safari) gets a `YYYY-MM` pattern, a format hint shown only when the picker is missing, and validation before the value is stored.
- Browser pass in this environment covered Chromium only; Firefox/Safari fall back to manual JSON backup with a periodic reminder, as the spec requires, but were not exercised here.
