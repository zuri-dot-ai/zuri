-- Diagnose / fix subscription ↔ auth.users mismatch
-- Run in Supabase SQL Editor. Replace the email below as needed.

-- 1) Diagnostic: auth.users, profiles, and subscriptions must share the same UUID
SELECT
  au.id              AS auth_user_id,
  au.email           AS auth_email,
  p.id               AS profile_id,
  p.email            AS profile_email,
  s.user_id          AS subscription_user_id,
  s.plan_id,
  s.status,
  s.billing_cycle,
  s.current_period_start,
  s.current_period_end
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN subscriptions s ON s.user_id = au.id
WHERE au.email = 'code69704@gmail.com'
   OR p.email = 'code69704@gmail.com';

-- 2) If subscription_user_id is NULL or differs from auth_user_id,
--    upsert Pro onto the correct auth UUID (replace <AUTH_USER_ID>):
/*
INSERT INTO subscriptions (
  user_id, plan_id, status, billing_cycle,
  current_period_start, current_period_end,
  cancel_at_period_end, grace_period_end, updated_at
)
VALUES (
  '<AUTH_USER_ID>',
  'pro',
  'active',
  'monthly',
  now(),
  now() + interval '1 month',
  false,
  null,
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  plan_id = 'pro',
  status = 'active',
  billing_cycle = 'monthly',
  current_period_start = now(),
  current_period_end = now() + interval '1 month',
  cancel_at_period_end = false,
  grace_period_end = null,
  updated_at = now();
*/

-- 3) Verify after fix
/*
SELECT s.*
FROM subscriptions s
JOIN auth.users au ON au.id = s.user_id
WHERE au.email = 'code69704@gmail.com';
*/
