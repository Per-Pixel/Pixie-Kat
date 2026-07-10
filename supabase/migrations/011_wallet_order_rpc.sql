-- ============================================================
-- Pixie-Kat: Wallet Order RPC
-- Run AFTER 010_memberships.sql
--
-- Adds an atomic wallet-payment function that:
--   1. Locks the user's profile row
--   2. Checks wallet_balance >= requested amount
--   3. Deducts the balance
--   4. Inserts a wallet_transactions ledger entry
--   5. Creates the order with status = 'paid'
--   Returns the new order id.
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
  v_balance   NUMERIC;
  v_order_id  UUID;
  v_balance_after NUMERIC;
BEGIN
  -- Ensure caller is acting on their own account
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorised';
  END IF;

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
    p_total_amount, p_currency, 'paid', 'wallet', p_metadata
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

-- Allow authenticated users to call this function
REVOKE ALL ON FUNCTION public.place_wallet_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_wallet_order TO authenticated;
