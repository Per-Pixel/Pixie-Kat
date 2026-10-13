/**
 * Seed new game pages: Starlight (Kazuki gifting page clone), Honor of Kings
 * (Yokcash fulfillment), Genshin Impact + Genshin Impact USA (Moogold catalog),
 * BGMI (Yokcash). Downloads provider/storefront artwork into public-media.
 *
 * Pricing model:
 *   HOK + BGMI  → Yokcash `harga` (IDR) → INR @ 0.005385, sell = cost × 1.15
 *   Genshin     → Moogold retail INR as sell price; GIYC* = fulfil provider
 *                 for the India game (cost = GIYC IDR→INR); USA = manual.
 *   Starlight   → Kazuki retail ₹279/₹669, manual gifting fulfilment.
 *
 * Usage: node scripts/seed-new-games.mjs [--apply]   (default = dry-run print)
 */
import { supabaseAdmin } from '../supabase-admin.js';

const APPLY = process.argv.includes('--apply');
const IDR_INR = 0.005385; // open.er-api.com 2026-10-06
const MARKUP = 1.15;
const inr = (idr) => Math.round(idr * IDR_INR * 100) / 100;              // cost, 2dp
const sell = (idr) => Math.round(idr * IDR_INR * MARKUP);                // whole ₹
const KZ = 'https://api-staging.kazukiofficialstore.com/storage/media';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 1. Images ─────────────────────────────────────────────────────────────────
const IMAGES = [
  [`${KZ}/game-icons/2026/09/726ef08d-82b5-4bb9-8e68-6222f80712bc.jpg`, 'img/games/starlight.jpg'],
  [`${KZ}/banners/2026/09/6901eb83-dc8a-4773-80eb-a7ad7304a165.jpg`, 'img/games/starlight-banner.jpg'],
  [`${KZ}/starlight/2026/09/0e2c13bb-5e95-4467-90c8-db78cd34c2e1.jpg`, 'img/products/starlight-normal.jpg'],
  [`${KZ}/starlight/2026/09/c618ee09-041d-4d28-a074-f3302b948ce5.jpg`, 'img/products/starlight-premium.jpg'],
  [`${KZ}/game-icons/2026/03/dd90ec91-67cd-44ea-89f9-310083f4a688.jpg`, 'img/games/honor-of-kings-hok.jpg'],
  [`${KZ}/banners/2026/03/a4c2734e-1418-43f8-b0d7-0e32ae686062.jpg`, 'img/games/honor-of-kings-banner.jpg'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/edd144cc-d805-43ab-9412-29f9a3322771.png`, 'img/products/hok-tokens-16.png'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/928ff80c-65c9-4ce3-b8af-402e3fb7cdab.png`, 'img/products/hok-tokens-80.png'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/9867881e-ea3e-4854-a48c-a20a40f9f9bb.png`, 'img/products/hok-tokens-240.png'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/3a4e1ae8-afa8-4760-8fa6-13e6f22a5746.png`, 'img/products/hok-tokens-400.png'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/d762a630-9918-4e7b-81f0-74771a7fc89a.png`, 'img/products/hok-tokens-560.png'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/315d3cfb-4536-44e6-b8fa-8879e400c22f.png`, 'img/products/hok-tokens-800.png'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/62637481-69f0-46b0-b299-1c898576b73d.png`, 'img/products/hok-tokens-1200.png'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/18daa020-11ca-47d8-a69a-1ddfcc7670f7.png`, 'img/products/hok-tokens-2400.png'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/7fd27b7b-cb0e-43b6-a2e7-134f591aeadd.png`, 'img/products/hok-tokens-4000.png'],
  [`${KZ}/honor-of-kings-hok-recharge-icons/2026/03/9b84479a-b2a0-4ef2-9353-088f05049dd7.png`, 'img/products/hok-tokens-8000.png'],
];

async function uploadImages() {
  for (const [url, dest] of IMAGES) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const type = dest.endsWith('.png') ? 'image/png' : 'image/jpeg';
    if (APPLY) {
      const { error } = await supabaseAdmin.storage
        .from('public-media')
        .upload(dest, buf, { contentType: type, upsert: true });
      if (error) throw new Error(`upload ${dest}: ${error.message}`);
    }
    console.log(`${APPLY ? 'uploaded' : 'would upload'} ${dest} (${buf.length} B)`);
    await sleep(150);
  }
}

// ── 2. Catalog rows ───────────────────────────────────────────────────────────
const GAMES = [
  {
    slug: 'starlight',
    name: "Hayabusa Starlight – Kitsune's Shadow",
    subtitle: 'Mobile Legends Starlight Gifting',
    description:
      "Hayabusa's October Kitsune's Shadow Starlight skin delivered through Mobile Legends in-game gifting. " +
      'Choose Normal or Premium Starlight and enter the correct Mobile Legends User ID and Zone ID. ' +
      'This is a gifting order, not an instant top-up — our team assigns a gifting account after payment approval, ' +
      'and the 168-hour in-game friendship timer starts only after the follow is verified.',
    image_url: 'img/games/starlight.jpg',
    banner_url: 'img/games/starlight-banner.jpg',
    category: 'MOBA',
    currency_label: 'Starlight',
    provider: 'manual',
    status: 'active',
    sort_order: 10,
    how_to_steps: [
      { title: 'Enter Account Details', description: 'Place the order with the correct Mobile Legends User ID and Zone ID.' },
      { title: 'Receive Gifting Account', description: 'After payment approval, our team will custom-assign and share the gifting account.' },
      { title: 'Follow and Confirm', description: 'Follow the assigned account inside Mobile Legends and confirm it on your order page.' },
      { title: 'Wait for Eligibility', description: 'The 168-hour friendship wait starts only after our team verifies your follow.' },
      { title: 'Starlight Delivery', description: 'Your selected Normal or Premium Starlight will be gifted after eligibility is complete.' },
    ],
    instructions:
      'Important gifting rules\n\n' +
      'This is not instant delivery. Mobile Legends requires a 168-hour in-game friendship period before Starlight can be gifted. ' +
      'Delivery is normally scheduled after eligibility, commonly on day 8. Double-check your User ID and Zone ID before payment; ' +
      'changing the receiving account after follow verification restarts the timer.',
    metadata: { fulfillment_mode: 'gifting', source: 'kazuki:146' },
    fields: [
      { field_key: 'user_id', label: 'User ID', field_type: 'text', placeholder: 'Enter Mobile Legends User ID', help_text: 'Enter the numeric User ID from your Mobile Legends profile.', is_required: true, sort_order: 1 },
      { field_key: 'zone_id', label: 'Zone ID', field_type: 'text', placeholder: 'Enter Zone ID', help_text: 'Enter the Zone ID shown in brackets on your Mobile Legends profile.', is_required: true, sort_order: 2 },
    ],
    products: [
      { name: 'Normal Starlight', amount: 'Normal Starlight', price: 279, currency: 'INR', image_url: 'img/products/starlight-normal.jpg', is_popular: true, sort_order: 1, metadata: { fulfillment_mode: 'gifting' } },
      { name: 'Premium Starlight', amount: 'Premium Starlight', price: 669, currency: 'INR', image_url: 'img/products/starlight-premium.jpg', is_popular: false, sort_order: 2, metadata: { fulfillment_mode: 'gifting' } },
    ],
  },
  {
    slug: 'honor-of-kings',
    name: 'Honor of Kings',
    subtitle: 'Honor of Kings (HOK)',
    description: 'Top up Honor of Kings Tokens instantly. Enter your Player ID, pick a token package, and pay — tokens land straight in your account.',
    image_url: 'img/games/honor-of-kings-hok.jpg',
    banner_url: 'img/games/honor-of-kings-banner.jpg',
    category: 'MOBA',
    currency_label: 'Tokens',
    provider: 'yokcash',
    status: 'active',
    sort_order: 11,
    how_to_steps: [
      { title: 'Enter Player ID', description: 'Provide your Honor of Kings Player ID for delivery.' },
      { title: 'Choose the Package', description: 'Select the token pack you want.' },
      { title: 'Make Payment', description: 'Choose your preferred payment method.' },
      { title: 'Confirmation', description: 'Tokens are credited instantly after payment.' },
    ],
    instructions: 'Tokens are delivered to the Player ID you enter — double-check it before paying.',
    metadata: { source: 'kazuki:115' },
    fields: [
      { field_key: 'player_id', label: 'Player ID', field_type: 'text', placeholder: 'Enter Player ID', is_required: true, sort_order: 1 },
    ],
    products: [
      { name: '16 Tokens', amount: 'Tokens=16', pid: 'HOKYC17', idr: 2961, compare: 20, image_url: 'img/products/hok-tokens-16.png' },
      { name: '80 Tokens', amount: 'Tokens=80', pid: 'HOKYC88', idr: 14800, compare: 100, image_url: 'img/products/hok-tokens-80.png' },
      { name: '240 Tokens', amount: 'Tokens=240', pid: 'HOKYC257', idr: 43473, compare: 302, image_url: 'img/products/hok-tokens-240.png' },
      { name: '400 Tokens', amount: 'Tokens=400', pid: 'HOKYC432', idr: 73996, compare: 505, image_url: 'img/products/hok-tokens-400.png' },
      { name: '560 Tokens', amount: 'Tokens=560', pid: 'HOKYC605', idr: 100819, compare: 707, image_url: 'img/products/hok-tokens-560.png' },
      { name: '800 + 30 Tokens', amount: 'Tokens=800+30', pid: 'HOKYC895', idr: 147991, compare: 1010, image_url: 'img/products/hok-tokens-800.png', is_popular: true },
      { name: '1200 + 45 Tokens', amount: 'Tokens=1200+45', pid: 'HOKYC1353', idr: 217361, compare: 1516, image_url: 'img/products/hok-tokens-1200.png' },
      { name: '2400 + 108 Tokens', amount: 'Tokens=2400+108', pid: 'HOKYC2724', idr: 443972, compare: 3033, image_url: 'img/products/hok-tokens-2400.png' },
      { name: '4000 + 180 Tokens', amount: 'Tokens=4000+180', pid: 'HOKYC4580', idr: 739952, compare: 5056, image_url: 'img/products/hok-tokens-4000.png' },
      { name: '8000 + 360 Tokens', amount: 'Tokens=8000+360', pid: 'HOKYC9160', idr: 1491770, compare: 10112, image_url: 'img/products/hok-tokens-8000.png' },
    ].map((p, i) => ({
      name: p.name, amount: p.amount, price: sell(p.idr), compare_price: p.compare,
      currency: 'INR', image_url: p.image_url, provider_product_id: p.pid,
      cost_price: inr(p.idr), is_popular: !!p.is_popular, sort_order: i + 1,
      metadata: { yokcash_service_id: p.pid, yokcash_cost_idr: p.idr },
    })),
  },
];

// Genshin: moogold sell prices; India page auto-fulfills via Yokcash GIYC codes.
const GENSHIN_PACKS = [
  { mg: 673095, yc: 'GIYC60', base: '60', crystals: '60', idr: 17325, price: 99 },
  { mg: 673096, yc: 'GIYC330', base: '300 + 30', crystals: '330', idr: 85050, price: 499 },
  { mg: 673097, yc: 'GIYC1090', base: '980 + 110', crystals: '1090', idr: 267750, price: 1499 },
  { mg: 673098, yc: 'GIYC2240', base: '1980 + 260', crystals: '2240', idr: 513450, price: 2999 },
  { mg: 673099, yc: 'GIYC3940', base: '3280 + 600', crystals: '3880', idr: 855750, price: 4999 },
  { mg: 673100, yc: 'GIYC8080', base: '6480 + 1600', crystals: '8080', idr: 1710450, price: 9900, popular: true },
];
const WELKIN = { mg: 1181776, yc: 'GIYCW', idr: 85050, price: 499 };

const genshinFields = (defaultServer) => [
  { field_key: 'user_id', label: 'UID', field_type: 'text', placeholder: 'Enter your Genshin Impact UID', help_text: 'The 9-digit UID shown at the bottom-right of your in-game screen.', is_required: true, sort_order: 1 },
  {
    field_key: 'zone_id', label: 'Server', field_type: 'select', placeholder: 'Select server', is_required: true, sort_order: 2,
    options: ['Asia', 'America', 'Europe', 'TW, HK, MO'].map((v) => ({ value: v, label: v })),
    help_text: defaultServer ? `US accounts are on the ${defaultServer} server.` : 'Pick the server your account is registered on.',
  },
];

GAMES.push(
  {
    slug: 'genshin-impact',
    name: 'Genshin Impact',
    subtitle: 'Genesis Crystals',
    description: 'Top up Genesis Crystals for Genshin Impact. Enter your UID and server, pick a pack, and crystals are delivered straight to your account.',
    image_url: 'img/hero/game-genshin-card.webp',
    banner_url: 'img/hero/game-genshin-card.webp',
    category: 'RPG',
    currency_label: 'Genesis Crystals',
    provider: 'yokcash',
    status: 'active',
    sort_order: 12,
    how_to_steps: [
      { title: 'Enter UID & Server', description: 'Provide your Genshin Impact UID and select the correct server.' },
      { title: 'Choose the Package', description: 'Select the Genesis Crystals pack or Welkin Moon.' },
      { title: 'Make Payment', description: 'Choose your preferred payment method.' },
      { title: 'Confirmation', description: 'Crystals are credited after payment — restart the game to see them.' },
    ],
    instructions: 'Crystals go to the UID + server you enter. Wrong server = wrong account — check before paying.',
    metadata: { source: 'moogold:428075' },
    fields: genshinFields(null),
    products: [
      ...GENSHIN_PACKS.map((p, i) => ({
        name: `${p.base} Genesis Crystals`, amount: `Crystals=${p.crystals}`, price: p.price,
        currency: 'INR', provider_product_id: p.yc, cost_price: inr(p.idr),
        is_popular: !!p.popular, sort_order: i + 1,
        metadata: { yokcash_service_id: p.yc, moogold_variation_id: p.mg, yokcash_cost_idr: p.idr },
      })),
      { name: 'Blessing of the Welkin Moon', amount: 'Welkin Moon', price: WELKIN.price, currency: 'INR', provider_product_id: WELKIN.yc, cost_price: inr(WELKIN.idr), is_popular: true, sort_order: 7, metadata: { yokcash_service_id: WELKIN.yc, moogold_variation_id: WELKIN.mg, yokcash_cost_idr: WELKIN.idr } },
    ],
  },
  {
    slug: 'genshin-impact-usa',
    name: 'Genshin Impact (USA)',
    subtitle: 'Chronal Nexus — US accounts',
    description: 'Top up Chronal Nexus for Genshin Impact on the America server. Enter your UID, pick a pack, and the currency is delivered to your account.',
    image_url: 'img/hero/game-genshin-card.webp',
    banner_url: 'img/hero/game-genshin-card.webp',
    category: 'RPG',
    currency_label: 'Chronal Nexus',
    provider: 'manual',
    status: 'active',
    sort_order: 13,
    how_to_steps: [
      { title: 'Enter UID & Server', description: 'Provide your Genshin Impact UID — US accounts are on the America server.' },
      { title: 'Choose the Package', description: 'Select the Chronal Nexus pack or Welkin Moon.' },
      { title: 'Make Payment', description: 'Choose your preferred payment method.' },
      { title: 'Confirmation', description: 'Delivery is processed after payment verification.' },
    ],
    instructions: 'For US-region accounts (America server). Delivery is manual — our team completes the top-up after payment.',
    metadata: { source: 'moogold:428075', fulfillment_mode: 'manual-moogold' },
    fields: genshinFields('America'),
    products: [
      ...GENSHIN_PACKS.map((p, i) => ({
        name: `${p.base} Chronal Nexus`, amount: `Chronal Nexus=${p.crystals}`, price: p.price,
        currency: 'INR', cost_price: p.price, is_popular: !!p.popular, sort_order: i + 1,
        metadata: { moogold_variation_id: { 673095: 31096093, 673096: 31096094, 673097: 31096095, 673098: 31096096, 673099: 31096097, 673100: 31096098 }[p.mg], fulfillment_mode: 'manual' },
      })),
      { name: 'Blessing of the Welkin Moon', amount: 'Welkin Moon', price: WELKIN.price, currency: 'INR', cost_price: WELKIN.price, is_popular: true, sort_order: 7, metadata: { moogold_variation_id: 1181776, fulfillment_mode: 'manual' } },
    ],
  },
  {
    slug: 'bgmi',
    name: 'BGMI',
    subtitle: 'Battlegrounds Mobile India UC',
    description: 'Top up UC for Battlegrounds Mobile India. Enter your numeric Character ID, pick a UC pack, and UC is credited to your account.',
    image_url: 'img/hero/game-pubg-card.webp',
    banner_url: 'img/hero/game-pubg-card.webp',
    category: 'Battle Royale',
    currency_label: 'UC',
    provider: 'yokcash',
    status: 'active',
    sort_order: 14,
    how_to_steps: [
      { title: 'Enter Character ID', description: 'Provide your numeric BGMI Character ID from your in-game profile.' },
      { title: 'Choose the Package', description: 'Select the UC pack you want.' },
      { title: 'Make Payment', description: 'Choose your preferred payment method.' },
      { title: 'Confirmation', description: 'UC is credited instantly after payment.' },
    ],
    instructions: 'UC is delivered to the Character ID you enter — double-check it before paying.',
    metadata: {},
    fields: [
      { field_key: 'player_id', label: 'Character ID', field_type: 'text', placeholder: 'Enter BGMI Character ID', help_text: 'The numeric ID under your in-game profile name.', is_required: true, sort_order: 1 },
    ],
    products: [
      { name: '60 UC', amount: 'UC=60', pid: 'PUBGYC60', idr: 16429 },
      { name: '325 UC', amount: 'UC=325', pid: 'PUBGYC325', idr: 82696 },
      { name: '660 UC', amount: 'UC=660', pid: 'PUBGYC660', idr: 165578, is_popular: true },
      { name: '1800 UC', amount: 'UC=1800', pid: 'PUBGYC1800', idr: 414223 },
      { name: '3850 UC', amount: 'UC=3850', pid: 'PUBGYC3850', idr: 828632 },
      { name: '8100 UC', amount: 'UC=8100', pid: 'PUBGYC8100', idr: 1605000 },
    ].map((p, i) => ({
      name: p.name, amount: p.amount, price: sell(p.idr), currency: 'INR',
      provider_product_id: p.pid, cost_price: inr(p.idr),
      is_popular: !!p.is_popular, sort_order: i + 1,
      metadata: { yokcash_service_id: p.pid, yokcash_cost_idr: p.idr },
    })),
  },
);

// ── 3. Insert ─────────────────────────────────────────────────────────────────
await uploadImages();
const gameIds = {};
for (const g of GAMES) {
  const { fields, products, ...row } = g;
  console.log(`\n== ${row.slug} ==`);
  for (const p of products) {
    console.log(`   ${p.name.padEnd(32)} sell ₹${p.price}  cost ₹${p.cost_price ?? '—'}  compare ₹${p.compare_price ?? '—'}  pid ${p.provider_product_id ?? '—'}`);
  }
  if (!APPLY) continue;

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
  gameIds[row.slug] = gameId;

  const { error: fErr } = await supabaseAdmin.from('game_fields').insert(fields.map((f) => ({ options: [], ...f, game_id: gameId })));
  if (fErr) throw new Error(`fields ${row.slug}: ${fErr.message}`);
  const { error: pErr } = await supabaseAdmin.from('products').insert(products.map((p) => ({ ...p, game_id: gameId, status: 'active' })));
  if (pErr) throw new Error(`products ${row.slug}: ${pErr.message}`);
  console.log(`   +${fields.length} fields, +${products.length} products`);
}

// ── 4. Promo cards ────────────────────────────────────────────────────────────
const PROMO_LINKS = [
  { section: 'trending', match: 'BGMI', set: { link_url: '/games/bgmi' }, game: 'bgmi' },
  { section: 'trending', match: 'Genshin Impact INDIA/USA', set: { title: 'Genshin Impact', link_url: '/games/genshin-impact', price: 9900, compare_price: null }, game: 'genshin-impact' },
  { section: 'trending', match: 'Honor of Kings', set: { link_url: '/games/honor-of-kings', price: 92, compare_price: 100 }, game: 'honor-of-kings' },
  { section: 'exclusive_offers', match: 'Starlight Pass Top Up', set: { link_url: '/games/starlight', image_url: 'img/games/starlight.jpg' }, game: 'starlight' },
  { section: 'exclusive_offers', match: 'Genshin Impact Genesis Crystals', set: { link_url: '/games/genshin-impact' }, game: 'genshin-impact' },
  { section: 'exclusive_offers', match: 'Honor of Kings Tokens', set: { link_url: '/games/honor-of-kings' }, game: 'honor-of-kings' },
];

for (const p of PROMO_LINKS) {
  const set = { ...p.set };
  if (gameIds[p.game]) set.game_id = gameIds[p.game];
  console.log(`promo ${p.section}/${p.match} →`, JSON.stringify(set));
  if (!APPLY) continue;
  const { error } = await supabaseAdmin.from('promotional_items').update(set).eq('section', p.section).eq('title', p.match);
  if (error) throw new Error(`promo ${p.match}: ${error.message}`);
}

// Add a second trending card for the USA split, after the INDIA card.
if (APPLY && gameIds['genshin-impact-usa']) {
  const { data: existing } = await supabaseAdmin.from('promotional_items')
    .select('id').eq('section', 'trending').eq('title', 'Genshin Impact USA').maybeSingle();
  if (!existing) {
    const { error } = await supabaseAdmin.from('promotional_items').insert({
      section: 'trending', title: 'Genshin Impact USA', link_url: '/games/genshin-impact-usa',
      game_id: gameIds['genshin-impact-usa'], image_url: 'img/hero/game-genshin-card.webp',
      price: 9900, currency: 'INR', is_active: true, sort_order: 4,
    });
    if (error) throw new Error(`promo genshin-usa insert: ${error.message}`);
    console.log('promo trending/Genshin Impact USA inserted');
  }
}

console.log(APPLY ? '\nDONE — applied.' : '\nDRY RUN — re-run with --apply to write.');
