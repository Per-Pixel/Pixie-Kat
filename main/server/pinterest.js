import { Buffer } from 'node:buffer';

const PAGE_HOSTS = new Set(['pinterest.com', 'pin.it']);
const MEDIA_HOSTS = new Set(['i.pinimg.com', 'v1.pinimg.com', 'v.pinimg.com']);
const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
const MAX_PAGE_BYTES = 6 * 1024 * 1024;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const MAX_PINS = 50;

export class PinterestImportError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function assertPinterestUrl(input, kind = 'page') {
  if (typeof input !== 'string' || input.length > 2048) {
    throw new PinterestImportError('Paste a Pinterest pin, board, or image link.');
  }
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw new PinterestImportError('Paste a valid Pinterest HTTPS link.');
  }
  const host = url.hostname.toLowerCase();
  const isPage = PAGE_HOSTS.has(host) || host.endsWith('.pinterest.com');
  const isMedia = MEDIA_HOSTS.has(host);
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !(kind === 'media' ? isMedia : isPage || isMedia)) {
    throw new PinterestImportError('Only HTTPS Pinterest and pinimg.com links are allowed.');
  }
  if (isMedia && !/\.(?:jpe?g|png|webp|gif|mp4|webm)$/i.test(url.pathname)) {
    throw new PinterestImportError('This Pinterest media format is not supported.');
  }
  return url;
}

function isMediaUrl(value) {
  try { return MEDIA_HOSTS.has(assertPinterestUrl(value, 'media').hostname.toLowerCase()); }
  catch { return false; }
}

function decodeHtml(value) {
  return String(value || '').replace(/&(#(?:x[0-9a-f]+|\d+)|amp|quot|apos|lt|gt);/gi, (_match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[entity.toLowerCase()] ?? '';
  });
}

function getMeta(html, name) {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {};
    for (const [, key, double, single] of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs[key.toLowerCase()] = decodeHtml(double ?? single);
    }
    if ((attrs.property || attrs.name)?.toLowerCase() === name) return attrs.content || '';
  }
  return '';
}

function highResImage(url) {
  if (!isMediaUrl(url)) return '';
  return url.replace(/\/\d+x\d*\//i, '/originals/');
}

function makeAsset({ pinId, title, mediaUrl, previewUrl, sourceUrl, kind }) {
  if (!isMediaUrl(mediaUrl)) return null;
  const preview = isMediaUrl(previewUrl) ? previewUrl : mediaUrl;
  const full = kind === 'image' ? highResImage(mediaUrl) : mediaUrl;
  const slug = String(title || 'pin').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'pin';
  const ext = new URL(full).pathname.split('.').pop().toLowerCase().replace('jpeg', 'jpg');
  return {
    id: `${pinId || slug}-${new URL(full).pathname}`,
    pinId: pinId || null,
    title: String(title || 'Pinterest media').trim().slice(0, 120),
    kind,
    sourceUrl,
    mediaUrl: full,
    fallbackUrl: full === mediaUrl ? null : mediaUrl,
    previewUrl: preview,
    filename: `pinterest-${pinId || 'media'}-${slug}.${ext}`,
  };
}

function extractState(html, sourceUrl, expectedPinId) {
  const results = [];
  const seen = new Set();
  for (const [, json] of html.matchAll(/<script\b[^>]*\bid=["'](?:__PINTEREST_APP_STATE__|initial-state)["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(json); } catch { continue; }
    let visited = 0;
    const visit = (value, depth = 0) => {
      if (!value || typeof value !== 'object' || depth > 18 || ++visited > 15000 || results.length >= MAX_PINS) return;
      if (Array.isArray(value)) { value.forEach((item) => visit(item, depth + 1)); return; }
      const pinId = String(value.id || value.pin_id || '');
      if (/^\d{6,}$/.test(pinId) && (!expectedPinId || pinId === expectedPinId)) {
        const images = value.images || {};
        const image = [images.originals?.url, images.orig?.url, images['1200x']?.url,
          images['736x']?.url, images['564x']?.url, images['236x']?.url].find(isMediaUrl);
        const videos = value.videos?.video_list || value.video_list || {};
        const video = [videos.V_1080P?.url, videos.V_720P?.url, videos.V_EXP7?.url, videos.V_480P?.url].find(isMediaUrl);
        const title = value.title || value.grid_title || value.description || 'Pinterest pin';
        const url = video || image;
        if (url && !seen.has(pinId)) {
          seen.add(pinId);
          const asset = makeAsset({ pinId, title, mediaUrl: url, previewUrl: image, sourceUrl, kind: video ? 'video' : 'image' });
          if (asset) results.push(asset);
        }
      }
      for (const child of Object.values(value)) if (child && typeof child === 'object') visit(child, depth + 1);
    };
    visit(data);
  }
  return results;
}

export function parsePinterestHtml(html, sourceUrl) {
  const page = assertPinterestUrl(sourceUrl);
  const pinId = page.pathname.match(/\/pin\/(\d+)/i)?.[1] || null;
  const state = extractState(html, sourceUrl, pinId);
  if (!pinId) return state;
  if (state.length) return state.slice(0, 1);

  const title = getMeta(html, 'og:title') || getMeta(html, 'twitter:title') || `Pin ${pinId}`;
  const image = getMeta(html, 'og:image') || getMeta(html, 'twitter:image');
  const video = getMeta(html, 'og:video:secure_url') || getMeta(html, 'og:video');
  const mediaUrl = isMediaUrl(video) ? video : image;
  const asset = makeAsset({ pinId, title, mediaUrl, previewUrl: image, sourceUrl,
    kind: isMediaUrl(video) ? 'video' : 'image' });
  return asset ? [asset] : [];
}

async function fetchAllowed(url, { fetcher, media = false }) {
  let current = assertPinterestUrl(url, media ? 'media' : 'page');
  for (let redirects = 0; redirects < 5; redirects++) {
    const response = await fetcher(current.href, {
      redirect: 'manual',
      signal: AbortSignal.timeout(media ? 20000 : 12000),
      headers: { 'User-Agent': 'Mozilla/5.0 PixieKatAdmin/1.0', 'Accept': media ? 'image/*,video/*' : 'text/html,application/xhtml+xml' },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new PinterestImportError('Pinterest returned a redirect without a destination.', 502);
      current = assertPinterestUrl(new URL(location, current).href, media ? 'media' : 'page');
      continue;
    }
    if (!response.ok) throw new PinterestImportError(`Pinterest could not load this link (${response.status}).`, 502);
    return { response, finalUrl: current.href };
  }
  throw new PinterestImportError('Pinterest redirected too many times.', 502);
}

async function readLimited(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'));
  if (declared > maxBytes) throw new PinterestImportError('This Pinterest file is too large to import.', 413);
  const parts = [];
  let total = 0;
  if (!response.body) throw new PinterestImportError('Pinterest returned an empty file.', 502);
  for await (const part of response.body) {
    total += part.byteLength;
    if (total > maxBytes) throw new PinterestImportError('This Pinterest file is too large to import.', 413);
    parts.push(Buffer.from(part));
  }
  return Buffer.concat(parts, total);
}

export async function resolvePinterestLink(input, { fetcher = globalThis.fetch } = {}) {
  const link = assertPinterestUrl(input);
  if (MEDIA_HOSTS.has(link.hostname.toLowerCase())) {
    const kind = /\.(?:mp4|webm)$/i.test(link.pathname) ? 'video' : 'image';
    const asset = makeAsset({ title: 'Pinterest media', mediaUrl: link.href, previewUrl: link.href,
      sourceUrl: link.href, kind });
    return asset ? [asset] : [];
  }
  const { response, finalUrl } = await fetchAllowed(link.href, { fetcher });
  if (MEDIA_HOSTS.has(new URL(finalUrl).hostname.toLowerCase())) {
    return resolvePinterestLink(finalUrl, { fetcher });
  }
  if (!response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
    throw new PinterestImportError('Pinterest did not return a public pin page. Try another pin link.', 422);
  }
  const html = (await readLimited(response, MAX_PAGE_BYTES)).toString('utf8');
  const assets = parsePinterestHtml(html, finalUrl);
  if (!assets.length) throw new PinterestImportError('No downloadable pin was found. Try a public pin link instead of a private board.', 422);
  return assets;
}

function validBytes(bytes, mime) {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (mime === 'image/gif') return ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString());
  if (mime === 'video/mp4') return bytes.subarray(4, 8).toString() === 'ftyp';
  if (mime === 'video/webm') return bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
  return false;
}

export async function downloadPinterestMedia({ mediaUrl, fallbackUrl }, { fetcher = globalThis.fetch } = {}) {
  const urls = [...new Set([mediaUrl, fallbackUrl].filter(Boolean))].map((url) => assertPinterestUrl(url, 'media').href);
  if (!urls.length) throw new PinterestImportError('Choose a Pinterest image or video to import.');
  let lastError;
  for (const url of urls) {
    try {
      const { response } = await fetchAllowed(url, { fetcher, media: true });
      const mimeType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (!MEDIA_TYPES.has(mimeType)) throw new PinterestImportError('Pinterest did not return a supported image or video.', 422);
      const bytes = await readLimited(response, MAX_MEDIA_BYTES);
      if (!validBytes(bytes, mimeType)) throw new PinterestImportError('Pinterest returned an invalid image or video.', 422);
      return { bytes, mimeType };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
