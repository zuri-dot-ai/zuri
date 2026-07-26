-- Harden auth signup: subscription trigger must never roll back auth.users INSERT.
-- Safe to re-apply even if 20260726_subscription_trials.sql already ran.

create or replace function create_default_subscription()
returns trigger
language plpgsql
security definer
as $$
begin
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
  exception when others then
    raise warning 'create_default_subscription failed for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
