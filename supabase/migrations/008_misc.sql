-- ============================================================================
-- 008_misc.sql
-- contact_submissions, rate_limit_log (+purge fn), audit_logs
-- ============================================================================

-- ============================================================================
-- CONTACT SUBMISSIONS
-- ============================================================================

create table if not exists contact_submissions (
  id uuid primary key default gen_random_uuid(),
  website_owner_id uuid references auth.users(id) on delete cascade not null,
  website_handle text not null,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  service_interest text,
  ip_address text,
  created_at timestamptz default now()
);

create index if not exists idx_contact_submissions_owner
  on contact_submissions(website_owner_id, created_at desc);

-- ============================================================================
-- RATE LIMIT LOG
-- ============================================================================

create table if not exists rate_limit_log (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  category text not null,
  created_at timestamptz default now()
);

create index if not exists idx_rate_limit_key_time on rate_limit_log(key, created_at desc);

create or replace function purge_old_rate_limits()
returns void
language plpgsql
security definer
as $$
begin
  delete from rate_limit_log where created_at < now() - interval '2 hours';
end;
$$;

-- ============================================================================
-- AUDIT LOGS
-- Kept for 2 years (legal requirement) — no auto-purge, manual review only
-- ============================================================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz default now()
);

create index if not exists idx_audit_logs_user on audit_logs(user_id, created_at desc);
create index if not exists idx_audit_logs_action on audit_logs(action, created_at desc);
