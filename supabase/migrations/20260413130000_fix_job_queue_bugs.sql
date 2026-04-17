-- Fix 1: get_job_queue_health() fan-out bug
-- The original function LEFT JOINs job_metrics on job_type (not job_id),
-- causing every pending job row to be multiplied by every matching metrics row.
-- With 26 pending jobs × 68 metrics records = 1,768 false positive pending_count.
-- Fix: replace JOIN with a correlated subquery for avg_duration.

CREATE OR REPLACE FUNCTION public.get_job_queue_health()
RETURNS TABLE(
  job_type text,
  pending_count bigint,
  processing_count bigint,
  failed_count bigint,
  avg_duration_ms numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    jq.type,
    COUNT(*) FILTER (WHERE jq.status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE jq.status = 'processing') AS processing_count,
    COUNT(*) FILTER (WHERE jq.status = 'failed') AS failed_count,
    COALESCE((
      SELECT AVG(jm.duration_ms)
      FROM job_metrics jm
      WHERE jm.job_type = jq.type
        AND jm.executed_at > NOW() - INTERVAL '24 hours'
    ), 0) AS avg_duration_ms
  FROM job_queue jq
  WHERE jq.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY jq.type;
END;
$function$;


-- Fix 2: enqueue-insights-sync dedup guard
-- Prevent duplicate pending jobs per org when the enqueuer is called multiple times.
-- Add a unique partial index: only one pending insights_sync job per org at a time.

CREATE UNIQUE INDEX IF NOT EXISTS job_queue_insights_sync_pending_per_org
  ON job_queue (type, organization_id)
  WHERE status = 'pending' AND type = 'insights_sync';

-- Note: the edge function (supabase/functions/enqueue-insights-sync/index.ts)
-- will be updated to use ON CONFLICT DO NOTHING so duplicate inserts are silently skipped.
