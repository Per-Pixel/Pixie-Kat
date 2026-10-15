-- ============================================================
-- Pixie-Kat: Exclusive Offers content fix
-- Run AFTER 050_kazutora_games.sql
--
-- Repairs the homepage "Exclusive Offers" grid:
--   * duplicate MLBB cards (same art, one with a dead /games/<uuid> link)
--   * wrong artwork on Magic Chess / PUBG / Hero Special cards
--   * missing link_url on half the grid (fell back to /games)
--   * 🇮🇳 flag emoji renders as bare "IN" text on Windows
-- Every card now maps to a real game page with real art.
-- ============================================================

UPDATE public.promotional_items
SET title     = 'Hayabusa Starlight Pass',
    image_url = 'img/games/starlight.jpg',
    link_url  = '/games/starlight',
    game_id   = (SELECT id FROM public.games WHERE slug = 'starlight'),
    flag      = NULL
WHERE section = 'exclusive_offers' AND title = 'Starlight Pass Top Up';

UPDATE public.promotional_items
SET image_url = 'img/games/mobile-legends.webp',
    link_url  = '/games/mobile-legends',
    game_id   = (SELECT id FROM public.games WHERE slug = 'mobile-legends'),
    flag      = NULL
WHERE section = 'exclusive_offers' AND title = 'Mobile Legends Diamonds';

-- Duplicate "Mobile Legends" card -> Honkai: Star Rail
UPDATE public.promotional_items
SET title     = 'Honkai: Star Rail Top Up',
    image_url = 'img/games/honkai-star-rail.webp',
    link_url  = '/games/honkai-star-rail',
    game_id   = (SELECT id FROM public.games WHERE slug = 'honkai-star-rail'),
    flag      = NULL
WHERE section = 'exclusive_offers' AND title = 'Mobile Legends';

UPDATE public.promotional_items
SET flag = NULL
WHERE section = 'exclusive_offers' AND title = 'Honor of Kings Tokens';

UPDATE public.promotional_items
SET image_url = 'img/games/magic-chess-go-go.jpg',
    link_url  = '/games/magic-chess-go-go',
    game_id   = (SELECT id FROM public.games WHERE slug = 'magic-chess-go-go'),
    flag      = NULL
WHERE section = 'exclusive_offers' AND title = 'Magic Chess: Go Go Bundle';

UPDATE public.promotional_items
SET flag = NULL
WHERE section = 'exclusive_offers' AND title = 'Genshin Impact Genesis Crystals';

UPDATE public.promotional_items
SET image_url = 'img/games/pubg-global.jpg',
    link_url  = '/games/pubg-global',
    game_id   = (SELECT id FROM public.games WHERE slug = 'pubg-global'),
    flag      = NULL
WHERE section = 'exclusive_offers' AND title = 'PUBG Mobile Top Up';

-- "Hero Special Top Up" (no real product) -> BGMI UC
UPDATE public.promotional_items
SET title     = 'BGMI UC Top Up',
    image_url = 'img/games/bgmi-not-instant.webp',
    link_url  = '/games/bgmi',
    game_id   = (SELECT id FROM public.games WHERE slug = 'bgmi'),
    flag      = NULL
WHERE section = 'exclusive_offers' AND title = 'Hero Special Top Up';
