/**
 * timers.js — cooking timers.
 *
 *  detectDurations(text)  pure: finds "bake for 25 minutes", "1 hour 30 minutes",
 *                         "2-3 minutes" … and returns timer suggestions.
 *  Timer manager          multiple concurrent timers that keep running while
 *                         you navigate the app. Timers are stored as absolute
 *                         end times (localStorage), so a reload never loses them.
 *                         On completion: in-app banner + beep + vibration, and a
 *                         system notification only if the user allowed it.
 */
import { createEmitter, uid } from './util.js';

// ---------------------------------------------------------------------------
// Duration detection (pure)
// ---------------------------------------------------------------------------

const WORD_NUMBERS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, sixty: 60,
};
const UNIT_SECONDS = { h: 3600, m: 60, s: 1 };

const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?\s*[½¼¾]|[½¼¾]|\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|sixty)`;
const UNIT = String.raw`(hours?|hrs?|minutes?|mins?|seconds?|secs?)`;
const RANGE_SEP = String.raw`\s*(?:-|–|—|to|or)\s*`;
const DURATION_RE = new RegExp(String.raw`\b(${NUM})(?:${RANGE_SEP}(${NUM}))?\s*${UNIT}\b`, 'gi');
const FRACTION_CHARS = { '½': 0.5, '¼': 0.25, '¾': 0.75 };

function numberValue(token) {
  const t = token.trim().toLowerCase();
  if (t in WORD_NUMBERS) return WORD_NUMBERS[t];
  let m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return +m[1] + +m[2] / +m[3];
  m = t.match(/^(\d+)\/(\d+)$/);
  if (m) return +m[1] / +m[2];
  m = t.match(/^(\d+(?:\.\d+)?)\s*([½¼¾])$/);
  if (m) return parseFloat(m[1]) + FRACTION_CHARS[m[2]];
  if (t in FRACTION_CHARS) return FRACTION_CHARS[t];
  const n = parseFloat(t);
  return isFinite(n) ? n : NaN;
}

function unitSeconds(u) {
  const k = u.toLowerCase()[0];
  return UNIT_SECONDS[k];
}

/** "25-minute", "1 hr 30 min", "45-second" for button labels. */
export function formatTimerLabel(seconds) {
  const s = Math.round(seconds);
  if (s < 60) return `${s}-second`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return rest ? `${m} min ${rest} sec` : `${m}-minute`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return m ? `${h} hr ${m} min` : `${h}-hour`;
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * Find obvious durations. Adjacent parts ("1 hour and 30 minutes") merge into
 * one timer. Ranges ("20-25 minutes") start at the lower bound.
 * Returns [{ seconds, secondsMax, text, label, index }].
 */
export function detectDurations(text) {
  const src = String(text || '');
  const found = [];
  DURATION_RE.lastIndex = 0;
  let m;
  while ((m = DURATION_RE.exec(src))) {
    const lo = numberValue(m[1]);
    const hi = m[2] ? numberValue(m[2]) : NaN;
    if (!isFinite(lo) || lo <= 0) continue;
    const mult = unitSeconds(m[3]);
    const seconds = Math.round(lo * mult);
    const secondsMax = isFinite(hi) && hi >= lo ? Math.round(hi * mult) : seconds;
    // "a" / "an" only count when directly followed by a unit, which the regex already guarantees.
    found.push({ seconds, secondsMax, text: m[0], index: m.index, end: m.index + m[0].length });
  }
  // merge "1 hour and 30 minutes" / "1 hour 30 minutes"
  const merged = [];
  for (const f of found) {
    const prev = merged[merged.length - 1];
    if (prev && /^\s*(?:and|,)?\s*$/i.test(src.slice(prev.end, f.index)) && /h/i.test(prev.text.split(/\s/).pop()) && f.seconds < 3600) {
      prev.seconds += f.seconds;
      prev.secondsMax += f.secondsMax;
      prev.text = src.slice(prev.index, f.end);
      prev.end = f.end;
    } else merged.push({ ...f });
  }
  return merged
    .filter((f) => f.seconds >= 5 && f.seconds <= 48 * 3600)
    .map((f) => ({ seconds: f.seconds, secondsMax: f.secondsMax, text: f.text, index: f.index, label: formatTimerLabel(f.seconds) }));
}

// ---------------------------------------------------------------------------
// Timer manager
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'rls_timers';
const emitter = createEmitter();
export const onTimersChange = emitter.on;
let timers = [];
let ticker = null;
let audioCtx = null;

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(timers)); } catch { /* storage blocked */ }
}

export function initTimers() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    timers = Array.isArray(raw) ? raw.filter((t) => t && t.id && Number.isFinite(t.endAt)) : [];
  } catch { timers = []; }
  const now = Date.now();
  for (const t of timers) if (!t.done && t.endAt <= now) { t.done = true; t.missed = true; }
  save();
  ensureTicker();
  emitter.emit({ type: 'init' });
}

export function listTimers() { return timers.map((t) => ({ ...t })); }
export function activeTimerCount() { return timers.filter((t) => !t.done).length; }
export function remainingSeconds(t) { return Math.max(0, (t.endAt - Date.now()) / 1000); }

function ensureTicker() {
  const needs = timers.some((t) => !t.done);
  if (needs && !ticker) ticker = setInterval(tick, 500);
  if (!needs && ticker) { clearInterval(ticker); ticker = null; }
}

function tick() {
  const now = Date.now();
  let finished = false;
  for (const t of timers) {
    if (!t.done && t.endAt <= now) { t.done = true; finished = true; alarm(t); }
  }
  if (finished) { save(); ensureTicker(); }
  emitter.emit({ type: finished ? 'done' : 'tick' });
}

export function startTimer({ label, seconds, recipeId = '', recipeTitle = '' }) {
  ensureAudio();
  const t = { id: uid(), label: String(label || 'Timer').slice(0, 80), seconds: Math.round(seconds), endAt: Date.now() + Math.round(seconds) * 1000, recipeId, recipeTitle, done: false };
  timers.push(t);
  save();
  ensureTicker();
  emitter.emit({ type: 'start', timer: t });
  return t;
}

export function addTime(id, seconds = 60) {
  const t = timers.find((x) => x.id === id);
  if (!t) return;
  if (t.done) { t.done = false; t.missed = false; t.endAt = Date.now() + seconds * 1000; } else t.endAt += seconds * 1000;
  save(); ensureTicker();
  emitter.emit({ type: 'change' });
}

export function dismissTimer(id) {
  timers = timers.filter((t) => t.id !== id);
  save(); ensureTicker();
  emitter.emit({ type: 'change' });
}

export function dismissDoneTimers() {
  timers = timers.filter((t) => !t.done);
  save();
  emitter.emit({ type: 'change' });
}

// ---- alerts ---------------------------------------------------------------

function ensureAudio() {
  try {
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* audio unavailable */ }
}

function beep() {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const now = audioCtx.currentTime;
  [0, 0.35, 0.7].forEach((offset) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.3);
  });
}

function alarm(t) {
  beep();
  try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 600]); } catch { /* unsupported */ }
  notify(t).catch(() => {});
}

export function notificationState() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission; // default | granted | denied
}

/** Must be called from a user gesture (button click). */
export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

async function notify(t) {
  if (notificationState() !== 'granted') return;
  const title = 'Timer finished';
  const options = {
    body: `${t.label}${t.recipeTitle ? ` · ${t.recipeTitle}` : ''}`,
    tag: `timer-${t.id}`,
    renotify: true,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [300, 150, 300],
  };
  try {
    const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (reg && reg.showNotification) { await reg.showNotification(title, options); return; }
  } catch { /* fall back */ }
  try { new Notification(title, options); } catch { /* not allowed */ }
}
