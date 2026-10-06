-- ============================================================
-- Pixie-Kat: Restore public-media write policy on storage.objects
--
-- Bug: image uploads from the admin app failed with
--   "new row violates row-level security policy"
-- because storage.objects had NO write policy for the
-- 'public-media' bucket — only "public-media: public read"
-- (SELECT). The INSERT/UPDATE/DELETE grant created by
-- 010_security_remediation.sql was dropped in prod at some
-- point (prod policies had drifted from the migration files).
--
-- Note: prod media/promo policies use is_admin_or_support()
-- (looser than 010's is_admin()). This restore matches the
-- live convention so support staff can manage graphics too.
-- ============================================================

DROP POLICY IF EXISTS "public-media: admin full access" ON storage.objects;
CREATE POLICY "public-media: admin full access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'public-media' AND public.is_admin_or_support())
  WITH CHECK (bucket_id = 'public-media' AND public.is_admin_or_support());
