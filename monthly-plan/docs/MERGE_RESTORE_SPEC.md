# Spec: invisible merge on restore (all apps)

Goal: restoring a backup from another device **combines** it with what's on this device instead of replacing it,
so a buyer who uses a laptop and a phone never loses work. The buyer sees no new choices: same "Restore backup"
button, one toast after. HTML apps only; do not touch listing kits, decks or videos.

Scope:
- Every app built from `monthly-plan/app/src/core.html` (all files `node build/build_app.js` writes to `monthly-plan/app/`).
  One change in core, then rebuild.
- Bakeweek Studio (`bakeweek/Bakeweek_Studio.html`, its own code) gets the same behavior, ported by hand (step 7).

## Design (keep exactly this; it is deliberately generic)

### 1. Change tracking happens in `commit()`, never in forms
`core.html` → `function commit(fn,message)` (search `function commit(`). It already does `undoState=clone(state)` before
`fn()`. After `fn()` runs, call a new `Sync.track(undoState,state)` that diffs before/after and records:

- `state.sync.t[key]` = `Date.now()` for every entry that was added or changed.
- `state.sync.del[key]` = `Date.now()` for every entry that disappeared.

Keys:
- For each top-level state property whose value is an **array of objects that all have a string `id`**
  (transactions, rsItems, hmSales, debts, rpProps…): key = `"<prop>/<id>"`. Compare entries with `JSON.stringify`.
- For every other top-level property (settings, months, debtPlan, baseline, objects keyed by month…): key = `"@<prop>"`,
  compared as a whole with `JSON.stringify`.
- Skip: `sync` itself, `version`, `niche`.

`state.sync` shape: `{t:{}, del:{}}`. Keep `del` bounded: drop entries older than 400 days when it exceeds 20 000 keys.
Do **not** track in sample/demo mode (`if(demo)return`).

Do not add fields to individual entries: per-edition validators rebuild entries and would strip them. Everything
lives in `state.sync`.

### 2. `Budget.validate` keeps `sync`
In `function validate(s)` (core.html, inside `Budget`, ~line 1984) add one generic block that keeps
`s.sync` if it is `{t:{string:number}, del:{string:number}}` (strings ≤ 120 chars, finite numbers), else sets
`{t:{},del:{}}`. Cap each map at 50 000 keys.

### 3. Device name and backup stamp (device-specific, NOT in state)
- Device name lives in `localStorage` under `P.storage.key+'-device'` (never inside `state`, because state moves
  between devices). Guess it once from `navigator.userAgent`: iPhone, iPad, Android, Mac, Windows PC, Chromebook,
  Linux, else "This device". Lowercased slug for file names (`iphone`, `mac`, `windows-pc`).
- Every backup written (manual download and the daily folder backup, see `function writeFolderBackup` and the
  `case 'backup':` handler) gets `state.sync.from = {device:<name>, at:<ISO time>}` in the JSON it writes
  (set on the copy being written, not on live state).
- File names gain the device slug: folder backup `${P.storage.file}-backup-${slug}-${day}.json`; manual download
  the same pattern. Two devices then never overwrite each other's file.

### 4. The merge (pure function, unit-tested)
Add `const Sync=(()=>{…})()` in core next to the other pure engines, exported for tests like `Handmade`
(add a `cut('const Sync = (()=>{', …)` line in `build/extract.js`). Functions: `track(before,after)`,
`merge(local,incoming)` → `{state, added, changed, removed, kept}`.

`merge(local, incoming)`, with `tL = local.sync.t`, `tI = incoming.sync.t`, `dL`, `dI` the del maps (missing = 0):
- **Id arrays** (union of props present on either side, same rule as §1):
  - id only in incoming → add it, unless `dL[key] > tI[key]` (deleted here after it was last edited there).
  - id only in local → keep it, unless `dI[key] > tL[key]` (deleted there after it was last edited here) → remove.
  - id in both, different JSON → keep the side with the larger `t`; tie → keep local.
  - keep the original order of local, append new ones in incoming's order.
- **Whole props** (`@prop`): keep the side with the larger `t["@prop"]`; tie or both 0 → keep local.
- Result `sync.t` / `sync.del` = per-key max of both sides.
- **Old backups with no `sync` at all** (made before this update): every incoming key has t=0, so local always
  wins on conflicts and nothing local is deleted; entries only in the backup are added. That is the safe direction.
- Run `Budget.validate()` on the merged result before using it (it repairs references, e.g. a sale whose item was
  deleted on the other side gets dropped by the validator, which is correct).

### 5. Restore UI (keep it one button)
`function restoreFile(file)` and `case 'confirm-restore':` (search them) currently show "Restoring replaces the
current planner". Change to:
- Compute `Sync.merge(state, Budget.validate(JSON.parse(raw)))`.
- If nothing would change (`added+changed+removed===0`): close, toast **"Nothing new in this backup."**
- Otherwise apply with `commit(()=>state=result.state, msg)` where msg is e.g.
  **"Brought in 12 changes from iPhone · saved Oct 7, 2:14 pm"** (device and time from `incoming.sync.from` when
  present; "from your backup" otherwise). Undo already works through `commit`.
- Keep the existing confirmation dialog but reword: title "Bring in this backup?", body "Anything new in it is added
  to what's here. Nothing on this device is lost." Buttons: **Bring it in** (primary) and Cancel. Move the old
  full replace to a small link at the bottom: "Replace everything with this backup instead" (keeps today's behavior,
  for moving to a new computer).
- Restoring a backup from a different app is still refused, as today.
- In sample mode, restore still exits sample mode first, as today.

### 6. Words
- Settings & backup "Move devices" text: replace "restore your downloaded JSON backup in the new browser" with
  "On your other device, choose Restore backup and pick the newest file: anything new is added, nothing is lost."
- Guide detail "Files, privacy and moving devices": add one sentence: "Using two devices? Download a backup on one
  and restore it on the other; the changes are combined."
- American English, no jargon ("merge", "sync", "tombstone" never appear in the UI).

### 7. Bakeweek Studio
`bakeweek/Bakeweek_Studio.html`: `function commit(fn,message)` (~line 1541), `function backup()` (~1548),
`function readBackup` / `function restoreFrom(b)` (~1549–1550), its validator `validateBackup` (~1325) must keep
`sync`. Port `Sync` (copy the same code; do not fork its logic) and apply §1–§6 there. Its state top-level arrays
also carry `id`s. Run `node bakeweek/build.js` from the repo root afterwards (it re-copies shared engines) and
`node bakeweek/flow_money.js`.

## Tests (required before committing)
1. `monthly-plan/build/test_sync.js`, required from `build/test.js` (pattern: `test_handmade.js`), covering:
   add on each side; change on one side; change on both (newer wins; tie keeps local); delete on one side
   (no resurrection); delete on one side + later edit on the other (edit wins); whole-prop newer wins;
   backup with no `sync` (local wins, adds only); merge is idempotent (merging the same backup twice = no change);
   merge(A,B) and merge(B,A) give the same entries.
2. `monthly-plan/build/sync_flow.js` (Playwright, pattern: `handmade_flow.js`): on the Reseller app, simulate two
   devices with two browser contexts: add item A on device 1, download backup (read via `page.evaluate` of the
   backup JSON), restore on device 2, add item B on 2 and delete A on 2, add item C on 1, restore 2's backup on 1 →
   1 has B and C, not A; toast says "Brought in". Restoring the same file again → "Nothing new in this backup."
   File names contain the device slug.
3. Run everything: `node build/build_app.js`, `node build/test.js`, and every `build/*_flow.js`
   (reseller, handmade, rental, debt, views, biz_smoke, autopilot, bills, networth, paycheck, fx). All must pass.

## Ship
- Bump each pack's `product.version` by a minor step (e.g. 1.0 → 1.1) and Bakeweek's `CONFIG.version`.
- Add a line to `monthly-plan/README.md` under the core section describing `Sync` and `state.sync`.
- Commit on branch `claude/sharp-ritchie-flvkmb`, push, and the PR is
  https://github.com/Daromele/Dashboard-Creator/pull/7.
- Privacy: tests use fictional data only; never commit files from the user's uploads.
