-- ============================================================
-- Pixie-Kat: Provider Hub — Region + Cost Price
-- Run AFTER 008_admin_operations.sql
--
-- 1. games.region        — distinguishes MLBB PH vs MLBB Global etc.
-- 2. products.cost_price — stores provider wholesale cost for margin tracking
-- ============================================================

-- Add region to games (nullable — not all games are region-specific)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS region TEXT DEFAULT NULL;

COMMENT ON COLUMN public.games.region IS
  'Provider region code, e.g. ph, id, my, sg, br, global. NULL = not region-specific.';

CREATE INDEX IF NOT EXISTS idx_games_region
  ON public.games(region) WHERE region IS NOT NULL;

-- Add cost_price to products (nullable — only set when imported from a provider)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(14, 2) DEFAULT NULL
  CHECK (cost_price IS NULL OR cost_price >= 0);

COMMENT ON COLUMN public.products.cost_price IS
  'Wholesale cost from provider (e.g. Smile One cost_price). Used for margin analytics.';
