-- ============================================================
-- Pixie-Kat: Wallet top-ups + standalone membership purchase
-- Run AFTER 043_leaderboard.sql
--
-- Storefront users can now (a) top up their Pixie Wallet with a
-- Razorpay/Aluu payment (1 coin = ₹1, capped per transaction) and
-- (b) buy a membership plan on its own — previously membership was
-- only a checkout add-on attached to a game order.
--
-- Both flows produce "service" orders: no product, nothing for
-- fulfill-order to deliver. Payment confirmation (verify-payment /
-- check-payment / webhooks) flips them to 'processing' exactly like
-- product orders; this migration's trigger then settles them:
--
--   * metadata.wallet_topup = true
--       → credit the paid amount to the buyer's wallet once, write
--         the wallet_transactions ledger row, close the order.
--   * metadata.pricing.standalone_membership = true
--       → trg_orders_sync_membership (migration 038) grants the plan
--         on the paid transition; once the user_memberships row
--         exists this trigger closes the order. If the grant was
--         skipped (buyer already had an active plan) the order is
--         left 'processing' for support instead of silently closing.
--
-- Trigger names for the same event fire alphabetically, so
-- "trg_orders_zzz_service_fulfillment" is guaranteed to run AFTER
-- "trg_orders_sync_membership" on every transition.
--
-- purchase_membership_with_wallet() is the wallet-paid variant:
-- atomic debit + paid order in one transaction (the same triggers
-- then grant the plan and close the order). service_role only —
-- the Express route authenticates the caller.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fulfill_paid_service_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_after NUMERIC;
BEGIN
  IF NOT (NEW.status IN ('processing', 'completed')
          AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)) THEN
    RETURN NEW;
  END IF;

  -- Wallet top-up — credit the paid amount once.
  IF NEW.metadata ->> 'wallet_topup' = 'true' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions wt
      WHERE wt.order_id = NEW.id AND wt.type = 'credit'
    ) THEN
      UPDATE public.profiles
      SET wallet_balance = wallet_balance + NEW.total_amount,
          updated_at     = NOW()
      WHERE id = NEW.user_id
      RETURNING wallet_balance INTO v_balance_after;

      INSERT INTO public.wallet_transactions (
        user_id, type, amount, balance_after, reference, order_id, metadata
      ) VALUES (
        NEW.user_id, 'credit', NEW.total_amount, v_balance_after,
        'Wallet top-up', NEW.id,
        jsonb_build_object('source', 'wallet_topup', 'payment_method', NEW.payment_method)
      );

      INSERT INTO public.user_activity_log (user_id, action, description, actor_id, metadata)
      VALUES (
        NEW.user_id, 'wallet_credit', 'Wallet top-up', NULL,
        jsonb_build_object('amount', NEW.total_amount, 'order_id', NEW.id, 'source', 'wallet_topup')
      );
    END IF;

    -- A credited top-up has nothing left to deliver. The nested update
    -- re-fires this trigger with NEW.status = 'completed'; the ledger
    -- row then exists, so it exits without recursing further.
    IF NEW.status = 'processing' THEN
      UPDATE public.orders SET status = 'completed' WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Standalone membership purchase — the plan grant is handled by
  -- trg_orders_sync_membership on this same transition; close the
  -- order once the grant row exists.
  IF NEW.metadata #>> '{pricing,standalone_membership}' = 'true'
     AND NEW.status = 'processing'
     AND EXISTS (
       SELECT 1 FROM public.user_memberships um
       WHERE um.source_order_id = NEW.id
     ) THEN
    UPDATE public.orders SET status = 'completed' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_zzz_service_fulfillment ON public.orders;
CREATE TRIGGER trg_orders_zzz_service_fulfillment
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fulfill_paid_service_order();

-- Idempotency backstop: at most one wallet credit per order.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_order_credit
  ON public.wallet_transactions(order_id)
  WHERE type = 'credit' AND order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.purchase_membership_with_wallet(
  p_user_id UUID,
  p_plan_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan          public.membership_plans%ROWTYPE;
  v_balance       NUMERIC;
  v_balance_after NUMERIC;
  v_order_id      UUID;
BEGIN
  SELECT * INTO v_plan
  FROM public.membership_plans
  WHERE id = p_plan_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership plan is not available';
  END IF;

  -- Memberships don't stack (same rule as sync_membership_from_order).
  -- Checked before taking money so a declined grant never strands payment.
  IF EXISTS (
    SELECT 1 FROM public.user_memberships
    WHERE user_id = p_user_id AND status = 'active' AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'An active membership already exists';
  END IF;

  -- Lock and read balance atomically
  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_balance < v_plan.price THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  v_balance_after := v_balance - v_plan.price;

  UPDATE public.profiles
  SET wallet_balance = v_balance_after,
      updated_at     = NOW()
  WHERE id = p_user_id;

  -- Paid on insert: sync_membership_from_order grants the plan on this
  -- INSERT, then trg_orders_zzz_service_fulfillment closes the order.
  INSERT INTO public.orders (
    user_id, product_id, product_name,
    total_amount, currency, status, payment_method, metadata
  ) VALUES (
    p_user_id, NULL, v_plan.name || ' Membership',
    v_plan.price, v_plan.currency, 'processing', 'wallet',
    jsonb_build_object(
      'pricing', jsonb_build_object(
        'selected_membership_plan_id',   p_plan_id,
        'selected_membership_plan_name', v_plan.name,
        'membership_add_on',             v_plan.price,
        'total_amount',                  v_plan.price,
        'standalone_membership',         true
      )
    )
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.wallet_transactions (
    user_id, type, amount, balance_after, reference, order_id, metadata
  ) VALUES (
    p_user_id, 'purchase', -v_plan.price, v_balance_after,
    'Membership: ' || v_plan.name, v_order_id,
    jsonb_build_object('source', 'membership_purchase', 'membership_plan_id', p_plan_id)
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_membership_with_wallet(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_membership_with_wallet(UUID, UUID) TO service_role;
