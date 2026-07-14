-- ZURI Website Generation V2 Migration
-- Adds pipeline metadata columns + curated image library.

ALTER TABLE public.websites ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;
ALTER TABLE public.websites ADD COLUMN IF NOT EXISTS generation_version integer DEFAULT 1;
ALTER TABLE public.websites ADD COLUMN IF NOT EXISTS archetype text;

CREATE TABLE IF NOT EXISTS public.curated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  url text NOT NULL,
  blur_url text,
  alt text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  source text NOT NULL DEFAULT 'zuri-curated',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_curated_images_archetype ON public.curated_images(archetype);
CREATE INDEX IF NOT EXISTS idx_curated_images_tags ON public.curated_images USING gin(tags);

ALTER TABLE public.curated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curated_images FORCE ROW LEVEL SECURITY;

CREATE POLICY "curated_images_public_read" ON public.curated_images
  FOR SELECT USING (true);

CREATE POLICY "curated_images_service_all" ON public.curated_images
  FOR ALL USING (auth.role() = 'service_role');
