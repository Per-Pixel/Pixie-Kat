-- ============================================================
-- Pixie-Kat: Leaderboard, monthly rank history & rank perks
-- Run AFTER 042_mlbb_blocked_regions.sql
--
-- Public order-count leaderboard (completed orders per month),
-- admin-finalized monthly awards, and materialized perks on
-- profiles (avatar frame + GIF avatar privilege + wallet bonus).
--
-- Design notes:
--   * Standings are computed from orders for live/un-finalized
--     months; finalized months are frozen in leaderboard_awards.
--   * user_perks is the source of truth for perks (leaderboard
--     grants carry source_period + expires_at; admin grants are
--     permanent unless expires_at set). profiles.avatar_frame /
--     profiles.perks are a materialized cache maintained by
--     refresh_user_perks() so reads stay trivial everywhere.
--   * Leaderboard perks expire at the start of period+2 months,
--     so winning September holds perks through October; the next
--     finalize refreshes winners.
--   * Excluded from public standings: admin/support roles,
--     non-active accounts, leaderboard_exclude (admin-set) and
--     leaderboard_opt_out (user-set). Opt-out users still see
--     their own private rank history.
-- ============================================================

-- ============================================================
-- 1. profiles columns
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_frame        TEXT,
  ADD COLUMN IF NOT EXISTS perks               JSONB    NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS leaderboard_opt_out BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS leaderboard_exclude BOOLEAN  NOT NULL DEFAULT FALSE;

-- ============================================================
-- 2. Lock perk columns for self-updates
--    protect_profile_updates() is the real column gate (010);
--    the user UPDATE RLS policies OR together so the trigger is
--    authoritative. Self-update pins the perk columns; admin
--    updates may change them (needed by finalize/grants).
--    leaderboard_opt_out stays user-writable.
-- ============================================================
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
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.avatar_frame IS DISTINCT FROM OLD.avatar_frame
      OR NEW.perks IS DISTINCT FROM OLD.perks
      OR NEW.leaderboard_exclude IS DISTINCT FROM OLD.leaderboard_exclude THEN
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

-- ============================================================
-- 3. Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leaderboard_periods (
  period            TEXT PRIMARY KEY CHECK (period ~ '^\d{4}-\d{2}$'),
  metric            TEXT NOT NULL DEFAULT 'completed_orders',
  participant_count INTEGER NOT NULL DEFAULT 0,
  finalized_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.leaderboard_awards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period       TEXT NOT NULL REFERENCES public.leaderboard_periods(period) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank         INTEGER NOT NULL CHECK (rank > 0),
  order_count  INTEGER NOT NULL DEFAULT 0,
  total_spent  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tier         TEXT,
  finalized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period, user_id),
  UNIQUE (period, rank)
);

CREATE TABLE IF NOT EXISTS public.user_perks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  perk          TEXT NOT NULL,
  value         TEXT,
  source        TEXT NOT NULL CHECK (source IN ('leaderboard', 'admin')),
  source_period TEXT,
  expires_at    TIMESTAMPTZ,
  granted_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, perk)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_awards_period ON public.leaderboard_awards(period, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_awards_user   ON public.leaderboard_awards(user_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_user_perks_user           ON public.user_perks(user_id);
-- Leaderboard scans: completed orders grouped per user per month
CREATE INDEX IF NOT EXISTS idx_orders_leaderboard
  ON public.orders(user_id, created_at) WHERE status = 'completed';

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE public.leaderboard_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_awards  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_perks          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaderboard_periods: public reads"
  ON public.leaderboard_periods FOR SELECT
  USING (TRUE);

CREATE POLICY "leaderboard_awards: user reads own"
  ON public.leaderboard_awards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "leaderboard_awards: admin/support reads all"
  ON public.leaderboard_awards FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "user_perks: user reads own"
  ON public.user_perks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_perks: admin/support reads all"
  ON public.user_perks FOR SELECT
  USING (public.is_admin_or_support());

CREATE POLICY "user_perks: admin inserts"
  ON public.user_perks FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "user_perks: admin updates"
  ON public.user_perks FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "user_perks: admin deletes"
  ON public.user_perks FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- 5. store_settings.leaderboard_settings
-- ============================================================
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS leaderboard_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.store_settings
SET leaderboard_settings = '{
  "enabled": true,
  "metric": "completed_orders",
  "show_amounts": false,
  "teaser_count": 5,
  "history_months": 12,
  "tiers": [
    {"id": "champion", "min_rank": 1,  "max_rank": 1,  "label": "Champion", "frame": "champion", "gif_avatar": true,  "wallet_bonus": 250},
    {"id": "diamond",  "min_rank": 2,  "max_rank": 3,  "label": "Diamond",  "frame": "diamond",  "gif_avatar": true,  "wallet_bonus": 100},
    {"id": "gold",     "min_rank": 4,  "max_rank": 10, "label": "Gold",     "frame": "gold",     "gif_avatar": false, "wallet_bonus": 50}
  ]
}'::jsonb
WHERE id = TRUE AND leaderboard_settings = '{}'::jsonb;

-- ============================================================
-- 6. Helpers
-- ============================================================

-- Display name for public rows: username, else masked name.
CREATE OR REPLACE FUNCTION public.leaderboard_display_name(p_name TEXT, p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_name TEXT := btrim(COALESCE(p_name, ''));
BEGIN
  IF p_username IS NOT NULL AND btrim(p_username) <> '' THEN
    RETURN btrim(p_username);
  END IF;
  IF v_name = '' THEN
    RETURN 'Player';
  END IF;
  IF char_length(v_name) <= 2 THEN
    RETURN left(v_name, 1) || '***';
  END IF;
  RETURN left(v_name, 1) || '***' || right(v_name, 1);
END;
$$;

-- Is a perk currently active for a user? (used by storage policy + UI)
CREATE OR REPLACE FUNCTION public.user_has_perk(p_user_id UUID, p_perk TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_perks
    WHERE user_id = p_user_id
      AND perk = p_perk
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

-- Recompute materialized perk cache on profiles.
-- avatar_frame: admin-granted frame wins over leaderboard frame;
-- otherwise latest grant wins. perks: jsonb map of active boolean perks.
CREATE OR REPLACE FUNCTION public.refresh_user_perks(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_frame TEXT;
  v_perks JSONB;
BEGIN
  -- SECURITY DEFINER granted to authenticated for admin-panel use;
  -- only trusted callers may recompute another user's perk cache.
  IF NOT public.is_service_role() AND NOT public.is_admin_or_support() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT value INTO v_frame
  FROM public.user_perks
  WHERE user_id = p_user_id
    AND perk = 'avatar_frame'
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY (source = 'admin') DESC, created_at DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_object_agg(perk, TRUE), '{}'::jsonb) INTO v_perks
  FROM public.user_perks
  WHERE user_id = p_user_id
    AND perk <> 'avatar_frame'
    AND (expires_at IS NULL OR expires_at > NOW());

  UPDATE public.profiles
  SET avatar_frame = v_frame,
      perks        = v_perks
  WHERE id = p_user_id;
END;
$$;

-- Standings for a month. p_period = 'YYYY-MM'.
-- Ranked pool excludes staff, non-active accounts, admin exclusions,
-- and (unless p_include_opt_out) opted-out users. Ties: earlier last
-- completed order wins; user_id for total determinism.
CREATE OR REPLACE FUNCTION public.compute_leaderboard(
  p_period          TEXT,
  p_include_opt_out BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  user_id      UUID,
  order_count  BIGINT,
  total_spent  NUMERIC,
  last_order_at TIMESTAMPTZ,
  display_name TEXT,
  avatar_url   TEXT,
  avatar_frame TEXT,
  email        TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end   TIMESTAMPTZ;
BEGIN
  v_start := (p_period || '-01')::date::timestamptz;
  v_end   := v_start + INTERVAL '1 month';

  RETURN QUERY
  SELECT
    p.id,
    COUNT(o.id),
    COALESCE(SUM(o.total_amount), 0),
    MAX(o.created_at),
    public.leaderboard_display_name(p.name, p.username),
    p.avatar_url,
    p.avatar_frame,
    p.email
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.user_id
  WHERE o.status = 'completed'
    AND o.created_at >= v_start
    AND o.created_at <  v_end
    AND p.role NOT IN ('admin', 'support')
    AND p.status = 'active'
    AND p.leaderboard_exclude = FALSE
    AND (p_include_opt_out OR p.leaderboard_opt_out = FALSE)
  GROUP BY p.id, p.name, p.username, p.avatar_url, p.avatar_frame, p.email
  ORDER BY COUNT(o.id) DESC, MAX(o.created_at) ASC, p.id;
END;
$$;

-- ============================================================
-- 7. Public RPCs
-- ============================================================

-- Public leaderboard. NULL period = live current month.
-- Finalized months read frozen awards; unfinalized months compute
-- live and flag rows provisional.
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_period TEXT DEFAULT NULL,
  p_limit  INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings   JSONB;
  v_period     TEXT;
  v_finalized  BOOLEAN := FALSE;
  v_rows       JSONB;
  v_show_amounts BOOLEAN := FALSE;
  v_limit      INTEGER;
BEGIN
  SELECT leaderboard_settings INTO v_settings FROM public.store_settings WHERE id = TRUE;
  IF COALESCE((v_settings->>'enabled')::BOOLEAN, TRUE) IS NOT TRUE THEN
    RETURN jsonb_build_object('enabled', FALSE, 'rows', '[]'::jsonb);
  END IF;

  v_show_amounts := COALESCE((v_settings->>'show_amounts')::BOOLEAN, FALSE);
  v_period := COALESCE(NULLIF(p_period, ''), to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM'));
  IF v_period !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid period format, expected YYYY-MM';
  END IF;
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);

  v_finalized := EXISTS (SELECT 1 FROM public.leaderboard_periods WHERE period = v_period);

  IF v_finalized THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb - 'user_id' ORDER BY t.rank), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT
        a.rank,
        public.leaderboard_display_name(p.name, p.username) AS display_name,
        p.avatar_url,
        p.avatar_frame,
        a.order_count,
        a.tier,
        CASE WHEN v_show_amounts THEN a.total_spent ELSE NULL END AS total_spent,
        a.user_id
      FROM public.leaderboard_awards a
      JOIN public.profiles p ON p.id = a.user_id
      WHERE a.period = v_period
      ORDER BY a.rank
      LIMIT v_limit
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb - 'user_id' ORDER BY t.rank), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT
        ROW_NUMBER() OVER (ORDER BY c.order_count DESC, c.last_order_at ASC, c.user_id) AS rank,
        c.display_name,
        c.avatar_url,
        c.avatar_frame,
        c.order_count,
        NULL::TEXT AS tier,
        CASE WHEN v_show_amounts THEN c.total_spent ELSE NULL END AS total_spent,
        c.user_id
      FROM public.compute_leaderboard(v_period, FALSE) c
      LIMIT v_limit
    ) t;
  END IF;

  RETURN jsonb_build_object(
    'enabled',    TRUE,
    'period',     v_period,
    'finalized',  v_finalized,
    'metric',     COALESCE(v_settings->>'metric', 'completed_orders'),
    'show_amounts', v_show_amounts,
    'periods',    COALESCE((
      SELECT jsonb_agg(lp.period ORDER BY lp.period DESC)
      FROM public.leaderboard_periods lp
    ), '[]'::jsonb),
    'rows',       v_rows
  );
END;
$$;

-- Signed-in user's own monthly rank history. Opted-out users are
-- ranked against the full pool (private view); hidden flag marks rows
-- excluded from the public board.
CREATE OR REPLACE FUNCTION public.get_my_rank_history(
  p_months  INTEGER DEFAULT 12,
  p_user_id UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        UUID := COALESCE(p_user_id, auth.uid());
  v_opted_out  BOOLEAN;
  v_excluded   BOOLEAN;
  v_months     INTEGER := LEAST(GREATEST(COALESCE(p_months, 12), 1), 36);
  v_rows       JSONB;
BEGIN
  -- Service role (auth.uid() IS NULL) may read any user; authenticated
  -- callers may only read themselves unless admin/support.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF auth.uid() IS NOT NULL
     AND v_uid IS DISTINCT FROM auth.uid()
     AND NOT public.is_admin_or_support() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT leaderboard_opt_out, leaderboard_exclude
    INTO v_opted_out, v_excluded
  FROM public.profiles WHERE id = v_uid;

  WITH months AS (
    SELECT to_char(date_trunc('month', NOW() AT TIME ZONE 'UTC') - (n || ' months')::interval, 'YYYY-MM') AS period
    FROM generate_series(0, v_months - 1) AS n
  ),
  finalized AS (
    SELECT
      a.period,
      a.rank,
      a.order_count,
      a.tier,
      TRUE AS finalized
    FROM public.leaderboard_awards a
    WHERE a.user_id = v_uid
      AND a.period IN (SELECT period FROM months)
  ),
  live AS (
    SELECT
      m.period,
      r.rank,
      r.order_count,
      NULL::TEXT AS tier,
      FALSE AS finalized
    FROM months m
    LEFT JOIN LATERAL (
      SELECT t.rank, t.order_count FROM (
        SELECT
          c.user_id,
          c.order_count,
          ROW_NUMBER() OVER (ORDER BY c.order_count DESC, c.last_order_at ASC, c.user_id) AS rank
        FROM public.compute_leaderboard(m.period, TRUE) c
      ) t WHERE t.user_id = v_uid
    ) r ON TRUE
    WHERE m.period NOT IN (SELECT period FROM finalized)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'period',      u.period,
    'rank',        u.rank,
    'order_count', u.order_count,
    'finalized',   u.finalized,
    'tier',        u.tier,
    'hidden',      COALESCE(v_excluded, FALSE) OR COALESCE(v_opted_out, FALSE),
    'hidden_reason', CASE WHEN v_excluded THEN 'excluded' WHEN v_opted_out THEN 'opted_out' ELSE NULL END
  ) ORDER BY u.period DESC), '[]'::jsonb)
  INTO v_rows
  FROM (SELECT * FROM finalized UNION ALL SELECT * FROM live) u
  WHERE u.rank IS NOT NULL OR u.finalized;

  RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;

-- Admin preview: standings as finalize would produce them, plus the
-- filtered-out users and per-row tier that would be awarded.
CREATE OR REPLACE FUNCTION public.get_admin_leaderboard(p_period TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings JSONB;
  v_tiers    JSONB;
  v_period   TEXT;
  v_rows     JSONB;
  v_excluded JSONB;
  v_finalized BOOLEAN := FALSE;
BEGIN
  -- Service role (server proxy) passes; user JWTs need admin/support.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_or_support() THEN
    RAISE EXCEPTION 'Unauthorised';
  END IF;

  SELECT leaderboard_settings INTO v_settings FROM public.store_settings WHERE id = TRUE;
  v_tiers := COALESCE(v_settings->'tiers', '[]'::jsonb);
  v_period := COALESCE(NULLIF(p_period, ''), to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM'));
  v_finalized := EXISTS (SELECT 1 FROM public.leaderboard_periods WHERE period = v_period);

  IF v_finalized THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'rank', t.rank, 'user_id', t.user_id, 'email', t.email,
      'display_name', public.leaderboard_display_name(t.name, t.username),
      'avatar_url', t.avatar_url, 'avatar_frame', t.avatar_frame,
      'order_count', t.order_count, 'total_spent', t.total_spent,
      'tier', t.tier, 'opted_out', t.leaderboard_opt_out, 'excluded', t.leaderboard_exclude
    ) ORDER BY t.rank), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT a.rank, a.user_id, p.email, p.name, p.username, p.avatar_url, p.avatar_frame,
             a.order_count, a.total_spent, a.tier, p.leaderboard_opt_out, p.leaderboard_exclude
      FROM public.leaderboard_awards a
      JOIN public.profiles p ON p.id = a.user_id
      WHERE a.period = v_period
    ) t;
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'rank', t.rank, 'user_id', t.user_id, 'email', t.email,
      'display_name', t.display_name, 'avatar_url', t.avatar_url, 'avatar_frame', t.avatar_frame,
      'order_count', t.order_count, 'total_spent', t.total_spent,
      'tier', (
        SELECT tier->>'id' FROM jsonb_array_elements(v_tiers) tier
        WHERE t.rank >= (tier->>'min_rank')::int AND t.rank <= (tier->>'max_rank')::int
        LIMIT 1
      ),
      'opted_out', FALSE, 'excluded', FALSE
    ) ORDER BY t.rank), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT c.*, ROW_NUMBER() OVER (ORDER BY c.order_count DESC, c.last_order_at ASC, c.user_id) AS rank
      FROM public.compute_leaderboard(v_period, FALSE) c
    ) t;

    -- Filtered-out users so the admin can review before finalizing
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'user_id', p.id, 'email', p.email,
      'display_name', public.leaderboard_display_name(p.name, p.username),
      'order_count', t.order_count,
      'reason', CASE
        WHEN p.role IN ('admin', 'support') THEN 'staff'
        WHEN p.status <> 'active' THEN 'inactive'
        WHEN p.leaderboard_exclude THEN 'excluded'
        WHEN p.leaderboard_opt_out THEN 'opted_out'
        ELSE 'other' END
    )), '[]'::jsonb)
    INTO v_excluded
    FROM (
      SELECT o.user_id, COUNT(o.id) AS order_count
      FROM public.orders o
      WHERE o.status = 'completed'
        AND o.created_at >= (v_period || '-01')::date::timestamptz
        AND o.created_at <  ((v_period || '-01')::date + INTERVAL '1 month')
      GROUP BY o.user_id
    ) t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE p.role IN ('admin', 'support')
       OR p.status <> 'active'
       OR p.leaderboard_exclude
       OR p.leaderboard_opt_out;
  END IF;

  RETURN jsonb_build_object(
    'period', v_period,
    'finalized', v_finalized,
    'metric', COALESCE(v_settings->>'metric', 'completed_orders'),
    'rows', v_rows,
    'excluded', COALESCE(v_excluded, '[]'::jsonb),
    'tiers', v_tiers
  );
END;
$$;

-- Finalize a month: freeze standings, grant tier perks + wallet
-- bonuses, enqueue winner emails. One-shot — raises if the period is
-- already finalized or not fully elapsed.
CREATE OR REPLACE FUNCTION public.finalize_leaderboard_period(
  p_period   TEXT,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin    UUID := COALESCE(p_admin_id, auth.uid());
  v_settings JSONB;
  v_tiers    JSONB;
  v_start    TIMESTAMPTZ;
  v_end      TIMESTAMPTZ;
  v_expiry   TIMESTAMPTZ;
  v_count    INTEGER := 0;
  v_winners  INTEGER := 0;
  rec        RECORD;
  v_tier     JSONB;
BEGIN
  -- Service role (server proxy) passes; user JWTs need admin role.
  -- adjust_wallet_balance applies the same rule, so wallet prizes
  -- stay consistent when finalize runs under either caller.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorised: finalize requires admin role';
  END IF;

  IF p_period IS NULL OR p_period !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid period format, expected YYYY-MM';
  END IF;

  v_start := (p_period || '-01')::date::timestamptz;
  v_end   := v_start + INTERVAL '1 month';
  IF v_end > NOW() THEN
    RAISE EXCEPTION 'Period % has not ended yet', p_period;
  END IF;
  IF EXISTS (SELECT 1 FROM public.leaderboard_periods WHERE period = p_period) THEN
    RAISE EXCEPTION 'Period % is already finalized', p_period;
  END IF;

  SELECT leaderboard_settings INTO v_settings FROM public.store_settings WHERE id = TRUE;
  v_tiers := COALESCE(v_settings->'tiers', '[]'::jsonb);
  v_expiry := (v_start + INTERVAL '2 months')::date::timestamptz;

  -- Freeze participant count then insert award rows
  INSERT INTO public.leaderboard_periods (period, metric, finalized_by)
  VALUES (p_period, COALESCE(v_settings->>'metric', 'completed_orders'), v_admin);

  FOR rec IN
    SELECT c.*, ROW_NUMBER() OVER (ORDER BY c.order_count DESC, c.last_order_at ASC, c.user_id) AS rank
    FROM public.compute_leaderboard(p_period, FALSE) c
  LOOP
    SELECT tier INTO v_tier FROM jsonb_array_elements(v_tiers) tier
    WHERE rec.rank >= (tier->>'min_rank')::int AND rec.rank <= (tier->>'max_rank')::int
    LIMIT 1;

    INSERT INTO public.leaderboard_awards
      (period, user_id, rank, order_count, total_spent, tier, finalized_by)
    VALUES
      (p_period, rec.user_id, rec.rank, rec.order_count, rec.total_spent, v_tier->>'id', v_admin);

    v_count := v_count + 1;

    IF v_tier IS NOT NULL THEN
      v_winners := v_winners + 1;

      IF COALESCE(v_tier->>'frame', '') <> '' THEN
        INSERT INTO public.user_perks (user_id, perk, value, source, source_period, expires_at, granted_by)
        VALUES (rec.user_id, 'avatar_frame', v_tier->>'frame', 'leaderboard', p_period, v_expiry, v_admin)
        ON CONFLICT (user_id, perk) DO UPDATE
          SET value = EXCLUDED.value, source = EXCLUDED.source,
              source_period = EXCLUDED.source_period, expires_at = EXCLUDED.expires_at,
              granted_by = EXCLUDED.granted_by;
      END IF;

      IF COALESCE((v_tier->>'gif_avatar')::BOOLEAN, FALSE) THEN
        INSERT INTO public.user_perks (user_id, perk, source, source_period, expires_at, granted_by)
        VALUES (rec.user_id, 'gif_avatar', 'leaderboard', p_period, v_expiry, v_admin)
        ON CONFLICT (user_id, perk) DO UPDATE
          SET source = EXCLUDED.source, source_period = EXCLUDED.source_period,
              expires_at = EXCLUDED.expires_at, granted_by = EXCLUDED.granted_by;
      END IF;

      IF COALESCE((v_tier->>'wallet_bonus')::NUMERIC, 0) > 0 THEN
        PERFORM public.adjust_wallet_balance(
          rec.user_id,
          (v_tier->>'wallet_bonus')::NUMERIC,
          'reward_redemption',
          format('Leaderboard %s rank #%s prize', p_period, rec.rank),
          v_admin
        );
      END IF;

      INSERT INTO public.notification_outbox (user_id, kind, payload)
      VALUES (rec.user_id, 'leaderboard_winner', jsonb_build_object(
        'period', p_period,
        'rank', rec.rank,
        'order_count', rec.order_count,
        'tier', v_tier->>'id',
        'tier_label', v_tier->>'label',
        'frame', v_tier->>'frame',
        'gif_avatar', COALESCE((v_tier->>'gif_avatar')::BOOLEAN, FALSE),
        'wallet_bonus', COALESCE((v_tier->>'wallet_bonus')::NUMERIC, 0)
      ));
    END IF;

    PERFORM public.refresh_user_perks(rec.user_id);
  END LOOP;

  UPDATE public.leaderboard_periods SET participant_count = v_count WHERE period = p_period;

  RETURN jsonb_build_object(
    'period', p_period,
    'participants', v_count,
    'winners', v_winners
  );
END;
$$;

-- ============================================================
-- 8. Grants
-- ============================================================
REVOKE ALL ON FUNCTION public.leaderboard_display_name(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_leaderboard(TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_user_perks(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_perk(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_rank_history(INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_leaderboard(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_leaderboard_period(TEXT, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_rank_history(INTEGER, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_leaderboard(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_leaderboard_period(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_perk(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_user_perks(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_leaderboard(TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_display_name(TEXT, TEXT) TO authenticated, service_role;

-- ============================================================
-- 9. GIF avatar gate on storage (avatars bucket)
-- ============================================================
DROP POLICY IF EXISTS "avatars: users upload own" ON storage.objects;
CREATE POLICY "avatars: users upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND CASE
      WHEN lower(storage.extension(name)) = 'gif'
        OR COALESCE(metadata->>'mimetype', '') = 'image/gif'
      THEN public.user_has_perk(auth.uid(), 'gif_avatar')
      ELSE TRUE
    END
  );

DROP POLICY IF EXISTS "avatars: users update own" ON storage.objects;
CREATE POLICY "avatars: users update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND CASE
      WHEN lower(storage.extension(name)) = 'gif'
        OR COALESCE(metadata->>'mimetype', '') = 'image/gif'
      THEN public.user_has_perk(auth.uid(), 'gif_avatar')
      ELSE TRUE
    END
  );

-- ============================================================
-- 10. notification_outbox: new kind for winner announcements
-- ============================================================
ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_kind_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_kind_check CHECK (kind IN (
    'order_processing', 'order_completed', 'order_failed',
    'order_refunded', 'login_alert', 'leaderboard_winner'
  ));
