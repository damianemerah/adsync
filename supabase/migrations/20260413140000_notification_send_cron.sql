-- Add cron job to process notification_send queue every 2 minutes.
-- External delivery (email/WhatsApp) is queued for reliability with retry.

SELECT cron.schedule(
  'process-notification-send-jobs',
  '*/2 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/process-notification-send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    ) AS request_id;
  $$
);
