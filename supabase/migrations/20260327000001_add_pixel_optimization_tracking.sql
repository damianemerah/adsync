-- ============================================================
-- Add Pixel Optimization Tracking to Campaigns
-- Tracks whether a campaign is using OUTCOME_SALES optimization
-- based on Meta Pixel configuration
-- ============================================================

-- Add column to track if campaign uses Meta Pixel optimization
ALTER TABLE campaigns
ADD COLUMN uses_pixel_optimization BOOLEAN DEFAULT FALSE;

-- Add helpful comment
COMMENT ON COLUMN campaigns.uses_pixel_optimization IS
  'TRUE when campaign uses OUTCOME_SALES + OFFSITE_CONVERSIONS because Meta Pixel is configured. FALSE when using fallback OUTCOME_TRAFFIC + LANDING_PAGE_VIEWS.';

-- Index for querying campaigns eligible for upgrade
CREATE INDEX idx_campaigns_pixel_optimization
ON campaigns(uses_pixel_optimization, objective)
WHERE objective = 'traffic';

-- Index comment
COMMENT ON INDEX idx_campaigns_pixel_optimization IS
  'Speeds up queries to find traffic campaigns that could be upgraded to pixel optimization.';
