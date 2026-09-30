# Testing: prove it before you ship it

Shop Insights ships with ~424 module checks plus browser smoke tests, a print audit, a UI parity
check, and tests for the trial and the hosted demo. Every layer below caught real bugs.

## Layers (run from `monthly-plan/`)

```
node build/build_app.js                         # rebuild every edition
node build/test.js                              # module tests + "build is current" (build_app --check)
node build/ui_parity.js                         # older editions render exactly as before (markup diff, frozen clock)
node build/etsy_smoke.js [shots]                # drives every screen and flow in Chromium
node build/biz_smoke.js [shots]
PDFJS_DIR=/tmp/pdfjs node build/print_audit.js  # every screen, Letter + A4, fails on near-empty pages
python3 build/make_trial.py && node build/trial_test.js
node build/make_snapshot.js && node build/snapshot_test.js
```

For a standalone app: its own `test.js` for the pure logic, and
`node .claude/skills/sellable-html-app/scripts/check_app.js <app.html>` for the browser QA
(core-built apps take `--sample '[data-action="demo"]'`; Shop Insights passes it at 1440 px and 390 px),
plus `scripts/starter_flow.js` for the add / reload / undo / backup / restore flow.

1. **Module tests** (Node, no browser): import the pure module from the *built* file (so the test
   covers what ships), feed synthetic fixtures, assert exact cents. Cover: every file kind, every
   money/date format, dedupe on re-import, refused files, move/delete/undo of imports, estimates,
   and each derived rule.
2. **Build current**: the built file equals a fresh build; otherwise fail with "Run: node build/build_app.js".
3. **UI parity** when changing a shared core: render every screen and dialog of the previous
   committed build and the new one with a frozen clock and compare markup (ignore only named,
   intended differences such as a version label or animated gradient ids).
4. **Smoke** (Playwright, headless Chromium): start empty, add entities, import fixture files through
   the real file input, visit every screen and hub tab, change period presets, use the entity picker,
   edit/move/delete an import, undo, sample mode on/off, backup download and restore, reload and check
   the data is still there, and collect `pageerror` + console errors (must be none).
5. **Print audit**: `page.pdf()` of every screen, Letter and A4; count text per page with pdf.js;
   fail on an empty first page or a near-empty middle page (install `pdfjs-dist@4` to `/tmp/pdfjs`).
6. **Layout QA** (`scripts/check_app.js`): no horizontal overflow at 390 px, every nav item renders,
   dark theme renders, print media renders, reduced motion honored.
7. **Look at it.** Screenshot every changed screen at 1440×900 (light + a dark theme) and at 390 px,
   and actually view the images. Alignment, dead space and ugly wrapping are only caught by eye.
8. **Reconcile with real files** (never committed): run the importer on the user's real exports in a
   scratch script and compare totals with the platform's own screen.

## Playwright rules learned the hard way

- **Never touch `localStorage` from `addInitScript` on a page you later reload.** On `file://`,
  headless Chromium then intermittently drops the whole store (6 of 40 runs on a bare page), which
  looks exactly like the app losing data. Seed with a normal `page.evaluate` after the first load,
  then reload. (The app kept its data 180 of 180 times without the init script.)
- Freeze time: `page.clock.setFixedTime(...)` so "this month", dates and sample data are stable.
- Use `reducedMotion:'reduce'` for screenshots so count-up numbers are final and nothing is mid-animation.
- `deviceScaleFactor:2` for listing captures; clamp clip origins to ≥ 0 after scrolling.
- Hide toasts and close dialogs before a screenshot; blur focus (focus rings and "skip to" links show up).
- Wait for real conditions (`waitForFunction` on text like "Ready to import"), not fixed sleeps,
  for imports.
- Playwright resolves from `/opt/node22/lib/node_modules`; Chromium is pre-installed. Don't run
  `playwright install`.

## Before every push

- Run the fast checks; for a bug fix, reproduce it first in a test, then show it passing.
- Re-read the diff: stray debug, leftover sample data, real customer data, British spelling.
- Commit message: what changed, by screen, and what it was checked against.
