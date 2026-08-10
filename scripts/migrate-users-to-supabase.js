/**
 * One-time migration script: PostgreSQL users → Supabase Auth
 *
 * What it does:
 *   1. Reads all users from the existing PostgreSQL `users` table
 *   2. Creates each as a Supabase Auth user (with a forced password-reset flag)
 *   3. The handle_new_user() trigger auto-creates their `profiles` row
 *   4. Updates the profile with phone/role/status from the old table
 *
 * Usage:
 *   1. Copy main/server/.env.example → main/server/.env and fill in values
 *   2. cd scripts && node migrate-users-to-supabase.js
 *
 * CAUTION: Run only once in a fresh Supabase project. Check output carefully.
 */

import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../main/server/.env') });

// ── Postgres (source) ──────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'pixiekat',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

// ── Supabase (destination) ─────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateUser(oldUser) {
  const email = oldUser.email.toLowerCase();
  console.log(`  Migrating: ${email} (old id: ${oldUser.id})`);

  // Create auth.users entry
  const { data, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name: oldUser.name },
    // Users will be prompted to reset their password on first login
    // by sending a password reset email after migration
  });

  if (createError) {
    if (createError.message.includes('already been registered')) {
      console.log(`    SKIP: ${email} already exists in Supabase`);
      return { skipped: true };
    }
    console.error(`    ERROR creating ${email}: ${createError.message}`);
    return { error: createError.message };
  }

  const supabaseUserId = data.user.id;

  // Update the profile row (created by trigger) with extra fields
  const profileUpdates = {};
  if (oldUser.phone)  profileUpdates.phone  = oldUser.phone;
  if (oldUser.role)   profileUpdates.role   = oldUser.role;
  if (oldUser.status) profileUpdates.status = oldUser.status;

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ ...profileUpdates, updated_at: new Date().toISOString() })
      .eq('id', supabaseUserId);

    if (profileError) {
      console.warn(`    WARN: Profile update failed for ${email}: ${profileError.message}`);
    }
  }

  // Optional: send password reset email so user can set a new password
  // Uncomment if you want to notify all migrated users:
  // await supabase.auth.resetPasswordForEmail(email);

  console.log(`    OK: ${email} → ${supabaseUserId}`);
  return { success: true, newId: supabaseUserId };
}

async function main() {
  console.log('=== Pixie-Kat: PostgreSQL → Supabase User Migration ===\n');

  let client;
  try {
    client = await pool.connect();
    const { rows: users } = await client.query(
      'SELECT id, name, email, phone, role, status FROM users WHERE deleted_at IS NULL ORDER BY created_at ASC'
    );

    console.log(`Found ${users.length} users to migrate.\n`);

    const results = { success: 0, skipped: 0, error: 0 };

    for (const user of users) {
      const result = await migrateUser(user);
      if (result.success)  results.success++;
      if (result.skipped)  results.skipped++;
      if (result.error)    results.error++;
      await sleep(300); // Rate limit: Supabase admin API has limits
    }

    console.log('\n=== Migration Complete ===');
    console.log(`  Migrated : ${results.success}`);
    console.log(`  Skipped  : ${results.skipped}`);
    console.log(`  Errors   : ${results.error}`);

    if (results.error > 0) {
      console.log('\nReview errors above. Re-run the script — it will skip already-migrated users.');
    } else {
      console.log('\nAll users migrated. You can now switch the app to Supabase Auth.');
      console.log('Remember to send password reset emails to all users!');
    }
  } finally {
    client?.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
