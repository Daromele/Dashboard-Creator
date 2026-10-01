// Builds site/index.html from src/app.html (fonts inlined; the app never loads fonts from the web) and site/sw.js.
//   node build.mjs          write the built file
//   node build.mjs --check  exit 1 when site/index.html is stale
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const here = p => new URL(p, import.meta.url);
const src = readFileSync(here('./src/app.html'), 'utf8');
if (!src.includes('/*@@FONTS@@*/')) throw Error('src/app.html is missing the /*@@FONTS@@*/ marker');
const out = src.replace('/*@@FONTS@@*/', readFileSync(here('./src/fonts.css'), 'utf8').trim());
// the service worker's cache name carries a hash of the app, so every new build replaces the offline copy
const sw = readFileSync(here('./src/sw.js'), 'utf8').replace('@@VERSION@@', createHash('sha256').update(out).digest('hex').slice(0, 12));
if (process.argv.includes('--check')) {
  let cur = '';
  try { cur = readFileSync(here('./site/index.html'), 'utf8'); } catch {}
  let curSw = '';
  try { curSw = readFileSync(here('./site/sw.js'), 'utf8'); } catch {}
  if (cur !== out || curSw !== sw) { console.error('site/ is stale. Run: node build.mjs'); process.exit(1); }
  console.log('site/index.html is current');
} else {
  mkdirSync(here('./site/'), { recursive: true });
  writeFileSync(here('./site/index.html'), out);
  writeFileSync(here('./site/sw.js'), sw);
  console.log(`wrote site/index.html (${(out.length / 1024).toFixed(0)} KB)`);
}
