-- ============================================================================
-- 001_core_tables.sql
-- Core account tables: profiles, plans (seeded), subscriptions, notification_preferences
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- PROFILES
-- ============================================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  handle text unique,
  handle_locked boolean default false,
  avatar_url text,
  onboarding_completed boolean default false,
  onboarding_completed_at timestamptz,
  agency_discoverable boolean default false,
  is_admin boolean default false,
  terms_accepted_at timestamptz,
  terms_version text default '1.0',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_handle on profiles(handle);

-- Auto-create profile on signup (RLS has no INSERT policy for clients)
create or replace function create_default_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function create_default_profile();

-- ============================================================================
-- PLANS (seed data — do not modify at runtime)
-- Column names and seed values from docs/06_MONETIZATION.md Section 5 + 7
-- ============================================================================

create table if not exists plans (
  id text primary key,
  name text not null,
  price_monthly integer not null default 0,
  price_annual integer not null default 0,
  limits jsonb not null default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into plans (id, name, price_monthly, price_annual, limits) values
(
  'free',
  'Free',
  0,
  0,
  '{
    "websites": 1,
    "can_publish": false,
    "custom_domain": false,
    "max_pages_per_site": 5,
    "website_regenerations": 0,
    "priority_queue": false,
    "remove_branding": false,
    "social_platforms": 0,
    "calendar_posts_per_month": 0,
    "images_per_month": 0,
    "blog_posts_per_month": 0,
    "newsletters_per_month": 0,
    "analytics_enabled": false,
    "analytics_retention_days": null,
    "meta_analytics": false,
    "search_console": false,
    "email_analytics": false,
    "agency_listed": false,
    "agency_featured": false,
    "can_contact_agencies": false,
    "storage_mb": 50,
    "seats": 1,
    "api_access": false,
    "video_generation": false,
    "content_ideas_per_month": 5,
    "supported_branches": []
  }'::jsonb
),
(
  'pro',
  'Pro',
  23000,
  230000,
  '{
    "websites": 1,
    "can_publish": true,
    "custom_domain": false,
    "max_pages_per_site": 5,
    "website_regenerations": 1,
    "priority_queue": false,
    "remove_branding": false,
    "social_platforms": 2,
    "calendar_posts_per_month": 12,
    "images_per_month": 15,
    "blog_posts_per_month": 2,
    "newsletters_per_month": 1,
    "analytics_enabled": true,
    "analytics_retention_days": 30,
    "meta_analytics": false,
    "search_console": false,
    "email_analytics": false,
    "agency_listed": false,
    "agency_featured": false,
    "can_contact_agencies": false,
    "storage_mb": 500,
    "seats": 1,
    "api_access": false,
    "video_generation": false,
    "content_ideas_per_month": null,
    "supported_branches": [1, 3, 5, 8]
  }'::jsonb
),
(
  'growth',
  'Growth',
  51000,
  510000,
  '{
    "websites": 1,
    "can_publish": true,
    "custom_domain": true,
    "max_pages_per_site": null,
    "website_regenerations": 3,
    "priority_queue": false,
    "remove_branding": true,
    "social_platforms": 4,
    "calendar_posts_per_month": 30,
    "images_per_month": 50,
    "blog_posts_per_month": 6,
    "newsletters_per_month": 4,
    "analytics_enabled": true,
    "analytics_retention_days": 90,
    "meta_analytics": true,
    "search_console": true,
    "email_analytics": false,
    "agency_listed": true,
    "agency_featured": false,
    "can_contact_agencies": true,
    "storage_mb": 2048,
    "seats": 1,
    "api_access": false,
    "video_generation": false,
    "content_ideas_per_month": null,
    "supported_branches": [1, 3, 5, 6, 8]
  }'::jsonb
),
(
  'premium',
  'Premium',
  73000,
  730000,
  '{
    "websites": 3,
    "can_publish": true,
    "custom_domain": true,
    "max_pages_per_site": null,
    "website_regenerations": null,
    "priority_queue": true,
    "remove_branding": true,
    "social_platforms": null,
    "calendar_posts_per_month": null,
    "images_per_month": 200,
    "blog_posts_per_month": null,
    "newsletters_per_month": null,
    "analytics_enabled": true,
    "analytics_retention_days": 365,
    "meta_analytics": true,
    "search_console": true,
    "email_analytics": true,
    "agency_listed": true,
    "agency_featured": true,
    "can_contact_agencies": true,
    "storage_mb": 10240,
    "seats": 3,
    "api_access": true,
    "video_generation": true,
    "content_ideas_per_month": null,
    "supported_branches": [1, 3, 5, 6, 8]
  }'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  price_monthly = excluded.price_monthly,
  price_annual = excluded.price_annual,
  limits = excluded.limits;

-- ============================================================================
-- SUBSCRIPTIONS (one row per user)
-- ============================================================================

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id text references plans(id) not null default 'free',
  status text not null default 'active',
  -- status values: active | grace_period | cancelled | expired
  billing_cycle text not null default 'monthly',
  -- billing_cycle: monthly | annual
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '1 month'),
  grace_period_end timestamptz,
  cancel_at_period_end boolean default false,
  flutterwave_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_subscriptions_status on subscriptions(status);
create index if not exists idx_subscriptions_period_end on subscriptions(current_period_end);

create or replace function create_default_subscription()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function create_default_subscription();

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_weekly_digest boolean not null default true,
  email_content_reminders boolean not null default true,
  email_usage_alerts boolean not null default true,
  email_marketing boolean not null default true,
  in_app_all boolean not null default true,
  updated_at timestamptz default now()
);

create or replace function create_default_notification_preferences()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_notification_prefs on auth.users;
create trigger on_auth_user_created_notification_prefs
  after insert on auth.users
  for each row execute function create_default_notification_preferences();
