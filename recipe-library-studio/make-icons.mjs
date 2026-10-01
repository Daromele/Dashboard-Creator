// Draws the app icons (site/icons/*.png) from one SVG. Run once after changing the mark: node make-icons.mjs
// Needs Playwright's Chromium (dev only; the site itself ships the PNGs).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const BOLD = '#3A2419', POP = '#F2B441';
// the open-book mark from the sidebar; `scale` keeps it inside the safe zone of maskable icons
const svg = (size, scale, round) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
 <rect width="64" height="64" rx="${round ? 14 : 0}" fill="${BOLD}"/>
 <g transform="translate(32 32) scale(${scale}) translate(-32 -32)" fill="none" stroke="${POP}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M15 18h12a5 5 0 0 1 5 5v24a6 6 0 0 0-6-5H15Z"/><path d="M49 18H37a5 5 0 0 0-5 5v24a6 6 0 0 1 6-5h11Z"/></g></svg>`;
const out = new URL('./site/icons/', import.meta.url).pathname; mkdirSync(out, { recursive: true });
const b = await pw.chromium.launch(), p = await b.newPage();
for (const [name, size, scale, round] of [['icon-192.png', 192, 1, false], ['icon-512.png', 512, 1, false], ['maskable-512.png', 512, .72, false], ['apple-touch-icon.png', 180, .92, false]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg(size, scale, round)}`);
  await p.screenshot({ path: out + name, omitBackground: true });
}
await b.close(); console.log('icons written to site/icons/');
