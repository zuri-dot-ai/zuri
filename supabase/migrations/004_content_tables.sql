-- ============================================================================
-- 004_content_tables.sql
-- content_pillars, content_calendar, generated_content
-- ============================================================================

-- ============================================================================
-- CONTENT PILLARS
-- ============================================================================

create table if not exists content_pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  icon text,
  color text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_content_pillars_user_id on content_pillars(user_id);

-- ============================================================================
-- CONTENT CALENDAR
-- ============================================================================

create table if not exists content_calendar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  pillar_id uuid references content_pillars(id) on delete set null,
  platform text not null,
  -- platform: instagram | facebook | linkedin | x | tiktok
  scheduled_date date not null,
  scheduled_time time,
  format_type text not null,
  -- format_type: static_image | carousel | reel | story | text_post | article | thread | poll | short_video
  topic text not null,
  hook text,
  brief text,
  status text not null default 'draft',
  -- status: draft | approved | generated | posted | skipped
  content_id uuid,
  is_cultural_moment boolean default false,
  cultural_moment_name text,
  coming_soon boolean default false,
  is_series boolean default false,
  series_title text,
  series_part integer,
  series_total integer,
  repurposed_from uuid references content_calendar(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_content_calendar_user_date on content_calendar(user_id, scheduled_date);
create index if not exists idx_content_calendar_status on content_calendar(user_id, status);
create index if not exists idx_content_calendar_platform on content_calendar(user_id, platform);

-- ============================================================================
-- GENERATED CONTENT
-- ============================================================================

create table if not exists generated_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  calendar_slot_id uuid references content_calendar(id) on delete set null,
  platform text not null,
  format_type text not null,
  caption text,
  hashtags text[] default '{}',
  image_url text,
  image_prompt_used text,
  carousel_image_urls text[] default '{}',
  blog_content jsonb,
  newsletter_content jsonb,
  video_script jsonb,
  thumbnail_url text,
  status text not null default 'ready',
  -- status: ready | partial | failed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_generated_content_user on generated_content(user_id);
create index if not exists idx_generated_content_slot on generated_content(calendar_slot_id);
create index if not exists idx_generated_content_platform on generated_content(user_id, platform);

-- Forward FK: content_calendar.content_id -> generated_content.id
alter table content_calendar
  drop constraint if exists content_calendar_content_id_fkey;

alter table content_calendar
  add constraint content_calendar_content_id_fkey
  foreign key (content_id) references generated_content(id) on delete set null;
