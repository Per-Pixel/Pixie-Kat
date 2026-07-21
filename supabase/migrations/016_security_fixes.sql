-- ============================================================
-- Pixie-Kat: Security Fixes (Session 4 audit)
-- Run AFTER 015_wallet_analytics_filter.sql
--
-- Fixes:
--   1. profiles UPDATE RLS — lock wallet_balance, email,
--      email_verified, referral_code, referred_by (in addition
--      to role/status).
--   2. place_wallet_order — server-side price validation; the
--      client-supplied total must fall between the discounted
--      server-computed total and the full undiscounted price.
--   3. place_pending_order — new RPC for non-wallet checkout
--      with the same server-side price validation. Direct
--      client INSERTs into orders are no longer allowed.
--   4. orders INSERT RLS — policy dropped; orders are created
--      only via SECURITY DEFINER RPCs or the service role.
--   5. adjust_wallet_balance — restricted to admin role only
--      (support can no longer adjust balances via JWT).
--   6. place_wallet_order — per-user rate cap (20 orders/min)
--      to bound batch-order abuse.
-- ============================================================

-- ============================================================
-- FIX 1: profiles UPDATE — lock all sensitive columns
-- ============================================================
DROP POLICY IF EXISTS "profiles: user updates own (no role/status change)" ON public.profiles;

CREATE POLICY "profiles: user updates own (no sensitive columns)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    ROW(role, status, wallet_balance, email, email_verified, referral_code, referred_by)
    IS NOT DISTINCT FROM
    (SELECT ROW(p.role, p.status, p.wallet_balance, p.email, p.email_verified, p.referral_code, p.referred_by)
     FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ============================================================
-- FIX 2 HELPER: server-side order amount validation
-- Computes the authoritative total for a product purchase:
--   product price (active product of an active game)
--   - membership discount (active membership, or the plan being
--     purchased alongside this order via metadata)
--   + membership add-on price (when buying a plan with the order)
-- Raises when the client-supplied amount is below the discounted
-- total or above the full undiscounted total.
-- Mirrors client logic: discount = GREATEST(1, ROUND(price * pct / 100))
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_order_amount(
  p_user_id      UUID,
  p_product_id   UUID,
  p_total_amount NUMERIC,
  p_metadata     JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price            NUMERIC;
  v_discount_pct     NUMERIC := 0;
  v_addon            NUMERIC := 0;
  v_discount         NUMERIC := 0;
  v_expected         NUMERIC;
  v_max              NUMERIC;
  v_selected_plan_id UUID;
  v_has_membership   BOOLEAN := FALSE;
BEGIN
  -- Authoritative product price
  SELECT pr.price INTO v_price
  FROM public.products pr
  JOIN public.games g ON g.id = pr.game_id
  WHERE pr.id = p_product_id
    AND pr.status = 'active'
    AND g.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product is not available';
  END IF;

  -- Active membership discount
  SELECT mp.discount_percent INTO v_discount_pct
  FROM public.user_memberships um
  JOIN public.membership_plans mp ON mp.id = um.membership_plan_id
  WHERE um.user_id = p_user_id
    AND um.status = 'active'
    AND um.expires_at > NOW()
  ORDER BY um.expires_at DESC
  LIMIT 1;

  v_has_membership := FOUND;

  -- Membership plan purchased alongside this order (add-on)
  IF NOT v_has_membership THEN
    v_discount_pct := 0;
    BEGIN
      v_selected_plan_id := NULLIF(p_metadata #>> '{pricing,selected_membership_plan_id}', '')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      v_selected_plan_id := NULL;
    END;

    IF v_selected_plan_id IS NOT NULL THEN
      SELECT mp.price, mp.discount_percent INTO v_addon, v_discount_pct
      FROM public.membership_plans mp
      WHERE mp.id = v_selected_plan_id AND mp.is_active = TRUE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Membership plan is not available';
      END IF;
    END IF;
  END IF;

  IF COALESCE(v_discount_pct, 0) > 0 AND v_price > 0 THEN
    v_discount := GREATEST(1, ROUND(v_price * v_discount_pct / 100));
  END IF;

  v_expected := GREATEST(0, v_price - v_discount) + COALESCE(v_addon, 0);
  v_max      := v_price + COALESCE(v_addon, 0);

  IF p_total_amount < v_expected - 0.01 OR p_total_amount > v_max + 0.01 THEN
    RAISE EXCEPTION 'Order amount does not match the product price';
  END IF;
END;
$$;

-- Internal helper — never callable directly by clients
REVOKE ALL ON FUNCTION public.validate_order_amount(UUID, UUID, NUMERIC, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_order_amount(UUID, UUID, NUMERIC, JSONB) FROM anon, authenticated;

-- ============================================================
-- FIX 2 + 6: place_wallet_order — price validation + rate cap
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
  -- Ensure caller is acting on their own account
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorised';
  END IF;

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

REVOKE ALL ON FUNCTION public.place_wallet_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_wallet_order TO authenticated;

-- ============================================================
-- FIX 3: place_pending_order — non-wallet checkout RPC
-- Creates a 'pending' order with server-side price validation.
-- Payment confirmation / fulfillment stays a manual admin flow.
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
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorised';
  END IF;

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

REVOKE ALL ON FUNCTION public.place_pending_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_pending_order TO authenticated;

-- ============================================================
-- FIX 4: orders — remove direct client INSERT
-- All order creation now flows through the RPCs above (which
-- run as SECURITY DEFINER) or the service role.
-- ============================================================
DROP POLICY IF EXISTS "orders: user inserts own" ON public.orders;

-- ============================================================
-- FIX 5: adjust_wallet_balance — admin only (drop support)
-- Service role (Express, auth.uid() IS NULL) remains allowed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
  p_user_id   UUID,
  p_amount    NUMERIC,
  p_type      wallet_tx_type,
  p_reference TEXT,
  p_actor_id  UUID  DEFAULT NULL,
  p_order_id  UUID  DEFAULT NULL
)
RETURNS public.wallet_transactions AS $$
DECLARE
  v_caller_role TEXT;
  v_balance     NUMERIC;
  v_tx          public.wallet_transactions;
BEGIN
  -- Permission check: allow service role (auth.uid() IS NULL) or admin role
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Permission denied: adjust_wallet_balance requires admin role';
    END IF;
  END IF;

  -- Validate amount is non-zero
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must be non-zero';
  END IF;

  -- Lock the user row to prevent race conditions
  SELECT wallet_balance INTO v_balance
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Prevent negative balance
  IF v_balance + p_amount < 0 THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current: %, Requested debit: %',
      v_balance, ABS(p_amount);
  END IF;

  -- Update wallet balance atomically
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount,
      updated_at     = NOW()
  WHERE id = p_user_id;

  -- Write immutable ledger entry
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, balance_after, reference, actor_id, order_id
  )
  VALUES (
    p_user_id, p_type, p_amount, v_balance + p_amount,
    p_reference, p_actor_id, p_order_id
  )
  RETURNING * INTO v_tx;

  -- Write activity log entry
  INSERT INTO public.user_activity_log (user_id, action, description, actor_id, metadata)
  VALUES (
    p_user_id,
    (CASE WHEN p_amount > 0 THEN 'wallet_credit' ELSE 'wallet_debit' END)::activity_action,
    p_reference,
    p_actor_id,
    jsonb_build_object(
      'amount', p_amount,
      'balance_after', v_balance + p_amount,
      'type', p_type,
      'tx_id', v_tx.id
    )
  );

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
