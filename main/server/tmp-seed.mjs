import 'dotenv/config';
import { existsSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const { data: game } = await db
  .from('games')
  .select('id, slug, instructions, metadata')
  .eq('slug', 'mobile-legends')
  .single();

const { data: products } = await db
  .from('products')
  .select('id, name, amount, description, price, sort_order')
  .eq('game_id', game.id)
  .order('sort_order');

const backupPath = new URL('./tmp-backup.json', import.meta.url);
if (existsSync(backupPath)) {
  console.log('backup already exists, keeping the original pre-change snapshot');
} else {
  writeFileSync(backupPath, JSON.stringify({ game, products }, null, 2));
  console.log('backup written: tmp-backup.json');
}

const bySort = new Map(products.map((p) => [p.sort_order, p]));
const id = (n) => bySort.get(n).id;

// Card captions: derive the reference's "Diamond=78+8" style from the existing
// names. "&" is the provider's base&bonus separator.
const caption = (name) => {
  const m = name.match(/(\d[\d,]*)\s*&\s*(\d[\d,]*)\s*Diamonds?/i);
  if (m) return `Diamond=${m[1]}+${m[2]}`;
  const single = name.match(/(\d[\d,]*)\s*Diamonds?/i);
  if (single) return `Diamond=${single[1]}`;
  return name;
};

const updates = [];
for (const p of products) {
  const next = /Diamond/i.test(p.name) ? caption(p.name) : p.name;
  if (next !== p.amount) updates.push({ id: p.id, amount: next });
}

// Subtitles for the two bundle cards (the reference shows the availability
// window in parentheses under the name).
const descriptions = [
  { sort: 1, description: '(Available Once Per Week)' },
  { sort: 2, description: '(Available Once Per Month)' },
];

const twilight = bySort.get(15);
const weeklyPass = bySort.get(16);

const packageSections = [
  { type: 'featured', product_ids: [id(1), id(2)] },
  { type: 'note', text: game.instructions?.trim() ?? '' },
  { type: 'grid', title: '', product_ids: [id(3), id(4), id(5), id(6)] },
  {
    type: 'grid',
    title: 'Package',
    product_ids: [id(7), id(8), id(9), id(10), id(11), id(12), id(13), id(14)],
  },
  { type: 'featured', product_ids: [twilight.id, weeklyPass.id] },
];

const metadata = {
  ...(game.metadata ?? {}),
  package_layout: 'compact',
  package_sections: packageSections,
};

for (const u of updates) {
  const { error } = await db.from('products').update({ amount: u.amount }).eq('id', u.id);
  if (error) throw error;
}
console.log(`updated ${updates.length} product captions`);

for (const d of descriptions) {
  const { error } = await db
    .from('products')
    .update({ description: d.description })
    .eq('id', id(d.sort));
  if (error) throw error;
}
console.log(`updated ${descriptions.length} bundle subtitles`);

const { error: metaErr } = await db.from('games').update({ metadata }).eq('id', game.id);
if (metaErr) throw metaErr;
console.log('updated games.metadata with package_sections');
