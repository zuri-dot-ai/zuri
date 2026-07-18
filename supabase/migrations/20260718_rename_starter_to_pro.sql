-- Rename legacy plan id `starter` → `pro` (canonical: free|pro|growth|premium)
-- Safe to re-run.

-- Ensure pro plan row exists (copy from starter if needed)
INSERT INTO plans (id, name, price_monthly, price_annual, limits, is_active)
SELECT 'pro', 'Pro', price_monthly, price_annual, limits, is_active
FROM plans
WHERE id = 'starter'
ON CONFLICT (id) DO NOTHING;

-- If pro already seeded in 001, leave it; only remap subscriptions
UPDATE subscriptions
SET plan_id = 'pro', updated_at = now()
WHERE plan_id = 'starter';

UPDATE payment_history
SET plan_id = 'pro'
WHERE plan_id = 'starter';

-- Drop obsolete starter plan row if present
DELETE FROM plans WHERE id = 'starter';
