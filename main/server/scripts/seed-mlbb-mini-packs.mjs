/**
 * Seed the MLBB Mini Packs game cloned from tangyanstore.com
 * (https://tangyanstore.com/product/MLBB%20Mini%20Packs, scraped 2026-10-23):
 *   5 Diamonds ₹13, 11 Diamonds ₹24, 22 Diamonds ₹50 — supplier retail = our
 *   fulfilment cost, recorded in cost_price / metadata.tangyan_price_inr.
 *
 * Sell price = tangyan retail × ~1.15 → ₹15 / ₹28 / ₹58.
 *
 * Region handling: the supplier labels these packs region-specific (Malaysia
 * and a couple of others), but the product itself takes any User ID + Zone ID
 * and is sold region-free — so the game carries NO blocked_regions and is
 * marked region='global'. Player verification + the free region lookup still
 * run via provider_game_code='mobilelegends', so verified_region keeps being
 * stamped on orders for staff visibility.
 *
 * Fulfilment: provider='yokcash' — wired 2026-10-23 after proving Yokcash's
 * Mobile Legends Philippines S1 services deliver to India-region accounts
 * (Indonesia SKUs auto-refund "Region/Server Tidak Didukung"). Each product's
 * provider_product_id holds the Yokcash service code. Do NOT set
 * smile_coin_product: the smilecoin branch would take precedence and
 * auto-refund for lack of a provider product id.
 *
 * Usage: node scripts/seed-mlbb-mini-packs.mjs [--apply]   (default = dry-run)
 */
import { supabaseAdmin } from '../supabase-admin.js';

const APPLY = process.argv.includes('--apply');

const GAME = {
  slug: 'mlbb-mini-packs',
  name: 'MLBB Mini Packs',
  subtitle: 'Mobile Legends Mini Diamond Packs',
  description:
    'Small-denomination Mobile Legends diamond packs — 5, 11 and 22 Diamonds — for any account region. ' +
    'Enter your User ID and Zone ID, pick a pack, and the diamonds are credited to your account after payment.',
  image_url: 'img/games/mobile-legends.webp',
  banner_url: 'img/promotion/eternal.webp',
  category: 'MOBA',
  currency_label: 'Diamonds',
  provider: 'yokcash',
  provider_game_code: 'mobilelegends',
  status: 'active',
  sort_order: 2,
  region: 'global',
  how_to_steps: [
    { title: 'Enter Account Details', description: 'Provide your Mobile Legends User ID and Zone ID.' },
    { title: 'Choose the Package', description: 'Select the mini diamond pack you want.' },
    { title: 'Make Payment', description: 'Choose your preferred payment method.' },
    { title: 'Confirmation', description: 'Diamonds are credited to your account after payment.' },
  ],
  instructions:
    'Mini packs work for all account regions. Diamonds are delivered to the User ID + Zone ID you enter — ' +
    'double-check them before paying.',
  metadata: {
    source: 'tangyanstore:MLBB Mini Packs',
    source_url: 'https://tangyanstore.com/product/MLBB%20Mini%20Packs',
    pricing_source: 'yokcash.com',
    fulfillment_mode: 'yokcash',
    note: 'Auto-fulfilled via Yokcash Mobile Legends Philippines S1 services (proven on India-region accounts 2026-10-23).',
  },
  fields: [
    { field_key: 'user_id', label: 'User ID', field_type: 'text', placeholder: 'Enter Mobile Legends User ID', help_text: 'The numeric User ID from your Mobile Legends profile.', is_required: true, sort_order: 1 },
    { field_key: 'zone_id', label: 'Zone ID', field_type: 'text', placeholder: 'Enter Zone ID', help_text: 'The Zone ID shown in brackets on your Mobile Legends profile.', is_required: true, sort_order: 2 },
  ],
  products: [
    { name: 'Mini Pack — 5 Diamonds',  amount: 'Diamond=5',  price: 15, cost_price: 9.5,  tangyan_price: 13, provider_product_id: 'MLONLYPH_5_S1',  yokcash_idr: 1785 },
    { name: 'Mini Pack — 11 Diamonds', amount: 'Diamond=11', price: 28, cost_price: 16.5, tangyan_price: 24, provider_product_id: 'MLONLYPH_11_S1', yokcash_idr: 3100 },
    { name: 'Mini Pack — 22 Diamonds', amount: 'Diamond=22', price: 58, cost_price: 32.5, tangyan_price: 50, provider_product_id: 'MLONLYPH_22_S1', yokcash_idr: 6107 },
  ],
};

const { fields, products, ...row } = GAME;

console.log(`== ${row.slug} ==`);
products.forEach((p, i) => {
  const margin = p.price - p.cost_price;
  console.log(`   ${p.name.padEnd(28)} sell ₹${String(p.price).padEnd(4)} cost ₹${p.cost_price}  margin ₹${margin.toFixed(2)}`);
  p.sort_order = i + 1;
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

const toInsert = products.map(({ tangyan_price, yokcash_idr, ...p }) => ({
  ...p,
  game_id: gameId,
  currency: 'INR',
  image_url: 'img/products/mcgg-diamonds.jpg',
  status: 'active',
  metadata: {
    fulfillment_mode: 'yokcash',
    tangyan_price_inr: tangyan_price,
    yokcash_service_id: p.provider_product_id,
    yokcash_price_idr: yokcash_idr,
  },
}));
const { data: inserted, error: pErr } = await supabaseAdmin.from('products').insert(toInsert).select('id, name, price');
if (pErr) throw new Error(`products ${row.slug}: ${pErr.message}`);
console.log(`   +${fields.length} fields, +${inserted.length} products:`);
inserted.forEach((p) => console.log(`     ${p.id}  ${p.name}  ₹${p.price}`));
