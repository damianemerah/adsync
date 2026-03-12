-- Migration: add_last_synced_at_to_ad_accounts
-- Adds a dedicated timestamp to track when campaign data was last
-- pulled from Meta. Separate from last_health_check which tracks
-- token validity / account balance health.
ALTER TABLE public.ad_accounts
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.ad_accounts.last_synced_at IS 'Timestamp of the last successful campaign data sync from Meta. Used by the 5-minute Cache-on-Read rule.';
