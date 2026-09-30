# Feature catalog: every small thing, and how it's built

This is the checklist of details that make an app feel like Shop Insights. Every app gets all of
section A-I unless a line says otherwise. Each entry says **what** the buyer sees, **how** it's built,
and **where** the reference code is:
- `core` = `monthly-plan/app/src/core.html`
- `etsy` = `monthly-plan/app/src/etsy.js`
- `starter` = `assets/starter.html`

When a feature is in the starter, copy it from there: it's the same thing, simplified.

Quick checklist (tick all before calling an app done):

```
A  <title>, description, theme-color, favicon, license comment, skip link, noscript
B  rail: brand mark + name + publisher, collapse button (remembered), nav groups, hubs,
   active marker, rail note, sample button, site link, version, save status; mobile drawer
C  top bar: month control with calendar picker, entity picker (+ Add…), status, Guide, Back up
D  banners: sample mode, backup reminder (Not now), storage problem
E  page: eyebrow + h1 + subtitle + actions, hub tabs, print title, footer
F  dashboard: pulse strip (auto-rotating), dark hero with huge number, KPI tiles (tints, icons,
   sparklines, colored change), charts, empty state + 3 steps
G  tables: sortable, paged, searchable, clamped long text, pinned totals, icon actions
H  dialogs: modal with ×, inline form errors, in-app confirm (never window.confirm), toast + Undo
I  settings & backup page: preferences, palette chips, Keep your progress safe (folder backup,
   manual backup, CSV, start fresh), Simplify your sidebar (switches, "n of m shown"),
   entities, Getting started (sample, replay tour, publisher line)
J  welcome tour + weekly backup nudge
K  keyboard, focus and accessibility
L  motion
M  pictures and logos (when entities have them)
N  insights / "do this next" (when the app gives advice)
O  print
P  storage keys and state conventions
```

---

## A. Page head (in `<head>` and around `<body>`)

- **Title**: `<Product> · <what it does>` (Shop Insights: "Shop Insights · Etsy take-home, fees,
  products & reviews"). Starter: `<Product> · JPS Digital Pages`.
- **Description meta**: one sentence plus "Works offline." plus "Not affiliated with…" where a
  platform is named.
- **`<meta name="theme-color">`**: the default theme's `--bold` (kiln `#3A2419`). It colors the browser
  chrome on phones.
- **Viewport**: `width=device-width,initial-scale=1,viewport-fit=cover` (notch-safe).
- **Favicon**: an inline SVG data URI, so there's no file to ship.
  `<link rel="icon" href='data:image/svg+xml,<svg …>'>`
  - The picture: a 64×64 rounded square (`rx="15"`) in `--bold`, with the product's mark in `--pop`.
  - Shop Insights draws its "S" as a stroked `<path>` (`stroke-width="6"`, round caps), which is
    crisper at 16 px than a font letter.
  - Escape `#` as `%23`. Use single quotes around the `href` when the SVG has double quotes.
  - `scripts/new_app.js` generates a letter version. Swap in a drawn path before release.
  - Where: pack `product.icon` in `packs/etsy.js`, core line 3.
- **License comment**: first line after the doctype, `<!-- Product for …. Copyright (c) YEAR JPS
  Digital Pages. All rights reserved. Personal-use … Not affiliated with… -->` (pack `product.notice`).
- **Skip link**: "Skip to content" off-screen until focused, jumps to `#content`.
- **noscript**: "Enable JavaScript to use Product. Your data stays in this browser."
- **`<html data-theme>`**: set in the markup to the default theme so the first paint is right.

## B. Sidebar (the rail)

- **Brand block**:
  - a 34 px mark square (`--pop` background, `--pop-ink` letter, radius 10);
  - the product name in Manrope 700 16px;
  - `JPS DIGITAL PAGES` in 9px, letter-spacing .16em, `--on-bold-dim`.
- **Collapse button** (`.rail-toggle`, core ~line 804, starter):
  - a 34 px icon button at the brand's right, drawing a "panel" glyph: a rect plus a vertical line;
  - clicking toggles `.app.rail-min`: the grid column goes 258 px → 72 px, and labels, group
    headings, rail foot and brand text hide;
  - the icons get bigger (21 px) and centered, the mark stays, and the toggle moves under the mark
    with its glyph mirrored (`transform:scaleX(-1)`);
  - `aria-expanded` and `aria-label` flip between "Collapse navigation" and "Expand navigation";
  - each nav link has a `title` so collapsed icons still name themselves on hover;
  - the choice is remembered in `localStorage[<key>-rail-collapsed]`;
  - hidden under 900 px, where the rail is a drawer instead;
  - transitions: `grid-template-columns .2s`, `padding .2s`.
- **Nav groups** (subsections): small caps headings (10px, .14em, `--on-bold-dim`) before the first
  item of each group.
  - Defined as `navGroups:[[label,[ids]]]` plus `navGroupRest` (the group for everything else,
    e.g. "Help & settings").
  - Shop Insights: Your shops · Money · What sells · Tax & planning · Help & settings.
  - Where: `navGroup()` in core `render()`, pack `navGroups`.
- **Hubs** (a sidebar item with several screens):
  - Defined as `[id,label,icon,[[screen,tab label],…]]`. The sidebar shows it once; its screens
    are a `.segment.hub-tabs` row at the top of the page.
  - The hub stays "current" in the sidebar on any of its tabs.
  - The sidebar link reopens the tab last used (`hubLast`).
  - Every screen id still works with `go(id)`.
  - Where: core `hubOf`, `hubLast`, `render()`.
- **Active item**: `aria-current="page"`, `#ffffff16` background, weight 600, plus a 3×18 px `--pop`
  bar hugging the rail's left edge (`:before`).
- **Hideable items**: `optionalNav` lists what can be switched off. Dashboard, Import and Settings
  never can (Settings is where views come back). `settings.hiddenNav` holds the switched-off ones;
  the pack's `settings.hiddenNav` is the default for new files.
- **Rail foot**, pinned to the bottom with `margin-top:auto`:
  - rail note: a bordered box, `<b>` headline in `--pop` plus one line of promise;
  - "Explore sample data" button (turns into "Return to my data" in sample mode);
  - site link "JPS Digital Pages ↗";
  - tagline · version;
  - save status with a green dot ("Saved on this device" / "Sample mode" / "Backup needed" with a
    red dot).
- **Mobile drawer** (≤ 900 px):
  - the rail becomes `position:fixed`, 270 px wide, `translateX(-100%)`;
  - a ☰ button in the top bar toggles `body.menu-open`;
  - a scrim button covers the page (`#160c2470`) and closes it, as do a small × at the rail's top
    right and Esc;
  - choosing a screen closes the drawer.
  - Gotcha: `.ibtn{display:inline-grid}` overrides `display:none` on these buttons, so hide them
    with `!important` (or higher specificity) and show them again in the media query.

## C. Top bar

- Sticky, the same color as the page (`--paper`), content max-width 1400 px.
- **Month control**: a bordered pill holding ‹ · "September 2026" (Manrope 650 16–17px) · calendar
  glyph · ›. The pill gets an accent ring on hover and focus.
  - The calendar is a real `<input type="month">` shrunk to 28 px and painted with a mask
    (`--cal-icon` token) in `--accent`.
  - Its `::-webkit-calendar-picker-indicator` is stretched invisibly over it, so a click opens the
    native picker.
  - Browsers without month inputs just keep the arrows.
  - Core carries a small caps "Viewing month" label in the markup, but keeps it hidden.
- **Entity picker** (shops, projects, properties…): a small caps label ("SHOP") over a `<select>`.
  - Options: "All shops" (when there are 2+), each entity, then "＋ Add a shop…", which opens the
    add dialog and resets the select.
  - It's hidden when there are no entities, and "All" is dropped when there's only one.
  - Where: etsy `afterRender` (`#shop-switch`), starter `renderPicker`.
- **Right side**: save status (hidden on phones), quiet "Guide" button (help icon), "Back up" button
  (download icon). On phones the buttons show icons only (`.topbar .btn span{display:none}`).

## D. Banners under the top bar

- **Sample mode** (`--sunk`): "**Sample mode.** Made-up data to explore. Nothing here is saved, and
  your own data is untouched." with a "Return to my data" link. The link must not wrap.
- **Backup reminder** (`--flag-soft`):
  - It shows when there's data, not in sample mode, and nothing protects it. Protected means a
    healthy backup folder, or a downloaded backup within 7 days (`<key>-manual-backup` timestamp).
  - Copy: "**Your data is not backed up.** It lives only in this browser until you save a copy."
  - Buttons: "Choose backup folder" (Chrome and Edge) or "Download backup" (elsewhere), plus a quiet
    "Not now", which hides it for this session.
  - A broken folder shows "**Your backup folder needs reconnecting.**" with a "Reconnect folder"
    button.
  - Where: core `renderBackupBanner`, `backupProtected`; starter `renderStatus`.
- **Storage problem** (red tint, `role="alert"`): "**Not saved.** Browser storage is unavailable or
  full. Changes are only in this session. Download a backup before closing." with a Download backup
  button.

## E. Page frame

- **Page head**: eyebrow, `h1`, optional subtitle (max 62ch), actions on the right.
  - Eyebrow: the period ("SEPTEMBER 2026") or the section ("MAKE IT YOURS").
  - `h1`: a plain sentence ("All shops at a glance").
  - Actions: a period segment, quiet buttons, at most one primary.
  - Core `pagehead()`.
- **Hub tabs** above the page head when the screen belongs to a hub.
- **Print title**: hidden on screen; in print, the business name (and entity) at the left and the
  period big and bold at the top right.
- **Footer**: a hairline, then a 10.5px `--ink-3` line: "Product · JPS Digital Pages" left, and
  "Saved on this device · v1.0" right.

## F. Dashboard building blocks

- **Pulse strip** (above the hero):
  - Layout: a pale accent bar, a pulsing live dot (`ring` keyframe), one insight at a time (bold
    lead-in, then the fact), and a nav of ‹ arrow · dots (the active dot is an 18 px pill) · › arrow.
  - It rotates every 6 s, but never while hovered or focused, when the tab is hidden, or under
    reduced motion.
  - The texts come from real data, e.g.:
    - "Best seller this month: …";
    - "You kept 85% of every sale…";
    - "Your Etsy Ads took 4.1%…";
    - "3 months still need a statement · Import".
  - Where: etsy `insights(m)`, `pulse()`, `showPulse()`; starter `pulse()`.
- **Hero**: dark `--bold` panel, radius 18, grid 1.3fr / 1fr.
  - Left: eyebrow ("TAKE-HOME · SEPTEMBER 2026"), a huge number (`clamp(56px,8vw,104px)`, count-up),
    one sentence with the key share in bold, then a `.pop` CTA ("Import files →") and a quiet or
    ghost button.
  - Right, after a `#ffffff1f` divider: `hero-fact` rows, a 6 px meter (share kept, `--ok`), and a
    goal line ("Monthly goal · 72% — $7,210 / $10,000") or orders.
  - A radial `--pop` glow in the bottom-right corner (`.hero:before`).
  - Where: etsy `heroCard()`.
- **KPI tiles**: 4 per row (2 under 1150 px, 2 on phones). See design-system.md §4 for the looks.
  - **Tint**: picked from the label by regex. POS (revenue, sales, orders, paid out, buyers…) →
    green; NEG (fee, cost, ads, refund, expense…) → red; NET (profit, cash flow, net, kept) →
    accent; anything else → `--sunk`.
  - **Icons**: a label→icon regex list (`KPI_ICONS` in etsy), for example:
    - so far → calendar; paid out → wallet; ads → spark; fees and costs → coins;
    - profit and take-home → insights; cash flow → history; average order → tags; orders → log;
    - revenue → up; repeat → history; buyers → review; countries → globe; rating → review;
    - listings → tags; tax → shield.
  - Icons go only on the main screens (`KPI_ICON_SCREENS`: dashboard, annual, years, pl, fees,
    customers, products), inserted before the label text as a 26 px square tinted with the tile's
    tone (`--tc`), holding a 14 px icon at stroke 2.
  - Once a tile has an icon, the tone dot (`.label::before`) is hidden.
  - Starter: pass the icon name as `data-icon` on `tile()`; `afterRender` inserts it.
  - **Change note**: text starting with "+12%" or "−8%" is wrapped in `.delta.up` (green) or
    `.delta.down` (red), depending on whether the change is good. For a cost, going down is good.
  - **Sparkline**: the last 12 months, 120×30, with a dot on the last point, colored with the same
    good/bad rule.
  - **Count-up**: numbers animate to their final text over 620 ms (ease-out cubic), keeping the
    exact final string, and stay still under reduced motion.
  - Where: etsy `tintKpis()`, `KPI_ICONS`; core `countUp()`; starter `afterRender`, `countUp`.
- **Card titles with icons**: a 28 px accent-soft square before the `h2`, **vertically centered**
  (`h2{display:flex;align-items:center}`). Misaligned icons were a reported bug. Etsy `.kit-h-ico`,
  starter `cardhead(title,note,icon)`.
- **Card icon on top** (settings-style cards): a 34 px square above the `h2` (`.goal-icon` in core,
  `.card-ico` in the starter).
- **Empty state**: compass icon, `h3`, one sentence, one primary button (and "Explore sample data").
  On the empty dashboard, add three numbered step cards (`01 / ADD`, `02 / REVIEW`, `03 / PROTECT`).
- **Estimated or partial data**: a `.notice` naming what's estimated and the file that makes it
  exact, with a button to import it.

## G. Tables

- **Sortable everywhere**: after each render, every `<table>` with a head and 3+ rows gets clickable
  headings.
  - Headings get `role="button"` and `tabindex=0`, respond to Enter and Space, and set `aria-sort`,
    with an accent ↑/↓ after the label.
  - The first click sorts text A→Z and numbers high→low.
  - Values come from `data-v` (use it for dates and signed amounts), else are parsed from the text.
    "—" sorts last.
  - Totals rows (`.total`, `.group-total`, colspan rows) stay pinned at the bottom.
  - The sort survives re-renders (keyed by screen, or card title, plus the header text).
  - Opt out with `data-nosort`.
  - Where: etsy `sortTables()`, starter `sortTables()`.
- **Paging**: 15 rows, and a pager row: "1–15 of 83 · page 1 of 6" plus Previous and Next
  (disabled at the ends). Reset to page 1 when the period, filter or search changes.
- **Search** box in the card head (debounced 250 ms, focus and caret kept across the re-render), plus
  a kind filter `<select>` and "this entity / all entities" where it helps.
- **Row actions**: 30 px `.icon-action` buttons (edit pencil, trash in red on hover) with `title` and
  `aria-label`.
- Long names: 2-line clamp. Dates: `white-space:nowrap`. Money: right-aligned, tabular, red for
  negative, green for money in where it helps. Ratios: `.pct` mini bar plus the %.
- Wide tables scroll inside `.table-wrap`; the page never scrolls sideways.

## H. Dialogs, confirm, toast, undo

- **Modal**:
  - `<dialog>` with a head (title plus a × icon button), a subtitle, and a hidden
    `#form-error` (red, `role="alert"`) that shows validation messages **inside** the dialog;
  - body fields in a 2-column `.fields` grid (`.full` spans both), with `<small>` hints under
    fields;
  - a footer: Cancel, then the primary action;
  - focus returns to the button that opened it (`returnFocus`);
  - core `modal()`, `formFoot()`, `formError()`.
- **Confirm**: never `window.confirm`. Use a modal with the question, one sentence of consequence
  ("You can undo it straight after."), Cancel and a red action button (`ask()` in the starter).
- **Toast**: bottom center, dark, 6.5 s, the message plus "Undo" (in `--pop`) after every change made
  through `commit()`. Messages are short and specific: "Record deleted", "Showing Fern & Fable",
  "Palette changed".
- **Undo**: `commit()` keeps a deep copy of the state from before the change; Undo restores and saves
  it. Destructive actions (delete, move import, start fresh, restore) all go through `commit()`.

## I. Settings & backup page (same layout in every app)

Page head: eyebrow "MAKE IT YOURS", title "Settings & backup". Then:

1. **Two equal cards side by side** (`grid2 equal`):
   - **Your preferences**:
     - fields: name or business (shown on printouts), currency (a list of common codes; the hint
       says "Changes the label only; amounts are not converted"), symbol override for unlisted
       currencies, date format where dates matter, and "Save preferences";
     - then the sub-head "Choose your palette": theme cards, each a chip with three bars (bold 100%,
       accent 72%, pop 44% tall) on the theme's paper, plus the name. The selected card gets an
       accent border and ring. The grid is 4×2 for 8 themes.
   - **Keep your progress safe** (shield icon on top): one paragraph saying data is in this browser,
     the file holds no entries, and clearing browser data erases it. Sub-heads:
     - *Automatic backups*: "Folder backup: keeps today's dated backup current after every
       change", with a status pill (Not connected / Connected / Reconnect needed / Backup needs
       attention / Not available here) and a Choose, Change or Reconnect button. Browsers without
       it say "Available in Chrome and Edge on a computer".
     - *Manual backup*: "Download backup" (primary) and "Restore backup".
     - *Move your data*: CSV export (and CSV import where the app has it).
     - *Start fresh*: a red button that asks first, offers a backup and can be undone. It's
       disabled in sample mode.
2. **Product-specific cards** (fee rates, goals, categories, column maps…).
3. **Simplify your sidebar**:
   - a toggle grid (4 columns, 2 on tablets, 1 on phones), built from `optionalNav`;
   - each toggle is a bordered 52 px label with the view's icon, its name, and a switch (a 34×20
     track with a 14 px knob that slides 14 px);
   - the checked state is an accent-soft fill with an accent border;
   - a pill says "9 of 12 shown", and changes apply at once;
   - markup: `<label class="nav-toggle"><input type="checkbox" data-nav-toggle="id"><span>{icon}<b>Name</b><i></i></span></label>`;
   - the input is visually hidden, so tests click the label, not the input.
4. **Entities** (shops, projects…): add and rename; logos where supported.
5. **Getting started**: "Open sample mode" / "Return to my data", "Show the welcome tour again"
   (Show tour), then one small line: "Product 1.0 by JPS Digital Pages · hello@jpsdigitalpages.com ·
   Personal use only."

**Backup internals** (core `chooseBackupFolder`, `writeFolderBackup`, `folderStore`; starter the same):
- **Download**: `<key>-YYYY-MM-DD.json` (`-sample-` in sample mode), holding
  `{app, version, saved, data}`. Store the time in `<key>-manual-backup`.
- **Restore**:
  - it checks the file is this app's (`app` or edition tag) and runs `validate()`;
  - it asks first ("It replaces what's in this browser now"), then commits with undo;
  - a trial's backup is allowed into the full app;
  - wrong file: "This backup is from another app."
- **Folder backup**:
  - `showDirectoryPicker({mode:'readwrite', id:<key>-backups})`;
  - the directory handle is stored in IndexedDB (a handle can't go in localStorage);
  - on start, `queryPermission` gives Connected or Reconnect needed;
  - after each save, debounce 1.2 s, then write `<key>-backup-YYYY-MM-DD.json` (core uses
    `storage.file` for the stem), one file per day, overwritten through the day;
  - writes are serialized through a promise chain, so an older write can't land after a newer one;
  - Reconnect calls `requestPermission`, which needs a user click;
  - Chrome and Edge only; everywhere else the option is hidden and the banner offers Download.

## J. Welcome tour and backup nudge

- **Tour**: a separate `<dialog>` (600 px, scrolls if tall; a bottom sheet on phones).
  - Top: a 190 px art header with a soft gradient (accent-soft into a pop, accent or ok tint,
    changing per slide) and an 80 px thin-stroke icon.
  - Then: a step label (10px caps accent, "WELCOME"), a 26–28px title, one or two sentences.
  - Foot: dots (8 px, active in accent), then Back, Next or Get started, with the primary button
    autofocused. There's a × at the top right.
  - Slides come from config, one idea each: what it is · how data gets in · the key number · a
    feature · the **backup slide** · "Start with…".
  - The backup slide offers "Choose backup folder" right there.
  - The last slide offers "Explore sample data" plus "Get started".
  - Closing sets `<key>-welcome-v1 = 1`.
- **Weekly nudge**: on later opens, if there's data, no protection and no nudge in 7 days
  (`<key>-backup-nudge`), the tour opens with only the backup slide and "Download backup" / "Done".
  The banner carries the reminder in between.
- Where: core `openWelcome`, `startupPrompt`; starter `openTour`, `startupPrompt`.

## K. Keyboard, focus, accessibility

- **Shortcuts**: Esc closes the drawer; `N` opens "add" (core: new transaction); `Q` opens Quick
  Log (core). They never fire while typing in an input or with a dialog open, and Cmd, Ctrl and Alt
  are ignored. Mention them in the guide.
- **Focus kept across re-renders**: before `render()`, capture the focused element (by id, or tag
  plus data attributes) and its caret; restore both after. Without this, typing in a search box
  loses focus on every keystroke. Core `captureFocus`/`restoreFocus`, starter the same.
- After `go(screen)`, scroll to the top and focus `#content` (`tabindex=-1`, `preventScroll`).
- Visible focus rings (2 px accent, offset 2). Tap targets ≥ 40–44 px on touch. Every icon-only
  button has an `aria-label`; charts have `role="img"` plus `aria-label`; chart points and segments
  are focusable, with the tooltip on focus.
- Status changes use `role="status"` / `aria-live="polite"` (toast, pulse).

## L. Motion

- Tiles rise in, staggered 50 ms (`--i`); hover lifts 2 px.
- Bars grow from the baseline; lines draw (`pathLength=100`, dash offset); donut segments pop in
  staggered 80 ms; gauges fill; the pulse dot rings.
- Numbers count up; the pulse text slides and fades (0.5 s).
- Everything is off under `prefers-reduced-motion` and in print (`*{animation:none!important}`).
  Never clear `stroke-dasharray` on donuts in those rules: it once made every donut one color.

## M. Pictures and logos (entities with images)

- Two kinds per entity: a **cover photo**, cropped to fill a 640×360 JPEG at 0.8, and a **logo**,
  kept whole (`contain`) in a 256×256 PNG, falling back to WebP 0.85 if the PNG is over 200 KB.
  Refuse anything still over 200 KB after that ("That picture is too large").
  Where: etsy `shopPicture()`.
- **Tint from the logo**:
  - draw the logo onto a 64×64 canvas and sample every 4th pixel;
  - skip transparent (alpha < 200), near-white (min > 232) and near-black (max < 28) pixels;
  - bin by 3 bits per channel, weight each bin by saturation (`0.3 + (max-min)/max`), and take the
    heaviest bin's average color;
  - the result becomes the entity's `tint`, used for the cover area until a photo is added
    (`color-mix(var(--c) 30%, card)`);
  - logos added before tints existed get theirs the first time the cards render (`tintLogos`);
  - where: etsy `logoTint()`.
- Cards: grid is the default and the table is the option. A 16:9 picture area, a 72 px rounded logo
  overlapping its bottom edge (a 3 px card-colored border), and upload chips that appear on hover,
  plus a × to remove.

## N. Insights, the "now what" screen (apps that give advice)

- **Period**: Month or Year to date (a segment), following the month picker.
- **Health hero**:
  - a card tinted by state: good ≥ 75, steady 55–74, needs attention < 55;
  - a 132 px score ring and an eyebrow ("SHOP HEALTH · SEPTEMBER 2026");
  - a one-word verdict (Thriving / Steady, with room to grow / Needs attention);
  - a sentence with the change in green or red, and "n of m things still to look at";
  - part tiles, each with an icon, value, bar and note.
- **Do this next**:
  - action cards sorted most urgent first: tinted, a 4 px left border in the state color, an
    icon, a title, one sentence of why, and a button to the screen that fixes it;
  - a **check box** at the top right (`data-ins-done`) stores the date in
    `settings.insightsDone[key]`;
  - checked cards fade, strike through their title, and say "Done Sep 28";
  - progress reads "3 / 7 done";
  - the legend is **colored dots**: ● Needs fixing ● Worth a look ● Working well.
- Two lists side by side: "Double down on" (green) and "Revisit" (amber). Each has ranked rows with a
  number badge, name, reason chips and a value.
- Where: etsy `shopHealth()`, the insights view around line 1160.

## O. Print

- The Print button calls `window.print()`. Every screen is printable.
- Print CSS:
  - hides the rail, top bar, banners, toasts, dialogs, page actions, hub tabs, pulse, buttons,
    pagers and `.no-print`;
  - white background, 11px body;
  - cards flow across pages; charts, KPI tiles, rows and headings stay whole;
  - table headers repeat; tinted hero and KPI tiles keep their color (`print-color-adjust:exact`);
  - the print title shows the name at the left and the period big at the right.
- Test with the print audit (Letter and A4, no near-empty pages).

## P. Storage keys and state conventions

Every key starts with the product's `storage.key` (e.g. `jps-shop-insights`):

| Key | What |
|---|---|
| `<key>-v1` | the data (localStorage), or its key inside IndexedDB `<key>-data` / store `kv` |
| `<key>-rail-collapsed` | `'1'` when the sidebar is collapsed |
| `<key>-welcome-v1` | `'1'` once the tour was closed |
| `<key>-backup-nudge` | time of the last weekly backup nudge |
| `<key>-manual-backup` | time of the last downloaded backup |
| IndexedDB `<key>-backup` / `handles` | the backup folder handle (starter; core uses its own backup DB) |

UI preferences that aren't data (rail collapsed, tour seen) live in localStorage, not in the state,
so a restore doesn't change them. Data preferences (theme, hidden views, currency, check-offs,
goals) live in `state.settings`, so they travel with backups.

State: `{version, app, settings:{name, theme, currency, symbol, entity, hiddenNav, …}, entities:[…], <records>…}`.
- Money is in integer cents, dates are `YYYY-MM-DD`, months are `YYYY-MM`.
- IDs come from `crypto.randomUUID()` with a fallback.
- `validate()` fills missing settings from `blank()` and drops broken records rather than failing
  the whole file.
