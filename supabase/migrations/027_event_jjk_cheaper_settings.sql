-- ============================================================
-- Pixie-Kat: JJK cheaper-guide event page CMS settings
-- Run AFTER 026_restore_anon_rls_helpers.sql
-- Default status is draft — not shown on the storefront.
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS event_jjk_cheaper_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.store_settings
SET event_jjk_cheaper_settings = COALESCE(
  NULLIF(event_jjk_cheaper_settings, '{}'::jsonb),
  jsonb_build_object(
    'status', 'draft',
    'slug', 'jjk-cheaper',
    'visibleSections', jsonb_build_object(
      'nav', true,
      'hero', true,
      'showcase', true,
      'story', true,
      'route', true,
      'breakdown', true,
      'faq', true,
      'cta', true
    ),
    'placement', jsonb_build_object(
      'homepage_banner', false,
      'games_page', false,
      'navbar', false,
      'direct_url_only', true
    )
  )
)
WHERE id = TRUE;
