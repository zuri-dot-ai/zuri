-- Content calendar premium: structured content profile on business_profiles
-- plus platform text variants on generated_content.

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS content_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN business_profiles.content_profile IS
  'Structured content-generation profile: primary/secondary tone, target_customer, key_offerings, avoid, posting_days, pillar_schedule, profile_completed_at';

ALTER TABLE generated_content
  ADD COLUMN IF NOT EXISTS platform_variants jsonb;

COMMENT ON COLUMN generated_content.platform_variants IS
  'Cross-platform caption variants: { instagram: {caption, hashtags}, whatsapp: {caption}, x: {caption} }';
