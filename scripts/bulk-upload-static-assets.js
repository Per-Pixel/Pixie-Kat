#!/usr/bin/env node
/**
 * Bulk-upload static assets from main/public/ into Supabase Storage 'media' bucket.
 * Run: node scripts/bulk-upload-static-assets.js
 *
 * Requires:
 *   SUPABASE_URL      (e.g. https://yourproject.supabase.co)
 *   SUPABASE_SERVICE_KEY  (service_role key from Supabase Dashboard → Settings → API)
 *
 * Usage:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=eyJ... node scripts/bulk-upload-static-assets.js
 */

const fs = require('fs');
const path = require('path');

// Resolve @supabase/supabase-js from admin/node_modules
const ADMIN_NODE_MODULES = path.resolve(__dirname, '..', 'admin', 'node_modules');
if (fs.existsSync(ADMIN_NODE_MODULES)) {
  module.paths.unshift(ADMIN_NODE_MODULES);
}
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const BUCKET = 'media';
const PUBLIC_DIR = path.resolve(__dirname, '..', 'main', 'public');

const ALLOWED = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
  '.mp4', '.webm', '.pdf', '.zip', '.txt', '.csv'
]);

const MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

function getMimeType(ext) {
  return MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
}

function getPublicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function uploadFile(filePath, relativePath) {
  const ext = path.extname(filePath);
  const mimeType = getMimeType(ext);
  const buffer = fs.readFileSync(filePath);
  const storagePath = relativePath.replace(/\\/g, '/');

  // Upload to Storage
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (upErr) {
    console.error(`  SKIP (upload error): ${storagePath} — ${upErr.message}`);
    return null;
  }

  // Insert DB row
  const { data, error: dbErr } = await supabase
    .from('media')
    .insert({
      filename: path.basename(filePath),
      storage_path: storagePath,
      bucket: BUCKET,
      mime_type: mimeType,
      size_bytes: buffer.length,
      public_url: getPublicUrl(storagePath),
    })
    .select('*')
    .single();

  if (dbErr) {
    console.error(`  SKIP (db error): ${storagePath} — ${dbErr.message}`);
    return null;
  }

  return data;
}

async function walk(dir, baseDir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      results.push(...await walk(fullPath, baseDir));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED.has(ext)) {
        results.push({ fullPath, relativePath });
      }
    }
  }

  return results;
}

async function main() {
  console.log('Scanning:', PUBLIC_DIR);
  const files = await walk(PUBLIC_DIR, PUBLIC_DIR);
  console.log(`Found ${files.length} supported files.`);

  if (files.length === 0) {
    console.log('Nothing to upload.');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const { fullPath, relativePath } of files) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('media')
      .select('id')
      .eq('storage_path', relativePath.replace(/\\/g, '/'))
      .single();

    if (existing) {
      console.log(`  SKIP (already indexed): ${relativePath}`);
      skipped++;
      continue;
    }

    const result = await uploadFile(fullPath, relativePath);
    if (result) {
      console.log(`  OK: ${relativePath} → ${result.public_url}`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
