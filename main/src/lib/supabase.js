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
const SUPABASE_PUBLIC_OBJECT_RE =
  /\/storage\/v1\/object\/public\/public-media\/(.+)$/i;

/** When "site" (default), static media is served from the Amplify app origin to avoid Supabase cached egress. */
function useSupabaseStorageOrigin() {
  const mode = String(import.meta.env.VITE_PUBLIC_MEDIA_ORIGIN || 'site').toLowerCase();
  return mode === 'supabase';
}

export function isLocalMediaPath(value) {
  return typeof value === 'string' && LOCAL_MEDIA_RE.test(value.trim());
}

function decodePublicMediaObjectPath(pathname) {
  const match = String(pathname || '').match(SUPABASE_PUBLIC_OBJECT_RE);
  if (!match) return null;
  return match[1]
    .split('/')
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .join('/');
}

export function storagePathFromMediaValue(value) {
  if (value == null || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (LOCAL_MEDIA_RE.test(trimmed)) return trimmed.replace(/^\/+/, '');
  if (ABSOLUTE_URL_RE.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const fromStorage = decodePublicMediaObjectPath(u.pathname);
      if (fromStorage) return fromStorage;
    } catch {
      /* not a URL */
    }
  }
  return null;
}

export function publicMediaUrl(path) {
  if (path == null) return '';
  if (typeof path !== 'string') return String(path);
  const trimmed = path.trim();
  if (!trimmed) return '';

  const storagePath = storagePathFromMediaValue(trimmed);
  if (storagePath && !useSupabaseStorageOrigin()) {
    const encoded = storagePath.split('/').map((part) => encodeURIComponent(part)).join('/');
    return `/${encoded}`;
  }

  if (ABSOLUTE_URL_RE.test(trimmed)) return trimmed;

  const clean = trimmed.replace(/^\/+/, '');
  if (!supabaseUrl || !useSupabaseStorageOrigin()) return `/${clean}`;

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
