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

export interface MediaUsage {
  table: string;
  recordId: string;
  recordName: string;
  field: string;
}

export type MediaSort =
  | 'date-desc'
  | 'date-asc'
  | 'name-asc'
  | 'name-desc'
  | 'size-desc'
  | 'size-asc';

export type ImageOutputFormat = 'image/webp' | 'image/png' | 'image/jpeg';

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
export async function scanMediaUsage(record: MediaRecord): Promise<MediaUsage[]> {
  const usages: MediaUsage[] = [];

  // Helper: find matches in a table
  const scanTable = async (
    table: string,
    fields: string[],
    nameField: string
  ): Promise<void> => {
    for (const field of fields) {
      // Use ilike for fuzzy match on URL suffix
      const { data, error } = await supabase
        .from(table)
        .select(`id, ${nameField}, ${field}`)
        .ilike(field, `%${record.storage_path}%`);

      if (error) continue;
      (data ?? []).forEach((row: any) => {
        usages.push({
          table,
          recordId: row.id,
          recordName: row[nameField] ?? '—',
          field,
        });
      });
    }
  };

  await Promise.all([
    scanTable('games', ['image_url', 'banner_url'], 'name'),
    scanTable('promotional_items', ['image_url'], 'title'),
    scanTable('products', ['image_url'], 'name'),
    scanTable('profiles', ['avatar_url'], 'name'),
  ]);

  return usages;
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
