-- ============================================================
-- Pixie-Kat: Pin sensitive columns on admin order updates
-- Run AFTER 054_wuthering_waves.sql
--
-- The "orders: admin updates status" policy lets any admin-role
-- JWT UPDATE orders via PostgREST with no column restriction, and
-- the 010 protect_order_updates trigger that validated field-level
-- changes is deliberately unarmed in prod (see 052). An admin could
-- therefore rewrite user_id, product_id, total_amount, currency,
-- payment linkage, or idempotency_key on any order.
--
-- This migration keeps the legitimate writes the admin UI performs
-- (status changes, metadata updates like provider_mismatch,
-- bookkeeping columns) while freezing every money/identity/payment
-- column. Applied via:
--   npx supabase db query --linked --file supabase/migrations/055_lock_order_admin_updates.sql
-- ============================================================

BEGIN;

-- Prod drift: 010 dropped this permissive policy but the drop never landed.
-- While it exists it ORs past the pinned policy below (policies are permissive).
DROP POLICY IF EXISTS "orders: admin updates any" ON public.orders;
DROP POLICY IF EXISTS "orders: admin updates status" ON public.orders;

CREATE POLICY "orders: admin updates status"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (
    public.is_admin()
    AND ROW(id, user_id, product_id, product_name, quantity, total_amount,
            currency, payment_method, payment_id, razorpay_order_id,
            aluu_order_id, idempotency_key, created_at)
        IS NOT DISTINCT FROM
        (SELECT ROW(o.id, o.user_id, o.product_id, o.product_name, o.quantity,
                    o.total_amount, o.currency, o.payment_method, o.payment_id,
                    o.razorpay_order_id, o.aluu_order_id, o.idempotency_key,
                    o.created_at)
         FROM public.orders o
         WHERE o.id = orders.id)
  );

COMMIT;
