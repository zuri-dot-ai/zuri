-- ============================================================
-- CATEGORY IMAGES STORAGE (docs/02_WEBSITE_BUILDER.md §3.3)
-- Public bucket for curated archetype/slot image library.
-- Table create is idempotent in case 20260716_website_builder_v2
-- templates migration has not been applied yet.
-- ============================================================

CREATE TABLE IF NOT EXISTS category_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype text NOT NULL,
  slot_type text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  tags text[],
  width integer,
  height integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_images_archetype_slot
  ON category_images(archetype, slot_type);

ALTER TABLE category_images ENABLE ROW LEVEL SECURITY;

-- Public read (sites + editor curated search); writes only via service role
DROP POLICY IF EXISTS "Category images are publicly readable" ON category_images;
CREATE POLICY "Category images are publicly readable"
  ON category_images FOR SELECT USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-images',
  'category-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read of objects in category-images
DROP POLICY IF EXISTS "Public read category-images" ON storage.objects;
CREATE POLICY "Public read category-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-images');

-- Authenticated admins may upload/update/delete (service role bypasses RLS)
DROP POLICY IF EXISTS "Admins write category-images" ON storage.objects;
CREATE POLICY "Admins write category-images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'category-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    bucket_id = 'category-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
