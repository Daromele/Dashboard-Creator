---
name: newbie-check
description: First-time-buyer review of any app built on the monthly-plan core (Monthly Plan, Profit Plan, Creator, Autónomo, Income and Expense Tracker, Debt Free Plan, Bill & Subscription Tracker, and future editions). Pass 1 clicks every button on every screen in three states and flags dead or broken controls and wording from other editions; pass 2 makes screenshot contact sheets that you walk through as a newbie. Output is a list of what's wrong or confusing, with proposed fixes, to discuss with the user before fixing. Use when the user says "newbie check", "noob check", "how it works check", "act like a new user", or before listing a new edition.
---

# Newbie check

Act like someone who just bought and opened the app: no idea what the screens mean and no patience
for dead buttons. Two passes, then a list. **Don't fix anything until the user has picked the items.**

Arguments: one or more built apps (`monthly-plan/app/<App>.html`) or `all`. Rebuild first
(`cd monthly-plan && node build/build_app.js`). Write the output to the scratchpad, never to the repo.

## Pass 1: click everything (`scripts/crawl.js`)

```
node .claude/skills/newbie-check/scripts/crawl.js monthly-plan/app/<App>.html <scratch>/nc-<App> [--date 2026-10-05]
```

- The clock is fixed (default 2026-10-05) so date-relative sample data is stable. `window.print` is stubbed.
- Screens come from the sidebar, including hidden ones. It runs three states: **empty** (fresh
  install), **first** (the seed from `editions.json`, i.e. a buyer's first one or two items) and **sample**.
- Every visible control is clicked once, from a fresh reset, and gets one result: dialog,
  goes to, toast, data changed, print, download, file picker, redrawn, **NOTHING VISIBLE** or **ERROR**.
- It scans `#content` innerHTML, including closed `<details>`, for the edition's `forbid` words
  (wording that belongs to another edition).
- Read `crawl.md`: "To look at" first, then "Wording from other editions".

Sort the NOTHING VISIBLE results.

**Expected (say so once, don't list them):**
- The nav item for the screen you're already on.
- A layout toggle that's already active (Grid in grid view).
- Settings selects that apply on "Save".
- Checkboxes that only change a form.

**Real:**
- A button that does nothing in the current mode. Example: "Explore sample mode" while you're already in sample mode.
- A filter or tab with 0 entries.
- Arrows that move through empty years.
- Any ERROR or page error.

## Pass 2: walk it as a newbie (`scripts/walk.js`)

```
node .claude/skills/newbie-check/scripts/walk.js monthly-plan/app/<App>.html <scratch>/nc-<App> [--date 2026-10-05]
```

The contact sheets:
- `sheet-1-welcome`: the tour, slide by slide.
- `sheet-2-empty`: every screen on a fresh install.
- `sheet-3-add-form`: the top bar's main button, desktop and phone.
- `sheet-4-sample`: every screen, full page.
- `sheet-5-phone`: 390 px.
- `sheet-6-dark-print`: dark theme and print.

Look at every sheet with Read. Then drive the main job by hand in Playwright, the way a buyer would: add the first real item with the defaults left alone, do the
main action on it (pay, log, import), edit it, and come back the next "month". Check each item below.
Every rule came from a real finding.

**Entering data**
- Default values the buyer won't change: a date that defaults to today ("due today" right away), or a
  category that defaults to the first in the list (Utilities for Netflix). Guess from the name and type
  where possible.
- A past date on entry: does the app turn something already done into "overdue"? Ask "Already paid?".
- Fields that only matter in some cases ("New price starts", "Since") should appear only then.
- Quick-start helpers (preset chips, getting-started cards) shouldn't vanish after the first item.
  Keep them until there are about 5 items.

**Actions**
- Bulk-action labels must count what they actually do ("Mark 5 as paid" pays only the 3 fixed ones).
- Recording a late item: is the date stored as today or as the due date? Does that wreck an on-time rate?
- Dialog titles match the action ("Edit payment" is not titled "Mark paid").
- Every button does something in every state: empty, first data, sample mode.
- Tick every checkbox in every form: a checked label must not render struck through (a checklist style leaking into forms).

**Numbers**
- Zero data must not show 100%, red, "Lightest month $0" or a full ring. Show "—" and a hint instead.
- Charts and averages must not count the months before the first item existed, or blame the wrong thing for them.
- One basis per number across screens. A calendar year on one screen next to the next 12 months on
  another reads as a bug. Pick one, and label it.
- Every KPI says what it covers. "Busiest week" needs the week it means.

**Words and states**
- Wording from other editions (the crawl's list, plus Settings, Start fresh, backups and the guide).
- Empty states explain the next step. Controls that can't do anything yet (year arrows, filters,
  export) are hidden or disabled.
- The welcome tour's last button and the guide's buttons go somewhere useful.
- Phone: no overflow, dialogs scroll, the top bar button still reads. Dark: contrast. Print: no sidebar,
  no near-empty pages.

## Report

Reply in chat, short, grouped and numbered so the user can pick:

1. **Wrong or broken**: does the wrong thing, or loses or misstates data.
2. **Confusing**: works, but a newbie would misread it or get stuck.
3. **Fine as is**: things you checked that looked odd but are right, each with one line on why.

Each item:
- the screen
- what the newbie did and saw
- the proposed fix
- your recommendation of which items to do

For `all`, group by app, and pull items that hit several apps (core issues) to the top. Then stop and
wait for the user to choose.

## Adding an edition

Add a block to `editions.json` keyed by the pack's `id`:
- `first`: JS run after `state=Budget.blank()` that adds one or two realistic items with the edition's own state keys.
- `forbid`: regexes for words that belong to other editions.

With no block, the crawl still runs with only the empty and sample states.
