# Personal Finance Dashboard — session handoff

Paste this file (or its path) into a new session to continue the work. Everything below is current as of the last push.

## 1. Where things are

| Item | Value |
|---|---|
| Repo | `Daromele/Dashboard-Creator` (GitHub) |
| Branch | `claude/finance-dashboard-handoff-5t3adc` (branched from `claude/finance-dashboard-build-jukwqs`) |
| Draft PR | https://github.com/Daromele/Dashboard-Creator/pull/3 (base: `main`) |
| Project folder | `finance-dashboard/` — everything for this product lives here. The repo root `index.html` is an unrelated older app; leave it alone. |
| Shop / owner | Designs by Darowan (Etsy, HTML web-app digital downloads). User email: darowan.rph@gmail.com |
| Original spec | "Ultimate Personal Finance Dashboard — Build Spec" (pasted in the first message of the previous session; the important points are restated below). |

## 2. What the product is

A single self-contained HTML file (`Personal_Finance_Dashboard.html`, ~267 KB) sold as a digital download. Opens from `file://`, no server, no account, no bank link, **zero network requests** (the file contains no URLs at all — keep it that way). Data lives in the browser's localStorage; optional auto-backup to a file via the File System Access API (Chrome/Edge).

Non-negotiables from the spec, all currently honoured:
- One HTML file, all CSS/JS inline, no CDN, no build step for the buyer.
- Works from `file://` in Chrome, Edge, Firefox, Safari (only Chromium has been tested in the sandbox — a real-browser pass on Edge/Firefox/Safari is still outstanding).
- Money maths tested against hand-worked examples (46 inline self-tests).
- Currency is display-only (symbol/format, never conversion) — say so in the UI.

## 3. Folder layout

```
finance-dashboard/
  Personal_Finance_Dashboard.html   <- shipped app (BUILT file; do not hand-edit)
  Quick_Start_Guide.pdf             <- 3 pages, buyer-facing
  User_Guide.pdf                    <- ~25 pages, buyer-facing
  OPEN-ME-FIRST.txt, LICENCE.txt    <- shipped alongside
  README.md                         <- dev overview (build/test commands)
  HANDOFF.md                        <- this file
  .gitignore                        <- ignores dev/shots and dev/guides/out
  listing/
    etsy-listing.txt                <- title, 13 keywords, plain-text description
    finance-dashboard-etsy-mockups.html  <- 13 editable 1500x1125 slides, screenshots embedded as base64
    assets/*.jpg                    <- product screenshots used by deck + guides
  dev/                              <- SOURCE. The app is concatenated from these:
    part1_head.html                 <- <head>, all CSS, static shell (sidebar, topbar)
    engine.js                       <- pure functions: dates, frequency engine, debt sim, rollover, goals, CSV, validation, runSelfTests()
    app_core.js                     <- storage, IndexedDB, state, automation, backup module, themes, icons, formatting, toast/modal/form builder, charts, count-up, confetti
    app_views1.js                   <- nav/icons, overview helpers (greeting, insights, first steps), Overview, Budget, Transactions (+CSV import), Bills & Subs
    app_views2.js                   <- Income, Savings, Debt, Net Worth, Reports, Settings
    app_boot.js                     <- render/goto/anchors, actions + changes dispatch tables, keyboard, sample data, wizard, tour, boot
    build.sh                        <- concatenates the above into the shipped HTML
    test-browser.mjs                <- Playwright over file://: wizard, every view, CRUD, CSV, budgets, themes, tour, quick add, automation, deep links, storage-blocked, export/restore; asserts no console errors and no network requests
    test-backup.mjs                 <- Playwright with a mocked file handle: link/verify, debounce, permission loss, corrupt write, staleness prompt
    capture-shots.mjs               <- regenerates listing/assets (sample data, USD, previous month, reduced motion)
    build-deck.py, geometry-check.mjs        <- mockup deck + overflow/crop-band check
    guides/build-guides.py, guide.css, render-guides.mjs  <- guide HTML -> PDF (Playwright)
    shot-extra.mjs, shot-polish.mjs, shot-story.mjs <- ad-hoc review screenshots
```

### Build & test (run from `finance-dashboard/`)
```
./dev/build.sh                       # rebuild the shipped HTML
node dev/test-browser.mjs            # main suite (expects "ALL CHECKS PASSED, no console errors, no network requests")
node dev/test-backup.mjs             # backup suite
node dev/capture-shots.mjs && python3 dev/build-deck.py && node dev/geometry-check.mjs   # listing assets + deck
python3 dev/guides/build-guides.py && node dev/guides/render-guides.mjs                  # PDFs
```
Playwright lives at `/opt/node22/lib/node_modules/playwright`; Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. `pypdfium2` + `pillow` were pip-installed to rasterise PDFs for review. Self-tests also run in-app via `?selftest` in the URL, Settings → Run self-tests, or `window.__pfd.runSelfTests()`.

Commit convention used: plain messages, Co-Authored-By trailer + Claude-Session link; push with `git push -u origin claude/finance-dashboard-build-jukwqs`. GitHub access is via the `mcp__github__*` tools (no `gh` CLI).

## 4. Architecture in one screen

- **State**: one object `state` (schema v1) persisted to localStorage key `pfd:v1:state` on every `commit(fn)`. `commit` runs `fn`, then `runAutomation()`, `maybeSnapshot()`, `persist()`, `render()`.
- **Collections**: accounts, income, bills, subs, txns (every txn has `splits[]`), budgets, debts, goals, snapshots, `billPaid{month:{id:true}}`, `skipped{}` (keys that automation must not re-create).
- **Owner field** `p1|p2|joint` on everything; single mode hides it and writes `p1`.
- **Frequency engine** (`occurrences`, `expandRecurring`, `nextDue`, `monthlyEquivalent`): enumerates real dates; weekly/fortnightly give 4/5 and 2/3 hits per month; dueDay 29/30/31 clamps to month end; custom every-N week/month/year. Subscriptions normalised via `subAsRecurring`.
- **Debt engine** `simulateDebt(debts, 'snowball'|'avalanche', extraPool, startMonth)`: interest = balance·APR/1200 rounded to cents, minimums + per-debt committed extra, pool to target, freed payments cascade, 600-month cap → `neverPaysOff`.
- **Savings rate** = (net + Savings-category outflows) ÷ income. Emergency-fund average excludes the Savings category.
- **Safe-to-spend** = spendable account balances − unpaid bills/subs left in month − goal contributions − safety buffer (labelled "estimate").
- **Net worth** = asset accounts − liability accounts − debts; snapshot auto-upserted once per month on change, plus "Snapshot now".
- **Budget rollover** setting: off | surplus | full (recursive chain back to startMonth).
- **Automation** (`runAutomation`, Settings → Automation): income posts itself on every pay day (`incomeRef`, default ON); bills auto-tick on due date (default OFF; "✓ Mark all due as paid" button instead); budget copies into a new month (default ON). Deleting an auto-posted item writes to `skipped` so it never returns. "Delete all transactions" also marks past pay days skipped.
- **Storage**: `storage` wrapper detects quota errors; `persist()` probes to distinguish *blocked* (sandboxed/preview origin — Chrome reports these as quota errors) from *full*, warns once, shows a sidebar pill, keeps working in memory. Note: all `file://` pages share one localStorage origin in Chrome.
- **Backup** (`backupFile`): handle in IndexedDB, permission re-query on load, 2 s debounced write, verify every 20th write (and on link), last-known-good copy in IndexedDB, staleness prompt if the file's `savedAt` is newer, schema validation/migration on import, manual-export reminder every 5 sessions on Firefox/Safari.
- **Layout system**: one uniform grid — `.grid` is `align-items:stretch` and its cards are flex columns, so every row is level; `.push-b` pins a footnote to the card's baseline, charts and donuts centre in leftover space, `.grid.ragged` opts out. Settings uses a real 2-column grid (the old CSS-columns masonry is gone). Radii are only `--r` 6px / `--r-sm` 5px / `--r-lg` 10px; circles are reserved for dots, avatars and step numerals; progress bars are 2px.
- **Themes**: `THEMES` in app_core (cream, charcoal, midnight, sage, blush, slate + `auto`). `applyTheme()` writes CSS variables, sets `PALETTE` and `C` (chart series colours: ink, accent, good, p1, p2, joint, rest) — never hardcode hex in views. Charcoal and Midnight are dark.
- **Tab icon**: `APP_ICONS` (coin, bars, leaf, home, heart, star, wallet, spark), SVG favicon + sidebar logo, coloured with theme accent; coin shows the currency symbol.
- **UI plumbing**: views are `views[name].render()` returning HTML; clicks dispatch via `data-action` → `actions{}`; inputs via `data-change` → `changes{}`. `goto(view, {anchor, cat, month})` scrolls to `[data-anchor=…]` and flashes it — every cross-link and insight carries an anchor. Forms come from `openForm({fields})`; fields marked `advanced` hide under "More options". Quick add = `+ Add` button / key `N`. `renderFresh()` adds `.fresh` for entrance animations + KPI count-up.
- **First run**: 4-step wizard (household, currency/start month, theme + icon, sample/empty) → 7-slide welcome tour (`openTour`, `?` button) → "Your first steps" checklist card on Overview (6 items, self-ticking, dismissable).
- **Overview extras**: greeting, up to 4 computed insights (pay day countdown, budget pace, biggest category swing between the last two *complete* months, bills due in 7 days, subscription annual cost, debt-free date + which strategy saves more, emergency cover, goal nearly funded). Safe-to-spend is an inverted contrast card.
- **Celebrations**: confetti when a goal becomes fully funded or a debt hits zero, and on the closing slide of a Month in review that ended in the black.
- **Month in review** (`app_story.js`): full-screen swipeable recap of the month in the top bar, from the Overview greeting button or Reports. `storyStats(month)` collects the numbers, `storySlides(st)` builds up to 11 slides and drops any with nothing to say, `openStory(month)` plays it (Next/Back, arrow keys, space, swipe, edge taps, Esc). The closing slide picks one suggestion for next month from what the month actually showed and links straight to it.

## 5. Decisions already made (don't re-litigate unless the user asks)
- Net-worth snapshots: automatic monthly + manual button.
- Rollover: shipped as a setting, default off.
- Multi-year data: no cap.
- A dedicated **Income** view was added (spec's 9 views had no place to enter income).
- Transactions do **not** adjust account balances (documented in the guide).
- Reports always print black-on-white regardless of theme.
- Grids use `align-items:start` (ragged bottoms accepted for less whitespace); user was told they can ask for equal-height rows.
- Bill auto-pay is off by default on purpose (people want to confirm payments).

## 6. Iteration history (what the user asked for, in order)
1. Build from spec → app + tests + guides + licence + listing copy + deck. PR opened.
2. "Not mind blown": added 6 themes incl. dark, welcome tour, first-steps checklist, quick add, simpler forms, greeting/insights, animations, confetti.
3. "Reduce repetitive entries / deep-link to the exact settings spot / storage-full message": automation switches, anchors + flash everywhere, storage blocked-vs-full diagnostics.
4. "Favicon options, too much whitespace, minimalist with contrast, things touching": tab icons, tighter density, inverse safe-to-spend card, `.mini` progress rows, settings masonry, budget inputs, savings card wrapping fixes.
5. "Do 1 and 2" (Month in review + close the known gaps): built the Month in review story, added Settings → Appearance toggles for even card heights and for bringing the first-steps checklist back, and hardened the two Chromium-only spots (`:has()` fallback, `type=month` fallback with format hint and validation). Guides, listing copy and the deck (now 14 slides, with a Month in review slide) regenerated.
6. "Disorganized, containers different heights, too many curved edges": one uniform grid (every card row level, footnotes pinned to the baseline, charts centred in leftover space), the settings masonry replaced by a real 2-column grid, first-steps buttons moved inline, and a tightened radius scale (6/5/10px, circles only where something is genuinely round). The even-card-heights setting was removed — it is the default now.

## 7. User preferences & tone
- Wants responses straight to the point, and contrasting opinions when they exist.
- Cares a lot about polish, first impressions ("mind blown"), minimalism with contrast, and buyer onboarding.
- Previews the file inline in the chat panel (a sandbox that cannot save — that is what caused the "storage full" confusion; always mention that opening the real file locally is the true test).
- Send the built HTML back with `SendUserFile` (display: render) after each round.

## 8. Known gaps / ideas not yet done
- Real-browser pass on Edge, Firefox, Safari over `file://` (only Chromium tested).
- The Month in review has no auto-advancing timer (a real story bar). Deliberate: auto-advance while someone is reading their own numbers is annoying. Easy to add if the user wants the classic feel.
- No "save the recap as an image" — the viewer sandbox blocks downloads and there is no canvas renderer for it. Printing the Reports page is the current answer.
- The mockup deck must still be screenshotted by a human (Chrome DevTools → capture node screenshot) to produce Etsy images.
- Etsy listing kit skill exists (`etsy-listing-kit`, `html-mockup-decks`) if more listing material is wanted; the skills' helper scripts were not present in this environment, so checks were hand-written (`dev/geometry-check.mjs`).

## 9. How to continue in a new session
1. Open the repo, `cd finance-dashboard`, read this file and `README.md`.
2. Edit files under `dev/`, then `./dev/build.sh`, then run both test suites.
3. For visual work, run `node dev/shot-polish.mjs` (writes PNGs to `dev/shots/`) and view them.
4. Regenerate assets/deck/guides when UI changes are visible in screenshots or copy changes.
5. Commit, push to the same branch; PR #3 updates automatically. Send the HTML to the user.
