# Packaging: from working app to Etsy listing

Everything for Shop Insights lives in `monthly-plan/listing-kit/shop-insights/` (scripts, configs,
copy) with outputs in `monthly-plan/listing-kit/`. Bakeweek Studio's kit is `bakeweek-studio/listing-kit/`.
Reuse the scripts; change the product names.

## 1. Demo data (for screenshots and the listing video)

- Synthetic, realistic, in the platform's exact file formats: e.g. `build/demo_data.js` writes three
  fictional shops (Fern & Fable Prints, Copper Kiln Ceramics, Plan & Page Studio) from Jan 2025 to
  Sep 2026, every file kind, seasonal curves, a few unsold listings, reviews with realistic text.
- Unique fictional buyer names (a shared name pool made "repeat buyers" look wrong).
- Output folder is git-ignored; ship it zipped (`Shop_Insights_Demo_Data.zip`) so the seller can
  record a video importing it like a buyer would.
- Generated logos for the demo entities (`logos/*.png`) so shop cards look finished.

## 2. Free trial (download) and hosted demo (web)

These are two different things; the user wants both:
- **Trial** (`build/make_trial.py` → `ShopInsightsTrial.html`): generated from the built full app by
  patches that each **assert their anchor** (a missing anchor fails the build; never hand-edit the
  output). Own storage namespace; limits on the user's own data (one entity, last 3 months), first
  section only on premium screens, locked screens with an upsell card, print/export/folder backup open
  the upsell; sample mode shows everything; a trial backup restores into the full app. `BUY_URL` at
  the top. Tested by `trial_test.js`. Be honest: it converts honest buyers; it isn't copy protection.
- **Hosted demo** (`app/src/snapshot.html` → `ShopInsightsDemo.html`, ~21 KB): a separate small page
  written for the web, **not** a copy of the app, so there is nothing to unlock ("inherently limited").
  It reads one entity's files and shows one report on the latest 3 months, then what the full app
  adds, with the buy link. No saving. `snapshot_test.js` proves it matches the full app to the cent
  and stores nothing. Host that one file as `index.html` (Netlify drag and drop).
- The user's `html-app-demo` skill covers trials in general; follow this section for house-style apps.

## 3. Listing photos

Use the `html-app-mockup-deck` skill (`.claude/skills/html-app-mockup-deck`):
- Capture from the real app with demo data imported the way a buyer would (`capture_demo.js`):
  every optional screen switched on, welcome dismissed, fixed clock, `reducedMotion`, 2× scale,
  ratio 1.6, saved 1400 px wide; themes at 920 px.
- Deck: hero + one slide per strongest feature, alternating dark/light, a "how it works" steps
  slide, a themes grid (even: 4×2). Headlines ≤ ~30 chars, subs ≤ ~80. Brand colors = the app's
  `--bold`, `--pop`, `--paper`, `--accent`.
- Validate (`validate_deck.py`, `geom_deck.js`, `swaptest.js` with a small PNG) and look at every slide.
- Export each slide as a **2000×1500 JPG** (`export_slides.js`) and zip them, so the seller doesn't
  screenshot anything.

## 4. How-it-works video

A self-contained HTML animation (`steps.src.html` → `make_steps.js`) with `seek(t)` for
frame-exact rendering: 3 steps (add your shop · drop in your files · review your summaries) over the
real screenshots. Render frames at 30 fps with Playwright, encode with ffmpeg from `imageio_ffmpeg`
(`pip install imageio-ffmpeg`): `libx264`, `yuv420p`, 1440×1080, `-crf 18 -movflags +faststart`.
Also export one still for the deck.

## 5. Buyer files

- `START_HERE.txt`: open the file in Chrome/Edge/Safari/Firefox; bookmark it; where data is saved;
  back up; how to update to a new version (restore your backup); support contact.
- `LICENSE.txt`: personal / own-business use by the purchaser; no resale or sharing; not affiliated
  with the platform; not tax/financial advice.
- A buyer guide (PDF, 10-12 pages, from the app's own screenshots) and an up-to-date in-app guide.
- Download ZIP: the app, START_HERE, LICENSE (and the guide).

## 6. Listing copy and packet

- Title ≤ 140 characters, keywords first; 13 tags ≤ 20 characters each.
- Description in plain text with real • bullets (Etsy strips markdown): the promise in one line,
  "Try it free first: [link]", works on (browsers, Mac & PC, offline, no login, no subscription),
  HOW IT WORKS (3 steps), WHAT YOU GET (one bullet per screen), PRIVACY, GOOD TO KNOW (digital
  download, best on computer/tablet, back up now and then, screenshots show made-up data,
  not affiliated, not tax advice). American English.
- Listing packet folder + zip: `1_Photos/`, `2_Video/`, `3_Digital_File/` (the download zip),
  `4_Extras/` (demo data, trial, hosted demo), `Listing_Text.txt` in the order Etsy asks for it: photos (upload order, which to drop
  first if fewer slots), video, title, about this listing, description, tags, materials, digital file,
  price & quantity, and a before-you-publish checklist.
