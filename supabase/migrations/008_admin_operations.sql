-- ============================================================
-- Pixie-Kat: Admin Operations, CMS, Support, and Resellers
-- Run AFTER 007_media_storage.sql
--
-- Adds persistent storage for:
--   - Store, notification, and admin security settings
--   - CMS pages
--   - Customer support conversations and replies
--   - Admin broadcasts and recipient delivery tracking
--   - Reseller-specific profile and commission metadata
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE page_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE support_status AS ENUM ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');
CREATE TYPE support_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE support_sender_type AS ENUM ('customer', 'staff', 'system');
CREATE TYPE broadcast_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');
CREATE TYPE delivery_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');
CREATE TYPE reseller_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- ============================================================
-- TABLE: store_settings
-- Public storefront configuration. This table intentionally
-- contains no gateway secrets or private API credentials.
-- A singleton row is enforced through the boolean primary key.
-- ============================================================
CREATE TABLE public.store_settings (
  id                    BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  store_name            TEXT NOT NULL DEFAULT 'PixieKat',
  support_email         TEXT NOT NULL DEFAULT 'support@pixiekat.com',
  support_phone         TEXT,
  default_currency      TEXT NOT NULL DEFAULT 'PKS',
  timezone              TEXT NOT NULL DEFAULT 'UTC',
  maintenance_mode      BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_message   TEXT,
  tax_rate              NUMERIC(5, 2) NOT NULL DEFAULT 0
                          CHECK (tax_rate BETWEEN 0 AND 100),
  prices_include_tax    BOOLEAN NOT NULL DEFAULT TRUE,
  wallet_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  stripe_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  paypal_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  crypto_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  bank_transfer_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: admin_notification_settings
-- Private notification and reporting preferences for the
-- administration team. Singleton row.
-- ============================================================
CREATE TABLE public.admin_notification_settings (
  id                     BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  email_on_new_order     BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_failed_payment BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_refund        BOOLEAN NOT NULL DEFAULT TRUE,
  email_on_new_user      BOOLEAN NOT NULL DEFAULT FALSE,
  sms_on_new_order       BOOLEAN NOT NULL DEFAULT FALSE,
  sms_recipient          TEXT,
  in_app_notifications   BOOLEAN NOT NULL DEFAULT TRUE,
  daily_revenue_report   BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_analytics_report BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: admin_security_settings
-- Admin-panel policy preferences. Supabase Auth remains the
-- source of truth for passwords, MFA factors, and sessions.
-- ============================================================
CREATE TABLE public.admin_security_settings (
  id                         BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  require_mfa                BOOLEAN NOT NULL DEFAULT FALSE,
  login_alerts               BOOLEAN NOT NULL DEFAULT TRUE,
  failed_attempt_lock        BOOLEAN NOT NULL DEFAULT TRUE,
  max_failed_attempts        SMALLINT NOT NULL DEFAULT 5
                              CHECK (max_failed_attempts BETWEEN 1 AND 20),
  session_timeout_minutes    INTEGER NOT NULL DEFAULT 60
                              CHECK (session_timeout_minutes BETWEEN 5 AND 1440),
  updated_by                 UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: content_pages
-- CMS-managed pages such as About, Privacy, and Terms.
-- `content` is JSONB so pages may store blocks or rich-text
-- document output without another schema migration.
-- ============================================================
CREATE TABLE public.content_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  slug             TEXT NOT NULL UNIQUE,
  excerpt          TEXT,
  content          JSONB NOT NULL DEFAULT '{}',
  seo_title        TEXT,
  seo_description  TEXT,
  featured_image   TEXT,
  status           page_status NOT NULL DEFAULT 'draft',
  published_at     TIMESTAMPTZ,
  author_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_pages_slug_format
    CHECK (slug = '/' OR slug ~ '^/[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$')
);

CREATE INDEX idx_content_pages_status  ON public.content_pages(status);
CREATE INDEX idx_content_pages_updated ON public.content_pages(updated_at DESC);

-- ============================================================
-- TABLE: support_conversations
-- One customer support ticket/thread.
-- ============================================================
CREATE TABLE public.support_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject          TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 200),
  status           support_status NOT NULL DEFAULT 'open',
  priority         support_priority NOT NULL DEFAULT 'medium',
  assigned_to      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  order_id         UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_customer ON public.support_conversations(customer_id, created_at DESC);
CREATE INDEX idx_support_status   ON public.support_conversations(status, last_message_at DESC);
CREATE INDEX idx_support_assignee ON public.support_conversations(assigned_to, status);
CREATE INDEX idx_support_priority ON public.support_conversations(priority, last_message_at DESC);

-- ============================================================
-- TABLE: support_messages
-- Individual customer/staff replies inside a conversation.
-- Attachments contain media/storage references:
-- [{ "name": "...", "url": "...", "mime_type": "...", "size": 0 }]
-- ============================================================
CREATE TABLE public.support_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_type      support_sender_type NOT NULL,
  body             TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  attachments      JSONB NOT NULL DEFAULT '[]',
  is_internal      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  edited_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_attachments_array
    CHECK (jsonb_typeof(attachments) = 'array'),
  CONSTRAINT support_customer_message_not_internal
    CHECK (sender_type <> 'customer' OR is_internal = FALSE)
);

CREATE INDEX idx_support_messages_conversation
  ON public.support_messages(conversation_id, created_at);
CREATE INDEX idx_support_messages_sender
  ON public.support_messages(sender_id, created_at DESC);

-- ============================================================
-- TABLE: admin_broadcasts
-- Outbound admin messages. One row stores the composed message;
-- recipient rows track each delivery independently.
-- ============================================================
CREATE TABLE public.admin_broadcasts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject        TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  body           TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 20000),
  channels       TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[],
  audience       JSONB NOT NULL DEFAULT '{}',
  status         broadcast_status NOT NULL DEFAULT 'draft',
  scheduled_at   TIMESTAMPTZ,
  sent_at        TIMESTAMPTZ,
  created_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT broadcast_channels_present CHECK (cardinality(channels) > 0)
);

CREATE INDEX idx_broadcast_status    ON public.admin_broadcasts(status, created_at DESC);
CREATE INDEX idx_broadcast_scheduled ON public.admin_broadcasts(scheduled_at)
  WHERE status = 'scheduled';

CREATE TABLE public.admin_broadcast_recipients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id   UUID NOT NULL REFERENCES public.admin_broadcasts(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel        TEXT NOT NULL DEFAULT 'in_app',
  status         delivery_status NOT NULL DEFAULT 'pending',
  error_message  TEXT,
  sent_at        TIMESTAMPTZ,
  delivered_at   TIMESTAMPTZ,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT broadcast_recipient_unique UNIQUE (broadcast_id, user_id, channel)
);

CREATE INDEX idx_broadcast_recipient_user
  ON public.admin_broadcast_recipients(user_id, created_at DESC);
CREATE INDEX idx_broadcast_recipient_status
  ON public.admin_broadcast_recipients(status, created_at DESC);

-- ============================================================
-- TABLE: reseller_profiles
-- Extends profiles where role = reseller.
-- ============================================================
CREATE TABLE public.reseller_profiles (
  user_id             UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name        TEXT,
  website             TEXT,
  tier                reseller_tier NOT NULL DEFAULT 'bronze',
  commission_rate     NUMERIC(5, 2) NOT NULL DEFAULT 0
                       CHECK (commission_rate BETWEEN 0 AND 100),
  commission_balance  NUMERIC(14, 2) NOT NULL DEFAULT 0
                       CHECK (commission_balance >= 0),
  total_commission     NUMERIC(14, 2) NOT NULL DEFAULT 0
                       CHECK (total_commission >= 0),
  approved_at         TIMESTAMPTZ,
  approved_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payout_method       TEXT,
  payout_details      JSONB NOT NULL DEFAULT '{}',
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reseller_tier ON public.reseller_profiles(tier);

-- ============================================================
-- VALIDATION TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_reseller_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = NEW.user_id
      AND role = 'reseller'
  ) THEN
    RAISE EXCEPTION 'Profile % must have role reseller', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_reseller_profile_role ON public.reseller_profiles;
CREATE TRIGGER validate_reseller_profile_role
  BEFORE INSERT OR UPDATE OF user_id ON public.reseller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_reseller_profile_role();

CREATE OR REPLACE FUNCTION public.sync_reseller_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'reseller' THEN
    INSERT INTO public.reseller_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND OLD.role = 'reseller' THEN
    DELETE FROM public.reseller_profiles
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_reseller_profile_on_insert ON public.profiles;
CREATE TRIGGER sync_reseller_profile_on_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_reseller_profile();

DROP TRIGGER IF EXISTS sync_reseller_profile_on_role_update ON public.profiles;
CREATE TRIGGER sync_reseller_profile_on_role_update
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_reseller_profile();

CREATE OR REPLACE FUNCTION public.touch_support_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS touch_support_conversation_on_message ON public.support_messages;
CREATE TRIGGER touch_support_conversation_on_message
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_support_conversation();

CREATE OR REPLACE FUNCTION public.set_support_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    NEW.resolved_at := NOW();
  ELSIF NEW.status <> 'resolved' THEN
    NEW.resolved_at := NULL;
  END IF;

  IF NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed' THEN
    NEW.closed_at := NOW();
  ELSIF NEW.status <> 'closed' THEN
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_support_status_timestamps ON public.support_conversations;
CREATE TRIGGER set_support_status_timestamps
  BEFORE UPDATE OF status ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_support_status_timestamps();

-- ============================================================
-- updated_at triggers
-- ============================================================
DROP TRIGGER IF EXISTS set_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER set_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_admin_notification_settings_updated_at ON public.admin_notification_settings;
CREATE TRIGGER set_admin_notification_settings_updated_at
  BEFORE UPDATE ON public.admin_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_admin_security_settings_updated_at ON public.admin_security_settings;
CREATE TRIGGER set_admin_security_settings_updated_at
  BEFORE UPDATE ON public.admin_security_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_content_pages_updated_at ON public.content_pages;
CREATE TRIGGER set_content_pages_updated_at
  BEFORE UPDATE ON public.content_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_support_conversations_updated_at ON public.support_conversations;
CREATE TRIGGER set_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_support_messages_updated_at ON public.support_messages;
CREATE TRIGGER set_support_messages_updated_at
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_admin_broadcasts_updated_at ON public.admin_broadcasts;
CREATE TRIGGER set_admin_broadcasts_updated_at
  BEFORE UPDATE ON public.admin_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_reseller_profiles_updated_at ON public.reseller_profiles;
CREATE TRIGGER set_reseller_profiles_updated_at
  BEFORE UPDATE ON public.reseller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- SUPPORT ACCESS HELPER
-- SECURITY DEFINER avoids policy recursion when message policies
-- check the parent conversation.
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_access_support_conversation(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_admin_or_support()
    OR EXISTS (
      SELECT 1
      FROM public.support_conversations
      WHERE id = p_conversation_id
        AND customer_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.mark_broadcast_read(p_recipient_id UUID)
RETURNS public.admin_broadcast_recipients AS $$
DECLARE
  recipient public.admin_broadcast_recipients;
BEGIN
  UPDATE public.admin_broadcast_recipients
  SET status = 'read',
      read_at = COALESCE(read_at, NOW())
  WHERE id = p_recipient_id
    AND user_id = auth.uid()
  RETURNING * INTO recipient;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Broadcast recipient not found or access denied';
  END IF;

  RETURN recipient;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.mark_broadcast_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_broadcast_read(UUID) TO authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.store_settings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_security_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_broadcasts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_broadcast_recipients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_profiles            ENABLE ROW LEVEL SECURITY;

-- Store settings: public read, admin write.
CREATE POLICY "store_settings: public reads"
  ON public.store_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "store_settings: admin inserts"
  ON public.store_settings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "store_settings: admin updates"
  ON public.store_settings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Private admin settings.
CREATE POLICY "admin_notification_settings: staff reads"
  ON public.admin_notification_settings FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "admin_notification_settings: admin inserts"
  ON public.admin_notification_settings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_notification_settings: admin updates"
  ON public.admin_notification_settings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_security_settings: staff reads"
  ON public.admin_security_settings FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "admin_security_settings: admin inserts"
  ON public.admin_security_settings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_security_settings: admin updates"
  ON public.admin_security_settings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- CMS pages.
CREATE POLICY "content_pages: public reads published"
  ON public.content_pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "content_pages: staff reads all"
  ON public.content_pages FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "content_pages: admin inserts"
  ON public.content_pages FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "content_pages: admin updates"
  ON public.content_pages FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "content_pages: admin deletes"
  ON public.content_pages FOR DELETE
  USING (public.is_admin());

-- Support conversations.
CREATE POLICY "support_conversations: customer reads own"
  ON public.support_conversations FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "support_conversations: staff reads all"
  ON public.support_conversations FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "support_conversations: customer creates own"
  ON public.support_conversations FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    AND assigned_to IS NULL
    AND status = 'open'
  );

CREATE POLICY "support_conversations: staff creates"
  ON public.support_conversations FOR INSERT
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "support_conversations: staff updates"
  ON public.support_conversations FOR UPDATE
  USING (public.is_admin_or_support())
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "support_conversations: admin deletes"
  ON public.support_conversations FOR DELETE
  USING (public.is_admin());

-- Support messages.
CREATE POLICY "support_messages: participants read"
  ON public.support_messages FOR SELECT
  USING (
    public.can_access_support_conversation(conversation_id)
    AND (is_internal = FALSE OR public.is_admin_or_support())
  );

CREATE POLICY "support_messages: customer replies"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type = 'customer'
    AND is_internal = FALSE
    AND public.can_access_support_conversation(conversation_id)
  );

CREATE POLICY "support_messages: staff replies"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    public.is_admin_or_support()
    AND sender_id = auth.uid()
    AND sender_type = 'staff'
  );

CREATE POLICY "support_messages: staff updates"
  ON public.support_messages FOR UPDATE
  USING (public.is_admin_or_support())
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "support_messages: admin deletes"
  ON public.support_messages FOR DELETE
  USING (public.is_admin());

-- Broadcast composition and delivery.
CREATE POLICY "admin_broadcasts: staff reads"
  ON public.admin_broadcasts FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "admin_broadcasts: user reads received"
  ON public.admin_broadcasts FOR SELECT
  USING (
    status IN ('sending', 'sent')
    AND EXISTS (
      SELECT 1
      FROM public.admin_broadcast_recipients recipient
      WHERE recipient.broadcast_id = admin_broadcasts.id
        AND recipient.user_id = auth.uid()
    )
  );

CREATE POLICY "admin_broadcasts: staff inserts"
  ON public.admin_broadcasts FOR INSERT
  WITH CHECK (
    public.is_admin_or_support()
    AND created_by = auth.uid()
  );

CREATE POLICY "admin_broadcasts: staff updates"
  ON public.admin_broadcasts FOR UPDATE
  USING (public.is_admin_or_support())
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "admin_broadcasts: admin deletes"
  ON public.admin_broadcasts FOR DELETE
  USING (public.is_admin());

CREATE POLICY "broadcast_recipients: user reads own"
  ON public.admin_broadcast_recipients FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "broadcast_recipients: staff reads"
  ON public.admin_broadcast_recipients FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "broadcast_recipients: staff inserts"
  ON public.admin_broadcast_recipients FOR INSERT
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "broadcast_recipients: staff updates"
  ON public.admin_broadcast_recipients FOR UPDATE
  USING (public.is_admin_or_support())
  WITH CHECK (public.is_admin_or_support());

CREATE POLICY "broadcast_recipients: admin deletes"
  ON public.admin_broadcast_recipients FOR DELETE
  USING (public.is_admin());

-- Reseller metadata.
CREATE POLICY "reseller_profiles: reseller reads own"
  ON public.reseller_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "reseller_profiles: staff reads all"
  ON public.reseller_profiles FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "reseller_profiles: admin inserts"
  ON public.reseller_profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "reseller_profiles: admin updates"
  ON public.reseller_profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "reseller_profiles: admin deletes"
  ON public.reseller_profiles FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- DEFAULT ROWS
-- ============================================================
INSERT INTO public.store_settings (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_notification_settings (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_security_settings (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.content_pages (title, slug, status, published_at, content)
VALUES
  ('Home Page', '/', 'published', NOW(), '{"type":"system","note":"Homepage sections are managed separately."}'::JSONB),
  ('About Us', '/about', 'draft', NULL, '{}'::JSONB),
  ('Privacy Policy', '/privacy', 'draft', NULL, '{}'::JSONB),
  ('Terms of Service', '/terms', 'draft', NULL, '{}'::JSONB)
ON CONFLICT (slug) DO NOTHING;

-- Create reseller metadata for profiles that already have the
-- reseller role when this migration is applied.
INSERT INTO public.reseller_profiles (user_id)
SELECT id
FROM public.profiles
WHERE role = 'reseller'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- REALTIME
-- ============================================================
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'store_settings',
    'content_pages',
    'support_conversations',
    'support_messages',
    'admin_broadcast_recipients',
    'reseller_profiles'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        table_name
      );
    END IF;
  END LOOP;
END;
$$;
