# Architecture: how a house-style app is put together

The small UI features (sidebar collapse, nav groups, banners, dialogs, settings page, backups,
tour, shortcuts, storage keys) are itemized with code pointers in `feature-catalog.md`.

## 1. One file, built from sources

The buyer gets **one `.html` file**. Developers never hand-edit it; they edit sources and rebuild.

### Core + niche packs (money/books apps)

```
monthly-plan/app/src/core.html     shared engine + UI, never shipped as-is
monthly-plan/app/packs/<id>.js     one product: `const NICHE = {...}`
monthly-plan/app/src/<module>.js   extra screens a pack asks for (pack.build.modules)
monthly-plan/build/build_app.js    inlines pack + modules → app/<file>.html
```

`build_app.js` replaces two markers and fails loudly if either is missing:
`<!--@@NICHE_PACK@@-->` (the pack as the first `<script>`), and `/*@@NICHE_MODULES@@*/` (modules,
just before the app starts). Static shell text uses `{{product.name}}` / `{{raw:key}}` from the pack
at build time, so nothing flashes on load. `node build/build_app.js --check` exits 1 when a built file
is stale; `test.js` runs it, so a forgotten rebuild fails the tests.

A pack (`app/packs/etsy.js` is the full example) holds:
- `product`: name, one-letter `mark`, `publisher: 'JPS DIGITAL PAGES'`, version, tagline, site,
  `<title>`, `themeColor` (= the default theme's `--bold`), description, favicon SVG, license notice,
  `railNote` (the two-line promise in the sidebar foot), `printTitle`.
- `build`: output file name, modules, `sampleImages:false` to drop unused sample photos (968→630 KB).
- `storage`: `key` (e.g. `jps-shop-insights`; every product and edition has its own), `file` (backup
  file stem), `idb:true` for big data.
- `themes` (default first), `features` (switch screens on), `settings` defaults (incl. `hiddenNav`).
- `groups` with flags (`type` income|expense|saving|transfer, `cogs`, `other`, `tax`, `fixed`,
  `debt`, `subscription`, `taxLine`, `icon`) and `categories` `[id, name, group, taxLine]`. Flags,
  not code, drive the P&L, tax and dashboards. `transfer` is never counted.
- `labels` (what screens call income, costs, ads), `nav` (with hubs), `welcome` slides, `guide`
  cards, Quick Log words, import hints, and the fictional `sample` data.

Extension points (`Ext` in core): `views`, `afterRender`, `printScope`, `txTag`, `annualTop`,
`plNote`, `importRefine`, `importTag`, `activityFilter`, `txBadge`, `bizName`, `settingsCard`.
A module fills them in; editions that list no modules build byte-for-byte unchanged (proved by
`ui_parity.js`: every screen and dialog of the old and new file, frozen clock, markup compared).

### Standalone apps (everything else)

`scripts/new_app.js` copies `assets/starter.html`, inlines `assets/fonts.css`, and sets the name,
mark, storage key and default theme. Keep the same shape inside: a `CONFIG` block at the top (like a
pack), pure logic in its own object with no DOM, then the UI. If the app grows past ~3,000 lines or a
second edition appears, split it into `src/` + a build script the same way as the core.

## 2. State, commit, undo

- **One state object**, JSON-serialisable, created by `blank()` and checked by `validate()` on
  every load and restore (unknown or broken data throws; the app says so and does not overwrite
  the saved copy). Add a `version` and migrate forward in `validate()`.
- **Money in integer cents**, rates in basis points (2500 = 25%). Format only at the edge.
- `commit(fn, message)`: snapshot for undo → mutate → invalidate caches → save → render → toast
  with **Undo**. Every user change goes through it. Deletes ask first *and* can be undone.
- `render()` rebuilds the current screen from state (string templates, `esc()` everything the user
  typed). After each render: tint KPIs, make tables sortable, restore focus, re-attach the picker
  (`afterRender`).
- `go(screen)` changes screen, remembers it, scrolls to top. The current period (`selected` =
  `YYYY-MM`) and entity (`settings.shop`, `''` = all) are global and every screen follows them.
- Keep the user where they were: after an import, stay on the entity they imported into (a bug
  once jumped to the first shop).

## 3. Storage: never lose the buyer's data

- `file://` pages share one **~5 MB localStorage** per browser. Small apps (budget planners) fit.
  Apps that import exports **must use IndexedDB** (`storage.idb`): one DB `<key>-data`, store `kv`,
  the whole state as one JSON string. On first open, move any localStorage copy across, then remove
  it. If IndexedDB is unavailable, fall back to localStorage. Writes are serialized (one in flight,
  one queued).
  - Real bug: the second shop's statement "disappeared after refresh" because localStorage was
    full; the app said "Browser storage is unavailable or full". IndexedDB fixed it.
- Caps are explicit and generous (100,000 transactions with IndexedDB, 20,000 without), with a clear
  message when reached.
- A storage failure shows a red banner: changes are only in this session, **Download backup**.
  The status line in the topbar and the rail says "Saved on this device" / "Backup needed" /
  "Sample mode".

## 4. Backups and restore

- **Download backup**: a JSON file named `<storage.file>-YYYY-MM-DD.json` (`-sample-` in sample mode), tagged with the
  product/edition id. Restore accepts only its own product's backups (or a trial's backup into the
  full app), validates, previews what it will replace, and can be undone.
- **Folder backup** (File System Access API `showDirectoryPicker`, Chrome/Edge): after connecting a
  folder once, every save writes a copy there. Browsers without it just hide the option.
- **Backup reminder**: a slim banner when there's data and no recent backup; one of the welcome
  slides is about backups.
- **Start fresh** in Settings: keep categories and settings, or erase everything; confirms, offers
  a backup first, can be undone.

## 5. First run: welcome, sample, guide

- **Welcome slides** (modal carousel, from the pack): what it is, how data gets in, the key number,
  a feature, the **backup slide**, and "start here". Shown once (a localStorage flag); re-openable.
- **Sample mode**: "Try the sample" loads rich fictional data into a separate in-memory state;
  a banner says it's the sample; nothing is saved; "Leave sample" restores the user's own state.
  Sample names are clearly fictional and unique; sample data covers every screen (at least a full
  year plus some of the previous one, several entities, a few rough edges like an unsold listing).
- **Guide screen** ("How to use"): 3-4 numbered move cards with a button each, then "where to find
  each file" as a table (file · where to download · what it fills in), then FAQs. Keep it current
  with every new screen (the Shop Insights guide fell behind: Insights, YoY, New listings, logos).

## 6. Settings & backup (same page in every app)

Two equal cards side by side: **Your preferences** (name, currency, symbol, palette chips) and
**Keep your progress safe** (folder backup, manual backup, CSV, start fresh). Below them, the
product's own cards, then **Simplify your sidebar** (switches; Shop Insights hides Insights, Year
over year, Fees & ads and Transactions by default), then entities and **Getting started** (sample
mode, replay the tour, publisher line). Exact layout, copy and internals: `feature-catalog.md` §I.

## 7. Periods and entities

- Every period screen: **Month · Quarter · Year · All time · Custom** (from/to). Insights work by
  month or year to date too.
- An **entity picker** in the topbar (shops, properties, clients, kids...): "All" plus each one plus
  "＋ Add…". Every total, chart, printout and new record follows it. Records typed while "All" is
  picked are shared and only count in the combined view. Hide the entity pill when there's only one.
- Entities have a stable color (list position) and optional logo/photo; the photo area takes the
  logo's dominant color until a photo is added.

## 8. Code style

- Vanilla JS, `'use strict'`, no frameworks, no build-time dependencies beyond Node for the build.
- Pure modules (`Budget`, `CSV`, `EtsyData`) are testable in Node via `module.exports` guards.
- Comments explain *why* in plain sentences; each section starts with a `// ---------- name ----------`
  banner.
- Event delegation: buttons carry `data-action` (+ data attributes); one click handler switches on it.
- Every string from the user or a file goes through `esc()` before it touches HTML.
- `id`s on important cards (`#etsy-statement`) so tests and listing captures can target them.
