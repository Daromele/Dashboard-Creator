# Design system: the Shop Insights look

The source of truth is `monthly-plan/app/src/core.html` (tokens, frame, core components) and the
`<style>` block in `monthly-plan/app/src/etsy.js` (the `kit-` components: tones, icons, chart kit,
sortable tables, insights cards). `assets/starter.html` carries the same values. When this file and
the code disagree, the code wins; update this file.

Feel: calm, warm, premium, "a finance app a designer made". Paper, not white. One dark, bold
surface per screen (the hero), everything else quiet. Color carries meaning, never decoration.

## 1. Tokens

Every color, space and radius is a CSS variable on `:root`, redefined per theme under
`:root[data-theme="<name>"]`. Components only ever use variables, so a theme is just a token block.

### Roles (every theme defines all of these)

| Token | Role |
|---|---|
| `--paper` | page background (never pure white) |
| `--card` | cards and tiles |
| `--sunk` | recessed areas: table headers, segmented controls, meters, inner boxes |
| `--ink`, `--ink-2`, `--ink-3` | text: primary, secondary, tertiary (labels, notes, axes) |
| `--rule`, `--rule-2` | hairlines, input borders |
| `--accent`, `--accent-ink`, `--accent-soft`, `--accent-line` | links, primary button, focus, "net" tone |
| `--calm` | eyebrow and small calm highlights |
| `--flag`, `--flag-soft` | warnings that are not errors (estimated, backup reminder) |
| `--bold`, `--bold-2` | the hero panel and the sidebar (`--bold-2` is a step darker) |
| `--on-bold`, `--on-bold-dim` | text on the bold surfaces |
| `--pop`, `--pop-ink` | the one bright note: active nav marker, primary CTA on the hero, stars |
| `--ok`, `--over` | status: green = money in or good; red = money out or bad |
| `--ok-1..4`, `--ov-1..4` | tints of the two statuses, light to strong |
| `--ch-in`, `--ch-out` | chart income / expense series |
| `--cat-1..6` | categorical hues in a **fixed order**, `--cat-6` grey = "Other" |

### Kiln (Shop Insights' default; warm clay)

```css
--paper:#FBF8F5; --card:#FFFFFF; --sunk:#F4EEE8;
--ink:#221A15; --ink-2:#5E5048; --ink-3:#8C7E75;
--rule:#EEE5DD; --rule-2:#DFD2C6;
--accent:#A4471F; --accent-ink:#FFFFFF; --accent-soft:#FAEDE6; --accent-line:#EFD6C8;
--calm:#3F7A66; --flag:#9A5B24; --flag-soft:#F7EFE6;
--bold:#3A2419; --bold-2:#2D1B12; --on-bold:#FBF3EE; --on-bold-dim:#CBB3A5;
--pop:#F2B441; --pop-ink:#2A1F06;
--ch-in:#1F7A52; --ch-out:#B5652A;
/* shared by every light theme */
--ok:#1F7A52; --over:#D23B2B;
--ok-1:#E4F1EA; --ok-2:#B4D9C6; --ok-3:#74B899; --ok-4:#1F7A52;
--ov-1:#FBE6E3; --ov-2:#F3C2BB; --ov-3:#E58275; --ov-4:#D23B2B;
--cat-1:#5C3F8F; --cat-2:#DD9012; --cat-3:#2478D4; --cat-4:#B8309A; --cat-5:#12A5A0; --cat-6:#8A8296;
```

Green and red are **not** in the categorical set: they mean status. Every status use has a second
cue (sign, label, arrow, hatch) for color-blind buyers.

### The 8 themes

Pick the default to suit the product, then offer the rest in Settings (a palette picker with a live
mini preview per theme). Shop Insights ships `kiln, ledger, sage, linen, fjord, slate, night, midnight`;
Monthly Plan ships `lavender, sage, linen, fjord, blush, slate, night, midnight`.

| Theme | paper | accent | bold | pop | Mood |
|---|---|---|---|---|---|
| kiln | #FBF8F5 | #A4471F | #3A2419 | #F2B441 | warm clay (Shop Insights) |
| ledger | #F6F7F5 | #1F7A5C | #182635 | #E3A73B | banker green + navy (Profit Plan) |
| sage | #FAFAF8 | #2F5D50 | #1F4A3E | #F2B441 | soft green |
| linen | #F7F4ED | #6B5B45 | #45392A | #E8A24A | natural, beige |
| fjord | #F6F8FA | #2C5470 | #1C3C52 | #F0A93C | cool blue |
| slate | #F8F9FA | #3F4A55 | #2E3841 | #EFA93F | neutral grey |
| lavender | #FAF9FC | #5C3F8F | #2E2040 | #F0B98F | Monthly Plan |
| blush | #FBF6F8 | #7C3560 | #63304A | #E9A85C | rose |
| night (dark) | #141218 | #C3A9E8 | #221C2C | #F0B98F | dark purple-grey |
| midnight (dark) | #0C1720 | #9DB8F5 | #0B303D | #F5C382 | dark teal-navy |

Dark themes redefine the status steps against the dark surface; they're chosen, not flipped:
night `--ok:#3E9E72; --over:#D6584A`, midnight `--ok:#67C99B; --over:#F18477`, with darker
`--ok-1..3/--ov-1..3` and heavier shadows. The full blocks are in `assets/starter.html`. Set
`color-scheme:dark` in dark themes so form controls follow.

### Space, radius, shadow, layout

```css
--s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:20px; --s6:24px; --s7:32px; --s8:40px;   /* 4px scale */
--r-lg:18px; --r-md:14px; --r-sm:10px; --r-xs:8px;
--shadow-sm:0 1px 2px rgba(27,21,36,.05),0 1px 1px rgba(27,21,36,.03);
--shadow-md:0 6px 20px -6px rgba(27,21,36,.12),0 1px 3px rgba(27,21,36,.05);
--shadow-lg:0 24px 60px -12px rgba(27,21,36,.24),0 2px 8px rgba(27,21,36,.08);
--rail:258px; --tap:44px;   /* page max-width 1400px */
```

## 2. Type

- UI: **DM Sans** (`--ui`), numbers and headings: **Manrope** (`--num`), both variable woff2 embedded
  as base64 (`assets/fonts.css`), with system fallbacks. Never load Google Fonts at runtime.
- Body 15px/1.55. `h1` clamp(26px, 3vw, 32px) on page heads, 700, letter-spacing -.02em,
  `text-wrap:balance`. `h2` (card titles) 17px 700. `h3` 14px 700.
- Eyebrow: 10px, uppercase, letter-spacing .14em, 700, `--ink-3`.
- Money and counts: `.number` = Manrope + `font-variant-numeric:tabular-nums`, letter-spacing -.02em.
  Right-align number columns (`.num`).
- Hero number: clamp(56px, 8vw, 104px), line-height 1. The user asked for the take-home "2-3× bigger";
  the hero number is the loudest thing in the app.
- KPI value: 700 clamp(20px, 2vw, 26px).

## 3. Frame

```
┌ rail (258px, --bold-2, sticky, full height) ┬ topbar (sticky, --paper) ──────────────────────┐
│ brand mark (34px square, --pop) + name       │ month/period switch · entity picker · actions   │
│ + tiny publisher line (9px, .16em)            ├─────────────────────────────────────────────────┤
│ NAV GROUP (10px caps)                         │ .page  max-width 1400px, padding 24px 32px 40px │
│  navlink (40px high, icon + label)            │  pagehead: eyebrow · h1 · subtitle | actions    │
│  active: #ffffff16 bg + 3px --pop bar at left │  [pulse strip]                                  │
│ ...                                           │  hero (dark)                                    │
│ rail-foot: short promise in 2 lines,          │  KPI row (4 per row)                            │
│  "Saved on this device" status, backup link   │  cards (grid2 / equal / grid3)                  │
└───────────────────────────────────────────────┴─────────────────────────────────────────────────┘
```

- **Rail**: dark (`--bold-2`), groups with 10px caps labels, links with 18px stroke icons, a
  collapsible "mini" mode. Under 900px it becomes an off-canvas drawer with a scrim and a menu
  button. The rail foot carries a two-line product promise (`railNote`) and the save status.
- **Hubs**: a sidebar item may own several screens; they appear as `.segment.hub-tabs` at the top
  of the page. Every screen id still works with `go(id)`.
- **Topbar**: one continuous bar the color of the paper; the period control (‹ Month Year ›, plus a
  calendar input painted in `--accent` with a mask), the entity picker (shop, property, client...),
  then quiet buttons (Guide, Backup, Print).
- **Banners** under the topbar: sample mode (`.demo-banner`, `--sunk`), backup reminder
  (`.backup-banner`, `--flag-soft`), storage problem (red, with Download backup).
- Breakpoints: 1550+ roomier; ≤1150 rail 220px; ≤900 drawer; ≤760 cards one column; ≤620 phone
  paddings (16px gutters). No horizontal page scroll at 390px; wide tables scroll inside `.table-wrap`.

## 4. Components

### Page head
Eyebrow (the period or the section: "SEPTEMBER 2026"), `h1` that says what the page is about in
plain words ("All shops at a glance"), optional one-line subtitle (max 62ch, `--ink-2`), actions on the
right (quiet buttons; at most one primary).

### Buttons
`.btn` quiet by default (card bg, `--rule-2` border, 600 13px, 36px high, radius 10). One `.primary`
(accent) per view. `.pop` only on the dark hero. `.danger` is red text only. `.small` 30px. `.link`
= accent text with a thin accent underline. Icon buttons `.ibtn` 32px.

### Hero (one per main screen)
Dark panel (`--bold`, radius 18, padding 24px 32px), grid `1.3fr 1fr`:
- Left: eyebrow ("TAKE-HOME · SEPTEMBER 2026"), the huge number, one sentence of meaning with the key
  share in bold ("What your shops kept from $9,611 of sales after every Etsy fee: **85%** of every
  dollar, across 407 orders."), then a `.pop` CTA and a quiet outline button.
- Right, behind a 1px `#ffffff1f` divider: 3-5 `hero-fact` rows (label left, Manrope 17px value
  right), a 6px meter (share kept, in `--ok`), and one more fact.
- A soft radial glow in the bottom-right corner (a `:before` gradient of `--pop` at low alpha). No
  other gradients anywhere: the user rejected gradient KPI cards ("use solid colors").
- The **pulse strip** sits *above* the hero: a pale tinted bar with one insight at a time ("● Best
  seller this month: …"), dots plus ‹ › round arrow buttons.

### KPI tiles (`.kpis` grid of 4; 2 per row under 1100px)
- Card with label (12px `--ink-2`), value (Manrope 700), a sparkline (120×30, max 140px wide), and a
  note (11px `--ink-3`, e.g. "−6% vs last month (435)").
- **Tone tint, solid**, picked from the label: money in / good → `color-mix(in srgb,var(--ok) 11%,var(--card))`;
  costs → `var(--over) 10%`; net / profit / cash flow → `var(--accent) 12%`; neutral → `--sunk`. No
  shadow on tinted tiles.
- **Icon** at the start of the label on the important screens: a 26px rounded square
  (`color-mix(var(--tc) 16%, card)`) holding a 14px stroke icon in the tone color. Not on every
  screen: they wrapped text when numbers got long, so the Insights "parts" row went back to no icons.
- **Direction color**: the sparkline and the "+/−%" note are green when the change is good for the
  user and red when bad. For a cost, going up is bad.
- Wording: labels are the plain question ("Paid out to your bank", "Average order"), never codes.

### Cards
`.card` (card bg, radius 14, padding 20, `--shadow-sm`). `.cardhead`: `h2` (with an optional 28px
tinted icon square before it, **vertically centered with the text**; misalignment was a reported bug),
a 12px `--ink-3` note under it, actions right (segmented period, "See all"). Grids: `.grid2`
(1.3fr 1fr), `.equal` (1fr 1fr), `.grid3`. **Cards in a row match heights**; a table beside a chart
matches the chart's height and pages instead of growing. No big dead space: "no need to only do two
column sections per page when there is a lot of dead space". Use 3-4 columns of compact detail instead.

### Rows, meters, pills, notices, empty states
- `.row` label/value lines with hairline dividers; notes in `small`.
- Meters 4-6px, rounded, `--sunk` track. Over-plan meters are red **and hatched**.
- `.pill` 11px on `--sunk`; `.pill.good`/`.warn` tinted.
- `.notice` (accent-soft) and `.notice.warning` (flag-soft) for one-line explanations with an action.
- Refused or problem notices must be impossible to miss: red-tinted box, bold first word.
- `.empty`: icon, h3, one sentence, one button ("Import your first file", "Try the sample").
  Never show a wall of $0.00; say what's missing and which file brings it.

### Tables
- `th` 10px caps on `--sunk`, `td` 13px with hairlines, hover row in `--accent-soft`, numbers right
  in tabular Manrope. Totals rows pinned at the bottom.
- **Sortable everywhere**: every plain table gets clickable, keyboard-focusable headings with
  `aria-sort` and ↑/↓. The sort persists across re-renders (keyed by card title + headers). Values
  come from `data-v` when present, else parsed from text ($, commas, −, parentheses). See
  `sortTables()` in `etsy.js` and the starter.
- **Paged**: ~15 rows with Previous / Next and "1-15 of 83" (`.kit-pager`), so the card keeps the
  height of its neighbor.
- Long names wrap to two lines (`-webkit-line-clamp:2`) instead of pushing the right columns out.
- Filterable lists get a search box plus a kind filter plus date sort (Imported files).
- A "% sold" style ratio goes in its own column with a mini bar (`.kit-pct`, 56×6px, green).

### Segmented controls and periods
`.segment` (`--sunk` pill track, active button on `--card` with `--shadow-sm`, accent text). Every
screen with a period offers **Month · Quarter · Year · All time · Custom** (custom shows From/To
date inputs inline). "Quarter" is the picked month's quarter.

### Dialogs, toast
- Native `<dialog>` with a title, one sentence, fields in a 2-column `.fields` grid, primary action
  right. Focus returns to the opener on close.
- Toast: bottom center, `--bold-2` bg, `--on-bold` text, **Undo** in `--pop`, 6.5 s.

### Shop / entity cards (grid is the default, table is the option)
16:9 picture area tinted from the logo's dominant color until a photo is added, a 72px rounded logo
overlapping the picture edge, name, big number, a 2-column list of small facts, a 6px meter. Upload
buttons appear on hover. Logos are `object-fit:contain`, photos `cover`.

### Insights ("now what")
- A health hero tinted by its state (`--t` = ok, flag or over at ~9%), a 132px score ring, a lead
  sentence, and part tiles with bars.
- Action cards: tinted, 4px left border in the state color, icon square, title, one sentence, a
  **check-off box** at the top right (checked cards strike through and fade; state saved per period).
- The legend uses **colored dots**: "● needs fixing ● worth a look ● working". Never spell the colors.

## 5. Charts (the `kit` chart kit)

Principles the user set:
- **Mix chart types.** "Default to pie charts when percentages are the goal of the comparison…
  otherwise mix it up." Share of a whole → pie/donut; one share against the whole → gauge; change
  over time → line or columns; parts per period → stacked columns; two measures → scatter;
  month × year → heat table; ranking → horizontal rank bars.
- **Donut above its legend**, centered, never beside it; the legend rows are `dot · name (+note) ·
  % · value`, full width, with straight (not rounded) dividers between segments.
- **Flat bars**: square corners, **no white gaps** between stacked segments ("no curved edges or
  prominent white line to divide the colors").
- **Value labels on top of bars** (compact money: $9.6k), so the chart reads without hover.
- At most 5 slices, then a grey "Other (n more)". Hues in fixed order `--cat-1..5`, never cycled.
- An entity (shop) keeps **one color everywhere**: its position in the user's list, not its rank.
- Axes at the bottom of the container; count charts label counts, not dollars; a line chart on its
  own scale (ratings, %) doesn't borrow the money axis.
- "Less is more": the most important series bold, the rest quiet or removed.
- Tooltips (dark, `--bold-2`) add detail; they never hold the only copy of a number.
- Every chart has `role="img"` and an `aria-label`. Hover and focus scale points/segments slightly.

Implementations to copy (all SVG strings, no library): `pie()`, `gauge()`, `spark()`, `line()`,
`stack()` (with an optional line overlay on the same scale), `scatter()`, `heat()` in
`monthly-plan/app/src/etsy.js` ("chart kit"), and the same functions in `assets/starter.html`.

## 6. Icons

Inline SVG, 24×24 viewBox, `fill:none; stroke:currentColor; stroke-width:1.6` (1.9-2 inside small
tinted squares), round caps and joins. The core's set (`ICON` in core.html): today, outlook, spark,
print, help, palette, wallet, shield, compass, tags, coins, umbrella, globe, down, up, table, link,
history, trash, edit, plan, log, calendar, insights, review, check, chev, plus, cross, left, right.
Use icons where they help scanning (KPI labels on main screens, card titles, file kinds, action
cards), "don't overdo it", and never where they make labels wrap.

## 7. Motion ("make the app feel alive")

- Tiles rise in (`rise`, 6px, staggered), numbers count up (`data-count`), bars grow from the
  baseline, lines draw, donut segments pop in with an 80 ms stagger, gauges fill, points pulse once.
- Hover: tiles lift 2px with `--shadow-md`; segments scale 1.045.
- **All of it off** under `prefers-reduced-motion: reduce` and in `@media print`. Captures for
  listings use `reducedMotion:'reduce'` so numbers are final. Only animate `stroke-dasharray` on
  lines. A reduced-motion rule that cleared dasharray once turned every donut into a single color.

## 8. Print

- `@media print`: hide rail, topbar, buttons, toasts, dialogs and banners; white background; 11px
  body; cards `break-inside:auto` so long cards flow across pages, while charts, KPI boxes, rows and
  headings stay whole; table headers repeat; `print-color-adjust:exact` on tinted key rows.
- The report's period prints large and bold at the top right; the business name heads it.
- `build/print_audit.js` prints every screen on Letter and A4 and fails on near-empty pages. It
  found 16 of 62 printouts broken before the rule above.

## 9. Voice and copy

- American English. Short, warm, concrete, second person: "What your shops kept", "Paid out to
  your bank", "Do this next".
- Say what a number means and where it comes from ("from your sold orders", "estimated until you
  import September's statement"). Mark estimates visibly.
- Name the file that fills an empty section ("Import your listings file to see listing health").
- Don't say "tick", "colour", "favourite". Don't name colors in instructions; show a dot.
- Money: currency from settings via `Intl.NumberFormat`; a zero cost is `$0.00`, never `-$0.00`.
- Disclaimers where they matter: "Not affiliated with Etsy, Inc.", "It organizes your records;
  it is not tax advice."
