-- ============================================================================
-- Meta Ad Status Sync Cron Job
-- ============================================================================
-- Polls Meta API every 20 minutes for ads stuck in `in_review` status.
-- Acts as a safety net alongside webhook-driven approval-by-disappearance
-- detection in handleInProcessAdObjects.
--
-- Edge Function: meta-status-sync
-- Schedule: Every 20 minutes
-- ============================================================================

-- Drop if already exists (idempotent re-run safety)
DO $$
BEGIN
  PERFORM cron.unschedule('meta-status-sync');
  RAISE NOTICE 'Dropped existing meta-status-sync cron job';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'meta-status-sync cron job did not exist yet: %', SQLERRM;
END $$;

-- Schedule: every 20 minutes
SELECT cron.schedule(
  'meta-status-sync',
  '*/20 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/meta-status-sync',
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

-- Verify
DO $$
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE '=== Meta Status Sync Cron ===';
  FOR job_record IN
    SELECT jobname, schedule, active
    FROM cron.job
    WHERE jobname = 'meta-status-sync'
  LOOP
    RAISE NOTICE 'Job: % | Schedule: % | Active: %',
      job_record.jobname,
      job_record.schedule,
      job_record.active;
  END LOOP;
END $$;
