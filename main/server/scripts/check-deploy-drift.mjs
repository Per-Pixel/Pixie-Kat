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
const REPO_ROOT = path.resolve(SERVER_DIR, '../..');

function runCmd(cmd, args, { cwd = SERVER_DIR } = {}) {
  if (process.platform === 'win32') {
    return execFileSync('cmd.exe', ['/c', cmd, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  }
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function runGit(args, { cwd = REPO_ROOT } = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

// `app-260818_131925792604` -> Date (EB CLI stamps label using local machine time)
function parseVersionLabel(label) {
  const m = /app-(\d{2})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(label);
  if (!m) return null;
  const [, yy, mm, dd, hh, mi, ss] = m.map(Number);
  // Construct as local time (same timezone as the machine running eb deploy)
  return new Date(2000 + yy, mm - 1, dd, hh, mi, ss);
}

function getDeployedTimestamp(label) {
  try {
    const awsOut = runCmd('aws', ['elasticbeanstalk', 'describe-application-versions', '--version-labels', label]);
    const parsed = JSON.parse(awsOut);
    const dateStr = parsed?.ApplicationVersions?.[0]?.DateCreated;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!Number.isNaN(d.getTime())) return d;
    }
  } catch {
    // AWS CLI not configured or network unavailable; fall back to label parsing
  }
  return parseVersionLabel(label);
}

let ebStatus;
try {
  ebStatus = runCmd('eb', ['status']);
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
const deployedAt = getDeployedTimestamp(label);
if (!deployedAt) {
  console.error(`Unrecognized version label "${label}" — cannot infer a deploy time.`);
  console.error('If deploys stopped using the default app-YYMMDD_HHMMSS labels, this check needs updating.');
  process.exit(2);
}

let lastCommitIso, lastCommitSubject;
try {
  lastCommitIso = runGit(['log', '-1', '--format=%cI', '--', 'main/server']);
  lastCommitSubject = runGit(['log', '-1', '--format=%h %s', '--', 'main/server']);
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
