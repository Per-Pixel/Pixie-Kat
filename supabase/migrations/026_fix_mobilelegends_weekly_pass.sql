-- Backfill expected_provider_price for the Mobile Legends (Brazil) Weekly Pass
-- product so mismatch detection can detect provider substitutions. The value
-- is in Smile Points — the Smilecoin API's native unit, returned by createorder
-- and productlist and debited from the querypoints balance — NOT BRL. The
-- Weekly Pass SKU costs 39 Smile Points; an Elite Weekly Pass substitution
-- would return a different Smile Points price.
UPDATE products
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('expected_provider_price', 39)
WHERE id = (
  SELECT p.id
  FROM products p
  JOIN games g ON g.id = p.game_id
  WHERE g.name ILIKE '%Mobile Legends%'
    AND g.region = 'br'
    AND (
      p.name ILIKE '%Weekly Pass%'
      OR p.amount ILIKE '%Weekly Pass%'
    )
    AND p.metadata->>'expected_provider_price' IS NULL
  LIMIT 1
)
AND metadata->>'expected_provider_price' IS NULL;
