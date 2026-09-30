// Builds ONE self-contained file: dist/RecipeLibraryStudio.html (JS, CSS and fonts inlined).
// Works offline from disk (double-click). The link importer needs the Netlify function, so it
// is unavailable there; manual entry, pasted text, backups etc. all work.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const js = (await build({ entryPoints: [path.join(root, 'src/app.js')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2022' })).outputFiles[0].text;
let css = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
css = css.replace(/url\('\/fonts\/([^']+)'\)/g, (_m, f) => `url('data:font/woff2;base64,${fs.readFileSync(path.join(root, 'fonts', f)).toString('base64')}')`);
const themeInit = fs.readFileSync(path.join(root, 'src/theme-init.js'), 'utf8');
const icon = `data:image/svg+xml;base64,${fs.readFileSync(path.join(root, 'icons/icon.svg')).toString('base64')}`;
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="en" data-theme="mono"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Recipe Library Studio</title>
<link rel="icon" href="${icon}">
<script>${safe(themeInit)}</script>
<style>${css}</style></head>
<body><a class="skip-link" href="#main">Skip to main content</a>
<div id="app" class="app"><div class="boot-screen" role="status">Loading your recipes…</div></div>
<div id="toast-region" class="toast-region" role="status" aria-live="polite"></div>
<div id="print-root" class="print-root" aria-hidden="true"></div>
<script>${safe(js)}</script></body></html>`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/RecipeLibraryStudio.html'), html);
console.log(`dist/RecipeLibraryStudio.html — ${(html.length / 1024).toFixed(0)} KB`);
