-- ============================================================
-- Pixie-Kat: Exclusive Offers reorder
-- Run AFTER 047_promotions.sql
--
-- Homepage "Exclusive Offers" grid order:
--   Starlight first, then the MLBB cards, Honor of Kings,
--   Magic Chess, and everything else last.
-- ============================================================

UPDATE public.promotional_items AS p
SET sort_order = CASE p.title
  WHEN 'Starlight Pass Top Up'           THEN 1
  WHEN 'Mobile Legends Diamonds'         THEN 2
  WHEN 'Mobile Legends'                  THEN 3
  WHEN 'Honor of Kings Tokens'           THEN 4
  WHEN 'Magic Chess: Go Go Bundle'       THEN 5
  WHEN 'Genshin Impact Genesis Crystals' THEN 6
  WHEN 'PUBG Mobile Top Up'              THEN 7
  WHEN 'Hero Special Top Up'             THEN 8
END
WHERE p.section = 'exclusive_offers'
  AND p.title IN (
    'Starlight Pass Top Up',
    'Mobile Legends Diamonds',
    'Mobile Legends',
    'Honor of Kings Tokens',
    'Magic Chess: Go Go Bundle',
    'Genshin Impact Genesis Crystals',
    'PUBG Mobile Top Up',
    'Hero Special Top Up'
  );
