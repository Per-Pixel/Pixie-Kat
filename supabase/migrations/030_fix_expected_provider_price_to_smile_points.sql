-- Correct expected_provider_price for the Mobile Legends (Brazil) Weekly Pass
-- from the BRL value (4.00) backfilled by migration 026 to the provider's
-- native unit, Smile Points (39). The mismatch check compares the createorder
-- returned price (Smile Points) against this value, so both must be in the
-- same unit. The original BRL 4.00 caused a false mismatch vs Smile Points 39
-- (~1 BRL ≈ 9-10 Smile Points) and flagged valid orders as substitutions.
-- Idempotent: only touches the Weekly Pass product whose stored value is still
-- the bad BRL 4.00; leaves any product an admin has since corrected alone.
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
    AND (p.metadata->>'expected_provider_price')::numeric = 4
  LIMIT 1
);
