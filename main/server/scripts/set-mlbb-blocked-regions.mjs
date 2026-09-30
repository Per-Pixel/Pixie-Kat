/**
 * One-shot seed: merge blocked_regions ["ID","BR"] into the mobile-legends
 * game metadata via PostgREST (equivalent to migration 042). Merges rather
 * than overwrites so unrelated metadata keys are preserved.
 * Usage (from main/server):  node scripts/set-mlbb-blocked-regions.mjs
 */
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env');
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/games?slug=eq.mobile-legends&select=id,slug,metadata`,
  { headers },
);
const rows = await res.json();
if (!Array.isArray(rows) || rows.length === 0) {
  console.error('mobile-legends game not found or Supabase error:', rows);
  process.exit(1);
}
const game = rows[0];
const existing = Array.isArray(game.metadata?.blocked_regions) ? game.metadata.blocked_regions : [];
const merged = [...new Set([...existing.map(String), 'ID', 'BR'])];

const patch = await fetch(`${SUPABASE_URL}/rest/v1/games?id=eq.${game.id}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ metadata: { ...(game.metadata ?? {}), blocked_regions: merged } }),
});
const patched = await patch.json();
if (!patch.ok) {
  console.error('PATCH failed:', patched);
  process.exit(1);
}
console.log(`games/${game.slug}: blocked_regions =`, patched?.[0]?.metadata?.blocked_regions);
