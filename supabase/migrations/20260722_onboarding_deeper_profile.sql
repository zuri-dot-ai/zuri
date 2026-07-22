-- Onboarding overhaul: deeper business profile fields.
-- All nullable, no default, no backfill — existing users are not broken;
-- they see a "complete your profile" nudge in Settings instead.

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS pitch_line text,
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS social_handle text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS reference_url text,
  ADD COLUMN IF NOT EXISTS tone_sample_choice text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_profiles_primary_goal_check'
  ) THEN
    ALTER TABLE business_profiles
      ADD CONSTRAINT business_profiles_primary_goal_check
      CHECK (primary_goal IS NULL OR primary_goal IN ('leads', 'sales', 'bookings', 'credibility'));
  END IF;
END $$;
