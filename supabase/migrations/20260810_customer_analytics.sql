-- ============================================================================
-- CUSTOMER ANALYTICS SYSTEM — Session 4B v2
-- Raw events + hourly/daily rollups for the new customer-facing analytics
-- dashboard. Parallel to existing website_pageviews / website_analytics_daily.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- ANALYTICS EVENTS (raw)
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,

  event_type text not null,
  -- 'page_view' | 'whatsapp_click' | 'phone_click' | 'form_submit'
  -- | 'cta_click' | 'product_click' | 'session_start' | 'session_end'

  session_id uuid not null,
  visitor_id uuid not null,
  is_new_visitor boolean not null default true,

  page_path text,
  page_title text,

  referrer_domain text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  device_type text,
  browser text,
  os text,

  country text,
  region text,
  city text,

  metadata jsonb not null default '{}',

  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_site_time
  on analytics_events(website_id, created_at desc);
create index if not exists idx_analytics_events_type
  on analytics_events(website_id, event_type, created_at desc);
create index if not exists idx_analytics_events_session
  on analytics_events(session_id);
create index if not exists idx_analytics_events_visitor
  on analytics_events(visitor_id);

-- ────────────────────────────────────────────────────────────────────────────
-- ANALYTICS ROLLUPS HOURLY
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists analytics_rollups_hourly (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  hour_bucket timestamptz not null,

  page_views integer not null default 0,
  unique_visitors integer not null default 0,
  new_visitors integer not null default 0,
  sessions integer not null default 0,

  whatsapp_clicks integer not null default 0,
  phone_clicks integer not null default 0,
  form_submits integer not null default 0,
  cta_clicks integer not null default 0,

  mobile_count integer not null default 0,
  desktop_count integer not null default 0,
  tablet_count integer not null default 0,

  top_pages jsonb not null default '[]',
  top_referrers jsonb not null default '[]',
  top_countries jsonb not null default '[]',

  created_at timestamptz not null default now(),
  unique (website_id, hour_bucket)
);

create index if not exists idx_rollup_site_hour
  on analytics_rollups_hourly(website_id, hour_bucket desc);

-- ────────────────────────────────────────────────────────────────────────────
-- ANALYTICS ROLLUPS DAILY
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists analytics_rollups_daily (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references websites(id) on delete cascade,
  day_bucket date not null,

  page_views integer not null default 0,
  unique_visitors integer not null default 0,
  new_visitors integer not null default 0,
  returning_visitors integer not null default 0,
  sessions integer not null default 0,
  avg_session_duration_seconds numeric,
  bounce_rate numeric,

  whatsapp_clicks integer not null default 0,
  phone_clicks integer not null default 0,
  form_submits integer not null default 0,
  cta_clicks integer not null default 0,

  mobile_count integer not null default 0,
  desktop_count integer not null default 0,
  tablet_count integer not null default 0,

  top_pages jsonb not null default '[]',
  top_referrers jsonb not null default '[]',
  top_countries jsonb not null default '[]',
  top_cities jsonb not null default '[]',

  created_at timestamptz not null default now(),
  unique (website_id, day_bucket)
);

create index if not exists idx_rollup_site_day
  on analytics_rollups_daily(website_id, day_bucket desc);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ────────────────────────────────────────────────────────────────────────────

alter table analytics_events enable row level security;
alter table analytics_rollups_hourly enable row level security;
alter table analytics_rollups_daily enable row level security;

-- analytics_events: service role only (insert from edge route, no client reads)
create policy "Service role manages analytics_events"
  on analytics_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- analytics_rollups_hourly: service role only
create policy "Service role manages analytics_rollups_hourly"
  on analytics_rollups_hourly for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- analytics_rollups_daily: owners can read their own site's rollups
create policy "Owners read own analytics rollups daily"
  on analytics_rollups_daily for select
  using (
    exists (
      select 1 from websites w
      where w.id = analytics_rollups_daily.website_id
        and w.user_id = auth.uid()
    )
  );

-- Also allow service role full access
create policy "Service role manages analytics_rollups_daily"
  on analytics_rollups_daily for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
