-- Landing visits for the admin dashboard. Meta ad link clicks only show up
-- after the storefront page actually loads and posts /api/track-visit.

CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  path text NOT NULL,
  source text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_host text,
  has_fbclid boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS site_visits_created_at_idx
  ON public.site_visits (created_at DESC);

CREATE INDEX IF NOT EXISTS site_visits_source_created_idx
  ON public.site_visits (source, created_at DESC);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_visits_admin_read ON public.site_visits;
CREATE POLICY site_visits_admin_read
  ON public.site_visits
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_visit_summary(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_meta integer;
  v_campaigns jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE source = 'meta')::integer
  INTO v_total, v_meta
  FROM public.site_visits
  WHERE (p_start IS NULL OR created_at >= p_start)
    AND (p_end IS NULL OR created_at <= p_end);

  SELECT coalesce(jsonb_agg(row_to_json(c)::jsonb), '[]'::jsonb)
  INTO v_campaigns
  FROM (
    SELECT coalesce(nullif(utm_campaign, ''), '(no campaign name)') AS campaign,
           count(*)::integer AS visits
    FROM public.site_visits
    WHERE source = 'meta'
      AND (p_start IS NULL OR created_at >= p_start)
      AND (p_end IS NULL OR created_at <= p_end)
    GROUP BY 1
    ORDER BY visits DESC, campaign
    LIMIT 5
  ) c;

  RETURN jsonb_build_object(
    'total', coalesce(v_total, 0),
    'meta', coalesce(v_meta, 0),
    'other', greatest(coalesce(v_total, 0) - coalesce(v_meta, 0), 0),
    'campaigns', coalesce(v_campaigns, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_visit_summary(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visit_summary(timestamptz, timestamptz) TO authenticated;
