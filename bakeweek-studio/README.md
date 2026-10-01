# Bakeweek Studio

A single-file, offline home bakery planner sold as a digital download by JPS Digital Pages. Customer
orders become a day-by-day bake plan, one combined shopping list, scaled batch sheets and packing
tickets, and "Try an order" shows the extra hours, shopping and a minimum quote before the baker
says yes.

Version 2.0 is the first version (made in Codex) moved onto the JPS Digital Pages house style
(`.claude/skills/sellable-html-app`, the Shop Insights look). Every rule and calculation is unchanged.

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
- **Orders**: the order book, with status filter, search, paging and sorting.
- **Year at a glance**: sales by month by product, month-by-month table, best sellers. It can be
  switched off in Settings.
- **Recipes**: one grid (or a table) of every recipe, with search, a category filter, sorting and
  an optional picture per recipe. Each card shows its category as a colored chip. Categories, their
  order and their colors are managed in Settings (`ui.categories`, `ui.categoryColors`); a
  category without a chosen color takes the next palette color by position.
- **Pantry**: ingredients, pack prices, stock and its value.
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
- **Sample mode (Sunday Crumb).** It is BakeCore's demo week plus about 40 weeks of collected,
  paid orders. Those are built through `planWeek` and `quoteOrder`, so they validate like real data.
  It's never saved; `?demo=1` opens it.
