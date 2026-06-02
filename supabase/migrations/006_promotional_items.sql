-- ============================================================
-- Pixie-Kat: Promotional Items (Homepage Sections)
-- Run AFTER 005_games_products.sql
--
-- Powers:
--   • Trending Games  (homepage carousel)
--   • Exclusive Offers (homepage grid)
--
-- The All-Games grid is already powered by the `games` table
-- (active games ordered by sort_order).
-- ============================================================

-- ============================================================
-- ENUM: promo_section
-- ============================================================
CREATE TYPE promo_section AS ENUM ('trending', 'exclusive_offers');

-- ============================================================
-- TABLE: promotional_items
-- One row per card in a homepage section.
-- Trending-specific fields (rating, price, compare_price,
-- discount_pct) are nullable — they are ignored for
-- exclusive_offers rows.
-- ============================================================
CREATE TABLE public.promotional_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section         promo_section NOT NULL,
  title           TEXT NOT NULL,
  image_url       TEXT,
  flag            TEXT,                  -- optional emoji/country code (exclusive_offers)
  link_url        TEXT,                  -- override URL; defaults to /games on frontend
  game_id         UUID REFERENCES public.games(id) ON DELETE SET NULL,
  -- trending-specific
  rating          SMALLINT CHECK (rating BETWEEN 0 AND 100),
  price           NUMERIC(14, 2),
  compare_price   NUMERIC(14, 2),
  discount_pct    SMALLINT CHECK (discount_pct BETWEEN 0 AND 100),
  currency        TEXT NOT NULL DEFAULT 'INR',
  -- visibility
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_section        ON public.promotional_items(section);
CREATE INDEX idx_promo_section_active ON public.promotional_items(section, is_active);
CREATE INDEX idx_promo_sort           ON public.promotional_items(section, sort_order);

-- ============================================================
-- updated_at trigger
-- ============================================================
DROP TRIGGER IF EXISTS set_promo_items_updated_at ON public.promotional_items;
CREATE TRIGGER set_promo_items_updated_at
  BEFORE UPDATE ON public.promotional_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.promotional_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo: public reads active"
  ON public.promotional_items FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "promo: admin reads all"
  ON public.promotional_items FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "promo: admin inserts"
  ON public.promotional_items FOR INSERT
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "promo: admin updates"
  ON public.promotional_items FOR UPDATE
  USING (public.is_admin_or_support());

CREATE POLICY "promo: admin deletes"
  ON public.promotional_items FOR DELETE
  USING (public.is_admin_or_support());

-- ============================================================
-- SEED: Trending Games (mirrors TrendingGames.jsx static data)
-- ============================================================
INSERT INTO public.promotional_items
  (section, title, image_url, rating, price, compare_price, discount_pct, currency, sort_order)
VALUES
  ('trending', 'Black Myth Wukong',  '/img/games/black-myth-wukong.jpg',  81,  51, 69, 15, 'INR', 1),
  ('trending', 'Alan Wake 2',        '/img/games/mobile-legends.webp',     86,  32, 49, 20, 'INR', 2),
  ('trending', 'Mortal Combat 11',   '/img/games/mortal-kombat-11.jpg',    72,  54, 62, 20, 'INR', 3),
  ('trending', 'Spider-Man 2',       '/img/games/spider-man-2.jpg',        87,  35, 59, 30, 'INR', 4),
  ('trending', 'The Witcher 3',      '/img/games/witcher-3.jpg',           93,  32, 49, 20, 'INR', 5),
  ('trending', 'Honor of Kings',     '/img/games/honor-of-kings.jpg',      89,  28, 44, 35, 'INR', 6);

-- ============================================================
-- SEED: Exclusive Offers (mirrors ExclusiveOffers.jsx static data)
-- ============================================================
INSERT INTO public.promotional_items
  (section, title, image_url, flag, sort_order)
VALUES
  ('exclusive_offers', 'Mobile Legend Bang Bang',       '/img/hero/game-mlbb-card.webp',      NULL,  1),
  ('exclusive_offers', 'PUBG Mobile Top Up',            '/img/hero/game-pubg-card.webp',       NULL,  2),
  ('exclusive_offers', 'Genshin Impact Genesis Crystals','/img/hero/game-genshin-card.webp',   '🇮🇳', 3),
  ('exclusive_offers', 'Honor of Kings Tokens',         '/img/games/honor-of-kings.jpg',       NULL,  4),
  ('exclusive_offers', 'Mobile Legends Diamonds',       '/img/games/mobile-legends.webp',      NULL,  5),
  ('exclusive_offers', 'MLBB Leomord Special Pack',     '/img/promotion/leomord.webp',         NULL,  6),
  ('exclusive_offers', 'Magic Chess: Go Go Bundle',     '/img/promotion/eternal.webp',         NULL,  7),
  ('exclusive_offers', 'Starlight Pass Top Up',         '/img/promotion/starlight.webp',       NULL,  8),
  ('exclusive_offers', 'Jinx Champion Bundle',          '/img/hero/Jinx.webp',                 NULL,  9),
  ('exclusive_offers', 'Faze Clan Promo Pack',          '/img/hero/Faze.webp',                 NULL, 10),
  ('exclusive_offers', 'Melissa Character Pack',        '/img/hero/melissa.webp',              NULL, 11),
  ('exclusive_offers', 'Hero Special Top Up',           '/img/hero/game-hero-card.gif',        NULL, 12);
