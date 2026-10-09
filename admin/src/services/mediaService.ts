import { supabase } from '../lib/supabase';

const PRIVATE_BUCKET = 'media';
const PUBLIC_BUCKET = 'public-media';
const PUBLIC_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface MediaRecord {
  id: string;
  filename: string;
  storage_path: string;
  bucket: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
  public_url: string;
  alt_text?: string | null;
  tags?: string[];
  uploaded_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type UsageCategory =
  | 'homepage'
  | 'games'
  | 'products'
  | 'events'
  | 'cms'
  | 'branding'
  | 'profiles'
  | 'other';

export interface MediaUsage {
  category: UsageCategory;
  subCategory?: string;
  table: string;
  recordId: string;
  recordName: string;
  field: string;
  adminLink?: string;
  page?: string;
  section?: string;
  slot?: string;
  live?: boolean;
}

export interface SiteGraphicPlacement {
  id: string;
  page: 'Homepage' | 'Games' | 'Branding' | 'Event';
  category: UsageCategory;
  section: string;
  label: string;
  description: string;
  url: string;
  kind: 'image' | 'video';
  live: boolean;
  adminLink?: string;
  source: {
    table: 'store_settings' | 'games' | 'products' | 'promotional_items';
    recordId?: string;
    column: string;
    path?: Array<string | number>;
    itemId?: string | number;
    storedUrl: string | null;
  };
}

export type MediaSort =
  | 'date-desc'
  | 'date-asc'
  | 'name-asc'
  | 'name-desc'
  | 'size-desc'
  | 'size-asc';

export type ImageOutputFormat = 'image/webp' | 'image/png' | 'image/jpeg';

export function normalizePath(str?: string | null): string {
  if (!str) return '';
  try {
    return decodeURIComponent(str.trim().replace(/^\/+/, '').replace(/[?#].*$/, '')).toLowerCase();
  } catch {
    return str.trim().replace(/^\/+/, '').replace(/[?#].*$/, '').toLowerCase();
  }
}

export function matchMediaUrl(candidate?: string | null, record?: MediaRecord | null): boolean {
  if (!candidate?.trim() || !record) return false;
  const value = candidate.trim();
  if (value === record.public_url || value === record.storage_path) return true;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
      return Boolean(match && match[1] === record.bucket && normalizePath(match[2]) === normalizePath(record.storage_path));
    } catch {
      return false;
    }
  }

  return record.bucket === PUBLIC_BUCKET && /^(?:\/?(?:img|videos|audio)\/)/i.test(value)
    && normalizePath(value) === normalizePath(record.storage_path);
}

function getObjectUrl(bucket: string, path: string): string {
  const prefix = `${bucket}/`;
  const clean = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  const encodedPath = clean.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function graphicPreviewUrl(value: string): string {
  const url = value.trim();
  return /^\/?(?:img|videos|audio)\//i.test(url)
    ? getObjectUrl(PUBLIC_BUCKET, url.replace(/^\/+/, ''))
    : url;
}

async function decorateRecord(record: MediaRecord): Promise<MediaRecord> {
  const bucket = record.bucket || PRIVATE_BUCKET;
  if (bucket === PUBLIC_BUCKET) {
    return { ...record, public_url: getObjectUrl(bucket, record.storage_path) };
  }

  const { data } = await supabase.storage.from(bucket).createSignedUrl(record.storage_path, 3600);
  return {
    ...record,
    public_url: data?.signedUrl || getObjectUrl(bucket, record.storage_path),
  };
}

// ============================================================
// Sync: list objects in the bucket and create missing DB rows
// ============================================================
export async function syncBucketToTable(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const bucket of [PRIVATE_BUCKET, PUBLIC_BUCKET]) {
    const { data: objects, error: listErr } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1000 });
    if (listErr) throw listErr;

    for (const obj of objects ?? []) {
      if (!obj.name) continue;

      const path = obj.name;
      const { data: existing } = await supabase
        .from('media')
        .select('id')
        .eq('bucket', bucket)
        .eq('storage_path', path)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from('media').insert({
        filename: obj.name,
        storage_path: path,
        bucket,
        mime_type: obj.metadata?.mimetype ?? null,
        size_bytes: obj.metadata?.size ?? null,
        public_url: getObjectUrl(bucket, path),
      });

      if (!error) created++;
    }
  }

  return { created, skipped };
}

// ============================================================
// List
// ============================================================
export async function listMedia(options?: {
  search?: string;
  mimeType?: string;
  bucket?: string;
  sort?: MediaSort;
  limit?: number;
  offset?: number;
}): Promise<{ data: MediaRecord[]; count: number }> {
  const sort = options?.sort ?? 'date-desc';
  const sortMap: Record<MediaSort, { column: string; ascending: boolean }> = {
    'date-desc': { column: 'created_at', ascending: false },
    'date-asc': { column: 'created_at', ascending: true },
    'name-asc': { column: 'filename', ascending: true },
    'name-desc': { column: 'filename', ascending: false },
    'size-desc': { column: 'size_bytes', ascending: false },
    'size-asc': { column: 'size_bytes', ascending: true },
  };
  const selectedSort = sortMap[sort];

  let query = supabase
    .from('media')
    .select('*', { count: 'exact' })
    .order(selectedSort.column, { ascending: selectedSort.ascending, nullsFirst: false });

  if (options?.search) {
    query = query.ilike('filename', `%${options.search}%`);
  }
  if (options?.mimeType) {
    query = query.ilike('mime_type', `${options.mimeType}%`);
  }
  if (options?.bucket) {
    query = query.eq('bucket', options.bucket);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  const records = await Promise.all((data ?? []).map((record) => decorateRecord(record as MediaRecord)));
  return { data: records, count: count ?? 0 };
}

// ============================================================
// Upload
// ============================================================
export async function uploadMedia(
  file: File,
  folder: string = '',
  meta?: { alt_text?: string; tags?: string[] },
  bucket: typeof PRIVATE_BUCKET | typeof PUBLIC_BUCKET = PUBLIC_BUCKET
): Promise<MediaRecord> {
  if (![PRIVATE_BUCKET, PUBLIC_BUCKET].includes(bucket)) {
    throw new Error('Unsupported media bucket');
  }
  if (!PUBLIC_MEDIA_TYPES.has(file.type)) {
    throw new Error('Only supported image and video formats can be uploaded');
  }

  const ext = file.name.split('.').pop() ?? '';
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const timestamp = Date.now();
  const path = folder ? `${folder}/${base}_${timestamp}.${ext}` : `${base}_${timestamp}.${ext}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) throw upErr;

  const publicUrl = getObjectUrl(bucket, path);

  // Try to get image dimensions
  let width: number | null = null;
  let height: number | null = null;
  if (file.type.startsWith('image/')) {
    try {
      const dims = await getImageDimensions(file);
      width = dims.width;
      height = dims.height;
    } catch {
      /* ignore */
    }
  }

  const { data, error } = await supabase
    .from('media')
    .insert({
      filename: file.name,
      storage_path: path,
      bucket,
      mime_type: file.type,
      size_bytes: file.size,
      width,
      height,
      public_url: publicUrl,
      alt_text: meta?.alt_text ?? null,
      tags: meta?.tags ?? [],
    })
    .select('*')
    .single();

  if (error) throw error;
  return decorateRecord(data as MediaRecord);
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

// ============================================================
// Delete
// ============================================================
export async function deleteMedia(record: MediaRecord): Promise<void> {
  const bucket = record.bucket || PRIVATE_BUCKET;
  const { error: storErr } = await supabase.storage.from(bucket).remove([record.storage_path]);
  if (storErr) throw storErr;

  const { error } = await supabase.from('media').delete().eq('id', record.id);
  if (error) throw error;
}

// ============================================================
// Rename (display name + optionally storage object)
// ============================================================
export async function renameMedia(
  record: MediaRecord,
  newFilename: string,
  renameStorageObject = false
): Promise<MediaRecord> {
  const bucket = record.bucket || PRIVATE_BUCKET;
  let newPath = record.storage_path;

  if (renameStorageObject) {
    const ext = record.storage_path.split('.').pop() ?? '';
    const folder = record.storage_path.includes('/')
      ? record.storage_path.split('/').slice(0, -1).join('/')
      : '';
    const cleanName = newFilename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    newPath = folder ? `${folder}/${cleanName}.${ext}` : `${cleanName}.${ext}`;

    const { error: moveErr } = await supabase.storage
      .from(bucket)
      .move(record.storage_path, newPath);
    if (moveErr) throw moveErr;
  }

  const { data, error } = await supabase
    .from('media')
    .update({
      filename: newFilename,
      storage_path: newPath,
      public_url: getObjectUrl(bucket, newPath),
    })
    .eq('id', record.id)
    .select('*')
    .single();

  if (error) throw error;
  return decorateRecord(data as MediaRecord);
}

// ============================================================
// Replace file (keep DB row, swap bytes + update metadata)
// ============================================================
export async function replaceMedia(
  record: MediaRecord,
  file: File
): Promise<MediaRecord> {
  const bucket = record.bucket || PRIVATE_BUCKET;
  if (bucket === PUBLIC_BUCKET && !PUBLIC_MEDIA_TYPES.has(file.type)) {
    throw new Error('Only public images and videos can replace public media');
  }

  // Overwrite existing storage path
  const { error: upErr } = await supabase.storage.from(bucket).upload(record.storage_path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (upErr) throw upErr;

  let width: number | null = null;
  let height: number | null = null;
  if (file.type.startsWith('image/')) {
    try {
      const dims = await getImageDimensions(file);
      width = dims.width;
      height = dims.height;
    } catch {
      /* ignore */
    }
  }

  const { data, error } = await supabase
    .from('media')
    .update({
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      width,
      height,
      public_url: getObjectUrl(bucket, record.storage_path),
    })
    .eq('id', record.id)
    .select('*')
    .single();

  if (error) throw error;
  return decorateRecord(data as MediaRecord);
}

// ============================================================
// Compress image (client-side resize) and upload as new file
// ============================================================
export async function compressAndUpload(
  file: File,
  maxWidth = 1200,
  quality = 0.8,
  folder = '',
  outputFormat: ImageOutputFormat = 'image/jpeg'
): Promise<MediaRecord> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only images can be compressed');
  }

  const compressed = await compressImage(file, maxWidth, quality, outputFormat);
  return uploadMedia(compressed, folder, { alt_text: `Compressed ${file.name}` });
}

export async function convertImageAndUpload(
  file: File,
  outputFormat: ImageOutputFormat,
  options?: { maxWidth?: number; quality?: number; folder?: string }
): Promise<MediaRecord> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only images can be converted in-browser');
  }

  const converted = await compressImage(
    file,
    options?.maxWidth ?? 4096,
    options?.quality ?? 0.86,
    outputFormat
  );
  return uploadMedia(converted, options?.folder ?? '', { alt_text: `Converted ${file.name}` });
}

function compressImage(
  file: File,
  maxWidth: number,
  quality: number,
  outputFormat: ImageOutputFormat
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'));
            return;
          }
          const ext = outputFormat === 'image/png' ? 'png' : outputFormat === 'image/webp' ? 'webp' : 'jpg';
          const suffix = maxWidth < img.width ? 'compressed' : 'converted';
          const name = `${file.name.replace(/\.[^.]+$/, '')}_${suffix}.${ext}`;
          resolve(new File([blob], name, { type: outputFormat }));
        },
        outputFormat,
        outputFormat === 'image/png' ? undefined : quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = url;
  });
}

// ============================================================
// Download
// ============================================================
export async function downloadMedia(record: MediaRecord): Promise<Blob> {
  const bucket = record.bucket || PRIVATE_BUCKET;
  const { data, error } = await supabase.storage.from(bucket).download(record.storage_path);
  if (error) throw error;
  return data;
}

// ============================================================
// Usage scan — find every record referencing this media URL
// ============================================================
export interface AllRawUsages {
  settings?: any;
  games: any[];
  products: any[];
  promoItems: any[];
  profiles: any[];
}

export const DEFAULT_PRODUCTS_SLIDES = [
  {
    id: 1, title: 'PIXIEKAT', subtitle: 'Instant Gaming Credits',
    description: 'Top up diamonds, coins, and credits for your favorite games — fast, secure, and delivered straight to your account.',
    cta: 'TOP UP NOW', bgGradient: 'from-blue-700 via-violet-700 to-indigo-900', image: '/img/hero/game-hero-card.gif',
  },
  {
    id: 2, title: 'MOBILE LEGENDS', subtitle: 'Top Up Diamonds',
    description: 'Get instant diamonds for Mobile Legends. Fast, secure, and reliable top-up service with 24/7 support.',
    cta: 'TOP UP NOW', bgGradient: 'from-indigo-700 via-fuchsia-700 to-violet-900', image: '/img/hero/game-mlbb-card.webp',
  },
  {
    id: 3, title: 'PUBG GLOBAL', subtitle: 'UC Coins Available',
    description: 'Purchase UC coins for PUBG Mobile Global. Instant delivery and competitive prices guaranteed.',
    cta: 'BUY UC COINS', bgGradient: 'from-orange-600 via-rose-700 to-red-900', image: '/img/hero/game-pubg-card.webp',
  },
  {
    id: 4, title: 'GENSHIN IMPACT', subtitle: 'Genesis Crystals',
    description: 'Top up Genesis Crystals for Genshin Impact. Safe transactions with instant delivery to your account.',
    cta: 'GET CRYSTALS', bgGradient: 'from-cyan-700 via-sky-700 to-indigo-900', image: '/img/hero/game-genshin-card.webp',
  },
];

const homeGraphics: Array<{
  id: string; key: string; section: string; label: string; description: string;
  fallback: string; kind: 'image' | 'video';
}> = [
  { id: 'home-hero-contact', key: 'hero_contact_video', section: 'Hero', label: 'Contact card video', description: 'Video in the mobile contact card.', fallback: '/videos/feature-4.mp4', kind: 'video' },
  { id: 'home-hero-games-front', key: 'hero_games_front_video', section: 'Hero', label: 'Popular games card · front', description: 'Front video in the mobile popular games card.', fallback: '/videos/feature-2.mp4', kind: 'video' },
  { id: 'home-hero-games-back', key: 'hero_games_back_video', section: 'Hero', label: 'Popular games card · back', description: 'Back video in the mobile popular games card.', fallback: '/videos/feature-3.mp4', kind: 'video' },
  { id: 'home-feature-main', key: 'feature_main_video', section: 'Features', label: 'Main feature video', description: 'Wide video under “Power Up Your Game”.', fallback: '/videos/pixiekat-promo.mp4', kind: 'video' },
  { id: 'home-feature-small', key: 'feature_small_video', section: 'Features', label: 'Small feature video', description: 'Video in the smaller right-hand tile.', fallback: '/videos/feature-5.mp4', kind: 'video' },
  { id: 'home-promotion-frame', key: 'promotion_frame', section: 'Promotions', label: 'Background artwork', description: 'Artwork behind the promotion cards.', fallback: '/img/hero/promotion-art.png', kind: 'image' },
  { id: 'home-promotion-1', key: 'promotion_card_1', section: 'Promotions', label: 'MLBB Festive Top-Up Rewards', description: 'Image on the first promotion card.', fallback: '/img/promotion/leomord.webp', kind: 'image' },
  { id: 'home-promotion-2', key: 'promotion_card_2', section: 'Promotions', label: '2x Recharge Bonus', description: 'Image on the second promotion card.', fallback: '/img/promotion/eternal.webp', kind: 'image' },
  { id: 'home-promotion-3', key: 'promotion_card_3', section: 'Promotions', label: 'Limited Faze Offer', description: 'Image on the third promotion card.', fallback: '/img/promotion/starlight.webp', kind: 'image' },
  { id: 'home-contact-left-top', key: 'contact_left_top', section: 'Contact', label: 'Left artwork · top', description: 'First clipped artwork on the left of the contact panel.', fallback: '/img/contact-1.webp', kind: 'image' },
  { id: 'home-contact-left-bottom', key: 'contact_left_bottom', section: 'Contact', label: 'Left artwork · bottom', description: 'Second clipped artwork on the left of the contact panel.', fallback: '/img/contact-2.webp', kind: 'image' },
  { id: 'home-contact-right-back', key: 'contact_right_back', section: 'Contact', label: 'Right character · back', description: 'Background layer behind the contact character.', fallback: '/img/swordman-partial.webp', kind: 'image' },
  { id: 'home-contact-right-front', key: 'contact_right_front', section: 'Contact', label: 'Right character · front', description: 'Foreground character in the contact panel.', fallback: '/img/swordman.webp', kind: 'image' },
];

const fallbackTrending = [
  ['Black Myth Wukong', '/img/hero/game-hero-card.gif'],
  ['Alan Wake 2', '/img/games/mobile-legends.webp'],
  ['Mortal Kombat 11', '/img/hero/game-pubg-card.webp'],
  ['Spider-Man 2', '/img/hero/game-genshin-card.webp'],
  ['The Witcher 3', '/img/games/honor-of-kings.jpg'],
  ['Honor of Kings', '/img/games/honor-of-kings.jpg'],
];

const fallbackExclusive = [
  ['Mobile Legend Bang Bang', '/img/hero/game-mlbb-card.webp'],
  ['PUBG Mobile Top Up', '/img/hero/game-pubg-card.webp'],
  ['Genshin Impact Genesis Crystals', '/img/hero/game-genshin-card.webp'],
  ['Honor of Kings Tokens', '/img/games/honor-of-kings.jpg'],
  ['Mobile Legends Diamonds', '/img/games/mobile-legends.webp'],
  ['MLBB Leomord Special Pack', '/img/promotion/leomord.webp'],
  ['Magic Chess: Go Go Bundle', '/img/promotion/eternal.webp'],
  ['Starlight Pass Top Up', '/img/promotion/starlight.webp'],
  ['Jinx Champion Bundle', '/img/hero/Jinx.webp'],
  ['Faze Clan Promo Pack', '/img/hero/Faze.webp'],
  ['Melissa Character Pack', '/img/hero/melissa.webp'],
  ['Hero Special Top Up', '/img/hero/game-hero-card.gif'],
  ['Battle Arena Premium Pack', '/img/loading/1.jpg'],
  ['Dragon Quest Crystals', '/img/loading/2.jpg'],
  ['Fantasy Realm Credits', '/img/loading/3.jpg'],
  ['Shadow Warriors Bundle', '/img/loading/4.jpg'],
  ['Cyber Strike Coin Pack', '/img/loading/6.jpg'],
  ['Valor Points Top Up', '/img/loading/7.jpg'],
];

type GraphicInput = Omit<SiteGraphicPlacement, 'url' | 'source'> & {
  currentUrl?: string | null;
  fallbackUrl?: string;
  source: Omit<SiteGraphicPlacement['source'], 'storedUrl'>;
};

export function buildSiteGraphicPlacements(raw: AllRawUsages): SiteGraphicPlacement[] {
  const placements: SiteGraphicPlacement[] = [];
  const settings = raw.settings ?? {};
  const appearance = settings.appearance_settings ?? {};
  const custom = appearance.site_graphics && typeof appearance.site_graphics === 'object'
    ? appearance.site_graphics : {};
  const add = ({ currentUrl, fallbackUrl = '', source, ...rest }: GraphicInput) => {
    placements.push({ ...rest, url: currentUrl || fallbackUrl, source: { ...source, storedUrl: currentUrl ?? null } });
  };
  const addHome = (item: Omit<GraphicInput, 'page' | 'category' | 'live'>) =>
    add({ page: 'Homepage', category: 'homepage', live: true, ...item });

  const hero = settings.hero_settings ?? {};
  addHome({
    id: 'hero-video', section: 'Hero', label: 'Background video',
    description: 'Full-screen video behind the homepage heading.', kind: 'video',
    currentUrl: hero.background_video, fallbackUrl: '/videos/hero-1.mp4', adminLink: '/pages/homepage/hero',
    source: { table: 'store_settings', recordId: 'hero_settings', column: 'hero_settings', path: ['background_video'] },
  });
  for (const [key, label, fallback, phone] of [
    ['jinx', 'Left character', '/img/hero/Jinx.webp', false],
    ['faze', 'Center artwork', '/img/hero/Faze.webp', true],
    ['melissa', 'Right character', '/img/hero/melissa.webp', false],
  ] as const) {
    addHome({
      id: `hero-${key}`, section: 'Hero', label,
      description: `${phone ? 'Shown' : 'Hidden by default'} on phones.${key === 'jinx' ? ' Also supplies the video poster.' : ''}`,
      kind: 'image', currentUrl: hero.images?.[key]?.url, fallbackUrl: fallback,
      adminLink: '/pages/homepage/hero',
      source: { table: 'store_settings', recordId: 'hero_settings', column: 'hero_settings', path: ['images', key, 'url'] },
    });
  }

  const about = settings.about_settings ?? {};
  addHome({
    id: 'about-image', section: 'About', label: 'Full-screen reveal image',
    description: 'Image revealed during the scroll-pinned About section.', kind: 'image',
    currentUrl: about.image?.url ?? about.image_url, fallbackUrl: '/img/about.webp',
    adminLink: '/pages/homepage/about',
    source: { table: 'store_settings', recordId: 'about_settings', column: 'about_settings', path: ['image', 'url'] },
  });

  for (const item of homeGraphics) {
    addHome({
      id: item.id, section: item.section, label: item.label, description: item.description,
      kind: item.kind, currentUrl: custom[item.key], fallbackUrl: item.fallback,
      source: { table: 'store_settings', recordId: 'appearance_settings', column: 'appearance_settings', path: ['site_graphics', item.key] },
    });
  }

  const activePromos = (raw.promoItems ?? []).filter((item) => item.is_active);
  for (const [section, fallbacks, key] of [
    ['trending', fallbackTrending, 'Trending games'],
    ['exclusive_offers', fallbackExclusive, 'Exclusive offers'],
  ] as const) {
    if (activePromos.some((item) => item.section === section)) continue;
    fallbacks.forEach(([label, url], index) => {
      const fallbackKey = `${section === 'trending' ? 'trending' : 'exclusive'}_fallback_${index + 1}`;
      addHome({
        id: `home-fallback-${section === 'trending' ? 'trending' : 'exclusive'}-${index + 1}`,
        section: key, label, description: 'Built-in card shown until active cards are added in Content.', kind: 'image',
        currentUrl: custom[fallbackKey], fallbackUrl: url,
        adminLink: section === 'trending' ? '/pages/homepage/trending-games' : '/pages/homepage/exclusive-offers',
        source: { table: 'store_settings', recordId: 'appearance_settings', column: 'appearance_settings', path: ['site_graphics', fallbackKey] },
      });
    });
  }
  for (const item of raw.promoItems ?? []) {
    if (item.section !== 'trending' && item.section !== 'exclusive_offers') continue;
    const trending = item.section === 'trending';
    add({
      id: `promo-${item.id}`, page: 'Homepage', category: 'homepage',
      section: trending ? 'Trending games' : 'Exclusive offers', label: item.title || 'Untitled card',
      description: trending ? 'Card in the horizontal homepage carousel.' : 'Card in the homepage offers grid.',
      kind: 'image', live: Boolean(item.is_active), currentUrl: item.image_url,
      fallbackUrl: '/img/games/mobile-legends.webp',
      adminLink: `/pages/homepage/${trending ? 'trending-games' : 'exclusive-offers'}/${item.id}`,
      source: { table: 'promotional_items', recordId: item.id, column: 'image_url' },
    });
  }

  const slides = Array.isArray(settings.products_page_settings?.slides) && settings.products_page_settings.slides.length
    ? settings.products_page_settings.slides : DEFAULT_PRODUCTS_SLIDES;
  slides.forEach((slide: any, index: number) => add({
    id: `games-slide-${slide.id ?? index + 1}`, page: 'Games', category: 'games',
    section: 'Games carousel', label: `Slide ${index + 1} · ${slide.title || 'Untitled'}`,
    description: 'Image behind this slide at the top of the Games page.', kind: 'image', live: true,
    currentUrl: settings.products_page_settings?.slides?.[index]?.image,
    fallbackUrl: slide.image, adminLink: '/pages/products',
    source: { table: 'store_settings', recordId: `products_slide_${slide.id ?? index}`, column: 'products_page_settings', path: ['slides', index, 'image'], itemId: slide.id },
  }));

  for (const game of raw.games ?? []) {
    add({
      id: `game-${game.id}-card`, page: 'Games', category: 'games', section: 'Game cards', label: game.name,
      description: 'Square game image in the Games catalogue and game details.', kind: 'image',
      live: game.status === 'active', currentUrl: game.image_url,
      fallbackUrl: '/img/games/mobile-legends.webp', adminLink: `/products/games/${game.id}`,
      source: { table: 'games', recordId: game.id, column: 'image_url' },
    });
    add({
      id: `game-${game.id}-banner`, page: 'Games', category: 'games', section: 'Game banners', label: game.name,
      description: 'Wide banner above this game’s checkout; uses its card image if not set.', kind: 'image',
      live: game.status === 'active', currentUrl: game.banner_url,
      fallbackUrl: game.image_url || '/img/games/mobile-legends.webp', adminLink: `/products/games/${game.id}`,
      source: { table: 'games', recordId: game.id, column: 'banner_url' },
    });
  }
  const gameNames = new Map((raw.games ?? []).map((game) => [game.id, game.name]));
  const liveGames = new Set((raw.games ?? []).filter((game) => game.status === 'active').map((game) => game.id));
  for (const product of raw.products ?? []) {
    add({
      id: `product-${product.id}`, page: 'Games', category: 'products',
      section: `${gameNames.get(product.game_id) || 'Game'} · Packages`, label: product.name,
      description: 'Package image on the game checkout and cart.', kind: 'image',
      live: product.status === 'active' && liveGames.has(product.game_id), currentUrl: product.image_url,
      adminLink: product.game_id ? `/products/games/${product.game_id}` : '/products',
      source: { table: 'products', recordId: product.id, column: 'image_url' },
    });
  }

  const jjk = settings.event_jjk_cheaper_settings ?? {};
  const enabled = [
    jjk.placement?.homepage_banner && 'Homepage · Exclusive offers',
    jjk.placement?.games_page && 'Games · Catalogue',
    jjk.placement?.navbar && 'Navigation',
  ].filter(Boolean).join(', ');
  add({
    id: 'event-jjk-promo', page: 'Event', category: 'events', section: 'JJK event',
    label: 'Event promo image', description: enabled
      ? `Shared image shown in ${enabled} when the event is published.`
      : 'Not placed on the site yet. Enable a placement in the event editor.',
    kind: 'image', live: jjk.status === 'published' && Boolean(enabled),
    currentUrl: jjk.placement?.promo_image, fallbackUrl: '/img/games/mobile-legends.webp',
    adminLink: '/pages/events/jjk-cheaper',
    source: { table: 'store_settings', recordId: 'event_jjk_cheaper_settings', column: 'event_jjk_cheaper_settings', path: ['placement', 'promo_image'] },
  });
  (Array.isArray(jjk.skins) ? jjk.skins : []).forEach((skin: any, index: number) => {
    for (const [field, label] of [['portrait', 'Showcase portrait'], ['thumbnail', 'Gallery thumbnail']] as const) {
      add({
        id: `event-skin-${skin.id ?? index}-${field}`, page: 'Event', category: 'events', section: 'JJK skin showcase',
        label: `${skin.sorcerer || skin.hero || `Skin ${index + 1}`} · ${label}`,
        description: field === 'portrait' ? 'Full-size portrait in the event showcase and story.' : 'Small portrait in the event gallery.',
        kind: 'image', live: jjk.status === 'published' && jjk.visibleSections?.showcase !== false,
        currentUrl: skin[field], adminLink: '/pages/events/jjk-cheaper',
        source: { table: 'store_settings', recordId: skin.id ?? String(index), column: 'event_jjk_cheaper_settings', path: ['skins', index, field], itemId: skin.id },
      });
    }
  });

  for (const [key, label, fallback] of [
    ['logo_url', 'Navigation logo', '/img/logo.png'],
    ['favicon_url', 'Browser tab icon', ''],
    ['icon_url', 'App icon', ''],
  ] as const) {
    add({
      id: `brand-${key}`, page: 'Branding', category: 'branding', section: 'Site identity', label,
      description: key === 'logo_url' ? 'Logo in the site navigation.' : key === 'favicon_url'
        ? 'Icon in the browser tab.' : 'Icon saved to mobile home screens.',
      kind: 'image', live: Boolean(appearance[key] || fallback), currentUrl: appearance[key], fallbackUrl: fallback,
      adminLink: '/settings',
      source: { table: 'store_settings', recordId: 'appearance_settings', column: 'appearance_settings', path: [key] },
    });
  }
  const pageOrder = { Homepage: 0, Games: 1, Branding: 2, Event: 3 };
  const homeOrder = ['Hero', 'Trending games', 'Exclusive offers', 'About', 'Features', 'Promotions', 'Contact'];
  return placements.sort((a, b) => pageOrder[a.page] - pageOrder[b.page]
    || (a.page === 'Homepage' ? homeOrder.indexOf(a.section) - homeOrder.indexOf(b.section) : 0));
}

function nestedValue(value: any, path: Array<string | number>): any {
  return path.reduce((current, key) => current?.[key], value);
}

function withNestedValue(value: any, path: Array<string | number>, nextValue: string): any {
  const [key, ...rest] = path;
  const copy: any = Array.isArray(value) ? [...value] : value && typeof value === 'object' ? { ...value } : typeof key === 'number' ? [] : {};
  copy[key!] = rest.length ? withNestedValue(copy[key!], rest, nextValue) : nextValue;
  return copy;
}

export async function saveGraphicPlacement(placement: SiteGraphicPlacement, url: string): Promise<void> {
  const nextUrl = url.trim();
  if (!/^(https?:\/\/|\/?(?:img|videos)\/)/i.test(nextUrl)) {
    throw new Error('Choose an image or video from the library, or upload a new file.');
  }
  const { table, column, recordId, path, itemId, storedUrl } = placement.source;

  if (table !== 'store_settings') {
    if (!recordId) throw new Error('This graphic no longer has an editable record. Refresh and try again.');
    let query = supabase.from(table).update({ [column]: nextUrl }).eq('id', recordId);
    query = storedUrl == null ? query.is(column, null) : query.eq(column, storedUrl);
    const { data, error } = await query.select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This graphic changed in another editor. Refresh before saving.');
    return;
  }

  if (!path?.length || ![
    'hero_settings', 'about_settings', 'products_page_settings', 'event_jjk_cheaper_settings', 'appearance_settings',
  ].includes(column)) throw new Error('This graphic has no editable setting.');
  const { data, error } = await supabase.from('store_settings')
    .select('updated_at, hero_settings, about_settings, products_page_settings, event_jjk_cheaper_settings, appearance_settings')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Store settings are unavailable. Refresh and try again.');
  const settingColumn = column as keyof Omit<typeof data, 'updated_at'>;
  let current = data[settingColumn] && typeof data[settingColumn] === 'object' ? data[settingColumn] : {};
  const oldUrl = nestedValue(current, path)
    ?? (column === 'about_settings' && path[0] === 'image' ? current.image_url : null);
  if ((oldUrl || '') !== (storedUrl || '')) {
    throw new Error('This graphic changed in another editor. Refresh before saving.');
  }
  if (column === 'products_page_settings' && (!Array.isArray(current.slides) || !current.slides.length)) {
    current = { ...current, slides: DEFAULT_PRODUCTS_SLIDES.map((slide) => ({ ...slide })) };
  }
  if (itemId != null && String(nestedValue(current, path.slice(0, -1))?.id) !== String(itemId)) {
    throw new Error('This item was moved or removed. Refresh before saving.');
  }

  const nextSetting = withNestedValue(current, path, nextUrl);
  const { data: saved, error: saveError } = await supabase.from('store_settings')
    .update({ [column]: nextSetting }).eq('id', true).eq('updated_at', data.updated_at)
    .select('id').maybeSingle();
  if (saveError) throw saveError;
  if (!saved) throw new Error('Store settings changed while saving. Refresh before trying again.');
}

export async function fetchRawUsageData(): Promise<AllRawUsages> {
  const [settingsRes, gamesRes, productsRes, promoRes, profilesRes] = await Promise.all([
    supabase.from('store_settings').select('hero_settings, about_settings, products_page_settings, event_jjk_cheaper_settings, appearance_settings').maybeSingle(),
    supabase.from('games').select('id, name, slug, status, image_url, banner_url'),
    supabase.from('products').select('id, name, game_id, status, image_url'),
    supabase.from('promotional_items').select('id, title, section, is_active, image_url, link_url').order('sort_order', { ascending: true }),
    supabase.from('profiles').select('id, name, email, avatar_url').not('avatar_url', 'is', null),
  ]);
  for (const result of [settingsRes, gamesRes, productsRes, promoRes, profilesRes]) {
    if (result.error) throw result.error;
  }

  return {
    settings: settingsRes.data || {},
    games: gamesRes.data || [],
    products: productsRes.data || [],
    promoItems: promoRes.data || [],
    profiles: profilesRes.data || [],
  };
}

export function computeMediaUsages(record: MediaRecord, rawData: AllRawUsages): MediaUsage[] {
  const usages: MediaUsage[] = [];
  const { settings, games, products, promoItems, profiles } = rawData;

  // 1. Homepage & Store Settings
  if (settings) {
    // Hero Section
    const hero = settings.hero_settings;
    if (hero) {
      if (matchMediaUrl(hero.background_video, record)) {
        usages.push({
          category: 'homepage',
          subCategory: 'Hero Section (Video)',
          table: 'store_settings',
          recordId: 'hero_settings',
          recordName: 'Homepage Hero Video',
          field: 'background_video',
          adminLink: '/pages/homepage/hero',
        });
      }
      if (hero.images) {
        if (matchMediaUrl(hero.images.jinx?.url, record)) {
          usages.push({
            category: 'homepage',
            subCategory: 'Hero Section (Jinx)',
            table: 'store_settings',
            recordId: 'hero_settings',
            recordName: 'Hero Image 1 (Jinx)',
            field: 'images.jinx.url',
            adminLink: '/pages/homepage/hero',
          });
        }
        if (matchMediaUrl(hero.images.faze?.url, record)) {
          usages.push({
            category: 'homepage',
            subCategory: 'Hero Section (Center)',
            table: 'store_settings',
            recordId: 'hero_settings',
            recordName: 'Hero Image 2 (Center Logo)',
            field: 'images.faze.url',
            adminLink: '/pages/homepage/hero',
          });
        }
        if (matchMediaUrl(hero.images.melissa?.url, record)) {
          usages.push({
            category: 'homepage',
            subCategory: 'Hero Section (Melissa)',
            table: 'store_settings',
            recordId: 'hero_settings',
            recordName: 'Hero Image 3 (Melissa)',
            field: 'images.melissa.url',
            adminLink: '/pages/homepage/hero',
          });
        }
        // Check any dynamic image keys in hero
        Object.entries(hero.images).forEach(([key, imgObj]: [string, any]) => {
          if (!['jinx', 'faze', 'melissa'].includes(key) && matchMediaUrl(imgObj?.url, record)) {
            usages.push({
              category: 'homepage',
              subCategory: `Hero Section (${key})`,
              table: 'store_settings',
              recordId: 'hero_settings',
              recordName: `Hero Image (${key})`,
              field: `images.${key}.url`,
              adminLink: '/pages/homepage/hero',
            });
          }
        });
      }
    }

    // About Section
    const about = settings.about_settings;
    if (about && matchMediaUrl(about.image?.url, record)) {
      usages.push({
        category: 'homepage',
        subCategory: 'About Section',
        table: 'store_settings',
        recordId: 'about_settings',
        recordName: 'Homepage About Section Art',
        field: 'image.url',
        adminLink: '/pages/homepage/about',
      });
    }

    // Products Page Settings (Banner Slides)
    const prodPage = settings.products_page_settings;
    if (prodPage && Array.isArray(prodPage.slides)) {
      prodPage.slides.forEach((slide: any, idx: number) => {
        if (matchMediaUrl(slide?.image, record)) {
          usages.push({
            category: 'cms',
            subCategory: 'Products Page Slider',
            table: 'store_settings',
            recordId: `products_slide_${slide.id || idx}`,
            recordName: slide.title ? `Products Slide: ${slide.title}` : `Products Page Slide #${idx + 1}`,
            field: `slides[${idx}].image`,
            adminLink: '/pages/products',
          });
        }
      });
    }

    // JJK Cheaper Event Settings
    const jjk = settings.event_jjk_cheaper_settings;
    if (jjk) {
      if (matchMediaUrl(jjk.placement?.promo_image, record)) {
        usages.push({
          category: 'events',
          subCategory: 'JJK Event Banner',
          table: 'store_settings',
          recordId: 'event_jjk_cheaper_settings',
          recordName: 'JJK Cheaper Event Promo Banner',
          field: 'placement.promo_image',
          adminLink: '/pages/events/jjk-cheaper',
        });
      }
      if (Array.isArray(jjk.skins)) {
        jjk.skins.forEach((skin: any) => {
          if (matchMediaUrl(skin?.portrait, record)) {
            usages.push({
              category: 'events',
              subCategory: 'JJK Skin Portrait',
              table: 'store_settings',
              recordId: skin.id || 'skin',
              recordName: `JJK Skin: ${skin.hero || skin.sorcerer || 'Skin'} (Portrait)`,
              field: 'skins.portrait',
              adminLink: '/pages/events/jjk-cheaper',
            });
          }
          if (matchMediaUrl(skin?.thumbnail, record)) {
            usages.push({
              category: 'events',
              subCategory: 'JJK Skin Thumbnail',
              table: 'store_settings',
              recordId: skin.id || 'skin',
              recordName: `JJK Skin: ${skin.hero || skin.sorcerer || 'Skin'} (Thumbnail)`,
              field: 'skins.thumbnail',
              adminLink: '/pages/events/jjk-cheaper',
            });
          }
        });
      }
    }

    // Appearance / Branding Settings
    const app = settings.appearance_settings;
    if (app) {
      if (matchMediaUrl(app.logo_url, record)) {
        usages.push({
          category: 'branding',
          subCategory: 'Brand Logo',
          table: 'store_settings',
          recordId: 'appearance_settings',
          recordName: 'Storefront Brand Logo',
          field: 'logo_url',
          adminLink: '/settings',
        });
      }
      if (matchMediaUrl(app.favicon_url, record)) {
        usages.push({
          category: 'branding',
          subCategory: 'Favicon',
          table: 'store_settings',
          recordId: 'appearance_settings',
          recordName: 'Browser Favicon',
          field: 'favicon_url',
          adminLink: '/settings',
        });
      }
      if (matchMediaUrl(app.icon_url, record)) {
        usages.push({
          category: 'branding',
          subCategory: 'App Icon',
          table: 'store_settings',
          recordId: 'appearance_settings',
          recordName: 'App / PWA Icon',
          field: 'icon_url',
          adminLink: '/settings',
        });
      }
      if (matchMediaUrl(app.music_url, record)) {
        usages.push({
          category: 'branding',
          subCategory: 'Background Audio',
          table: 'store_settings',
          recordId: 'appearance_settings',
          recordName: 'Background Music Track',
          field: 'music_url',
          adminLink: '/settings',
        });
      }
    }
  }

  // 2. Promotional Items (Homepage Trending & Offers)
  promoItems.forEach((item: any) => {
    if (matchMediaUrl(item.image_url, record)) {
      const isTrending = item.section === 'trending';
      const isExclusive = item.section === 'exclusive_offers';
      usages.push({
        category: 'homepage',
        subCategory: isTrending
          ? 'Trending Games'
          : isExclusive
          ? 'Exclusive Offers'
          : 'Homepage Promo',
        table: 'promotional_items',
        recordId: item.id,
        recordName: `${item.title || 'Promo Card'} (${isTrending ? 'Trending' : isExclusive ? 'Exclusive Offers' : 'Promo'})`,
        field: 'image_url',
        adminLink: isTrending
          ? `/pages/homepage/trending-games/${item.id}`
          : isExclusive
          ? `/pages/homepage/exclusive-offers/${item.id}`
          : '/pages/homepage',
      });
    }
  });

  // 3. Games Catalog
  games.forEach((game: any) => {
    if (matchMediaUrl(game.image_url, record)) {
      usages.push({
        category: 'games',
        subCategory: 'Game Card',
        table: 'games',
        recordId: game.id,
        recordName: `${game.name} (Game Card)`,
        field: 'image_url',
        adminLink: `/products/games/${game.id}`,
      });
    }
    if (matchMediaUrl(game.banner_url, record)) {
      usages.push({
        category: 'games',
        subCategory: 'Game Banner',
        table: 'games',
        recordId: game.id,
        recordName: `${game.name} (Banner)`,
        field: 'banner_url',
        adminLink: `/products/games/${game.id}`,
      });
    }
  });

  // 4. Products
  products.forEach((prod: any) => {
    if (matchMediaUrl(prod.image_url, record)) {
      usages.push({
        category: 'products',
        subCategory: 'Product Package',
        table: 'products',
        recordId: prod.id,
        recordName: `${prod.name} (Product Sku)`,
        field: 'image_url',
        adminLink: prod.game_id ? `/products/games/${prod.game_id}` : '/products',
      });
    }
  });

  // 5. Profiles
  profiles.forEach((prof: any) => {
    if (matchMediaUrl(prof.avatar_url, record)) {
      usages.push({
        category: 'profiles',
        subCategory: 'User Avatar',
        table: 'profiles',
        recordId: prof.id,
        recordName: `${prof.name || prof.email || 'User Avatar'}`,
        field: 'avatar_url',
        adminLink: `/users/${prof.id}`,
      });
    }
  });

  return usages;
}

export async function fetchAllMediaUsages(
  records: MediaRecord[], rawData?: AllRawUsages
): Promise<Record<string, MediaUsage[]>> {
  const source = rawData ?? await fetchRawUsageData();
  const placements = buildSiteGraphicPlacements(source);
  const map: Record<string, MediaUsage[]> = {};

  records.forEach((record) => {
    const existing = computeMediaUsages(record, source);
    const matched = placements.filter((placement) => matchMediaUrl(placement.url, record)).map((placement): MediaUsage => {
      const { path, column, recordId, table } = placement.source;
      const field = column === 'event_jjk_cheaper_settings' && path?.[0] === 'skins'
        ? `skins.${path[path.length - 1]}`
        : path?.reduce<string>((text, part) => text + (typeof part === 'number' ? `[${part}]` : `${text ? '.' : ''}${part}`), '') || column;
      return {
        category: placement.category, subCategory: placement.section, table,
        recordId: recordId ?? column, recordName: placement.label, field,
        adminLink: placement.adminLink, page: placement.page, section: placement.section,
        slot: placement.label, live: placement.live,
      };
    });
    const used = new Set<string>();
    map[record.id] = existing.map((usage) => {
      const index = matched.findIndex((placement) =>
        placement.table === usage.table && placement.recordId === usage.recordId && placement.field === usage.field
      );
      if (index < 0) return usage;
      used.add(`${matched[index].table}:${matched[index].recordId}:${matched[index].field}`);
      return matched[index];
    });
    for (const usage of matched) {
      const key = `${usage.table}:${usage.recordId}:${usage.field}`;
      if (!used.has(key)) map[record.id].push(usage);
      used.add(key);
    }
  });
  return map;
}

export async function scanMediaUsage(record: MediaRecord): Promise<MediaUsage[]> {
  const map = await fetchAllMediaUsages([record]);
  return map[record.id] ?? [];
}

// ============================================================
// Update all referencing records when a media URL changes
// ============================================================
export async function updateReferencingUrls(
  oldUrl: string,
  newUrl: string
): Promise<number> {
  let count = 0;

  const updateTable = async (table: string, field: string) => {
    const { error } = await supabase.rpc('replace_text_in_column', {
      p_table: table,
      p_column: field,
      p_old: oldUrl,
      p_new: newUrl,
    });
    if (!error) count++;
  };

  await Promise.all([
    updateTable('games', 'image_url'),
    updateTable('games', 'banner_url'),
    updateTable('promotional_items', 'image_url'),
    updateTable('products', 'image_url'),
    updateTable('profiles', 'avatar_url'),
  ]);

  return count;
}
