#!/usr/bin/env node
/**
 * Rewrite local media paths stored in Supabase into canonical
 * public-media Storage URLs.
 *
 * Run (from repo root):
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/rewrite-media-urls.mjs
 *
 * Supports a --dry-run flag:
 *   node scripts/rewrite-media-urls.mjs --dry-run
 */

import { createRequire } from "node:module";

// Resolve @supabase/supabase-js and dotenv from main/server's node_modules.
const serverPackageUrl = new URL("../main/server/package.json", import.meta.url);
const require = createRequire(serverPackageUrl);
const { createClient } = require("@supabase/supabase-js");
const { resolve, dirname } = require("node:path");
const { existsSync } = require("node:fs");
const { fileURLToPath } = require("node:url");

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEnvPath = resolve(__dirname, "..", "main", "server", ".env");
if (existsSync(serverEnvPath)) {
  require("dotenv").config({ path: serverEnvPath });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = "public-media";
const SOURCE_BUCKET = "media";

const ABSOLUTE_URL_RE = /^(https?:|data:|blob:|\/\/)/i;
const LOCAL_MEDIA_RE = /^\/?(img|audio|videos)\//i;
const supabaseHost = new URL(SUPABASE_URL).host.replace(/\./g, "\\.");
// Matches absolute URLs pointing at the private 'media' bucket on this project.
const MEDIA_BUCKET_URL_RE = new RegExp(
  `^https?:\\/\\/${supabaseHost}\\/storage\\/v1\\/object\\/(?:public|sign)\\/${SOURCE_BUCKET}\\/([^?#]+)(?:[?#].*)?$`,
  "i"
);

// Object paths that must exist in public-media after a media/ URL is rewritten.
const pathsToCopy = new Set();

function isLocalMediaPath(value) {
  return typeof value === "string" && LOCAL_MEDIA_RE.test(value.trim());
}

function publicMediaUrl(path) {
  if (path == null) return "";
  if (typeof path !== "string") return String(path);
  const trimmed = path.trim();
  if (!trimmed || ABSOLUTE_URL_RE.test(trimmed)) return trimmed;
  const clean = trimmed.replace(/^\/+/, "");
  const encoded = clean.split("/").map((part) => encodeURIComponent(part)).join("/");
  const base = String(SUPABASE_URL).replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

function rewriteValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(rewriteValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, rewriteValue(v)])
    );
  }
  if (typeof value === "string") {
    if (isLocalMediaPath(value)) return publicMediaUrl(value);
    const match = MEDIA_BUCKET_URL_RE.exec(value.trim());
    if (match) {
      const objectPath = match[1];
      pathsToCopy.add(objectPath);
      const base = String(SUPABASE_URL).replace(/\/+$/, "");
      const encoded = objectPath
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
      return `${base}/storage/v1/object/public/${BUCKET}/${encoded}`;
    }
  }
  return value;
}

const TEXT_COLUMNS = [
  { table: "games", columns: ["image_url", "banner_url"] },
  { table: "products", columns: ["image_url"] },
  { table: "promotional_items", columns: ["image_url"] },
];

const JSON_COLUMNS = [
  { table: "store_settings", column: "hero_settings" },
  { table: "store_settings", column: "about_settings" },
  { table: "store_settings", column: "about_page_settings" },
  { table: "store_settings", column: "how_it_works_settings" },
  { table: "store_settings", column: "faq_settings" },
  { table: "store_settings", column: "contact_settings" },
  { table: "store_settings", column: "pricing_settings" },
  { table: "store_settings", column: "products_page_settings" },
  { table: "store_settings", column: "appearance_settings" },
  { table: "store_settings", column: "event_jjk_cheaper_settings" },
  { table: "store_settings", column: "footer_settings" },
  { table: "store_settings", column: "legal_settings" },
];

async function updateText(table, id, column, value) {
  if (DRY_RUN) return;
  const { error } = await supabase
    .from(table)
    .update({ [column]: value })
    .eq("id", id);
  if (error) {
    throw new Error(`Failed to update ${table}.${column} for ${id}: ${error.message}`);
  }
}

async function updateJson(table, id, column, value) {
  if (DRY_RUN) return;
  const { error } = await supabase
    .from(table)
    .update({ [column]: value })
    .eq("id", id);
  if (error) {
    throw new Error(`Failed to update ${table}.${column} for ${id}: ${error.message}`);
  }
}

async function processTextColumns() {
  let count = 0;
  for (const { table, columns } of TEXT_COLUMNS) {
    for (const column of columns) {
      const { data, error } = await supabase
        .from(table)
        .select(`id,${column}`)
        .not(column, "is", null);

      if (error) {
        console.error(`  SKIP ${table}.${column}: ${error.message}`);
        continue;
      }

      for (const row of data ?? []) {
        const resolved = rewriteValue(row[column]);
        if (resolved === row[column]) continue;

        console.log(`  ${table}.${column}: ${row[column]} → ${resolved}`);
        await updateText(table, row.id, column, resolved);
        count++;
      }
    }
  }
  return count;
}

async function processJsonColumns() {
  let count = 0;
  for (const { table, column } of JSON_COLUMNS) {
    const { data, error } = await supabase
      .from(table)
      .select(`id,${column}`)
      .not(column, "is", null);

    if (error) {
      console.error(`  SKIP ${table}.${column}: ${error.message}`);
      continue;
    }

    for (const row of data ?? []) {
      const raw = row[column];
      if (!raw || typeof raw !== "object" || Object.keys(raw).length === 0) continue;

      const resolved = rewriteValue(raw);
      if (JSON.stringify(resolved) === JSON.stringify(raw)) continue;

      console.log(`  ${table}.${column}: ${Object.keys(raw).length} fields updated`);
      await updateJson(table, row.id, column, resolved);
      count++;
    }
  }
  return count;
}

async function copyMissingObjects() {
  let copied = 0;
  for (const objectPath of pathsToCopy) {
    // Skip if already present in public-media.
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .list(objectPath.split("/").slice(0, -1).join("/") || "", {
        search: objectPath.split("/").pop(),
      });
    if (existing?.some((o) => o.name === objectPath.split("/").pop())) continue;

    if (DRY_RUN) {
      console.log(`  WOULD COPY ${SOURCE_BUCKET}/${objectPath} → ${BUCKET}/${objectPath}`);
      copied++;
      continue;
    }

    const { data: blob, error: dlErr } = await supabase.storage
      .from(SOURCE_BUCKET)
      .download(objectPath);
    if (dlErr) {
      console.warn(`  COPY SKIP ${objectPath}: ${dlErr.message}`);
      continue;
    }
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, blob, { contentType: blob.type, upsert: true });
    if (upErr) {
      console.warn(`  COPY FAIL ${objectPath}: ${upErr.message}`);
      continue;
    }
    console.log(`  COPIED ${SOURCE_BUCKET}/${objectPath} → ${BUCKET}/${objectPath}`);
    copied++;
  }
  return copied;
}

async function main() {
  const mode = DRY_RUN ? "(dry-run)" : "";
  console.log(`Rewriting storefront media URLs ${mode}`.trim());

  const textCount = await processTextColumns();
  const jsonCount = await processJsonColumns();
  const copyCount = await copyMissingObjects();

  console.log(
    `\nDone. Text columns: ${textCount}, JSON columns: ${jsonCount}, objects copied: ${copyCount}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
