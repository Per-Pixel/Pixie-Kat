/**
 * Seed 5 game pages cloned from the kazutora.in catalog (scraped 2026-10-13):
 *   Magic Chess Go Go, BGMI (Not Instant), PUBG Mobile Global,
 *   Honkai: Star Rail, Revelation Mobile.
 *
 * Sell price  = kazutora retail INR (matched exactly).
 * Cost price  = Yokcash `harga` (IDR) → INR @ 0.005385.
 * Images      = kazutora productImages, uploaded to the public-media bucket.
 *
 * Margin notes (see dry-run printout):
 *   - PUBG Global / HSR / Revelation: every pack above Yokcash cost.
 *   - Magic Chess: small losses on 172, 1346, 2195, 3688, 5532, 9288 + FT1000.
 *   - BGMI (Not Instant): EVERY standard UC pack is below Yokcash cost, and
 *     the Bonus/Extra packs have no matching Yokcash SKU — so the game is
 *     seeded provider='manual' (true to "not instant"; staff fulfills from
 *     the Yokcash console or another channel). The 6 standard packs still
 *     carry provider_product_id so flipping provider='yokcash' later works —
 *     but the Bonus/Extra packs have no SKU and would auto-refund under
 *     yokcash, so don't flip without fixing that.
 *
 * Usage: node scripts/seed-kazutora-games.mjs [--apply]   (default = dry-run)
 */
import { supabaseAdmin } from '../supabase-admin.js';

const APPLY = process.argv.includes('--apply');
const IDR_INR = 0.005385; // same rate as seed-new-games.mjs (2026-10-06)
const cost = (idr) => Math.round(idr * IDR_INR * 100) / 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KZ = 'https://kazutora.in';
const ZL = 'https://zleeofficial.in';

// ── 1. Images (source URL → public-media path) ────────────────────────────────
const IMAGES = [
  [`${KZ}/productImages/1786632096912--1001017499.jpg`, 'img/games/magic-chess-go-go.jpg'],
  [`${KZ}/packCategory/1770274251723--small.jpg`, 'img/products/mcgg-diamonds.jpg'],
  [`${KZ}/packCategory/1770274206784--double.jpg`, 'img/products/mcgg-double.jpg'],
  [`${KZ}/productImages/1758154297849--Battleground_Mobile_India.webp`, 'img/games/bgmi-not-instant.webp'],
  [`${KZ}/productImages/1758154308203--gametiles_com.tencent.ig.jpg`, 'img/games/pubg-global.jpg'],
  [`${KZ}/productImages/1758154230058--dsih7e1dvu2x9lk1724753390.webp`, 'img/games/honkai-star-rail.webp'],
  [`${ZL}/gallery/1735391263409--Item_Oneiric_Shard.webp`, 'img/products/hsr-oneiric-shard.webp'],
  [`${ZL}/gallery/1735391560094--Item_Express_Supply_Pass.webp`, 'img/products/hsr-express-pass.webp'],
  [`${KZ}/productImages/1758154205529--1754746049311--REVE.webp`, 'img/games/revelation-mobile.webp'],
  [`${KZ}/packCategory/1786644166920--1747314681722--Picsart_25-05-15_18-39-53-591.png`, 'img/products/uc.png'],
];

async function uploadImages() {
  for (const [url, dest] of IMAGES) {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const type = dest.endsWith('.png') ? 'image/png' : dest.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
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
// Product helper: pid = Yokcash service id, idr = its harga, sec = section title
// (used to build metadata.package_sections after insert — ids unknown earlier).
const P = (name, amount, price, pid, idr, sec, extra = {}) => ({
  name, amount, price, currency: 'INR',
  provider_product_id: pid ?? null,
  cost_price: idr ? cost(idr) : null,
  image_url: extra.image ?? null,
  is_popular: !!extra.popular,
  status: 'active',
  sort_order: 0, // filled below
  _section: sec,
  metadata: pid
    ? { yokcash_service_id: pid, yokcash_cost_idr: idr }
    : { manual_fulfillment: true },
});

const GAMES = [
  {
    slug: 'magic-chess-go-go',
    name: 'Magic Chess: Go Go',
    subtitle: 'Magic Chess: Go Go Diamonds',
    description:
      'Top up Diamonds for Magic Chess: Go Go. Enter your User ID and Zone ID, pick a diamond pack or the Weekly Diamond Pass, and diamonds are credited to your account.',
    image_url: 'img/games/magic-chess-go-go.jpg',
    banner_url: 'img/games/magic-chess-go-go.jpg',
    category: 'Auto Battler',
    currency_label: 'Diamonds',
    provider: 'yokcash',
    status: 'active',
    sort_order: 15,
    how_to_steps: [
      { title: 'Enter Account Details', description: 'Provide your Magic Chess: Go Go User ID and Zone ID.' },
      { title: 'Choose the Package', description: 'Select the diamond pack you want.' },
      { title: 'Make Payment', description: 'Choose your preferred payment method.' },
      { title: 'Confirmation', description: 'Diamonds are credited after payment.' },
    ],
    instructions: 'Diamonds are delivered to the User ID + Zone ID you enter — double-check them before paying.',
    metadata: { source: 'kazutora:Magic Chess Go Go', pricing_source: 'kazutora.in', package_layout: 'compact' },
    fields: [
      { field_key: 'user_id', label: 'User ID', field_type: 'text', placeholder: 'Enter Magic Chess: Go Go User ID', help_text: 'The numeric User ID from your in-game profile.', is_required: true, sort_order: 1 },
      { field_key: 'zone_id', label: 'Zone ID', field_type: 'text', placeholder: 'Enter Zone ID', help_text: 'The Zone ID shown in brackets on your in-game profile.', is_required: true, sort_order: 2 },
    ],
    products: [
      P('Weekly Diamond Pass', 'Weekly Diamond Pass', 213, 'MCGG_WC_BR', 32184, 'TOP UP DIAMONDS', { popular: true, image: 'img/products/mcgg-diamonds.jpg' }),
      P('86 Diamonds (78+8 Bonus)', 'Diamond=86', 134, 'MCGG_86_BR', 23850, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('172 Diamonds (156+16 Bonus)', 'Diamond=172', 267, 'MCGG_172_BR', 52052, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('257 Diamonds (234+23 Bonus)', 'Diamond=257', 399, 'MCGG_257_BR', 70360, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('706 Diamonds (625+81 Bonus)', 'Diamond=706', 1051, 'MCGG_706_BR', 190621, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('1346 Diamonds', 'Diamond=1346', 1970, 'MCGG_1346_BR', 372970, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('1825 Diamonds', 'Diamond=1825', 2627, 'MCGG_1825_BR', 484744, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('2195 Diamonds (1860+335 Bonus)', 'Diamond=2195', 3137, 'MCGG_2195_BR', 585655, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('3688 Diamonds (3099+589 Bonus)', 'Diamond=3688', 5228, 'MCGG_3688_BR', 1007815, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('5532 Diamonds (4649+883 Bonus)', 'Diamond=5532', 7842, 'MCGG_5532_BR', 1554059, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('9288 Diamonds (7740+1548 Bonus)', 'Diamond=9288', 13069, 'MCGG_9288_BR', 2589973, 'TOP UP DIAMONDS', { image: 'img/products/mcgg-diamonds.jpg' }),
      P('100 Diamonds (50+50 First Top-Up)', 'Diamond=100', 89, 'MCGG_FT50_BR', 16066, 'DOUBLE DIAS PACKS', { image: 'img/products/mcgg-double.jpg' }),
      P('300 Diamonds (150+150 First Top-Up)', 'Diamond=300', 256, 'MCGG_FT150_BR', 47638, 'DOUBLE DIAS PACKS', { image: 'img/products/mcgg-double.jpg' }),
      P('500 Diamonds (250+250 First Top-Up)', 'Diamond=500', 425, 'MCGG_FT250_BR', 79193, 'DOUBLE DIAS PACKS', { image: 'img/products/mcgg-double.jpg' }),
      P('1000 Diamonds (500+500 First Top-Up)', 'Diamond=1000', 845, 'MCGG_FT500_BR', 160347, 'DOUBLE DIAS PACKS', { image: 'img/products/mcgg-double.jpg' }),
    ],
  },
  {
    slug: 'bgmi-not-instant',
    name: 'BGMI (Not Instant)',
    subtitle: 'Battlegrounds Mobile India UC — Manual Delivery',
    description:
      'Top up UC for Battlegrounds Mobile India at budget prices. This is not an instant top-up — our team processes each order manually after payment. Enter your numeric Character ID and pick a UC pack.',
    image_url: 'img/games/bgmi-not-instant.webp',
    banner_url: 'img/games/bgmi-not-instant.webp',
    category: 'Battle Royale',
    currency_label: 'UC',
    provider: 'manual',
    status: 'active',
    sort_order: 16,
    how_to_steps: [
      { title: 'Enter Character ID', description: 'Provide your numeric BGMI Character ID from your in-game profile.' },
      { title: 'Choose the Package', description: 'Select the UC pack you want.' },
      { title: 'Make Payment', description: 'Choose your preferred payment method.' },
      { title: 'Manual Delivery', description: 'Our team delivers the UC manually — not instant, allow processing time.' },
    ],
    instructions:
      'This is NOT an instant top-up. Orders are processed manually by our team after payment — delivery takes longer than the instant BGMI listing. ' +
      'UC is delivered to the Character ID you enter — double-check it before paying.',
    metadata: { source: 'kazutora:BGMI NOT INSTANT', pricing_source: 'kazutora.in', fulfillment_mode: 'manual', package_layout: 'compact' },
    fields: [
      { field_key: 'player_id', label: 'Character ID', field_type: 'text', placeholder: 'Enter BGMI Character ID', help_text: 'The numeric ID under your in-game profile name.', is_required: true, sort_order: 1 },
    ],
    products: [
      P('60 UC', 'UC=60', 73, 'PUBGYC60', 16429, 'UC TOP UP', { image: 'img/products/uc.png' }),
      P('80 UC', 'UC=80', 97, null, null, 'UC TOP UP', { image: 'img/products/uc.png' }),
      P('325 UC', 'UC=325', 370, 'PUBGYC325', 82696, 'UC TOP UP', { image: 'img/products/uc.png' }),
      P('660 UC', 'UC=660', 735, 'PUBGYC660', 165578, 'UC TOP UP', { popular: true, image: 'img/products/uc.png' }),
      P('1800 UC', 'UC=1800', 1850, 'PUBGYC1800', 414223, 'UC TOP UP', { image: 'img/products/uc.png' }),
      P('3850 UC', 'UC=3850', 3700, 'PUBGYC3850', 828632, 'UC TOP UP', { image: 'img/products/uc.png' }),
      P('8100 UC', 'UC=8100', 7350, 'PUBGYC8100', 1605000, 'UC TOP UP', { image: 'img/products/uc.png' }),
      P('16200 UC', 'UC=16200', 14500, null, null, 'UC TOP UP', { image: 'img/products/uc.png' }),
      P('12 + 1 UC Bonus', 'UC=12+1', 14, null, null, 'UC BONUS TOP UP', { image: 'img/products/uc.png' }),
      P('24 + 2 UC Bonus', 'UC=24+2', 29, null, null, 'UC BONUS TOP UP', { image: 'img/products/uc.png' }),
      P('60 + 6 UC Bonus', 'UC=60+6', 73, null, null, 'UC BONUS TOP UP', { image: 'img/products/uc.png' }),
      P('300 + 60 UC Bonus', 'UC=300+60', 375, null, null, 'UC BONUS TOP UP', { image: 'img/products/uc.png' }),
      P('600 + 120 UC Bonus', 'UC=600+120', 735, null, null, 'UC BONUS TOP UP', { image: 'img/products/uc.png' }),
      P('1500 + 450 UC Bonus', 'UC=1500+450', 1865, null, null, 'UC BONUS TOP UP', { image: 'img/products/uc.png' }),
      P('3000 + 1050 UC Bonus', 'UC=3000+1050', 3740, null, null, 'UC BONUS TOP UP', { image: 'img/products/uc.png' }),
      P('6000 + 2400 UC Bonus', 'UC=6000+2400', 7350, null, null, 'UC BONUS TOP UP', { image: 'img/products/uc.png' }),
      P('13040 + 5140 UC Bonus', 'UC=13040+5140', 16000, null, null, 'UC BONUS TOP UP', { image: 'img/products/uc.png' }),
      P('330 + 30 UC Bonus', 'UC=330+30', 400, null, null, 'EXTRA PACKS', { image: 'img/products/uc.png' }),
      P('645 + 75 UC Bonus', 'UC=645+75', 800, null, null, 'EXTRA PACKS', { image: 'img/products/uc.png' }),
      P('800 + 100 UC Bonus', 'UC=800+100', 970, null, null, 'EXTRA PACKS', { image: 'img/products/uc.png' }),
      P('8000 + 2800 UC Bonus', 'UC=8000+2800', 9600, null, null, 'EXTRA PACKS', { image: 'img/products/uc.png' }),
    ],
  },
  {
    slug: 'pubg-global',
    name: 'PUBG Mobile Global',
    subtitle: 'PUBG Mobile UC (Global)',
    description:
      'Top up UC for PUBG Mobile Global. Enter your numeric Player ID, pick a UC pack, and UC is credited to your account.',
    image_url: 'img/games/pubg-global.jpg',
    banner_url: 'img/games/pubg-global.jpg',
    category: 'Battle Royale',
    currency_label: 'UC',
    provider: 'yokcash',
    status: 'active',
    sort_order: 17,
    how_to_steps: [
      { title: 'Enter Player ID', description: 'Provide your numeric PUBG Mobile Player ID from your in-game profile.' },
      { title: 'Choose the Package', description: 'Select the UC pack you want.' },
      { title: 'Make Payment', description: 'Choose your preferred payment method.' },
      { title: 'Confirmation', description: 'UC is credited after payment.' },
    ],
    instructions: 'For PUBG Mobile Global accounts only — not BGMI. UC is delivered to the Player ID you enter; double-check it before paying.',
    metadata: { source: 'kazutora:PUBG GLOBAL', pricing_source: 'kazutora.in' },
    fields: [
      { field_key: 'player_id', label: 'Player ID', field_type: 'text', placeholder: 'Enter PUBG Mobile Player ID', help_text: 'The numeric ID under your in-game profile name.', is_required: true, sort_order: 1 },
    ],
    products: [
      P('60 UC', 'UC=60', 103, 'YCPUBGGLB60', 16391, null, { image: 'img/products/uc.png' }),
      P('325 UC (300+25 Bonus)', 'UC=325', 485, 'YCPUBGGLB300', 82696, null, { image: 'img/products/uc.png' }),
      P('660 UC (600+60 Bonus)', 'UC=660', 971, 'YCPUBGGLB600', 165578, null, { popular: true, image: 'img/products/uc.png' }),
      P('1800 UC (1500+300 Bonus)', 'UC=1800', 2406, 'YCPUBGGLB1500', 414223, null, { image: 'img/products/uc.png' }),
      P('3850 UC (3000+850 Bonus)', 'UC=3850', 4813, 'YCPUBGGLB3000', 828632, null, { image: 'img/products/uc.png' }),
    ],
  },
  {
    slug: 'honkai-star-rail',
    name: 'Honkai: Star Rail',
    subtitle: 'Oneiric Shards',
    description:
      'Top up Oneiric Shards for Honkai: Star Rail. Enter your UID and server, pick a shard pack or the Express Supply Pass, and it is delivered straight to your account.',
    image_url: 'img/games/honkai-star-rail.webp',
    banner_url: 'img/games/honkai-star-rail.webp',
    category: 'RPG',
    currency_label: 'Oneiric Shard',
    provider: 'yokcash',
    status: 'active',
    sort_order: 18,
    how_to_steps: [
      { title: 'Enter UID & Server', description: 'Provide your Honkai: Star Rail UID and select the correct server.' },
      { title: 'Choose the Package', description: 'Select the Oneiric Shard pack or Express Supply Pass.' },
      { title: 'Make Payment', description: 'Choose your preferred payment method.' },
      { title: 'Confirmation', description: 'Shards are credited after payment — restart the game to see them.' },
    ],
    instructions: 'Shards go to the UID + server you enter. Wrong server = wrong account — check before paying.',
    metadata: { source: 'kazutora:HONKAI STAR RAIL', pricing_source: 'kazutora.in' },
    fields: [
      { field_key: 'user_id', label: 'UID', field_type: 'text', placeholder: 'Enter your Honkai: Star Rail UID', help_text: 'The UID shown at the bottom-right of your in-game screen.', is_required: true, sort_order: 1 },
      {
        field_key: 'zone_id', label: 'Server', field_type: 'select', placeholder: 'Select server', is_required: true, sort_order: 2,
        options: ['America', 'Asia', 'Europe', 'TW, HK, MO'].map((v) => ({ value: v, label: v })),
        help_text: 'Pick the server your account is registered on.',
      },
    ],
    products: [
      P('60 Oneiric Shard (60+0)', 'Shard=60', 111, 'HNKIYC60', 16800, null, { image: 'img/products/hsr-oneiric-shard.webp' }),
      P('330 Oneiric Shard (300+30)', 'Shard=330', 538, 'HNKIYC300', 82950, null, { image: 'img/products/hsr-oneiric-shard.webp' }),
      P('1090 Oneiric Shard (980+110)', 'Shard=1090', 1679, 'HNKIYC980', 261450, null, { image: 'img/products/hsr-oneiric-shard.webp' }),
      P('2240 Oneiric Shard (1980+260)', 'Shard=2240', 3229, 'HNKIYC1980', 502950, null, { image: 'img/products/hsr-oneiric-shard.webp' }),
      P('3880 Oneiric Shard (3280+600)', 'Shard=3880', 5386, 'HNKIYC3280', 838950, null, { popular: true, image: 'img/products/hsr-oneiric-shard.webp' }),
      P('Express Supply Pass', 'Express Supply Pass', 538, 'HNKIYCESP', 82950, null, { image: 'img/products/hsr-express-pass.webp' }),
    ],
  },
  {
    slug: 'revelation-mobile',
    name: 'Revelation Mobile',
    subtitle: 'Revelation Mobile Top Up',
    description:
      'Recharge your Revelation Mobile account. Enter your User ID and pick a pack — the Battle Pass Classic is delivered to your account after payment.',
    image_url: 'img/games/revelation-mobile.webp',
    banner_url: 'img/games/revelation-mobile.webp',
    category: 'MMORPG',
    currency_label: 'Battle Pass',
    provider: 'yokcash',
    status: 'active',
    sort_order: 19,
    how_to_steps: [
      { title: 'Enter User ID', description: 'Provide your Revelation Mobile User ID.' },
      { title: 'Choose the Package', description: 'Select the Battle Pass Classic pack.' },
      { title: 'Make Payment', description: 'Choose your preferred payment method.' },
      { title: 'Confirmation', description: 'The pass is credited after payment.' },
    ],
    instructions: 'Delivered to the User ID you enter — double-check it before paying.',
    metadata: { source: 'kazutora:Revelation Mobile', pricing_source: 'kazutora.in' },
    fields: [
      { field_key: 'user_id', label: 'User ID', field_type: 'text', placeholder: 'Enter your Revelation Mobile User ID', is_required: true, sort_order: 1 },
    ],
    products: [
      P('Battle Pass Classic', 'Battle Pass Classic', 340, 'RVLNMBPC-S81', 55196, null, { image: 'img/games/revelation-mobile.webp' }),
    ],
  },
];

// ── 3. Insert ─────────────────────────────────────────────────────────────────
await uploadImages();
const gameIds = {};
for (const g of GAMES) {
  const { fields, products, ...row } = g;
  console.log(`\n== ${row.slug} ==`);
  products.forEach((p, i) => {
    p.sort_order = i + 1;
    const margin = p.cost_price != null ? ` margin ₹${(p.price - p.cost_price).toFixed(2)}${p.price < p.cost_price ? ' ⚠LOSS' : ''}` : ' manual';
    console.log(`   ${p.name.padEnd(44)} sell ₹${String(p.price).padEnd(6)} cost ₹${p.cost_price ?? '—'}  pid ${p.provider_product_id ?? '—'}${margin}`);
  });
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

  const toInsert = products.map(({ _section, ...p }) => ({ ...p, game_id: gameId }));
  const { data: inserted, error: pErr } = await supabaseAdmin.from('products').insert(toInsert).select('id, sort_order');
  if (pErr) throw new Error(`products ${row.slug}: ${pErr.message}`);
  console.log(`   +${fields.length} fields, +${inserted.length} products`);

  // Compact-layout games get their kazutora categories as titled grid sections.
  const sections = [...new Set(products.map((p) => p._section).filter(Boolean))];
  if (sections.length > 0) {
    const byOrder = new Map(inserted.map((r) => [r.sort_order, r.id]));
    const package_sections = sections.map((title) => ({
      type: 'grid',
      title,
      product_ids: products
        .map((p, i) => ({ p, id: byOrder.get(i + 1) }))
        .filter((x) => x.p._section === title && x.id)
        .map((x) => x.id),
    }));
    const mergedMeta = { ...(row.metadata ?? {}), package_sections };
    const { error: mErr } = await supabaseAdmin.from('games').update({ metadata: mergedMeta }).eq('id', gameId);
    if (mErr) throw new Error(`metadata sections ${row.slug}: ${mErr.message}`);
    console.log(`   package_sections: ${package_sections.map((s) => `${s.title} (${s.product_ids.length})`).join(' | ')}`);
  }
}

console.log(`\n${APPLY ? 'APPLIED' : 'DRY-RUN — re-run with --apply to write'}`);
