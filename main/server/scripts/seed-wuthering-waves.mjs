/**
 * Seed the Wuthering Waves game cloned from tangyanstore.com
 * (https://tangyanstore.com/product/Wuthering%20Waves, scraped 2026-10-23):
 *   60 Lunites ₹97 · Lunite Subscription ₹454 · 330 ₹446 · 1090 ₹1351 ·
 *   2240 ₹2686 · 3880 ₹4479 · 8080 ₹8731 — supplier retail = our fulfilment
 *   cost, recorded in cost_price / metadata.tangyan_price_inr.
 *
 * Sell price = tangyan × ~1.15 rounded to tidy ₹5/₹10 points.
 *
 * Region handling: global — the supplier product takes any UID + server, so
 * the game carries no blocked_regions and region='global'. The buyer's server
 * choice is captured via the zone_id select field and lands on the order for
 * staff fulfilment.
 *
 * Fulfilment: provider='manual' — no SmileCoin/SmileCode WuWa product exists
 * and Yokcash can't be probed locally (IP whitelist). Orders stay `processing`
 * for staff to top up from the supplier.
 *
 * Art: Steam store capsule + page background (app 3513350), uploaded to
 * public-media as img/games/wuthering-waves{,-banner}.jpg.
 *
 * Usage: node scripts/seed-wuthering-waves.mjs [--apply]   (default = dry-run)
 */
import { supabaseAdmin } from '../supabase-admin.js';

const APPLY = process.argv.includes('--apply');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 1. Images ────────────────────────────────────────────────────────────────
const IMAGES = [
  ['https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3513350/5fcb94cded038b803f391e57c9951875295ba679/capsule_616x353.jpg', 'img/games/wuthering-waves.jpg'],
  ['https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3513350/7c80b6040bdbd6d48471c33dbc55e7fbca8abc36/page_bg_raw.jpg', 'img/games/wuthering-waves-banner.jpg'],
];

async function uploadImages() {
  for (const [url, dest] of IMAGES) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (APPLY) {
      const { error } = await supabaseAdmin.storage
        .from('public-media')
        .upload(dest, buf, { contentType: 'image/jpeg', upsert: true });
      if (error) throw new Error(`upload ${dest}: ${error.message}`);
    }
    console.log(`${APPLY ? 'uploaded' : 'would upload'} ${dest} (${buf.length} B)`);
    await sleep(150);
  }
}

// ── 2. Catalog rows ──────────────────────────────────────────────────────────
const P = (name, amount, price, cost, extra = {}) => ({
  name, amount, price, currency: 'INR',
  provider_product_id: null,
  cost_price: cost,
  image_url: 'img/games/wuthering-waves.jpg',
  is_popular: !!extra.popular,
  status: 'active',
  sort_order: 0,
  metadata: { fulfillment_mode: 'manual', tangyan_price_inr: cost },
});

const GAME = {
  slug: 'wuthering-waves',
  name: 'Wuthering Waves',
  subtitle: 'Wuthering Waves Lunites',
  description:
    'Top up Lunites for Wuthering Waves. Enter your UID, select your server, pick a Lunite pack or the Lunite Subscription, ' +
    'and the currency is credited to your account after payment.',
  image_url: 'img/games/wuthering-waves.jpg',
  banner_url: 'img/games/wuthering-waves-banner.jpg',
  category: 'RPG',
  currency_label: 'Lunites',
  provider: 'manual',
  status: 'active',
  sort_order: 3,
  region: 'global',
  how_to_steps: [
    { title: 'Enter UID & Server', description: 'Provide your Wuthering Waves UID and select your account server.' },
    { title: 'Choose the Package', description: 'Select the Lunite pack or Lunite Subscription you want.' },
    { title: 'Make Payment', description: 'Choose your preferred payment method.' },
    { title: 'Confirmation', description: 'Lunites are credited to your account after payment.' },
  ],
  instructions:
    'Lunites are delivered to the UID + server you select — double-check both before paying.',
  metadata: {
    source: 'tangyanstore:Wuthering Waves',
    source_url: 'https://tangyanstore.com/product/Wuthering%20Waves',
    pricing_source: 'tangyanstore.com',
    fulfillment_mode: 'manual',
  },
  fields: [
    { field_key: 'user_id', label: 'UID', field_type: 'text', placeholder: 'Enter your Wuthering Waves UID', help_text: 'The UID shown on your in-game profile.', is_required: true, sort_order: 1 },
    {
      field_key: 'zone_id', label: 'Server', field_type: 'select', placeholder: 'Select server', is_required: true, sort_order: 2,
      options: ['SEA', 'Asia', 'America', 'Europe', 'TW_HK_MO'].map((v) => ({ value: v, label: v })),
      help_text: 'Pick the server your account is registered on.',
    },
  ],
  products: [
    P('60 Lunites', 'Lunites=60', 110, 97),
    P('Lunite Subscription', 'Lunite Subscription', 520, 454, { popular: true }),
    P('330 Lunites', 'Lunites=330', 515, 446),
    P('1090 Lunites', 'Lunites=1090', 1555, 1351),
    P('2240 Lunites', 'Lunites=2240', 3090, 2686),
    P('3880 Lunites', 'Lunites=3880', 5150, 4479),
    P('8080 Lunites', 'Lunites=8080', 10040, 8731),
  ],
};

// ── 3. Insert ────────────────────────────────────────────────────────────────
await uploadImages();
const { fields, products, ...row } = GAME;

console.log(`\n== ${row.slug} ==`);
products.forEach((p, i) => {
  p.sort_order = i + 1;
  const margin = p.price - p.cost_price;
  console.log(`   ${p.name.padEnd(22)} sell ₹${String(p.price).padEnd(6)} cost ₹${p.cost_price}  margin ₹${margin.toFixed(2)}`);
});
if (!APPLY) {
  console.log('\ndry-run — rerun with --apply to write to Supabase');
  process.exit(0);
}

const { data: existing } = await supabaseAdmin.from('games').select('id').eq('slug', row.slug).maybeSingle();
let gameId = existing?.id;
if (gameId) {
  const { error } = await supabaseAdmin.from('games').update(row).eq('id', gameId);
  if (error) throw new Error(`update game ${row.slug}: ${error.message}`);
  await supabaseAdmin.from('game_fields').delete().eq('game_id', gameId);
  await supabaseAdmin.from('products').delete().eq('game_id', gameId);
  console.log(`   updated existing game ${gameId}`);
} else {
  const { data, error } = await supabaseAdmin.from('games').insert(row).select('id').single();
  if (error) throw new Error(`insert game ${row.slug}: ${error.message}`);
  gameId = data.id;
  console.log(`   inserted game ${gameId}`);
}

const { error: fErr } = await supabaseAdmin.from('game_fields').insert(fields.map((f) => ({ options: [], ...f, game_id: gameId })));
if (fErr) throw new Error(`fields ${row.slug}: ${fErr.message}`);

const toInsert = products.map((p) => ({ ...p, game_id: gameId }));
const { data: inserted, error: pErr } = await supabaseAdmin.from('products').insert(toInsert).select('id, name, price');
if (pErr) throw new Error(`products ${row.slug}: ${pErr.message}`);
console.log(`   +${fields.length} fields, +${inserted.length} products:`);
inserted.forEach((p) => console.log(`     ${p.id}  ${p.name}  ₹${p.price}`));
