// Zero-dependency local server: static files + the Netlify Functions, for when you don't
// have the Netlify CLI. `netlify dev` is the closest match to production; this mimics it
// well enough for development and for the end-to-end tests.
//
//   node scripts/dev-server.mjs                      serve the source tree on :8888
//   node scripts/dev-server.mjs --dir dist           serve the built app (what Netlify deploys)
//   node scripts/dev-server.mjs --port 9000
//   RLS_DEV_ALLOW_PRIVATE=1 node scripts/dev-server.mjs   let the importer fetch localhost pages
//                                                         (tests only — never enable in production)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };

const port = Number(opt('port', process.env.PORT || 8888));
const dir = path.resolve(root, opt('dir', '.'));
const allowPrivate = process.env.RLS_DEV_ALLOW_PRIVATE === '1';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

// Reuse the production Content-Security-Policy so violations show up during development.
let csp = '';
try {
  const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  csp = (toml.match(/Content-Security-Policy\s*=\s*"([^"]+)"/) || [])[1] || '';
} catch { /* optional */ }

// ---- functions ---------------------------------------------------------------------------------
const functions = {};
async function loadFunctions() {
  const imp = await import(pathToFileURL(path.join(root, 'functions/import-recipe.js')));
  const img = await import(pathToFileURL(path.join(root, 'functions/fetch-image.js')));
  const { fetchHtml, fetchImage } = await import(pathToFileURL(path.join(root, 'functions/lib/safe-fetch.js')));
  if (allowPrivate) {
    console.warn('! RLS_DEV_ALLOW_PRIVATE=1: the importer may fetch private/localhost URLs. Testing only.');
    functions['import-recipe'] = imp.createHandler({ allowPrivate: true, fetchPage: (u) => fetchHtml(u, { allowPrivate: true, timeoutMs: 8000 }) });
    functions['fetch-image'] = img.createHandler({ allowPrivate: true, getImage: (u, referer) => fetchImage(u, { allowPrivate: true, referer }) });
  } else {
    functions['import-recipe'] = imp.handler;
    functions['fetch-image'] = img.handler;
  }
}

async function runFunction(name, req, res, body) {
  const fn = functions[name];
  if (!fn) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'No such function.' } })); return; }
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  const out = await fn({ httpMethod: req.method, headers, body, isBase64Encoded: false, path: req.url, queryStringParameters: {} });
  const outHeaders = { ...(out.headers || {}) };
  res.writeHead(out.statusCode || 200, outHeaders);
  res.end(out.isBase64Encoded ? Buffer.from(out.body || '', 'base64') : out.body || '');
}

// ---- static -----------------------------------------------------------------------------------------
function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  let file = path.normalize(path.join(dir, pathname));
  if (!file.startsWith(dir)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
  const ext = path.extname(file).toLowerCase();
  const headers = {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };
  if (csp) headers['Content-Security-Policy'] = csp;
  if (pathname === '/manifest.json') headers['Content-Type'] = 'application/manifest+json; charset=utf-8';
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

await loadFunctions();

http.createServer((req, res) => {
  const m = req.url.match(/^\/\.netlify\/functions\/([\w-]+)/);
  if (m) {
    const chunks = [];
    req.on('data', (c) => { chunks.push(c); if (Buffer.concat(chunks).length > 1_000_000) req.destroy(); });
    req.on('end', () => runFunction(m[1], req, res, Buffer.concat(chunks).toString('utf8')).catch((e) => {
      console.error(e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: { code: 'FETCH_FAILED', message: 'Unexpected error.' } }));
    }));
    return;
  }
  serveStatic(req, res);
}).listen(port, () => {
  console.log(`Recipe Library Studio dev server: http://localhost:${port}  (serving ${path.relative(root, dir) || '.'})`);
});
