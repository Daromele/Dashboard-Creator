// Headless browser pass over file:// — run: node dev/test-browser.mjs
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = 'file://' + path.resolve(here, '..', 'Personal_Finance_Dashboard.html');
const shots = path.join(here, 'shots'); fs.mkdirSync(shots, { recursive: true });
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--allow-file-access-from-files'] });
const ctx = await browser.newContext({ viewport: { width: 1380, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('request', r => { if (!r.url().startsWith('file://') && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) errors.push('NETWORK REQUEST: ' + r.url()); });
const step = (s) => console.log('· ' + s);
const fail = (s) => { errors.push('ASSERT: ' + s); console.log('✗ ' + s); };
const expect = (cond, s) => cond ? console.log('✓ ' + s) : fail(s);

await page.goto(file + '?selftest');
await page.waitForSelector('#wizBody');
const st = await page.evaluate(() => window.__selfTestResult);
expect(st && st.passed === st.total, `self-tests in browser: ${st && st.passed}/${st && st.total}`);
await page.screenshot({ path: path.join(shots, '00-wizard.png') });

step('wizard: couple, sample data');
await page.click('label:has(input[name=mode][value=couple])');
await page.fill('input[name=p1]', 'Alex'); await page.fill('input[name=p2]', 'Sam');
await page.click('#wizNext'); await page.selectOption('select[name=currency]', 'GBP'); await page.click('#wizNext');
await page.click('#wizNext');
await page.click('label:has(input[name=data][value=sample])'); await page.click('#wizNext');
await page.waitForTimeout(300);
expect(!!(await page.$('.tour')), 'welcome tour opens after setup');
await page.click('#tourNext'); await page.click('#tourNext'); await page.click('#tourSkip'); await page.waitForTimeout(100);
const txCount = await page.evaluate(() => window.__pfd.state.txns.length);
expect(txCount > 100, `sample loaded: ${txCount} transactions`);
expect((await page.textContent('#view')).includes('£'), 'GBP formatting applied');
await page.screenshot({ path: path.join(shots, '01-overview.png'), fullPage: true });

for (const v of ['income', 'budget', 'transactions', 'bills', 'savings', 'debt', 'networth', 'reports', 'settings']) {
  await page.click(`#nav button[data-view=${v}]`); await page.waitForTimeout(150);
  const html = await page.innerHTML('#view');
  expect(html.length > 500 && !html.includes('Something went wrong'), `view renders: ${v}`);
  await page.screenshot({ path: path.join(shots, `10-${v}.png`), fullPage: true });
}
step('bills calendar');
await page.click('#nav button[data-view=bills]'); await page.click('[data-action=calMode][data-mode=calendar]'); await page.waitForTimeout(100);
expect((await page.$$('.cal .day')).length >= 28, 'calendar has day cells');
await page.screenshot({ path: path.join(shots, '11-calendar.png'), fullPage: true });
await page.click('[data-action=calMode][data-mode=list]');

step('toggle bill paid creates/removes transaction');
const before = await page.evaluate(() => window.__pfd.state.txns.length);
const cb = await page.$('input[data-change=togglePaid]:not(:checked):not([disabled])');
if (cb) {
  await cb.click(); await page.waitForTimeout(100);
  const after = await page.evaluate(() => window.__pfd.state.txns.length);
  expect(after === before + 1, 'paid tick added a transaction');
  const cb2 = await page.$('input[data-change=togglePaid]:checked'); await cb2.click(); await page.waitForTimeout(100);
} else console.log('  (all bills already paid this month — skipped)');

step('add transaction with splits via form');
await page.click('#nav button[data-view=transactions]'); await page.click('[data-action=txnAdd]');
await page.fill('#genForm [name=description]', 'Test split purchase');
await page.fill('#genForm [name=split_amt_0]', '40');
await page.click('#genForm [data-action=splitAdd]'); await page.waitForTimeout(50);
await page.selectOption('#genForm [name=split_cat_1]', 'Pets'); await page.fill('#genForm [name=split_amt_1]', '12.5');
await page.click('#genForm button[type=submit]'); await page.waitForTimeout(100);
const added = await page.evaluate(() => window.__pfd.state.txns.find(t => t.description === 'Test split purchase'));
expect(added && added.splits.length === 2 && Math.abs(added.splits[1].amount - 12.5) < 1e-9, 'split transaction saved');
await page.screenshot({ path: path.join(shots, '12-transactions.png'), fullPage: true });

step('search filter');
await page.fill('input[type=search]', 'Test split'); await page.waitForTimeout(400);
expect((await page.$$('#view tbody tr')).length === 1, 'search narrows to one row');
await page.fill('input[type=search]', ''); await page.waitForTimeout(400);

step('CSV import');
const csvPath = path.join(shots, 'import.csv');
fs.writeFileSync(csvPath, 'Date,Description,Amount\n2026-03-04,Coffee shop,-4.50\n04/03/2026,"Refund, store",12.00\n2026-03-05,Coffee shop,-4.50\n');
await page.click('[data-action=csvImport]'); await page.setInputFiles('#csvFile', csvPath); await page.waitForTimeout(200);
await page.screenshot({ path: path.join(shots, '13-csv-import.png') });
const preview = await page.textContent('#csvPreview');
expect(preview.includes('3') && preview.includes('to import'), 'csv preview built');
await page.click('#csvGo'); await page.waitForTimeout(100);
const imported = await page.evaluate(() => window.__pfd.state.txns.filter(t => t.description === 'Coffee shop').length);
expect(imported === 2, 'csv rows imported');
await page.click('[data-action=csvImport]'); await page.setInputFiles('#csvFile', csvPath); await page.waitForTimeout(200);
expect((await page.textContent('#csvPreview')).includes('3 duplicate'), 'duplicate detection on re-import');
await page.keyboard.press('Escape');

step('budget inline edit + rollover');
await page.click('#nav button[data-view=budget]');
const inp = await page.$('input[data-change=budgetSet][data-cat=Groceries]');
await inp.fill('999'); await inp.press('Enter'); await page.waitForTimeout(100);
const b = await page.evaluate(() => window.__pfd.state.budgets.find(x => x.month === window.__pfd.ui.month && x.category === 'Groceries'));
expect(b && b.planned === 999, 'budget inline edit saved');
expect((await page.textContent('#view')).includes('Rollover'), 'rollover column visible (surplus mode)');

step('debt strategy toggle + extra');
await page.click('#nav button[data-view=debt]');
await page.click('[data-action=debtStrategy][data-s=avalanche]'); await page.waitForTimeout(100);
expect((await page.textContent('#view')).includes('avalanche'), 'avalanche selected');
await page.screenshot({ path: path.join(shots, '14-debt-avalanche.png'), fullPage: true });

step('net worth inline balance + snapshot');
await page.click('#nav button[data-view=networth]');
await page.click('[data-action=snapshotNow]'); await page.waitForTimeout(100);
const snaps = await page.evaluate(() => window.__pfd.state.snapshots.length);
expect(snaps >= 2, `snapshots: ${snaps}`);

step('settings: currency change, single mode, categories');
await page.click('#nav button[data-view=settings]');
await page.selectOption('select[data-change=currency]', 'EUR'); await page.waitForTimeout(100);
expect((await page.textContent('#view')).includes('€'), 'EUR applied');
await page.click('[data-action=setMode][data-mode=single]'); await page.waitForTimeout(100);
await page.click('#nav button[data-view=overview]'); await page.waitForTimeout(100);
expect(!(await page.textContent('#view')).includes('Household split'), 'single mode hides household split');
await page.click('#nav button[data-view=settings]'); await page.click('[data-action=setMode][data-mode=couple]');
await page.click('[data-action=runTests]'); await page.waitForTimeout(100);
expect((await page.textContent('#testResults')).includes('checks passed'), 'in-app self-tests button');

step('themes');
const bg0 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
await page.click('#themeDots [data-theme=charcoal]'); await page.waitForTimeout(100);
const bg1 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
expect(bg0 !== bg1 && (await page.evaluate(() => document.documentElement.classList.contains('dark'))), `charcoal theme applied (${bg0} -> ${bg1})`);
await page.click('#nav button[data-view=overview]'); await page.waitForTimeout(200);
await page.screenshot({ path: path.join(shots, '30-dark-overview.png'), fullPage: true });
await page.click('#nav button[data-view=debt]'); await page.waitForTimeout(200); await page.screenshot({ path: path.join(shots, '31-dark-debt.png') });
await page.click('#nav button[data-view=settings]'); await page.click('.theme-card[data-theme=midnight]'); await page.waitForTimeout(100);
expect((await page.evaluate(() => window.__pfd.state.settings.theme)) === 'midnight', 'theme persisted in settings');
await page.click('#nav button[data-view=overview]'); await page.waitForTimeout(200); await page.screenshot({ path: path.join(shots, '32-midnight-overview.png') });
await page.click('#themeDots [data-theme=cream]'); await page.waitForTimeout(100);
step('quick add + more options');
await page.keyboard.press('n'); await page.waitForTimeout(100);
expect(!!(await page.$('.qa-grid')), 'N opens quick add');
await page.click('.qa[data-qa=billAdd]'); await page.waitForTimeout(100);
expect(!!(await page.$('#genForm [data-more]')) && !(await page.$('#genForm [name=endDate]')), 'bill form hides advanced fields');
await page.click('#genForm [data-more]'); await page.waitForTimeout(50);
expect(!!(await page.$('#genForm [name=endDate]')), 'More options reveals end date');
await page.keyboard.press('Escape');
step('tour from help button');
await page.click('[data-action=help]'); await page.waitForTimeout(100);
expect(!!(await page.$('.tour')), 'help opens tour');
await page.click('#tourNext'); await page.click('.tour [data-tour-action=incomeAdd]'); await page.waitForTimeout(100);
expect(!!(await page.$('#genForm [name=source]')), 'tour "do it now" opens income form');
await page.keyboard.press('Escape');
step('automation: income posts itself');
const beforeAuto = await page.evaluate(() => window.__pfd.state.txns.length);
await page.keyboard.press('n'); await page.click('.qa[data-qa=incomeAdd]'); await page.waitForTimeout(100);
await page.fill('#genForm [name=source]', 'Auto test wages'); await page.fill('#genForm [name=amount]', '500'); await page.selectOption('#genForm [name=frequency]', 'weekly');
const start = await page.evaluate(() => window.__pfd.state.settings.startMonth + '-03');
await page.fill('#genForm [name=startDate]', start); await page.click('#genForm button[type=submit]'); await page.waitForTimeout(150);
const autoTx = await page.evaluate(() => window.__pfd.state.txns.filter(t => t.incomeRef && t.description === 'Auto test wages'));
expect(autoTx.length >= 20 && autoTx.every(t => t.date <= new Date().toISOString().slice(0, 10)), `weekly income back-filled ${autoTx.length} pay days automatically`);
await page.click('#nav button[data-view=transactions]'); await page.fill('input[type=search]', 'Auto test'); await page.waitForTimeout(400);
await page.click('#view tbody tr[data-action=txnEdit]'); await page.waitForTimeout(100); await page.click('#formDelete'); await page.click('.modal:last-child [data-modal-result=ok]'); await page.waitForTimeout(150);
const after = await page.evaluate(() => window.__pfd.state.txns.filter(t => t.incomeRef && t.description === 'Auto test wages').length);
expect(after === autoTx.length - 1 && (await page.evaluate(() => Object.keys(window.__pfd.state.skipped).length)) > 0, 'deleted pay day is not re-posted');
await page.fill('input[type=search]', ''); await page.waitForTimeout(400);
step('automation: budget carries forward + mark all due');
const bm = await page.evaluate(() => { const s = window.__pfd.state; const m = new Date().toISOString().slice(0, 7); s.budgets = s.budgets.filter(b => b.month !== m); return m; });
await page.click('#nav button[data-view=settings]'); await page.click('input[data-key=autoPayBills]'); await page.waitForTimeout(150);
const carried = await page.evaluate((m) => window.__pfd.state.budgets.filter(b => b.month === m).length, bm);
expect(carried > 5, `budget copied into ${bm} (${carried} lines)`);
const unpaid = await page.evaluate(() => { const m = new Date().toISOString().slice(0, 7); const today = new Date().toISOString().slice(0, 10); return billItems().filter(b => !isBillPaid(m, b.id) && occurrences(b, m + '-01', today).length).length; });
expect(unpaid === 0, 'auto-pay ticked every bill already due this month');
await page.click('input[data-key=autoPayBills]'); await page.waitForTimeout(100);
step('month in review story');
await page.click('#nav button[data-view=overview]'); await page.waitForTimeout(150);
await page.click('[data-action=monthStory]'); await page.waitForTimeout(350);
expect(!!(await page.$('.story')), 'story opens from the overview');
const nSlides = await page.evaluate(() => document.querySelectorAll('#storySegs i').length);
expect(nSlides >= 6, `story built ${nSlides} slides from the sample data`);
await page.screenshot({ path: path.join(shots, '12-story.png') });
const firstTitle = await page.textContent('.story-title');
await page.click('#storyFwd'); await page.waitForTimeout(200);
expect((await page.textContent('.story-title')) !== firstTitle, 'next advances the story');
await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200);
expect((await page.textContent('.story-title')) === firstTitle, 'left arrow goes back');
for (let k = 0; k < nSlides + 1; k++) { const seg = await page.$('#storySegs'); if (!seg) break; await page.click('#storyFwd'); await page.waitForTimeout(120); }
expect(!(await page.$('.story')), 'story closes after the last slide');
await page.screenshot({ path: path.join(shots, '12b-story-end.png') });
const storySane = await page.evaluate(() => {
  const st = storyStats(window.__pfd.ui.month); const sl = storySlides(st);
  const sm = st.sm;
  return { ok: Math.abs(sm.income - sm.expenses - sm.net) < 0.01, noUndef: !sl.some(x => /undefined|NaN/.test(x.title + x.sub + (x.big || '') + (x.body || ''))), last: !!sl[sl.length - 1].cta };
});
expect(storySane.ok, 'story numbers reconcile with the month summary');
expect(storySane.noUndef, 'no undefined/NaN leaked into any slide');
expect(storySane.last, 'closing slide offers a next step');
const emptyStory = await page.evaluate(() => { const st = storyStats('1999-01'); return st.hasData; });
expect(emptyStory === false, 'a month with no data is reported as empty');
await page.click('[data-action=monthShift][data-n="-1"]');
await page.waitForTimeout(150);
step('appearance: checklist visibility');
await page.click('#nav button[data-view=settings]');
await page.click('input[data-change=showChecklist]'); await page.waitForTimeout(150);
expect(await page.evaluate(() => window.__pfd.state.settings.checklistDismissed === true), 'checklist hidden from settings');
await page.click('input[data-change=showChecklist]'); await page.waitForTimeout(150);
expect(await page.evaluate(() => window.__pfd.state.settings.checklistDismissed === false), 'checklist can be brought back');

step('card rows are uniform height');
await page.click('#nav button[data-view=overview]'); await page.waitForTimeout(250);
const rows = await page.evaluate(() => [...document.querySelectorAll('#view .grid')].map(g => {
  const cards = [...g.children].filter(c => c.offsetParent !== null);
  if (cards.length < 2) return null;
  const byTop = {};
  for (const c of cards) { const t = Math.round(c.getBoundingClientRect().top); (byTop[t] = byTop[t] || []).push(Math.round(c.getBoundingClientRect().height)); }
  return Object.values(byTop).map(hs => Math.max(...hs) - Math.min(...hs));
}).filter(Boolean).flat());
expect(rows.length > 0 && rows.every(d => d <= 1), `every card row is level (max drift ${rows.length ? Math.max(...rows) : 'n/a'}px across ${rows.length} rows)`);
const radii = await page.evaluate(() => { const v = getComputedStyle(document.documentElement); return { r: v.getPropertyValue('--r').trim(), card: getComputedStyle(document.querySelector('#view .card')).borderTopLeftRadius }; });
expect(radii.r === '6px' && radii.card === '6px', `cards use the tightened radius (${radii.card})`);

step('deep links land on the right card');
await page.click('#nav button[data-view=overview]'); await page.waitForTimeout(150);
await page.click('.insight[data-anchor]'); await page.waitForTimeout(400);
const flashed = await page.evaluate(() => { const el = document.querySelector('.flash'); return el ? el.dataset.anchor : null; });
expect(!!flashed, `insight jumped to anchor "${flashed}"`);
await page.click('#backupPill'); await page.waitForTimeout(400);
expect((await page.evaluate(() => (document.querySelector('.flash') || {}).dataset?.anchor)) === 'backup', 'backup pill lands on backup card');
step('storage blocked → one warning, app keeps working');
await page.evaluate(() => { const orig = Storage.prototype.setItem; window.__origSet = orig; Storage.prototype.setItem = function (k, v) { const e = new DOMException('quota', 'QuotaExceededError'); throw e; }; });
await page.click('#nav button[data-view=networth]'); await page.click('[data-action=snapshotNow]'); await page.waitForTimeout(100); await page.click('[data-action=snapshotNow]'); await page.waitForTimeout(100);
const warnCount = await page.evaluate(() => [...document.querySelectorAll('.toast.bad')].length);
expect(warnCount === 1 && (await page.textContent('#toasts')).includes('previewed or sandboxed') && !(await page.$('#storagePill.hidden')), 'blocked storage warned once with the right message and pill');
await page.evaluate(() => { Storage.prototype.setItem = window.__origSet; }); await page.click('[data-action=snapshotNow]'); await page.waitForTimeout(100);
expect(!!(await page.$('#storagePill.hidden')), 'pill clears when saving works again');
await page.click('#nav button[data-view=settings]'); await page.waitForTimeout(100);
step('export JSON download');
await page.click('#nav button[data-view=settings]'); await page.waitForTimeout(100);
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action=exportJson]')]);
const dlPath = path.join(shots, 'backup.json'); await dl.saveAs(dlPath);
const backup = JSON.parse(fs.readFileSync(dlPath, 'utf8'));
expect(backup.__schema === 1 && backup.txns.length > 100, 'exported backup is valid');

step('persistence across reload');
const beforeReload = await page.evaluate(() => window.__pfd.state.txns.length);
await page.reload(); await page.waitForTimeout(300);
expect(!(await page.$('#wizBody')), 'wizard not shown on second load');
const persisted = await page.evaluate(() => window.__pfd.state.txns.length);
expect(persisted === beforeReload, `state persisted (${persisted})`);

step('erase + restore from backup');
await page.click('#nav button[data-view=settings]');
await page.click('[data-action=clearTxns]'); await page.click('.modal [data-modal-result=ok]'); await page.waitForTimeout(100);
expect((await page.evaluate(() => window.__pfd.state.txns.length)) === 0, 'transactions cleared (no re-posting of past pay days)');
await page.setInputFiles('input[data-change=importJson]', dlPath); await page.waitForTimeout(200);
await page.click('.modal [data-modal-result=ok]'); await page.waitForTimeout(200);
expect((await page.evaluate(() => window.__pfd.state.txns.length)) === backup.txns.length, 'backup restored');

step('first steps checklist on empty dashboard');
await page.evaluate(() => { window.__pfd.state.txns = []; window.__pfd.state.income = []; window.__pfd.state.bills = []; window.__pfd.state.subs = []; window.__pfd.state.accounts = []; window.__pfd.state.budgets = []; });
await page.click('#nav button[data-view=overview]'); await page.waitForTimeout(150);
expect(!!(await page.$('.steps-card')) && (await page.textContent('.steps-card')).includes('Next: add your income'), 'checklist shows next step');
await page.screenshot({ path: path.join(shots, '33-empty-overview.png'), fullPage: true });
await page.setInputFiles('input[data-change=importJson]', dlPath).catch(() => {});
await page.click('#nav button[data-view=settings]'); await page.setInputFiles('input[data-change=importJson]', dlPath); await page.waitForTimeout(200); await page.click('.modal [data-modal-result=ok]'); await page.waitForTimeout(200);
step('reject a future-schema backup');
const badPath = path.join(shots, 'bad.json'); fs.writeFileSync(badPath, JSON.stringify(Object.assign({}, backup, { __schema: 99 })));
await page.setInputFiles('input[data-change=importJson]', badPath); await page.waitForTimeout(200);
expect((await page.textContent('#toasts')).includes('newer version'), 'future schema refused');

step('reports print layout');
await page.click('#nav button[data-view=reports]'); await page.emulateMedia({ media: 'print' });
await page.screenshot({ path: path.join(shots, '15-reports-print.png'), fullPage: true });
await page.emulateMedia({ media: 'screen' });

step('mobile viewport');
await page.setViewportSize({ width: 390, height: 800 });
await page.click('#nav button[data-view=overview]').catch(() => {});
await page.click('.hamburger'); await page.waitForTimeout(100); await page.click('#nav button[data-view=overview]'); await page.waitForTimeout(150);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
expect(!overflow, 'no horizontal page overflow on 390px');
await page.screenshot({ path: path.join(shots, '20-mobile-overview.png'), fullPage: true });
await page.click('.hamburger'); await page.click('#nav button[data-view=transactions]'); await page.waitForTimeout(150);
await page.screenshot({ path: path.join(shots, '21-mobile-transactions.png'), fullPage: true });

await browser.close();
console.log('\n' + (errors.length ? 'FAILURES:\n' + errors.join('\n') : 'ALL CHECKS PASSED, no console errors, no network requests'));
process.exit(errors.length ? 1 : 0);
