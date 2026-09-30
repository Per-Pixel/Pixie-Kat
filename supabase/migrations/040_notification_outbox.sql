-- ============================================================
-- Pixie-Kat: Notification outbox
-- Run AFTER 039_support_requests.sql
--
-- Notification preference toggles in user_settings persisted but
-- nothing ever sent. This table is the queue: a trigger on
-- orders.status enqueues a row for every meaningful transition
-- (covers wallet, Razorpay, Aluu, cart, and admin status flips),
-- and the API server drains it via SMTP, honouring each user's
-- email_notifications / order_notifications / login_alerts flags.
-- Rows double as the future in-app notification feed.
-- ============================================================

CREATE TABLE public.notification_outbox (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id     UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN (
    'order_processing', 'order_completed', 'order_failed',
    'order_refunded', 'login_alert'
  )),
  payload      JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'skipped', 'failed')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Poller lookup
CREATE INDEX idx_notification_outbox_pending
  ON public.notification_outbox(id) WHERE status = 'pending';
-- Future in-app feed / user read
CREATE INDEX idx_notification_outbox_user
  ON public.notification_outbox(user_id, created_at DESC);
-- One email per order per kind (processing->completed->refunded each send once)
CREATE UNIQUE INDEX uq_notification_outbox_order_kind
  ON public.notification_outbox(order_id, kind) WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enqueue_order_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kind TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  kind := CASE NEW.status
    WHEN 'processing' THEN 'order_processing'
    WHEN 'completed'  THEN 'order_completed'
    WHEN 'failed'     THEN 'order_failed'
    WHEN 'refunded'   THEN 'order_refunded'
    ELSE NULL
  END;

  IF kind IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notification_outbox (user_id, order_id, kind, payload)
  VALUES (NEW.user_id, NEW.id, kind, jsonb_build_object(
    'order_id',       NEW.id,
    'product_name',   NEW.product_name,
    'quantity',       NEW.quantity,
    'total_amount',   NEW.total_amount,
    'currency',       NEW.currency,
    'payment_method', NEW.payment_method
  ))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enqueue_notification ON public.orders;
CREATE TRIGGER orders_enqueue_notification
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_order_notification();

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Signed-in users can read their own notifications (future in-app bell)
CREATE POLICY "notification_outbox: user reads own"
  ON public.notification_outbox FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin/support can inspect delivery state
CREATE POLICY "notification_outbox: admin reads all"
  ON public.notification_outbox FOR SELECT
  USING (public.is_admin_or_support());
