import { api } from './api';
import { uploadMedia, type MediaRecord } from './mediaService';

export interface PinterestMediaItem {
  id: string;
  pinId: string | null;
  title: string;
  kind: 'image' | 'video';
  sourceUrl: string;
  mediaUrl: string;
  fallbackUrl: string | null;
  previewUrl: string;
  filename: string;
}

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

async function readableError(error: unknown): Promise<Error> {
  const response = (error as { response?: { data?: unknown } })?.response?.data;
  if (response instanceof Blob && response.type.includes('json')) {
    try {
      const body = JSON.parse(await response.text()) as { error?: string };
      if (body.error) return new Error(body.error);
    } catch {
      return new Error('Pinterest could not be reached. Check the link and try again.');
    }
  }
  if (response && typeof response === 'object' && 'error' in response && typeof response.error === 'string') {
    return new Error(response.error);
  }
  return error instanceof Error ? error : new Error('Could not connect to Pinterest.');
}

export async function resolvePinterestLink(url: string): Promise<PinterestMediaItem[]> {
  try {
    const { data } = await api.post<{ ok: boolean; media: PinterestMediaItem[] }>('/admin/pinterest/resolve', { url: url.trim() }, { timeout: 30000 });
    if (!data.ok || !Array.isArray(data.media) || !data.media.length) throw new Error('No downloadable images or videos were found at this link.');
    return data.media;
  } catch (error) {
    throw await readableError(error);
  }
}

export async function downloadPinterestFile(item: PinterestMediaItem): Promise<File> {
  let blob: Blob;
  try {
    const response = await api.post<Blob>('/admin/pinterest/download', {
      mediaUrl: item.mediaUrl, fallbackUrl: item.fallbackUrl,
    }, { responseType: 'blob', timeout: 40000 });
    blob = response.data;
  } catch (error) {
    throw await readableError(error);
  }
  const type = blob.type.split(';')[0].toLowerCase();
  const ext = extensions[type];
  if (!ext) throw new Error('Pinterest returned an unsupported image or video.');
  const name = item.filename.replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]/gi, '-').slice(0, 100) || 'pinterest-media';
  return new File([blob], `${name}.${ext}`, { type });
}

export async function importPinterestMedia(item: PinterestMediaItem, folder = 'pinterest'): Promise<MediaRecord> {
  const file = await downloadPinterestFile(item);
  const safeFolder = folder.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 60) || 'pinterest';
  return uploadMedia(file, safeFolder, { alt_text: item.title, tags: ['pinterest', item.kind] });
}

export async function downloadPinterestZip(
  items: PinterestMediaItem[], onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (!items.length) throw new Error('Select at least one Pinterest item to download.');
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (let index = 0; index < items.length; index++) {
    const file = await downloadPinterestFile(items[index]);
    zip.file(file.name, file);
    onProgress?.(index + 1, items.length);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pinterest-media-${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
