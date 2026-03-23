-- ============================================================================
-- Job Queue System Migration
-- ============================================================================
-- Creates a Postgres-native job queue system for async processing of:
-- - Campaign launches (with Meta API rollback capability)
-- - Insights syncing (batch processing)
-- - Account health checks (scheduled monitoring)
--
-- Architecture:
-- - job_queue: Main queue table with status tracking
-- - job_dlq: Dead Letter Queue for permanent failures
-- - job_metrics: Performance monitoring and observability
-- ============================================================================

-- ============================================================================
-- 1. Core Job Queue Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'campaign_launch', 'insights_sync', 'account_health_check', etc.
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_type CHECK (type IN ('campaign_launch', 'insights_sync', 'account_health_check', 'notification_send', 'meta_resource_cleanup'))
);

-- Indexes for efficient queue processing
CREATE INDEX idx_job_queue_status_pending ON job_queue(status, created_at)
  WHERE status = 'pending';
CREATE INDEX idx_job_queue_status_processing ON job_queue(status, updated_at)
  WHERE status = 'processing';
CREATE INDEX idx_job_queue_type_status ON job_queue(type, status);
CREATE INDEX idx_job_queue_org_id ON job_queue(organization_id);
CREATE INDEX idx_job_queue_created_at ON job_queue(created_at);

-- Comments for documentation
COMMENT ON TABLE job_queue IS 'Async job queue for long-running tasks (campaign launch, insights sync, etc.)';
COMMENT ON COLUMN job_queue.type IS 'Job type identifier for routing to correct worker function';
COMMENT ON COLUMN job_queue.payload IS 'JSON payload containing all data needed for job execution';
COMMENT ON COLUMN job_queue.status IS 'Current job status: pending (queued), processing (active), completed (done), failed (errored)';
COMMENT ON COLUMN job_queue.attempts IS 'Number of execution attempts (increments on retry)';
COMMENT ON COLUMN job_queue.max_attempts IS 'Maximum retry attempts before moving to DLQ';

-- ============================================================================
-- 2. Dead Letter Queue (DLQ)
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_queue(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  attempts INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_dlq_type ON job_dlq(type);
CREATE INDEX idx_job_dlq_created_at ON job_dlq(created_at);

COMMENT ON TABLE job_dlq IS 'Dead Letter Queue for permanently failed jobs that exhausted all retry attempts';
COMMENT ON COLUMN job_dlq.error_message IS 'Short error description for display in UI';
COMMENT ON COLUMN job_dlq.error_stack IS 'Full error stack trace for debugging';

-- ============================================================================
-- 3. Job Metrics (Observability)
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  duration_ms INT,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_metrics_type_date ON job_metrics(job_type, executed_at);
CREATE INDEX idx_job_metrics_success ON job_metrics(success, executed_at);

COMMENT ON TABLE job_metrics IS 'Performance metrics for job execution (for monitoring dashboards)';
COMMENT ON COLUMN job_metrics.duration_ms IS 'Total execution time in milliseconds';
COMMENT ON COLUMN job_metrics.success IS 'Whether the job completed successfully';
COMMENT ON COLUMN job_metrics.error_code IS 'Meta API error code or custom error identifier';

-- ============================================================================
-- 4. Auto-update Timestamp Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_job_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_queue_updated_at
  BEFORE UPDATE ON job_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_job_queue_timestamp();

-- ============================================================================
-- 5. Row Level Security (RLS)
-- ============================================================================
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_metrics ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for edge functions)
CREATE POLICY "Service role full access on job_queue" ON job_queue FOR ALL
  TO service_role USING (true);
CREATE POLICY "Service role full access on job_dlq" ON job_dlq FOR ALL
  TO service_role USING (true);
CREATE POLICY "Service role full access on job_metrics" ON job_metrics FOR ALL
  TO service_role USING (true);

-- Users can view jobs for their organizations
CREATE POLICY "Users view org jobs" ON job_queue FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Users can view DLQ for their organizations
CREATE POLICY "Users view org DLQ" ON job_dlq FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_queue
      WHERE job_queue.id = job_dlq.job_id
      AND job_queue.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Admin users can view all metrics (add role check when you have admin roles)
CREATE POLICY "Users view job metrics" ON job_metrics FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- 6. Add 'queuing' status to campaigns table
-- ============================================================================
-- Allow campaigns to have 'queuing' status while job is pending
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'queuing', 'pending_review', 'active', 'paused', 'completed', 'failed'));

COMMENT ON CONSTRAINT campaigns_status_check ON campaigns IS
  'Campaign status: draft (not launched), queuing (job pending), pending_review (awaiting Meta approval), active (running), paused (stopped), completed (ended), failed (launch failed)';

-- ============================================================================
-- 7. Helper Functions
-- ============================================================================

-- Function to clean up old completed jobs (run monthly)
CREATE OR REPLACE FUNCTION cleanup_old_jobs(older_than_days INT DEFAULT 30)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM job_queue
  WHERE status = 'completed'
  AND completed_at < NOW() - (older_than_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_jobs IS 'Archives completed jobs older than N days (default 30). Run via pg_cron monthly.';

-- Function to get job queue health metrics
CREATE OR REPLACE FUNCTION get_job_queue_health()
RETURNS TABLE (
  job_type TEXT,
  pending_count BIGINT,
  processing_count BIGINT,
  failed_count BIGINT,
  avg_duration_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jq.type,
    COUNT(*) FILTER (WHERE jq.status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE jq.status = 'processing') AS processing_count,
    COUNT(*) FILTER (WHERE jq.status = 'failed') AS failed_count,
    COALESCE(AVG(jm.duration_ms), 0) AS avg_duration_ms
  FROM job_queue jq
  LEFT JOIN job_metrics jm ON jm.job_type = jq.type
    AND jm.executed_at > NOW() - INTERVAL '24 hours'
  WHERE jq.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY jq.type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_job_queue_health IS 'Returns queue health metrics for the last 24 hours (for admin dashboard)';

-- ============================================================================
-- 8. Grant Permissions
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON job_queue TO authenticated;
GRANT SELECT ON job_dlq TO authenticated;
GRANT SELECT ON job_metrics TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next steps:
-- 1. Deploy edge function: process-campaign-launch
-- 2. Deploy edge function: enqueue-insights-sync
-- 3. Deploy edge function: process-insights-sync
-- 4. Configure pg_cron schedules
-- 5. Update launchCampaign action to use enqueueJob()
-- ============================================================================
