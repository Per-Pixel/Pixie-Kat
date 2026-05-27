-- ============================================================
-- Pixie-Kat: Security Hardening
-- Run AFTER 002_functions_triggers.sql
--
-- Fixes the following Supabase security linter warnings:
--   - function_search_path_mutable       → handle_updated_at
--   - public_bucket_allows_listing       → avatars bucket
--   - anon_security_definer_function_executable   → trigger + admin functions
--   - authenticated_security_definer_function_executable → same set
--
-- NOT fixed here (accepted false positives):
--   is_admin() and is_admin_or_support() EXECUTE cannot be revoked from
--   anon/authenticated because PostgreSQL evaluates ALL RLS policies for a
--   table when any query runs. If either role lacks EXECUTE on these helpers,
--   every query against every RLS-protected table raises "permission denied".
--   These functions have no side-effects and return false for unauthenticated
--   callers, so the lint risk is negligible.
--
--   auth_leaked_password_protection → enable in Supabase Dashboard:
--   Auth → Settings → Password Security → Enable leaked password protection
-- ============================================================

-- ============================================================
-- FIX 1: handle_updated_at — mutable search_path
-- Add SET search_path = public to prevent search_path injection.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- FIX 2: Trigger-only functions — revoke direct RPC execution
-- handle_new_user, handle_new_profile, handle_email_confirmed are
-- invoked solely by PostgreSQL triggers. Triggers run under the
-- function owner's privileges and do not require EXECUTE to be
-- granted to any client role.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user()        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_profile()     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_email_confirmed() FROM anon, authenticated;

-- ============================================================
-- FIX 3: Admin/server-only functions — revoke from user-facing roles
-- These are called exclusively by the Express backend via the
-- service_role key. service_role is a superuser-equivalent role
-- and is unaffected by REVOKE on anon/authenticated.
-- adjust_wallet_balance already has an internal role guard, but
-- revoking at the role level adds a second layer of defence.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.adjust_wallet_balance(
  uuid, numeric, public.wallet_tx_type, text, uuid, uuid
) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_user_status(
  uuid, public.user_status, text, uuid
) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.log_activity(
  uuid, public.activity_action, text, inet, text, uuid, jsonb
) FROM anon, authenticated;

-- ============================================================
-- FIX 4: avatars bucket — restrict broad SELECT policy
-- The existing "avatars: public read" policy allows any client
-- to list every file in the bucket via the Storage API.
-- Public URL access (/storage/v1/object/public/...) on a public
-- bucket does NOT require a storage.objects SELECT policy, so
-- dropping the broad policy does not break avatar display.
-- Replace it with a scoped policy that lets each authenticated
-- user only list/download files under their own UID prefix.
-- ============================================================
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;

CREATE POLICY "avatars: authenticated users read own folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
