import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server .env'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function verifyAdminRequest(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or malformed Authorization header', user: null, profile: null };
  }

  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { error: 'Invalid or expired token', user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, status, name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Profile not found', user: null, profile: null };
  }

  if (!['admin', 'support'].includes(profile.role)) {
    return { error: 'Access denied: insufficient role', user: null, profile: null };
  }

  if (profile.status !== 'active') {
    return { error: 'Account is not active', user: null, profile: null };
  }

  return { error: null, user, profile };
}
