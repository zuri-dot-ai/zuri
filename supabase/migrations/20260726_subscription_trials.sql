-- Free trial system: no card required, auto-downgrade at trial end.
-- New signups start a 14-day Pro trial. Growth/Premium trials are 7 days,
-- one-time-ever per tier (tracked in trials_used).

alter table subscriptions
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_tier text,
  add column if not exists trials_used text[] not null default '{}',
  add column if not exists trial_ended_at timestamptz,
  add column if not exists trial_reminder_3d_sent_at timestamptz,
  add column if not exists trial_reminder_1d_sent_at timestamptz;

create index if not exists idx_subscriptions_trial_ends_at
  on subscriptions (trial_ends_at)
  where status = 'trialing' and trial_ends_at is not null;

-- New users: 14-day Pro trial (no payment method required).
create or replace function create_default_subscription()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into subscriptions (
    user_id,
    plan_id,
    status,
    trial_tier,
    trial_ends_at,
    trials_used,
    current_period_start,
    current_period_end
  )
  values (
    new.id,
    'pro',
    'trialing',
    'pro',
    now() + interval '14 days',
    array['pro']::text[],
    now(),
    now() + interval '14 days'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
