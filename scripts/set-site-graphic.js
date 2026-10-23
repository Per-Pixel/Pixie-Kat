#!/usr/bin/env node
/**
 * Upload a media file to the 'public-media' bucket and point a
 * store_settings.appearance_settings.site_graphics.<key> at it.
 *
 * Run: node scripts/set-site-graphic.js <local-file> <site_graphics_key>
 * Example: node scripts/set-site-graphic.js .tmp/jinx.mp4 feature_main_video
 *
 * Keys containing a dot target another settings column by path instead:
 *   "hero_settings.background_video" → store_settings.hero_settings.background_video
 *   (nested paths work: "hero_settings.images.jinx.url")
 *
 * The stored value is a '/videos|img|audio/<file>' bucket path, resolved at
 * runtime by publicMediaUrl() — same shape as the built-in defaults.
 * Loads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from main/server/.env.
 */

const fs = require('fs');
const path = require('path');

const ADMIN_NODE_MODULES = path.resolve(__dirname, '..', 'admin', 'node_modules');
if (fs.existsSync(ADMIN_NODE_MODULES)) {
  module.paths.unshift(ADMIN_NODE_MODULES);
}
const SERVER_NODE_MODULES = path.resolve(__dirname, '..', 'main', 'server', 'node_modules');
if (fs.existsSync(SERVER_NODE_MODULES)) {
  module.paths.unshift(SERVER_NODE_MODULES);
}
const { createClient } = require('@supabase/supabase-js');

const SERVER_ENV = path.resolve(__dirname, '..', 'main', 'server', '.env');
if (fs.existsSync(SERVER_ENV)) {
  require('dotenv').config({ path: SERVER_ENV });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const MEDIA_DIRS = new Set(['img', 'audio', 'videos']);
const MEDIA_PREFIX = { '.mp4': 'videos', '.webm': 'videos', '.mp3': 'audio', '.ogg': 'audio', '.wav': 'audio', '.m4a': 'audio', '.aac': 'audio', '.opus': 'audio' };
const MIME_MAP = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.opus': 'audio/opus' };

async function main() {
  const [file, key, destArg] = process.argv.slice(2);
  if (!file || !key) {
    console.error('Usage: node scripts/set-site-graphic.js <local-file> <site_graphics_key> [bucket-path]');
    process.exit(1);
  }
  if (!fs.existsSync(file)) { console.error(`File not found: ${file}`); process.exit(1); }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in main/server/.env');
    process.exit(1);
  }

  const ext = path.extname(file).toLowerCase();
  const mimeType = MIME_MAP[ext] || 'application/octet-stream';
  // e.g. 'videos/jinx.mp4' — pass an explicit destArg to override
  const storagePath = (destArg || `${MEDIA_PREFIX[ext] || 'img'}/${path.basename(file)}`).replace(/^\/+/, '');
  if (!MEDIA_DIRS.has(storagePath.split('/')[0])) {
    console.error(`Bucket path must start with img/, audio/ or videos/ — got: ${storagePath}`);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const buffer = fs.readFileSync(file);

  // 1) Upload to bucket
  const { error: upErr } = await supabase.storage
    .from('public-media')
    .upload(storagePath, buffer, { contentType: mimeType, upsert: true });
  if (upErr) { console.error(`Upload failed: ${upErr.message}`); process.exit(1); }
  console.log(`uploaded: ${storagePath} (${(buffer.length / 1024).toFixed(0)} KB, ${mimeType})`);

  // 2) Index in media table (same convention as bulk-upload-static-assets.js)
  const { data: existing } = await supabase
    .from('media').select('id').eq('bucket', 'public-media').eq('storage_path', storagePath).maybeSingle();
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/public-media/${storagePath.split('/').map(encodeURIComponent).join('/')}`;
  if (!existing) {
    const { error: dbErr } = await supabase.from('media').insert({
      filename: path.basename(storagePath), storage_path: storagePath,
      bucket: 'public-media', mime_type: mimeType,
      size_bytes: buffer.length, public_url: publicUrl,
    });
    if (dbErr) console.error(`media row insert failed (non-fatal): ${dbErr.message}`);
  }

  // 3) Merge key into the target settings column.
  //    Bare key -> appearance_settings.site_graphics.<key>
  //    "column.a.b.c" -> <column>.a.b.c (any depth)
  const dot = key.indexOf('.');
  const column = dot === -1 ? 'appearance_settings' : key.slice(0, dot);
  const keyPath = dot === -1 ? ['site_graphics', key] : key.slice(dot + 1).split('.');

  const { data: row, error: selErr } = await supabase
    .from('store_settings').select(`id, ${column}`).maybeSingle();
  if (selErr || !row) { console.error(`store_settings read failed: ${selErr?.message || 'no row'}`); process.exit(1); }

  const value = `/${storagePath}`;
  const root = row[column] && typeof row[column] === 'object' ? { ...row[column] } : {};
  let cursor = root;
  for (let i = 0; i < keyPath.length - 1; i++) {
    const seg = keyPath[i];
    cursor[seg] = cursor[seg] && typeof cursor[seg] === 'object' ? { ...cursor[seg] } : {};
    cursor = cursor[seg];
  }
  cursor[keyPath[keyPath.length - 1]] = value;

  const { error: updErr } = await supabase.from('store_settings')
    .update({ [column]: root })
    .eq('id', row.id);
  if (updErr) { console.error(`store_settings update failed: ${updErr.message}`); process.exit(1); }

  console.log(`${dot === -1 ? 'site_graphics' : column}.${keyPath.join('.')} = ${value}`);
  console.log(`public url: ${publicUrl}`);
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
