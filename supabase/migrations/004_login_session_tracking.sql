-- ============================================================
-- Pixie-Kat: Login Session Tracking
-- Run AFTER 003_security_hardening.sql
-- ============================================================

-- Let authenticated users record their own successful browser sessions.
-- Admin/support users can already read these rows through existing policies.
CREATE POLICY "login_hist: user inserts own"
  ON public.user_login_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
