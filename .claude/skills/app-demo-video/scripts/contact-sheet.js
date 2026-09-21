#!/usr/bin/env node
/* Lay the take out as a grid of stills so you can SEE what you captured
 * before spending time encoding.
 *
 *   node contact-sheet.js <videoDir> [everyNSeconds] [cols] [rows]
 *
 * This is the step that catches the things that ruin a demo video: an
 * onboarding modal still on screen, a "set up your backup" nag, a toast
 * mid-fade, a cursor parked over something. All far cheaper to spot here
 * than after encoding.
 */
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const dir = path.resolve(process.argv[2] || './video');
const every = parseFloat(process.argv[3] || '1.6');
const cols = parseInt(process.argv[4] || '5', 10);
const rows = parseInt(process.argv[5] || '3', 10);
const take = JSON.parse(fs.readFileSync(path.join(dir, 'take.json'), 'utf8'));
const FF = require('ffmpeg-static'); fs.chmodSync(FF, 0o755);
const out = path.join(dir, 'contact.png');
execFileSync(FF, ['-hide_banner','-loglevel','error','-i', take.raw,
  '-vf', `fps=1/${every},scale=330:-1,tile=${cols}x${rows}`,
  '-frames:v','1', out, '-y'], { stdio:'inherit' });
console.log(out);
