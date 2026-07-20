-- User-uploaded website images bucket (docs/02_WEBSITE_BUILDER.md §8.3)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-images',
  'website-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read website-images" ON storage.objects;
CREATE POLICY "Public read website-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'website-images');

DROP POLICY IF EXISTS "Users upload own website-images" ON storage.objects;
CREATE POLICY "Users upload own website-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'website-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own website-images" ON storage.objects;
CREATE POLICY "Users update own website-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'website-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own website-images" ON storage.objects;
CREATE POLICY "Users delete own website-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'website-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.website_images TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.website_images TO authenticated;
