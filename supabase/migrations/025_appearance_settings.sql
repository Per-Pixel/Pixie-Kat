-- ============================================================
-- Pixie-Kat: Storefront appearance / branding settings
-- Run AFTER 024_products_page_settings.sql
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS appearance_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.store_settings
SET appearance_settings = COALESCE(
  NULLIF(appearance_settings, '{}'::jsonb),
  jsonb_build_object(
    'favicon_url', '',
    'icon_url', '',
    'logo_url', '/img/logo.png',
    'header_brand_text', 'PixieKat',
    'tab_title_active', 'PixieKat',
    'tab_title_inactive', 'Come back to PixieKat!',
    'music_url', '/audio/loop.mp3',
    'music_playback_rate', 1,
    'music_volume', 0.5
  )
)
WHERE id = TRUE;
