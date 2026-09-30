# Recipe Library Studio

**Paste a recipe link. Build your personal recipe library.**

A local-first, installable, offline-capable PWA. Paste a recipe URL, a small Netlify Function fetches and parses the page, you review an editable preview, and the recipe is saved to a library that lives **on your device** (IndexedDB). No accounts, no database, no paid APIs, no AI.

> The previous contents of this repository (a single-file "Universal Data Dashboard Creator") were moved to `legacy/dashboard-creator/`.

## What it does

- **Import**: paste a link → Netlify Function → JSON-LD / microdata / heuristic extraction → editable **Import Preview** → Save. Friendly recovery screen when detection is partial (Try Again, Enter Recipe Manually, Paste Recipe Text, Open Original Recipe). Duplicate detection (same link / same title).
- **Library**: search (title, ingredients, tags, category, cuisine, notes, source, collections), filters, sorting, favorites, private 1–5 star rating, Recipe Inbox, collections, bulk actions.
- **Cooking**: detail screen built for the kitchen, serving scaling with clean fractions (½ ¼ ¾), safe US/Metric conversion, step timers (multiple, persistent), full-screen **Cooking Mode** with wake lock, "Made it" history, "My Notes", "My Version" copies that keep attribution.
- **Planning**: weekly meal planner, shopping list with aisle grouping and safe consolidation (1 onion + 2 onions + ½ onion = 3½ onions; 1 cup milk + 250 ml milk stay separate).
- **Ownership**: full JSON backup/restore (merge or replace), optional **Automatic Backup Folder** (File System Access API), print layouts (card / full page), single-recipe JSON export, 5 themes (Mono default).

## Project structure

```
index.html  manifest.json  service-worker.js  netlify.toml  package.json
css/styles.css              themes (tokens), layout, components, print
fonts/                      self-hosted Montserrat + Playfair Display (SIL OFL)
icons/                      PWA icons (icon.svg is the source; PNGs via scripts/make-icons.mjs)
src/
  app.js                    bootstrap, shell, timer tray, share-target, backup prompts
  db.js                     IndexedDB layer + versioned migrations
  recipes.js                data model, store, search/filter/sort, duplicates, history
  ingredients.js            parse / scale / convert / consolidate (shared with the function)
  importer.js               client importer: validation, throttle, cache, paste-text parsing
  images.js                 resize/compress (WebP), IndexedDB photo cache, lazy images
  collections.js  mealplanner.js  shopping.js  settings.js  timers.js  backup.js  pwa.js
  taxonomy.js  print.js  pickers.js  ui.js  router.js  state.js  util.js  icons.js  sample-data.js
  views/                    library, detail, editor, import, cook, collections, planner, shopping, settings, onboarding
functions/
  import-recipe.js          POST {url} → normalized recipe JSON
  fetch-image.js            POST {url} → image bytes (so photos can be cached locally)
  lib/                      html.js (tolerant parser), url-guard.js (SSRF), safe-fetch.js,
                            recipe-parser.js, rate-limit.js, common.js
scripts/                    build.mjs (dist + service-worker stamping), dev-server.mjs, make-icons.mjs
test/                       node unit tests, HTML fixtures, Playwright end-to-end suite
```

## Run locally

```bash
npm install                 # only installs a dev dependency for the e2e tests
npm run dev                 # zero-dependency server on http://localhost:8888 (static files + functions)
# or, closest to production:
npx netlify-cli dev         # serves the source tree and the functions (no build step needed)
```

Recipe imports work in both because the function lives at `/.netlify/functions/import-recipe` on the same origin. If you serve the static files some other way, imports show "The recipe importer is not running here." To point at a function host, run `localStorage.rls_function_base = 'http://localhost:8888'` in the console (note the CSP allows only same-origin `connect-src`).

### Testing imports

- `test/fixtures/*.html` are offline pages covering simple JSON-LD, `@graph`, multiple scripts, HowToStep, HowToSection, missing image/times, malformed JSON-LD, no schema, Open Graph fallback, non-recipe, microdata and heading-based pages.
- `npm test` — unit tests (parser, SSRF guard, fetcher against a local server, handlers, ingredients, backup logic helpers, theme contrast). No network needed.
- `npm run test:e2e` — builds `dist/`, serves it with the functions, runs a fixture "recipe website", and drives Chromium through the acceptance flow (import → preview → save → reopen → search → offline → edit → notes → favorite/rate → collections → meal plan → shopping → backup/restore/merge → folder backup, plus layout, accessibility, security, performance). Requires Chromium (`PLAYWRIGHT_BROWSERS_PATH`) and `npm install`. Filter with `npm run test:e2e -- "import"`.
- To try a real site, open the app and paste its URL.

## Deploy to Netlify

1. Push the repo and connect it in Netlify (or `npx netlify-cli deploy --prod`).
2. That's it. `netlify.toml` sets the build (`node scripts/build.mjs` → `dist/`), functions directory, security headers (strict CSP), and cache headers. **No environment variables or secrets are required.**

Optional: `ALLOWED_ORIGINS` (comma-separated hostnames) if you serve the front-end from a different host than the function.

## How it works

### Importing
1. The client cleans the pasted text, checks for a same-link duplicate (before any network call), throttles (≥1.5 s between imports, ≤8/min) and caches results for 10 minutes.
2. `import-recipe` validates the URL, fetches with limits, then extracts in layers: **JSON-LD** `Recipe` (single object, arrays, `@graph` with `@id` references, several blocks, malformed-but-recoverable JSON) → **microdata** → **heuristics** (Open Graph, `<title>`, meta description, ingredient/instruction containers, "Ingredients"/"Directions" headings). Everything is tag-stripped, entity-decoded and length-capped; only plain data is returned.
3. The client shows the editable preview. Nothing is saved until you press **Save Recipe**. The photo is downloaded through `fetch-image`, resized (≤1400 px, WebP when supported) and stored in IndexedDB.

### Data (IndexedDB `recipe-library-studio`)
Stores: `recipes`, `images`, `collections`, `mealPlans`, `shoppingLists`, `settings`, `history`, `backupMeta`. Only the theme is mirrored to `localStorage` (to avoid a flash). **Migrations:** bump `DB_VERSION` in `src/db.js` and add `MIGRATIONS[n]`; record-shape changes are handled lazily by `normalizeRecipe()` (`schemaVersion`), so older rows keep working and no user data is rewritten destructively.

### PWA & caching
`scripts/build.mjs` stamps `service-worker.js` with a content hash and the precache list. The shell is cache-first (works fully offline), navigations return `/index.html`, functions and cross-origin requests are never cached. A new version waits until you tap **Reload** in the update banner (never mid-edit). Recipe photos are served from IndexedDB, so they work offline too.

### Backups
- **Export Full Backup** → `RecipeLibrary_Backup_YYYY-MM-DD.json` (recipes, collections, meal plans, shopping lists, settings, history, photos, app/backup version, timestamp).
- **Restore** validates the file, shows a summary (e.g. "142 Recipes, 12 Collections…"), then **Merge** (newest edit wins, nothing deleted) or **Replace** (atomic single transaction; existing data is untouched if anything fails).
- **Automatic Backup Folder** (Off / Daily / Every 3 Days / Weekly; retention: keep all / 7 / 14 / 30): you choose a folder (which may be inside a Dropbox/Drive/OneDrive/iCloud sync folder) and a backup is written **when the app is opened and enough time has passed**. An installed web app cannot run while closed, so nothing happens in the background. Retention only deletes files this app named `RecipeLibrary_Backup_YYYY-MM-DD.json`, and only if you turn it on.

## Known browser limitations

| Feature | Support |
|---|---|
| Automatic Backup Folder (File System Access API) | Chrome / Edge / Opera / other Chromium on desktop and Android. **Not** Firefox or Safari/iOS — there the app offers "Export Full Backup" and a backup *reminder* on your chosen schedule. Browsers may re-ask for folder permission after a restart (a banner offers one tap to allow). |
| Wake Lock (screen stays on in Cooking Mode) | Chromium, Safari 16.4+, Firefox 126+. Otherwise a message suggests adjusting auto-lock. |
| Timer notifications | Optional; need permission and (for installed apps) a supporting browser. In-app banner, sound and vibration always work while the app is open. On iOS, notifications require the app installed to the Home Screen. |
| Install | Chromium shows an install prompt; on iOS use Share → Add to Home Screen. |
| Storage | Browsers may evict site data under pressure; **Settings → Protect my data** requests persistent storage. Keep backups. |

## Troubleshooting imports

| Message | Meaning / next step |
|---|---|
| This website blocked automatic recipe importing. | The site returned 401/403. Open the original, use **Paste Recipe Text** or enter manually. |
| We found the page but couldn't detect structured recipe information. | No recipe data found; partial fields (title/photo) are still pre-filled. |
| The website took too long to respond. | 8-second fetch limit. Try again. |
| This link doesn't appear to be a webpage. | PDF/image/other. |
| The recipe importer is not running here. | Use `npm run dev` or `netlify dev`. |
| You appear to be offline. | Importing links needs internet; everything else works offline. |

## Security considerations

- **SSRF**: http/https only, ports 80/443, no credentials, no IP literals, no localhost/`.local`/`.internal`/single-label hosts; DNS results are checked **at connect time** (blocks rebinding and public names resolving to private/link-local/metadata addresses, IPv4 and IPv6 incl. mapped/NAT64/6to4); every redirect hop is re-validated; ≤4 redirects, loop detection, no https→http downgrade.
- **Resource limits**: 8 s total timeout, 3 MB decompressed page cap (compression-bomb safe), 3.5 MB images (sniffed by magic bytes; SVG rejected), HTML-only content types.
- **Abuse protection** (no login needed): same-origin check on the function, in-memory per-IP rate limit, client throttle + cache, small payloads. It's best-effort by design.
- **No stored or logged content**: the function is stateless; logs contain only status codes and timings.
- **Output safety**: the function returns plain data. The app builds all DOM with `createElement`/`textContent` (no `innerHTML` anywhere), allows only `http(s)` URLs in links/images, and ships a strict CSP (`script-src 'self'`, no inline script/style).
- **Copyright-aware**: only the single URL you submit is fetched; attribution and source link are kept and can't be removed; there is no sharing, publishing or crawling.

## Accessibility & performance

Semantic landmarks, skip link, labelled controls, native `<dialog>` with focus management, visible focus, 44 px targets, no hover-only actions, `aria-pressed/checked` state (never colour alone), reduced-motion support, WCAG AA contrast for every theme (tested). The library renders in chunks with cached cards and lazy thumbnails; tested with 2,000 recipes.

## Licenses

Code: MIT. Fonts: Montserrat and Playfair Display, SIL Open Font License 1.1. Sample recipes are fictional.
