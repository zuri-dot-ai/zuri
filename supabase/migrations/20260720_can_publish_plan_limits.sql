-- Align plans.limits with app PLAN_CONFIG:
-- Free may generate 1 preview site; publish is gated by can_publish.
-- Pro+ have can_publish: true; Growth+ keep custom_domain: true.

UPDATE plans
SET limits = limits
  || '{"websites": 1, "can_publish": false, "max_pages_per_site": 5}'::jsonb,
  name = 'Free'
WHERE id = 'free';

UPDATE plans
SET limits = limits || '{"can_publish": true}'::jsonb
WHERE id IN ('pro', 'growth', 'premium');
