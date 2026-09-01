-- ============================================================
-- Pixie-Kat: Restore anon EXECUTE on RLS helper functions
-- Run AFTER 025_appearance_settings.sql
--
-- Bug: migrations 018/019 revoked EXECUTE on is_admin() /
-- is_admin_or_support() / can_access_support_conversation()
-- from anon to silence the security linter. PostgreSQL
-- evaluates ALL permissive RLS policies for a table, so anon
-- SELECT on public tables (games, products, promotional_items,
-- …) fails with:
--   permission denied for function is_admin_or_support
-- even when the public "status = active" policy would allow it.
--
-- These helpers are SECURITY INVOKER and return false when
-- auth.uid() is null — granting EXECUTE to anon is safe and
-- required for storefront reads. Documented as an accepted
-- false positive in 003_security_hardening.sql.
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_support() TO anon;
GRANT EXECUTE ON FUNCTION public.can_access_support_conversation(UUID) TO anon;
