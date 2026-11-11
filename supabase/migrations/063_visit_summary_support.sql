-- Admins and support both use the dashboard; visitor stats should load for both.

DROP POLICY IF EXISTS site_visits_admin_read ON public.site_visits;
CREATE POLICY site_visits_admin_read
  ON public.site_visits
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_support());

CREATE OR REPLACE FUNCTION public.get_visit_summary(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.is_admin_or_support() THEN jsonb_build_object('people', 0, 'devices', '[]'::jsonb, 'places', '[]'::jsonb)
    ELSE (
      WITH hits AS (
        SELECT
          coalesce(visitor_key, id::text) AS person,
          coalesce(nullif(device, ''), 'Unknown') AS device,
          coalesce(nullif(location, ''), 'Unknown') AS location
        FROM public.site_visits
        WHERE created_at >= COALESCE(p_start, '-infinity'::timestamptz)
          AND created_at <= COALESCE(p_end, 'infinity'::timestamptz)
      )
      SELECT jsonb_build_object(
        'people', (SELECT count(DISTINCT person)::int FROM hits),
        'devices', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('name', device, 'people', people) ORDER BY people DESC, device)
          FROM (
            SELECT device, count(DISTINCT person)::int AS people
            FROM hits
            GROUP BY device
            ORDER BY people DESC, device
            LIMIT 6
          ) device_rows
        ), '[]'::jsonb),
        'places', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('name', location, 'people', people) ORDER BY people DESC, location)
          FROM (
            SELECT location, count(DISTINCT person)::int AS people
            FROM hits
            GROUP BY location
            ORDER BY people DESC, location
            LIMIT 6
          ) place_rows
        ), '[]'::jsonb)
      )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.get_visit_summary(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visit_summary(timestamptz, timestamptz) TO authenticated;
