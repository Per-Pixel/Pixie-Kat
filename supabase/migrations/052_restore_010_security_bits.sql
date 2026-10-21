-- ============================================================
-- Pixie-Kat: Restore missed 010_security_remediation artifacts
-- Run AFTER 051_exclusive_offers_fix.sql
--
-- Found 2026-10-15: 010 was never fully applied to prod. These
-- objects were missing while live code paths depend on them:
--   * public.is_service_role() — called inside deployed
--     refresh_user_perks() and protect_profile_updates() bodies
--     (runtime error "function does not exist" when invoked)
--   * orders.idempotency_key + idx_orders_user_idempotency_key —
--     main/server checkout filters and inserts this column
--     (PostgREST 42703 when the endpoint is hit)
--   * protect_order_updates() + two NOT VALID constraints —
--     schema parity with the migration files.
--
-- Deliberately NOT restored: the 010 protect_*_on_update triggers
-- (prod has always run unarmed; arming them changes admin update
-- behavior — enable intentionally if wanted) and the 010-era RLS
-- policy names (superseded by the 016-029 policy set).
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.jwt() ->> 'role',
    ''
  ) = 'service_role';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_service_role() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency_key
  ON public.orders(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_order_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: only active admins may update orders';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.product_id IS DISTINCT FROM OLD.product_id
    OR NEW.product_name IS DISTINCT FROM OLD.product_name
    OR NEW.quantity IS DISTINCT FROM OLD.quantity
    OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
    OR NEW.payment_id IS DISTINCT FROM OLD.payment_id
    OR NEW.metadata IS DISTINCT FROM OLD.metadata
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only order status may be changed by an admin';
  END IF;

  IF NEW.status IN ('completed', 'refunded') THEN
    RAISE EXCEPTION 'Completed and refunded orders require a trusted payment operation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT (
      (OLD.status = 'pending' AND NEW.status IN ('processing', 'cancelled', 'on_hold'))
      OR (OLD.status = 'processing' AND NEW.status IN ('failed', 'on_hold', 'cancelled'))
      OR (OLD.status = 'failed' AND NEW.status = 'pending')
      OR (OLD.status = 'cancelled' AND NEW.status = 'pending')
      OR (OLD.status = 'on_hold' AND NEW.status IN ('processing', 'cancelled'))
    ) THEN
    RAISE EXCEPTION 'Invalid order status transition';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_wallet_balance_non_negative'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_wallet_balance_non_negative
      CHECK (wallet_balance >= 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_product_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;
