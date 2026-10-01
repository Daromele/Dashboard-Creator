# Recipe Library Studio

Save any recipe from a link: ingredients, steps, times, servings, nutrition and photo, without the clutter.
Plan the week, shop from one list sorted by aisle, and cook from a calm step-by-step view.
Recipes are stored in the buyer's browser (IndexedDB); only the link being imported is sent to the server.

## What's where

| Path | What |
|---|---|
| `src/app.html` | The app source (one file: CSS, logic, screens). Edit this. |
| `src/fonts.css` | Embedded DM Sans + Manrope, inlined at build. |
| `build.mjs` | Builds `site/index.html` (`--check` fails when it's stale). |
| `site/index.html` | The built app Netlify serves. Committed, so deploys need no build. |
| `netlify/functions/import-recipe.mjs` | `POST {url}` → recipe JSON. Fetches the page server-side (browsers can't, CORS). Blocks private/local addresses on every redirect, 10 s timeout, 4 MB cap, 20 imports/min per visitor per warm instance. |
| `netlify/lib/recipe-parser.mjs` | Reads schema.org Recipe JSON-LD (incl. `@graph`, HowToSection), falls back to microdata, then Open Graph title/photo. |
| `src/sw.js` | Offline service worker; the build stamps it with a hash of the app so each deploy refreshes the cache. |
| `site/manifest.webmanifest`, `site/icons/` | Install as an app (PWA): name, icons, Android share target (`?url=` imports). Icons come from `make-icons.mjs`. |
| `dev-server.mjs` | Local preview with the function: `node dev-server.mjs` → http://localhost:8888 |
| `test/` | `parser.test.mjs` (parser + function), `smoke.mjs` (browser flows), `fixtures/` (synthetic pages). |

## Deploy (Netlify)

1. New site from this repo, **Base directory** `recipe-library-studio` (`netlify.toml` sets publish `site` and the functions folder).
2. That's it: the app calls `/.netlify/functions/import-recipe` on the same site.

## Test

`node test/spacing.mjs`: no two controls closer than 8px, no button against the bottom of its card, every screen at 1440 and 390 px.

`npm test` — build is current, 10 parser/function checks, and the browser smoke test (import a link, duplicate link,
partial page, 404, paste text, undo, reload, every screen in sample mode, dark theme, no sideways scroll at 390 px).

## Print and PDF

Recipes, the shopping list, the week plan and the recipe book print from `#print-root`: a document built for paper
(US Letter or A4, page breaks, Playfair Display headings), shown only while printing. "Save as PDF" in the print
window gives a crisp, text-based PDF. The dashboard still prints the screen.

## Notes

- Some large sites block requests from cloud servers (403 / bot challenges). The app says so and offers
  "Paste the page text" with the link kept.
- `#import=<url>` on the app's address imports that link straight away (bookmarklet / phone share shortcuts).
- Backups from the first, offline edition (`RecipeLibrary_Backup_*.json`) restore here; recipes, collections,
  plans and the shopping list come across.
- `ALLOW_PRIVATE_URLS=1` lets the importer read localhost pages. Tests only; never set it on Netlify.
