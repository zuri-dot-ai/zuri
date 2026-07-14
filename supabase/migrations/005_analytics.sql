-- ============================================================================
-- 005_analytics.sql
-- website_pageviews, website_events, website_analytics_daily,
-- meta_connections, meta_insights, search_console_connections,
-- search_console_snapshots, monthly_reports, trending_topics_cache,
-- content_strategy_insights
-- ============================================================================

-- ============================================================================
-- WEBSITE PAGEVIEWS (raw — purged per retention policy)
-- ============================================================================

create table if not exists website_pageviews (
  id uuid primary key default gen_random_uuid(),
  website_handle text not null,
  website_owner_id uuid references auth.users(id) on delete cascade not null,
  page_path text not null default '/',
  referrer_domain text,
  device_type text,
  -- device_type: mobile | tablet | desktop
  country char(2),
  anonymized_ip text,
  created_at timestamptz default now()
);

create index if not exists idx_pageviews_handle_created on website_pageviews(website_handle, created_at);
create index if not exists idx_pageviews_owner on website_pageviews(website_owner_id, created_at);

-- ============================================================================
-- WEBSITE EVENTS (CTA clicks, form opens, etc.)
-- ============================================================================

create table if not exists website_events (
  id uuid primary key default gen_random_uuid(),
  website_handle text not null,
  website_owner_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null,
  -- event_type: cta_click | form_open | section_view
  event_label text,
  created_at timestamptz default now()
);

create index if not exists idx_events_handle on website_events(website_handle, created_at);

-- ============================================================================
-- WEBSITE ANALYTICS DAILY (pre-aggregated — used for dashboard)
-- ============================================================================

create table if not exists website_analytics_daily (
  id uuid primary key default gen_random_uuid(),
  website_handle text not null,
  date date not null,
  total_views integer not null default 0,
  unique_visitors integer not null default 0,
  mobile_views integer not null default 0,
  desktop_views integer not null default 0,
  tablet_views integer not null default 0,
  top_referrers jsonb not null default '[]',
  country_breakdown jsonb not null default '{}',
  unique (website_handle, date)
);

create index if not exists idx_analytics_daily_handle_date on website_analytics_daily(website_handle, date);

-- ============================================================================
-- META CONNECTIONS
-- ============================================================================

create table if not exists meta_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  access_token_encrypted text not null,
  token_expires_at timestamptz not null,
  facebook_page_id text,
  facebook_page_name text,
  instagram_account_id text,
  instagram_username text,
  status text not null default 'active',
  -- status: active | expired | disconnected
  connected_at timestamptz default now(),
  last_synced_at timestamptz
);

-- ============================================================================
-- META INSIGHTS (raw daily metrics from Meta API)
-- ============================================================================

create table if not exists meta_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  platform text not null,
  -- platform: facebook | instagram
  metric_name text not null,
  metric_value numeric not null default 0,
  period_date date not null,
  unique (user_id, platform, metric_name, period_date)
);

create index if not exists idx_meta_insights_user_date on meta_insights(user_id, period_date);

-- ============================================================================
-- SEARCH CONSOLE CONNECTIONS
-- ============================================================================

create table if not exists search_console_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  refresh_token_encrypted text not null,
  status text not null default 'active',
  -- status: active | site_not_verified | expired | disconnected
  connected_at timestamptz default now(),
  last_synced_at timestamptz
);

-- ============================================================================
-- SEARCH CONSOLE SNAPSHOTS (28-day rolling data)
-- ============================================================================

create table if not exists search_console_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  site_url text not null,
  snapshot_date date not null,
  top_queries jsonb not null default '[]',
  top_pages jsonb not null default '[]',
  total_clicks integer default 0,
  total_impressions integer default 0,
  avg_position numeric default 0,
  unique (user_id, snapshot_date)
);

-- ============================================================================
-- MONTHLY REPORTS (Premium AI reports)
-- ============================================================================

create table if not exists monthly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  report_month date not null,
  report_data jsonb not null,
  generated_at timestamptz default now(),
  unique (user_id, report_month)
);

-- ============================================================================
-- TRENDING TOPICS CACHE
-- ============================================================================

create table if not exists trending_topics_cache (
  id uuid primary key default gen_random_uuid(),
  industry text unique not null,
  topics jsonb not null,
  cached_at timestamptz default now()
);

-- ============================================================================
-- CONTENT STRATEGY INSIGHTS (performance feedback loop)
-- ============================================================================

create table if not exists content_strategy_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  insights jsonb not null,
  updated_at timestamptz default now()
);
