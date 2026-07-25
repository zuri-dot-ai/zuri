-- ════════════════════════════════════════════════════════
--  Production hotfix — idempotent catch-up for schema that
--  shipped in Jul 21–23 migrations but may be missing on prod.
--  Safe to re-run. Prefer applying via Supabase SQL Editor
--  against the project linked to Vercel.
-- ════════════════════════════════════════════════════════

-- 1) content_calendar.generation_source (from 20260721)
alter table content_calendar
  add column if not exists generation_source text not null default 'ai';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'content_calendar_generation_source_check'
  ) then
    alter table content_calendar
      add constraint content_calendar_generation_source_check
      check (generation_source in ('ai', 'fallback'));
  end if;
end $$;

-- 2) business_profiles deeper fields (from 20260722)
alter table business_profiles
  add column if not exists pitch_line text,
  add column if not exists primary_goal text,
  add column if not exists social_handle text,
  add column if not exists logo_url text,
  add column if not exists reference_url text,
  add column if not exists tone_sample_choice text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'business_profiles_primary_goal_check'
  ) then
    alter table business_profiles
      add constraint business_profiles_primary_goal_check
      check (primary_goal is null or primary_goal in ('leads', 'sales', 'bookings', 'credibility'));
  end if;
end $$;

-- 3) logos storage bucket (from 20260722)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read logos" on storage.objects;
create policy "Public read logos"
  on storage.objects for select
  using (bucket_id = 'logos');

drop policy if exists "Users upload own logos" on storage.objects;
create policy "Users upload own logos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own logos" on storage.objects;
create policy "Users update own logos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own logos" on storage.objects;
create policy "Users delete own logos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
