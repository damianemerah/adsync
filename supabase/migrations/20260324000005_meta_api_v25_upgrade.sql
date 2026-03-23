-- Migration: Meta API v25.0 Upgrade
-- Date: 2026-03-24
-- Purpose: Add new v25.0 metrics and Advantage+ tracking to support enhanced error handling and campaign optimization

-- ============================================================
-- 1. Add new v25.0 metrics to campaign_metrics table
-- ============================================================
-- media_views: Replaces page_impressions (deprecated June 2026)
-- media_viewers: Replaces page_reach (deprecated June 2026)
-- These metrics provide unified measurement across Facebook/Instagram for video/reel content

ALTER TABLE campaign_metrics
ADD COLUMN IF NOT EXISTS media_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS media_viewers INTEGER DEFAULT 0;

COMMENT ON COLUMN campaign_metrics.media_views IS 'v25.0: Number of times media (video/reel) was viewed. Replaces deprecated page_impressions.';
COMMENT ON COLUMN campaign_metrics.media_viewers IS 'v25.0: Number of unique people who viewed media. Replaces deprecated page_reach.';

-- ============================================================
-- 2. Add new v25.0 metrics to campaigns table (summary metrics)
-- ============================================================
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS media_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS media_viewers INTEGER DEFAULT 0;

COMMENT ON COLUMN campaigns.media_views IS 'v25.0: Total media views across campaign lifetime';
COMMENT ON COLUMN campaigns.media_viewers IS 'v25.0: Total unique media viewers across campaign lifetime';

-- ============================================================
-- 3. Add Advantage+ configuration tracking to campaigns
-- ============================================================
-- Tracks which Advantage+ features are enabled for each campaign
-- This allows users to see which optimizations Meta is applying automatically

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS advantage_plus_config JSONB DEFAULT '{
  "audience": true,
  "placements": true,
  "creative": false,
  "budget": false
}'::jsonb;

COMMENT ON COLUMN campaigns.advantage_plus_config IS 'v25.0: Tracks which Advantage+ features are enabled. audience=Advantage+ Audience (auto-expand targeting), placements=Advantage+ Placements (auto-optimize placement selection), creative=Advantage+ Creative (auto-enhance media/text), budget=Advantage+ Budget (campaign-level budget optimization)';

-- ============================================================
-- 4. Add Meta API error tracking to campaigns
-- ============================================================
-- Stores structured error information from v25.0's enhanced error handling
-- This enables better diagnostics and user-facing error messages

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS meta_issues JSONB DEFAULT NULL;

COMMENT ON COLUMN campaigns.meta_issues IS 'v25.0: Structured error data from Meta Campaign Issues API. Contains error_code, error_message, error_summary, error_type (warning|error|critical), level (campaign|ad_set|ad). NULL means no issues detected.';

-- ============================================================
-- 5. Add last issue check timestamp
-- ============================================================
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS issues_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN campaigns.issues_checked_at IS 'Timestamp of last successful campaign issues check via v25.0 API';

-- ============================================================
-- 6. Create index for issue-filtering queries
-- ============================================================
-- Allows efficient queries like "show all campaigns with critical issues"
CREATE INDEX IF NOT EXISTS idx_campaigns_meta_issues
ON campaigns USING GIN (meta_issues)
WHERE meta_issues IS NOT NULL;

-- ============================================================
-- 7. Create index for Advantage+ filtering
-- ============================================================
-- Allows efficient queries like "show all campaigns with Advantage+ Audience enabled"
CREATE INDEX IF NOT EXISTS idx_campaigns_advantage_plus_config
ON campaigns USING GIN (advantage_plus_config);

-- ============================================================
-- 8. Add webhook certificate validation tracking to ad_accounts
-- ============================================================
-- Important: mTLS certificate update deadline is March 31, 2026 (7 days away!)
-- This field tracks whether the account's webhooks are using the new certificate

ALTER TABLE ad_accounts
ADD COLUMN IF NOT EXISTS webhook_cert_updated BOOLEAN DEFAULT false;

COMMENT ON COLUMN ad_accounts.webhook_cert_updated IS 'v25.0: Whether Meta webhooks for this account have been updated to use the new mTLS certificate (deadline: March 31, 2026). NULL = no webhooks configured, false = using old cert, true = updated';

-- ============================================================
-- 9. Add API version tracking to ad_accounts
-- ============================================================
-- Tracks which API version was used to create the account connection
-- Useful for identifying accounts that need migration when deprecations occur

ALTER TABLE ad_accounts
ADD COLUMN IF NOT EXISTS api_version TEXT DEFAULT 'v25.0';

COMMENT ON COLUMN ad_accounts.api_version IS 'Meta Marketing API version used for this account. Updated when account is reconnected or tokens are refreshed.';
