// End-to-end harness: builds dist/, starts the app server (static + functions) and a fixture
// website, launches Chromium, and runs scenarios with console/CSP/page-error capture.
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturesDir = path.join(root, 'test/fixtures');

export function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}

async function waitForHttp(url, ms = 10000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.status < 500) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server did not start: ${url}`);
}

/** A small fake "recipe website" used as the import target. */
export async function startFixtureSite(browser) {
  // Real JPEG bytes (rendered by the browser) for image-caching tests.
  const page = await browser.newPage();
  await page.setContent('<canvas id=c width=900 height=600></canvas>');
  const jpegB64 = await page.evaluate(() => {
    const c = document.getElementById('c');
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 900, 600);
    grad.addColorStop(0, '#d9822b'); grad.addColorStop(1, '#6b8f3a');
    g.fillStyle = grad; g.fillRect(0, 0, 900, 600);
    g.fillStyle = '#fff'; g.font = '80px sans-serif'; g.fillText('Soup', 340, 320);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  });
  await page.close();
  const jpeg = Buffer.from(jpegB64, 'base64');

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const hits = { count: 0 };
  const server = http.createServer((req, res) => {
    hits.count++;
    const u = new URL(req.url, base);
    const send = (status, type, body, headers = {}) => { res.writeHead(status, { 'Content-Type': type, ...headers }); res.end(body); };
    if (u.pathname === '/img/soup.jpg') return send(200, 'image/jpeg', jpeg);
    if (u.pathname === '/blocked') return send(403, 'text/html', 'Forbidden');
    if (u.pathname === '/gone') return send(404, 'text/html', 'Not found');
    if (u.pathname === '/file.pdf') return send(200, 'application/pdf', '%PDF-1.4 fake');
    if (u.pathname === '/redirect') return send(302, 'text/plain', '', { Location: '/simple-jsonld.html' });
    if (u.pathname === '/with-image.html') {
      return send(200, 'text/html; charset=utf-8', `<!doctype html><html><head><title>Pumpkin Soup</title><script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Recipe', name: 'Pumpkin Soup with Photo', image: `${base}/img/soup.jpg`, author: { '@type': 'Person', name: 'Fixture Chef' },
        recipeYield: '4 servings', prepTime: 'PT10M', cookTime: 'PT30M', recipeCategory: 'Main Course', recipeCuisine: 'American', keywords: 'soup, autumn',
        recipeIngredient: ['2 cups pumpkin puree', '1 onion, diced', '3 cups vegetable broth', '1/2 tsp nutmeg'],
        recipeInstructions: [{ '@type': 'HowToStep', text: 'Saute the onion for 5 minutes.' }, { '@type': 'HowToStep', text: 'Add puree and broth; simmer for 20 minutes.' }],
      })}</script></head><body></body></html>`);
    }
    if (u.pathname === '/xss.html') {
      return send(200, 'text/html; charset=utf-8', `<!doctype html><html><head><title>XSS</title><script type="application/ld+json">${JSON.stringify({
        '@type': 'Recipe', name: 'Safe <img src=x onerror="window.__pwned=1"> Title', description: '<script>window.__pwned=2<\/script>Tasty',
        recipeIngredient: ['1 cup <b onmouseover="window.__pwned=3">flour</b>'], recipeInstructions: ['Bake <iframe src="javascript:window.__pwned=4"></iframe> it.'],
      }).replace(/</g, '\\u003c')}</script></head><body></body></html>`);
    }
    const file = path.join(fixturesDir, path.basename(u.pathname));
    if (u.pathname.endsWith('.html') && fs.existsSync(file)) return send(200, 'text/html; charset=utf-8', fs.readFileSync(file));
    return send(404, 'text/plain', 'nope');
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { base, hits, close: () => new Promise((r) => server.close(r)) };
}

export async function startApp() {
  execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { cwd: root, stdio: 'inherit' });
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, 'scripts/dev-server.mjs'), '--dir', 'dist', '--port', String(port)], {
    cwd: root, env: { ...process.env, RLS_DEV_ALLOW_PRIVATE: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (d) => { const t = String(d); if (!/RLS_DEV_ALLOW_PRIVATE/.test(t)) process.stderr.write(t); });
  const base = `http://127.0.0.1:${port}`;
  await waitForHttp(base);
  return { base, close: () => child.kill() };
}

export async function launch() {
  return chromium.launch({ args: ['--disable-dev-shm-usage'] });
}

// ---------------------------------------------------------------------------
// tiny test runner
// ---------------------------------------------------------------------------

export class Runner {
  constructor({ browser, app, site }) {
    Object.assign(this, { browser, app, site });
    this.tests = [];
    this.test = (name, fn, opts = {}) => { this.tests.push({ name, fn, opts }); }; // bound so it can be destructured
  }

  async run(filter) {
    const only = filter ? new RegExp(filter, 'i') : null;
    const results = [];
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    for (const t of this.tests) {
      if (only && !only.test(t.name)) continue;
      const started = Date.now();
      const ctx = await this.browser.newContext({
        viewport: t.opts.viewport || { width: 390, height: 844 },
        acceptDownloads: true,
        serviceWorkers: t.opts.serviceWorkers || 'allow',
        permissions: ['clipboard-read', 'clipboard-write'],
        ...(t.opts.context || {}),
      });
      const issues = [];
      ctx.on('page', (p) => {
        p.on('console', (m) => {
          const text = m.text();
          if (m.type() === 'error' || /Content Security Policy|violates/i.test(text)) {
            if (t.opts.allowConsole && t.opts.allowConsole.test(text)) return;
            if (/Failed to load resource/.test(text) && t.opts.allowNetworkErrors) return;
            issues.push(`console.${m.type()}: ${text}`);
          }
        });
        p.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));
      });
      let error = null;
      try {
        await t.fn({ ctx, app: this.app.base, site: this.site.base, browser: this.browser, siteHits: this.site.hits });
        if (issues.length && !t.opts.ignoreIssues) throw new Error(`Unexpected browser issues:\n  ${issues.join('\n  ')}`);
      } catch (e) {
        error = e;
        try { const p = ctx.pages()[0]; if (p) await p.screenshot({ path: path.join(root, 'test-results', `${t.name.replace(/\W+/g, '_')}.png`) }); } catch { /* ignore */ }
      }
      await ctx.close();
      const ms = Date.now() - started;
      results.push({ name: t.name, ok: !error, error, ms });
      console.log(`${error ? '✗' : '✓'} ${t.name} (${(ms / 1000).toFixed(1)}s)`);
      if (error) console.log(String(error.stack || error).split('\n').map((l) => `    ${l}`).join('\n'));
    }
    return results;
  }
}

export async function until(fn, { timeout = 8000, interval = 80, message = 'condition' } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try { const v = await fn(); if (v) return v; last = v; } catch (e) { last = e; }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Timed out waiting for ${message}${last instanceof Error ? `: ${last.message}` : ''}`);
}
