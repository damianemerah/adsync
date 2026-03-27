-- Update token refresh cron to run every 12 hours instead of daily
-- This provides better reliability and catches any missed refresh cycles

-- 1. Unschedule existing daily cron
select cron.unschedule('refresh-meta-tokens');

-- 2. Reschedule to run every 12 hours (3:00 AM and 3:00 PM UTC)
select cron.schedule(
  'refresh-meta-tokens',
  '0 3,15 * * *',  -- Every 12 hours at 3:00 AM and 3:00 PM UTC (better reliability)
  $$ select net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/refresh-meta-tokens',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) $$
);
