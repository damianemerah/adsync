-- Migration: add_pixel_token_to_organizations
-- Description: Adds a global pixel_token column to organizations.
-- Each org gets one token used in the Tenzu Pixel snippet (paste once, works for all campaigns).
-- Attribution to a specific campaign is resolved via the ?_ta= query param appended at redirect time.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS pixel_token TEXT UNIQUE;
