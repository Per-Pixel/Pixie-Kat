-- ============================================================
-- Pixie-Kat: KYC admin insert policy
-- user_kyc had SELECT + UPDATE policies only, so the admin KYC
-- tab could not create a row for profiles that predate the
-- handle_new_profile() trigger (migrated/legacy users). The
-- trigger itself is SECURITY DEFINER and unaffected.
-- ============================================================

DROP POLICY IF EXISTS "kyc: admin inserts" ON public.user_kyc;
CREATE POLICY "kyc: admin inserts"
  ON public.user_kyc FOR INSERT
  WITH CHECK (public.is_admin());
