-- ============================================================
-- Pixie-Kat: Promotions (CMS-driven promo cards + detail pages)
-- Run AFTER 006_promotional_items.sql
--
-- Powers:
--   • Homepage "Promotions" section (Promotion.jsx)
--   • /promotions index + /promotions/:slug detail pages
--
-- Adds a third promo_section ('promotions') plus rich-content
-- and scheduling columns shared by all sections.
-- ============================================================

-- ============================================================
-- ENUM: add 'promotions'
-- ============================================================
ALTER TYPE promo_section ADD VALUE IF NOT EXISTS 'promotions';

-- ============================================================
-- COLUMNS: rich content + scheduling
--   slug           — URL key for /promotions/:slug (promotions only)
--   description    — card body copy
--   details        — long-form rich text shown on the detail page
--   discount_label — badge text, e.g. '5%'
--   starts_at      — optional go-live time (NULL = immediately)
--   ends_at        — optional auto-hide time (NULL = never)
-- ============================================================
ALTER TABLE public.promotional_items
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS details TEXT,
  ADD COLUMN IF NOT EXISTS discount_label TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

ALTER TABLE public.promotional_items
  DROP CONSTRAINT IF EXISTS promo_schedule_valid;
ALTER TABLE public.promotional_items
  ADD CONSTRAINT promo_schedule_valid
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_slug_unique
  ON public.promotional_items (slug)
  WHERE section = 'promotions' AND slug IS NOT NULL;

-- ============================================================
-- RLS: public only sees rows that are active AND within schedule
-- ============================================================
DROP POLICY IF EXISTS "promo: public reads active" ON public.promotional_items;

CREATE POLICY "promo: public reads active"
  ON public.promotional_items FOR SELECT
  USING (
    is_active = TRUE
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at > NOW())
  );

-- ============================================================
-- SEED: mirror the hardcoded Promotion.jsx cards so they are
-- editable/hidable from admin instead of living in code
-- ============================================================
INSERT INTO public.promotional_items
  (section, title, slug, description, details, image_url, discount_label, sort_order)
VALUES
  (
    'promotions',
    'MLBB Festive Top-Up Rewards: Earn 5% Back',
    'mlbb-festive-topup-rewards',
    'Celebrate the season on PixieKat — top up Mobile Legends diamonds and earn 5% back with every pack.',
    '<p>How it works: buy any pack of 70 diamonds or more and the bonus lands with your order. No codes, no extra steps.</p>',
    '/img/promotion/leomord.webp',
    '5%',
    1
  ),
  (
    'promotions',
    '2x Recharge Bonus Is Back + 10% Member Rewards',
    '2x-recharge-bonus',
    'Great news, Commanders. The 2x recharge bonus in Magic Chess: Go Go has been reset.',
    '<p>Even if you claimed it before, you can claim it again — double diamonds on eligible first-recharge bundles, plus extra member rewards on top.</p>',
    '/img/promotion/eternal.webp',
    '10%',
    2
  ),
  (
    'promotions',
    'Limited Faze Offer: Bonus Rewards on Every Top Up',
    'faze-limited-offer',
    'Power up faster with bonus value and unlock more in-game rewards while the promotion lasts.',
    '<p>Top up during the active period to receive bonus credits and seasonal perks. Limited-time offer, terms and conditions apply.</p>',
    '/img/promotion/starlight.webp',
    '15%',
    3
  );
