import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import {
  buildSiteGraphicPlacements,
  fetchAllMediaUsages,
  matchMediaUrl,
  saveGraphicPlacement,
  type AllRawUsages,
  type MediaRecord,
} from './mediaService';

vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn() } }));

const heroFile: MediaRecord = {
  id: 'file-1',
  filename: 'Jinx.webp',
  storage_path: 'img/hero/Jinx.webp',
  bucket: 'public-media',
  mime_type: 'image/webp',
  public_url: 'https://assets.example/storage/v1/object/public/public-media/img/hero/Jinx.webp',
};

const raw: AllRawUsages = {
  settings: {
    hero_settings: { heading: 'Welcome', images: { jinx: { url: '/img/hero/Jinx.webp', desktop: { scale: 120 } } } },
    appearance_settings: { site_graphics: { promotion_frame: '/img/custom-frame.webp' } },
  },
  games: [{ id: 'game-1', name: 'MLBB', status: 'active', image_url: '/img/games/mlbb.webp', banner_url: null }],
  products: [{ id: 'pack-1', name: 'Starter pack', game_id: 'game-1', status: 'active', image_url: '/img/packs/starter.webp' }],
  promoItems: [{ id: 'promo-1', title: 'New cards', section: 'trending', is_active: true, image_url: '/img/promo.webp' }],
  profiles: [],
};

beforeEach(() => vi.clearAllMocks());

describe('website graphic placements', () => {
  it('maps effective graphics to a precise section and slot even without a media row', () => {
    const placements = buildSiteGraphicPlacements(raw);
    expect(placements.find((item) => item.id === 'hero-jinx')).toMatchObject({
      page: 'Homepage', section: 'Hero', label: 'Left character', url: '/img/hero/Jinx.webp', live: true,
      source: { column: 'hero_settings', path: ['images', 'jinx', 'url'] },
    });
    expect(placements.find((item) => item.id === 'home-promotion-frame')).toMatchObject({
      page: 'Homepage', section: 'Promotions', url: '/img/custom-frame.webp',
    });
    expect(placements.find((item) => item.id === 'game-game-1-card')).toMatchObject({
      page: 'Games', section: 'Game cards', label: 'MLBB', live: true,
    });
    expect(placements.find((item) => item.id === 'product-pack-1')).toMatchObject({
      page: 'Games', label: 'Starter pack', live: true,
    });
    expect(placements.find((item) => item.id === 'promo-promo-1')).toMatchObject({
      page: 'Homepage', section: 'Trending games', label: 'New cards', live: true,
    });
    expect(placements.some((item) => item.id === 'home-fallback-trending-1')).toBe(false);
  });

  it('includes storefront fallbacks when content settings or live promos have not been saved', () => {
    const placements = buildSiteGraphicPlacements({
      settings: {}, games: [], products: [], promoItems: [], profiles: [],
    });
    expect(placements.find((item) => item.id === 'about-image')?.url).toBe('/img/about.webp');
    expect(placements.filter((item) => item.section === 'Games carousel')).toHaveLength(4);
    expect(placements.find((item) => item.id === 'home-fallback-trending-1')?.label).toBe('Black Myth Wukong');
    expect(placements.find((item) => item.id === 'home-fallback-exclusive-1')?.label).toBe('Mobile Legend Bang Bang');
  });

  it('distinguishes a matching bucket path from another image with the same filename', () => {
    expect(matchMediaUrl('/img/hero/Jinx.webp', heroFile)).toBe(true);
    expect(matchMediaUrl(`${heroFile.public_url}?v=2`, heroFile)).toBe(true);
    expect(matchMediaUrl('https://other.example/another/Jinx.webp', heroFile)).toBe(false);
    expect(matchMediaUrl('/img/promotions/Jinx.webp', heroFile)).toBe(false);
  });

  it('reports the exact placement for a bundled image after media is indexed', async () => {
    const usages = await fetchAllMediaUsages([heroFile], raw);
    expect(usages['file-1']).toEqual(expect.arrayContaining([
      expect.objectContaining({ page: 'Homepage', section: 'Hero', slot: 'Left character' }),
    ]));
  });
});

describe('saving one graphic placement', () => {
  it('preserves unrelated JSON settings and uses an optimistic update guard', async () => {
    const placement = buildSiteGraphicPlacements(raw).find((item) => item.id === 'hero-jinx')!;
    const read = vi.fn().mockResolvedValue({ data: { hero_settings: raw.settings.hero_settings, updated_at: '2026-09-26T00:00:00Z' }, error: null });
    const updateResult = vi.fn().mockResolvedValue({ data: { id: true }, error: null });
    const updateQuery = { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnValue({ maybeSingle: updateResult }) };
    const update = vi.fn().mockReturnValue(updateQuery);
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ maybeSingle: read }), update } as never);

    await saveGraphicPlacement(placement, 'https://assets.example/new-character.webp');

    expect(update).toHaveBeenCalledWith({
      hero_settings: {
        heading: 'Welcome',
        images: { jinx: { url: 'https://assets.example/new-character.webp', desktop: { scale: 120 } } },
      },
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('updated_at', '2026-09-26T00:00:00Z');
  });

  it('rejects an outdated placement instead of overwriting another editor', async () => {
    const placement = buildSiteGraphicPlacements(raw).find((item) => item.id === 'hero-jinx')!;
    const update = vi.fn();
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({ maybeSingle: async () => ({ data: { hero_settings: { images: { jinx: { url: '/img/changed.webp' } } } }, error: null }) }),
      update,
    } as never);

    await expect(saveGraphicPlacement(placement, 'https://assets.example/new.webp')).rejects.toThrow(/changed/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('hydrates the complete carousel defaults before changing one unsaved slide', async () => {
    const placements = buildSiteGraphicPlacements({ settings: {}, games: [], products: [], promoItems: [], profiles: [] });
    const placement = placements.find((item) => item.id === 'games-slide-1')!;
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: () => ({ maybeSingle: async () => ({ data: { id: true }, error: null }) }),
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({ maybeSingle: async () => ({ data: { products_page_settings: {}, updated_at: '2026-09-26T00:00:00Z' }, error: null }) }),
      update,
    } as never);

    await saveGraphicPlacement(placement, 'https://assets.example/slide.webp');

    const saved = update.mock.calls[0][0].products_page_settings.slides;
    expect(saved).toHaveLength(4);
    expect(saved[0]).toMatchObject({ id: 1, title: 'PIXIEKAT', image: 'https://assets.example/slide.webp' });
    expect(saved[1]).toMatchObject({ id: 2, title: 'MOBILE LEGENDS', image: '/img/hero/game-mlbb-card.webp' });
  });
});
