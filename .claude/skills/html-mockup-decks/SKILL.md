---
name: html-mockup-decks
description: "Build screenshot-ready Etsy mockup slide decks as self-contained HTML files, for ANY digital product type — PDF planners/journals/workbooks (screenshots pulled from the real PDF), HTML planner-generator \"studio\" products (tokenised multi-SKU listing decks), and interactive HTML products. Use whenever the user asks for mockups, Etsy listing images, product photos, a \"mockup deck,\" or a \"listing deck\" — even phrased loosely (\"make mockups for this,\" \"I need Etsy images,\" \"same idea as the last deck\"). Also trigger to fix or extend any deck built with this skill: orientation bugs, image sizing, added/removed slides, theme colors, copy edits, per-tier SKU variants, or layout overflow problems."
---

# Etsy HTML Mockup Decks

Builds a single self-contained HTML file of fixed-size slides that the user
screenshots (Chrome DevTools device toolbar → capture node screenshot) to
produce Etsy listing images. All visible copy is `contenteditable` so the
user personalizes before capturing. Never produce actual image files as the
deliverable — the HTML deck IS the deliverable.

## The three deck families

Identify which family the request belongs to FIRST — they have different
slide sizes, asset strategies, and build pipelines.

### Family A — PDF product mockup deck (1500×1125)
For a static PDF product (planner, journal, workbook, recipe book, notebook).
Assets are real page screenshots rendered from the uploaded PDF —
**never recreated in CSS, never fabricated**. Typically 11–14 slides.
Includes a live in-browser theme-color switcher (HSL auto-derivation from a
custom picker + preset palettes) so one deck previews all color variants.

### Family B — Product listing deck for HTML generator products (1500×1200)
For "planner studio" / generator products where the buyer receives access to
an HTML tool and builds their own planner. There's no PDF to screenshot —
the deck sells the *experience and system*: what you can build, how access
works, delivery timeline, licence terms. Built from a **tokenised template +
Python build script** so one template emits every SKU variant (tier ×
licence). See "Family B pipeline" below — this is the biggest addition over
the old skill.

### Family C — Interactive HTML app decks (1500×1125)
Single-file HTML apps, trackers, checklists, ticket generators. Assets are
real screenshots of the product running in a browser, captured with
Playwright. One slide per tab or feature, a themes grid if the product has
themes, and the Etsy title/tags/description block at the end. This family
has a working, config-driven pipeline in `family-c/` — see "Family C
pipeline" below. A separate `etsy-listing-kit` skill produces the full
4-file kit (listing text + guides + mockups); use that when the user wants
the whole kit, and this family when they want the deck.

## Family A pipeline (PDF products)

1. **Inspect the PDF before writing any layout code.**
   - `pdfinfo file.pdf` for page count and base size.
   - Check the rendered orientation of EVERY page you plan to use —
     individually. Planners mix portrait (cover, daily, index) and landscape
     (monthly/weekly grids) in one file:
     ```bash
     pdftoppm -jpeg -r 40 -f N -l N file.pdf /tmp/checkN
     python3 -c "from PIL import Image; im=Image.open('/tmp/checkN-0N.jpg'); print(im.size)"
     ```
   - `pdftotext -f N -l N file.pdf -` to map page numbers to section headers
     before rendering at full resolution.
   - Write down every asset page's orientation before touching layout code.
     Getting this wrong is the most-shipped bug in this workflow's history.
2. **Render only the pages you'll use** at 200dpi, downscale with PIL to
   ~950–1300px max dimension, JPEG quality ~84–90:
   ```bash
   pdftoppm -jpeg -r 200 -jpegopt quality=90 -f N -l N file.pdf assets/name
   ```
3. **Sample the cover for a default theme accent** (rough is fine — the live
   switcher lets the user override, including a custom picker that derives
   the full palette via HSL).
4. **Build the deck.** If a previous Family-A deck exists in the session or
   in the user's files, derive from it rather than writing CSS from scratch —
   the component system (hero, grid, feat-card, closeup+legend, iPad frame,
   hyperlink-chain, theme grid, CTA) is debugged and proven. Shipped examples
   to crib from: `my-bible-journal-etsy-mockups.html`,
   `my-planner-etsy-mockups.html`, `academic-planner-etsy-mockups.html`,
   `content-creator-planner-etsy-mockups.html` (user's outputs/Drive).
5. **Validate**: `python3 scripts/validate.py out.html` then
   `python3 scripts/geometry_check.py out.html`.
6. **Present via `present_files`.** Include DevTools screenshot instructions
   only for the user's first deck of the session.

## Family B pipeline (generator/studio products)

The proven implementation is in `references/`:
`listing_deck_template.html` (tokenised template) + `build_decks.py`
(SKU matrix builder). Derive new generator-product decks from these.

**Architecture:**
- One master template with `@@TOKEN@@` placeholders for everything that
  varies per SKU: `@@DECK_TITLE@@ @@STAT_BIG@@ @@STAT_SMALL@@ @@LIB_NOTE@@
  @@INC_TITLE@@ @@INC_BODY@@ @@ACCESS_TITLE@@ @@ACCESS_BODY@@ @@PRINT_PILL@@
  @@CHOOSE_BADGE@@ @@LIC_TITLE@@ @@LIC_BODY@@` plus per-tile lock tokens
  (`@@T2@@`…`@@T8@@`) that resolve to `""` or `" locked"` CSS classes.
- `build_decks.py` holds a `TIERS` dict (single / bundle3 / allaccess) × a
  `LICENCES` dict (personal / commercial) and emits every combination.
- **Blank-content guard**: if a licence body is empty, SKIP that SKU with a
  printed message rather than shipping a deck with an empty licence panel.
- **Cross-contamination guards**: assert per-SKU that wrong-tier copy can't
  leak (e.g. the single-tier deck must not contain "Unlimited Reprints";
  the commercial deck must not contain "No resale"). Add one assert per
  claim that differs across SKUs — these have caught real mistakes.
- Locked tiles: `.locked{opacity:.4;filter:grayscale(1)}` + a 🔒 badge via
  CSS `::after`. Unlocked count comes from the tier config.

**Slide inventory (11 slides, proven):**
1. Hero — "Build your digital planner" + spec pills (alternate outline /
   solid-plum fills), tier-varying reprint pill. No screenshot required —
   user often places real images post-build; leave clean space.
2. Private studio access (dark slide) — 4 icon rows: order-linked access,
   made for you, one full year, browser-based/no install.
3. Choose your planner — stat tile (tier-varying "1 / 3 / 30+"), choose
   badge, category tile grid with lock states, tier-specific library note.
4. Personalize — option icon rows + named color-swatch grid + highlight
   note-box.
5. Preview then download.
6. Hyperlinked navigation.
7. Included pages / page types.
8. Delivery timeline ("Sent within 6–24 hours" — keep windows honest and
   consistent across every slide that mentions timing).
9. What's included / one full year of access.
10. Color themes — paired card+label grid (see grid rule below).
11. How to order / CTA with delivery checklist.

**When the user gives image slots:** they may ask to strip placeholder
screenshots and place real images themselves. Remove the whole
`.shot` block cleanly and geometry-check that columns don't collapse.

## Family C pipeline (interactive HTML apps)

Everything lives in `family-c/`. Read `family-c/design-rules.md` before
writing copy or choosing captures.

1. **Plan slides.** Slide 1 is a dark hero (short promise headline, 2–4
   pills, flagship screenshot). Then one slide per tab/feature, alternating
   dark and light: 2–3 word eyebrow, one-line headline, one-line sub. End
   with a themes grid if the product has themes. Lead with the strongest
   features, not a tour of every button.
2. **Capture** with `node family-c/scripts/capture.js capture.json` (config
   documented in its header). Use the app's sample/demo data, show every
   optional nav item, dismiss modals. It writes `tab-<name>.jpg` at 1400px
   (ratio 1.6, captured at 2× then downscaled, so nothing is upscaled) and
   `theme-<name>.jpg` at 920px. For a dark-palette deck, set the theme in
   the capture `setup` and recapture — don't recolour screenshots.
3. **Configure** by copying `family-c/assets/example-deck.json` (a real
   16-slide deck): `product`, `footer`, `images_dir`, `output`, a unique
   `storage_prefix`, `brand` CSS vars (`bold` = dark-slide background), the
   `slides` list (`kind`: hero | tab | themes) and the `listing` block.
4. **Build:** `python3 family-c/scripts/build_deck.py deck.json`.
5. **Verify all three**, then look at a few slides — checks don't see a
   bad crop:
   - `python3 family-c/scripts/validate_deck.py out.html`
   - `node family-c/scripts/geom_deck.js out.html` (size, overflow, text
     overlap, headings inside the square crop)
   - `node family-c/scripts/swaptest.js out.html any.png` (50px gutters,
     4px corners, click/drop replace, persistence, OFF toggle, reset;
     needs ≥5 slides)

Family C decks let the seller replace any picture by clicking it or
dropping a file on it (persisted in localStorage, with ON/OFF and Reset in
the top bar). The on-image "replace" label is hidden inside slides — the
pointer rests on the slide when capturing, so it would end up in the
listing photo. A title tooltip does the job and never screenshots.

## Universal critical rules (hard-won — don't relitigate)

- **Every heading is centre-justified. No exceptions, every family, every
  slide.** Titles (`h1`/`h2`/`h3`), eyebrow labels and subtitles all get
  `text-align:center`. This is not a taste call: Etsy centre-crops listing
  images to a square, so a heading set flush left is the first thing the
  crop eats. Set it once as a base rule near the top of the stylesheet —
  `h1,h2,h3,.eyebrow,.sub{text-align:center}` — rather than per-slide, so
  new slides inherit it and can't drift. Body copy, feature lists, note
  boxes and table cells stay left-aligned; centring running text hurts
  readability and is not what this rule is about.
- **Etsy's 1:1 thumbnail crop.** Search thumbnails center-crop to square.
  For 1500×1125 that keeps the center 1125px (187.5px trimmed each side);
  for 1500×1200 the center 1200px. Critical content on every slide — not
  just the hero — stays inside that band. Centred headings satisfy this
  automatically; verify by measuring rendered content bbox, not by eye.
- **Dark screenshots on dark slides lose their edge.** At thumbnail size
  the capture stops reading as a screenshot. Give `.dark .shot` (and dark
  theme tiles) a 1px `rgba(255,255,255,.17)` outline with
  `outline-offset:-1px`, and set the slide background a shade lighter than
  the app's own dark background.
- **Orientation.** Never force a landscape page into a portrait box (or vice
  versa) via `object-fit:cover` — it crops into a wrong-looking sliver. Size
  containers to the real aspect ratio (~0.773 portrait US Letter, ~1.295
  landscape); default `object-fit:contain` as the safety net.
- **Mixed orientations in one grid**: split into orientation-matched rows
  (wide cells for landscape, narrow for portrait). Never average the box.
- **Grid item counts must divide evenly** into the column count — orphan
  cells on the last row have shipped and looked broken. 6 items → 3×2/6×1.
- **Paired card+label grids**: never build two separate grids (all cards,
  then all labels) and hope columns align — they drift. Wrap each
  card+label in one flex-column item and grid the items. This exact bug
  shipped on a theme-swatch slide and required a rebuild.
- **Etsy's photo cap is 20 per listing** (raised from 10 in Aug 2025 —
  re-verify via web search if much time has passed). Past ~15–16 slides,
  flag that extras go to social/Pinterest instead.
- **Scope type-scale changes.** When enlarging text globally, scope the
  class (e.g. `.mob` on slides 1–6 only) so slides with fixed-height
  containers don't overflow. Restructuring stable slides to "modernize"
  them has caused overlap regressions — prefer enlarging type within the
  existing layout over restructuring.
- **Inline-style one-off overrides** beat editing a shared class when a
  change applies to a single instance (e.g. one note-box getting a plum
  background) — shared classes are reused on other slides.
- **`white-space:nowrap` for must-be-one-line text**, then verify
  `scrollWidth <= clientWidth` in the geometry check.
- **CSS custom properties are required** in shipped files when a live theme
  switcher exists — never ship hardcoded resolved hex. Flattened copies for
  legacy-renderer QA are throwaways only.
- **Never fabricate the product.** Empty placeholders are shown as-is and
  framed as features ("add your own photos"). Faking finished content is a
  refund/bad-review risk — say so if the user leans that way.
- **JS string escaping.** Prefer double-quoted JS strings for copy with
  apostrophes. The `'Couldn\\'t'` double-backslash truncation bug shipped
  once and silently killed a whole script block — always `node --check`.
- **Style constraints don't carry between products.** Em-dash limits, shop
  name inclusion, "compatible with" lists are per-product; ask or check.

## Verification (mandatory after EVERY rebuild)

1. `python3 scripts/validate.py out.html` — static: unresolved tokens,
   TODO text, tag balance, per-script `node --check`, base64 image decode
   with pixel-ratio report.
2. `python3 scripts/geometry_check.py out1.html [out2.html …]` — rendered:
   Playwright walk of every element for out-of-slide bounds, `.pad`
   vertical overflow, fixed-container spill (`.right-card` etc), and
   horizontal scroll overflow.
   **Do not shortcut to a pad-scrollHeight-only check** — it misses
   absolute-position spill, sideways grid overflow, and elements rendering
   outside containers; all three have shipped as real bugs.
3. **Assert headings are actually centred**, in the rendered pass, on every
   slide — read `getComputedStyle(el).textAlign` for each heading and
   eyebrow, and confirm each heading's bbox centre sits within a few pixels
   of the slide's centre line. A stylesheet rule that a later selector
   overrides looks correct in the source and wrong in the picture.
4. For targeted changes, also assert the specific outcome (computed color,
   `white-space`, label text, unlock counts) via a one-off Playwright
   evaluate — "looks right in the code" is not verification.
5. For multi-SKU builds, run the checks on EVERY emitted deck, not just one.

## Copy & brand defaults

- All visible text `contenteditable="true" spellcheck="false"`. Don't
  over-polish; it's meant to be edited before screenshotting.
- Never fabricate reviews, ratings, urgency, or social proof.
- No shop name or "Etsy Digital Download" text unless requested per-product.
- "Compatible with" lists only genuinely relevant apps (GoodNotes/Notability
  safe for iPad-first products).
- Emoji in headings/pills only when the user asks (they do sometimes: 👋 🎨).
- Delivery-time claims must match across all slides mentioning them.

## Files in this skill

- `family-c/` — the Family C pipeline: `scripts/capture.js`,
  `scripts/build_deck.py`, `scripts/validate_deck.py`,
  `scripts/geom_deck.js`, `scripts/swaptest.js`; `assets/deck.css`,
  `assets/swap.js`, `assets/swap.css`, `assets/fonts.css` (Playfair Display
  + Montserrat, base64), `assets/example-deck.json`; and `design-rules.md`.
- `references/listing_deck_template.html` — the proven Family-B tokenised
  11-slide template (1500×1200): pill system, dark studio slide, lockable
  category tiles, paired theme-card grid, delivery checklist card.
- `references/build_decks.py` — SKU matrix builder: TIERS × LICENCES,
  blank-content skip guard, cross-contamination asserts, token resolution.
- `scripts/validate.py` — static checks (tokens, TODOs, tag balance, JS
  syntax, base64 decode + ratio report).
- `scripts/geometry_check.py` — rendered checks (OOB walk, pad overflow,
  container spill, horizontal overflow) via Playwright.
- Family A's original `build_template.py` was lost; derive Family-A decks
  from the shipped example decks listed above instead, and rebuild the
  helper library into `references/` the next time a Family-A deck is made.