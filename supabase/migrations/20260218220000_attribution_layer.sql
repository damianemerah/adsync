-- ============================================================
-- Phase 1A: Attribution Layer
-- Creates attribution_links and link_clicks tables,
-- adds whatsapp tracking columns to campaigns,
-- and sets up the increment_campaign_clicks RPC function.
-- ============================================================

-- -----------------------------------------------------------
-- 1. CREATE TABLES
-- -----------------------------------------------------------

CREATE TABLE attribution_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT UNIQUE NOT NULL,          -- short token, e.g. "xK9mZ2"
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_id           UUID REFERENCES ads(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  destination_url TEXT NOT NULL,                  -- the real wa.me/... link
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ                    -- optional TTL
);

CREATE TABLE link_clicks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id         UUID NOT NULL REFERENCES attribution_links(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  clicked_at      TIMESTAMPTZ DEFAULT NOW(),
  device_type     TEXT,                          -- 'mobile' | 'desktop' | 'tablet'
  country         TEXT,                          -- from CF-IPCountry header
  referrer        TEXT                           -- utm source if present
);

-- -----------------------------------------------------------
-- 2. CREATE INDEXES
-- -----------------------------------------------------------

-- attribution_links: fast token lookup for the redirect route
CREATE INDEX idx_attribution_links_token ON attribution_links(token);
-- attribution_links: filter by campaign
CREATE INDEX idx_attribution_links_campaign ON attribution_links(campaign_id);
-- attribution_links: filter by organization (RLS queries)
CREATE INDEX idx_attribution_links_organization ON attribution_links(organization_id);

-- link_clicks: analytics by campaign
CREATE INDEX idx_link_clicks_campaign ON link_clicks(campaign_id);
-- link_clicks: time-range queries
CREATE INDEX idx_link_clicks_clicked_at ON link_clicks(clicked_at);
-- link_clicks: filter by link
CREATE INDEX idx_link_clicks_link ON link_clicks(link_id);
-- link_clicks: filter by organization (RLS queries)
CREATE INDEX idx_link_clicks_organization ON link_clicks(organization_id);

-- -----------------------------------------------------------
-- 3. ALTER TABLE — add WhatsApp tracking columns to campaigns
-- -----------------------------------------------------------

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS whatsapp_clicks     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_click_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS last_click_at       TIMESTAMPTZ;

-- -----------------------------------------------------------
-- 4. CREATE OR REPLACE FUNCTION
-- -----------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_campaign_clicks(p_campaign_id UUID)
RETURNS VOID AS $$
  UPDATE campaigns
  SET
    whatsapp_clicks = COALESCE(whatsapp_clicks, 0) + 1,
    last_click_at = NOW()
  WHERE id = p_campaign_id;
$$ LANGUAGE SQL SECURITY DEFINER
SET search_path = public;

-- -----------------------------------------------------------
-- 5. ENABLE ROW LEVEL SECURITY
-- -----------------------------------------------------------

ALTER TABLE attribution_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- 6. CREATE POLICIES
-- -----------------------------------------------------------

-- attribution_links -----------------------------------------

-- Public read: the /l/[token] redirect route runs without auth
CREATE POLICY "public_read_attribution_links"
  ON attribution_links
  FOR SELECT
  USING (true);

-- Org members can insert links (campaign launch flow)
CREATE POLICY "org_members_insert_links"
  ON attribution_links
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Org members can update their own links (linking campaign_id after insert)
CREATE POLICY "org_members_update_own_links"
  ON attribution_links
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Org members can delete their own links
CREATE POLICY "org_members_delete_own_links"
  ON attribution_links
  FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- link_clicks -----------------------------------------------

-- Public insert: the redirect route inserts clicks without auth
CREATE POLICY "public_insert_link_clicks"
  ON link_clicks
  FOR INSERT
  WITH CHECK (true);

-- Org members can read their own click data
CREATE POLICY "org_members_read_own_clicks"
  ON link_clicks
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );
