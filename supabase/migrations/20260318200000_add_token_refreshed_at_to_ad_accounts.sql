ALTER TABLE public.ad_accounts
  ADD COLUMN IF NOT EXISTS token_refreshed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.ad_accounts.token_refreshed_at IS
  'Timestamp when the Meta access token was last refreshed. NULL means it was set during initial OAuth and has never been refreshed. Used by the token-refresh cron to determine staleness (refresh at ~50 days).';
