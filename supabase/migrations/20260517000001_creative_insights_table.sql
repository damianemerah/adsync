-- Materialized creative insights, pre-computed by the process-insights-sync edge function.
-- Replaces the on-demand evaluation that previously ran on every page load.
CREATE TABLE creative_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  campaign_id TEXT,
  campaign_name TEXT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'opportunity')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_label TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  cta_href TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX creative_insights_org_idx ON creative_insights (organization_id);
CREATE INDEX creative_insights_campaign_idx ON creative_insights (campaign_id);
-- One insight per signal type per campaign
CREATE UNIQUE INDEX creative_insights_campaign_type_uidx
  ON creative_insights (campaign_id, type)
  WHERE campaign_id IS NOT NULL;

ALTER TABLE creative_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read own insights"
  ON creative_insights FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id::text FROM organization_members WHERE user_id = auth.uid()
    )
  );
