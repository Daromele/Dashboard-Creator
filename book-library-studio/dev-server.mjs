// Local preview: serves site/ and runs the link reader, like Netlify does.
//   node dev-server.mjs [port]      then open http://localhost:8888
// Set ALLOW_PRIVATE_URLS=1 to let the link reader open pages on this computer (tests use it for fixtures).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import handler from './netlify/functions/resolve-book-link.mjs';

const port = +(process.argv[2] || process.env.PORT || 8888), root = new URL('./site/', import.meta.url).pathname, fixtures = new URL('./test/fixtures/', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.csv': 'text/csv' };
createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/.netlify/functions/resolve-book-link') {
    const body = await new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); });
    const out = await handler(new Request(url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? body : undefined }), { ip: req.socket.remoteAddress });
    res.writeHead(out.status, Object.fromEntries(out.headers)); return res.end(await out.text());
  }
  const base = url.pathname.startsWith('/fixtures/') && process.env.ALLOW_PRIVATE_URLS === '1' ? fixtures : root;
  const rel = normalize(decodeURIComponent(url.pathname.replace(/^\/fixtures\//, '/'))).replace(/^(\.\.[/\\])+/, '');
  try { const file = join(base, rel.endsWith('/') ? rel + 'index.html' : rel), data = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, () => console.log(`Book Library Studio on http://localhost:${port}`));
