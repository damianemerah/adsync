ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS has_physical_location    boolean,
  ADD COLUMN IF NOT EXISTS gets_leads_via_website   boolean,
  ADD COLUMN IF NOT EXISTS sells_online             boolean,
  ADD COLUMN IF NOT EXISTS books_appointments       boolean,
  ADD COLUMN IF NOT EXISTS wants_contact_ads        boolean,
  ADD COLUMN IF NOT EXISTS default_target_locations jsonb,
  ADD COLUMN IF NOT EXISTS default_target_interests jsonb;
