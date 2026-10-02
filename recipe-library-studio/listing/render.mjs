// Renders each mockup slide to a 3000x2250 PNG and the print guide to a PDF.  node listing/render.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const dir = new URL('.', import.meta.url).pathname;
const b = await pw.chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1125 }, deviceScaleFactor: 2 });
await p.goto('file://' + dir + 'etsy-mockups.html'); await p.addStyleTag({ content: '.guide{display:none}body{padding:0}.slide{margin:0}' }); await p.waitForTimeout(1500);
for (let i = 1; i <= 5; i++) await (await p.$('#s' + i)).screenshot({ path: `${dir}mockups/slide-${i}.png` });
const g = await b.newPage(); await g.goto('file://' + dir + 'how-to-guide-print.html'); await g.waitForTimeout(1200);
await g.pdf({ path: dir + 'how-to-guide.pdf', format: 'Letter', printBackground: true });
await b.close(); console.log('rendered');
