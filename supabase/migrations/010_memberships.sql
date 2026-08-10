-- ============================================================
-- Pixie-Kat: Membership Plans
-- Run AFTER 009_providers_region.sql
-- ============================================================

CREATE TABLE public.membership_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  slug                 TEXT NOT NULL UNIQUE,
  description          TEXT,
  discount_percent     NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  price                NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency             TEXT NOT NULL DEFAULT 'INR',
  duration_days        INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  benefits             JSONB NOT NULL DEFAULT '[]',
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  metadata             JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_membership_plans_active ON public.membership_plans(is_active, sort_order);

CREATE TABLE public.user_memberships (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_plan_id   UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
  started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at           TIMESTAMPTZ NOT NULL,
  source_order_id      UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  metadata             JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_memberships_user_active
  ON public.user_memberships(user_id, status, expires_at DESC);

CREATE INDEX idx_user_memberships_plan
  ON public.user_memberships(membership_plan_id);

DROP TRIGGER IF EXISTS set_membership_plans_updated_at ON public.membership_plans;
CREATE TRIGGER set_membership_plans_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_memberships_updated_at ON public.user_memberships;
CREATE TRIGGER set_user_memberships_updated_at
  BEFORE UPDATE ON public.user_memberships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_plans: public reads active"
  ON public.membership_plans FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "membership_plans: admin reads all"
  ON public.membership_plans FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "membership_plans: admin inserts"
  ON public.membership_plans FOR INSERT
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "membership_plans: admin updates"
  ON public.membership_plans FOR UPDATE
  USING (public.is_admin_or_support())
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "membership_plans: admin deletes"
  ON public.membership_plans FOR DELETE
  USING (public.is_admin());

CREATE POLICY "user_memberships: user reads own"
  ON public.user_memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_memberships: admin reads all"
  ON public.user_memberships FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "user_memberships: admin writes"
  ON public.user_memberships FOR INSERT
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "user_memberships: admin updates"
  ON public.user_memberships FOR UPDATE
  USING (public.is_admin_or_support())
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "user_memberships: admin deletes"
  ON public.user_memberships FOR DELETE
  USING (public.is_admin());

INSERT INTO public.membership_plans
  (name, slug, description, discount_percent, price, currency, duration_days, benefits, sort_order)
VALUES
  (
    'Silver',
    'silver',
    'Entry membership with instant discounts on eligible top-ups.',
    3,
    99,
    'INR',
    30,
    '["3% off eligible game packs", "Member pricing shown at checkout", "Priority wallet processing"]'::jsonb,
    1
  ),
  (
    'Gold',
    'gold',
    'Higher savings for regular players.',
    5,
    199,
    'INR',
    30,
    '["5% off eligible game packs", "Member pricing shown at checkout", "Priority wallet processing"]'::jsonb,
    2
  )
ON CONFLICT (slug) DO NOTHING;
