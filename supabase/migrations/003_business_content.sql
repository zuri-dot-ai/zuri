-- ============================================================================
-- 003_business_content.sql
-- business_profiles, website_generation_jobs (+completion trigger),
-- websites (incl. custom domain + analytics columns), website_images
-- ============================================================================

-- ============================================================================
-- BUSINESS PROFILES
-- ============================================================================

create table if not exists business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  business_name text not null,
  industry text,
  business_type text not null,
  services text[] not null default '{}',
  target_audience text,
  location text,
  location_city text,
  brand_tone text,
  unique_value text,
  tagline text,
  brand_vibe text,
  color_primary text,
  color_accent text,
  platforms text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- WEBSITE GENERATION JOBS
-- ============================================================================

create table if not exists website_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  business_profile_id uuid references business_profiles(id) on delete cascade,
  status text not null default 'queued',
  -- status values: queued | processing | completed | failed
  error_message text,
  retry_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_website_generation_jobs_user_id on website_generation_jobs(user_id);
create index if not exists idx_website_generation_jobs_status on website_generation_jobs(status);

-- Auto-update profiles.onboarding_completed when job completes
create or replace function on_generation_job_complete()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update profiles set
      onboarding_completed = true,
      onboarding_completed_at = now()
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists website_job_complete_trigger on website_generation_jobs;
create trigger website_job_complete_trigger
  after update on website_generation_jobs
  for each row execute function on_generation_job_complete();

-- ============================================================================
-- WEBSITES
-- Includes custom domain + analytics columns from DEPLOYMENT / ANALYTICS docs
-- ============================================================================

create table if not exists websites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  handle text not null,
  custom_domain text unique,
  custom_domain_status text,
  -- custom_domain_status: pending_verification | verified | verification_failed
  custom_domain_added_at timestamptz,
  status text not null default 'generating',
  -- status: generating | preview | published | suspended | failed | deleted
  composition_json jsonb,
  archetype text,
  needs_review boolean default false,
  generation_version integer default 2,
  analytics_enabled boolean default true,
  published_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_websites_user_id on websites(user_id);
create index if not exists idx_websites_handle on websites(handle);
create index if not exists idx_websites_custom_domain on websites(custom_domain);
create index if not exists idx_websites_status on websites(status);
create index if not exists idx_websites_custom_domain_status
  on websites(custom_domain_status) where custom_domain is not null;

-- ============================================================================
-- WEBSITE IMAGES (required by Phase 3 + RLS in 10_SECURITY.md Section 3.2)
-- ============================================================================

create table if not exists website_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  public_url text not null,
  block_id text,
  file_size_bytes integer,
  created_at timestamptz default now()
);

create index if not exists idx_website_images_user_id on website_images(user_id);
