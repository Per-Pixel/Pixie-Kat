// Undo for tmp-seed.mjs: restores games.metadata and product amount/description
// for Mobile Legends from the pre-change snapshot in tmp-backup.json.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const { game, products } = JSON.parse(
  readFileSync(new URL('./tmp-backup.json', import.meta.url), 'utf8')
);

const { error: metaErr } = await db
  .from('games')
  .update({ metadata: game.metadata })
  .eq('id', game.id);
if (metaErr) throw metaErr;

for (const p of products) {
  const { error } = await db
    .from('products')
    .update({ amount: p.amount, description: p.description })
    .eq('id', p.id);
  if (error) throw error;
}

console.log(`restored games.metadata and ${products.length} products`);
