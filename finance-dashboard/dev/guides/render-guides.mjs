import { createRequire } from 'module'; import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/playwright/package.json'); const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname); const root = path.resolve(here, '..', '..');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const name of ['Quick_Start_Guide', 'User_Guide']) {
  const page = await browser.newPage();
  await page.goto('file://' + path.join(here, 'out', name + '.html')); await page.waitForTimeout(300);
  const title = name.replace(/_/g, ' ');
  await page.pdf({ path: path.join(root, name + '.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: `<div style="width:100%;font-size:8px;color:#8a8374;letter-spacing:.08em;text-transform:uppercase;padding:0 18mm;display:flex;justify-content:space-between;font-family:Helvetica,Arial,sans-serif"><span>Personal Finance Dashboard · ${title}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>` });
  console.log('rendered', name + '.pdf');
  await page.close();
}
await browser.close();
