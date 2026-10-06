# Book Library Studio

Add any book from a link, an ISBN or its title: cover, author, pages, genres and description fill in by themselves.
Track what you read (progress, finish dates, ratings, quotes, notes), set a yearly goal, and print your year in books.
Moving from Goodreads or StoryGraph: import their CSV export. Books are stored in the buyer's browser (IndexedDB).

## Where book details come from

| What | How |
|---|---|
| ISBN, title search, covers | The browser asks **Open Library** (`openlibrary.org`, `covers.openlibrary.org`) directly; **Google Books** is the fallback. No keys. Only the ISBN or title is sent. |
| Links | Most links carry the book's number and are read in the browser: Amazon `/dp/` (ISBN-10), `?ean=`/`?isbn=` (Bookshop.org, Barnes & Noble), an ISBN-13 in the path (Waterstones, Booktopia, Indigo), Open Library and Google Books ids. Goodreads and Kindle links are searched by the title in the link. |
| Other links | `POST /.netlify/functions/resolve-book-link {url}` follows short links (a.co, amzn.to) and reads bookshop or publisher pages for their schema.org Book data, ISBN and title. Amazon pages are never fetched, only their address. |

## What's where

| Path | What |
|---|---|
| `src/app.html` | The app source (one file: CSS, logic, screens). Edit this. |
| `src/fonts.css` | Embedded DM Sans, Manrope and Playfair Display, inlined at build. |
| `build.mjs` | Builds `site/index.html` and `site/sw.js` (`--check` fails when they're stale). |
| `site/` | What Netlify serves. Committed, so deploys need no build. |
| `netlify/functions/resolve-book-link.mjs`, `netlify/lib/` | The link reader: private/local addresses blocked on every redirect, 10 s timeout, 4 MB cap, 20 links/min per visitor per warm instance. |
| `netlify/functions/google-books.mjs` | Only used when Google refuses a keyless lookup: repeats it with `GOOGLE_BOOKS_KEY` (a Netlify environment variable, never in the page). Books searches and volume ids only; answers cached a day by Netlify's CDN; 30 lookups a minute per visitor per instance. Set the global cap in Google Cloud → Books API → Quotas. |
| `make-icons.mjs` | Draws `site/icons/*.png`. |
| `dev-server.mjs` | Local preview with the function: `node dev-server.mjs` → http://localhost:8888 |
| `test/` | `books.test.mjs` (ISBNs, link reader, link/CSV/status/merge logic), `smoke.mjs` (browser flows, catalogs answered by `catalog.mjs`), `spacing.mjs` (no touching controls at 1440 and 390 px). |

## Deploy (Netlify)

New site from this repo, **Base directory** `book-library-studio`. `netlify.toml` sets publish `site` and the functions folder.

## Test

`npm test` runs the build check, unit tests, browser smoke test and spacing audit. No network needed.
