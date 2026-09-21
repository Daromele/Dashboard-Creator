#!/usr/bin/env node
/* Build a vertical (or any aspect) stage that holds the app in an iframe.
 *
 *   node make-wrapper.js <appUrl> <out.html> [--frame 1080x1920] [--phone 405x720]
 *                        [--bg "#1F4A3E"] [--cap-height 150]
 *
 * WHY an iframe rather than just recording a tall narrow window:
 * Playwright renders the viewport 1:1 into the video canvas and never
 * upscales it — set a 405px viewport with a 1080px video and you get a
 * small app in the corner of a grey field. And CSS `zoom` on <html> does
 * not help: it scales painting but leaves the layout viewport alone, so
 * media queries still report desktop width.
 *
 * An iframe has its own layout viewport. Give it the phone width, then
 * `transform: scale()` the whole element up to fill the frame. The app
 * genuinely lays itself out as a phone, and Chromium rasterises the
 * scaled result, so text stays sharp.
 */
const fs = require('fs');
const path = require('path');

const [appUrl, outPath] = process.argv.slice(2);
if (!appUrl || !outPath) {
  console.error('usage: make-wrapper.js <appUrl> <out.html> [--frame WxH] [--phone WxH] [--bg color]');
  process.exit(1);
}
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const dim = s => { const [w, h] = s.split('x').map(Number); return { w, h }; };

const frame = dim(arg('--frame', '1080x1920'));
const phone = dim(arg('--phone', '405x720'));
const bg = arg('--bg', '#12241E');
const capH = parseInt(arg('--cap-height', '150'), 10);

/* The app fills everything below the caption rail. Scale by width, then let
   the height follow — a little overflow at the bottom is fine and usually
   desirable, since both TikTok and Shorts cover the bottom fifth anyway. */
const stageH = frame.h - capH;
const scale = frame.w / phone.w;
const iframeH = Math.ceil(stageH / scale);

const html = `<!doctype html>
<meta charset="utf-8">
<title>stage</title>
<style>
  html,body{margin:0;padding:0;background:${bg};overflow:hidden;
    width:${frame.w}px;height:${frame.h}px}
  /* Caption rail, kept in the safe area: both platforms cover the bottom
     ~20% with the caption and username, and the right ~15% with buttons. */
  #cap{height:${capH}px;display:grid;place-items:center;padding:0 60px;box-sizing:border-box}
  #cap span{
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
    font-weight:800;font-size:46px;line-height:1.15;letter-spacing:-.02em;
    color:#fff;text-align:center;transition:opacity .28s ease,transform .28s ease}
  #cap span.out{opacity:0;transform:translateY(8px)}
  #stage{width:${frame.w}px;height:${stageH}px;overflow:hidden;position:relative}
  #app{position:absolute;left:0;top:0;border:0;
    width:${phone.w}px;height:${iframeH}px;
    transform:scale(${scale});transform-origin:top left}
</style>
<div id="cap"><span id="captxt"></span></div>
<div id="stage"><iframe id="app" src="${appUrl}"></iframe></div>
<script>
  const t = document.getElementById('captxt');
  window.setCaption = (text) => {
    if (!text) { t.classList.add('out'); return; }
    t.classList.add('out');
    setTimeout(() => { t.textContent = text; t.classList.remove('out'); }, 160);
  };
  window.app = () => document.getElementById('app').contentWindow;
</script>
`;
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, html);
console.log(`wrapper: ${outPath}  frame ${frame.w}x${frame.h}  app lays out at ${phone.w}px, scaled ${scale.toFixed(2)}x`);
