export function cleanPath(value) {
  const text = String(value || '').trim().slice(0, 200);
  if (!text.startsWith('/') || text.startsWith('//')) return '/';
  return text.split('?')[0];
}

const VISITOR_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanVisitorKey(value) {
  const text = String(value || '').trim().toLowerCase();
  return VISITOR_KEY.test(text) ? text : null;
}

/** Coarse device from the browser's own User-Agent. No fingerprint. */
export function deviceFromUserAgent(userAgent) {
  const ua = String(userAgent || '');
  if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && /mobile/i.test(ua))) return 'iPad';
  if (/iphone|ipod/i.test(ua)) return 'iPhone';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'Mac';
  if (/linux/i.test(ua)) return 'Linux';
  if (!ua.trim()) return 'Unknown';
  return 'Other';
}

export function isPublicIp(ip) {
  const value = String(ip || '').replace(/^::ffff:/, '').trim();
  if (!value || value === '::1' || value === '127.0.0.1') return false;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(value)) return false;
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80')) return false;
  return true;
}

const placeCache = new Map();

export function placeFromGeo(data) {
  if (!data || data.success === false) return 'Unknown';
  const country = String(data.country || '').trim().slice(0, 60);
  const region = String(data.region || '').trim().slice(0, 60);
  if (region && country) return `${region}, ${country}`.slice(0, 80);
  return country || 'Unknown';
}

/** Country and region only. The IP is not stored. */
export async function lookupPlace(ip, fetchImpl = fetch) {
  if (!isPublicIp(ip)) return 'Unknown';
  const key = String(ip).replace(/^::ffff:/, '');
  if (placeCache.has(key)) return placeCache.get(key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1200);
  try {
    const response = await fetchImpl(`https://ipwho.is/${encodeURIComponent(key)}`, { signal: controller.signal });
    const data = await response.json();
    const place = placeFromGeo(data);
    if (placeCache.size > 400) placeCache.clear();
    placeCache.set(key, place);
    return place;
  } catch {
    return 'Unknown';
  } finally {
    clearTimeout(timer);
  }
}
