-- Wire meta_resource_cleanup jobs through the queue.
-- 1. Cron: process one pending cleanup job every 5 minutes.
-- 2. Cron: run daily audit to find orphaned Meta resources.

-- Process pending cleanup jobs every 5 minutes
SELECT cron.schedule(
  'process-meta-cleanup-jobs',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/process-meta-resource-cleanup',
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

-- Daily audit: enqueue cleanup jobs for failed campaigns with orphaned Meta resources
SELECT cron.schedule(
  'audit-meta-resources',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/audit-meta-resources',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) AS request_id;
  $$
);
