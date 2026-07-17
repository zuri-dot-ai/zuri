-- ============================================================
-- WEBSITE BUILDER FOUNDATION (docs/02_WEBSITE_BUILDER.md §10)
-- websites, website_images, contact_submissions, website_pageviews
-- Idempotent: safe if earlier migrations already created these.
-- ============================================================

-- ============================================================
-- WEBSITES
-- ============================================================
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  handle text NOT NULL,
  custom_domain text UNIQUE,
  status text NOT NULL DEFAULT 'generating',
  -- status: generating | preview | published | suspended | failed | deleted
  composition_json jsonb,
  archetype text,
  needs_review boolean DEFAULT false,
  generation_version integer DEFAULT 2,
  published_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
CREATE INDEX IF NOT EXISTS idx_websites_handle ON websites(handle);
CREATE INDEX IF NOT EXISTS idx_websites_custom_domain ON websites(custom_domain);
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);

ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own website" ON websites;
CREATE POLICY "Users manage own website" ON websites FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Published websites are public" ON websites;
CREATE POLICY "Published websites are public"
  ON websites FOR SELECT USING (status = 'published');

-- ============================================================
-- WEBSITE IMAGES (user-uploaded image tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  block_id text,
  file_size_bytes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own images" ON website_images;
CREATE POLICY "Users manage own images" ON website_images FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- CONTACT FORM SUBMISSIONS (from generated websites)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  website_handle text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  service_interest text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Website owners can read their own submissions
DROP POLICY IF EXISTS "Owners read own submissions" ON contact_submissions;
CREATE POLICY "Owners read own submissions"
  ON contact_submissions FOR SELECT USING (auth.uid() = website_owner_id);

-- Public insert for form submissions (no auth required)
DROP POLICY IF EXISTS "Public can insert submissions" ON contact_submissions;
CREATE POLICY "Public can insert submissions"
  ON contact_submissions FOR INSERT WITH CHECK (true);

-- ============================================================
-- WEBSITE ANALYTICS (basic — detailed spec in ANALYTICS.md)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_handle text NOT NULL,
  page_path text NOT NULL DEFAULT '/',
  referrer text,
  user_agent text,
  country text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pageviews_handle_date ON website_pageviews(website_handle, created_at);
-- No RLS on inserts — public tracking
-- Reads restricted to website owner (handled in API layer, not RLS for performance)

-- Align columns with §10 if an earlier, richer pageviews table already exists
ALTER TABLE website_pageviews ADD COLUMN IF NOT EXISTS referrer text;
ALTER TABLE website_pageviews ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE website_pageviews ADD COLUMN IF NOT EXISTS country text;
