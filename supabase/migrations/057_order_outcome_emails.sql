-- ============================================================
-- Pixie-Kat: one outcome email per order, one receipt per cart
-- Run AFTER 056_leaderboard_spend_metric.sql
--
-- APPLY THIS ONLY AFTER the API that understands `cart_settled`
-- is deployed. An older API treats unknown kinds as skipped, so
-- applying it first drops cart receipts.
--
-- Customers were mailed on processing, then again on completed,
-- failed, and refunded — and a cart mailed once per item.
-- The trigger now stays quiet until the order is delivered,
-- failed, refunded, or cancelled. That one row says whether
-- the payment was refunded. A cart (metadata.payment_group_id)
-- waits until every sibling has left pending / processing /
-- on hold, then queues a single cart_settled row.
-- ============================================================

ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_kind_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_kind_check CHECK (kind IN (
    'order_processing', 'order_completed', 'order_failed',
    'order_refunded', 'login_alert', 'leaderboard_winner',
    'cart_settled'
  ));

-- One cart receipt per payment group.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_outbox_cart_group
  ON public.notification_outbox ((payload->>'payment_group_id'))
  WHERE kind = 'cart_settled'
    AND payload->>'payment_group_id' IS NOT NULL;

-- Already-queued "we got your payment" rows should not go out.
UPDATE public.notification_outbox
SET status = 'skipped',
    processed_at = NOW(),
    last_error = 'processing emails are no longer sent'
WHERE kind = 'order_processing'
  AND status IN ('pending', 'sending');

-- refund_wallet_order writes the ledger row before the status
-- change, so the trigger below can see that the failure was refunded.
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

  IF v_order.status NOT IN ('processing', 'failed') THEN
    RAISE EXCEPTION 'Order % cannot be refunded in status: %', p_order_id, v_order.status;
  END IF;

  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = v_order.user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found for user %', v_order.user_id;
  END IF;

  v_new_balance := v_balance + v_order.total_amount;

  UPDATE public.profiles
  SET wallet_balance = v_new_balance,
      updated_at     = NOW()
  WHERE id = v_order.user_id;

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

  UPDATE public.orders
  SET status     = 'failed',
      metadata   = v_order.metadata || COALESCE(p_error_metadata, '{}'::JSONB),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_order_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group          TEXT;
  v_open           INTEGER;
  v_items          JSONB;
  v_anchor         UUID;
  v_total          NUMERIC;
  v_kind           TEXT;
  v_refund_amount  NUMERIC;
  v_refunded       BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Quiet while the order is still moving. One mail when it lands.
  IF NEW.status NOT IN ('completed', 'failed', 'refunded', 'cancelled') THEN
    RETURN NEW;
  END IF;

  v_group := NULLIF(BTRIM(COALESCE(NEW.metadata->>'payment_group_id', '')), '');

  IF v_group IS NOT NULL THEN
    -- Two items can finish together. Hold the lock until commit so the
    -- second transaction rechecks after the first is visible.
    PERFORM pg_advisory_xact_lock(hashtext('pixiekat-cart:' || v_group));

    SELECT COUNT(*) INTO v_open
    FROM public.orders o
    WHERE o.user_id = NEW.user_id
      AND o.metadata->>'payment_group_id' = v_group
      AND o.status IN ('pending', 'processing', 'on_hold');

    IF v_open > 0 THEN
      RETURN NEW;
    END IF;

    SELECT
      (ARRAY_AGG(s.id ORDER BY s.id))[1],
      COALESCE(SUM(s.total_amount), 0),
      COALESCE(jsonb_agg(
        jsonb_build_object(
          'order_id', s.id,
          'product_name', s.product_name,
          'quantity', s.quantity,
          'total_amount', s.total_amount,
          'currency', s.currency,
          'payment_method', s.payment_method,
          'outcome', s.outcome,
          'refunded', s.refunded,
          'refund_amount', s.refund_amount
        )
        ORDER BY s.created_at, s.id
      ), '[]'::JSONB)
    INTO v_anchor, v_total, v_items
    FROM (
      SELECT
        o.id,
        o.product_name,
        o.quantity,
        o.total_amount,
        o.currency,
        o.payment_method,
        o.created_at,
        CASE WHEN o.status = 'completed' THEN 'done' ELSE 'failed' END AS outcome,
        (
          o.status = 'refunded'
          OR r.refund_amount > 0
          OR COALESCE(o.metadata #>> '{razorpay_refund,status}', '') IN ('processed', 'pending')
          OR (o.payment_method = 'wallet' AND o.status IN ('failed', 'cancelled'))
        ) AS refunded,
        CASE
          WHEN o.status = 'refunded'
            OR r.refund_amount > 0
            OR COALESCE(o.metadata #>> '{razorpay_refund,status}', '') IN ('processed', 'pending')
            OR (o.payment_method = 'wallet' AND o.status IN ('failed', 'cancelled'))
          THEN CASE WHEN r.refund_amount > 0 THEN r.refund_amount ELSE o.total_amount END
          ELSE 0
        END AS refund_amount
      FROM public.orders o
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(wt.amount), 0) AS refund_amount
        FROM public.wallet_transactions wt
        WHERE wt.order_id = o.id
          AND wt.type = 'refund'
      ) r ON TRUE
      WHERE o.user_id = NEW.user_id
        AND o.metadata->>'payment_group_id' = v_group
    ) s;

    INSERT INTO public.notification_outbox (user_id, order_id, kind, payload)
    VALUES (
      NEW.user_id,
      v_anchor,
      'cart_settled',
      jsonb_build_object(
        'payment_group_id', v_group,
        'currency', NEW.currency,
        'payment_method', NEW.payment_method,
        'total_amount', v_total,
        'items', v_items
      )
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(wt.amount), 0) INTO v_refund_amount
  FROM public.wallet_transactions wt
  WHERE wt.order_id = NEW.id
    AND wt.type = 'refund';

  v_refunded := NEW.status = 'refunded'
    OR v_refund_amount > 0
    OR COALESCE(NEW.metadata #>> '{razorpay_refund,status}', '') IN ('processed', 'pending')
    OR (NEW.payment_method = 'wallet' AND NEW.status IN ('failed', 'cancelled'));

  IF v_refunded AND v_refund_amount = 0 THEN
    v_refund_amount := NEW.total_amount;
  END IF;

  v_kind := CASE WHEN NEW.status = 'completed' THEN 'order_completed' ELSE 'order_failed' END;

  INSERT INTO public.notification_outbox (user_id, order_id, kind, payload)
  VALUES (
    NEW.user_id,
    NEW.id,
    v_kind,
    jsonb_build_object(
      'order_id', NEW.id,
      'product_name', NEW.product_name,
      'quantity', NEW.quantity,
      'total_amount', NEW.total_amount,
      'currency', NEW.currency,
      'payment_method', NEW.payment_method,
      'outcome', CASE WHEN NEW.status = 'completed' THEN 'done' ELSE 'failed' END,
      'refunded', v_refunded,
      'refund_amount', CASE WHEN v_refunded THEN v_refund_amount ELSE 0 END
    )
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
