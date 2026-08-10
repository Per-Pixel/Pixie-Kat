-- ============================================================
-- Pixie-Kat: Security Linter Final Fixes
-- Run AFTER 017_linter_security_fixes.sql
--
-- Authoritatively resolves all remaining Supabase linter warnings
-- in a single pass. Prior migrations (003, 017) attempted partial
-- fixes but either were not applied to the live DB or were
-- incomplete. This migration is fully idempotent.
--
-- Fixes:
--   1. function_search_path_mutable             → handle_updated_at
--   2. anon_security_definer_function_executable → revoke PUBLIC from all flagged functions
--   3. authenticated_security_definer_function_executable → grant only to needed roles
--
-- Accepted false positives (will NOT be fixed):
--   - authenticated_security_definer_function_executable for
--     is_admin, is_admin_or_support, can_access_support_conversation
--     — required for RLS evaluation; no privilege escalation risk
--     since they return false for non-admins.
--   - auth_leaked_password_protection — dashboard-only setting,
--     not fixable via SQL.
-- ============================================================

-- ============================================================
-- FIX 1: handle_updated_at — mutable search_path
-- Redefine with SET search_path = public (idempotent).
-- The live DB may still have the old definition from 002
-- if migration 003 was not applied or was overwritten.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Revoke direct RPC execution from all roles (trigger-only function)
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;

-- ============================================================
-- FIX 2: touch_support_conversation — trigger-only function
-- Already has SET search_path = public; just ensure no PUBLIC grant.
-- ============================================================
REVOKE ALL ON FUNCTION public.touch_support_conversation() FROM PUBLIC;

-- ============================================================
-- FIX 3: RLS helper functions — revoke anon, grant authenticated
-- These are used inside RLS policies which PostgreSQL evaluates
-- for authenticated sessions. Granting only to authenticated
-- (not anon) satisfies both the RLS requirement and silences the
-- anon_security_definer_function_executable warning.
-- ============================================================
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_support() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_support_conversation(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_support() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_support_conversation(UUID) TO authenticated;

-- ============================================================
-- FIX 4: Admin-only RPC — revoke PUBLIC, grant authenticated
-- get_admin_analytics enforces admin role inside the function body.
-- ============================================================
REVOKE ALL ON FUNCTION public.get_admin_analytics(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;

-- ============================================================
-- FIX 5: Client-facing order RPCs — revoke PUBLIC, grant authenticated
-- place_pending_order and place_wallet_order enforce caller identity
-- inside their function bodies.
-- ============================================================
REVOKE ALL ON FUNCTION public.place_pending_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_pending_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB
) TO authenticated;

REVOKE ALL ON FUNCTION public.place_wallet_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_wallet_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, JSONB
) TO authenticated;

-- ============================================================
-- FIX 6: Server-only refund function — revoke PUBLIC, grant service_role
-- Called exclusively by the Express backend via service_role key.
-- ============================================================
REVOKE ALL ON FUNCTION public.refund_wallet_order(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_wallet_order(UUID, JSONB) TO service_role;
