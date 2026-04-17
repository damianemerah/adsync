-- Wire account_health_check jobs through the queue.
-- 1. Dedup index: only one pending health check per ad account at a time.
-- 2. Cron: run process-account-health processor every 3 minutes.

-- Dedup index (one pending job per ad account)
CREATE UNIQUE INDEX IF NOT EXISTS job_queue_account_health_pending_per_account
  ON job_queue ((payload->>'adAccountId'))
  WHERE status = 'pending' AND type = 'account_health_check';

-- Cron: process one pending account_health_check job every 3 minutes
SELECT cron.schedule(
  'process-account-health-jobs',
  '*/3 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/process-account-health',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    ) AS request_id;
  $$
);
