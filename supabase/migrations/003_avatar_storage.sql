-- ============================================================
-- Pixie-Kat: Profile avatar storage
-- Creates a public bucket and allows users/admins to manage profile pictures.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars: users upload own" ON storage.objects;
DROP POLICY IF EXISTS "avatars: users update own" ON storage.objects;
DROP POLICY IF EXISTS "avatars: users delete own" ON storage.objects;
DROP POLICY IF EXISTS "avatars: admins manage all" ON storage.objects;

CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars: users upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars: users update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars: users delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars: admins manage all"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'avatars'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.is_admin()
  );
