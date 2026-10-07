// Renders every slide of the deck to a 3000x2250 PNG in png/.  node render.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
import { mkdirSync } from 'node:fs';
const dir = new URL('.', import.meta.url).pathname; mkdirSync(dir + 'png-photos', { recursive: true });
const b = await pw.chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
await p.goto('file://' + dir + 'Recipe_Library_Studio_Etsy_Mockups_Your_Recipes.html'); await p.waitForTimeout(1500);
const slides = await p.$$('.slide');
for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: `${dir}png-photos/${String(i + 1).padStart(2, '0')}.png` });
await b.close(); console.log(slides.length, 'slides rendered');
