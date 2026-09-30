/**
 * Diagnostic: pull recent MLBB orders' account fields from Supabase,
 * check each against the free region endpoint + local verify-player.
 * Usage (from main/server):  node scripts/probe-regions.mjs [verifyBase]
 * Never prints credentials. Read-only.
 */
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERIFY = process.argv[2] || 'http://localhost:3011/api';

if (!SUPABASE_URL || !KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env');
  process.exit(1);
}

// Recent orders that carried game account fields
const url = `${SUPABASE_URL}/rest/v1/orders?select=metadata,created_at&order=created_at.desc&limit=100`;
const res = await fetch(url, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
const orders = await res.json();
if (!Array.isArray(orders)) { console.error('Supabase error:', orders); process.exit(1); }

const pairs = new Map();
for (const o of orders) {
  const meta = o.metadata || {};
  const game = String(meta.game_slug || meta.game_name || '').toLowerCase();
  if (!/mobile.?legends|mlbb/.test(game)) continue;
  const af = meta.account_fields || {};
  let uid = null, zone = null;
  for (const [k, v] of Object.entries(af)) {
    if (/user|player|account|uid|id$/i.test(k) && !uid && v) uid = String(v).trim();
    if (/zone|server/i.test(k) && !zone && v) zone = String(v).trim();
  }
  if (uid && zone) pairs.set(`${uid}:${zone}`, { uid, zone });
}
const list = [...pairs.values()];
console.log(`found ${list.length} unique MLBB uid:zone pairs in last 100 orders\n`);

async function freeCheck(uid, zone) {
  try {
    const r = await fetch(`https://api.isan.eu.org/nickname/ml?id=${uid}&server=${zone}`,
      { signal: AbortSignal.timeout(10_000) });
    const j = await r.json().catch(() => null);
    return j?.success ? `${j.name} — ${j.country}` : `not found (${j?.message || 'fail'})`;
  } catch (e) { return `error: ${e.message}`; }
}

async function verify(uid, zone) {
  try {
    const r = await fetch(`${VERIFY}/verify-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, zone_id: zone, api_game: 'mobilelegends', product: 'mobilelegends' }),
      signal: AbortSignal.timeout(30_000),
    });
    const j = await r.json().catch(() => null);
    return j?.success ? `OK: ${j.username}` : `REJECT: ${j?.message || r.status}`;
  } catch (e) { return `error: ${e.message}`; }
}

for (const { uid, zone } of list) {
  const [free, ver] = await Promise.all([freeCheck(uid, zone), verify(uid, zone)]);
  console.log(`${uid} (${zone})\n  codashop: ${free}\n  verify:   ${ver}\n`);
}
