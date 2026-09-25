-- ============================================================
-- Pixie-Kat: Support request inbox
-- Run AFTER 038_membership_grant_on_paid_order.sql
--
-- The storefront support/contact forms previously discarded
-- submissions client-side. This table persists them so the
-- admin Messages page can triage real customer tickets.
-- ============================================================

CREATE TABLE public.support_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  order_id    TEXT,
  category    TEXT,
  subject     TEXT NOT NULL DEFAULT '',
  message     TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('support', 'contact')),
  status      TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'open', 'resolved')),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_requests_status     ON public.support_requests(status, created_at DESC);
CREATE INDEX idx_support_requests_email      ON public.support_requests(email);
CREATE INDEX idx_support_requests_created_at ON public.support_requests(created_at DESC);

DROP TRIGGER IF EXISTS set_support_requests_updated_at ON public.support_requests;
CREATE TRIGGER set_support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a ticket, signed in or not
CREATE POLICY "support_requests: anyone submits"
  ON public.support_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name <> '' AND email <> '' AND message <> ''
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Signed-in users can see their own tickets
CREATE POLICY "support_requests: user reads own"
  ON public.support_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin/support triage
CREATE POLICY "support_requests: admin reads all"
  ON public.support_requests FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "support_requests: admin updates"
  ON public.support_requests FOR UPDATE
  USING (public.is_admin_or_support())
  WITH CHECK (public.is_admin_or_support());
