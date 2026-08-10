#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const ADMIN_NODE_MODULES = path.resolve(__dirname, '..', 'admin', 'node_modules');
if (fs.existsSync(ADMIN_NODE_MODULES)) module.paths.unshift(ADMIN_NODE_MODULES);
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1); }

const supabase = createClient(url, key);

async function main() {
  // Try to upsert a row with about_settings to see if column exists
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error reading store_settings:', error.message);
    process.exit(1);
  }

  console.log('Current store_settings columns:', data ? Object.keys(data) : 'no row');

  if (data && !('about_settings' in data)) {
    console.log('\nabout_settings column does NOT exist yet.');
    console.log('Please run this SQL in the Supabase SQL Editor:');
    console.log('');
    console.log("  ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS about_settings JSONB NOT NULL DEFAULT '{}'::jsonb;");
    console.log('');
  } else if (data && 'about_settings' in data) {
    console.log('\nabout_settings column already exists. Value:', JSON.stringify(data.about_settings));
  } else {
    console.log('\nNo row in store_settings. The admin panel will create one on first save.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
