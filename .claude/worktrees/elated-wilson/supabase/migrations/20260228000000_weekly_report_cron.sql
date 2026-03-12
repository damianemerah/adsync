-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create pg_cron job for weekly-report
--    Runs every Monday at 8am UTC (0 8 * * 1)
-- ─────────────────────────────────────────────────────────────────────────────

select cron.schedule(
  'weekly-report',
  '0 8 * * 1',
  $$
    select net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/weekly-report',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    )
  $$
);
