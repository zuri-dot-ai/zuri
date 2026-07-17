-- ============================================================
-- WEBSITE BUILDER v2 — Template-based foundation
-- docs/02_WEBSITE_BUILDER.md §3.2, §3.3, §11
--
-- Idempotent: safe if earlier migrations already created websites /
-- website_images. Does NOT drop composition_json (v1 column) —
-- confirm before removing that column in a follow-up migration.
-- ============================================================

-- ============================================================
-- TEMPLATES (§3.2)
-- ============================================================
CREATE TABLE IF NOT EXISTS templates (
  id text PRIMARY KEY,               -- template_id, e.g. "warm-sensory-dark-editorial"
  archetype text NOT NULL,
  mode text NOT NULL,                -- dark | light
  lean text NOT NULL,                -- international | african
  display_name text NOT NULL,
  storage_path text NOT NULL,
  color_themes jsonb NOT NULL,
  placeholder_fields jsonb NOT NULL,
  image_slots jsonb NOT NULL,
  needs_revision boolean DEFAULT false,
  revision_note text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CATEGORY IMAGES (§3.3)
-- ============================================================
CREATE TABLE IF NOT EXISTS category_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype text NOT NULL,
  slot_type text NOT NULL,          -- hero | about | gallery | work | before_after | property | founder | case_study
  storage_path text NOT NULL,
  public_url text NOT NULL,
  tags text[],                       -- for editor search, e.g. ["warm","food","closeup"]
  width integer,
  height integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_images_archetype_slot
  ON category_images(archetype, slot_type);

-- ============================================================
-- WEBSITES (v2 columns — alter existing table)
-- ============================================================
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  handle text NOT NULL,
  custom_domain text UNIQUE,
  status text NOT NULL DEFAULT 'generating',
  template_id text REFERENCES templates(id),
  active_theme text NOT NULL DEFAULT 'theme-1',
  template_html text,
  filled_placeholders jsonb DEFAULT '{}',
  filled_images jsonb DEFAULT '{}',
  archetype text,
  needs_review boolean DEFAULT false,
  published_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add v2 columns when websites already exists from v1 migrations
ALTER TABLE websites ADD COLUMN IF NOT EXISTS template_id text REFERENCES templates(id);
ALTER TABLE websites ADD COLUMN IF NOT EXISTS active_theme text NOT NULL DEFAULT 'theme-1';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS template_html text;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS filled_placeholders jsonb DEFAULT '{}';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS filled_images jsonb DEFAULT '{}';
ALTER TABLE websites ADD COLUMN IF NOT EXISTS archetype text;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE websites ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
CREATE INDEX IF NOT EXISTS idx_websites_handle ON websites(handle);
CREATE INDEX IF NOT EXISTS idx_websites_custom_domain ON websites(custom_domain);
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own website" ON websites;
CREATE POLICY "Users manage own website" ON websites FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Published websites are public" ON websites;
CREATE POLICY "Published websites are public" ON websites FOR SELECT USING (status = 'published');

-- ============================================================
-- WEBSITE IMAGES (user uploads — §11)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  slot text,
  file_size_bytes integer,
  created_at timestamptz DEFAULT now()
);

-- Align with §11 if an earlier table used block_id instead of slot
ALTER TABLE website_images ADD COLUMN IF NOT EXISTS slot text;

ALTER TABLE website_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own images" ON website_images;
CREATE POLICY "Users manage own images" ON website_images FOR ALL USING (auth.uid() = user_id);
