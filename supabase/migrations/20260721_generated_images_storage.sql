-- Generated content images from Imagen 3 (docs/04_CONTENT_GENERATION.md §11)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read generated-images" ON storage.objects;
CREATE POLICY "Public read generated-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

DROP POLICY IF EXISTS "Users upload own generated-images" ON storage.objects;
CREATE POLICY "Users upload own generated-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own generated-images" ON storage.objects;
CREATE POLICY "Users update own generated-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'generated-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own generated-images" ON storage.objects;
CREATE POLICY "Users delete own generated-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'generated-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
