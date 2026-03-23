-- ============================================================================
-- Fix Queue System Cron Jobs
-- ============================================================================
-- This migration fixes three critical issues with the job queue cron system:
--
-- Issue 1: Missing app.settings configuration (service_role_key not accessible)
-- Issue 2: Ambiguous column reference in reset_stuck_jobs() function
-- Issue 3: Broken cron job definitions using current_setting() instead of vault
--
-- Solution: Replace custom settings with Supabase vault secrets (like other crons)
-- ============================================================================

-- ============================================================================
-- 1. Drop Broken Cron Jobs
-- ============================================================================

DO $$
BEGIN
  -- Drop the broken queue-related cron jobs
  PERFORM cron.unschedule('process-campaign-launch-jobs');
  PERFORM cron.unschedule('enqueue-insights-sync');
  PERFORM cron.unschedule('process-insights-sync');
  PERFORM cron.unschedule('monitor-stuck-jobs');
  PERFORM cron.unschedule('cleanup-completed-jobs');

  RAISE NOTICE 'Dropped broken cron jobs';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some cron jobs may not exist yet: %', SQLERRM;
END $$;

-- ============================================================================
-- 2. Fix reset_stuck_jobs() Function - Resolve Ambiguous Column References
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_stuck_jobs()
RETURNS INTEGER AS $$
DECLARE
  stuck_count INT;
BEGIN
  -- Update stuck jobs with fully qualified column names to avoid ambiguity
  WITH stuck_jobs AS (
    SELECT id, attempts, max_attempts
    FROM job_queue
    WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '15 minutes'
  )
  UPDATE job_queue
  SET
    status = CASE
      WHEN stuck_jobs.attempts + 1 >= stuck_jobs.max_attempts THEN 'failed'
      ELSE 'pending'
    END,
    last_error = 'Job timed out after 15 minutes',
    attempts = stuck_jobs.attempts + 1,
    updated_at = NOW()
  FROM stuck_jobs
  WHERE job_queue.id = stuck_jobs.id;

  GET DIAGNOSTICS stuck_count = ROW_COUNT;

  -- Log recovery metrics
  IF stuck_count > 0 THEN
    INSERT INTO job_metrics (job_type, duration_ms, success, error_code)
    VALUES ('stuck_job_recovery', 0, true, 'reset_' || stuck_count);
  END IF;

  RETURN stuck_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_stuck_jobs IS 'Resets jobs stuck in processing status for >15 minutes (with qualified column names to avoid ambiguity)';

-- ============================================================================
-- 3. Recreate Cron Jobs Using Vault Secrets
-- ============================================================================

-- Campaign Launch Worker (Every minute)
SELECT cron.schedule(
  'process-campaign-launch-jobs',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/process-campaign-launch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    ) AS request_id;
  $$
);

-- Insights Sync Enqueuer (Every 6 hours)
SELECT cron.schedule(
  'enqueue-insights-sync',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/enqueue-insights-sync',
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

-- Insights Sync Processor (Every 5 minutes)
SELECT cron.schedule(
  'process-insights-sync',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/process-insights-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 240000
    ) AS request_id;
  $$
);

-- Stuck Job Monitor (Every 15 minutes)
SELECT cron.schedule(
  'monitor-stuck-jobs',
  '*/15 * * * *',
  $$
  SELECT reset_stuck_jobs();
  $$
);

-- Monthly Cleanup Job (2am on the 1st of each month)
SELECT cron.schedule(
  'cleanup-completed-jobs',
  '0 2 1 * *',
  $$
  SELECT cleanup_old_jobs(30);
  $$
);

-- ============================================================================
-- 4. Verification Queries
-- ============================================================================

-- View all active queue-related cron jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE '=== Queue System Cron Jobs ===';
  FOR job_record IN
    SELECT jobname, schedule, active
    FROM cron.job
    WHERE jobname IN (
      'process-campaign-launch-jobs',
      'enqueue-insights-sync',
      'process-insights-sync',
      'monitor-stuck-jobs',
      'cleanup-completed-jobs'
    )
    ORDER BY jobname
  LOOP
    RAISE NOTICE 'Job: % | Schedule: % | Active: %',
      job_record.jobname,
      job_record.schedule,
      job_record.active;
  END LOOP;
END $$;

-- ============================================================================
-- Post-Migration Checklist
-- ============================================================================
-- [✓] Dropped broken cron jobs
-- [✓] Fixed reset_stuck_jobs() function with qualified columns
-- [✓] Recreated cron jobs using vault secrets
-- [✓] Verified jobs are scheduled
--
-- Next Steps:
-- 1. Monitor cron.job_run_details for successful executions
-- 2. Check edge function logs if jobs still fail
-- 3. Ensure edge functions are deployed:
--    - process-campaign-launch
--    - enqueue-insights-sync
--    - process-insights-sync
-- ============================================================================
