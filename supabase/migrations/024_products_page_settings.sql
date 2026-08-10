-- ============================================================
-- Pixie-Kat: Products / Games page CMS settings
-- Run AFTER 023_about_page_settings.sql
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS products_page_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.store_settings
SET products_page_settings = COALESCE(
  NULLIF(products_page_settings, '{}'::jsonb),
  jsonb_build_object(
    'slides', jsonb_build_array(
      jsonb_build_object(
        'id', 1,
        'title', 'PIXIEKAT STORE',
        'subtitle', 'Official Gaming Platform',
        'description', 'PIXIEKAT STORE is a practical solution for every game lover to buy game vouchers without having to go to a physical store.',
        'cta', 'WWW.PIXIEKATSTORE.COM',
        'bgGradient', 'from-blue-700 via-violet-700 to-indigo-900',
        'image', '/img/hero/game-hero-card.gif'
      ),
      jsonb_build_object(
        'id', 2,
        'title', 'MOBILE LEGENDS',
        'subtitle', 'Top Up Diamonds',
        'description', 'Get instant diamonds for Mobile Legends. Fast, secure, and reliable top-up service with 24/7 support.',
        'cta', 'TOP UP NOW',
        'bgGradient', 'from-indigo-700 via-fuchsia-700 to-violet-900',
        'image', '/img/hero/game-mlbb-card.webp'
      ),
      jsonb_build_object(
        'id', 3,
        'title', 'PUBG GLOBAL',
        'subtitle', 'UC Coins Available',
        'description', 'Purchase UC coins for PUBG Mobile Global. Instant delivery and competitive prices guaranteed.',
        'cta', 'BUY UC COINS',
        'bgGradient', 'from-orange-600 via-rose-700 to-red-900',
        'image', '/img/hero/game-pubg-card.webp'
      ),
      jsonb_build_object(
        'id', 4,
        'title', 'GENSHIN IMPACT',
        'subtitle', 'Genesis Crystals',
        'description', 'Top up Genesis Crystals for Genshin Impact. Safe transactions with instant delivery to your account.',
        'cta', 'GET CRYSTALS',
        'bgGradient', 'from-cyan-700 via-sky-700 to-indigo-900',
        'image', '/img/hero/game-genshin-card.webp'
      )
    )
  )
)
WHERE id = TRUE;
