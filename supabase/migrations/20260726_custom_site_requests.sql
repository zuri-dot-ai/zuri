-- ============================================================================
-- 20260726_custom_site_requests.sql
-- Custom Sites Premium Funnel: anonymous session scratch + request queue.
-- ============================================================================

-- ============================================================================
-- ANONYMOUS CUSTOM SITE SESSIONS
-- ============================================================================

create table if not exists anonymous_custom_site_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  data jsonb not null default '{}',
  current_step integer not null default 1,
  ip_hash text,
  user_agent_hash text,
  converted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '72 hours')
);

create index if not exists idx_custom_site_sessions_token
  on anonymous_custom_site_sessions(session_token);
create index if not exists idx_custom_site_sessions_expires
  on anonymous_custom_site_sessions(expires_at);
create index if not exists idx_custom_site_sessions_ip_hash
  on anonymous_custom_site_sessions(ip_hash, created_at desc);

alter table anonymous_custom_site_sessions enable row level security;

drop policy if exists "Service role only" on anonymous_custom_site_sessions;
create policy "Service role only" on anonymous_custom_site_sessions
  for all using (auth.role() = 'service_role');

create or replace function set_anonymous_custom_site_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_custom_site_sessions_updated_at
  on anonymous_custom_site_sessions;
create trigger trg_custom_site_sessions_updated_at
  before update on anonymous_custom_site_sessions
  for each row
  execute function set_anonymous_custom_site_sessions_updated_at();

-- ============================================================================
-- CUSTOM SITE REQUESTS
-- ============================================================================

create table if not exists custom_site_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  project_type text not null,
  description text not null,
  features text[] not null default '{}',
  custom_integrations_text text,
  other_features_text text,
  budget_range text,
  timeline text not null,
  reference_url text,
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'approved', 'declined')),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_custom_site_requests_status_created
  on custom_site_requests(status, created_at desc);
create index if not exists idx_custom_site_requests_user
  on custom_site_requests(user_id, created_at desc);

alter table custom_site_requests enable row level security;

drop policy if exists "custom_site_requests_select_own" on custom_site_requests;
create policy "custom_site_requests_select_own" on custom_site_requests
  for select using (auth.uid() = user_id);

drop policy if exists "custom_site_requests_insert_own" on custom_site_requests;
create policy "custom_site_requests_insert_own" on custom_site_requests
  for insert with check (auth.uid() = user_id);

drop policy if exists "custom_site_requests_admin_all" on custom_site_requests;
create policy "custom_site_requests_admin_all" on custom_site_requests
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

grant select, insert on custom_site_requests to authenticated;
grant all on custom_site_requests to service_role;
grant all on anonymous_custom_site_sessions to service_role;
