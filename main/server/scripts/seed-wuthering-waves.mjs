/**
 * Seed the Wuthering Waves game — catalog inspired by tangyanstore.com
 * (https://tangyanstore.com/product/Wuthering%20Waves, scraped 2026-10-23),
 * fulfilled via Yokcash WUTWVS* services (product idea from Tangyan, supply
 * and pricing convention from our usual Yokcash source).
 *
 * Sell price  = Yokcash harga IDR→INR @0.005385 × 1.15 (same as HOK/BGMI/HSR).
 * Cost price  = Yokcash harga → INR. Every sell price also clears tangyanstore
 * retail (₹97/446/1351/2686/4479/8731/454), so a manual Tangyan fallback
 * still turns a margin.
 *
 * Region handling: global — the Yokcash services take UID + server, so the
 * game carries no blocked_regions and region='global'. The buyer's server
 * choice is captured via the zone_id select and lands on the order, and
 * fulfill-order forwards it to Yokcash as target "uid|server" — same shape
 * as the Genshin GIYC* services.
 *
 * Art: Steam store capsule + page background (app 3513350), uploaded to
 * public-media as img/games/wuthering-waves{,-banner}.jpg.
 *
 * Usage: node scripts/seed-wuthering-waves.mjs [--apply]   (default = dry-run)
 */
import { supabaseAdmin } from '../supabase-admin.js';

const APPLY = process.argv.includes('--apply');
const IDR_INR = 0.005385; // same rate as seed-new-games.mjs / seed-kazutora-games.mjs
const cost = (idr) => Math.round(idr * IDR_INR * 100) / 100;
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
// pid = Yokcash service id, idr = its harga.
const P = (name, amount, price, pid, idr, extra = {}) => ({
  name, amount, price, currency: 'INR',
  provider_product_id: pid,
  cost_price: cost(idr),
  image_url: 'img/games/wuthering-waves.jpg',
  is_popular: !!extra.popular,
  status: 'active',
  sort_order: 0,
  metadata: { yokcash_service_id: pid, yokcash_cost_idr: idr },
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
  provider: 'yokcash',
  status: 'active',
  sort_order: 3,
  region: 'global',
  how_to_steps: [
    { title: 'Enter UID & Server', description: 'Provide your Wuthering Waves UID and select your account server.' },
    { title: 'Choose the Package', description: 'Select the Lunite pack or Lunite Subscription you want.' },
    { title: 'Make Payment', description: 'Choose your preferred payment method.' },
    { title: 'Confirmation', description: 'Lunites are credited instantly after payment.' },
  ],
  instructions:
    'Lunites are delivered to the UID + server you select — double-check both before paying.',
  metadata: {
    source: 'tangyanstore:Wuthering Waves',
    source_url: 'https://tangyanstore.com/product/Wuthering%20Waves',
    pricing_source: 'yokcash',
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
    P('60 Lunites', 'Lunites=60', 101, 'WUTWVS60YCGG', 16368),
    P('Lunite Subscription', 'Lunite Subscription', 482, 'WUTWVSLS1YCGG', 77789, { popular: true }),
    P('300 + 30 Lunites', 'Lunites=330', 480, 'WUTWVS300YCGG', 77558),
    P('980 + 110 Lunites', 'Lunites=1090', 1449, 'WUTWVS980YCGG', 233945),
    P('1980 + 260 Lunites', 'Lunites=2240', 2898, 'WUTWVS1980YCGG', 467890),
    P('3280 + 600 Lunites', 'Lunites=3880', 4648, 'WUTWVS3280YCGG', 750605),
    P('6480 + 1600 Lunites', 'Lunites=8080', 9060, 'WUTWVS6480YCGG', 1462800),
  ],
};

// ── 3. Insert ────────────────────────────────────────────────────────────────
await uploadImages();
const { fields, products, ...row } = GAME;

console.log(`\n== ${row.slug} ==`);
products.forEach((p, i) => {
  p.sort_order = i + 1;
  const margin = p.price - p.cost_price;
  console.log(`   ${p.name.padEnd(22)} sell ₹${String(p.price).padEnd(6)} cost ₹${p.cost_price}  pid ${p.provider_product_id}  margin ₹${margin.toFixed(2)}`);
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
