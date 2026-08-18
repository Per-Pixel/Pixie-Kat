import { supabase } from '../lib/supabase';

const BUCKET = 'media';
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
  return str
    .trim()
    .replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/public\/[^\/]+\//, '')
    .replace(/^\/+/, '')
    .toLowerCase();
}

export function matchMediaUrl(candidate?: string | null, record?: MediaRecord | null): boolean {
  if (!candidate || !record) return false;
  const rawCand = candidate.trim().toLowerCase();
  const rawUrl = (record.public_url || '').trim().toLowerCase();
  const rawPath = (record.storage_path || '').trim().toLowerCase();
  const rawName = (record.filename || '').trim().toLowerCase();

  if (rawCand === rawUrl || rawCand === rawPath || rawCand === rawName) return true;

  const normCand = normalizePath(rawCand);
  const normPath = normalizePath(rawPath);
  const normUrl = normalizePath(rawUrl);

  if (normCand && (normCand === normPath || normCand === normUrl)) return true;
  if (normPath && normCand.endsWith(normPath)) return true;
  if (rawName && (rawCand.endsWith('/' + rawName) || rawCand === rawName)) return true;

  return false;
}

function getPublicUrl(path: string): string {
  const clean = path.replace(/^media\//, '');
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${clean}`;
}

// ============================================================
// Sync: list objects in the bucket and create missing DB rows
// ============================================================
export async function syncBucketToTable(): Promise<{ created: number; skipped: number }> {
  const { data: objects, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 1000 });
  if (listErr) throw listErr;

  let created = 0;
  let skipped = 0;

  for (const obj of objects ?? []) {
    if (!obj.name) continue;

    const path = obj.name;
    const { data: existing } = await supabase
      .from('media')
      .select('id')
      .eq('storage_path', path)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    const publicUrl = getPublicUrl(path);
    const { error } = await supabase.from('media').insert({
      filename: obj.name,
      storage_path: path,
      bucket: BUCKET,
      mime_type: obj.metadata?.mimetype ?? null,
      size_bytes: obj.metadata?.size ?? null,
      public_url: publicUrl,
    });

    if (!error) created++;
  }

  return { created, skipped };
}

// ============================================================
// List
// ============================================================
export async function listMedia(options?: {
  search?: string;
  mimeType?: string;
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
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as MediaRecord[], count: count ?? 0 };
}

// ============================================================
// Upload
// ============================================================
export async function uploadMedia(
  file: File,
  folder: string = '',
  meta?: { alt_text?: string; tags?: string[] }
): Promise<MediaRecord> {
  const ext = file.name.split('.').pop() ?? '';
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  const timestamp = Date.now();
  const path = folder ? `${folder}/${base}_${timestamp}.${ext}` : `${base}_${timestamp}.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) throw upErr;

  const publicUrl = getPublicUrl(path);

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
      bucket: BUCKET,
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
  return data as MediaRecord;
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
  const { error: storErr } = await supabase.storage.from(BUCKET).remove([record.storage_path]);
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
  let newPath = record.storage_path;

  if (renameStorageObject) {
    const ext = record.storage_path.split('.').pop() ?? '';
    const folder = record.storage_path.includes('/')
      ? record.storage_path.split('/').slice(0, -1).join('/')
      : '';
    const cleanName = newFilename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    newPath = folder ? `${folder}/${cleanName}.${ext}` : `${cleanName}.${ext}`;

    const { error: moveErr } = await supabase.storage
      .from(BUCKET)
      .move(record.storage_path, newPath);
    if (moveErr) throw moveErr;
  }

  const { data, error } = await supabase
    .from('media')
    .update({
      filename: newFilename,
      storage_path: newPath,
      public_url: getPublicUrl(newPath),
    })
    .eq('id', record.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as MediaRecord;
}

// ============================================================
// Replace file (keep DB row, swap bytes + update metadata)
// ============================================================
export async function replaceMedia(
  record: MediaRecord,
  file: File
): Promise<MediaRecord> {
  // Overwrite existing storage path
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(record.storage_path, file, {
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
      public_url: getPublicUrl(record.storage_path),
    })
    .eq('id', record.id)
    .select('*')
    .single();

  if (error) throw error;
  return data as MediaRecord;
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
  const { data, error } = await supabase.storage.from(BUCKET).download(record.storage_path);
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

export async function fetchRawUsageData(): Promise<AllRawUsages> {
  const [settingsRes, gamesRes, productsRes, promoRes, profilesRes] = await Promise.all([
    supabase.from('store_settings').select('*').maybeSingle(),
    supabase.from('games').select('id, name, slug, image_url, banner_url'),
    supabase.from('products').select('id, name, game_id, image_url'),
    supabase.from('promotional_items').select('id, title, section, image_url, link_url'),
    supabase.from('profiles').select('id, name, email, avatar_url').not('avatar_url', 'is', null),
  ]);

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

export async function fetchAllMediaUsages(records: MediaRecord[]): Promise<Record<string, MediaUsage[]>> {
  try {
    const rawData = await fetchRawUsageData();
    const map: Record<string, MediaUsage[]> = {};

    records.forEach((record) => {
      map[record.id] = computeMediaUsages(record, rawData);
    });

    return map;
  } catch (err) {
    console.error('Failed to index media usages:', err);
    return {};
  }
}

export async function scanMediaUsage(record: MediaRecord): Promise<MediaUsage[]> {
  const rawData = await fetchRawUsageData();
  return computeMediaUsages(record, rawData);
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

// ============================================================
// Default export — adapter for MediaLibrary page
// ============================================================
function extractFolder(storagePath: string): string | undefined {
  if (!storagePath.includes('/')) return undefined;
  return storagePath.split('/').slice(0, -1).join('/') || undefined;
}

function recordToAsset(r: MediaRecord) {
  return {
    id: r.id,
    filename: r.filename,
    originalFilename: r.filename,
    url: r.public_url,
    mimeType: r.mime_type ?? 'application/octet-stream',
    size: r.size_bytes ?? 0,
    width: r.width ?? undefined,
    height: r.height ?? undefined,
    alt: r.alt_text ?? undefined,
    uploadedBy: r.uploaded_by ?? '',
    uploadedAt: r.created_at ?? '',
    folder: extractFolder(r.storage_path),
    tags: r.tags ?? [],
  };
}

const mediaService = {
  async getMedia(opts?: { folder?: string; search?: string }) {
    const { data } = await listMedia({ search: opts?.search });
    const assets = data.map(recordToAsset);
    if (opts?.folder) {
      return { assets: assets.filter((a) => a.folder === opts.folder) };
    }
    return { assets };
  },

  async getFolders(): Promise<string[]> {
    const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
    if (error) throw error;
    return (data ?? [])
      .filter((item) => item.name && !item.id)
      .map((item) => item.name);
  },

  async uploadMedia(opts: { file: File; folder?: string }) {
    return uploadMedia(opts.file, opts.folder ?? '');
  },

  async uploadMultiple(files: File[], folder?: string) {
    const results = await Promise.allSettled(
      files.map((f) => uploadMedia(f, folder ?? ''))
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length && !succeeded.length) {
      throw (failed[0] as PromiseRejectedResult).reason;
    }
    return succeeded.map((r) => (r as PromiseFulfilledResult<MediaRecord>).value);
  },

  async deleteMedia(id: string) {
    const { data, error } = await supabase.from('media').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return; // already gone
      throw error;
    }
    return deleteMedia(data as MediaRecord);
  },

  async bulkDelete(ids: string[]) {
    const { data, error } = await supabase.from('media').select('*').in('id', ids);
    if (error) throw error;
    const results = await Promise.allSettled(
      (data as MediaRecord[]).map((r) => deleteMedia(r))
    );
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      console.warn(`[mediaService] bulkDelete: ${failed.length}/${ids.length} deletions failed`);
    }
  },
};

export default mediaService;
