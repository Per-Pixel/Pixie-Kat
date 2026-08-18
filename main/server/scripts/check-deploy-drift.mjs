#!/usr/bin/env node
/**
 * Detect when the deployed backend is behind the repo.
 *
 * The frontend auto-deploys via Amplify on branch push, but the backend only
 * ships on a manual `eb deploy`. A commit touching both lands halfway, and the
 * symptom is a bare 404 on any newly added route — which is exactly how
 * /api/batch-validate broke in production (added 2026-08-11, last deploy
 * 2026-08-08).
 *
 * Compares the Elastic Beanstalk version label (`app-YYMMDD_HHMMSS…`, stamped
 * by `eb deploy`) against the last commit that touched main/server.
 *
 * Exit codes: 0 = up to date, 1 = drift detected, 2 = could not determine.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// `shell` is only needed on Windows to resolve the `eb` batch shim. It must stay
// off for git: with a shell, an argument containing a space (e.g. `--format=%h %s`)
// gets re-split and git reads the tail as a revision.
function run(cmd, args, { cwd = SERVER_DIR, shell = false } = {}) {
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell,
  }).trim();
}

// `app-260808_150415623113` -> Date (label timestamp is UTC)
function parseVersionLabel(label) {
  const m = /app-(\d{2})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(label);
  if (!m) return null;
  const [, yy, mm, dd, hh, mi, ss] = m.map(Number);
  return new Date(Date.UTC(2000 + yy, mm - 1, dd, hh, mi, ss));
}

let ebStatus;
try {
  ebStatus = run('eb', ['status'], { shell: process.platform === 'win32' });
} catch (err) {
  console.error('Could not run `eb status`. Is the EB CLI installed and configured?');
  console.error(String(err.stderr || err.message).trim());
  process.exit(2);
}

const labelMatch = /Deployed Version:\s*(\S+)/.exec(ebStatus);
if (!labelMatch) {
  console.error('Could not find "Deployed Version" in `eb status` output:\n' + ebStatus);
  process.exit(2);
}

const label = labelMatch[1];
const deployedAt = parseVersionLabel(label);
if (!deployedAt) {
  console.error(`Unrecognized version label "${label}" — cannot infer a deploy time.`);
  console.error('If deploys stopped using the default app-YYMMDD_HHMMSS labels, this check needs updating.');
  process.exit(2);
}

const REPO_ROOT = path.resolve(SERVER_DIR, '../..');
let lastCommitIso, lastCommitSubject;
try {
  lastCommitIso = run('git', ['log', '-1', '--format=%cI', '--', 'main/server'], { cwd: REPO_ROOT });
  lastCommitSubject = run('git', ['log', '-1', '--format=%h %s', '--', 'main/server'], { cwd: REPO_ROOT });
} catch (err) {
  console.error('Could not read git history for main/server.');
  console.error(String(err.stderr || err.message).trim());
  process.exit(2);
}

const committedAt = new Date(lastCommitIso);

console.log(`Deployed version : ${label}  (${deployedAt.toISOString()})`);
console.log(`Last server commit: ${lastCommitSubject}  (${committedAt.toISOString()})`);

if (committedAt > deployedAt) {
  const hours = ((committedAt - deployedAt) / 36e5).toFixed(1);
  console.error(`\nDRIFT: main/server has commits ${hours}h newer than the deployed version.`);
  console.error('Newly added routes will 404 in production until you run:');
  console.error('  cd main/server && npm run deploy');
  process.exit(1);
}

console.log('\nUp to date — no server commits newer than the deployed version.');
