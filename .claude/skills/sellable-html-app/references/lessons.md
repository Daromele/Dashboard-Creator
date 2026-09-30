# Lessons: the user's feedback, turned into rules

Each rule comes from a real correction while building Monthly Plan, Profit Plan, Shop Insights and
the Bakeweek listing. Apply them up front so the user never has to say them again.

## How the user works

- Wants the app to feel like "the thing that was missing" for the buyer. Expects **another 25%**
  after "almost there": a clean top-to-bottom pass touching every tab, making it "efficient, clean,
  crisp and very functional".
- "Keep making slight improvements and optimizations independently, when you notice them." Fix
  small things you see without asking; list them in the summary.
- Prefers concise answers, with a contrasting view only when a real one exists.
- Decides scope quickly ("Etsy only for now, others coming soon"). Build extras behind a switch
  instead of deleting them.
- Reviews on screenshots: every change must look right, not just work.

## Layout

- **Dead space is a bug.** "Lots of dead space, poor spacing… no need to only do two-column sections
  when there is a lot of dead space." Use 3-4 compact columns, or add a useful second chart below a
  short one ("that section has some space at the bottom, add another chart underneath").
- **Match heights** of cards in a row; a table beside a chart takes the chart's height and pages
  ("increase the height of all the sections so they all match").
- **Related things sit together** (the countries table under the countries chart).
- **Don't replicate a platform's screen.** "I gave the Etsy screenshot for you to see the numbers,
  not for it to be replicated." Show the same numbers in the app's own style.
- **Bloat is a bug.** 20 sidebar items were "wayyy too many": consolidate into hubs, remove duplicate
  cards, hide rarely used screens by default. But don't merge a screen that worked on its own: Year
  at a glance came back as its own item, and a merged version "looks really bad… do a complete rebuild".
- **A bold first screen**: the dashboard opens with the dark hero and one huge number (then 2.5×
  bigger again on request).
- The best-seller slider needs **arrows as well as dots**, and it sits **above** the hero.
- Default views: grid for entities (shops), not table.
- After an action, **stay where the user was** (the shop they imported into).

## Color and style

- **Solid colors, no gradients** on KPI tiles.
- **One color language across the whole app**: revenue/money in green, expenses/costs red (themed
  shades), net/profit in the accent. Including the mini charts ("green for growth, red for decline").
- **White KPI cards on a white section are too bland**: tint them by meaning.
- **Icons in the content**, "don't overdo it", on the important KPI cards and card titles; remove
  them where numbers make labels wrap.
- **Icons must align** with their text (vertically centered). "The text sits slightly above": check
  every title with an icon.
- Logos can be square logos, not only 16:9 photos: support both; tint the picture area from the logo.

## Charts

- "Too many progress lines, not enough pies and donuts." Pie/donut when the point is percentages;
  otherwise mix chart types. And "add dynamic elements so the app is alive".
- Donut **above** its legend; **straight** divider lines, no rounded ends.
- **Flat bars**: "no curved edges or prominent white line to divide the colors".
- **Numbers on top of bars.**
- Stacked columns per entity (one color per shop) wherever a total is made of shops.
- "Less is more… ensure the most important info is not lost in the noise": fewer series, clear titles.
- Axes at the bottom of their container (an area chart whose x-axis floated mid-card was a bug);
  a chart for many entities gets more height.
- Year-over-year tables: most recent year first, then the next 9 years as columns with "—" until
  data arrives. Pair with a pie (share by entity) and a line (profit over 10 years per entity).

## Tables

- **Every table sortable** "when feasible in the entire app".
- **Pages instead of long tables**, with Previous/Next; "all countries", not "top countries", with
  paging to the last one.
- **Filterable, sortable, searchable** lists where there are many rows (Imported files).
- Long names wrap to **two lines** so the right columns stay visible.
- A ratio the user asks about ("% have sold") gets its own column.

## Words

- American English everywhere; "check" not "tick"; colored dots instead of naming colors.
- Explain derived numbers on screen ("how does the app distinguish new vs renewed listings?").
- Say which file fills an empty section.
- Don't claim what isn't there: the import copy listed 10 platforms while the product was Etsy-only.

## Data and trust

- "All uploads should be editable/deletable": move to another entity, delete, undo.
- A wrongly refused file was actually the same file twice: the refusal was right, the message
  needed to say why.
- Money in from the bank isn't automatically platform revenue; match payouts before labeling.
- Numbers must match the platform's own screen exactly (Etsy Ads $72.90 billed vs $67.90 paid).
- Averages the user asked for: monthly revenue, expenses and **cash flow**, as KPIs.
- Split things that are different everywhere (your Etsy Ads vs Offsite Ads).
- Data that "disappeared after refresh" = storage quota → IndexedDB. Never let a save fail quietly.

## Products and packaging

- Needs realistic demo data for **3 entities** in every import format, for the listing video.
- The try-before-you-buy should give the "wow" but leave a reason to buy; the hosted demo is a
  separate small page with nothing to unlock ("only really motivated users can steal it, and even
  then it shouldn't be worth their time").
- One listing slide is a graphic of the simple steps; as an animation, so it can be the listing video.
- Split the mockups into ready-to-upload photos ("so I don't have to screenshot them").
- A listing packet with everything in the order Etsy asks for it.
- A buyer how-to guide, kept current with the app.
- The house style is Shop Insights'. Apps made elsewhere (Bakeweek Studio from Codex) get brought
  into it.

## Engineering

- Never commit the user's real exports; synthetic fixtures only.
- Test harness pitfall: `addInitScript` + `localStorage` + reload on `file://` loses data in
  headless Chromium; it's not the app.
- A reduced-motion rule that cleared `stroke-dasharray` turned every donut single-colored: scope
  motion overrides tightly and test with reduced motion on.
- Print CSS that kept cards whole produced empty first pages: let cards flow, keep charts whole.
- Renaming collisions: a new `insights()` shadowed an existing `insights(m)`. Grep before naming.
- Line-level dedupe undercounted identical legitimate lines: dedupe per file.
- An import silently capped at 24 files: raise caps and always say when something was dropped.
- `sed` with escaped pipes corrupted a Python file: use a real editor or a Python script for
  multi-line or regex-heavy edits.
