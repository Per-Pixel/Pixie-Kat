-- ============================================================
-- Pixie-Kat: Fix RLS recursion on profiles (stack depth limit exceeded)
-- Run AFTER 028_footer_and_legal_settings.sql
--
-- Bug: migration 019_security_linter_definitive.sql converted
-- is_admin() and is_admin_or_support() from SECURITY DEFINER to
-- SECURITY INVOKER to silence the Supabase linter warning
-- `authenticated_security_definer_function_executable`.
--
-- That change reintroduced infinite recursion:
--   profiles RLS policy "admin/support reads all"
--     -> calls public.is_admin_or_support()
--       -> reads public.profiles (filtered by auth.uid())
--         -> profiles RLS is evaluated again (INVOKER runs as caller)
--           -> calls public.is_admin_or_support()
--             -> ... stack depth limit exceeded
--
-- Symptom: admin dashboard fails to load profiles and shows
-- "Could not load dashboard data" / "Profiles: stack depth limit
-- exceeded". Any authenticated SELECT on profiles that relies on
-- the admin/support policy hits the recursion.
--
-- Fix: restore SECURITY DEFINER on is_admin() and
-- is_admin_or_support() so the inner profiles read bypasses RLS
-- and terminates. These functions only read profiles filtered by
-- auth.uid() and return false for non-admins, so SECURITY DEFINER
-- is safe and is the standard Supabase pattern for role helpers.
--
-- The linter warning is an accepted false positive (already
-- documented in 018_security_linter_final.sql). Restoring
-- SECURITY DEFINER is the correct tradeoff: working RLS beats a
-- silenced linter.
--
-- can_access_support_conversation() stays SECURITY INVOKER. Its
-- inner is_admin_or_support() call is now recursion-safe, and its
-- support_conversations read is guarded by customer_id = auth.uid()
-- which does not recurse.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin_or_support()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'support')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Reaffirm grants. anon EXECUTE is required for storefront reads
-- (restored by 026); authenticated EXECUTE is required for RLS
-- evaluation on signed-in admin/support sessions.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_support() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_support_conversation(UUID) TO anon, authenticated;
