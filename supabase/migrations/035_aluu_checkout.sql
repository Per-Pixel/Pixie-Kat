-- ============================================================
-- Pixie-Kat: Aluu Pay checkout identifiers
--
-- Stores the Aluu-internal order ID separately from our local
-- order id and the generic payment_id field (which holds the
-- UTR once the payment is confirmed).
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS aluu_order_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_aluu_order_id
  ON public.orders(aluu_order_id)
  WHERE aluu_order_id IS NOT NULL;
