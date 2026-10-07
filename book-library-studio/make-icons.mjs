// Draws the app icons (site/icons/*.png) from one SVG. Run once after changing the mark: node make-icons.mjs
// Needs Playwright's Chromium (dev only; the site itself ships the PNGs).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const BOLD = '#1C3C52', POP = '#F0A93C';
// three books on a shelf, from the sidebar mark; `scale` keeps it inside the safe zone of maskable icons
const svg = (size, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
 <rect width="64" height="64" fill="${BOLD}"/>
 <g transform="translate(32 32) scale(${scale}) translate(-32 -32)" fill="none" stroke="${POP}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 50h40"/><rect x="15" y="15" width="9" height="35" rx="2"/><rect x="27" y="20" width="9" height="30" rx="2"/><path d="m39.5 23.5 8-2.2 7.2 27-8 2.2Z"/></g></svg>`;
const out = new URL('./site/icons/', import.meta.url).pathname; mkdirSync(out, { recursive: true });
const b = await pw.chromium.launch(), p = await b.newPage();
for (const [name, size, scale] of [['icon-192.png', 192, 1], ['icon-512.png', 512, 1], ['maskable-512.png', 512, .72], ['apple-touch-icon.png', 180, .92]]) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg(size, scale)}`);
  await p.screenshot({ path: out + name, omitBackground: true });
}
await b.close(); console.log('icons written to site/icons/');
