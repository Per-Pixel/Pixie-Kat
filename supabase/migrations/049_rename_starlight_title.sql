-- ============================================================
-- Pixie-Kat: Rename Starlight game title
-- Run AFTER 048_exclusive_offers_order.sql
--
-- Drop the "– Kitsune's Shadow" suffix from the storefront game
-- name (slug 'starlight'). Subtitle and description unchanged —
-- the skin itself is still described as Kitsune's Shadow.
-- ============================================================

UPDATE public.games
SET name = 'Hayabusa Starlight'
WHERE slug = 'starlight'
  AND name = 'Hayabusa Starlight – Kitsune''s Shadow';
