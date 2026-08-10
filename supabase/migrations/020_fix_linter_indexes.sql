-- ============================================================
-- Pixie-Kat: Database Linter Index Fixes
-- Run AFTER 019_security_linter_definitive.sql
--
-- Adds covering indexes for foreign-key columns reported by the
-- Supabase database linter and removes indexes reported as unused.
-- All statements are idempotent so this migration can be safely
-- re-run in the SQL Editor.
-- ============================================================

-- ============================================================
-- PART 1: Covering indexes for unindexed foreign keys
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by
  ON public.profiles(referred_by);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id
  ON public.wallet_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id
  ON public.wallet_transactions(order_id);

CREATE INDEX IF NOT EXISTS idx_user_status_history_user_id
  ON public.user_status_history(user_id);

CREATE INDEX IF NOT EXISTS idx_user_bans_user_id
  ON public.user_bans(user_id);

CREATE INDEX IF NOT EXISTS idx_user_kyc_history_user_id
  ON public.user_kyc_history(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id
  ON public.user_activity_log(user_id);

CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id
  ON public.user_login_history(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_user_notes_user_id
  ON public.admin_user_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_user_notes_admin_id
  ON public.admin_user_notes(admin_id);

CREATE INDEX IF NOT EXISTS idx_user_2fa_config_user_id
  ON public.user_2fa_config(user_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id
  ON public.referrals(referrer_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_id
  ON public.referrals(referred_id);

CREATE INDEX IF NOT EXISTS idx_game_fields_game_id
  ON public.game_fields(game_id);

CREATE INDEX IF NOT EXISTS idx_products_game_id
  ON public.products(game_id);

CREATE INDEX IF NOT EXISTS idx_promotional_items_game_id
  ON public.promotional_items(game_id);

CREATE INDEX IF NOT EXISTS idx_media_uploaded_by
  ON public.media(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_support_conversations_order_id
  ON public.support_conversations(order_id);

CREATE INDEX IF NOT EXISTS idx_support_conversations_assigned_to
  ON public.support_conversations(assigned_to);

CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id
  ON public.support_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_user_memberships_source_order_id
  ON public.user_memberships(source_order_id);

-- ============================================================
-- PART 2: Drop indexes reported as unused by the linter
-- ============================================================

DROP INDEX IF EXISTS public.idx_profiles_email;
DROP INDEX IF EXISTS public.idx_profiles_role;
DROP INDEX IF EXISTS public.idx_profiles_status;
DROP INDEX IF EXISTS public.idx_profiles_ref_code;
DROP INDEX IF EXISTS public.idx_profiles_created_at;
DROP INDEX IF EXISTS public.idx_user_settings_user_id;
DROP INDEX IF EXISTS public.idx_orders_status;
DROP INDEX IF EXISTS public.idx_orders_created_at;
DROP INDEX IF EXISTS public.idx_wallet_tx_created_at;
DROP INDEX IF EXISTS public.idx_wallet_tx_type;
DROP INDEX IF EXISTS public.idx_status_hist_created_at;
DROP INDEX IF EXISTS public.idx_bans_active;
DROP INDEX IF EXISTS public.idx_kyc_tier;
DROP INDEX IF EXISTS public.idx_activity_action;
DROP INDEX IF EXISTS public.idx_activity_created_at;
DROP INDEX IF EXISTS public.idx_login_created_at;
DROP INDEX IF EXISTS public.idx_login_success;
DROP INDEX IF EXISTS public.idx_membership_plans_active;
DROP INDEX IF EXISTS public.idx_user_memberships_user_active;
DROP INDEX IF EXISTS public.idx_content_pages_status;
DROP INDEX IF EXISTS public.idx_content_pages_updated;
DROP INDEX IF EXISTS public.idx_support_status;
DROP INDEX IF EXISTS public.idx_support_priority;
DROP INDEX IF EXISTS public.idx_support_messages_sender;
DROP INDEX IF EXISTS public.idx_broadcast_status;
DROP INDEX IF EXISTS public.idx_broadcast_scheduled;
DROP INDEX IF EXISTS public.idx_broadcast_recipient_status;
DROP INDEX IF EXISTS public.idx_reseller_tier;
DROP INDEX IF EXISTS public.idx_media_filename;
DROP INDEX IF EXISTS public.idx_media_created;
