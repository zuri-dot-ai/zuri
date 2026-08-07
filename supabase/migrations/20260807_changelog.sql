-- Changelog entries: the content admins/you publish for "What's New"
create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  description text not null,
  tag text,                 -- e.g. "New", "Improved", "Fixed"
  media_url text,           -- optional screenshot/gif
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.changelog_entries is
  'Versioned release-notes entries shown in the What''s New modal.';

-- Per-user dismissal tracking, synced across devices.
-- Uses auth.users(id) directly as the FK target — this is the
-- Supabase-standard approach and doesn't assume a specific profiles
-- table shape.
create table if not exists public.user_changelog_dismissals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_version text not null,
  dismissed_at timestamptz not null default now()
);

comment on table public.user_changelog_dismissals is
  'Tracks the most recent changelog version each user has dismissed.';

-- RLS: matches the "enabled on all tables" convention already in use
-- (see 009_rls.sql in the existing migration set).
alter table public.changelog_entries enable row level security;
alter table public.user_changelog_dismissals enable row level security;

-- Changelog entries are public read-only content — anyone authenticated
-- can read them, only the service role can write (via admin tooling).
create policy "changelog_entries_select_authenticated"
  on public.changelog_entries
  for select
  to authenticated
  using (true);

-- Users can only read/write their own dismissal record.
create policy "user_changelog_dismissals_select_own"
  on public.user_changelog_dismissals
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_changelog_dismissals_upsert_own"
  on public.user_changelog_dismissals
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_changelog_dismissals_update_own"
  on public.user_changelog_dismissals
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_changelog_entries_published_at
  on public.changelog_entries (published_at desc);