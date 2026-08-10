-- ============================================================
-- Pixie-Kat: Initial Schema
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');
CREATE TYPE user_role   AS ENUM ('user', 'admin', 'reseller', 'support');

CREATE TYPE wallet_tx_type AS ENUM (
  'credit',
  'debit',
  'purchase',
  'refund',
  'referral_bonus',
  'reward_redemption'
);

CREATE TYPE kyc_tier   AS ENUM ('unverified', 'basic', 'verified', 'premium');
CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

CREATE TYPE note_priority AS ENUM ('normal', 'important', 'flag');

CREATE TYPE activity_action AS ENUM (
  'login', 'logout', 'login_failed',
  'profile_update', 'email_change_requested', 'email_changed',
  'password_changed', 'password_reset_requested',
  '2fa_enabled', '2fa_disabled',
  'order_placed', 'order_cancelled', 'order_refunded',
  'wallet_credit', 'wallet_debit',
  'kyc_submitted', 'kyc_approved', 'kyc_rejected',
  'account_suspended', 'account_banned', 'account_reactivated',
  'session_revoked', 'avatar_updated'
);

CREATE TYPE referral_status AS ENUM ('pending', 'active', 'rewarded', 'expired');

-- ============================================================
-- TABLE: profiles
-- One row per auth.users entry. Core user data.
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT '',
  username        TEXT UNIQUE,
  phone           TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  role            user_role    NOT NULL DEFAULT 'user',
  status          user_status  NOT NULL DEFAULT 'active',
  timezone        TEXT         NOT NULL DEFAULT 'UTC',
  language        TEXT         NOT NULL DEFAULT 'en',
  wallet_balance  NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  referral_code   TEXT UNIQUE,
  referred_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email      ON public.profiles(email);
CREATE INDEX idx_profiles_role       ON public.profiles(role);
CREATE INDEX idx_profiles_status     ON public.profiles(status);
CREATE INDEX idx_profiles_ref_code   ON public.profiles(referral_code);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

-- ============================================================
-- TABLE: user_settings
-- One row per user. Notification + display preferences.
-- ============================================================
CREATE TABLE public.user_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications  BOOLEAN NOT NULL DEFAULT TRUE,
  sms_notifications    BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_emails     BOOLEAN NOT NULL DEFAULT TRUE,
  order_notifications  BOOLEAN NOT NULL DEFAULT TRUE,
  login_alerts         BOOLEAN NOT NULL DEFAULT TRUE,
  dark_mode            BOOLEAN NOT NULL DEFAULT FALSE,
  compact_view         BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- ============================================================
-- TABLE: orders
-- Purchase records linked to users.
-- ============================================================
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id      UUID,
  product_name    TEXT NOT NULL DEFAULT '',
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_amount    NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
  currency        TEXT NOT NULL DEFAULT 'PKS',
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'on_hold')),
  payment_method  TEXT,
  payment_id      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id    ON public.orders(user_id);
CREATE INDEX idx_orders_status     ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

-- ============================================================
-- TABLE: wallet_transactions
-- Immutable ledger. Never UPDATE or DELETE rows.
-- ============================================================
CREATE TABLE public.wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          wallet_tx_type NOT NULL,
  amount        NUMERIC(14, 2) NOT NULL,
  balance_after NUMERIC(14, 2) NOT NULL,
  reference     TEXT,
  order_id      UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  actor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_user_id    ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_tx_type       ON public.wallet_transactions(type);
CREATE INDEX idx_wallet_tx_order_id   ON public.wallet_transactions(order_id);

-- ============================================================
-- TABLE: user_status_history
-- Immutable log of every account status change.
-- ============================================================
CREATE TABLE public.user_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_status  user_status,
  new_status  user_status NOT NULL,
  reason      TEXT,
  changed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_hist_user_id    ON public.user_status_history(user_id);
CREATE INDEX idx_status_hist_created_at ON public.user_status_history(created_at DESC);

-- ============================================================
-- TABLE: user_bans
-- Active and historical bans with reason and optional expiry.
-- ============================================================
CREATE TABLE public.user_bans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  banned_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  lifted_at   TIMESTAMPTZ,
  lifted_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lift_reason TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bans_user_id  ON public.user_bans(user_id);
CREATE INDEX idx_bans_active   ON public.user_bans(is_active) WHERE is_active = TRUE;

-- ============================================================
-- TABLE: user_kyc
-- KYC / identity verification state. One row per user.
-- ============================================================
CREATE TABLE public.user_kyc (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier             kyc_tier   NOT NULL DEFAULT 'unverified',
  identity_status  kyc_status NOT NULL DEFAULT 'pending',
  address_status   kyc_status NOT NULL DEFAULT 'pending',
  phone_status     kyc_status NOT NULL DEFAULT 'pending',
  verified_at      TIMESTAMPTZ,
  verified_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_user_id ON public.user_kyc(user_id);
CREATE INDEX idx_kyc_tier    ON public.user_kyc(tier);

-- ============================================================
-- TABLE: user_kyc_history
-- Immutable log of KYC tier changes.
-- ============================================================
CREATE TABLE public.user_kyc_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_tier    kyc_tier,
  new_tier    kyc_tier NOT NULL,
  reason      TEXT,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_hist_user_id ON public.user_kyc_history(user_id);

-- ============================================================
-- TABLE: user_activity_log
-- Append-only audit trail for all significant user actions.
-- ============================================================
CREATE TABLE public.user_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action      activity_action NOT NULL,
  description TEXT,
  ip_address  INET,
  user_agent  TEXT,
  country     TEXT,
  city        TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_user_id         ON public.user_activity_log(user_id);
CREATE INDEX idx_activity_user_created    ON public.user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_action          ON public.user_activity_log(action);
CREATE INDEX idx_activity_created_at      ON public.user_activity_log(created_at DESC);

-- ============================================================
-- TABLE: user_login_history
-- Login attempts (success + failed). Separate from activity for fast security queries.
-- ============================================================
CREATE TABLE public.user_login_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address     INET,
  user_agent     TEXT,
  country        TEXT,
  city           TEXT,
  device_type    TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'unknown')),
  browser        TEXT,
  success        BOOLEAN NOT NULL,
  failure_reason TEXT,
  used_2fa       BOOLEAN NOT NULL DEFAULT FALSE,
  session_id     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_user_id    ON public.user_login_history(user_id);
CREATE INDEX idx_login_created_at ON public.user_login_history(created_at DESC);
CREATE INDEX idx_login_success    ON public.user_login_history(user_id, success);

-- ============================================================
-- TABLE: admin_user_notes
-- Internal staff-only notes on a user. Never shown to the user.
-- ============================================================
CREATE TABLE public.admin_user_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 1000),
  priority    note_priority NOT NULL DEFAULT 'normal',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id  ON public.admin_user_notes(user_id);
CREATE INDEX idx_notes_admin_id ON public.admin_user_notes(admin_id);

-- ============================================================
-- TABLE: user_2fa_config
-- Tracks 2FA enrollment state per user.
-- ============================================================
CREATE TABLE public.user_2fa_config (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_enabled                  BOOLEAN NOT NULL DEFAULT FALSE,
  method                      TEXT NOT NULL DEFAULT 'totp' CHECK (method IN ('totp', 'sms')),
  enabled_at                  TIMESTAMPTZ,
  disabled_at                 TIMESTAMPTZ,
  disabled_by                 UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  backup_codes_generated_at   TIMESTAMPTZ,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_2fa_user_id ON public.user_2fa_config(user_id);

-- ============================================================
-- TABLE: referrals
-- Tracks referrer → referred relationships and commissions.
-- ============================================================
CREATE TABLE public.referrals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id  UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       referral_status NOT NULL DEFAULT 'pending',
  commission   NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  rewarded_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id <> referred_id)
);

CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_status      ON public.referrals(status);

-- ============================================================
-- ROW LEVEL SECURITY — Enable on all tables
-- ============================================================
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_kyc            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_kyc_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_login_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: is_admin_or_support()
-- Returns true if the current session user is admin or support.
-- Used in RLS policies to avoid repetition.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_support()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'support')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================
-- RLS POLICIES: profiles
-- ============================================================
CREATE POLICY "profiles: user reads own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: admin/support reads all"
  ON public.profiles FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "profiles: user updates own (no role/status change)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    role   = (SELECT role   FROM public.profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles: admin updates any"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: user_settings
-- ============================================================
CREATE POLICY "settings: user full access own"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "settings: admin/support reads all"
  ON public.user_settings FOR SELECT
  USING (public.is_admin_or_support());

-- ============================================================
-- RLS POLICIES: orders
-- ============================================================
CREATE POLICY "orders: user reads own"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders: admin/support reads all"
  ON public.orders FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "orders: user inserts own"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders: admin updates any"
  ON public.orders FOR UPDATE
  USING (public.is_admin_or_support());

-- ============================================================
-- RLS POLICIES: wallet_transactions
-- Inserts only via service role (adjust_wallet_balance function).
-- ============================================================
CREATE POLICY "wallet_tx: user reads own"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "wallet_tx: admin/support reads all"
  ON public.wallet_transactions FOR SELECT
  USING (public.is_admin_or_support());

-- ============================================================
-- RLS POLICIES: user_status_history
-- ============================================================
CREATE POLICY "status_hist: admin/support reads all"
  ON public.user_status_history FOR SELECT
  USING (public.is_admin_or_support());

-- ============================================================
-- RLS POLICIES: user_bans
-- ============================================================
CREATE POLICY "bans: admin reads all"
  ON public.user_bans FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "bans: admin writes"
  ON public.user_bans FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "bans: admin updates"
  ON public.user_bans FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: user_kyc
-- ============================================================
CREATE POLICY "kyc: user reads own"
  ON public.user_kyc FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "kyc: admin/support reads all"
  ON public.user_kyc FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "kyc: admin/support updates"
  ON public.user_kyc FOR UPDATE
  USING (public.is_admin_or_support());

-- ============================================================
-- RLS POLICIES: user_kyc_history
-- ============================================================
CREATE POLICY "kyc_hist: user reads own"
  ON public.user_kyc_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "kyc_hist: admin/support reads all"
  ON public.user_kyc_history FOR SELECT
  USING (public.is_admin_or_support());

-- ============================================================
-- RLS POLICIES: user_activity_log
-- ============================================================
CREATE POLICY "activity: user reads own"
  ON public.user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "activity: admin/support reads all"
  ON public.user_activity_log FOR SELECT
  USING (public.is_admin_or_support());

-- ============================================================
-- RLS POLICIES: user_login_history
-- ============================================================
CREATE POLICY "login_hist: user reads own"
  ON public.user_login_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "login_hist: admin/support reads all"
  ON public.user_login_history FOR SELECT
  USING (public.is_admin_or_support());

-- ============================================================
-- RLS POLICIES: admin_user_notes
-- Never exposed to end users.
-- ============================================================
CREATE POLICY "notes: admin/support full access"
  ON public.admin_user_notes FOR ALL
  USING (public.is_admin_or_support())
  WITH CHECK (public.is_admin_or_support());

-- ============================================================
-- RLS POLICIES: user_2fa_config
-- ============================================================
CREATE POLICY "2fa: user reads own"
  ON public.user_2fa_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "2fa: admin/support reads all"
  ON public.user_2fa_config FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "2fa: user updates own"
  ON public.user_2fa_config FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: referrals
-- ============================================================
CREATE POLICY "referrals: user reads own (as referrer)"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "referrals: admin/support reads all"
  ON public.referrals FOR SELECT
  USING (public.is_admin_or_support());
