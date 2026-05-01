ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_activated_at timestamptz NULL;

-- Backfill existing trialing/active orgs so they are never re-triggered
UPDATE organizations
SET trial_activated_at = COALESCE(created_at, NOW())
WHERE subscription_status IN ('trialing', 'active')
  AND trial_activated_at IS NULL;
