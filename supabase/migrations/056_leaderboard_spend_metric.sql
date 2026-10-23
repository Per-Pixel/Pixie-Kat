-- ============================================================
-- Pixie-Kat: Leaderboard ranks by total spend, not order count
-- Run AFTER 043_leaderboard.sql
--
-- Monthly rank = SUM(total_amount) of completed orders in the
-- period (PKS wallet is pegged 1:1 with INR so summing the order
-- currency column is meaningful). order_count is still computed,
-- stored and shown as a secondary stat — only the ordering flips.
--
-- Redefines: compute_leaderboard, get_leaderboard,
-- get_my_rank_history, get_admin_leaderboard,
-- finalize_leaderboard_period (CREATE OR REPLACE keeps grants).
-- Flips store_settings.metric + show_amounts (a spend-ranked board
-- that hides spend is meaningless; the admin toggle still works).
-- ============================================================

ALTER TABLE public.leaderboard_periods
  ALTER COLUMN metric SET DEFAULT 'total_spent';

UPDATE public.store_settings
SET leaderboard_settings = leaderboard_settings
  || '{"metric":"total_spent","show_amounts":true}'::jsonb
WHERE id = TRUE;

-- Standings for a month, ranked by spend. Tie-breaks: earlier last
-- completed order wins, then user_id for determinism.
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
  ORDER BY COALESCE(SUM(o.total_amount), 0) DESC, MAX(o.created_at) ASC, p.id;
END;
$$;

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
        ROW_NUMBER() OVER (ORDER BY c.total_spent DESC, c.last_order_at ASC, c.user_id) AS rank,
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
    'metric',     COALESCE(v_settings->>'metric', 'total_spent'),
    'show_amounts', v_show_amounts,
    'periods',    COALESCE((
      SELECT jsonb_agg(lp.period ORDER BY lp.period DESC)
      FROM public.leaderboard_periods lp
    ), '[]'::jsonb),
    'rows',       v_rows
  );
END;
$$;

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
      a.total_spent,
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
      r.total_spent,
      NULL::TEXT AS tier,
      FALSE AS finalized
    FROM months m
    LEFT JOIN LATERAL (
      SELECT t.rank, t.order_count, t.total_spent FROM (
        SELECT
          c.user_id,
          c.order_count,
          c.total_spent,
          ROW_NUMBER() OVER (ORDER BY c.total_spent DESC, c.last_order_at ASC, c.user_id) AS rank
        FROM public.compute_leaderboard(m.period, TRUE) c
      ) t WHERE t.user_id = v_uid
    ) r ON TRUE
    WHERE m.period NOT IN (SELECT period FROM finalized)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'period',      u.period,
    'rank',        u.rank,
    'order_count', u.order_count,
    'total_spent', u.total_spent,
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
      SELECT c.*, ROW_NUMBER() OVER (ORDER BY c.total_spent DESC, c.last_order_at ASC, c.user_id) AS rank
      FROM public.compute_leaderboard(v_period, FALSE) c
    ) t;

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
    'metric', COALESCE(v_settings->>'metric', 'total_spent'),
    'rows', v_rows,
    'excluded', COALESCE(v_excluded, '[]'::jsonb),
    'tiers', v_tiers
  );
END;
$$;

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

  INSERT INTO public.leaderboard_periods (period, metric, finalized_by)
  VALUES (p_period, COALESCE(v_settings->>'metric', 'total_spent'), v_admin);

  FOR rec IN
    SELECT c.*, ROW_NUMBER() OVER (ORDER BY c.total_spent DESC, c.last_order_at ASC, c.user_id) AS rank
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
        'total_spent', rec.total_spent,
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
