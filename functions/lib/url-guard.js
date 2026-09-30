/**
 * url-guard.js — SSRF protection for the recipe importer.
 *
 * Two layers:
 *   1. validateUrl()      static checks on the URL a user submits (and on every
 *                         redirect target): protocol, credentials, port, host
 *                         name patterns, IP literals.
 *   2. guardedLookup()    a dns.lookup replacement used for the actual socket
 *                         connection. It rejects any hostname that resolves to a
 *                         private / loopback / link-local / metadata address, so
 *                         DNS-rebinding and "public name -> private IP" tricks
 *                         are stopped at connect time, not just at check time.
 */
import dns from 'node:dns';
import net from 'node:net';

export class GuardError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GuardError';
    this.code = code;
  }
}

const BLOCKED_SUFFIXES = [
  '.localhost', '.local', '.localdomain', '.internal', '.intranet', '.lan', '.home',
  '.corp', '.private', '.home.arpa', '.test', '.invalid', '.example',
];
const BLOCKED_NAMES = new Set([
  'localhost', 'metadata', 'metadata.google.internal', 'instance-data', 'kubernetes',
  'kubernetes.default', 'host.docker.internal',
]);
const ALLOWED_PORTS = new Set(['', '80', '443']);

/** Parse an IPv4 string to a 32-bit number, or null. */
function ipv4ToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

const V4_BLOCKS = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => [ipv4ToInt(base), bits]);

function v4Private(n) {
  for (const [base, bits] of V4_BLOCKS) {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if (((n >>> 0) & mask) === ((base >>> 0) & mask)) return true;
  }
  return false;
}

/** Expand an IPv6 string into 8 16-bit groups, or null when malformed. */
function ipv6Groups(ip) {
  let s = ip.toLowerCase().split('%')[0];
  // embedded IPv4 tail (::ffff:1.2.3.4)
  const tail = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const v4 = ipv4ToInt(tail[1]);
    if (v4 == null) return null;
    s = s.slice(0, -tail[1].length) + ((v4 >>> 16) & 0xffff).toString(16) + ':' + (v4 & 0xffff).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  let groups;
  if (halves.length === 2) {
    const missing = 8 - head.length - rest.length;
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill('0'), ...rest];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  const out = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return out.some(Number.isNaN) ? null : out;
}

/**
 * True when an IP (v4 or v6) is not safely routable on the public internet.
 * Unparseable input counts as private (fail closed).
 */
export function isPrivateAddress(ip) {
  const family = net.isIP(ip);
  if (family === 4) {
    const n = ipv4ToInt(ip);
    return n == null ? true : v4Private(n);
  }
  if (family === 6) {
    const g = ipv6Groups(ip);
    if (!g) return true;
    const allZero = g.every((x) => x === 0);
    if (allZero) return true; // ::
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
    const embeddedV4 = () => ((g[6] << 16) | g[7]) >>> 0;
    // IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d
    if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return v4Private(embeddedV4());
    // NAT64 64:ff9b::/96
    if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return v4Private(embeddedV4());
    if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
    if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site local
    if ((g[0] & 0xff00) === 0xff00) return true; // multicast
    if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
    if (g[0] === 0x2001 && g[1] === 0) return true; // teredo
    if (g[0] === 0x2002) return v4Private(((g[1] << 16) | g[2]) >>> 0); // 6to4
    if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // discard
    return false;
  }
  return true;
}

/**
 * Validate a URL string for outbound fetching. Returns a WHATWG URL.
 * Throws GuardError with a stable `code` the frontend understands.
 * `allowPrivate` exists only so the test-suite can hit a local fixture server;
 * production handlers never pass it.
 */
export function validateUrl(raw, { allowPrivate = false } = {}) {
  if (typeof raw !== 'string' || !raw.trim()) throw new GuardError('INVALID_URL', 'Please enter a recipe link.');
  const text = raw.trim();
  if (text.length > 2048) throw new GuardError('INVALID_URL', 'That link is too long.');
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new GuardError('INVALID_URL', "That doesn't look like a valid link.");
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new GuardError('UNSUPPORTED_PROTOCOL', 'Only http and https links can be imported.');
  }
  if (url.username || url.password) {
    throw new GuardError('BLOCKED_HOST', 'Links containing a username or password are not allowed.');
  }
  if (allowPrivate) return url;

  if (!ALLOWED_PORTS.has(url.port)) {
    throw new GuardError('BLOCKED_HOST', 'That address is not allowed (unsupported port).');
  }
  let host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || !/^(\[[0-9a-f:.]+\]|[a-z0-9_-]+(\.[a-z0-9_-]+)*)$/.test(host)) {
    throw new GuardError('INVALID_URL', "That doesn't look like a valid link.");
  }

  // IP literals (WHATWG URL already normalises 0x7f.1, 2130706433, [::1] …)
  const bare = host.startsWith('[') ? host.slice(1, -1) : host;
  if (net.isIP(bare)) {
    throw new GuardError('BLOCKED_HOST', 'Links to IP addresses are not allowed.');
  }
  if (BLOCKED_NAMES.has(host) || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new GuardError('BLOCKED_HOST', 'That address is not allowed.');
  }
  if (!host.includes('.')) {
    throw new GuardError('BLOCKED_HOST', 'That address is not allowed (internal host name).');
  }
  return url;
}

/**
 * Drop-in replacement for dns.lookup that refuses private results.
 * Works with both the classic (err, address, family) and the `all: true`
 * (err, [{address, family}]) callback styles Node's net module uses.
 */
export function createGuardedLookup({ resolver = dns.lookup, allowPrivate = false } = {}) {
  return function guardedLookup(hostname, options, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    const wantAll = !!(options && options.all);
    const opts = { ...(options || {}), all: true, verbatim: true };
    resolver(hostname, opts, (err, addresses) => {
      if (err) return callback(err);
      const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: net.isIP(addresses) }];
      if (!list.length) return callback(new GuardError('FETCH_FAILED', 'Host did not resolve.'));
      if (!allowPrivate) {
        const bad = list.find((a) => isPrivateAddress(a.address));
        if (bad) return callback(new GuardError('BLOCKED_HOST', 'That address is not allowed.'));
      }
      if (wantAll) return callback(null, list);
      return callback(null, list[0].address, list[0].family);
    });
  };
}
