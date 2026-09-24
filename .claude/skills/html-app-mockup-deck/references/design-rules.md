# Design rules and why they exist

Each of these was learned by getting it wrong once on a real listing.

## Slide geometry (1500 × 1125, Etsy 4:3)
- **Centre the headings.** Etsy crops the thumbnail to a centred 1125px square (x 187.5–1312.5). Left-aligned headings lose their first words. `geom_deck.js` reports headings that fall outside the crop.
- **One idea per slide.** Eyebrow (2–3 words), headline (one line, ≤ ~30 chars), sub (one line at `max-width:60ch`, ≤ ~80 chars). Let the screenshot do the talking.
- **The screenshot is 1400px wide** (50px side gutters), has 4px corners and fills the slide down to about 26px from the bottom. The footer sits *behind* it (`position:absolute; z-index:0`). It is optional decoration and may be covered.
- **One slide per tab/feature.** Buyers scroll images, not descriptions.
- Alternate dark and light slides so the carousel has rhythm.
- The themes grid must be even (4×2, 3×2, 2×2). No orphan tiles.

## Captures
- Capture at **ratio 1.6** at deviceScaleFactor 2, then downscale to 1400px wide. Never upscale: a soft screenshot reads as a cheap product.
- Crop from the **top-left** (`object-position:top`). The UI's most important content is at the top.
- Use **sample/demo data** with believable fictional figures, and say so in the footer.
- Close welcome modals and hide toasts. Show every optional nav item. Make sticky bars static if they would repeat in a clip.
- Clamp the clip origin to ≥ 0 when scrolling to an element, or Playwright throws.
- Keep aspect ratios close to the slot, or `object-fit:cover` cuts off whole panels. After changing the layout, re-capture rather than stretching.

## Editing affordances
- All text is `contenteditable`. Every `img[data-img]` can be swapped by clicking it or dropping a file on it. Swaps persist in localStorage, and there are Replace ON/OFF and Reset buttons in the top bar.
- **Never show an on-image "replace" label on a slide.** The pointer rests on the slide when the seller captures, so the label ends up in the listing photo. Use a `title` tooltip plus a pointer cursor instead, since neither shows in screenshots.
- Keep the top bar and slide labels **outside** the `.slide` elements for the same reason.

## Listing copy block
- Put it after the last slide as a `.listing` document, not a slide: title (≤ 140 chars, keywords first), 13 tags (≤ 20 chars each), and a plain-text description (Etsy strips markdown, so use real • bullets).
