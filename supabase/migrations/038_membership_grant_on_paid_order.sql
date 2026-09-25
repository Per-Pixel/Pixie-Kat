-- ============================================================
-- Pixie-Kat: Grant membership add-on when its order is paid
-- Run AFTER 037_fix_smileone_synced_product_name.sql
--
-- Game checkout can attach a membership plan to a top-up via
-- metadata.pricing.selected_membership_plan_id, and the customer
-- is charged plan.price on top (validate_order_amount bills it).
-- Nothing ever wrote the user_memberships row, so buyers paid
-- for a plan that never activated.
--
-- This trigger grants the membership once the order reaches a
-- paid state ('processing' — payment confirmed, or 'completed'),
-- and cancels it again if the order is later refunded/failed/
-- cancelled so money and benefit stay consistent.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_membership_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  -- Grant on payment confirmation
  IF NEW.status IN ('processing', 'completed')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    BEGIN
      v_plan_id := NULLIF(NEW.metadata #>> '{pricing,selected_membership_plan_id}', '')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      v_plan_id := NULL;
    END;

    IF v_plan_id IS NOT NULL THEN
      INSERT INTO public.user_memberships (
        user_id, membership_plan_id, status, started_at, expires_at, source_order_id
      )
      SELECT
        NEW.user_id, mp.id, 'active', NOW(),
        NOW() + make_interval(days => mp.duration_days), NEW.id
      FROM public.membership_plans mp
      WHERE mp.id = v_plan_id
        AND mp.is_active = TRUE
        -- idempotent: this order already granted a membership
        AND NOT EXISTS (
          SELECT 1 FROM public.user_memberships um
          WHERE um.source_order_id = NEW.id
        )
        -- don't stack: user already holds an active plan
        AND NOT EXISTS (
          SELECT 1 FROM public.user_memberships um
          WHERE um.user_id = NEW.user_id
            AND um.status = 'active'
            AND um.expires_at > NOW()
        );
    END IF;
  END IF;

  -- Revoke when the paying order is undone
  IF TG_OP = 'UPDATE'
     AND NEW.status IN ('failed', 'refunded', 'cancelled')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.user_memberships
    SET status = 'cancelled'
    WHERE source_order_id = NEW.id
      AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_sync_membership ON public.orders;
CREATE TRIGGER trg_orders_sync_membership
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_membership_from_order();

-- Idempotency backstop: at most one membership per source order
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_memberships_source_order
  ON public.user_memberships(source_order_id)
  WHERE source_order_id IS NOT NULL;
