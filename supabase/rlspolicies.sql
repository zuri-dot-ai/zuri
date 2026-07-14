-- ════════════════════════════════════════════════════════
--  ZURI — Row Level Security Policies
--  Run THIRD (after functions.sql).
-- ════════════════════════════════════════════════════════

-- Enable RLS on every table
alter table public.users                 enable row level security;
alter table public.business_profiles     enable row level security;
alter table public.websites              enable row level security;
alter table public.content_calendar      enable row level security;
alter table public.action_plan_tasks     enable row level security;
alter table public.user_progress         enable row level security;
alter table public.agencies              enable row level security;
alter table public.agency_match_requests enable row level security;
alter table public.platform_connections  enable row level security;

-- ────────────────────────────────────────────────────────
--  USERS — read/update own row only
-- ────────────────────────────────────────────────────────
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- ────────────────────────────────────────────────────────
--  BUSINESS PROFILES — full ownership
-- ────────────────────────────────────────────────────────
create policy "profiles_all_own" on public.business_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────
--  WEBSITES — owner full access; published sites PUBLIC read
-- ────────────────────────────────────────────────────────
create policy "websites_all_own" on public.websites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "websites_public_read_published" on public.websites
  for select using (is_published = true);

-- ────────────────────────────────────────────────────────
--  CONTENT CALENDAR — full ownership
-- ────────────────────────────────────────────────────────
create policy "content_all_own" on public.content_calendar
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────
--  ACTION PLAN TASKS — full ownership
-- ────────────────────────────────────────────────────────
create policy "tasks_all_own" on public.action_plan_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────
--  USER PROGRESS — read/update own (insert via trigger)
-- ────────────────────────────────────────────────────────
create policy "progress_select_own" on public.user_progress
  for select using (auth.uid() = user_id);
create policy "progress_update_own" on public.user_progress
  for update using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────
--  AGENCIES — PUBLIC read for active listings
--  (writes happen via service role / admin only)
-- ────────────────────────────────────────────────────────
create policy "agencies_public_read_active" on public.agencies
  for select using (is_active = true);

-- ────────────────────────────────────────────────────────
--  AGENCY MATCH REQUESTS — user owns their requests
-- ────────────────────────────────────────────────────────
create policy "match_requests_all_own" on public.agency_match_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────
--  PLATFORM CONNECTIONS — full ownership
-- ────────────────────────────────────────────────────────
create policy "connections_all_own" on public.platform_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────
--  NOTE: The service role key (server-side) BYPASSES RLS.
--  Use it in API routes for admin tasks (seeding agencies,
--  webhook subscription updates, sending agency match emails).
-- ────────────────────────────────────────────────────────