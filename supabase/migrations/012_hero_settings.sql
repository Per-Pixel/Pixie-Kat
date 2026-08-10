-- ============================================================
-- Pixie-Kat: Hero Section Settings
-- Run AFTER 011_wallet_order_rpc.sql
--
-- Adds hero_settings JSONB to store_settings so the admin
-- can control homepage hero images, transforms, and text.
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS hero_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Seed with the existing default values so first load has data
UPDATE public.store_settings
SET hero_settings = '{
  "heading": "PixieKat",
  "subheading": "Instant Gaming Credits",
  "tagline": "Fast, Secure, Affordable",
  "button_text": "Topup Now",
  "button_link": "/games",
  "background_video": "videos/hero-1.mp4",
  "images": {
    "jinx": {
      "url": "/img/hero/Jinx.webp",
      "show_on_phone": false,
      "desktop": { "scale": 120, "rotate": 0, "x": 0, "y": 0, "pos_left": "43%", "pos_top": "60%" },
      "tablet":  { "scale": 100, "rotate": 0, "x": 0, "y": 0, "pos_left": "30%", "pos_top": "69%" },
      "mobile":  { "scale": 80,  "rotate": 0, "x": 0, "y": 0, "pos_left": "30%", "pos_top": "69%" }
    },
    "faze": {
      "url": "/img/hero/Faze.webp",
      "show_on_phone": true,
      "desktop": { "scale": 150, "rotate": 0, "x": 0, "y": 0, "pos_left": "50%", "pos_top": "70%" },
      "tablet":  { "scale": 130, "rotate": 0, "x": 0, "y": 0, "pos_left": "50%", "pos_top": "70%" },
      "mobile":  { "scale": 110, "rotate": 0, "x": 0, "y": 0, "pos_left": "50%", "pos_top": "70%" }
    },
    "melissa": {
      "url": "/img/hero/melissa.webp",
      "show_on_phone": false,
      "desktop": { "scale": 150, "rotate": 0, "x": 0, "y": 0, "pos_left": "59%", "pos_top": "65%" },
      "tablet":  { "scale": 120, "rotate": 0, "x": 0, "y": 0, "pos_left": "70%", "pos_top": "69%" },
      "mobile":  { "scale": 100, "rotate": 0, "x": 0, "y": 0, "pos_left": "70%", "pos_top": "69%" }
    }
  }
}'::jsonb
WHERE NOT (hero_settings @> '{"heading": "PixieKat"}'::jsonb);
