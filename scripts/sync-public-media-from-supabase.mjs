#!/usr/bin/env node
/**
 * Download public-media bucket objects into main/public/ so the storefront can
 * serve them from Amplify CDN (same origin) instead of Supabase cached egress.
 *
 * Run locally (uses main/server/.env):
 *   node scripts/sync-public-media-from-supabase.mjs
 *
 * Amplify preBuild (main branch) when SUPABASE_SERVICE_ROLE_KEY is set.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const serverPkg = path.join(REPO_ROOT, 'main', 'server', 'package.json');
const require = createRequire(serverPkg);
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const PUBLIC_DIR = path.join(REPO_ROOT, 'main', 'public');
const SERVER_ENV = path.join(REPO_ROOT, 'main', 'server', '.env');

if (fs.existsSync(SERVER_ENV)) {
  dotenv.config({ path: SERVER_ENV });
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[sync-public-media] Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const BUCKET = 'public-media';
const PAGE_SIZE = 200;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function isFile(entry) {
  return entry?.metadata != null;
}

async function listFilesUnder(prefix = '') {
  const files = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data?.length) break;

    for (const entry of data) {
      const child = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (isFile(entry)) {
        files.push(child);
      } else {
        files.push(...(await listFilesUnder(child)));
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += data.length;
  }

  return files;
}

async function downloadToPublic(storagePath) {
  const dest = path.join(PUBLIC_DIR, storagePath.replace(/\//g, path.sep));
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const skipExisting = process.env.SYNC_SKIP_EXISTING === '1';
  if (skipExisting && fs.existsSync(dest)) {
    return 'skip';
  }

  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) throw error;
  const buf = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return 'ok';
}

async function main() {
  console.log(`[sync-public-media] Listing ${BUCKET}…`);
  const files = await listFilesUnder('');
  console.log(`[sync-public-media] ${files.length} object(s) to sync → ${PUBLIC_DIR}`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const storagePath of files) {
    try {
      const result = await downloadToPublic(storagePath);
      if (result === 'skip') {
        skip += 1;
      } else {
        ok += 1;
        if (ok <= 20 || ok % 50 === 0) {
          console.log(`  + ${storagePath}`);
        }
      }
    } catch (err) {
      fail += 1;
      console.warn(`  ! ${storagePath}: ${err.message}`);
    }
  }

  console.log(
    `[sync-public-media] Done. downloaded=${ok} skipped=${skip} failed=${fail}`,
  );
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
