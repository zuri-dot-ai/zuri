-- ════════════════════════════════════════════════════════
--  ZURI — Content Strategy Migration
--  Adds tables for pillars, calendar slots, cultural cache,
--  trending topics cache, insights, and plan limits.
--  Safe to run on existing DB (IF NOT EXISTS).
-- ════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────
--  CONTENT PILLARS
-- ────────────────────────────────────────────────────────
create table if not exists public.content_pillars (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  description text,
  icon        text,
  color       text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.content_pillars enable row level security;
drop policy if exists "Users manage own pillars" on public.content_pillars;
create policy "Users manage own pillars" on public.content_pillars
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_content_pillars_user_id on public.content_pillars(user_id);

drop trigger if exists trg_pillars_updated on public.content_pillars;
create trigger trg_pillars_updated
  before update on public.content_pillars
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────
--  CONTENT CALENDAR (extend existing table where possible)
--  We add columns to the existing content_calendar table
--  rather than introducing a rename. Existing rows remain.
-- ────────────────────────────────────────────────────────
alter table public.content_calendar
  add column if not exists pillar_id uuid references public.content_pillars(id) on delete set null,
  add column if not exists scheduled_time time,
  add column if not exists format_type text,
  add column if not exists topic text,
  add column if not exists hook text,
  add column if not exists is_cultural_moment boolean default false,
  add column if not exists cultural_moment_name text,
  add column if not exists coming_soon boolean default false,
  add column if not exists is_series boolean default false,
  add column if not exists series_title text,
  add column if not exists series_part integer,
  add column if not exists series_total integer,
  add column if not exists repurposed_from uuid references public.content_calendar(id) on delete set null,
  add column if not exists needs_review boolean default false,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_content_calendar_user_date on public.content_calendar(user_id, slot_date);
create index if not exists idx_content_calendar_status on public.content_calendar(user_id, status);
create index if not exists idx_content_calendar_platform on public.content_calendar(user_id, platform);

-- ────────────────────────────────────────────────────────
--  TRENDING TOPICS CACHE
-- ────────────────────────────────────────────────────────
create table if not exists public.trending_topics_cache (
  id          uuid primary key default uuid_generate_v4(),
  industry    text unique not null,
  topics      jsonb not null,
  cached_at   timestamptz not null default now()
);

alter table public.trending_topics_cache enable row level security;
drop policy if exists "Public read trending cache" on public.trending_topics_cache;
create policy "Public read trending cache" on public.trending_topics_cache
  for select using (true);
drop policy if exists "Service role manages trending cache" on public.trending_topics_cache;
create policy "Service role manages trending cache" on public.trending_topics_cache
  for all using (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────
--  CONTENT STRATEGY INSIGHTS (Performance feedback loop)
-- ────────────────────────────────────────────────────────
create table if not exists public.content_strategy_insights (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade unique,
  insights    jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.content_strategy_insights enable row level security;
drop policy if exists "Users read own insights" on public.content_strategy_insights;
create policy "Users read own insights" on public.content_strategy_insights
  for select using (auth.uid() = user_id);
drop policy if exists "Service role manages insights" on public.content_strategy_insights;
create policy "Service role manages insights" on public.content_strategy_insights
  for all using (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────
--  USAGE TRACKING (for plan-gated limits)
--  Tracks monthly usage counters (postgres function for atomic increment)
-- ────────────────────────────────────────────────────────
create table if not exists public.usage_tracking (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  metric     text not null,
  period_key text not null,                 -- e.g. "2026-07"
  amount     integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, metric, period_key)
);

alter table public.usage_tracking enable row level security;
drop policy if exists "Users read own usage" on public.usage_tracking;
create policy "Users read own usage" on public.usage_tracking
  for select using (auth.uid() = user_id);
drop policy if exists "Service role manages usage" on public.usage_tracking;
create policy "Service role manages usage" on public.usage_tracking
  for all using (auth.role() = 'service_role');

-- Atomic increment RPC
create or replace function public.increment_usage(
  p_user_id uuid,
  p_metric text,
  p_amount integer default 1
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period text := to_char(now(), 'YYYY-MM');
begin
  insert into public.usage_tracking (user_id, metric, period_key, amount)
  values (p_user_id, p_metric, v_period, p_amount)
  on conflict (user_id, metric, period_key)
  do update set amount = public.usage_tracking.amount + p_amount,
                updated_at = now();
end;
$$;

create or replace function public.get_usage(
  p_user_id uuid,
  p_metric text,
  p_period_key text default null
) returns integer
language plpgsql
stable security definer set search_path = public
as $$
declare
  v_period text := coalesce(p_period_key, to_char(now(), 'YYYY-MM'));
  v_amount integer;
begin
  select amount into v_amount
  from public.usage_tracking
  where user_id = p_user_id
    and metric = p_metric
    and period_key = v_period;
  return coalesce(v_amount, 0);
end;
$$;
