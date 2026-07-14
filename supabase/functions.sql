-- ════════════════════════════════════════════════════════
--  ZURI — Functions & Triggers
--  Run SECOND (after schema.sql).
-- ════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────
--  updated_at auto-touch
-- ────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated
  before update on public.users
  for each row execute function public.touch_updated_at();

create trigger trg_profiles_updated
  before update on public.business_profiles
  for each row execute function public.touch_updated_at();

create trigger trg_progress_updated
  before update on public.user_progress
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────
--  On new auth user → create public.users + user_progress
-- ────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.user_progress (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────
--  STREAK & BADGE ENGINE
--  Call complete_task(task_id) from the app when a user
--  marks a task done. Handles: completion flag, streak math,
--  totals, weekly rate, and badge awards — atomically.
-- ────────────────────────────────────────────────────────
create or replace function public.complete_task(p_task_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id        uuid;
  v_already_done   boolean;
  v_today          date := current_date;
  v_last_active    date;
  v_current_streak integer;
  v_longest        integer;
  v_total          integer;
  v_badges         text[];
  v_new_badges     text[] := '{}';
  v_week_done      integer;
  v_week_total     integer;
  v_rate           float;
begin
  -- Lock the task and verify ownership
  select user_id, is_completed
    into v_user_id, v_already_done
  from public.action_plan_tasks
  where id = p_task_id
  for update;

  if v_user_id is null then
    raise exception 'Task not found';
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  if v_already_done then
    return jsonb_build_object('status', 'already_completed');
  end if;

  -- Mark complete
  update public.action_plan_tasks
    set is_completed = true, completed_at = now()
  where id = p_task_id;

  -- Pull current progress
  select last_active_date, current_streak, longest_streak,
         total_tasks_completed, badges_earned
    into v_last_active, v_current_streak, v_longest, v_total, v_badges
  from public.user_progress
  where user_id = v_user_id
  for update;

  -- Streak math
  if v_last_active = v_today then
    -- already active today, streak unchanged
    null;
  elsif v_last_active = v_today - 1 then
    v_current_streak := v_current_streak + 1;   -- consecutive day
  else
    v_current_streak := 1;                        -- streak reset / first ever
  end if;

  v_longest := greatest(v_longest, v_current_streak);
  v_total   := v_total + 1;

  -- Weekly completion rate (current ISO week)
  select
    count(*) filter (where is_completed),
    count(*)
    into v_week_done, v_week_total
  from public.action_plan_tasks
  where user_id = v_user_id
    and due_date >= date_trunc('week', v_today)::date
    and due_date <  (date_trunc('week', v_today) + interval '7 days')::date;

  v_rate := case when v_week_total > 0
                 then round((v_week_done::numeric / v_week_total) * 100, 0)
                 else 0 end;

  -- Badge awards (only add if not already earned)
  if v_total = 1 and not ('first_post' = any(v_badges)) then
    v_new_badges := array_append(v_new_badges, 'first_post');
  end if;
  if v_current_streak >= 7 and not ('streak_7' = any(v_badges)) then
    v_new_badges := array_append(v_new_badges, 'streak_7');
  end if;
  if v_current_streak >= 30 and not ('streak_30' = any(v_badges)) then
    v_new_badges := array_append(v_new_badges, 'streak_30');
  end if;
  if v_total >= 30 and not ('content_30' = any(v_badges)) then
    v_new_badges := array_append(v_new_badges, 'content_30');
  end if;
  if v_total >= 90 and not ('graduate_90' = any(v_badges)) then
    v_new_badges := array_append(v_new_badges, 'graduate_90');
  end if;

  -- Persist progress
  update public.user_progress
    set current_streak       = v_current_streak,
        longest_streak       = v_longest,
        total_tasks_completed = v_total,
        last_active_date     = v_today,
        week_completion_rate = v_rate,
        badges_earned        = v_badges || v_new_badges
  where user_id = v_user_id;

  return jsonb_build_object(
    'status',          'completed',
    'current_streak',  v_current_streak,
    'longest_streak',  v_longest,
    'total_completed', v_total,
    'week_rate',       v_rate,
    'new_badges',      v_new_badges
  );
end;
$$;

-- ────────────────────────────────────────────────────────
--  Generate a unique website slug from a business name
--  e.g. "Bola's Bakery!" → "bolas-bakery" (or -2, -3 ... if taken)
-- ────────────────────────────────────────────────────────
create or replace function public.generate_unique_slug(p_name text)
returns text
language plpgsql
as $$
declare
  v_base text;
  v_slug text;
  v_n    integer := 1;
begin
  v_base := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  if v_base = '' then v_base := 'site'; end if;

  v_slug := v_base;
  while exists (select 1 from public.websites where published_slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  return v_slug;
end;
$$;