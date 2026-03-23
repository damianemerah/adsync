-- Migration: Add soft delete support to ad_accounts table
-- This prevents data loss when users disconnect and reconnect accounts

-- 1. Add disconnected_at column for soft delete tracking
ALTER TABLE ad_accounts
ADD COLUMN disconnected_at TIMESTAMPTZ;

-- 2. Add index for efficient querying of active (non-disconnected) accounts
CREATE INDEX idx_ad_accounts_active ON ad_accounts (organization_id, platform)
WHERE disconnected_at IS NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN ad_accounts.disconnected_at IS
'Timestamp when the account was disconnected. NULL means currently connected. Allows preserving campaign history while hiding disconnected accounts from UI.';

-- 4. (Optional) Create a view for active accounts only
CREATE OR REPLACE VIEW active_ad_accounts AS
SELECT * FROM ad_accounts
WHERE disconnected_at IS NULL;

COMMENT ON VIEW active_ad_accounts IS
'View of only connected ad accounts (disconnected_at IS NULL). Use this for most queries to automatically exclude soft-deleted accounts.';
