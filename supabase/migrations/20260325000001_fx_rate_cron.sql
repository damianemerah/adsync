-- ============================================================================
-- Schedule FX Rate Refresh via pg_cron
-- ============================================================================
-- Fetches latest USD→NGN rate daily at 01:00 UTC
-- Uses existing pg_cron extension from 20260227160001_setup_pg_cron_schedules.sql
-- ============================================================================

-- Schedule: Daily at 01:00 UTC (before business hours in Nigeria)
SELECT cron.schedule(
  'refresh-fx-rate',
  '0 1 * * *',  -- Cron: "At 01:00 every day"
  $$ SELECT net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/refresh-fx-rate',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) $$
);

COMMENT ON EXTENSION pg_cron IS 'Cron scheduler: refresh-fx-rate runs daily at 01:00 UTC';
