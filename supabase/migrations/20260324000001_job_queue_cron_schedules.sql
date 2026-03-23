-- ============================================================================
-- Job Queue Cron Schedules
-- ============================================================================
-- Sets up pg_cron schedules to trigger edge function workers that process
-- background jobs from the queue.
--
-- Prerequisites:
-- - Edge functions must be deployed first (supabase functions deploy)
-- - Replace YOUR_PROJECT_REF with your actual Supabase project reference
--
-- Workers configured:
-- 1. process-campaign-launch: Every minute (handles high-priority launches)
-- 2. cleanup-completed-jobs: Monthly (archives old completed jobs)
-- 3. monitor-stuck-jobs: Every 15 minutes (resets timed-out jobs)
-- ============================================================================

-- ============================================================================
-- 1. Campaign Launch Worker
-- ============================================================================
-- Processes campaign_launch jobs every minute
-- High frequency ensures users see their campaigns launch quickly (<1min)

SELECT cron.schedule(
  'process-campaign-launch-jobs',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-campaign-launch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000 -- 2 minute timeout
    ) AS request_id;
  $$
);

COMMENT ON FUNCTION cron.schedule IS 'Triggers campaign launch worker every minute to process queued launches';

-- ============================================================================
-- 2. Monthly Cleanup Job
-- ============================================================================
-- Removes completed jobs older than 30 days
-- Keeps database size manageable while retaining recent history for debugging

SELECT cron.schedule(
  'cleanup-completed-jobs',
  '0 2 1 * *', -- 2am on the 1st of each month
  $$
  SELECT cleanup_old_jobs(30);
  $$
);

-- ============================================================================
-- 3. Stuck Job Monitor
-- ============================================================================
-- Checks for jobs stuck in 'processing' status and resets them
-- Prevents jobs from being orphaned if worker crashes or times out

SELECT cron.schedule(
  'monitor-stuck-jobs',
  '*/15 * * * *', -- Every 15 minutes
  $$
  DO $$
  DECLARE
    stuck_count INT;
  BEGIN
    -- Reset jobs that have been processing for more than 15 minutes
    WITH stuck_jobs AS (
      SELECT id, attempts, max_attempts
      FROM job_queue
      WHERE status = 'processing'
      AND started_at < NOW() - INTERVAL '15 minutes'
    )
    UPDATE job_queue
    SET
      status = CASE
        WHEN attempts + 1 >= max_attempts THEN 'failed'
        ELSE 'pending'
      END,
      last_error = 'Job timed out after 15 minutes',
      attempts = attempts + 1,
      updated_at = NOW()
    FROM stuck_jobs
    WHERE job_queue.id = stuck_jobs.id;

    GET DIAGNOSTICS stuck_count = ROW_COUNT;

    -- Log to database
    IF stuck_count > 0 THEN
      INSERT INTO job_metrics (job_type, duration_ms, success, error_code)
      VALUES ('stuck_job_recovery', 0, true, 'reset_' || stuck_count);
    END IF;
  END $$;
  $$
);

-- ============================================================================
-- Store App Settings (for cron jobs)
-- ============================================================================
-- These settings are used by cron jobs to construct edge function URLs
-- Update these values after deployment

DO $$
BEGIN
  -- Create custom settings if they don't exist
  -- Replace these with your actual values after deployment

  EXECUTE format('ALTER DATABASE %I SET app.settings.supabase_url = %L',
    current_database(),
    'https://YOUR_PROJECT_REF.supabase.co'
  );

  EXECUTE format('ALTER DATABASE %I SET app.settings.service_role_key = %L',
    current_database(),
    'YOUR_SERVICE_ROLE_KEY'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Settings already exist or cannot be created: %', SQLERRM;
END $$;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- View active cron jobs
CREATE OR REPLACE FUNCTION list_active_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cron.jobid,
    cron.schedule,
    cron.command,
    cron.active
  FROM cron.job cron
  WHERE cron.active = true
  ORDER BY cron.jobid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION list_active_cron_jobs IS 'Lists all active pg_cron jobs (for debugging)';

-- ============================================================================
-- Manual Testing
-- ============================================================================

-- To manually trigger the campaign launch worker (for testing):
-- SELECT net.http_post(
--   url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-campaign-launch',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--   ),
--   body := '{}'::jsonb
-- );

-- To view all active cron jobs:
-- SELECT * FROM list_active_cron_jobs();

-- To disable a cron job:
-- SELECT cron.unschedule('process-campaign-launch-jobs');

-- To check job queue health:
-- SELECT * FROM get_job_queue_health();

-- ============================================================================
-- Post-Deployment Checklist
-- ============================================================================
-- [ ] Deploy edge functions: `supabase functions deploy process-campaign-launch`
-- [ ] Update app.settings.supabase_url with your project URL
-- [ ] Update app.settings.service_role_key with your service role key
-- [ ] Test manual trigger to verify edge function works
-- [ ] Monitor first 10 campaign launches for errors
-- [ ] Check job_metrics table after 24 hours
-- ============================================================================
