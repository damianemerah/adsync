-- Per-creative asset metrics for dynamic campaigns, fetched via Meta breakdowns=image_asset.
-- Keyed by asset URL (matched using creative_snapshot.creative_hashes during sync).
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creative_asset_cache JSONB;
