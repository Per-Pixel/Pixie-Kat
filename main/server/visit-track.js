const META_UTM = new Set([
  'facebook',
  'fb',
  'instagram',
  'ig',
  'meta',
  'facebook-ads',
  'ig_ads',
  'an',
]);

const META_HOST = /(^|\.)(facebook|fb|instagram|messenger)\.com$/i;

export function referrerHost(referrer) {
  const raw = String(referrer || '').trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, '').slice(0, 120);
    return host || null;
  } catch {
    return null;
  }
}

export function cleanUtm(value) {
  const text = String(value || '').trim().slice(0, 120);
  if (!text) return null;
  return text.replace(/[^\w .+\-:/]/g, '').slice(0, 120) || null;
}

export function cleanPath(value) {
  const text = String(value || '').trim().slice(0, 200);
  if (!text.startsWith('/') || text.startsWith('//')) return '/';
  return text.split('?')[0];
}

/** meta = ad click that reached the site (fbclid, meta utm, or Facebook/Instagram referrer). */
export function classifyVisit({ utmSource, referrerHost: host, hasFbclid }) {
  const src = String(utmSource || '').trim().toLowerCase();
  const from = String(host || '').trim().toLowerCase();
  if (hasFbclid || META_UTM.has(src) || META_HOST.test(from)) return 'meta';
  if (src === 'google' || src === 'adwords' || /(^|\.)google\.[a-z.]+$/.test(from)) return 'google';
  if (!src && !from) return 'direct';
  return 'other';
}
