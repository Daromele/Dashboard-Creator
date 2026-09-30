# Reading the buyer's files (CSV / JSON exports)

Shop Insights reads Etsy's payment account statement, sold order items, listings, reviews.json and
Etsy Payments Deposits (plus Shopify, Square, Amazon, eBay and generic store CSVs, built and tested
but switched off until checked against real exports). Its reader is `EtsyData` in
`monthly-plan/app/src/etsy.js`: pure, tested, no DOM. Copy its patterns.

## Privacy first

- The user's real files hold **customer personal data** (names, addresses, emails). They are used
  for checking only: **never commit them**, never copy them into the repo, never paste their rows
  into commit messages. Keep them in the uploads folder.
- Tests and demos use **synthetic** rows in the exact same format (`build/etsy_fixtures.js`,
  `build/demo_data.js`).
- At read time, drop personal fields. Keep only what a screen needs: country, and a **hashed buyer
  key** (53-bit string hash, never reversible to a name) to count repeat buyers.
- Say it in the app and the listing: files are read on this computer and never uploaded.

## Recognize files by their columns, never their names

- Normalize headers (lowercase, non-alphanumerics → spaces) and match a **signature**: the set of
  columns a kind must have (`SIGNS` in etsy.js). The kind comes from the header row only.
- Recognize the platform's *other* downloads too (Etsy's Orders, Payments Sales reports), and say
  which file to use instead, rather than "unknown file".
- A file that belongs to another entity (every order already imported under another shop) is
  **refused with an explanation**: "This looks like Fern & Fable's file again. To download another
  shop's file, switch shops in Etsy first." The user once thought the app was wrong; it was right, and
  the message made that clear.
- A refused or partly-read file shows a **red notice that is impossible to miss**, not a toast.

## Parse carefully

- Money → integer cents: handles `$16.08`, `-$0.20`, `CA$1,234.50`, `(3.10)`, `12,50 €`; `--` and
  blanks are `null` (not zero). Throw on anything unreadable, with the cell in the message.
- Dates: `"September 24, 2026"`, `MM/DD/YY`, ISO. Parse to `YYYY-MM-DD` strings; never `Date` math
  on local midnights.
- Order-level fields written once per order (discount, shipping, tax) are not repeated per item.
- Keep every row that is really distinct: a buyer reviewing several items of one order produces
  identical-looking review rows; number repeats within the file so re-importing still adds nothing.

## Dedupe and merge

- Every record gets a stable key (platform IDs where they exist; else a hash of the defining fields).
  Importing the same or an overlapping file again adds nothing ("Anything already imported is
  skipped" is a promise in the copy).
- Dedupe **per file**, not per line: identical legitimate lines in one statement must all count
  (a line-level dedupe undercounted real Etsy statements in the snapshot demo).
- A listings file **replaces** that entity's listings (it's a snapshot, not a log).
- The import log records every file: kind, entity, date range, counts added/updated/same, source
  name. From the log each file can be **moved** to another entity (with undo) or **deleted** (removes
  what that file brought in for its dates; never touches hand-typed records). Everything imported is
  editable or deletable: "all uploads should be editable/deletable".
- The import screen: two steps side by side (1. choose the entity, 2. drop the files); drop zone with
  a dashed border; several files at once (up to 60, with a toast naming any dropped extras); a review
  table ("Ready to import": kind, dates, counts, warnings) before the Import button; a short summary
  toast after. The Imported files table is searchable, filterable by kind, sortable by date, and can
  show this entity or all entities.
- "Where to find each file" is a table: file · where in the platform · which option to pick · what it
  fills in the app. So a user who wonders why a section is empty knows which file brings it.

## Match the platform to the cent

When a screen mirrors a number the user can see on the platform (Etsy's Monthly statement, Etsy Ads
billed), put the real file and the platform's screenshot side by side and reconcile every line.
Examples that needed fixing:
- Etsy Ads shows what Etsy **billed** ($72.90); ad credits (−$5.00) are their own line; the amount
  paid ($67.90) sits beside it. Take-home uses the amount paid.
- Your own Etsy Ads and Offsite Ads fees are different things; show them apart everywhere.
- Sales tax/VAT the buyer paid is a minus line under revenue (Etsy remits it): never income, never a cost.
- Credits reduce the fee they belong to; Share & Save refunds show in the positive color.
- Deposits/payouts are **transfers**, never revenue. Money in on a bank CSV is "other sales" unless
  it matches a platform payout (same amount, within 6 days after the payout, or the platform's name
  in the description).
Write the reconciliation result into the commit message ("September: every line and the $261.90
net matched Etsy's screen").

## Estimates, clearly marked

A month with orders but no statement still belongs in the books: revenue is exact from orders; fees
are estimated at the user's fee rates (Settings, with country presets). Estimated lines are marked
`est`, rebuilt after every import or delete, replaced by the real statement, and labelled on every
screen that shows them. Things that can't be known (ads, subscriptions) are not guessed.

## Derived analytics: say how they're derived

When a file lacks a field, derive it with a stated rule and put the rule in a comment and in the UI.
E.g. "new listing": Etsy's files carry no creation date, so a listing is new the month it's first seen
with an ID above every earlier one; a listing fee on the day it sold is a renewal; the first month
with data is the baseline. The user asked "how does the app distinguish new vs renewed?"; the
answer should be on screen.
