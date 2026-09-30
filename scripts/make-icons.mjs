// Renders icons/icon.svg into the PNG sizes the PWA needs (run: node scripts/make-icons.mjs).
// Uses playwright-core + the preinstalled Chromium; the PNGs are committed, so this is only
// needed if you change the artwork.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = fs.readFileSync(path.join(root, 'icons/icon.svg'), 'utf8');
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect width="512" height="512" rx="112" fill="#161616"\/>/, '');

const any = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg>`;
// Maskable / Apple: full-bleed square; artwork shrunk into the 80% safe zone.
const bleed = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" fill="#161616"/><g transform="translate(51.2 51.2) scale(0.8)">${inner}</g></svg>`;

const targets = [
  ['icon-192.png', any(192), true],
  ['icon-512.png', any(512), true],
  ['icon-maskable-512.png', bleed(512), false],
  ['apple-touch-icon.png', bleed(180), false],
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const [name, markup, transparent] of targets) {
  const size = Number(markup.match(/width="(\d+)"/)[1]);
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
  await page.screenshot({ path: path.join(root, 'icons', name), omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('wrote', name);
}
await browser.close();
