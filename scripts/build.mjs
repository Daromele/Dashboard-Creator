// Build: copy the deployable files into dist/ and stamp the service worker with
//   - VERSION   a content hash (any changed file => new cache => clients get the update prompt)
//   - PRECACHE  the exact list of app-shell files
// No bundler, no dependencies. Run: node scripts/build.mjs   (Netlify runs it via netlify.toml)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

// What gets deployed (everything else — tests, functions source, docs — stays out of dist/).
const COPY_DIRS = ['css', 'src', 'fonts', 'icons'];
const COPY_FILES = ['index.html', 'manifest.json', 'service-worker.js'];
// Shell files to precache. latin-ext font subsets are fetched (and then cached) only if needed.
const PRECACHE_SKIP = [/latin-ext/, /^\/service-worker\.js$/, /\.map$/];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const files = [];
for (const dir of COPY_DIRS) {
  for (const abs of walk(path.join(root, dir))) files.push(path.relative(root, abs));
}
files.push(...COPY_FILES);

for (const rel of files) {
  const to = path.join(dist, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(root, rel), to);
}

const urlOf = (rel) => `/${rel.split(path.sep).join('/')}`;
const precache = ['/', ...files.map(urlOf)].filter((u) => !PRECACHE_SKIP.some((re) => re.test(u))).sort();

const hash = crypto.createHash('sha256');
for (const rel of [...files].sort()) {
  hash.update(rel);
  hash.update(fs.readFileSync(path.join(root, rel)));
}
const version = hash.digest('hex').slice(0, 12);

const swPath = path.join(dist, 'service-worker.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
sw = sw.replace(
  /\/\/ <precache:start>[\s\S]*?\/\/ <precache:end>/,
  `// <precache:start>\nconst PRECACHE = ${JSON.stringify(precache, null, 2)};\n// <precache:end>`,
);
if (!sw.includes(`'${version}'`) || !sw.includes(JSON.stringify(precache[0]))) {
  console.error('Failed to stamp the service worker.');
  process.exit(1);
}
fs.writeFileSync(swPath, sw);

// Sanity checks: everything referenced must exist in dist/.
for (const url of precache) {
  const p = url === '/' ? path.join(dist, 'index.html') : path.join(dist, url);
  if (!fs.existsSync(p)) { console.error(`Precache entry missing from dist: ${url}`); process.exit(1); }
}

console.log(`Built dist/ — ${files.length} files, ${precache.length} precached, version ${version}`);
