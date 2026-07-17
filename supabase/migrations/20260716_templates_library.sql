-- ============================================================
-- TEMPLATES LIBRARY (docs/02_WEBSITE_BUILDER.md §3.2)
-- Idempotent — safe if 2A already applied this.
-- ============================================================

CREATE TABLE IF NOT EXISTS templates (
  id text PRIMARY KEY,
  archetype text NOT NULL,
  mode text NOT NULL,
  lean text NOT NULL,
  display_name text NOT NULL,
  storage_path text NOT NULL,
  color_themes jsonb NOT NULL,
  placeholder_fields jsonb NOT NULL,
  image_slots jsonb NOT NULL,
  needs_revision boolean DEFAULT false,
  revision_note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_archetype ON templates(archetype);
CREATE INDEX IF NOT EXISTS idx_templates_mode_lean ON templates(mode, lean);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read templates (needed for generation pipeline)
DROP POLICY IF EXISTS "Authenticated read templates" ON templates;
CREATE POLICY "Authenticated read templates"
  ON templates FOR SELECT
  TO authenticated
  USING (true);

-- Admins can update revision flags (profiles.is_admin)
DROP POLICY IF EXISTS "Admins update templates" ON templates;
CREATE POLICY "Admins update templates"
  ON templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Also ensure public storage bucket for HTML templates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-templates',
  'website-templates',
  true,
  5242880,
  ARRAY['text/html', 'application/json']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read website-templates" ON storage.objects;
CREATE POLICY "Public read website-templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'website-templates');

