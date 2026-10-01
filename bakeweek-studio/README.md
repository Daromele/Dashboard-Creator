# Bakeweek Studio

A single-file, offline planner for microbakeries and home bakeries, sold as a digital download by JPS
Digital Pages. It covers the ways these bakers actually sell:
- custom orders;
- standing orders (bread-club subscriptions, café and deli wholesale, regulars);
- market days baked for stock.

All of it becomes one day-by-day bake plan, a combined shopping list, scaled batch sheets and packing
tickets. "Try an order" shows the extra hours, shopping and a minimum quote before the baker says
yes. Market days track sell-through and leftovers and suggest how much to bring next time.
Calculators cover rescaling, baker's percentages, levain, water temperature, pans, conversions and
pricing.

Version 2.0 moved the first version (made in Codex) onto the JPS Digital Pages house style
(`.claude/skills/sellable-html-app`, the Shop Insights look). Version 2.1 adds standing orders,
market days and calculators. Its sample bakery is now a microbakery.

## What's where

| Path | What |
|---|---|
| `Bakeweek_Studio.html` | **The product.** Built; never edit it by hand |
| `src/shell.html` | Page shell: head, favicon, sidebar, top bar, banners, dialogs |
| `src/house.css` | House style from the skill: tokens, 10 themes, components, chart kit, print |
| `src/bakeweek.css` | Bakery pieces: day strip, batch cards, order cards, recipe cards, Try an order, printouts |
| `src/bakecore.js` | `BakeCore`: every rule and calculation from the first version, pure and Node-testable |
| `src/ui-base.js` | House shell behavior: storage, commit and undo, backups, sample mode, chart kit, dialogs, tour |
| `src/ui-views.js` | Screens, dialogs, kitchen paperwork, events, and the sample bakery's history |
| `src/ui-sales.js` | Standing orders and market days: screens, forms, Record what sold, drop syncing |
| `src/ui-tools.js` | Calculators. Scratch math only; it never changes data |
| `build.js` | Inlines fonts, CSS, BakeCore and UI into `Bakeweek_Studio.html` |
| `test.js`, `smoke.js` | Unit tests on the built file; browser flows |
| `original/Bakeweek_Studio_Codex.html` | The first version, kept for reference |
| `listing-kit/` | Listing photos, mockup deck and copy |

## Build and test

```
node build.js                 # build (node build.js --check: fails if out of date)
node test.js                  # BakeCore and sample-data tests, read from the built file
node smoke.js                 # every flow in Chromium: migration, forms, batches, statuses, backups, print…
node ../.claude/skills/sellable-html-app/scripts/check_app.js Bakeweek_Studio.html   # house QA (desktop, phone, dark, print, motion)
```

## Screens

- **This week** is a hub with four tabs:
  - **Week plan**: the hands-on hours hero, day-by-day strip, the day's kitchen plan, and hands-on
    time by day against the hours set;
  - **Shopping**: the combined list and spend by supplier;
  - **Batch sheets**: scaled runs to make and already made;
  - **Pack & collect**: one card per pickup.
- **Orders**: custom orders and standing drops, with a status filter, a filter by kind, search,
  paging and sorting. Market days are kept on their own screen.
- **Standing orders**: the repeat schedule for each customer, steady weekly sales, and the next four
  weeks of drops, each of which can be skipped or restored.
- **Market days**: market takings, sell-through, leftovers and the cost of waste. Upcoming market
  days have the actions Mark packed and Record what sold. There's a sold vs left-over chart, a
  donut of where leftovers went, a by-product table with "Bring next time", and every closed market
  day.
- **Year at a glance**:
  - sales by month by product (market days count what actually sold);
  - sales by channel (one-off, standing, market);
  - best sellers and a month-by-month table.
- **Recipes**: one grid (or a table) of every recipe, with search, a category filter, sorting and
  an optional picture per recipe. Each card shows its category as a colored chip. Categories, their
  order and their colors are managed in Settings (`ui.categories`, `ui.categoryColors`); a
  category without a chosen color takes the next palette color by position.
- **Pantry**: ingredients, pack prices, stock and its value.
- **Calculators**:
  - scale a recipe (by pieces, batches or a multiplier, and printable);
  - dough by baker's %, including true hydration with the levain;
  - levain build;
  - dough temperature (°F/°C);
  - pan sizes, which feed into scaling;
  - cup/ounce/gram and oven conversions;
  - price check, with the lowest retail price and what a wholesale piece keeps.
- Standing orders, market days, year and calculators can each be hidden in Settings.
- **Settings & backup** and **How to use**.
- **Dialogs**:
  - Try an order (press **N**);
  - order, recipe and ingredient forms;
  - payment and receive stock;
  - CSV import;
  - in-app confirmations. Everything is undoable from the toast.
- **Printouts**: the kitchen packet (shopping list, batch sheets and packing tickets), each of those
  on its own, and a customer quote. The quote never shows costs or kitchen notes.

## Data

- **Standing orders** live in BakeCore's `standing` list (`code`, `customer`, `type`, `lines`,
  `days` with Monday = 0, `every` 1–4 weeks counted from the start week, `start`/`end`, `bakeLead`
  and `finishLead` in days before the drop, `prepaid`, `paused`, `skips`).
  - Drops are ordinary orders with a `standingId`. `syncStanding(from, to)` adds them from today to
    four weeks ahead; the UI runs it on every render, and it is not an undo step.
  - A canceled drop is a skipped week. A deleted drop is added to `skips`.
  - Saving or pausing a standing order rebuilds its drops that are still untouched: confirmed, no
    batches made, and no payment of their own.
- **Market days** are orders with `kind: 'market'`.
  - `market: {stallFee, closed, results}`; each result is `{recipeId, sold, fate, reducedTakings}`,
    where `fate` is wasted, donated, kept or discounted.
  - Status reads Planned → Packed → Closed. Closing needs every batch made.
  - Market days stay out of balances due and customer counts.
  - `marketResult` gives takings, sell-through, leftovers by fate, waste at cost, and what was kept
    after ingredients, packaging and the stall fee.
  - `marketSuggestion` uses the last four closed market days with the same name: the average sold,
    or 15% over what was brought when the product sold out at least half the time.
- **Storage.** Data is saved in IndexedDB (`jps-bakeweek-data`) under the key `jps-bakeweek-v1`.
  That is the key the first version used in localStorage, so a buyer's existing data moves across on
  first open. The saved record is BakeCore's state plus `ui` (palette and hidden views).
- **Backups.** Backups are the same record: `bakeweek-studio-YYYY-MM-DD.json`. First-version backups
  (no `ui`) restore too. Folder backups write `bakeweek-studio-backup-YYYY-MM-DD.json`.
- **Changes.** Every change runs a BakeCore function on a copy, then `validateBackup` checks the whole
  state before it's saved (`apply()` in `ui-base.js`).
- **Other tabs.** A save in another tab stops this one saving (BroadcastChannel), so it can't
  overwrite that work.
- **Money** is in currency units, as BakeCore always used; everything is rounded to cents on screen.
- **Sample mode (Sunday Crumb Microbakery).** It has:
  - sourdough, rye, focaccia, buns, cookies, brownies and custom cupcakes;
  - four bread-club members (one paused), a café on Tuesday and Friday, and a deli every other
    Thursday;
  - a Saturday farmers market whose amounts follow its own suggestions;
  - about 38 weeks of history, made through `planWeek` and `quoteOrder`, so it validates like real
    data.

  It's never saved; `?demo=1` opens it. BakeCore's `createDemo` (the first version's demo week) is
  still used by the unit tests.
