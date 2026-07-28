-- FCM push subscriptions (idempotent).
-- Works whether 20260722_push_subscriptions.sql was applied or not.

-- ============================================================
-- TABLE (final FCM shape)
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fcm_token text not null,
  created_at timestamptz default now()
);

-- If an older VAPID table exists, drop legacy columns and ensure fcm_token.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'push_subscriptions'
      and column_name = 'endpoint'
  ) then
    execute 'truncate table push_subscriptions';
    alter table push_subscriptions drop column if exists endpoint cascade;
    alter table push_subscriptions drop column if exists p256dh cascade;
    alter table push_subscriptions drop column if exists auth_key cascade;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'push_subscriptions'
      and column_name = 'fcm_token'
  ) then
    alter table push_subscriptions add column fcm_token text;
    -- Empty table after truncate (or brand-new): backfill not needed.
    update push_subscriptions set fcm_token = '' where fcm_token is null;
    alter table push_subscriptions alter column fcm_token set not null;
  end if;
end $$;

alter table push_subscriptions
  drop constraint if exists push_subscriptions_fcm_token_key;

alter table push_subscriptions
  add constraint push_subscriptions_fcm_token_key unique (fcm_token);

create index if not exists push_subscriptions_user_id_idx
  on push_subscriptions (user_id);

-- ============================================================
-- RLS + GRANTS
-- ============================================================
alter table push_subscriptions enable row level security;
alter table push_subscriptions force row level security;

drop policy if exists "push_subscriptions_all_own" on push_subscriptions;
create policy "push_subscriptions_all_own" on push_subscriptions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_service_all" on push_subscriptions;
create policy "push_subscriptions_service_all" on push_subscriptions
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to service_role;

-- ============================================================
-- NOTIFICATION PREFERENCES — push_enabled
-- ============================================================
alter table notification_preferences
  add column if not exists push_enabled boolean not null default true;
