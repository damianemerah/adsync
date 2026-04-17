-- Migration: Drop Deprecated Meta Metrics
-- Description: Drops media_views and media_viewers from campaigns and campaign_metrics tables

ALTER TABLE campaigns 
DROP COLUMN IF EXISTS media_views,
DROP COLUMN IF EXISTS media_viewers;

ALTER TABLE campaign_metrics 
DROP COLUMN IF EXISTS media_views,
DROP COLUMN IF EXISTS media_viewers;
