-- ============================================================================
-- Lead Submissions Table Migration
-- ============================================================================
-- Creates storage for Meta Lead Ads form submissions captured via webhook
-- Supports multi-org workspace model with proper RLS policies
-- ============================================================================

-- ============================================================================
-- 1. Lead Submissions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Meta API References
  leadgen_id TEXT UNIQUE NOT NULL, -- Meta's unique lead ID (from webhook)
  form_id TEXT NOT NULL, -- Lead gen form ID
  ad_id TEXT, -- Meta ad ID that generated the lead
  adgroup_id TEXT, -- Meta ad set ID (optional from webhook)
  page_id TEXT, -- Facebook Page ID

  -- References (for multi-org scoping)
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Lead Data
  field_data JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {name, values[]} from Meta API

  -- Metadata
  submitted_at TIMESTAMPTZ NOT NULL, -- When user submitted the form (from Meta created_time)
  created_at TIMESTAMPTZ DEFAULT NOW(), -- When we captured it
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Indexes for Performance
-- ============================================================================
CREATE INDEX idx_lead_submissions_leadgen_id ON lead_submissions(leadgen_id);
CREATE INDEX idx_lead_submissions_form_id ON lead_submissions(form_id);
CREATE INDEX idx_lead_submissions_campaign_id ON lead_submissions(campaign_id);
CREATE INDEX idx_lead_submissions_organization_id ON lead_submissions(organization_id);
CREATE INDEX idx_lead_submissions_submitted_at ON lead_submissions(submitted_at DESC);
CREATE INDEX idx_lead_submissions_ad_id ON lead_submissions(ad_id) WHERE ad_id IS NOT NULL;

-- JSONB index for efficient queries on field_data
CREATE INDEX idx_lead_submissions_field_data ON lead_submissions USING GIN (field_data);

-- ============================================================================
-- 3. Row Level Security (RLS)
-- ============================================================================
ALTER TABLE lead_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see leads from their organizations
CREATE POLICY "Users can view leads from their organizations"
  ON lead_submissions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role can insert leads (webhook handler uses service role)
CREATE POLICY "Service role can insert leads"
  ON lead_submissions
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS, but policy required for explicit grant

-- Policy: Users can update leads from their organizations (e.g., mark as contacted)
CREATE POLICY "Users can update leads from their organizations"
  ON lead_submissions
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete leads from their organizations
CREATE POLICY "Users can delete leads from their organizations"
  ON lead_submissions
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. Helper Functions
-- ============================================================================

-- Function: Get lead count for a campaign
CREATE OR REPLACE FUNCTION get_campaign_lead_count(campaign_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM lead_submissions
  WHERE campaign_id = campaign_uuid;
$$;

-- Function: Get recent leads for a campaign (last 24 hours)
CREATE OR REPLACE FUNCTION get_recent_campaign_leads(campaign_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM lead_submissions
  WHERE campaign_id = campaign_uuid
    AND submitted_at > NOW() - INTERVAL '24 hours';
$$;

-- ============================================================================
-- 5. Comments for Documentation
-- ============================================================================
COMMENT ON TABLE lead_submissions IS 'Stores Meta Lead Ads form submissions captured via webhook. Multi-org scoped.';
COMMENT ON COLUMN lead_submissions.leadgen_id IS 'Meta''s unique lead ID from webhook payload (use to fetch full data from Graph API)';
COMMENT ON COLUMN lead_submissions.form_id IS 'Meta Lead Gen Form ID (references the form template)';
COMMENT ON COLUMN lead_submissions.field_data IS 'JSONB array of form field responses: [{"name": "email", "values": ["user@example.com"]}]';
COMMENT ON COLUMN lead_submissions.submitted_at IS 'Timestamp when user submitted the form (from Meta created_time field)';
COMMENT ON COLUMN lead_submissions.campaign_id IS 'Tenzu campaign that generated this lead (for org scoping and analytics)';
COMMENT ON COLUMN lead_submissions.organization_id IS 'Organization owner of this lead (for multi-org RLS filtering)';
