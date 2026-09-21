#!/usr/bin/env node
/* Turn the raw take into deliverable MP4s.
 *
 *   node encode.js <videoDir> [--trim 3.7] [--seconds 15] [--name MyApp] [--gif]
 *
 * Kept separate from recording so you can re-cut the trim point and the
 * target length without sitting through another take.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || './video');
const arg = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const has = f => process.argv.includes(f);

const take = JSON.parse(fs.readFileSync(path.join(dir, 'take.json'), 'utf8'));
const name = arg('--name', 'demo');
/* Default the trim to the staging the recorder measured. Override only if
   the contact sheet shows the app still settling after that point. */
const trim = parseFloat(arg('--trim', ((take.setupMs || 0) / 1000).toFixed(2)));
const target = parseFloat(arg('--seconds', '0'));

/* Playwright bundles its own ffmpeg, but it is compiled down to VP8/WebM
 * only — no H.264, no MP4. Marketplaces and social platforms generally want
 * MP4, so a full build is required. ffmpeg-static ships one as an npm
 * package, which avoids needing a system install. */
let FF;
try { FF = require('ffmpeg-static'); }
catch {
  console.error('Missing encoder. Run:  npm install --no-save ffmpeg-static');
  process.exit(1);
}
fs.chmodSync(FF, 0o755);

const run = args => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', ...args],
  { stdio: ['ignore', 'pipe', 'inherit'] });
/* `ffmpeg -i file` with no output exits non-zero and reports on stderr, so
   the duration has to be read out of the thrown error. */
const durationOf = f => {
  let text = '';
  try { text = execFileSync(FF, ['-hide_banner','-i',f],
    { stdio:['ignore','pipe','pipe'], encoding:'utf8' }) || ''; }
  catch (e) { text = (e.stderr || '').toString(); }
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(text);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
};

const H264 = ['-c:v','libx264','-preset','slow','-crf','19','-pix_fmt','yuv420p',
              '-profile:v','high','-level','4.0','-movflags','+faststart','-an'];

/* Capture keeps running while the browser context flushes and closes, so the
   raw file has a tail of frozen final frame after the last scripted beat.
   Cutting to the scripted length keeps the output deterministic — and stops
   that dead tail from skewing the speed factor for a fixed-length cut. */
const holdTail = parseFloat(arg('--tail', '0.4'));       // a beat to rest on
const contentSec = (take.contentMs || 0) / 1000;
const LIMIT = contentSec > 0 ? ['-t', (contentSec + holdTail).toFixed(2)] : [];

/* Natural pace */
const full = path.join(dir, `${name}-full.mp4`);
run(['-ss', String(trim), '-i', take.raw, ...LIMIT, ...H264, full, '-y']);
const fullDur = durationOf(full);
console.log(`trim ${trim}s off the head`);
console.log(`${path.basename(full)}  ${fullDur.toFixed(2)}s`);

/* A fixed-length cut, if asked for. Speeding a UI demo slightly reads as
 * energetic rather than rushed, and most listing slots cap the length. */
if (target > 0 && fullDur > 0){
  const rate = (fullDur / target).toFixed(4);
  const cut = path.join(dir, `${name}-${target}s.mp4`);
  run(['-ss', String(trim), '-i', take.raw, ...LIMIT, '-vf', `setpts=PTS/${rate}`, '-r', '25',
       ...H264, cut, '-y']);
  console.log(`${path.basename(cut)}  ~${target}s  (${rate}x)`);
}

/* First frame doubles as a listing still / poster image */
const poster = path.join(dir, `${name}-poster.png`);
run(['-ss', String(trim), '-i', take.raw, '-frames:v', '1', poster, '-y']);
console.log(path.basename(poster));

if (has('--gif')){
  const pal = path.join(dir, 'palette.png');
  const gif = path.join(dir, `${name}.gif`);
  run(['-ss', String(trim), '-i', take.raw, ...LIMIT, '-vf',
       'fps=12,scale=600:-1:flags=lanczos,palettegen', pal, '-y']);
  run(['-ss', String(trim), '-i', take.raw, ...LIMIT, '-i', pal, '-lavfi',
       'fps=12,scale=600:-1:flags=lanczos[x];[x][1:v]paletteuse', gif, '-y']);
  fs.unlinkSync(pal);
  console.log(path.basename(gif));
}
