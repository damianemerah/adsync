-- Ads: track when they were last synced for freshness checks
ALTER TABLE ads ADD COLUMN synced_at TIMESTAMPTZ;

-- Campaigns: cache demographics breakdown from Meta (age/gender)
ALTER TABLE campaigns
  ADD COLUMN demographics_cache JSONB,
  ADD COLUMN demographics_synced_at TIMESTAMPTZ;
