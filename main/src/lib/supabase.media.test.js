import { describe, expect, it } from 'vitest';
import { publicMediaUrl, storagePathFromMediaValue } from './supabase';

describe('publicMediaUrl (site origin)', () => {
  it('serves img/audio/video paths from the storefront origin', () => {
    expect(publicMediaUrl('/img/logo.png')).toBe('/img/logo.png');
    expect(publicMediaUrl('videos/hero-1.mp4')).toBe('/videos/hero-1.mp4');
  });

  it('rewrites legacy Supabase object URLs to the same origin path', () => {
    const legacy =
      'https://example.supabase.co/storage/v1/object/public/public-media/img%2Fhero%2Fcard.webp';
    expect(publicMediaUrl(legacy)).toBe('/img/hero/card.webp');
  });

  it('leaves non-storage absolute URLs unchanged', () => {
    expect(publicMediaUrl('https://cdn.example/game.png')).toBe('https://cdn.example/game.png');
  });

  it('extracts storage paths from CMS values', () => {
    expect(storagePathFromMediaValue('/img/games/ml.webp')).toBe('img/games/ml.webp');
    expect(
      storagePathFromMediaValue(
        'https://x.supabase.co/storage/v1/object/public/public-media/audio/loop.mp3',
      ),
    ).toBe('audio/loop.mp3');
  });
});
