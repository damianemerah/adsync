select cron.schedule(
  'refresh-meta-tokens',
  '0 3 * * *',  -- Daily at 3:00 AM UTC (low traffic)
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
