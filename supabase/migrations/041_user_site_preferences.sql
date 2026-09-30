-- ============================================================
-- Pixie-Kat: Account-synced site preferences
-- Run AFTER 040_notification_outbox.sql
--
-- Intro/music/reduced-motion toggles lived only in localStorage,
-- so they reset on any other browser, device, or domain. Persist
-- them on user_settings so they follow the logged-in account.
-- Existing row-level policies already let users read/update own.
-- ============================================================

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS site_preferences JSONB NOT NULL DEFAULT '{}';
