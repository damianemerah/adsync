-- ============================================================
-- Phase 1B §2.1: Sales Tracking
-- Creates whatsapp_sales table, adds sales_count + revenue_ngn
-- to campaigns, and creates the update_campaign_sales_summary RPC.
-- ============================================================

-- 1. CREATE TABLE
CREATE TABLE whatsapp_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount_ngn      INTEGER NOT NULL,  -- whole Naira (not kobo)
  note            TEXT,
  recorded_by     UUID REFERENCES users(id),
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDEXES
CREATE INDEX idx_whatsapp_sales_campaign ON whatsapp_sales(campaign_id);
CREATE INDEX idx_whatsapp_sales_org ON whatsapp_sales(organization_id);

-- 3. ALTER CAMPAIGNS
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_ngn INTEGER DEFAULT 0;

-- 4. RLS
ALTER TABLE whatsapp_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_own_sales" ON whatsapp_sales
  FOR ALL USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- 5. RPC: Update campaign sales summary
CREATE OR REPLACE FUNCTION update_campaign_sales_summary(
  p_campaign_id UUID,
  p_amount_ngn  INTEGER
) RETURNS VOID AS $$
  UPDATE campaigns
  SET
    sales_count = COALESCE(sales_count, 0) + 1,
    revenue_ngn = COALESCE(revenue_ngn, 0) + p_amount_ngn
  WHERE id = p_campaign_id;
$$ LANGUAGE SQL SECURITY DEFINER
SET search_path = public;
