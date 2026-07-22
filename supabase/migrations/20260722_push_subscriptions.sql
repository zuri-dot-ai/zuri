-- Session 4B/4C v2 addendum — web push (docs/08_NOTIFICATIONS.md).
-- Stores browser PushSubscriptions per user/device, plus a push_enabled
-- toggle alongside the existing email/in-app notification preferences.

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_user_id_idx
  on push_subscriptions (user_id);

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
