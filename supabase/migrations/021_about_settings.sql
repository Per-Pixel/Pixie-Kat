-- ============================================================
-- Pixie-Kat: About Section Settings
-- Run AFTER 020_fix_linter_indexes.sql
--
-- Adds about_settings JSONB to store_settings so the admin
-- can control homepage About section text, image, and styles.
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS about_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
