import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to main/.env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'pixiekat_session',
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
