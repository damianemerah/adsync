-- ============================================================================
-- Insights Sync Cron Schedules
-- ============================================================================
-- Replaces the old sync-campaign-insights cron with queue-based architecture
-- ============================================================================

-- ============================================================================
-- 1. Remove Old Sync Function (if exists)
-- ============================================================================
SELECT cron.unschedule('sync-campaign-insights')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-campaign-insights'
);

-- ============================================================================
-- 2. Insights Sync Enqueuer (Every 6 hours)
-- ============================================================================
-- Creates batch jobs for all active campaigns

SELECT cron.schedule(
  'enqueue-insights-sync',
  '0 */6 * * *', -- At minute 0 past every 6th hour (0:00, 6:00, 12:00, 18:00)
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/enqueue-insights-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000 -- 1 minute timeout (just creates jobs)
    ) AS request_id;
  $$
);

-- ============================================================================
-- 3. Insights Sync Worker (Every 5 minutes)
-- ============================================================================
-- Processes queued insights sync jobs in batches

SELECT cron.schedule(
  'process-insights-sync',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-insights-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 240000 -- 4 minute timeout (processes batches)
    ) AS request_id;
  $$
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION cron.schedule IS 'Triggers insights sync enqueuer every 6 hours to create batch jobs';

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Run this to verify cron jobs are scheduled:
-- SELECT jobid, schedule, command, active
-- FROM cron.job
-- WHERE jobname LIKE '%insights%'
-- ORDER BY jobid;
