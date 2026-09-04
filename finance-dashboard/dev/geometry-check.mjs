// Geometry check for the mockup deck: no element outside its slide, no overflow, hero inside 1:1 crop band.
import { createRequire } from 'module'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/playwright/package.json'); const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = 'file://' + path.resolve(here, '..', 'listing', 'finance-dashboard-etsy-mockups.html');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.goto(file); await page.waitForTimeout(300);
const problems = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('.slide').forEach((s, i) => {
    const sb = s.getBoundingClientRect();
    if (s.scrollWidth > s.clientWidth + 1 || s.scrollHeight > s.clientHeight + 1) out.push(`slide ${i + 1}: scroll overflow ${s.scrollWidth}x${s.scrollHeight}`);
    const pad = s.querySelector('.pad'); if (pad.scrollHeight > pad.clientHeight + 1) out.push(`slide ${i + 1}: pad content overflows by ${pad.scrollHeight - pad.clientHeight}px`);
    s.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      if (r.left < sb.left - 1 || r.right > sb.right + 1 || r.top < sb.top - 1 || r.bottom > sb.bottom + 1) out.push(`slide ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> outside slide (${Math.round(r.left - sb.left)},${Math.round(r.top - sb.top)},${Math.round(r.right - sb.left)},${Math.round(r.bottom - sb.top)})`);
      const cs = getComputedStyle(el); if (cs.whiteSpace === 'nowrap' && el.scrollWidth > el.clientWidth + 1) out.push(`slide ${i + 1}: nowrap clipped "${el.textContent.trim().slice(0, 30)}"`);
    });
    if (i === 0) { const h = s.querySelector('h1').getBoundingClientRect(); if (h.left - sb.left < 187.5) out.push(`hero headline starts at x=${Math.round(h.left - sb.left)} (inside 1:1 crop band needs ≥188)`); }
  });
  return out;
});
for (let i = 0; i < 12; i++) await page.locator('.slide').nth(i).screenshot({ path: path.join(here, 'shots', `deck-${String(i + 1).padStart(2, '0')}.png`) });
await browser.close();
console.log(problems.length ? 'PROBLEMS:\n' + [...new Set(problems)].join('\n') : 'GEOMETRY OK');
