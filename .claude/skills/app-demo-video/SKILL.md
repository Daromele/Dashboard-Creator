---
name: app-demo-video
description: Record a polished product demo video of a web app or HTML template by driving the real app with Playwright and encoding to MP4, in landscape, square, or vertical 9:16 for TikTok and YouTube Shorts — a scripted screen recording with a visible cursor, realistic typing, and the app's own animations. Use this whenever the user wants a demo video, product video, listing video, promo clip, screen recording, animated preview, GIF or "video of the app" for an Etsy/Gumroad/marketplace listing, a landing page, an app store, social media, or a client demo. Also use when they say a screen recording would look nicer or smoother if it were animated, when they want to show software actually working rather than a static mockup, or when they need a poster/hero still captured from the app. Applies to any web app, single-file HTML product, dashboard or template that runs in a browser.
---

# Demo video of a real web app

The most persuasive thing a software listing can show is the software
working. A motion-graphic mockup looks smoother and proves nothing; a
hand-made screen recording proves a lot but wanders — the cursor hunts for
buttons, typing is uneven, and something always goes wrong at second nine.

This skill scripts the recording instead. Playwright drives the real app at
exact intervals, so every frame is the genuine product responding to real
input, and the pacing is deterministic. You get a rerunnable build rather
than a take you got lucky with.

## The pipeline

```
scene file  →  record.js  →  raw .webm  →  contact-sheet.js  →  encode.js  →  MP4 + poster
                (drive)                       (LOOK at it)       (cut)
```

Recording and encoding are separate on purpose: re-cutting the trim point or
the target length should not mean sitting through another take.

## Setup

```bash
npm install --no-save ffmpeg-static
```

Playwright bundles an ffmpeg, but it is compiled down to VP8/WebM only — no
H.264, no MP4. Most places you would upload a demo want MP4, so a full build
is needed. `ffmpeg-static` provides one without a system install.

Playwright itself must be available, plus a Chromium. The scripts look in
`PLAYWRIGHT_PATH` / `CHROME_PATH`, then common locations.

## Write the scene file

A scene file is plain JavaScript describing the shot. Keep it in the project,
not in this skill — it is per-product.

```js
module.exports = {
  url: 'file:///abs/path/to/app.html',      // or an http:// URL
  size: { width: 1080, height: 1080 },       // square suits most listing grids
  out: './video',

  // Put the app in the state a happy user would be in.
  prepare: async (page) => {
    await page.evaluate(() => {
      loadDemo();          // sample data, so the screen has something real in it
      closeTour();         // onboarding
      hideToast();
    });
  },

  scenes: [
    { note: 'rest on the headline number', hold: 1200 },
    { moveTo: '#qa-input', click: true },
    { type: { selector: '#qa-input', text: 'coffee 4.50', cps: 14 } },
    { hold: 450 },
    { moveTo: '#send', click: true, hold: 1500, note: 'the number updates' },
    { moveTo: '[data-go=outlook]', click: true, hold: 2200, note: 'chart draws in' },
  ]
};
```

Step fields: `note` (logged, for your own orientation), `moveTo` (CSS
selector — the cursor glides there), `click`, `type` ({selector, text, cps,
clear}), `hold` (ms), and `run` (an async function given the page, for
anything the shorthands do not cover).

## Run it

```bash
node scripts/record.js scene.js ./video
node scripts/contact-sheet.js ./video          # look before you encode
node scripts/encode.js ./video --name MyApp --seconds 15
```

The head and tail are trimmed automatically: the recorder measures how long
staging took and how long the scripted beats ran, and writes both to
`take.json`. Override with `--trim <sec>` only if the contact sheet shows the
app still settling after that point.

`--seconds` additionally produces a fixed-length cut by speeding the whole
thing up; a UI demo at 1.2–1.4× reads as energetic rather than rushed, and
most listing slots cap the length. `--gif` writes a looping GIF for a web
page. `--tail <sec>` changes the resting beat at the end (default 0.4).

## Things that quietly ruin a demo video

These are the failures worth designing against, because each one is invisible
until you look at the frames.

**Recording starts before you are ready, and stops after you are done.**
Playwright begins capturing when the context is created, so the staging —
page load, sample data, dismissing onboarding — is all in the file; and it
keeps capturing while the context flushes, leaving a tail of frozen final
frame. Both ends are measured and trimmed automatically. The tail matters
more than it sounds: left in, it inflates the source duration and quietly
over-speeds any fixed-length cut.

**First-run UI opens on a timer.** Onboarding modals are often shown by
`setTimeout` after boot, so closing them before that fires closes nothing.
`record.js` runs `prepare` twice with a pause between for exactly this reason.
If a modal still appears, the timer is longer than the gap — increase
`settle` or close it again inside a `run` step.

**Nag banners belong to real usage, not to advertising.** "Set up your
backup", "No backup", "Trial expires in 4 days", empty-state prompts. A promo
should show the app as it looks once someone has settled in. Stage those
states away in `prepare` — usually by setting whatever flag the app checks.

**No cursor.** Playwright does not paint the pointer into the recording.
Without one, buttons depress and panels change with nothing touching them and
it reads as a slideshow. `record.js` injects a synthetic cursor and animates
it between targets; the movement between clicks is most of what makes the
result feel human.

**Typing all at once.** `page.fill()` teleports the text in. Type character by
character (the `type` step does) — watching a field fill up is a large part of
proving the thing is interactive.

**Soft text.** Record with `deviceScaleFactor: 2` while keeping the video size
at 1x. The downscale acts as supersampling and the text comes out visibly
crisper for no extra work. This is the default.

**Encoding no one can play.** Use `yuv420p` — other pixel formats look fine
locally and fail to render on many platforms. `+faststart` lets playback begin
before the file has fully downloaded. No audio track: most listing videos are
muted or reject audio outright.

## Choosing what to show

Roughly fifteen seconds holds four beats. Pick the four that answer "why is
this not a spreadsheet":

1. **The promise** — rest on the headline state for a beat before anything moves.
2. **An interaction** — type something, watch the app respond. Proves it is software.
3. **The differentiator** — the one feature a competitor does not have.
4. **A payoff screen** — a chart drawing itself in, a verdict, a result.

Let the app's own animations do the work where it has them; that is motion
the buyer will actually experience. End back on the promise.

## Verify before delivering

Always generate the contact sheet and actually look at it. Then check the
encoded file's duration, dimensions and codec. The specific limits of the
destination (length cap, dimensions, file size) change over time — if the
user names a platform, say plainly that they should confirm current specs
rather than asserting them from memory.

## Vertical: TikTok, Shorts, Reels

Both want **9:16, 1080x1920**. (1080x1350 is 4:5, an Instagram feed size —
not this.) Two things make or break a vertical cut.

**Shoot the app's phone layout, not a shrunken desktop.** A wide dashboard
letterboxed into 9:16 is unreadable at the size people actually watch. If the
app is responsive, its narrow layout already fills a tall frame beautifully.

**You cannot get there by shrinking the viewport.** Playwright renders the
viewport 1:1 into the video canvas and never upscales — a 405px viewport with
a 1080px video gives a small app in the corner of a grey field. CSS `zoom` on
`<html>` does not help either: it scales painting but leaves the layout
viewport alone, so media queries still report desktop width and the content
just overflows.

What works is an iframe, which has its own layout viewport. `make-wrapper.js`
builds a stage: a 1080x1920 page with a caption rail at the top and the app in
an iframe at phone width, `transform: scale()`d up to fill. The app genuinely
lays out as a phone, and Chromium rasterises the scaled result so text stays
sharp.

```bash
node scripts/make-wrapper.js "file:///abs/app.html" ./stage/vertical.html \
  --frame 1080x1920 --phone 405x720 --bg "#12241E" --cap-height 160
```

Then point the scene at the stage and name the iframe:

```js
url: 'file:///abs/stage/vertical.html',
frame: '#app',        // selectors now resolve inside the app
```

`prepare` and `run` receive `(app, page)` — `app` evaluates inside the app,
`page` is the stage, which is where captions live:

```js
const cap = (page, text) => page.evaluate(t => window.setCaption(t), text);
{ run: (a, p) => cap(p, 'Can I afford this?'), hold: 700 },
```

**Safe areas.** On both platforms the bottom ~20% carries the caption and
username and the right ~15% carries the action buttons. Keep anything that
must be read out of those — the wrapper's caption rail sits at the top for
exactly this reason. Burned-in captions matter more here than on a listing
page, because these feeds are watched with sound off and scrolled fast.

See `references/example-scene-vertical.js` for a complete worked file.

## Variations worth offering

Vertical 1080×1920 for social, a 600px GIF for a landing page, or a different
opening beat. Because the shot is a script, a variation costs a rerun rather
than a reshoot — say so, because users assume video changes are expensive.
