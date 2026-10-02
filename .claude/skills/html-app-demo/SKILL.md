---
name: html-app-demo
description: "Turn a paid single-file HTML app, planner or tracker into a free demo, trial or lite version that caps usage, locks premium features behind an upsell to the listing, and lets visitors carry their work into the paid version. Covers generating the demo from the paid file, the verification harness, and hosting it (e.g. Netlify). Use whenever the user wants a free demo, trial, try-before-you-buy, lite or sample version of a product they sell. Do not use for building or changing the paid product itself."
---

# HTML app demo builder

A demo exists to sell the full product. It should feel like the real thing,
stop at the moment the visitor is hooked, and make buying the obvious way to
keep what they built. Everything below serves that.

## 1. Settle four decisions with the user first

These change the build, so ask (offer the recommended default first):

1. **What is capped.** Cap the habit-forming action, not the setup. For a
   budget app that is logged transactions (~20), not categories or plans —
   planning a whole year is what makes them want to keep going. Too tight
   (≤10) feels like a tease before charts and insights have anything to show.
2. **What is locked.** The time-savers and exports: bank/CSV import,
   printing/PDF, automatic folder backup. Locked features stay visible and
   open an upsell dialog; hide from navigation any whole screen the demo
   will not let them use.
3. **Carry-over.** Recommend yes: keep the manual backup download open and
   prove the file restores into the paid app. Sunk setup effort is the
   strongest reason to buy instead of starting over elsewhere.
4. **The buy URL.** Required. Never publish with a placeholder — every
   upsell button points at it. Put it in one constant at the top of the build.

Tell the user plainly: a limit in a single HTML file is visible in the
source and anyone technical can remove it. It converts honest buyers; it is
not copy protection. Only a build with the locked code removed resists that.

## 2. Build: generate, never hand-edit

Write a per-product `make_demo.py` using `scripts/demo_kit.py`
(`Patcher.rep`/`before`/`after`/`title`/`namespace_storage`/`forbid`).
`references/example_make_demo.py` is a complete, shipped example (Monthly
Plan) — read it before writing a new one. The rules that matter:

- **Every patch asserts its anchor.** When the app changes, the build
  fails at the anchor that moved instead of shipping an unlocked demo.
- **Reuse the app's own guard if it has one.** Many apps already have a
  max-entries check in every create path; lower it rather than adding new
  enforcement. Find every place the capped thing is created (form submit,
  quick-add, import, recurring "mark paid") and cap each one.
- **Exempt sample/demo data from the cap.** The fictional sample year is
  the best selling tool in the app and usually holds hundreds of entries.
  The cap applies only to the visitor's own data.
- **Namespace storage** (`namespace_storage`) so the demo and a bought
  copy in the same browser never overwrite each other.
- **Always-visible demo strip**: "N of 20 left", switching to a clear
  "demo full — download a backup and load it into the full version"
  message at the cap, with a buy button. Show a different line in sample
  mode ("nothing here is counted").
- **One upsell dialog** for every lock: names the feature, says the rest
  of the demo is the real app, says their work carries over, buy button
  plus a "keep looking around" dismiss.
- Change the title and footer to say "free demo" and state the limits.
- `forbid()` the placeholder URL so it can never ship.

## 3. Verify: what every demo must prove

Write Playwright tests against the built file. `references/example_demotest.js`
and `references/example_carryover.js` are working examples. Prove each:

- [ ] Entry N succeeds and entry N+1 is blocked, with the helpful message.
- [ ] Each locked feature opens the upsell instead of running.
- [ ] Sample mode still works, including adding entries past the cap.
- [ ] The demo strip counts down and changes at the cap.
- [ ] Every buy button resolves to the real listing URL.
- [ ] The backup downloads, **and that file restores into the full app**
      with categories, plan, goals and settings intact — in a separate
      browser context, through the app's real restore flow (including any
      "review your backup" confirm step).
- [ ] The full app's engine is unchanged apart from the storage key
      (`demo_kit.engine_unchanged`).
- [ ] No page errors or console errors.

**Seed test data through the app's own UI, or run it through the app's
`validate()` before saving.** Hand-written state objects (a goal with the
wrong `kind`, a schedule missing `end`, a review with the wrong shape) fail
validation, and on reload the app correctly discards the whole saved state —
which looks exactly like an app bug. This cost four false alarms on the
first build. When a test fails, check the seed data before the app.

## 4. Host it

Etsy does not host free files, so the demo lives on a site linked from the
listing and social posts. Name the site `<product>-demo` (the seller's
existing convention). Deploy only a folder containing the demo as
`index.html`.

- **Never deploy from the repo root.** That uploads everything, including
  the paid app, to a public URL.
- A cloud sandbox's network allowlist may block the host. For Netlify, add
  `api.netlify.com`, `netlify-mcp.netlify.app` and `netlify.app`.
- The Netlify connector's deploy path has returned 403 on a brand-new
  site's first deploy. Fall back to the user dragging the folder onto the
  site's Deploys tab (a bare file sometimes is not accepted; a folder is).
  Then confirm the live page loads and its buy button points at the listing.
