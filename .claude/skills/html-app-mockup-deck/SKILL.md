---
name: html-app-mockup-deck
description: "Build Etsy (or other marketplace) listing mockup images for a digital product, especially a single-file HTML app, planner, tracker or template. The output is a self-contained HTML deck of 1500×1125 slides: centred headlines, a large real screenshot per slide, one slide per tab or feature, a themes grid, text you can click to edit, pictures you can swap by click or drag-and-drop, and the Etsy title, tags and description at the end. Use this whenever the user asks for listing images, mockups, product photos, carousel slides, 'Etsy mockups' or thumbnails for something they sell digitally, even if they don't say 'deck'."
---

# HTML app mockup deck

This skill produces `<Product>_Etsy_Mockups.html`: one scrollable page of 1500×1125 slides. The seller edits the page in the browser and screenshots each slide with DevTools → device toolbar → 1500×1125 → Capture screenshot. Read `references/design-rules.md` before writing any copy or choosing captures. It explains the layout choices (centring for Etsy's square crop, why there's no on-image label, capture ratio, and so on).

## Workflow

1. **Plan the slides with the user in mind.** Slide 1 is a dark hero: a short promise headline, 2–4 pills and a flagship screenshot. Then give each tab or feature one slide, alternating dark and light. Each slide has a 2–3 word eyebrow, a one-line headline and a one-line sub. If the product has themes, end with a themes grid (keep it even: 4×2, 3×2 or 2×2). Favour the product's strongest features, not a tour of every button.

2. **Capture screenshots** from the real app with `scripts/capture.js capture.json` (see the header comment for the config). Use the demo/sample data, show every optional nav item and dismiss modals. It writes `tab-<name>.jpg` at 1400px wide (ratio 1.6, 2× then downscaled, so nothing is upscaled) and `theme-<name>.jpg` at 920px wide. If the app is not a single HTML file, capture any way that respects the same sizes and ratios.

3. **Write `deck.json`** by copying `assets/example-deck.json` (a real 16-slide deck) and editing it:
   - `product`, `footer`, `images_dir`, `output`, `storage_prefix` (a unique localStorage prefix per product)
   - `brand`: the CSS vars `ink`, `bold` (dark slide background), `pop` (accent on dark), `paper`, `calm` (eyebrow colour on light). Match the product's palette.
   - `slides`: `{"kind":"hero"|"tab"|"themes", "dark", "label", "eyebrow", "headline", "sub", "image", "foot", "pills", "themes":[{name,image,swatch}], "columns"}`
   - `listing`: `title`, `tags` (13, each ≤ 20 chars), and `description` or `description_file` (plain text)
   HTML entities such as `&amp;` and `<br>` are allowed in the text fields.

4. **Build:** `python3 scripts/build_deck.py deck.json`. Fonts (Playfair Display and Montserrat, base64) come from `assets/fonts.css` unless `fonts_css` is set.

5. **Verify, all three:**
   - `python3 scripts/validate_deck.py <out.html>`: tags, scripts, images decode, pixel ratios. Needs PIL.
   - `node scripts/geom_deck.js <out.html>`: every slide 1500×1125, no overflow or overlapping text, headings inside the square crop.
   - `node scripts/swaptest.js <out.html> <any.png>`: expects 50px gutters and 4px corners, and checks click-replace, drop-replace, persistence, OFF toggle and reset. It uses slides s2–s5, so the deck needs at least 5 slides.
   Then screenshot a few slides with Playwright and look at them. Checks don't catch a bad crop.

6. Deliver the HTML. Remind the user to click text to edit and to click or drop an image to replace it.

## Tweaking the layout

All styling is in `assets/deck.css`. Key knobs: `.slide` padding `54px 50px 26px`, `.sub` `max-width:60ch`, `.shot` `flex:1 1 0` / radius 4px / `z-index:1` over the absolute `.foot`, and `.looks` grid `margin:30px 0 44px`. When changing the layout, re-run geom and swaptest, and update the swaptest expectations if you deliberately change the gutters or radius.
