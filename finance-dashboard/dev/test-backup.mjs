// Auto-backup path with a mocked File System Access handle (headless Chromium has no picker).
import { createRequire } from 'module';
import path from 'path';
const require = createRequire('/opt/node22/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = 'file://' + path.resolve(here, '..', 'Personal_Finance_Dashboard.html');
const errors = []; const expect = (c, s) => c ? console.log('✓ ' + s) : (errors.push(s), console.log('✗ ' + s));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
page.on('pageerror', e => errors.push('pageerror ' + e.message));
await page.addInitScript(() => {
  window.__mockFile = { text: '', writes: 0, perm: 'granted' };
  const handle = {
    name: 'Finance-Dashboard-Backup.json',
    queryPermission: async () => window.__mockFile.perm,
    requestPermission: async () => (window.__mockFile.perm = 'granted'),
    createWritable: async () => { if (window.__mockFile.perm !== 'granted') { const e = new Error('denied'); e.name = 'NotAllowedError'; throw e; } let buf = ''; return { write: async t => { buf += t; }, close: async () => { window.__mockFile.text = window.__mockFile.corruptNext ? buf.slice(0, 40) : buf; window.__mockFile.corruptNext = false; window.__mockFile.writes++; } }; },
    getFile: async () => ({ size: window.__mockFile.text.length, text: async () => window.__mockFile.text }),
  };
  window.showSaveFilePicker = async () => handle;
});
await page.goto(file);
await page.click('#wizNext'); await page.click('#wizNext'); await page.click('label:has(input[name=data][value=sample])'); await page.click('#wizNext');
await page.waitForTimeout(200);
await page.click('#nav button[data-view=settings]');
await page.click('[data-action=backupLink]'); await page.waitForTimeout(300);
const s1 = await page.evaluate(() => ({ status: backupFile.status, writes: window.__mockFile.writes, len: window.__mockFile.text.length, verified: !!backupFile.lastVerified }));
expect(s1.status === 'linked' && s1.writes === 1 && s1.len > 1000 && s1.verified, `link writes and verifies immediately (${JSON.stringify(s1)})`);
const lkg = await page.evaluate(() => idb.get('lkg'));
expect(typeof lkg === 'string' && JSON.parse(lkg).__schema === 1, 'last-known-good copy stored in IndexedDB');

// debounced write after a mutation
await page.click('#nav button[data-view=networth]'); await page.click('[data-action=snapshotNow]');
await page.waitForTimeout(2600);
const s2 = await page.evaluate(() => window.__mockFile.writes);
expect(s2 === 2, `debounced write fired once after mutation (${s2})`);

// permission loss → needs-permission, then re-grant
await page.evaluate(() => { window.__mockFile.perm = 'prompt'; });
await page.click('[data-action=snapshotNow]'); await page.waitForTimeout(2600);
expect(await page.evaluate(() => backupFile.status) === 'needs-permission', 'write failure flips status to needs-permission');
await page.click('#nav button[data-view=settings]'); await page.click('[data-action=backupPermission]'); await page.waitForTimeout(300);
expect(await page.evaluate(() => backupFile.status) === 'linked', 'requestPermission restores linked status');

// verification catches a corrupt write
await page.evaluate(() => { window.__mockFile.corruptNext = true; });
await page.click('[data-action=backupWriteNow]'); await page.waitForTimeout(300);
expect(await page.evaluate(() => backupFile.status) === 'error' && (await page.textContent('#toasts')).includes('verification failed'), 'corrupt write detected by verification');

// staleness: file newer than local → prompt; choose file → restored
await page.evaluate(() => { const s = JSON.parse(JSON.stringify(state)); s.savedAt = new Date(Date.now() + 60000).toISOString(); s.txns = s.txns.slice(0, 5); window.__mockFile.text = JSON.stringify(s); backupFile.status = 'linked'; backupFile.checkStale(); });
await page.waitForTimeout(300);
expect(!!(await page.$('.modal')) && (await page.textContent('.modal')).includes('Backup file is newer'), 'stale check prompts when file is newer');
await page.click('.modal [data-modal-result=file]'); await page.waitForTimeout(300);
expect(await page.evaluate(() => state.txns.length) === 5, 'restore from newer file applied');
await browser.close();
console.log(errors.length ? 'FAILURES: ' + errors.join(' | ') : 'BACKUP CHECKS PASSED');
process.exit(errors.length ? 1 : 0);
