// Builds site/index.html from src/app.html: inlines the fonts (the app never loads fonts from the web).
//   node build.mjs          write the built file
//   node build.mjs --check  exit 1 when site/index.html is stale
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const here = p => new URL(p, import.meta.url);
const src = readFileSync(here('./src/app.html'), 'utf8');
if (!src.includes('/*@@FONTS@@*/')) throw Error('src/app.html is missing the /*@@FONTS@@*/ marker');
const out = src.replace('/*@@FONTS@@*/', readFileSync(here('./src/fonts.css'), 'utf8').trim());
if (process.argv.includes('--check')) {
  let cur = '';
  try { cur = readFileSync(here('./site/index.html'), 'utf8'); } catch {}
  if (cur !== out) { console.error('site/index.html is stale. Run: node build.mjs'); process.exit(1); }
  console.log('site/index.html is current');
} else {
  mkdirSync(here('./site/'), { recursive: true });
  writeFileSync(here('./site/index.html'), out);
  console.log(`wrote site/index.html (${(out.length / 1024).toFixed(0)} KB)`);
}
