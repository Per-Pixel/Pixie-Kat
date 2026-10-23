#!/usr/bin/env node
// Turn an animated GIF (or any video ffmpeg reads) into still frames plus a
// contact-sheet montage, so the animation can be "watched" as images.
//
// Usage:
//   node scripts/gif-frames.mjs <file.gif> [--frames 12] [--fps 4] [--width 480] [--out dir]
//
// Requires ffmpeg + ffprobe on PATH.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const die = (msg) => { console.error(`gif-frames: ${msg}`); process.exit(1); };

// --- args -------------------------------------------------------------------
const opts = {};
let input = null;
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) opts[a.slice(2)] = process.argv[++i];
  else input = a;
}
if (!input || opts.help !== undefined) {
  console.log('Usage: node scripts/gif-frames.mjs <file.gif> [--frames 12] [--fps 4] [--width 480] [--out dir]');
  process.exit(input ? 0 : 1);
}
if (!existsSync(input)) die(`file not found: ${input}`);

const maxFrames = Math.max(1, parseInt(opts.frames ?? '12', 10) || 12);
const width = Math.max(16, parseInt(opts.width ?? '480', 10) || 480);
const outDir = resolve(opts.out ?? join('.tmp', 'gif-frames', basename(input, extname(input))));

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.error) die(`${cmd} failed to launch: ${r.error.message}`);
  return r;
};
const probe = (args) => {
  const r = run('ffprobe', ['-v', 'error', ...args, '-of', 'default=noprint_wrappers=1:nokey=1', input]);
  return r.status === 0 ? r.stdout.trim() : '';
};

// --- pick sampling rate ------------------------------------------------------
const duration = parseFloat(probe(['-show_entries', 'format=duration']));
const [rn, rd] = probe(['-select_streams', 'v:0', '-show_entries', 'stream=avg_frame_rate']).split('/').map(Number);
const srcFps = rn && rd ? rn / rd : NaN;

let fps = opts.fps ? parseFloat(opts.fps) : NaN;
if (!Number.isFinite(fps)) {
  fps = Number.isFinite(duration) && duration > 0 ? maxFrames / duration : 4;
  if (Number.isFinite(srcFps)) fps = Math.min(fps, srcFps);
}
fps = Math.min(60, Math.max(0.05, Math.round(fps * 1000) / 1000));

// --- extract -----------------------------------------------------------------
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const vf = `fps=${fps},scale=${width}:-1:flags=lanczos`;
const ex = run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vf', vf, join(outDir, 'f_%03d.png')]);
if (ex.status !== 0) die(`ffmpeg failed: ${ex.stderr}`);

const frames = readdirSync(outDir).filter(f => /^f_\d+\.png$/.test(f)).sort();
if (!frames.length) die('no frames extracted');
const step = 1 / fps;

// --- contact sheet ------------------------------------------------------------
const cols = Math.ceil(Math.sqrt(frames.length));
const rows = Math.ceil(frames.length / cols);
const sheet = join(outDir, 'sheet.png');
const ms = run('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', '1', '-i', join(outDir, 'f_%03d.png'),
  '-vf', `tile=${cols}x${rows}:margin=8:padding=4:color=0x111111`,
  '-frames:v', '1', sheet,
]);
if (ms.status !== 0) console.error(`gif-frames: montage failed (${ms.stderr.trim()}) — frames still usable`);

// --- report -------------------------------------------------------------------
console.log(`input:   ${resolve(input)}`);
console.log(`info:    duration=${Number.isFinite(duration) ? duration.toFixed(2) + 's' : '?'} srcFps=${Number.isFinite(srcFps) ? srcFps.toFixed(2) : '?'} -> sampled at ${fps}fps (every ${step.toFixed(2)}s)`);
console.log(`frames:  ${frames.length}`);
frames.forEach((f, i) => console.log(`  ${join(outDir, f)}  t=${(i * step).toFixed(2)}s`));
if (existsSync(sheet)) console.log(`sheet:   ${sheet}  (${cols}x${rows} grid, left-to-right top-to-bottom)`);
