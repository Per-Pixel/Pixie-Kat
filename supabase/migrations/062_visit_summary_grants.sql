REVOKE ALL ON FUNCTION public.get_visit_summary(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visit_summary(timestamptz, timestamptz) TO authenticated;
