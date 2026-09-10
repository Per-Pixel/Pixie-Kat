-- ============================================================
-- Pixie-Kat: Public Media Bucket Audio Support
-- Ensures the public-media bucket exists and accepts audio files
-- used by the storefront (loop.mp3, sound effects, etc.)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-media',
  'public-media',
  TRUE,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/opus',
    'application/pdf', 'application/zip', 'text/plain', 'text/csv',
    'image/x-icon'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public-media: public read" ON storage.objects;
CREATE POLICY "public-media: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-media');
