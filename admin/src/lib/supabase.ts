import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the AWS Amplify environment variables, then redeploy.'
  : null;

export const supabase = createClient(
  supabaseUrl || 'https://configuration-missing.supabase.co',
  supabaseAnonKey || 'configuration-missing-anon-key',
  {
  auth: {
    persistSession: true,
    storageKey: 'pixiekat_admin_session',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type { User, Session } from '@supabase/supabase-js';
