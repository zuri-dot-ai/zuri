-- ============================================================================
-- 002_monetization.sql
-- usage_tracking (+increment_usage), payment_history, webhook_events
-- Exact schemas from docs/06_MONETIZATION.md Section 7
-- ============================================================================

-- ============================================================================
-- USAGE TRACKING (resets per billing period)
-- ============================================================================

create table if not exists usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  period_start date not null,
  images_generated integer not null default 0,
  blog_posts_generated integer not null default 0,
  newsletters_generated integer not null default 0,
  content_calendar_posts integer not null default 0,
  website_regenerations integer not null default 0,
  content_ideas_used integer not null default 0,
  storage_used_mb numeric not null default 0,
  updated_at timestamptz default now(),
  unique (user_id, period_start)
);

create index if not exists idx_usage_tracking_user_period on usage_tracking(user_id, period_start);

-- Atomic usage increment (prevents race conditions)
-- Exact implementation from docs/06_MONETIZATION.md Section 7
create or replace function increment_usage(
  p_user_id uuid,
  p_metric text,
  p_amount integer default 1
) returns void
language plpgsql
security definer
as $$
declare
  v_period date := date_trunc('month', now())::date;
begin
  insert into usage_tracking (user_id, period_start)
  values (p_user_id, v_period)
  on conflict (user_id, period_start) do nothing;

  execute format(
    'update usage_tracking set %I = %I + $1, updated_at = now()
     where user_id = $2 and period_start = $3',
    p_metric, p_metric
  ) using p_amount, p_user_id, v_period;
end;
$$;

-- ============================================================================
-- PAYMENT HISTORY
-- ============================================================================

create table if not exists payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_id text references plans(id),
  amount integer not null,
  currency text not null default 'NGN',
  status text not null default 'pending',
  -- status: pending | successful | failed | refunded
  billing_cycle text,
  payment_type text,
  -- payment_type: subscription_new | subscription_renewal | upgrade | downgrade | refund
  flutterwave_transaction_id text unique,
  flutterwave_reference text,
  created_at timestamptz default now()
);

create index if not exists idx_payment_history_user_id on payment_history(user_id);
create index if not exists idx_payment_history_transaction on payment_history(flutterwave_transaction_id);

-- ============================================================================
-- WEBHOOK EVENTS LOG (idempotency)
-- ============================================================================

create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  processed boolean default false,
  processed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_webhook_events_event_id on webhook_events(event_id);
