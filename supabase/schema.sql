-- ════════════════════════════════════════════════════════
--  ZURI — Database Schema
--  Run FIRST. Creates all tables, types, and indexes.
-- ════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────
--  ENUM TYPES (centralized for consistency)
-- ────────────────────────────────────────────────────────
create type subscription_plan_t   as enum ('free', 'starter', 'growth');
create type subscription_status_t as enum ('inactive', 'active', 'past_due', 'cancelled', 'trialing');
create type onboarding_method_t   as enum ('voice', 'typed', 'form');
create type website_type_t        as enum (
  'portfolio', 'business', 'ecommerce', 'restaurant', 'salon_spa',
  'consultant', 'creative', 'realestate', 'fitness', 'event',
  'nonprofit', 'professional_services'
);
create type motion_style_t        as enum ('slow_elegant', 'crisp_modern', 'bold_energetic');
create type platform_t            as enum ('instagram', 'linkedin', 'facebook', 'tiktok', 'email', 'twitter', 'whatsapp');
create type post_type_t           as enum ('educational', 'promotional', 'behind_scenes', 'story', 'testimonial', 'engagement');
create type content_status_t      as enum ('briefed', 'drafted', 'approved', 'posted');
create type task_type_t           as enum ('website', 'content', 'engagement', 'setup');
create type match_status_t        as enum ('pending', 'contacted', 'hired', 'completed', 'declined');

-- ────────────────────────────────────────────────────────
--  1. USERS  (profile mirror of auth.users)
-- ────────────────────────────────────────────────────────
create table public.users (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text not null,
  full_name               text,
  avatar_url              text,
  subscription_plan       subscription_plan_t   not null default 'free',
  subscription_status     subscription_status_t not null default 'inactive',
  flutterwave_customer_id text,
  is_early_adopter        boolean not null default false,
  has_onboarded           boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────
--  2. BUSINESS PROFILES  (1 per user in V1)
-- ────────────────────────────────────────────────────────
create table public.business_profiles (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references public.users(id) on delete cascade,
  business_name         text,
  industry              text,
  services              text[] default '{}',
  target_audience       text,
  tone                  text,            -- professional | warm | bold | playful
  unique_value          text,
  location              text,
  tagline               text,
  primary_color         text default '#C9A84C',
  logo_url              text,
  onboarding_transcript text,
  onboarding_method     onboarding_method_t,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id)     -- enforce 1-per-user in V1
);

-- ────────────────────────────────────────────────────────
--  3. WEBSITES
-- ────────────────────────────────────────────────────────
create table public.websites (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.users(id) on delete cascade,
  business_profile_id uuid references public.business_profiles(id) on delete set null,
  website_type        website_type_t,
  style_preference    text,
  motion_style        motion_style_t default 'slow_elegant',
  composition_json    jsonb,           -- full Gemini output: sections, palette, content
  published_slug      text unique,     -- businessname → businessname.zuri.app
  is_published        boolean not null default false,
  last_edited         timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────
--  4. CONTENT CALENDAR
-- ────────────────────────────────────────────────────────
create table public.content_calendar (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  slot_date   date not null,
  platform    platform_t not null,
  post_type   post_type_t,
  theme       text,
  brief       text,
  ai_draft    text,
  hashtags    text[] default '{}',
  status      content_status_t not null default 'briefed',
  canva_url   text,
  video_url   text,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────
--  5. ACTION PLAN TASKS  (90 per user)
-- ────────────────────────────────────────────────────────
create table public.action_plan_tasks (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,
  day_number        integer not null check (day_number between 1 and 90),
  task_title        text not null,
  task_description  text,
  why_this_matters  text,
  task_type         task_type_t not null default 'content',
  ai_asset          text,            -- pre-generated content for this task
  estimated_minutes integer default 10,
  platform          platform_t,
  is_completed      boolean not null default false,
  completed_at      timestamptz,
  due_date          date,
  created_at        timestamptz not null default now(),
  unique (user_id, day_number)
);

-- ────────────────────────────────────────────────────────
--  6. USER PROGRESS  (1 per user)
-- ────────────────────────────────────────────────────────
create table public.user_progress (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null references public.users(id) on delete cascade,
  current_streak         integer not null default 0,
  longest_streak         integer not null default 0,
  total_tasks_completed  integer not null default 0,
  total_content_created  integer not null default 0,
  last_active_date       date,
  week_completion_rate   float   not null default 0,
  badges_earned          text[]  not null default '{}',
  updated_at             timestamptz not null default now(),
  unique (user_id)
);

-- ────────────────────────────────────────────────────────
--  7. AGENCIES  (marketplace listings)
-- ────────────────────────────────────────────────────────
create table public.agencies (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  logo_url            text,
  description         text,
  specialties         text[] default '{}',  -- instagram | linkedin | video | email ...
  location            text,
  price_range         text,                 -- '₦50k-100k' | '₦100k-250k' | '$500-1500'
  response_time_hours integer default 48,
  rating              float   default 0,
  review_count        integer default 0,
  portfolio_url       text,
  contact_email       text,
  is_verified         boolean not null default false,
  is_featured         boolean not null default false,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────
--  8. AGENCY MATCH REQUESTS
-- ────────────────────────────────────────────────────────
create table public.agency_match_requests (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  brief_json  jsonb,            -- auto-filled from brand profile
  status      match_status_t not null default 'pending',
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────
--  9. PLATFORM CONNECTIONS  (encrypted OAuth tokens)
-- ────────────────────────────────────────────────────────
create table public.platform_connections (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.users(id) on delete cascade,
  platform      platform_t not null,
  access_token  text,         -- encrypted at app layer (ENCRYPTION_SECRET)
  refresh_token text,         -- encrypted at app layer
  expires_at    timestamptz,
  account_type  text,
  account_name  text,
  created_at    timestamptz not null default now(),
  unique (user_id, platform)
);

-- ────────────────────────────────────────────────────────
--  INDEXES  (performance for common queries)
-- ────────────────────────────────────────────────────────
create index idx_business_profiles_user   on public.business_profiles(user_id);
create index idx_websites_user             on public.websites(user_id);
create index idx_websites_slug             on public.websites(published_slug) where is_published = true;
create index idx_content_user_date         on public.content_calendar(user_id, slot_date);
create index idx_content_status            on public.content_calendar(user_id, status);
create index idx_tasks_user_day            on public.action_plan_tasks(user_id, day_number);
create index idx_tasks_user_incomplete     on public.action_plan_tasks(user_id) where is_completed = false;
create index idx_progress_user             on public.user_progress(user_id);
create index idx_agencies_active           on public.agencies(is_active, is_featured) where is_active = true;
create index idx_agencies_specialties      on public.agencies using gin(specialties);
create index idx_match_requests_user       on public.agency_match_requests(user_id);
create index idx_match_requests_agency     on public.agency_match_requests(agency_id, status);
create index idx_platform_conn_user        on public.platform_connections(user_id);