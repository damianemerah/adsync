# Job Queue System - Quick Reference

## Common Operations

### Check Queue Health

```sql
-- View queue status
SELECT
  type,
  status,
  COUNT(*) as count,
  MAX(created_at) as last_created,
  MAX(updated_at) as last_updated
FROM job_queue
GROUP BY type, status
ORDER BY type, status;

-- View job metrics (last 24h)
SELECT * FROM get_job_queue_health();
```

### Manual Job Operations

```sql
-- Retry a failed job
UPDATE job_queue
SET status = 'pending', attempts = 0
WHERE id = 'JOB_ID_HERE';

-- Cancel a stuck job
UPDATE job_queue
SET status = 'failed', last_error = 'Manually cancelled'
WHERE id = 'JOB_ID_HERE';

-- View job payload
SELECT payload FROM job_queue WHERE id = 'JOB_ID_HERE';
```

### Monitor Active Jobs

```sql
-- Jobs currently processing
SELECT
  id,
  type,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at))/60 as duration_minutes,
  attempts,
  max_attempts
FROM job_queue
WHERE status = 'processing'
ORDER BY started_at;

-- Jobs stuck (processing >15 min)
SELECT * FROM job_queue
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '15 minutes';
```

### Dead Letter Queue

```sql
-- View DLQ (last 24h)
SELECT
  type,
  COUNT(*) as count,
  array_agg(DISTINCT error_message) as errors
FROM job_dlq
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type;

-- Retry all jobs from DLQ (use with caution)
INSERT INTO job_queue (type, payload, organization_id, user_id, status)
SELECT type, payload, (payload->>'organization_id')::UUID, NULL, 'pending'
FROM job_dlq
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Cron Job Management

```sql
-- List all cron jobs
SELECT * FROM list_active_cron_jobs();

-- Manually trigger a job
SELECT cron.run_job('process-campaign-launch-jobs');

-- View recent cron executions
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- Disable a cron job
SELECT cron.unschedule('job-name-here');

-- Re-enable a cron job
SELECT cron.schedule(
  'job-name-here',
  'schedule-here',
  $$ /* command here */ $$
);
```

### Cleanup & Maintenance

```sql
-- Archive old completed jobs (>30 days)
SELECT cleanup_old_jobs(30);

-- Delete old metrics (>90 days)
DELETE FROM job_metrics
WHERE executed_at < NOW() - INTERVAL '90 days';

-- Clear DLQ (after fixing issues)
DELETE FROM job_dlq
WHERE created_at < NOW() - INTERVAL '7 days';
```

---

## Edge Function URLs

```bash
# Campaign launch worker
https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-campaign-launch

# Insights sync enqueuer
https://YOUR_PROJECT_REF.supabase.co/functions/v1/enqueue-insights-sync

# Insights sync processor
https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-insights-sync
```

---

## Useful Queries

### Campaign Launch Queue

```sql
-- Campaigns waiting to launch
SELECT
  c.id,
  c.name,
  c.status,
  q.attempts,
  q.last_error,
  q.created_at
FROM campaigns c
JOIN job_queue q ON q.payload->>'campaignId' = c.id::TEXT
WHERE c.status = 'queuing'
AND q.type = 'campaign_launch'
ORDER BY q.created_at;

-- Recent campaign launches
SELECT
  c.id,
  c.name,
  c.status,
  c.platform_campaign_id,
  m.duration_ms,
  m.executed_at
FROM campaigns c
JOIN job_metrics m ON m.job_type = 'campaign_launch'
WHERE c.created_at > NOW() - INTERVAL '24 hours'
ORDER BY c.created_at DESC;
```

### Insights Sync Status

```sql
-- Campaigns never synced
SELECT
  id,
  name,
  created_at,
  platform_campaign_id
FROM campaigns
WHERE platform_campaign_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM campaign_metrics
  WHERE campaign_metrics.campaign_id = campaigns.id
)
ORDER BY created_at DESC;

-- Campaigns with stale data (>12 hours)
SELECT
  c.id,
  c.name,
  MAX(m.synced_at) as last_synced,
  EXTRACT(EPOCH FROM (NOW() - MAX(m.synced_at)))/3600 as hours_since_sync
FROM campaigns c
JOIN campaign_metrics m ON m.campaign_id = c.id
WHERE c.status IN ('active', 'paused')
GROUP BY c.id, c.name
HAVING MAX(m.synced_at) < NOW() - INTERVAL '12 hours'
ORDER BY last_synced;
```

---

## Monitoring Alerts

### Set Up Slack/Email Alerts (Pseudo-code)

```typescript
// Create a monitoring edge function (runs every 15 min)

const checkHealth = async () => {
  // 1. Check DLQ size
  const dlqCount = await supabase
    .from("job_dlq")
    .select("*", { count: "exact" })
    .gte("created_at", new Date(Date.now() - 3600000).toISOString());

  if (dlqCount > 10) {
    await sendAlert({
      title: "High DLQ Count",
      message: `${dlqCount} jobs failed in the last hour`,
      severity: "critical",
    });
  }

  // 2. Check stuck jobs
  const stuckJobs = await supabase
    .from("job_queue")
    .select("*", { count: "exact" })
    .eq("status", "processing")
    .lt("started_at", new Date(Date.now() - 900000).toISOString());

  if (stuckJobs > 0) {
    await sendAlert({
      title: "Stuck Jobs Detected",
      message: `${stuckJobs} jobs processing for >15 minutes`,
      severity: "warning",
    });
  }

  // 3. Check success rate
  const recentMetrics = await supabase
    .from("job_metrics")
    .select("success")
    .gte("executed_at", new Date(Date.now() - 3600000).toISOString());

  const successRate =
    recentMetrics.filter((m) => m.success).length / recentMetrics.length;

  if (successRate < 0.9) {
    await sendAlert({
      title: "Low Success Rate",
      message: `Job success rate dropped to ${Math.round(successRate * 100)}%`,
      severity: "warning",
    });
  }
};
```

---

## Performance Tuning

### Reduce Campaign Launch Latency

```typescript
// In process-campaign-launch/index.ts
// Option 1: Increase cron frequency (every 30s instead of 1min)
// ⚠️ Uses more edge function invocations

// Option 2: Use pg_notify for real-time triggers
CREATE OR REPLACE FUNCTION notify_new_job()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_job', NEW.id::TEXT);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_queue_notify
  AFTER INSERT ON job_queue
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_job();
```

### Increase Insights Sync Throughput

```typescript
// In process-insights-sync/index.ts
const BATCH_SIZE = 20; // Increase from 10 to 20

// Reduce sleep between batches
await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s instead of 2s
```

### Optimize Database Queries

```sql
-- Add index for faster DLQ lookups
CREATE INDEX IF NOT EXISTS idx_job_dlq_created_at ON job_dlq(created_at DESC);

-- Add partial index for pending jobs
CREATE INDEX IF NOT EXISTS idx_job_queue_pending_created ON job_queue(type, created_at)
WHERE status = 'pending';
```

---

## Debugging

### Enable Verbose Logging

```typescript
// In any edge function
const DEBUG = Deno.env.get("DEBUG") === "true";

if (DEBUG) {
  console.log("[DEBUG] Full payload:", JSON.stringify(job.payload, null, 2));
}
```

### Trace a Specific Job

```sql
-- Get full job history
SELECT
  'Queue' as source,
  id,
  type,
  status,
  attempts,
  created_at,
  started_at,
  completed_at,
  last_error,
  payload
FROM job_queue
WHERE id = 'JOB_ID_HERE'

UNION ALL

SELECT
  'DLQ' as source,
  id,
  type,
  NULL as status,
  attempts,
  created_at,
  NULL as started_at,
  NULL as completed_at,
  error_message as last_error,
  payload
FROM job_dlq
WHERE job_id = 'JOB_ID_HERE';
```

### Test Edge Function Locally

```bash
# Start Supabase locally
npx supabase start

# Run function with test payload
npx supabase functions serve process-campaign-launch --env-file .env.local

# In another terminal, send test request
curl -X POST http://localhost:54321/functions/v1/process-campaign-launch \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## FAQ

**Q: Why is my campaign stuck in 'queuing' for >5 minutes?**
A: Check if the cron job is running: `SELECT * FROM cron.job WHERE jobname = 'process-campaign-launch-jobs'`. If `active = false`, re-enable it.

**Q: Can I process jobs faster than every minute?**
A: Yes, but it increases edge function invocations. For real-time processing, use `pg_notify` triggers instead of cron polling.

**Q: What happens if an edge function crashes mid-job?**
A: The stuck job monitor (runs every 15min) will reset it to 'pending' for retry after 15 minutes.

**Q: Can I prioritize certain jobs?**
A: Yes, add a `priority` column to `job_queue` and modify the fetch query to `ORDER BY priority DESC, created_at ASC`.

**Q: How do I see edge function logs?**
A: Supabase Dashboard → Functions → Select function → Logs tab. Or use `npx supabase functions logs process-campaign-launch`.

---

## Emergency Procedures

### System Overload (Too Many Jobs)

```sql
-- Pause all non-critical cron jobs
SELECT cron.unschedule('enqueue-insights-sync');
SELECT cron.unschedule('process-insights-sync');

-- Process only high-priority jobs
DELETE FROM job_queue
WHERE type = 'insights_sync'
AND status = 'pending';

-- Re-enable after load decreases
```

### Mass Retry DLQ

```sql
-- Review DLQ errors first
SELECT type, error_message, COUNT(*)
FROM job_dlq
GROUP BY type, error_message;

-- If issue is fixed, retry all from last hour
INSERT INTO job_queue (type, payload, organization_id, status, max_attempts)
SELECT type, payload, (payload->>'organization_id')::UUID, 'pending', 1
FROM job_dlq
WHERE created_at > NOW() - INTERVAL '1 hour'
AND type = 'campaign_launch'; -- Be specific!
```

---

**Last Updated:** 2026-03-24
**Maintainer:** Engineering Team
**Version:** 1.0.0
