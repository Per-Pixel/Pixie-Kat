-- CMS Database Schema for PixieKat
-- This file contains all table definitions for the CMS system

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  visibility JSONB NOT NULL DEFAULT '{"showInNav": true, "showInSitemap": true, "allowSearchEngines": true, "requireAuth": false, "passwordProtected": false, "devices": {"desktop": true, "tablet": true, "mobile": true}}',
  schedule JSONB,
  seo JSONB NOT NULL DEFAULT '{"title": "", "description": "", "keywords": []}',
  sections JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  trashed_at TIMESTAMP,
  trashed_by INTEGER REFERENCES users(id),
  auto_delete_at TIMESTAMP,
  author_id INTEGER REFERENCES users(id),
  version INTEGER DEFAULT 1
);

-- Indexes for pages
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_trashed_at ON pages(trashed_at) WHERE trashed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pages_author_id ON pages(author_id);
CREATE INDEX IF NOT EXISTS idx_pages_created_at ON pages(created_at);
CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON pages(updated_at);

-- Page versions table (for history/undo)
CREATE TABLE IF NOT EXISTS page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id, version)
);

CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_created_at ON page_versions(created_at);

-- Media assets table
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT,
  caption TEXT,
  folder VARCHAR(255),
  tags TEXT[],
  responsive JSONB,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for media assets
CREATE INDEX IF NOT EXISTS idx_media_folder ON media_assets(folder);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_mime_type ON media_assets(mime_type);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media_assets(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_media_tags ON media_assets USING GIN(tags);

-- Media folders table (optional, for better organization)
CREATE TABLE IF NOT EXISTS media_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES media_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on pages
DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-increment version on page update
CREATE OR REPLACE FUNCTION increment_page_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.sections IS DISTINCT FROM NEW.sections OR 
     OLD.title IS DISTINCT FROM NEW.title OR
     OLD.slug IS DISTINCT FROM NEW.slug THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-increment version
DROP TRIGGER IF EXISTS increment_page_version_trigger ON pages;
CREATE TRIGGER increment_page_version_trigger
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION increment_page_version();
