-- ============================================================
-- Pixie-Kat: Wallet Order Refund RPC
-- Run AFTER 011_wallet_order_rpc.sql
--
-- Atomically:
--   1. Verifies the order is a wallet order in a refundable state
--   2. Credits the amount back to the user's wallet
--   3. Writes an immutable 'refund' ledger entry
--   4. Updates order status to 'failed'
--   5. Optionally merges error metadata into order.metadata
-- Returns the user's new wallet balance.
-- ============================================================

CREATE OR REPLACE FUNCTION public.refund_wallet_order(
  p_order_id        UUID,
  p_error_metadata  JSONB DEFAULT '{}'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order       RECORD;
  v_balance     NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock and read the order row
  SELECT id, user_id, total_amount, payment_method, status, metadata
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.payment_method <> 'wallet' THEN
    RAISE EXCEPTION 'Order % was not paid via wallet (payment_method=%)', p_order_id, v_order.payment_method;
  END IF;

  -- Allow refund only for processing or failed states
  IF v_order.status NOT IN ('processing', 'failed') THEN
    RAISE EXCEPTION 'Order % cannot be refunded in status: %', p_order_id, v_order.status;
  END IF;

  -- Lock the user profile and read current balance
  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = v_order.user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', v_order.user_id;
  END IF;

  v_new_balance := v_balance + v_order.total_amount;

  -- Credit wallet
  UPDATE public.profiles
  SET wallet_balance = v_new_balance,
      updated_at     = NOW()
  WHERE id = v_order.user_id;

  -- Mark order as failed and merge error metadata
  UPDATE public.orders
  SET status     = 'failed',
      metadata   = v_order.metadata || p_error_metadata,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Immutable refund ledger entry
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, balance_after, reference, order_id
  ) VALUES (
    v_order.user_id,
    'refund',
    v_order.total_amount,
    v_new_balance,
    'Refund for failed order ' || p_order_id::TEXT,
    p_order_id
  );

  RETURN v_new_balance;
END;
$$;

-- Only the service role (server) may call this function
REVOKE ALL ON FUNCTION public.refund_wallet_order(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_wallet_order(UUID, JSONB) TO service_role;
