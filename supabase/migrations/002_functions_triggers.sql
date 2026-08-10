-- ============================================================
-- Pixie-Kat: Functions & Triggers
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- FUNCTION: generate_referral_code()
-- Generates a unique 8-char alphanumeric referral code.
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars   TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code    TEXT    := '';
  i       INTEGER;
  exists  BOOLEAN;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- FUNCTION: handle_new_user()
-- Triggered on auth.users INSERT.
-- Creates a matching profiles row + default child rows.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_code TEXT;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  v_code := public.generate_referral_code();

  INSERT INTO public.profiles (id, email, name, referral_code, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_code,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: fire after every new Supabase Auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: handle_new_profile()
-- Triggered on profiles INSERT.
-- Auto-creates default rows in child tables.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  INSERT INTO public.user_kyc (user_id)      VALUES (NEW.id);
  INSERT INTO public.user_2fa_config (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================
-- FUNCTION: handle_email_confirmed()
-- Triggered on auth.users UPDATE when email_confirmed_at is set.
-- Syncs email_verified flag to profiles.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET email_verified = TRUE, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmed();

-- ============================================================
-- FUNCTION: handle_updated_at()
-- Generic trigger to auto-update `updated_at` timestamp.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_kyc_updated_at ON public.user_kyc;
CREATE TRIGGER set_user_kyc_updated_at
  BEFORE UPDATE ON public.user_kyc
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_2fa_updated_at ON public.user_2fa_config;
CREATE TRIGGER set_user_2fa_updated_at
  BEFORE UPDATE ON public.user_2fa_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_notes_updated_at ON public.admin_user_notes;
CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.admin_user_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNCTION: adjust_wallet_balance()
-- ATOMIC wallet credit/debit. Called via Express server only.
-- The SECURITY DEFINER + role check means:
--   - Service role (Express) → allowed when auth.uid() IS NULL
--   - Admin user JWT         → allowed when caller role = admin
--   - Regular user JWT       → rejected
-- ============================================================
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
  p_user_id   UUID,
  p_amount    NUMERIC,
  p_type      wallet_tx_type,
  p_reference TEXT,
  p_actor_id  UUID  DEFAULT NULL,
  p_order_id  UUID  DEFAULT NULL
)
RETURNS public.wallet_transactions AS $$
DECLARE
  v_caller_role TEXT;
  v_balance     NUMERIC;
  v_tx          public.wallet_transactions;
BEGIN
  -- Permission check: allow service role (auth.uid() IS NULL) or admin role
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
    IF v_caller_role NOT IN ('admin', 'support') THEN
      RAISE EXCEPTION 'Permission denied: adjust_wallet_balance requires admin role';
    END IF;
  END IF;

  -- Validate amount is non-zero
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must be non-zero';
  END IF;

  -- Lock the user row to prevent race conditions
  SELECT wallet_balance INTO v_balance
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Prevent negative balance
  IF v_balance + p_amount < 0 THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current: %, Requested debit: %',
      v_balance, ABS(p_amount);
  END IF;

  -- Update wallet balance atomically
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount,
      updated_at     = NOW()
  WHERE id = p_user_id;

  -- Write immutable ledger entry
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, balance_after, reference, actor_id, order_id
  )
  VALUES (
    p_user_id, p_type, p_amount, v_balance + p_amount,
    p_reference, p_actor_id, p_order_id
  )
  RETURNING * INTO v_tx;

  -- Write activity log entry
  INSERT INTO public.user_activity_log (user_id, action, description, actor_id, metadata)
  VALUES (
    p_user_id,
    (CASE WHEN p_amount > 0 THEN 'wallet_credit' ELSE 'wallet_debit' END)::activity_action,
    p_reference,
    p_actor_id,
    jsonb_build_object(
      'amount', p_amount,
      'balance_after', v_balance + p_amount,
      'type', p_type,
      'tx_id', v_tx.id
    )
  );

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- FUNCTION: update_user_status()
-- Changes a user's status and logs the change.
-- Called via Express server (admin operations).
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_status(
  p_user_id    UUID,
  p_new_status user_status,
  p_reason     TEXT,
  p_actor_id   UUID DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
  v_old_status  user_status;
  v_profile     public.profiles;
  v_action      activity_action;
BEGIN
  SELECT status INTO v_old_status FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  IF v_old_status = p_new_status THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    RETURN v_profile;
  END IF;

  -- Determine activity action
  v_action := (CASE p_new_status
    WHEN 'suspended' THEN 'account_suspended'
    WHEN 'banned'    THEN 'account_banned'
    WHEN 'active'    THEN 'account_reactivated'
    ELSE 'account_reactivated'
  END)::activity_action;

  UPDATE public.profiles
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  INSERT INTO public.user_status_history (user_id, old_status, new_status, reason, changed_by)
  VALUES (p_user_id, v_old_status, p_new_status, p_reason, p_actor_id);

  INSERT INTO public.user_activity_log (user_id, action, description, actor_id, metadata)
  VALUES (
    p_user_id, v_action, p_reason, p_actor_id,
    jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status)
  );

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- FUNCTION: log_activity()
-- Convenience wrapper for inserting activity log entries.
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id     UUID,
  p_action      activity_action,
  p_description TEXT    DEFAULT NULL,
  p_ip_address  INET    DEFAULT NULL,
  p_user_agent  TEXT    DEFAULT NULL,
  p_actor_id    UUID    DEFAULT NULL,
  p_metadata    JSONB   DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.user_activity_log
    (user_id, action, description, ip_address, user_agent, actor_id, metadata)
  VALUES
    (p_user_id, p_action, p_description, p_ip_address, p_user_agent, p_actor_id, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- REALTIME: Enable publication for live-sync tables
-- These tables push changes to subscribed frontend clients.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wallet_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_2fa_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_2fa_config;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_kyc'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_kyc;
  END IF;
END $$;
