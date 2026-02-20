-- Add missing columns to creatives table for better management
-- Based on recommendations from CREATIVE_MANAGEMENT_RECOMMENDATIONS.md

-- Add retention and tracking fields
ALTER TABLE creatives
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_creatives_is_favorite ON creatives(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_creatives_last_used ON creatives(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_creatives_tags ON creatives USING GIN(tags);

-- Add comments for clarity
COMMENT ON COLUMN creatives.is_favorite IS 'User marked as favorite - never auto-delete';
COMMENT ON COLUMN creatives.last_used_at IS 'Last time creative was used in a campaign';
COMMENT ON COLUMN creatives.usage_count IS 'Number of times creative was used in campaigns';
COMMENT ON COLUMN creatives.tags IS 'User-defined tags for organization and search';
COMMENT ON COLUMN creatives.thumbnail_url IS 'Auto-generated thumbnail for faster loading';

-- Create function to auto-update last_used_at when creative is used in a campaign
CREATE OR REPLACE FUNCTION update_creative_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- When an ad is created or updated with a creative
  IF NEW.creative_id IS NOT NULL THEN
    UPDATE creatives
    SET 
      last_used_at = NOW(),
      usage_count = usage_count + 1
    WHERE id = NEW.creative_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on ads table to track usage
DROP TRIGGER IF EXISTS trigger_update_creative_usage ON ads;
CREATE TRIGGER trigger_update_creative_usage
  AFTER INSERT OR UPDATE OF creative_id ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_creative_usage();
