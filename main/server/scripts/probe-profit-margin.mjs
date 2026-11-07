/**
 * Summarize completed-order revenue vs cost for margin debugging (no secrets printed).
 * Usage: node scripts/probe-profit-margin.mjs [days]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in main/server/.env');
  process.exit(1);
}

const supabase = createClient(url, key);
const days = Number(process.argv[2] || 30);
const since = new Date(Date.now() - days * 86_400_000).toISOString();

function isTopup(o) {
  const m = o.metadata || {};
  if (m.wallet_topup === true || m.wallet_topup === 'true') return true;
  const name = (o.product_name || '').toLowerCase();
  return /wallet\s*top[- ]?up/.test(name);
}

const { data: orders, error } = await supabase
  .from('orders')
  .select('id, product_id, product_name, total_amount, status, unit_cost_price, unit_selling_price, metadata, created_at')
  .eq('status', 'completed')
  .gte('created_at', since);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = orders || [];
const topups = rows.filter(isTopup);
const sales = rows.filter((o) => !isTopup(o));

function sum(arr, fn) {
  return arr.reduce((s, o) => s + fn(o), 0);
}

const topupRev = sum(topups, (o) => Number(o.total_amount || 0));
const salesRev = sum(sales, (o) => Number(o.total_amount || 0));
const salesCogsOrderSnap = sum(sales, (o) => Number(o.unit_cost_price || 0));
const withCost = sales.filter((o) => o.unit_cost_price != null && Number(o.unit_cost_price) > 0);
const withoutCost = sales.filter((o) => o.unit_cost_price == null || Number(o.unit_cost_price) <= 0);
const knownProfit = sum(withCost, (o) => Number(o.total_amount || 0) - Number(o.unit_cost_price) * 1);
const knownRev = sum(withCost, (o) => Number(o.total_amount || 0));
const naiveProfit = salesRev - salesCogsOrderSnap;

console.log(JSON.stringify({
  days,
  since,
  completed: rows.length,
  wallet_topups: { count: topups.length, revenue: topupRev },
  product_sales: {
    count: sales.length,
    revenue: salesRev,
    with_unit_cost_snapshot: withCost.length,
    without_unit_cost_snapshot: withoutCost.length,
    no_snapshot_revenue: sum(withoutCost, (o) => Number(o.total_amount || 0)),
  },
  margins: {
    naive_gross_profit: naiveProfit,
    naive_margin_pct: salesRev ? (naiveProfit / salesRev) * 100 : 0,
    known_margin_pct: knownRev ? (knownProfit / knownRev) * 100 : 0,
    if_topups_still_in_sales_rev_pct: (salesRev + topupRev)
      ? (naiveProfit / (salesRev + topupRev)) * 100
      : 0,
  },
}, null, 2));
