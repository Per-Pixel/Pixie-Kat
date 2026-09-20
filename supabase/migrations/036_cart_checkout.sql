-- ============================================================
-- Pixie-Kat: Cart checkout RPCs
-- Run AFTER 035_aluu_checkout.sql
--
-- Adds two service_role-only functions that let the Express
-- backend place an entire cart in ONE transaction. p_items is a
-- flat array with ONE element per purchasable unit (the backend
-- expands quantity before calling), matching the existing
-- fulfillment model where fulfill-order provisions one unit per
-- order row.
--
--   place_cart_orders  — 'pending' orders for external payments
--                        (razorpay / aluu). A single provider
--                        payment covers the whole group.
--   place_wallet_cart  — atomic wallet debit of the cart total +
--                        'processing' orders + ledger entries.
--
-- Every row gets metadata.payment_group_id so group verification
-- and payment webhooks can find all sibling orders.
--
-- The per-order "20 orders/minute" cap inside place_pending_order
-- / place_wallet_order does NOT apply here: a cart is a single
-- user action, so the cap moves to whole-cart size (50 units) plus
-- a looser per-minute order-count ceiling.
-- ============================================================

-- ============================================================
-- place_cart_orders — pending orders for external payment methods
-- p_items: [{ product_id, unit_amount, metadata }]
-- Returns the created order ids in input order.
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_cart_orders(
  p_user_id        UUID,
  p_payment_method TEXT,
  p_currency       TEXT,
  p_items          JSONB
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item         JSONB;
  v_product_id   UUID;
  v_unit_amount  NUMERIC;
  v_meta         JSONB;
  v_product_name TEXT;
  v_order_id     UUID;
  v_order_ids    UUID[] := '{}';
  v_recent_count INTEGER;
BEGIN
  -- Caller identity is verified by the server route before calling
  -- this function with the service_role key.

  IF p_payment_method IS NULL OR p_payment_method = 'wallet' THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Too many items in cart (max 50 units)';
  END IF;

  -- Loose spam ceiling — a cart is one action but should still be bounded
  SELECT COUNT(*) INTO v_recent_count
  FROM public.orders
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF v_recent_count >= 100 THEN
    RAISE EXCEPTION 'Too many orders placed. Please wait a minute and try again.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id  := (v_item->>'product_id')::UUID;
    v_unit_amount := (v_item->>'unit_amount')::NUMERIC;
    v_meta        := COALESCE(v_item->'metadata', '{}'::JSONB);

    -- Authoritative price check (active product, active game,
    -- membership-aware) — raises on mismatch
    PERFORM public.validate_order_amount(p_user_id, v_product_id, v_unit_amount, v_meta);

    SELECT pr.name INTO v_product_name
    FROM public.products pr
    WHERE pr.id = v_product_id;

    INSERT INTO public.orders (
      user_id, product_id, product_name,
      quantity, total_amount, currency, status, payment_method, metadata
    ) VALUES (
      p_user_id, v_product_id, COALESCE(v_product_name, ''),
      1, v_unit_amount, p_currency, 'pending', p_payment_method, v_meta
    )
    RETURNING id INTO v_order_id;

    v_order_ids := v_order_ids || v_order_id;
  END LOOP;

  RETURN v_order_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.place_cart_orders(
  UUID, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_cart_orders(
  UUID, TEXT, TEXT, JSONB
) TO service_role;

-- ============================================================
-- place_wallet_cart — atomic wallet debit + 'processing' orders
-- Locks the profile once, validates every unit price, debits the
-- grand total, and writes one ledger row per order so the
-- wallet_transactions trail matches the single-order flow.
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_wallet_cart(
  p_user_id  UUID,
  p_currency TEXT,
  p_items    JSONB
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item         JSONB;
  v_product_id   UUID;
  v_unit_amount  NUMERIC;
  v_meta         JSONB;
  v_product_name TEXT;
  v_order_id     UUID;
  v_order_ids    UUID[] := '{}';
  v_grand_total  NUMERIC := 0;
  v_balance      NUMERIC;
  v_running      NUMERIC;
  v_recent_count INTEGER;
BEGIN
  -- Caller identity is verified by the server route before calling
  -- this function with the service_role key.

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Too many items in cart (max 50 units)';
  END IF;

  SELECT COUNT(*) INTO v_recent_count
  FROM public.orders
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF v_recent_count >= 100 THEN
    RAISE EXCEPTION 'Too many orders placed. Please wait a minute and try again.';
  END IF;

  -- Pass 1: validate every unit amount and total the cart.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id  := (v_item->>'product_id')::UUID;
    v_unit_amount := (v_item->>'unit_amount')::NUMERIC;

    PERFORM public.validate_order_amount(p_user_id, v_product_id, v_unit_amount,
                                         COALESCE(v_item->'metadata', '{}'::JSONB));

    v_grand_total := v_grand_total + v_unit_amount;
  END LOOP;

  -- Lock and read balance atomically
  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_balance < v_grand_total THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Single debit for the whole cart
  UPDATE public.profiles
  SET wallet_balance = v_balance - v_grand_total,
      updated_at     = NOW()
  WHERE id = p_user_id;

  v_running := v_balance;

  -- Pass 2: orders + ledger rows
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id  := (v_item->>'product_id')::UUID;
    v_unit_amount := (v_item->>'unit_amount')::NUMERIC;
    v_meta        := COALESCE(v_item->'metadata', '{}'::JSONB);

    SELECT pr.name INTO v_product_name
    FROM public.products pr
    WHERE pr.id = v_product_id;

    INSERT INTO public.orders (
      user_id, product_id, product_name,
      quantity, total_amount, currency, status, payment_method, metadata
    ) VALUES (
      p_user_id, v_product_id, COALESCE(v_product_name, ''),
      1, v_unit_amount, p_currency, 'processing', 'wallet', v_meta
    )
    RETURNING id INTO v_order_id;

    v_order_ids := v_order_ids || v_order_id;
    v_running   := v_running - v_unit_amount;

    INSERT INTO public.wallet_transactions (
      user_id, type, amount, balance_after, reference, order_id
    ) VALUES (
      p_user_id, 'purchase', -v_unit_amount, v_running,
      'Order ' || v_order_id::TEXT, v_order_id
    );
  END LOOP;

  RETURN v_order_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.place_wallet_cart(
  UUID, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_wallet_cart(
  UUID, TEXT, JSONB
) TO service_role;
