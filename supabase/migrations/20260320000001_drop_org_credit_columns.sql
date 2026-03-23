-- Drop stale credit columns from organizations.
-- Credits are now fully user-scoped (users.credits_balance / plan_credits_quota).
-- These columns were migrated to users in 20260319000001_user_level_credits.sql
-- but were never dropped from organizations.

ALTER TABLE organizations
  DROP COLUMN IF EXISTS credits_balance,
  DROP COLUMN IF EXISTS plan_credits_quota,
  DROP COLUMN IF EXISTS credits_reset_at;
