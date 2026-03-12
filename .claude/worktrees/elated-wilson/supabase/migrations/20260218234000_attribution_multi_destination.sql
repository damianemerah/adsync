-- ============================================================
-- Follow-up migration: Multi-destination attribution support
-- Adds destination_type, pixel_token, event tracking columns,
-- per-destination click counters, and updates the RPC function.
-- ============================================================

-- -----------------------------------------------------------
-- 1. ALTER TABLE — attribution_links
-- -----------------------------------------------------------

ALTER TABLE attribution_links
  ADD COLUMN IF NOT EXISTS destination_type TEXT NOT NULL DEFAULT 'whatsapp',
  -- 'whatsapp' | 'website' | 'other'
  ADD COLUMN IF NOT EXISTS pixel_token TEXT UNIQUE;
  -- 12-char nanoid for website pixel snippet, NULL for whatsapp links

-- -----------------------------------------------------------
-- 2. ALTER TABLE — link_clicks
-- -----------------------------------------------------------

ALTER TABLE link_clicks
  ADD COLUMN IF NOT EXISTS destination_type TEXT,
  -- mirrors attribution_links.destination_type
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'click',
  -- 'click' = initial redirect (all types)
  -- 'view'  = pixel fired on website page load
  -- 'lead'  = pixel fired on form submit / WhatsApp open
  -- 'purchase' = pixel fired on order confirmation
  ADD COLUMN IF NOT EXISTS event_value_ngn INTEGER;
  -- populated for 'purchase' events (whole Naira)

-- -----------------------------------------------------------
-- 3. ALTER TABLE — campaigns (add multi-destination counters)
-- -----------------------------------------------------------

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS website_clicks    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_link_clicks INTEGER DEFAULT 0;

-- Backfill total_link_clicks from existing whatsapp_clicks
UPDATE campaigns
  SET total_link_clicks = COALESCE(whatsapp_clicks, 0)
  WHERE total_link_clicks = 0 AND COALESCE(whatsapp_clicks, 0) > 0;

-- -----------------------------------------------------------
-- 4. CREATE INDEX — new columns
-- -----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_attribution_links_pixel_token
  ON attribution_links(pixel_token)
  WHERE pixel_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_link_clicks_event_type
  ON link_clicks(event_type);

-- -----------------------------------------------------------
-- 5. CREATE OR REPLACE FUNCTION — multi-destination increment
-- -----------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_campaign_clicks(
  p_campaign_id    UUID,
  p_destination_type TEXT DEFAULT 'whatsapp'
) RETURNS VOID AS $$
  UPDATE campaigns
  SET
    total_link_clicks = COALESCE(total_link_clicks, 0) + 1,
    whatsapp_clicks   = CASE WHEN p_destination_type = 'whatsapp'
                          THEN COALESCE(whatsapp_clicks, 0) + 1
                          ELSE COALESCE(whatsapp_clicks, 0) END,
    website_clicks    = CASE WHEN p_destination_type = 'website'
                          THEN COALESCE(website_clicks, 0) + 1
                          ELSE COALESCE(website_clicks, 0) END,
    last_click_at     = NOW()
  WHERE id = p_campaign_id;
$$ LANGUAGE SQL SECURITY DEFINER
SET search_path = public;
