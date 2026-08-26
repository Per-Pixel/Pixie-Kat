-- ============================================================
-- Pixie-Kat: Razorpay checkout identifiers
--
-- Keeps the Razorpay order identifier separate from payment_id,
-- which stores the captured payment identifier after verification.
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
  ON public.orders(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
