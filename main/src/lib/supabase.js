import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the AWS Amplify environment variables, then redeploy.'
  : null;

export const supabase = createClient(
  supabaseUrl || 'https://configuration-missing.supabase.co',
  supabaseAnonKey || 'configuration-missing-anon-key',
  {
  auth: {
    persistSession: true,
    storageKey: 'pixiekat_session',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
