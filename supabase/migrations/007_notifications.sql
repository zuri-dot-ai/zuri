-- ============================================================================
-- 007_notifications.sql
-- notifications (+realtime), email_send_log
-- Schema from docs/08_NOTIFICATIONS.md Section 11
-- ============================================================================

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  action_url text,
  action_label text,
  icon text not null default 'Bell',
  icon_color text not null default 'text-gold',
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user_unread
  on notifications(user_id, is_read, created_at desc);

-- Enable Supabase Realtime for this table (idempotent)
do $$
begin
  alter publication supabase_realtime add table notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

create or replace function delete_old_notifications()
returns void
language plpgsql
security definer
as $$
begin
  delete from notifications
  where created_at < now() - interval '90 days';
end;
$$;

-- ============================================================================
-- EMAIL SEND LOG (for rate limiting)
-- ============================================================================

create table if not exists email_send_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  template text not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_email_send_log_user_template
  on email_send_log(user_id, template, sent_at desc);
