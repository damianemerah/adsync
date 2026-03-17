ALTER TABLE ads
  ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE;

CREATE INDEX idx_ads_campaign_id ON ads(campaign_id);
