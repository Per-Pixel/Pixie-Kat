-- ============================================================
-- Pixie-Kat: Media Manager
-- Run AFTER 006_promotional_items.sql
--
-- Adds a dedicated `media` bucket and tracking table so the
-- admin panel can browse, rename, replace, compress, and
-- download every uploaded asset — and see exactly which game,
-- product, promo, or profile is using it.
-- ============================================================

-- ============================================================
-- BUCKET: media
-- Public read for CDN URLs; admin-only write via RLS.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  TRUE,
  104857600, -- 100 MB
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'image/svg+xml',
    'video/mp4', 'video/mpeg', 'video/webm', 'video/avi', 'video/x-msvideo', 'video/3gpp', 'video/quicktime',
    'application/pdf',
    'application/zip', 'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop old policies if re-running
DROP POLICY IF EXISTS "media: public read" ON storage.objects;
DROP POLICY IF EXISTS "media: admin full access" ON storage.objects;

-- Anyone can read public media (CDN URLs work without auth)
CREATE POLICY "media: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Only admin/support can upload / update / delete in media bucket
CREATE POLICY "media: admin full access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'media'
    AND public.is_admin_or_support()
  )
  WITH CHECK (
    bucket_id = 'media'
    AND public.is_admin_or_support()
  );

-- ============================================================
-- TABLE: media
-- Metadata mirror for every file in the `media` bucket.
-- The actual bytes live in Supabase Storage; this row is the
-- index the admin panel queries for browsing & usage tracking.
-- ============================================================
CREATE TABLE public.media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename      TEXT NOT NULL,                     -- display name (editable)
  storage_path  TEXT NOT NULL,                     -- bucket/folder/file.ext
  bucket        TEXT NOT NULL DEFAULT 'media',
  mime_type     TEXT,
  size_bytes    BIGINT,
  width         INTEGER,
  height        INTEGER,
  public_url    TEXT NOT NULL,
  alt_text      TEXT,
  tags          TEXT[] DEFAULT '{}',
  uploaded_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_bucket_path ON public.media(bucket, storage_path);
CREATE INDEX idx_media_filename     ON public.media(filename);
CREATE INDEX idx_media_created      ON public.media(created_at DESC);

-- ============================================================
-- updated_at trigger
-- ============================================================
DROP TRIGGER IF EXISTS set_media_updated_at ON public.media;
CREATE TRIGGER set_media_updated_at
  BEFORE UPDATE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media: public reads"
  ON public.media FOR SELECT
  USING (TRUE);

CREATE POLICY "media: admin full access"
  ON public.media FOR ALL
  USING (public.is_admin_or_support())
  WITH CHECK (public.is_admin_or_support());
