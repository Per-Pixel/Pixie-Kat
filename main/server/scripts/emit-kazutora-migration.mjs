// One-off: emit supabase migration SQL for the 5 kazutora games from the live
// DB rows (guarantees parity with what seed-kazutora-games.mjs applied).
import { writeFileSync } from 'fs';
import { supabaseAdmin } from '../supabase-admin.js';

const slugs = ['magic-chess-go-go', 'bgmi-not-instant', 'pubg-global', 'honkai-star-rail', 'revelation-mobile'];
const { data: games } = await supabaseAdmin.from('games').select('*').in('slug', slugs).order('sort_order');
const ids = games.map((g) => g.id);
const { data: fields } = await supabaseAdmin.from('game_fields').select('*').in('game_id', ids).order('game_id').order('sort_order');
const { data: products } = await supabaseAdmin.from('products').select('*').in('game_id', ids).order('game_id').order('sort_order');

const q = (v) => {
  if (v == null) return 'null';
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

let out = `-- 050: Seed 5 games cloned from the kazutora.in catalog (scraped 2026-10-13):\n`;
out += `-- Magic Chess: Go Go, BGMI (Not Instant), PUBG Mobile Global, Honkai: Star\n`;
out += `-- Rail, Revelation Mobile. Applied to prod via\n`;
out += `-- main/server/scripts/seed-kazutora-games.mjs (service role; that script also\n`;
out += `-- uploads the kazutora artwork into public-media). This file captures the\n`;
out += `-- catalog rows for parity. Idempotent via ON CONFLICT.\n`;
out += `-- Pricing: sell = exact kazutora retail INR; cost_price = Yokcash harga\n`;
out += `-- IDR->INR @0.005385. bgmi-not-instant is provider='manual' (kazutora prices\n`;
out += `-- are below Yokcash cost and most packs have no matching SKU).\n\n`;

out += 'insert into games (id, slug, name, subtitle, description, image_url, banner_url, category, currency_label, provider, status, sort_order, how_to_steps, instructions, metadata)\nvalues\n';
out += games
  .map((g) =>
    '  (' + [q(g.id), q(g.slug), q(g.name), q(g.subtitle), q(g.description), q(g.image_url), q(g.banner_url), q(g.category), q(g.currency_label), q(g.provider), q(g.status), g.sort_order, q(g.how_to_steps), q(g.instructions), q(g.metadata)].join(',') + ')'
  )
  .join(',\n');
out += '\non conflict (id) do nothing;\n\n';

out += '-- Game fields\ninsert into game_fields (game_id, field_key, label, field_type, placeholder, help_text, is_required, options, validation_regex, sort_order) values\n';
out += fields
  .map((f) =>
    '  (' + [q(f.game_id), q(f.field_key), q(f.label), q(f.field_type), q(f.placeholder), q(f.help_text), f.is_required, q(f.options), q(f.validation_regex), f.sort_order].join(',') + ')'
  )
  .join(',\n');
out += '\non conflict do nothing;\n\n';

out += '-- Products: provider_product_id = Yokcash service code where present;\n';
out += '-- null + metadata.manual_fulfillment = no matching Yokcash SKU.\n';
out += 'insert into products (game_id, name, description, amount, price, cost_price, compare_price, currency, image_url, sku, provider_product_id, stock, is_popular, status, sort_order, metadata) values\n';
out += products
  .map((p) =>
    '  (' + [q(p.game_id), q(p.name), q(p.description), q(p.amount), q(p.price), q(p.cost_price), q(p.compare_price), q(p.currency), q(p.image_url), q(p.sku), q(p.provider_product_id), q(p.stock), q(p.is_popular), q(p.status), p.sort_order, q(p.metadata)].join(',') + ')'
  )
  .join(',\n');
out += '\non conflict do nothing;\n';

writeFileSync('../../supabase/migrations/050_kazutora_games.sql', out);
console.log(`written 050_kazutora_games.sql — ${games.length} games, ${fields.length} fields, ${products.length} products`);
