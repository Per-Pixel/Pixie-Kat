/**
 * Mints a short-lived Supabase access token for an existing user, using the
 * service role key already in main/server/.env.
 *
 * How it works: auth.admin.generateLink({ type: 'magiclink' }) returns a
 * hashed OTP token for the user without sending any email; we immediately
 * redeem it via auth.verifyOtp and print the resulting access_token.
 *
 * Use case: exercising admin-gated API routes (e.g. /api/yokcash/*) from curl
 * or scripts during local testing. The token is a normal session JWT (~1h).
 *
 * Usage:
 *   node scripts/mint-admin-token.mjs [email]
 *   node scripts/mint-admin-token.mjs admin@pixiekat.com
 */
import { supabaseAdmin } from '../supabase-admin.js';

const email = process.argv[2] || 'admin@pixiekat.com';

const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email,
});

if (linkError || !link?.properties?.hashed_token) {
  console.error('generateLink failed:', linkError?.message || 'no hashed_token returned');
  process.exit(1);
}

const { data: verify, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
  token_hash: link.properties.hashed_token,
  type: 'magiclink',
});

if (verifyError || !verify?.session?.access_token) {
  console.error('verifyOtp failed:', verifyError?.message || 'no session returned');
  process.exit(1);
}

// --json flag prints the whole session object (for browser localStorage
// injection: sb-<project-ref>-auth-token); default prints just access_token.
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(verify.session));
} else {
  console.log(verify.session.access_token);
}
