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
| `netlify/functions/recipe-parser.mjs` | Reads schema.org Recipe JSON-LD (incl. `@graph`, HowToSection), falls back to microdata, then Open Graph title/photo. |
| `dev-server.mjs` | Local preview with the function: `node dev-server.mjs` → http://localhost:8888 |
| `test/` | `parser.test.mjs` (parser + function), `smoke.mjs` (browser flows), `fixtures/` (synthetic pages). |

## Deploy (Netlify)

1. New site from this repo, **Base directory** `recipe-library-studio` (`netlify.toml` sets publish `site` and the functions folder).
2. That's it: the app calls `/.netlify/functions/import-recipe` on the same site.

## Test

`npm test` — build is current, 10 parser/function checks, and the browser smoke test (import a link, duplicate link,
partial page, 404, paste text, undo, reload, every screen in sample mode, dark theme, no sideways scroll at 390 px).

## Notes

- Some large sites block requests from cloud servers (403 / bot challenges). The app says so and offers
  "Paste the page text" with the link kept.
- `#import=<url>` on the app's address imports that link straight away (bookmarklet / phone share shortcuts).
- Backups from the first, offline edition (`RecipeLibrary_Backup_*.json`) restore here; recipes, collections,
  plans and the shopping list come across.
- `ALLOW_PRIVATE_URLS=1` lets the importer read localhost pages. Tests only; never set it on Netlify.
