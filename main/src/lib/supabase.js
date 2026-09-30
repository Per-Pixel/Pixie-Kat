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

const PUBLIC_MEDIA_BUCKET = 'public-media';

const ABSOLUTE_URL_RE = /^(https?:|data:|blob:|\/\/)/i;
const LOCAL_MEDIA_RE = /^\/?(img|audio|videos)\//i;

export function isLocalMediaPath(value) {
  return typeof value === 'string' && LOCAL_MEDIA_RE.test(value.trim());
}

export function publicMediaUrl(path) {
  if (path == null) return '';
  if (typeof path !== 'string') return String(path);
  const trimmed = path.trim();
  if (!trimmed || ABSOLUTE_URL_RE.test(trimmed)) return trimmed;
  const clean = trimmed.replace(/^\/+/, '');
  if (!supabaseUrl) return `/${clean}`;
  const base = String(supabaseUrl).replace(/\/+$/, '');
  const encoded = clean.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${base}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${encoded}`;
}

export function resolveMediaUrls(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(resolveMediaUrls);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolveMediaUrls(v)])
    );
  }
  if (typeof value === 'string' && isLocalMediaPath(value)) {
    return publicMediaUrl(value);
  }
  return value;
}
