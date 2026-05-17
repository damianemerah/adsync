-- Add source column to campaigns to distinguish app-created vs Meta-imported
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'meta_import'
  CHECK (source IN ('tenzu', 'meta_import'));

-- Backfill: campaigns that are drafts with no platform_campaign_id are
-- definitely tenzu-created drafts that were never launched.
UPDATE campaigns
SET source = 'tenzu'
WHERE platform_campaign_id IS NULL AND status = 'draft';

-- Campaigns that were launched from Tenzu have a platform_campaign_id AND a
-- non-null creative_snapshot (set only by our launch action, not by sync).
-- This is the best heuristic we have for historical data.
UPDATE campaigns
SET source = 'tenzu'
WHERE platform_campaign_id IS NOT NULL
  AND creative_snapshot IS NOT NULL
  AND creative_snapshot != 'null'::jsonb
  AND source = 'meta_import';

COMMENT ON COLUMN campaigns.source IS
  'Origin of the campaign: ''tenzu'' = created/launched via Tenzu app, ''meta_import'' = synced from existing Meta account. Auto-archive rules only apply to tenzu campaigns.';
