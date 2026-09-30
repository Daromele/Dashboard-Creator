/**
 * rate-limit.js — lightweight, login-free abuse protection.
 *
 * A sliding-window counter per client IP, kept in the function instance's
 * memory. This is deliberately best-effort: Netlify may run several instances
 * and recycles them, so it cannot be a hard guarantee. Together with the
 * same-origin check, the client-side throttle and the small timeouts/size
 * limits it keeps casual abuse from running up the bill without needing
 * accounts or a database. Nothing is persisted.
 */
export function createRateLimiter({ perMinute = 12, perHour = 120, maxKeys = 5000, now = () => Date.now() } = {}) {
  const hits = new Map(); // ip -> number[] (timestamps, ms)

  function prune(list, t) {
    const cutoff = t - 3_600_000;
    while (list.length && list[0] < cutoff) list.shift();
  }

  return {
    /** Returns { ok: true } or { ok: false, retryAfterSec }. */
    check(key) {
      const t = now();
      let list = hits.get(key);
      if (!list) {
        if (hits.size >= maxKeys) {
          // Drop the oldest entry rather than growing without bound.
          hits.delete(hits.keys().next().value);
        }
        list = [];
        hits.set(key, list);
      }
      prune(list, t);
      const lastMinute = list.filter((x) => x > t - 60_000);
      if (lastMinute.length >= perMinute) {
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((lastMinute[0] + 60_000 - t) / 1000)) };
      }
      if (list.length >= perHour) {
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((list[0] + 3_600_000 - t) / 1000)) };
      }
      list.push(t);
      return { ok: true };
    },
    reset() { hits.clear(); },
  };
}
