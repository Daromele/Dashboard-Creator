---
name: sellable-html-app
description: "Build, extend or polish a single-file offline HTML web app sold as a digital download (Etsy and similar) in the JPS Digital Pages house style, the style of Shop Insights, Monthly Plan and Profit Plan: warm paper background, dark sidebar, a big dark hero number, tinted KPI tiles with icons and sparklines, donuts above their legend, flat bars, sortable paged tables, 8 color themes, local-only storage with backups, sample mode, welcome tour, print-ready screens. Use whenever the user asks to make, rebuild, re-skin, restyle, fix or 'polish' an HTML app, planner, tracker, dashboard, calculator or tool they sell or plan to sell, or wants a new app to match their other apps, even if they don't name the style. Also use when turning someone else's HTML app (e.g. one made in Codex) into the house style."
---

# Sellable single-file HTML app (JPS Digital Pages house style)

Every app the user sells must look and behave like one family. The reference product is
**Shop Insights** (`monthly-plan/app/ShopInsightsEtsy.html`, built from `monthly-plan/app/src/core.html`
+ `app/packs/etsy.js` + `app/src/etsy.js`). When in doubt, open it and copy what it does.

This skill holds what it took to get there: the design system, the architecture, the data rules,
the tests, the packaging, and the user's own feedback that shaped each rule. Read the reference files
before writing code. They are the spec.

| File | Read it when |
|---|---|
| `references/design-system.md` | Always, before any UI: tokens, themes, type, layout, every component, charts, icons, motion, print |
| `references/architecture.md` | Always: single file, state, commit/undo, storage (localStorage vs IndexedDB), backups, sample mode, welcome, settings, periods, core + niche packs |
| `references/data-import.md` | The app reads files (CSV/JSON exports): detection, money/dates, dedupe, privacy, import log, estimates, verifying to the cent |
| `references/testing.md` | Before calling anything done: test layers, Playwright rules, the checks that caught real bugs |
| `references/packaging.md` | Selling it: free trial, hosted demo, demo data, listing photos, video, listing packet, buyer files |
| `references/lessons.md` | The user's feedback, rule by rule. Read it once per app; it prevents repeat corrections |
| `assets/starter.html` | A new app that is **not** a books/finance app: a working shell in the house style |
| `assets/fonts.css` | DM Sans + Manrope as base64 woff2 (83 KB). The app never loads fonts from the web |
| `scripts/new_app.js` | Makes a new app from the starter: name, storage key, default theme, fonts inlined |
| `scripts/check_app.js` | Generic browser QA for any house-style app (errors, every screen, phone width, themes, print, motion) |
| `scripts/starter_flow.js` | Flow check for starter-made apps: welcome, add, reload keeps data, delete + undo, backup, start fresh, restore |

## Pick the base

1. **Money, books, sales, budgets, taxes, shops** → a new **niche pack** on the shared core
   (`monthly-plan/app/packs/<id>.js`, plus `app/src/<id>.js` for extra screens). You inherit
   transactions, P&L, tax, goals, import, backups, themes, print and every test harness. See
   `references/architecture.md` → "Core + niche packs".
2. **Anything else** (bakery planner, habit tracker, event planner, calculator) → start from
   `assets/starter.html` with `node scripts/new_app.js`. It already has the house tokens, themes,
   sidebar, hero, KPI tiles, chart kit, sortable tables, toast + undo, storage, backups, sample
   mode, welcome, settings and print CSS.
3. **Someone else's app** (e.g. Bakeweek Studio, made in Codex) → keep its logic and data model,
   and move its UI onto the starter's shell and components. Keep its product name and features.
   Never keep a second visual language beside the house one.

## Non-negotiables (every app)

- **One HTML file**, fully offline: inline CSS/JS, embedded fonts, inline SVG icons, no CDN, no
  analytics, no network calls. It must work from `file://` on Mac and PC in Chrome, Edge, Safari
  and Firefox.
- **The buyer's data never leaves their computer.** Say so in the welcome, the listing and the
  footer ("Saved on this device"). Never store what isn't needed. Personal data from imports
  (names, emails, addresses) is dropped at read time, with a hashed key where counting is needed.
- **Nothing is lost silently.** Every change goes through `commit()`, which saves and toasts, with
  **Undo**. Storage failure shows a banner with "Download backup". Backups are one click; a backup
  restores only into its own app.
- **Sample mode** ("Try the sample"): full fictional data, clearly labeled, separate from the
  buyer's data, never saved.
- **House look**: `references/design-system.md` is not optional. Paper background, dark rail, one
  bold hero per main screen, tinted KPI tiles, green = money in or good, red = money out or bad,
  accent = net. 8 themes, 6 light and 2 dark (`night`, `midnight`).
- **Every table sorts** by clicking a heading (totals stay pinned). Long tables page (≈15 rows)
  instead of growing the card.
- **Every chart is readable without hover**: value labels on bars, legend under the donut, flat
  (square) bars, no white gaps between stacked segments, axes that sit at the bottom.
- **American English**, plain words: "check", not "tick"; "color"; "favorite". Colored dots, not
  color names ("● needs fixing", not "red means…").
- **Accessible**: 44 px tap targets on touch, visible focus, `aria-label` on charts, all motion off
  under `prefers-reduced-motion` and in print.
- **Prints well**: every screen prints on Letter and A4 with no near-empty pages, no sidebar, the
  period at the top right.
- **Numbers are exact.** Money is integer cents. When the app mirrors a platform's screen (Etsy's
  statement), it must match it to the cent, and it's checked against a real file.

## Workflow

1. **Understand the buyer and the files.** Who buys it, what question each screen answers, and what
   real inputs look like. Ask for real sample files; never commit them (customer data). Write
   synthetic fixtures in the same format.
2. **Plan the screens as a short sidebar.** Group into hubs (one sidebar item, tabs at the top) once
   there are more than ~10 items. Rarely used screens start hidden (`settings.hiddenNav`) and are
   switched on in Settings → "Simplify your sidebar". Dashboard, Import and Settings can't be hidden.
3. **Build the pure logic first** (a module with no DOM, integer cents, unit tests), then the screens.
4. **Build each screen from the component kit**: page head (eyebrow, h1, subtitle, actions) → hero
   (main screens) → KPI row (4 per row) → cards in 2 or 3 columns with equal heights → tables. One
   idea per card. No duplicate cards across screens: if two screens show the same number, keep one.
5. **Wire the trust features**: welcome slides (with the backup slide), guide screen, sample mode,
   backup reminder banner, folder backup, restore, Start fresh, storage warning.
6. **Test** (`references/testing.md`): unit, build check, browser smoke of every screen and flow,
   print audit, `scripts/check_app.js`. Look at screenshots yourself; checks don't catch ugly.
7. **Do a top-to-bottom polish pass** touching every tab: spacing, dead space, alignment of icons
   with text, equal card heights, empty states, wording, phone width. The user expects this without
   asking ("keep making slight improvements independently when you notice them").
8. **Package** (`references/packaging.md`): demo data, trial and hosted demo, listing photos, video,
   listing packet, buyer START_HERE and LICENSE.
9. **Commit** with a message that lists what changed by screen, push, and send the built file.

## Definition of done

- Built file regenerated (`node build/build_app.js`, or the starter build), no console errors.
- All tests pass, including print audit and `scripts/check_app.js` at 1440 px and 390 px.
- Screenshots of every changed screen looked at, light and one dark theme.
- Sample mode shows every screen filled; an empty app shows helpful empty states, not zeros.
- Numbers reconciled against a real file, when the app mirrors a platform.
- README of the product updated (what's where, how to build, test, and what each flag does).
