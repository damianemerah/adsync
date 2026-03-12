-- Migration: Add campaign context support for AI generation
-- Date: 2026-02-13
-- Purpose: Link creatives to campaigns and cache AI context for context-aware generation

-- 1. Add campaign_id to creatives table
-- This links each generated creative back to its source campaign for context inheritance
ALTER TABLE creatives 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS generation_context JSONB;

-- Index for performance when querying creatives by campaign
CREATE INDEX IF NOT EXISTS idx_creatives_campaign ON creatives(campaign_id);

-- Add comments for documentation
COMMENT ON COLUMN creatives.campaign_id IS 'Links creative to parent campaign for context inheritance';
COMMENT ON COLUMN creatives.generation_context IS 'Cached context used during generation (targeting, copy, demographics)';

-- 2. Add ai_context to campaigns table
-- Stores the parsed ADS_SYSTEM output for reuse in creative generation
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS ai_context JSONB;

COMMENT ON COLUMN campaigns.ai_context IS 'Cached ADS_SYSTEM output including targeting, copy, and demographics for context-aware generation';

-- 3. Enhance ai_requests table for analytics
-- Track whether context was used and its source
ALTER TABLE ai_requests
ADD COLUMN IF NOT EXISTS used_context BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS context_source TEXT CHECK (context_source IN ('campaign', 'template', 'raw', 'auto'));

COMMENT ON COLUMN ai_requests.used_context IS 'Whether campaign context was used to enhance the prompt';
COMMENT ON COLUMN ai_requests.context_source IS 'Source of context: campaign (from wizard), template (UI template), raw (user only), auto (AI detected)';

-- 4. Create analytics view for monitoring context usage
CREATE OR REPLACE VIEW ai_generation_analytics AS
SELECT 
  DATE_TRUNC('day', ai_requests.created_at) as date,
  ai_requests.organization_id,
  COUNT(*) as total_generations,
  COUNT(CASE WHEN used_context THEN 1 END) as context_enhanced_count,
  ROUND(100.0 * COUNT(CASE WHEN used_context THEN 1 END) / NULLIF(COUNT(*), 0), 2) as enhancement_rate,
  context_source,
  ROUND(AVG(CASE WHEN result_json->>'image_url' IS NOT NULL THEN 1 ELSE 0 END) * 100, 2) as success_rate
FROM ai_requests
WHERE request_type IN ('image_generation', 'image_edit')
GROUP BY date, ai_requests.organization_id, context_source
ORDER BY date DESC;

COMMENT ON VIEW ai_generation_analytics IS 'Daily metrics for AI generation performance and context usage tracking';

-- 5. Function to securely fetch campaign context for Studio
-- This ensures users can only access context for their organization's campaigns
CREATE OR REPLACE FUNCTION get_campaign_context(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context JSONB;
BEGIN
  -- Fetch context only if user belongs to the campaign's organization
  SELECT ai_context INTO v_context
  FROM campaigns
  WHERE id = p_campaign_id
  AND organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  );
  
  RETURN v_context;
END;
$$;

COMMENT ON FUNCTION get_campaign_context IS 'Securely fetch campaign AI context for generation with RLS';

-- 6. Grant necessary permissions
GRANT SELECT ON ai_generation_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_context TO authenticated;
