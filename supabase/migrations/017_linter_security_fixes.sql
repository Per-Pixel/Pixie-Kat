-- ============================================================
-- Pixie-Kat: Supabase Linter Security Fixes
-- Run AFTER 016_security_fixes.sql
-- ============================================================

-- Public buckets serve object URLs without a SELECT policy. Removing
-- this broad policy prevents anonymous clients from listing the bucket.
DROP POLICY IF EXISTS "media: public read" ON storage.objects;

-- Trigger-only functions are invoked by PostgreSQL, not through RPC.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_email_confirmed() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_support_conversation() FROM PUBLIC;

-- Server-only functions are invoked with the service-role client.
REVOKE ALL ON FUNCTION public.adjust_wallet_balance(
  UUID, NUMERIC, public.wallet_tx_type, TEXT, UUID, UUID
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_status(
  UUID, public.user_status, TEXT, UUID
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_activity(
  UUID, public.activity_action, TEXT, INET, TEXT, UUID, JSONB
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_wallet_order(UUID, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance(
  UUID, NUMERIC, public.wallet_tx_type, TEXT, UUID, UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_status(
  UUID, public.user_status, TEXT, UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_activity(
  UUID, public.activity_action, TEXT, INET, TEXT, UUID, JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_wallet_order(UUID, JSONB) TO service_role;

-- RLS helper functions must remain callable by authenticated users because
-- PostgreSQL evaluates the policies that reference them. Anonymous access is
-- unnecessary because all affected private resources require authentication.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_support() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_support_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_support() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_support_conversation(UUID) TO authenticated;

-- Client-facing RPCs are intentionally restricted to signed-in users and
-- enforce caller identity or staff authorization inside their bodies.
REVOKE ALL ON FUNCTION public.get_admin_analytics(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_pending_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_wallet_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_analytics(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_pending_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_wallet_order(
  UUID, UUID, TEXT, NUMERIC, TEXT, JSONB
) TO authenticated;
