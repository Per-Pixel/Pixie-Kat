-- Backfill expected_provider_price for the Mobile Legends (Brazil) Weekly Pass product
-- so mismatch detection can detect provider substitutions like the reported case
-- where the provider fulfilled an Elite Weekly Pass at BRL 3.90 instead of the
-- expected BRL 4.00.
UPDATE products
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('expected_provider_price', 4.00)
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
