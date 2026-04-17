-- Add token_expires_at to meta_oauth_pending so the select route can
-- pass the original token expiry through to ad_accounts on account selection.
ALTER TABLE meta_oauth_pending
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;
