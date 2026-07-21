-- ============================================================
-- Pixie-Kat: Security Linter Final Fix
-- Run AFTER 018_security_linter_final.sql
--
-- Resolves all remaining Supabase linter warnings:
--   anon_security_definer_function_executable
--   authenticated_security_definer_function_executable
--
-- Strategy:
--   1. Convert RLS helper functions (is_admin, is_admin_or_support,
--      can_access_support_conversation) to SECURITY INVOKER in
--      public. These only read public.profiles via auth.uid(),
--      so they do not need to bypass RLS. The linter does not flag
--      SECURITY INVOKER functions.
--   2. Revoke EXECUTE from anon AND authenticated on all remaining
--      SECURITY DEFINER functions that were previously granted to
--      authenticated. Grant EXECUTE only to service_role.
--      The server routes call these via supabaseAdmin (service_role).
--   3. For trigger-only functions, revoke from all roles.
--
-- Client-facing RPCs (place_wallet_order, place_pending_order,
-- get_admin_analytics) are no longer callable directly by
-- authenticated users via PostgREST. The Express backend proxies
-- these calls with the service_role key after verifying identity.
--
-- auth_leaked_password_protection is a dashboard-only setting
-- (Supabase Studio → Project Settings → Authentication →
-- Security → Leaked Password Protection). It cannot be toggled
-- via SQL.
-- ============================================================

-- ============================================================
-- PART 1: Convert RLS helpers to SECURITY INVOKER
-- These functions only read public.profiles (filtered by
-- auth.uid()) so they work correctly under the caller's RLS
-- context without SECURITY DEFINER.
-- ============================================================

-- is_admin() — SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;

-- is_admin_or_support() — SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.is_admin_or_support()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'support')
  );
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;

-- can_access_support_conversation() — SECURITY INVOKER
-- Reads support_conversations which has RLS policies that allow
-- the customer to see their own rows and staff (via is_admin_or_support)
-- to see all rows. No recursion risk because is_admin_or_support is
-- now INVOKER and only reads profiles (filtered by auth.uid()).
CREATE OR REPLACE FUNCTION public.can_access_support_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_admin_or_support()
    OR EXISTS (
      SELECT 1
      FROM public.support_conversations
      WHERE id = p_conversation_id
        AND customer_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;

-- RLS helpers remain executable by authenticated (needed for policy
-- evaluation). They are no longer SECURITY DEFINER so the linter
-- will not flag them.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin_or_support() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_support_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_support() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_support_conversation(UUID) TO authenticated;

-- ============================================================
-- PART 2: touch_support_conversation — trigger only
-- Revoke from all roles; only called by the database trigger.
-- ============================================================
REVOKE ALL ON FUNCTION public.touch_support_conversation() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- PART 3: place_wallet_order — service_role only
-- Remove auth.uid() check since service_role has auth.uid() = NULL.
-- Identity verification moves to the Express backend route.
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_wallet_order(
  p_user_id      UUID,
  p_product_id   UUID,
  p_product_name TEXT,
  p_total_amount NUMERIC,
  p_currency     TEXT,
  p_metadata     JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance       NUMERIC;
  v_order_id      UUID;
  v_balance_after NUMERIC;
  v_recent_count  INTEGER;
BEGIN
  -- Caller identity is verified by the server route before calling
  -- this function with the service_role key.

  -- Per-user rate cap: max 20 orders per minute
  SELECT COUNT(*) INTO v_recent_count
  FROM public.orders
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Too many orders placed. Please wait a minute and try again.';
  END IF;

  -- Server-side price check
  PERFORM public.validate_order_amount(p_user_id, p_product_id, p_total_amount, p_metadata);

  -- Lock and read balance atomically
  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_balance < p_total_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  v_balance_after := v_balance - p_total_amount;

  -- Deduct balance
  UPDATE public.profiles
  SET wallet_balance = v_balance_after,
      updated_at     = NOW()
  WHERE id = p_user_id;

  -- Create the order
  INSERT INTO public.orders (
    user_id, product_id, product_name,
    total_amount, currency, status, payment_method, metadata
  ) VALUES (
    p_user_id, p_product_id, p_product_name,
    p_total_amount, p_currency, 'processing', 'wallet', p_metadata
  )
  RETURNING id INTO v_order_id;

  -- Immutable ledger entry
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, balance_after, reference, order_id
  ) VALUES (
    p_user_id, 'purchase', -p_total_amount, v_balance_after,
    'Order ' || v_order_id::TEXT, v_order_id
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_wallet_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_wallet_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, JSONB
) TO service_role;

-- ============================================================
-- PART 4: place_pending_order — service_role only
-- Remove auth.uid() check since service_role has auth.uid() = NULL.
-- Identity verification moves to the Express backend route.
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_pending_order(
  p_user_id        UUID,
  p_product_id     UUID,
  p_product_name   TEXT,
  p_total_amount   NUMERIC,
  p_currency       TEXT,
  p_payment_method TEXT,
  p_metadata       JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id     UUID;
  v_recent_count INTEGER;
BEGIN
  -- Caller identity is verified by the server route before calling
  -- this function with the service_role key.

  IF p_payment_method IS NULL OR p_payment_method = 'wallet' THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT COUNT(*) INTO v_recent_count
  FROM public.orders
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Too many orders placed. Please wait a minute and try again.';
  END IF;

  PERFORM public.validate_order_amount(p_user_id, p_product_id, p_total_amount, p_metadata);

  INSERT INTO public.orders (
    user_id, product_id, product_name,
    total_amount, currency, status, payment_method, metadata
  ) VALUES (
    p_user_id, p_product_id, p_product_name,
    p_total_amount, p_currency, 'pending', p_payment_method, p_metadata
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_pending_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_pending_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB
) TO service_role;

-- ============================================================
-- PART 5: get_admin_analytics — service_role only
-- Remove is_admin_or_support() check since service_role has
-- auth.uid() = NULL. Admin verification moves to the Express
-- backend route.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_analytics(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NOW(),
  p_bucket TEXT DEFAULT 'day',
  p_payment_method TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Caller identity and admin role are verified by the server route
  -- before calling this function with the service_role key.

  WITH scoped_orders AS (
    SELECT o.*
    FROM public.orders o
    JOIN public.profiles profile ON profile.id = o.user_id
    WHERE profile.role <> 'admin'
      AND (p_start IS NULL OR o.created_at >= p_start)
      AND o.created_at < p_end
      AND (p_payment_method IS NULL OR o.payment_method = p_payment_method)
  ),
  customer_orders AS (
    SELECT user_id, COUNT(*) AS order_count
    FROM scoped_orders
    GROUP BY user_id
  ),
  metrics AS (
    SELECT
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed_orders,
      COUNT(*) FILTER (WHERE status = 'refunded') AS refunded_orders,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders,
      COUNT(*) FILTER (WHERE status = 'processing') AS processing_orders,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'refunded'), 0) AS refunds,
      COALESCE(SUM(unit_cost_price * quantity) FILTER (WHERE status = 'completed' AND unit_cost_price IS NOT NULL), 0) AS known_cost,
      COALESCE(SUM((unit_selling_price - unit_cost_price) * quantity) FILTER (WHERE status = 'completed' AND unit_selling_price IS NOT NULL AND unit_cost_price IS NOT NULL), 0) AS known_profit,
      COUNT(*) FILTER (WHERE status = 'completed' AND unit_cost_price IS NULL) AS profit_unknown_orders,
      COALESCE(SUM(quantity) FILTER (WHERE status = 'completed'), 0) AS units_sold,
      COUNT(DISTINCT user_id) AS ordering_customers
    FROM scoped_orders
  ),
  customers AS (
    SELECT
      COUNT(*) FILTER (WHERE role <> 'admin') AS total_customers,
      COUNT(*) FILTER (WHERE role <> 'admin' AND (p_start IS NULL OR created_at >= p_start) AND created_at < p_end) AS new_customers,
      COALESCE(SUM(wallet_balance) FILTER (WHERE role <> 'admin'), 0) AS customer_wallet_balance
    FROM public.profiles
  ),
  wallet AS (
    SELECT
      COALESCE(SUM(ABS(w.amount)) FILTER (WHERE w.type = 'purchase'), 0) AS wallet_spend,
      COALESCE(SUM(w.amount) FILTER (WHERE w.type = 'refund'), 0) AS wallet_refunds,
      COALESCE(SUM(w.amount) FILTER (WHERE w.type = 'credit'), 0) AS wallet_credits
    FROM public.wallet_transactions w
    JOIN public.profiles profile ON profile.id = w.user_id
    WHERE profile.role <> 'admin'
      AND (p_start IS NULL OR w.created_at >= p_start)
      AND w.created_at < p_end
  ),
  status_rows AS (
    SELECT status, COUNT(*) AS count
    FROM scoped_orders
    GROUP BY status
  ),
  trend_rows AS (
    SELECT
      CASE
        WHEN p_bucket = 'month' THEN date_trunc('month', created_at)
        WHEN p_bucket = 'week' THEN date_trunc('week', created_at)
        ELSE date_trunc('day', created_at)
      END AS bucket,
      COUNT(*) AS orders,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue,
      COALESCE(SUM((unit_selling_price - unit_cost_price) * quantity) FILTER (WHERE status = 'completed' AND unit_selling_price IS NOT NULL AND unit_cost_price IS NOT NULL), 0) AS profit
    FROM scoped_orders
    GROUP BY 1
    ORDER BY 1
  ),
  product_rows AS (
    SELECT
      product_id,
      MAX(product_name) AS name,
      COALESCE(SUM(quantity) FILTER (WHERE status = 'completed'), 0) AS units,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue,
      COALESCE(SUM((unit_selling_price - unit_cost_price) * quantity) FILTER (WHERE status = 'completed' AND unit_selling_price IS NOT NULL AND unit_cost_price IS NOT NULL), 0) AS profit
    FROM scoped_orders
    GROUP BY product_id
    HAVING COUNT(*) FILTER (WHERE status = 'completed') > 0
    ORDER BY units DESC, revenue DESC
    LIMIT 20
  )
  SELECT jsonb_build_object(
    'metrics', to_jsonb(metrics),
    'customers', to_jsonb(customers) || jsonb_build_object(
      'new', COALESCE((SELECT COUNT(*) FROM customer_orders WHERE order_count = 1), 0),
      'returning', COALESCE((SELECT COUNT(*) FROM customer_orders WHERE order_count > 1), 0)
    ),
    'wallet', to_jsonb(wallet),
    'statuses', COALESCE((SELECT jsonb_agg(to_jsonb(status_rows)) FROM status_rows), '[]'::JSONB),
    'trend', COALESCE((SELECT jsonb_agg(to_jsonb(trend_rows)) FROM trend_rows), '[]'::JSONB),
    'products', COALESCE((SELECT jsonb_agg(to_jsonb(product_rows)) FROM product_rows), '[]'::JSONB)
  ) INTO v_result
  FROM metrics, customers, wallet;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) TO service_role;

-- ============================================================
-- PART 6: refund_wallet_order — already service_role only
-- Reiterate grants to ensure no authenticated access remains.
-- ============================================================
REVOKE ALL ON FUNCTION public.refund_wallet_order(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_wallet_order(UUID, JSONB) TO service_role;

-- ============================================================
-- PART 7: mark_broadcast_read — service_role only
-- Not called from any client code. Revoke authenticated to
-- silence the linter. If needed in the future, proxy via backend.
-- Guarded because the broadcast feature may not be present in
-- every database state.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'mark_broadcast_read'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.mark_broadcast_read(UUID) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.mark_broadcast_read(UUID) TO service_role';
  END IF;
END
$$;

-- ============================================================
-- PART 8: Summary of SECURITY DEFINER functions in public
--
-- Functions that remain SECURITY DEFINER but are NOT executable
-- by anon or authenticated (linter will not flag them):
--   handle_new_user()           — trigger only, revoked from PUBLIC
--   handle_new_profile()        — trigger only, revoked from PUBLIC
--   handle_email_confirmed()    — trigger only, revoked from PUBLIC
--   handle_updated_at()         — trigger only, revoked from PUBLIC
--   touch_support_conversation() — trigger only, revoked from all
--   adjust_wallet_balance(...)  — service_role only
--   update_user_status(...)     — service_role only
--   log_activity(...)           — service_role only
--   validate_order_amount(...)  — revoked from PUBLIC/anon/authenticated
--   place_wallet_order(...)     — service_role only
--   place_pending_order(...)    — service_role only
--   get_admin_analytics(...)    — service_role only
--   refund_wallet_order(...)    — service_role only
--   mark_broadcast_read(...)    — service_role only
-- ============================================================
