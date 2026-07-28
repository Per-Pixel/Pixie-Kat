-- ============================================================
-- Pixie-Kat: About Page Settings
-- Run AFTER 022_cms_page_settings.sql
--
-- Adds about_page_settings JSONB to store_settings for the
-- client /about page editor (separate from homepage about_settings).
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS about_page_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
