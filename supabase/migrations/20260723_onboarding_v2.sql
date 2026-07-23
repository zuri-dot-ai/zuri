-- ============================================================================
-- 20260723_onboarding_v2.sql
-- Onboarding V2: anonymous-first session storage, onboarding-scoped image
-- uploads, structured (jsonb) services on business_profiles, and the
-- conversion function that migrates anonymous data into a real account.
-- See docs/00_SESSION_PROMPT_PREMIUM_OVERHAUL.md + docs/01_ONBOARDING_V2.md.
-- ============================================================================

-- ============================================================================
-- ANONYMOUS ONBOARDING SESSIONS (§2.2)
-- ============================================================================

create table if not exists anonymous_onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  data jsonb not null default '{}',
  current_step integer not null default 1,
  archetype text,
  ip_hash text,
  user_agent_hash text,
  upload_count integer not null default 0,
  converted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '72 hours')
);

create index if not exists idx_anon_sessions_token on anonymous_onboarding_sessions(session_token);
create index if not exists idx_anon_sessions_expires on anonymous_onboarding_sessions(expires_at);
create index if not exists idx_anon_sessions_ip_hash_created on anonymous_onboarding_sessions(ip_hash, created_at desc);

-- No RLS in the traditional sense (no auth.uid() exists yet for these rows)
-- but lock this table to service-role-only access — never exposed to the
-- anon key directly. All reads/writes go through API routes using the
-- service-role client.
alter table anonymous_onboarding_sessions enable row level security;

drop policy if exists "Service role only" on anonymous_onboarding_sessions;
create policy "Service role only" on anonymous_onboarding_sessions
  for all using (auth.role() = 'service_role');

-- Keep updated_at fresh on every PATCH.
create or replace function set_anonymous_onboarding_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_anon_sessions_updated_at on anonymous_onboarding_sessions;
create trigger trg_anon_sessions_updated_at
  before update on anonymous_onboarding_sessions
  for each row
  execute function set_anonymous_onboarding_sessions_updated_at();

-- ============================================================================
-- ONBOARDING UPLOADED IMAGES (§5.1) — transitional scratch space, migrated
-- into website_images on conversion, not permanent storage itself.
-- ============================================================================

create table if not exists onboarding_uploaded_images (
  id uuid primary key default gen_random_uuid(),
  anonymous_session_token text references anonymous_onboarding_sessions(session_token) on delete cascade,
  slot_type text not null,          -- 'hero' | 'about' | 'gallery' | 'before' | 'after' | 'work'
  cloudinary_public_id text not null,
  cloudinary_url text not null,
  width integer,
  height integer,
  pair_index integer,                -- for before/after: groups a before+after into one pair
  created_at timestamptz default now()
);

create index if not exists idx_onboarding_images_session on onboarding_uploaded_images(anonymous_session_token);

alter table onboarding_uploaded_images enable row level security;

drop policy if exists "Service role only" on onboarding_uploaded_images;
create policy "Service role only" on onboarding_uploaded_images
  for all using (auth.role() = 'service_role');

-- ============================================================================
-- MIGRATION FUNCTION — onboarding images to permanent user images (§8)
-- ============================================================================

create or replace function migrate_onboarding_images_to_user(
  p_session_token text,
  p_user_id uuid
) returns void language plpgsql security definer as $$
begin
  insert into website_images (user_id, storage_path, public_url, slot, created_at)
  select p_user_id, cloudinary_public_id, cloudinary_url, slot_type, now()
  from onboarding_uploaded_images
  where anonymous_session_token = p_session_token;
end;
$$;

-- ============================================================================
-- BUSINESS_PROFILES — services becomes structured jsonb (§8/§9)
-- Each element: { "name": string, "description": string }. Existing text[]
-- rows are migrated to jsonb-wrapped strings (best-effort; pre-v2 rows never
-- had a description, so downstream consumers must tolerate a missing one).
-- ============================================================================

alter table business_profiles
  alter column services drop default;

alter table business_profiles
  alter column services type jsonb using (
    case
      when services is null then '[]'::jsonb
      else to_jsonb(services)
    end
  );

alter table business_profiles
  alter column services set default '[]'::jsonb;

-- ============================================================================
-- RATE LIMIT RETENTION — the existing purge_old_rate_limits() (008_misc.sql)
-- deletes rows older than 2 hours, which is too aggressive for the new
-- 24-hour "onboarding:start per ip_hash" window (§2.3). Extend retention to
-- 24 hours; all existing categories use windows <= 1 hour so this is a
-- strictly safe widening, not a behavior change for them.
-- ============================================================================

create or replace function purge_old_rate_limits()
returns void
language plpgsql
security definer
as $$
begin
  delete from rate_limit_log where created_at < now() - interval '24 hours';
end;
$$;

-- ============================================================================
-- CRON SUPPORT — purge expired anonymous sessions daily (privacy hygiene).
-- Actual scheduling is done via /api/cron/purge-expired-sessions (Phase 4);
-- this is just the reusable server-side function it calls.
-- onboarding_uploaded_images rows are cleaned up automatically via
-- ON DELETE CASCADE on anonymous_session_token.
-- ============================================================================

create or replace function purge_expired_anonymous_sessions()
returns void
language plpgsql
security definer
as $$
begin
  delete from anonymous_onboarding_sessions where expires_at < now();
end;
$$;

grant execute on function migrate_onboarding_images_to_user(text, uuid) to service_role;
grant execute on function purge_expired_anonymous_sessions() to service_role;
grant select, insert, update, delete on table anonymous_onboarding_sessions to service_role;
grant select, insert, update, delete on table onboarding_uploaded_images to service_role;
