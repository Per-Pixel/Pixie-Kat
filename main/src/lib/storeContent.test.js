import { describe, expect, it } from 'vitest';
import { publicMediaUrl } from './supabase';
import { mergeAppearanceSettings, siteGraphicUrl } from './storeContent';

const fallback = '/img/contact-1.webp';
const resolvedFallback = publicMediaUrl(fallback);

describe('siteGraphicUrl', () => {
  it('uses the shipped graphic until an admin sets a replacement', () => {
    expect(siteGraphicUrl({}, 'contact_left_top', fallback)).toBe(resolvedFallback);
    expect(siteGraphicUrl(mergeAppearanceSettings({ site_graphics: {} }), 'contact_left_top', fallback)).toBe(resolvedFallback);
  });

  it('uses just the overridden slot and leaves other locations alone', () => {
    const appearance = mergeAppearanceSettings({ site_graphics: { contact_left_top: 'https://assets.example/new.webp' } });
    expect(siteGraphicUrl(appearance, 'contact_left_top', fallback)).toBe('https://assets.example/new.webp');
    expect(siteGraphicUrl(appearance, 'contact_left_bottom', '/img/contact-2.webp')).toBe(publicMediaUrl('/img/contact-2.webp'));
  });

  it('ignores empty or malformed overrides', () => {
    expect(siteGraphicUrl({ site_graphics: { contact_left_top: '' } }, 'contact_left_top', fallback)).toBe(resolvedFallback);
    expect(siteGraphicUrl({ site_graphics: { contact_left_top: 12 } }, 'contact_left_top', fallback)).toBe(resolvedFallback);
  });
});
