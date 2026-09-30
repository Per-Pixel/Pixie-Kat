import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { uploadMedia } from './mediaService';
import { downloadPinterestFile, importPinterestMedia, resolvePinterestLink, type PinterestMediaItem } from './pinterestService';

vi.mock('./api', () => ({ api: { post: vi.fn() } }));
vi.mock('./mediaService', () => ({ uploadMedia: vi.fn() }));

const image: PinterestMediaItem = {
  id: '123', pinId: '123456789', kind: 'image', title: 'Pin artwork',
  sourceUrl: 'https://www.pinterest.com/pin/123456789/',
  mediaUrl: 'https://i.pinimg.com/originals/aa/bb/example.jpg',
  fallbackUrl: 'https://i.pinimg.com/736x/aa/bb/example.jpg',
  previewUrl: 'https://i.pinimg.com/736x/aa/bb/example.jpg',
  filename: 'pinterest-123456789-pin-artwork.jpg',
};

beforeEach(() => vi.clearAllMocks());

describe('Pinterest admin import', () => {
  it('resolves a pin using the authenticated admin API instead of a public proxy', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { ok: true, media: [image] } });
    const media = await resolvePinterestLink(image.sourceUrl);
    expect(media).toEqual([image]);
    expect(api.post).toHaveBeenCalledWith('/admin/pinterest/resolve', { url: image.sourceUrl }, expect.any(Object));
  });

  it('downloads bytes through the admin API and uses their verified MIME type', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: new Blob(['real jpeg bytes'], { type: 'image/jpeg' }) });
    const file = await downloadPinterestFile({ ...image, filename: 'wrong-extension.gif' });
    expect(api.post).toHaveBeenCalledWith('/admin/pinterest/download', {
      mediaUrl: image.mediaUrl, fallbackUrl: image.fallbackUrl,
    }, expect.objectContaining({ responseType: 'blob' }));
    expect(file.name).toBe('wrong-extension.jpg');
    expect(file.type).toBe('image/jpeg');
  });

  it('imports the downloaded image into public media with its source metadata', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: new Blob(['image'], { type: 'image/png' }) });
    vi.mocked(uploadMedia).mockResolvedValue({ id: 'file-1', public_url: 'https://assets.example/file.png' } as never);
    const record = await importPinterestMedia(image, 'homepage-hero');
    expect(record.id).toBe('file-1');
    expect(uploadMedia).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/png' }), 'homepage-hero', {
      alt_text: 'Pin artwork', tags: ['pinterest', 'image'],
    });
  });

  it('rejects an unsupported response rather than storing a Pinterest HTML page', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: new Blob(['login'], { type: 'text/html' }) });
    await expect(downloadPinterestFile(image)).rejects.toThrow(/unsupported/i);
    expect(uploadMedia).not.toHaveBeenCalled();
  });
});
