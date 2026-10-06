---
name: new-money-edition
description: Checklist for adding a new edition (niche pack) to the monthly-plan core and shipping its full Etsy kit — app rules learned from the user's corrections on Debt Free Plan and Income and Expense Tracker, plus the listing pipeline (deck with copy, PNGs, Etsy video, social video, guide PDF, LICENCE, START_HERE, buyer ZIP). Use with the sellable-html-app skill whenever a new money app (bills, net worth, savings, couples, paycheck, rental…) is built or an existing edition is renamed or relisted.
---

# New money edition on the monthly-plan core

Read with `sellable-html-app` (design system, catalog) and `html-app-mockup-deck` (deck, videos).
Everything here is a correction the user already made once. Apply it up front.

## 1. Build

- Pack `monthly-plan/app/packs/<id>.js` (copy the closest: `debt.js` for one-goal apps, `tracker.js`
  for statement apps) + a feature flag + one UI module in `app/src/core.html` (like `Debts`), with a pure,
  exported logic module (like `Debt`) unit-tested from `build/test_<id>.js` via `build/test.js`.
- Pack object: keep comments on their **own line**; the build joins lines, so a trailing `// …`
  swallows the next property. No `,,`.
- `product.publisher` is the sidebar subtitle: a product line ("DEBT PAYOFF TRACKER"), never "JPS
  DIGITAL PAGES". `labels.demoNote` sets the sample banner. Last welcome slide: `finish:'Look around first'`.
- Storage key is forever: if the product is renamed later, change names and file, **keep the key**.
- Nav: the main action (add / import) is in the first group, early. Rarely used screens in
  `optionalNav`. Hide the month bar (`body.<id>-ed`) if months don't drive the edition; give screens
  that need a month their own arrows.
- Wire the edition's branches in core alongside `P.features.debt` (blank state, validator block for its
  keys, `debt-ed` body class, Settings column + wording + Move your data + categories card, Start fresh,
  guide Quick Log section, the `q` key). Bills (`features.billsTracker`) is the smallest example.
- Reuse a whole edition's screens when the new one needs them: turn on its flag too (the paycheck edition
  runs `billsTracker` + `paycheck`), put the new edition's branches **before** the reused one's in every
  ternary, override its dashboard by spreading the new views last, and skip its top-bar rewiring (a
  `click` listener it adds survives a later `dataset.action` change).
- Grep the core for words from other editions before shipping (closed `<details>` hide text from
  innerText: scan `#content.innerHTML`): "planner", "budget", "books",
  "Autopilot", "transactions" in Settings, Start fresh, backups, Getting started, guide, empty states.
  Every edition gets its own wording (`P.features.x?…:…`). Insights must be rewritten for the edition.

## 2. Screens the user expects without asking

- **Alive, not tables.** Big numbers, charts and toggles first; tables second. Numbers tween when a
  toggle/slider changes them ("magically see the numbers change"); charts have toggles.
- Hero donut: labels around the ring with leader lines (no side legend), thin ring, stacks under the
  hero text below 900 px.
- Entity lists (debts, bills…): **grid default**, table toggle, category chips to filter, name column
  left-aligned, each card with visible edit / history / delete, and an update action.
- Row buttons never touch: `.row-acts` gap, `td .btn+.btn{margin-left:6px}`. Check every table.
- Categories for the edition (debt kinds, bill categories) in Settings with **edit, archive, delete**
  icons (not "hide"); the budget "Your categories" card is not reused.
- Statuses where life has them (active, paused, cancelled…), with on-hold items kept in totals but
  out of plans.
- Amount inputs accept a dollar sign, commas (5,000), decimals (5000.50), `€` and spaces.
- One basis for a number everywhere (form hint, grid, table, dashboard).
- Ask for the one setting the app needs (budget) after the first item, and again if new data makes it
  wrong.
- Per-item history (payments/charges) reachable from the item, and a filter on the log page.
- Import (if any) says where data goes and explains "nothing new" (older lines, duplicates).
- Settings: sidebar switches grid `auto-fill minmax(190px)`, `min-width:0`; no overflow at 390 px.
- Print: a dark theme prints in the first light theme.
- Forms that save as you go: never re-render on `change` while the buyer is still in the form (tabbing to
  the next field loses what they type). Save on `focusout` of the whole form, on slider release, or on Save.
- Line charts scale to the data with 2–3 labeled gridlines (not from zero, which flattens growth); tick
  labels are spaced by their width, the first anchored start and the last end. Reuse `lineChart` /
  `Live` (tweens, ring) from the net worth and bills modules rather than writing new ones.
- Defaults a newbie won't change are guessed from what they type (category or type from the name; a
  debt-sounding name flips own/owe) and stop following once they pick one themselves.
- Hide controls that can't do anything yet (Print, Export, arrows) on an empty app.
- Anything "per period" with two sources (two incomes): per-period amounts follow one main source (let the
  buyer pick it), and month amounts split by the days a period covers, or short periods get a full share.
- Make the sample show the edition's signature moment on any day it's opened: compute the plan with the
  engine inside `sample.extras` and add what's needed (e.g. a one-off bill that leaves one paycheck short).
- Sample data: fictional names only (never the user's banks: "Harbor Bank", not Chase); rich enough
  that every screen and every toggle shows a difference.
- A budgeting card is a tool, not a report. Research first (YNAB, 50/30/20 apps): one "left to assign" number on
  top (green at zero, red when over); each group a bar toward its share with a goal tick, green while within,
  red past it (saving fills amber toward its goal, green when reached); the lines inside each group with their
  amounts **editable in place**, so bars and the banner move as you type; saved when focus leaves the card;
  method picked with labeled pills; "+ Add a line" in each group. Pies and "gap" text with buttons were
  rejected as confusing: the buyer couldn't see how to do the budgeting. Polish the user asked for next: method pills centered
  above the banner (with a Custom split set by two sliders, the third share is the remainder), long group
  lists scroll inside the column, pill toggles instead of rows of dropdowns, a short subtitle, and every
  fixed line (a bill) links to the form where it's edited.

## 2c. Newbie-check rules: build them in, don't wait to be told

Every line below was a finding from `/newbie-check` on an earlier edition (bills 15, net worth 8,
paycheck + Monthly Plan 6). Build each one in from the first commit; the check should then find nothing new.

**Entering data**
- Dates: no "today" default for things that are due; leave it empty or guess. A past date on entry asks
  "Already paid?" (ticked) instead of turning into overdue.
- Category and type are guessed from the name (Rent → Housing, Netflix → Streaming, Amex → owe) and
  stop following once the buyer picks. The edit form follows the same rules as the add form.
- Fields that only apply sometimes ("New price starts", "Since", a status date) appear only then.
- Something added later asks "I already had this": back-fill it so it never counts as growth, a best month
  or a milestone.
- A field that takes a year (or a month) shows the converted amount live and asks "Is that a month?" when
  the number looks like the other one.
- Quick-add chips and getting-started steps stay until about 5 items, not just the first.
- A dialog opened from a button explains itself in that button's terms ("Log spending" with nothing to log
  against: "First, add what you spend on…").

**Actions**
- Bulk labels count only what they will do. Dialog titles match the action ("Edit payment").
- Recording a late item asks for the real date (pre-filled with the due date); never stamp "today".
- A one-click fix must work on **every** period and state it is offered in (two incomes: a per-paycheck
  line can't fix the partner's paycheck). Where it can't, explain instead of showing the button.
- After a one-click fix, the gap it targeted reads "On the goal ✓". Test it in the flow.
- Buttons that do nothing in the current mode change or hide ("Explore sample mode" in sample mode →
  "Return to my …").

**Numbers**
- Zero data: "—" and a hint, never 100%, red, a full ring or "Lightest month: zero dollars".
- Charts and averages start at the first real item and stop at the last real entry (no flat made-up month,
  no blaming yearly bills for empty months). A partial first year is labeled "(from May)".
- One basis per number across screens (next 12 months vs calendar year): pick one and label it.
- "When did tracking start" is the first money recorded or the day an item was added, never a start date the
  buyer types (a lease from January doesn't make January–September empty months). Arrows don't go back before it.
- The month under way stops at today: never count or draw expenses scheduled later in it. Yearly figures
  annualize whole months only and say how many ("3 full months, as a year").
- Every KPI says what it covers ("Busiest week · Oct 1–7"; "at your September check-in", not "since Aug"
  next to "As of September").
- Room, gaps and suggested amounts never exceed what is actually free; reserve the higher-priority gap
  (savings) before showing room for wants. Nothing free: say "trim something first".
- A number over its target says what to do about it in one line, not just red.

**Words and states**
- Hide controls that can't act yet: year arrows, month switches, export, print, filter chips with
  0 entries. Clicking something must never toast "updated" while nothing changes.
- Wording from other editions: scan innerHTML including closed `<details>`.
- Print: dark-header labels print dark; checked form checkboxes are never struck through.

**The loop (this is how the skill improves itself)**
1. Build with sections 2–2c.
2. Run `/newbie-check <App>.html` before the listing kit; add the edition to its `editions.json` first.
3. Fix what the user picks.
4. Before committing the fixes, add each **new** finding as a one-line rule here (the right group above)
   and as a check in `.claude/skills/newbie-check/SKILL.md`, phrased generally ("a one-click fix must work
   on every period"), not about the one screen. Add a flow-test assertion for it. Commit the skill changes
   with the fixes.

## 2b. Test-writing traps

- `requestSubmit()` runs the browser's own `required` check first: an empty required field never reaches
  the handler (that's correct). A closed dialog keeps its form in the DOM: check `$('#modal').open`.
- Hidden radio inputs inside styled labels: click the label. Fields inside a closed `<details>`: open it.
- KPI numbers count up from 0: wait or read `state`, not a mid-animation screenshot.
- A form's defaults apply in tests too (a bill added without choosing "Once" repeats monthly).
- `el.click()` returns undefined: never chain `a?.click()||b.click()`.
- Playwright `fill()` fires `input`, not `change`; `change` comes on blur, so test both the typing path and
  leaving the field (click elsewhere).

## 3. Check like a first-time user

Before calling it done: clean walk-through top to bottom as a new buyer (empty app → first item →
sample mode), list UX issues, fix them. Then: unit tests, the edition's flow test, `ui_parity.js`,
`views_flow.js` (only budget-like editions in its APPS list), phone 390 px, a dark theme, print.
Look at screenshots of every screen.

## 4. Listing kit — `monthly-plan/listing/<slug>/`, never a listing .md

1. `capture.json` → `node .claude/skills/html-app-mockup-deck/scripts/capture.js` (drop shots with odd
   ratios or near-empty screens; use `before` to show a meaningful state, e.g. cuts applied).
2. `deck.json` (brand = the default theme's colors) → `build_deck.py`; validate, geom, swaptest (PNG).
   No widow words in subs. ~11–13 slides; Etsy shows 10 images, say which to drop.
3. PNGs: every slide at 1500×1125 into `png/NN-name.png` (committed) + zip (git-ignored).
4. Etsy video: `video.json` → `video_capture.js` + `render_video.js` — 1440×1080, ≤ 15 s (14.8),
   no sound, a click that visibly moves a big number. Check stills before the full render.
4b. A card at the bottom of a page can't fill a 1.6 capture: in `before`, move it up the page
   (`document.querySelector('.kpis').after(card)`), then scroll to it. For typed values, set the input and
   dispatch `input` in `before`, with `clipFrom` for the before/after frames.
5. Social video: `social.json` (own captures, `shots_dir:"sshots"`) → `render_social.js` —
   1080×1920, ~17 s, sound from `make_audio.py`; hook, 4 crop scenes, end card. Camera `sub` is `[x0,y0,x1,y1]`
   (fractions of the target), not x,y,w,h. Zoom on one KPI tile to make a number readable in portrait.
6. Copy in `description.txt` (plain text) in the **standard format** (see Monthly Plan's):
   one-line promise · (Free Demo link if hosted) · what-it-is paragraph · `How It Works:` 5 steps ·
   `WHAT YOU'LL GET:` bullets · `PERFECT FOR:` · `Please note:` (digital, data in browser, backups,
   limits like "PDF can't be read", not financial advice) · Etsy download link · `👍 You Can` /
   `👎 You Cannot` · returns note with email + website · `<Product> by JPS Digital Pages`.
7. Title ≤ 140, opens with the phrase buyers search (often the product name). 13 tags, each ≤ 20
   chars, buyer phrases, no competitor brand names, include "<thing> spreadsheet" where it fits.
8. Guide: add the product to `monthly-plan/build/build_guides.py` (10 pages: cover, start here, the
   idea, 3–4 how-to pages with screenshots, screens table, keep it safe, fixes) →
   `node build/guide_pdf.js` (flags footer overflow). Check every button name against the app.
9. `LICENCE.txt` and `START_HERE.txt` from the existing ones (product-specific paid-service line and
   no-warranty paragraph). Buyer ZIP = app + guide PDF + START_HERE + LICENCE (git-ignored).
10. Publish/refresh the app artifact; send the ZIP, deck, videos, guide.

## 5. Privacy

The user's uploads are personal statements: read them in the session only, never commit, scan diffs
for names, IBANs, card digits and IDs before every commit. Tests and samples are synthetic, and use fictional banks
(Harbor Bank) in test strings too.
