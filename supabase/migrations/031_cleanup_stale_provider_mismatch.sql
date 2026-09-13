-- Migration 031: Clean up stale false provider_mismatch entries
--
-- Prior to the price-mismatch fix, orders without Smile Points metadata fell back to
-- the productlist's fiat BRL price (e.g. 4.00) and compared it against createorder's
-- Smile Points price (e.g. 39), falsely recording provider_mismatch entries with
-- refund_amount: 0.
--
-- This migration cleans up those false positive entries from orders.metadata.
-- Real mismatch entries (where a cheaper SKU was delivered and refund_amount > 0)
-- are preserved.

UPDATE orders
SET metadata = metadata - 'provider_mismatch'
WHERE metadata ? 'provider_mismatch'
  AND (
    COALESCE((metadata->'provider_mismatch'->>'refund_amount')::numeric, 0) = 0
    OR metadata->'provider_mismatch'->>'refund_status' = 'skipped_no_expected_price'
    OR metadata->'provider_mismatch'->>'refund_amount' IS NULL
  );
