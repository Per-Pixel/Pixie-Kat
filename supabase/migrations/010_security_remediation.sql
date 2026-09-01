CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.jwt() ->> 'role',
    ''
  ) = 'service_role';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin_or_support()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'support')
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_wallet_balance_non_negative'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_wallet_balance_non_negative
      CHECK (wallet_balance >= 0) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_idempotency_key
  ON public.orders(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_product_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_profile_updates()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role user_role;
  v_caller_status user_status;
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission denied: authenticated session required';
  END IF;

  SELECT role, status
    INTO v_caller_role, v_caller_status
  FROM public.profiles
  WHERE id = auth.uid();

  IF auth.uid() = OLD.id THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
      OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
      OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
      OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
      OR NEW.last_login_at IS DISTINCT FROM OLD.last_login_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Only editable profile fields may be changed';
    END IF;
  ELSIF v_caller_role = 'admin' AND v_caller_status = 'active' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
      OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
      OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
      OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
      OR NEW.last_login_at IS DISTINCT FROM OLD.last_login_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Protected profile fields require a trusted server operation';
    END IF;
  ELSE
    RAISE EXCEPTION 'Permission denied: profile updates require an active account';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_updates_on_update ON public.profiles;
CREATE TRIGGER protect_profile_updates_on_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_updates();

DROP POLICY IF EXISTS "profiles: user reads own" ON public.profiles;
CREATE POLICY "profiles: user reads own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id AND status = 'active');

DROP POLICY IF EXISTS "profiles: admin/support reads all" ON public.profiles;
CREATE POLICY "profiles: admin/support reads all"
  ON public.profiles FOR SELECT
  USING (public.is_admin_or_support());

DROP POLICY IF EXISTS "profiles: user updates own (no role/status change)" ON public.profiles;
CREATE POLICY "profiles: user updates own (safe fields)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id AND status = 'active')
  WITH CHECK (auth.uid() = id AND status = 'active');

DROP POLICY IF EXISTS "profiles: admin updates any" ON public.profiles;
CREATE POLICY "profiles: admin updates any"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.protect_order_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: only active admins may update orders';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.product_id IS DISTINCT FROM OLD.product_id
    OR NEW.product_name IS DISTINCT FROM OLD.product_name
    OR NEW.quantity IS DISTINCT FROM OLD.quantity
    OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
    OR NEW.payment_id IS DISTINCT FROM OLD.payment_id
    OR NEW.metadata IS DISTINCT FROM OLD.metadata
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only order status may be changed by an admin';
  END IF;

  IF NEW.status IN ('completed', 'refunded') THEN
    RAISE EXCEPTION 'Completed and refunded orders require a trusted payment operation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT (
      (OLD.status = 'pending' AND NEW.status IN ('processing', 'cancelled', 'on_hold'))
      OR (OLD.status = 'processing' AND NEW.status IN ('failed', 'on_hold', 'cancelled'))
      OR (OLD.status = 'failed' AND NEW.status = 'pending')
      OR (OLD.status = 'cancelled' AND NEW.status = 'pending')
      OR (OLD.status = 'on_hold' AND NEW.status IN ('processing', 'cancelled'))
    ) THEN
    RAISE EXCEPTION 'Invalid order status transition';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_order_updates_on_update ON public.orders;
CREATE TRIGGER protect_order_updates_on_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_order_updates();

DROP POLICY IF EXISTS "orders: user reads own" ON public.orders;
CREATE POLICY "orders: user reads own"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "orders: admin/support reads all" ON public.orders;
CREATE POLICY "orders: admin/support reads all"
  ON public.orders FOR SELECT
  USING (public.is_admin_or_support());

DROP POLICY IF EXISTS "orders: user inserts own" ON public.orders;
DROP POLICY IF EXISTS "orders: admin updates any" ON public.orders;
CREATE POLICY "orders: admin updates status"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "wallet_tx: user reads own" ON public.wallet_transactions;
CREATE POLICY "wallet_tx: user reads own"
  ON public.wallet_transactions FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "wallet_tx: admin/support reads all" ON public.wallet_transactions;
CREATE POLICY "wallet_tx: admin reads all"
  ON public.wallet_transactions FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "kyc: admin/support reads all" ON public.user_kyc;
CREATE POLICY "kyc: admin reads all"
  ON public.user_kyc FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "kyc: admin/support updates" ON public.user_kyc;
CREATE POLICY "kyc: admin updates"
  ON public.user_kyc FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "activity: admin/support reads all" ON public.user_activity_log;
CREATE POLICY "activity: admin reads all"
  ON public.user_activity_log FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "login_hist: user inserts own" ON public.user_login_history;
DROP POLICY IF EXISTS "login_hist: admin/support reads all" ON public.user_login_history;
CREATE POLICY "login_hist: admin reads all"
  ON public.user_login_history FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "2fa: admin/support reads all" ON public.user_2fa_config;
CREATE POLICY "2fa: admin reads all"
  ON public.user_2fa_config FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "2fa: user updates own" ON public.user_2fa_config;

CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
  p_user_id   UUID,
  p_amount    NUMERIC,
  p_type      wallet_tx_type,
  p_reference TEXT,
  p_actor_id  UUID DEFAULT NULL,
  p_order_id  UUID DEFAULT NULL
)
RETURNS public.wallet_transactions AS $$
DECLARE
  v_balance NUMERIC;
  v_tx public.wallet_transactions;
BEGIN
  IF NOT public.is_service_role() THEN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
      RAISE EXCEPTION 'Permission denied: adjust_wallet_balance requires an active admin';
    END IF;
    IF p_actor_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Permission denied: actor does not match authenticated admin';
    END IF;
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Amount must be non-zero';
  END IF;
  IF p_reference IS NULL OR char_length(btrim(p_reference)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Reference must contain 1-200 characters';
  END IF;
  IF p_type = 'debit' AND p_amount >= 0 THEN
    RAISE EXCEPTION 'Debit amount must be negative';
  END IF;
  IF p_type IN ('credit', 'refund') AND p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit or refund amount must be positive';
  END IF;

  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  IF v_balance + p_amount < 0 THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current: %, Requested debit: %',
      v_balance, ABS(p_amount);
  END IF;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO public.wallet_transactions (
    user_id, type, amount, balance_after, reference, actor_id, order_id
  )
  VALUES (
    p_user_id, p_type, p_amount, v_balance + p_amount,
    btrim(p_reference), p_actor_id, p_order_id
  )
  RETURNING * INTO v_tx;

  INSERT INTO public.user_activity_log (user_id, action, description, actor_id, metadata)
  VALUES (
    p_user_id,
    (CASE WHEN p_amount > 0 THEN 'wallet_credit' ELSE 'wallet_debit' END)::activity_action,
    btrim(p_reference),
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

CREATE OR REPLACE FUNCTION public.update_user_status(
  p_user_id    UUID,
  p_new_status user_status,
  p_reason     TEXT,
  p_actor_id   UUID DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
  v_old_status user_status;
  v_target_role user_role;
  v_profile public.profiles;
  v_action activity_action;
BEGIN
  IF NOT public.is_service_role() THEN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
      RAISE EXCEPTION 'Permission denied: only active admins may update account status';
    END IF;
    IF p_actor_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Permission denied: actor does not match authenticated admin';
    END IF;
  END IF;

  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Reason must contain 3-500 characters';
  END IF;

  SELECT status, role
    INTO v_old_status, v_target_role
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  IF NOT public.is_service_role() AND v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Admin accounts require separate elevated approval';
  END IF;

  IF v_old_status = p_new_status THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    RETURN v_profile;
  END IF;

  v_action := (CASE p_new_status
    WHEN 'suspended' THEN 'account_suspended'
    WHEN 'banned' THEN 'account_banned'
    WHEN 'active' THEN 'account_reactivated'
    ELSE 'account_reactivated'
  END)::activity_action;

  UPDATE public.profiles
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_profile;

  INSERT INTO public.user_status_history (user_id, old_status, new_status, reason, changed_by)
  VALUES (p_user_id, v_old_status, p_new_status, btrim(p_reason), p_actor_id);

  INSERT INTO public.user_activity_log (user_id, action, description, actor_id, metadata)
  VALUES (
    p_user_id, v_action, btrim(p_reason), p_actor_id,
    jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status)
  );

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id     UUID,
  p_action      activity_action,
  p_description TEXT DEFAULT NULL,
  p_ip_address  INET DEFAULT NULL,
  p_user_agent  TEXT DEFAULT NULL,
  p_actor_id    UUID DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Permission denied: activity logging is server-only';
  END IF;

  INSERT INTO public.user_activity_log
    (user_id, action, description, ip_address, user_agent, actor_id, metadata)
  VALUES
    (p_user_id, p_action, p_description, p_ip_address, p_user_agent, p_actor_id, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_service_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_order_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_wallet_balance(UUID, NUMERIC, public.wallet_tx_type, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_status(UUID, public.user_status, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_activity(UUID, public.activity_action, TEXT, INET, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance(UUID, NUMERIC, public.wallet_tx_type, TEXT, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_status(UUID, public.user_status, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_activity(UUID, public.activity_action, TEXT, INET, TEXT, UUID, JSONB) TO service_role;

DROP POLICY IF EXISTS "games: admin inserts" ON public.games;
CREATE POLICY "games: admin inserts"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "games: admin updates" ON public.games;
CREATE POLICY "games: admin updates"
  ON public.games FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "game_fields: admin writes" ON public.game_fields;
CREATE POLICY "game_fields: admin writes"
  ON public.game_fields FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "game_fields: admin updates" ON public.game_fields;
CREATE POLICY "game_fields: admin updates"
  ON public.game_fields FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "game_fields: admin deletes" ON public.game_fields;
CREATE POLICY "game_fields: admin deletes"
  ON public.game_fields FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "products: admin writes" ON public.products;
CREATE POLICY "products: admin writes"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products: admin updates" ON public.products;
CREATE POLICY "products: admin updates"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products: admin deletes" ON public.products;
CREATE POLICY "products: admin deletes"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "promo: admin inserts" ON public.promotional_items;
CREATE POLICY "promo: admin inserts"
  ON public.promotional_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "promo: admin updates" ON public.promotional_items;
CREATE POLICY "promo: admin updates"
  ON public.promotional_items FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "promo: admin deletes" ON public.promotional_items;
CREATE POLICY "promo: admin deletes"
  ON public.promotional_items FOR DELETE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_notification_settings: staff reads" ON public.admin_notification_settings;
CREATE POLICY "admin_notification_settings: admin reads"
  ON public.admin_notification_settings FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_security_settings: staff reads" ON public.admin_security_settings;
CREATE POLICY "admin_security_settings: admin reads"
  ON public.admin_security_settings FOR SELECT
  USING (public.is_admin());

UPDATE storage.buckets
SET public = FALSE
WHERE id = 'media';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-media',
  'public-media',
  TRUE,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "media: public read" ON storage.objects;
DROP POLICY IF EXISTS "media: admin full access" ON storage.objects;
CREATE POLICY "media: admin full access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'media' AND public.is_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_admin());

DROP POLICY IF EXISTS "public-media: admin full access" ON storage.objects;
CREATE POLICY "public-media: admin full access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'public-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'public-media' AND public.is_admin());

DROP POLICY IF EXISTS "media: public reads" ON public.media;
DROP POLICY IF EXISTS "media: admin full access" ON public.media;
CREATE POLICY "media: admin full access"
  ON public.media FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
