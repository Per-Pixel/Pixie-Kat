-- ============================================================
-- Pixie-Kat: Games, Dynamic Fields & Products (Top-Up Catalog)
-- Run AFTER 004_login_session_tracking.sql
--
-- Adds the catalog layer that powers dynamic, game-specific
-- top-up pages:
--   games        — one row per game/store (Mobile Legends, etc.)
--   game_fields  — admin-configurable player-identification inputs
--                  (User ID, Server ID, Email, custom fields ...)
--   products     — denominations / packages for each game
--
-- The game_fields table is the key to flexibility: each game can
-- declare any number of inputs of any type, so the frontend renders
-- the form generically without per-game code.
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE game_status   AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE game_provider AS ENUM ('manual', 'smile_one', 'other');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE game_field_type AS ENUM ('text', 'number', 'email', 'select', 'tel');

-- ============================================================
-- TABLE: games
-- One row per game / top-up store.
-- ============================================================
CREATE TABLE public.games (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL,
  subtitle           TEXT,
  description        TEXT,
  image_url          TEXT,
  banner_url         TEXT,
  category           TEXT,
  currency_label     TEXT NOT NULL DEFAULT 'Diamonds',   -- e.g. Diamonds, UC, Tokens
  provider           game_provider NOT NULL DEFAULT 'manual',
  provider_game_code TEXT,                                -- e.g. Smile.one product/game id
  status             game_status   NOT NULL DEFAULT 'draft',
  is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  how_to_steps       JSONB   NOT NULL DEFAULT '[]',       -- [{title, description}]
  instructions       TEXT,                                -- free-form note / alert block
  metadata           JSONB   NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_games_slug       ON public.games(slug);
CREATE INDEX idx_games_status     ON public.games(status);
CREATE INDEX idx_games_featured   ON public.games(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_games_sort       ON public.games(sort_order);

-- ============================================================
-- TABLE: game_fields
-- Admin-defined player-identification inputs for each game.
-- This is what makes pages dynamic: ML has User ID + Server ID,
-- another game has just User ID, another has Email, etc.
-- ============================================================
CREATE TABLE public.game_fields (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  field_key        TEXT NOT NULL,                          -- machine key e.g. user_id, server_id
  label            TEXT NOT NULL,                          -- display label e.g. "User ID"
  field_type       game_field_type NOT NULL DEFAULT 'text',
  placeholder      TEXT,
  help_text        TEXT,
  is_required      BOOLEAN NOT NULL DEFAULT TRUE,
  options          JSONB   NOT NULL DEFAULT '[]',          -- for select: [{label, value}]
  validation_regex TEXT,                                   -- optional client/server validation
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT game_fields_unique_key UNIQUE (game_id, field_key)
);

CREATE INDEX idx_game_fields_game_id ON public.game_fields(game_id);
CREATE INDEX idx_game_fields_sort    ON public.game_fields(game_id, sort_order);

-- ============================================================
-- TABLE: products
-- Denominations / packages for each game.
-- ============================================================
CREATE TABLE public.products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id             UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,                       -- "Diamonds 100 + 10"
  description         TEXT,
  amount              TEXT,                                -- display amount e.g. "100 Diamonds"
  price               NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
  compare_price       NUMERIC(14, 2) CHECK (compare_price >= 0),
  currency            TEXT NOT NULL DEFAULT 'INR',
  image_url           TEXT,
  sku                 TEXT,
  provider_product_id TEXT,                                -- Smile.one denomination id
  stock               INTEGER,                             -- NULL = unlimited
  is_popular          BOOLEAN NOT NULL DEFAULT FALSE,
  status              product_status NOT NULL DEFAULT 'active',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_game_id ON public.products(game_id);
CREATE INDEX idx_products_status  ON public.products(status);
CREATE INDEX idx_products_sort    ON public.products(game_id, sort_order);

-- ============================================================
-- updated_at triggers (reuse generic handle_updated_at)
-- ============================================================
DROP TRIGGER IF EXISTS set_games_updated_at ON public.games;
CREATE TRIGGER set_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_game_fields_updated_at ON public.game_fields;
CREATE TRIGGER set_game_fields_updated_at
  BEFORE UPDATE ON public.game_fields
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Public (anon + authenticated) may READ active rows only.
-- Admin/support may do everything.
-- ============================================================
ALTER TABLE public.games       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products    ENABLE ROW LEVEL SECURITY;

-- ---------- games ----------
CREATE POLICY "games: public reads active"
  ON public.games FOR SELECT
  USING (status = 'active');

CREATE POLICY "games: admin reads all"
  ON public.games FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "games: admin inserts"
  ON public.games FOR INSERT
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "games: admin updates"
  ON public.games FOR UPDATE
  USING (public.is_admin_or_support());

CREATE POLICY "games: admin deletes"
  ON public.games FOR DELETE
  USING (public.is_admin());

-- ---------- game_fields ----------
CREATE POLICY "game_fields: public reads fields of active games"
  ON public.game_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_fields.game_id AND g.status = 'active'
    )
  );

CREATE POLICY "game_fields: admin reads all"
  ON public.game_fields FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "game_fields: admin writes"
  ON public.game_fields FOR INSERT
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "game_fields: admin updates"
  ON public.game_fields FOR UPDATE
  USING (public.is_admin_or_support());

CREATE POLICY "game_fields: admin deletes"
  ON public.game_fields FOR DELETE
  USING (public.is_admin_or_support());

-- ---------- products ----------
CREATE POLICY "products: public reads active of active games"
  ON public.products FOR SELECT
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = products.game_id AND g.status = 'active'
    )
  );

CREATE POLICY "products: admin reads all"
  ON public.products FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "products: admin writes"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "products: admin updates"
  ON public.products FOR UPDATE
  USING (public.is_admin_or_support());

CREATE POLICY "products: admin deletes"
  ON public.products FOR DELETE
  USING (public.is_admin_or_support());

-- ============================================================
-- SEED: Mobile Legends (mirrors the existing hardcoded page)
-- ============================================================
DO $$
DECLARE
  v_game_id UUID;
BEGIN
  INSERT INTO public.games (slug, name, subtitle, description, image_url, category,
                            currency_label, provider, status, is_featured, sort_order, how_to_steps)
  VALUES (
    'mobile-legends',
    'Mobile Legends',
    'Mobile Legends: Bang Bang',
    'Top up Mobile Legends Diamonds instantly. Enter your User ID and Server (Zone) ID, pick a package, and pay.',
    '/img/games/mobile-legends.webp',
    'MOBA',
    'Diamonds',
    'manual',
    'active',
    TRUE,
    1,
    '[
      {"title": "Enter Your ID", "description": "Provide your User ID & Zone ID for verification."},
      {"title": "Choose the Package", "description": "Select the top-up package you want."},
      {"title": "Make Payment", "description": "Choose your preferred payment method."},
      {"title": "Confirmation", "description": "Items are added instantly after payment."}
    ]'::jsonb
  )
  RETURNING id INTO v_game_id;

  -- Dynamic fields: User ID + Zone (Server) ID
  INSERT INTO public.game_fields (game_id, field_key, label, field_type, placeholder, is_required, sort_order)
  VALUES
    (v_game_id, 'user_id', 'User ID', 'text', 'Enter User ID', TRUE, 1),
    (v_game_id, 'zone_id', 'Zone ID', 'text', 'Enter Zone ID', TRUE, 2);

  -- A few sample packages (subset of the original hardcoded list)
  INSERT INTO public.products (game_id, name, amount, price, compare_price, currency, is_popular, status, sort_order)
  VALUES
    (v_game_id, 'Diamonds 10 + 1',              '11 Diamonds',   30.00,   33.00, 'INR', FALSE, 'active', 1),
    (v_game_id, 'Diamonds 20 + 2',              '22 Diamonds',   60.00,   67.00, 'INR', FALSE, 'active', 2),
    (v_game_id, 'Double Diamonds 50 + 50',      '100 Diamonds',  89.00,   99.00, 'INR', TRUE,  'active', 3),
    (v_game_id, 'Weekly Elite Bundle',          'Weekly Pass',   89.00,  100.00, 'INR', FALSE, 'active', 4),
    (v_game_id, 'Diamonds 78 + 8',              '86 Diamonds',  137.00,  154.00, 'INR', FALSE, 'active', 5),
    (v_game_id, 'Weekly Diamonds Pass',         'Weekly Pass',  169.00,  189.00, 'INR', FALSE, 'active', 6);
END $$;
