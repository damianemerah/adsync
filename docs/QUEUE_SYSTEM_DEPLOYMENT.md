# Job Queue System - Deployment Guide

## Overview

This guide walks you through deploying the Postgres-native job queue system for Tenzu. The queue provides:
- ✅ **Rollback capability** for campaign launches
- ✅ **Automatic retries** on transient errors
- ✅ **Batch processing** for insights sync (handles 1000+ campaigns)
- ✅ **Monitoring dashboard** for observability
- ✅ **Zero cost** (stays within Supabase free tier)

**Total Implementation Time:** ~2 hours (mostly waiting for deployments)

---

## Prerequisites

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Supabase project set up
- [ ] `ENCRYPTION_KEY` environment variable configured
- [ ] Meta ad accounts connected

---

## Phase 1: Database Migration (15 minutes)

### Step 1: Run Migrations

```bash
# Navigate to project root
cd /home/chisom/projects/adsync

# Push migrations to database
npx supabase db push
```

**Expected Output:**
```
✓ Applying migration 20260324000000_job_queue_system.sql...
✓ Applying migration 20260324000001_job_queue_cron_schedules.sql...
✓ Applying migration 20260324000002_insights_sync_cron.sql...
```

### Step 2: Verify Tables Created

```bash
# Connect to database
npx supabase db remote shell

# Check tables exist
\dt job_queue job_dlq job_metrics

# Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('job_queue', 'job_dlq', 'job_metrics');

# Should show "t" (true) for all three
```

### Step 3: Update App Settings

```sql
-- Replace with your actual values
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

**Where to find these values:**
- Supabase URL: Dashboard → Settings → API → Project URL
- Service Role Key: Dashboard → Settings → API → Service Role Key (secret)

---

## Phase 2: Deploy Edge Functions (20 minutes)

### Step 1: Deploy All Functions

```bash
# Deploy campaign launch worker
npx supabase functions deploy process-campaign-launch --no-verify-jwt

# Deploy insights sync enqueuer
npx supabase functions deploy enqueue-insights-sync --no-verify-jwt

# Deploy insights sync processor
npx supabase functions deploy process-insights-sync --no-verify-jwt
```

**Note:** `--no-verify-jwt` is required because these functions are invoked by pg_cron, not users.

### Step 2: Set Environment Variables

```bash
# Set ENCRYPTION_KEY for all functions
npx supabase secrets set ENCRYPTION_KEY="your-32-character-key-here" \
  --env-file .env.local
```

**Important:** Use the SAME key that's in your Next.js `.env.local` or production env vars.

### Step 3: Verify Deployments

```bash
# Check function status
npx supabase functions list

# Should show:
# - process-campaign-launch (deployed)
# - enqueue-insights-sync (deployed)
# - process-insights-sync (deployed)
```

---

## Phase 3: Test Edge Functions (30 minutes)

### Test 1: Campaign Launch Worker

```bash
# Create a test job directly in the database
npx supabase db remote shell

# Insert test job
INSERT INTO job_queue (type, payload, organization_id, status)
VALUES (
  'campaign_launch',
  '{"campaignId": "test-123", "config": {}}'::jsonb,
  (SELECT id FROM organizations LIMIT 1),
  'pending'
);

# Exit psql
\q

# Manually trigger worker
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-campaign-launch \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Expected response:
# {"message": "No pending campaign launch jobs"}
# OR
# {"success": false, "error": "Campaign test-123 not found in database"}
# ^ This is expected for test data
```

### Test 2: Insights Sync Enqueuer

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/enqueue-insights-sync \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Expected response:
# {"success": true, "jobsCreated": 1, "campaignCount": 5, "jobIds": [...]}
```

### Test 3: Insights Sync Processor

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-insights-sync \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Expected response:
# {"success": true, "synced": 5, "errors": 0, "duration": 12543}
```

---

## Phase 4: Enable Cron Schedules (10 minutes)

### Step 1: Verify Cron Jobs Exist

```bash
npx supabase db remote shell

# List all cron jobs
SELECT jobid, schedule, jobname, active
FROM cron.job
ORDER BY jobid;

# Should show:
# - process-campaign-launch-jobs (every minute)
# - cleanup-completed-jobs (monthly)
# - monitor-stuck-jobs (every 15 min)
# - enqueue-insights-sync (every 6 hours)
# - process-insights-sync (every 5 min)
```

### Step 2: Test Cron Execution

```bash
# Manually trigger a cron job
SELECT cron.run_job('process-campaign-launch-jobs');

# Check logs
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-campaign-launch-jobs')
ORDER BY start_time DESC
LIMIT 5;
```

---

## Phase 5: Frontend Integration (30 minutes)

### Step 1: Replace launchCampaign Import

**In:** `src/app/(authenticated)/(fullscreen)/campaigns/new/page.tsx`

```typescript
// BEFORE:
import { launchCampaign } from "@/actions/campaigns";

// AFTER:
import { launchCampaignQueued as launchCampaign } from "@/actions/campaigns-queue";
```

**Why:** This uses the queue-based implementation with rollback.

### Step 2: Update Campaign List to Show Status

**In:** `src/app/(authenticated)/(main)/campaigns/page.tsx`

```typescript
import { JobStatusBadge } from "@/components/jobs/job-status-badge";

// In your table row:
<TableCell>
  <JobStatusBadge status={campaign.status} />
</TableCell>
```

### Step 3: Add Job Status Polling (Optional)

For real-time updates, add polling to campaign detail view:

```typescript
const { data: jobStatus } = useQuery({
  queryKey: ["campaign-job-status", campaignId],
  queryFn: async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("status, platform_campaign_id")
      .eq("id", campaignId)
      .single();
    return data;
  },
  refetchInterval: (data) => {
    // Poll every 3s while queuing/processing
    if (data?.status === "queuing" || data?.status === "processing") {
      return 3000;
    }
    // Stop polling once launched or failed
    return false;
  },
});
```

---

## Phase 6: Monitoring Setup (15 minutes)

### Step 1: Access Admin Dashboard

Navigate to: `http://localhost:3000/admin/jobs`

You should see:
- ✅ Job metrics by type (success rate, avg duration)
- ✅ Active jobs (currently processing)
- ✅ Dead Letter Queue (permanently failed jobs)

### Step 2: Set Up Alerts (Optional)

Create a monitoring edge function (runs every 15 minutes):

```sql
SELECT cron.schedule(
  'job-health-alerts',
  '*/15 * * * *',
  $$
  DO $$
  DECLARE
    dlq_count INT;
    stuck_count INT;
  BEGIN
    -- Check DLQ size
    SELECT COUNT(*) INTO dlq_count
    FROM job_dlq
    WHERE created_at > NOW() - INTERVAL '1 hour';

    -- Check stuck jobs
    SELECT COUNT(*) INTO stuck_count
    FROM job_queue
    WHERE status = 'processing'
    AND started_at < NOW() - INTERVAL '15 minutes';

    -- Send alert if issues found
    IF dlq_count > 10 OR stuck_count > 5 THEN
      INSERT INTO notifications (
        type, category, title, message,
        user_id
      )
      SELECT
        'critical', 'system',
        '⚠️ Job Queue Health Alert',
        format('DLQ: %s jobs, Stuck: %s jobs', dlq_count, stuck_count),
        user_id
      FROM organization_members
      WHERE role = 'owner'
      LIMIT 1;
    END IF;
  END $$;
  $$
);
```

---

## Phase 7: Gradual Rollout (1 week)

### Day 1-2: Testing (10% Traffic)

```typescript
// In campaigns-queue.ts, add feature flag:
const USE_QUEUE = Math.random() < 0.10; // 10% traffic

if (USE_QUEUE) {
  return launchCampaignQueued(config);
} else {
  return launchCampaign(config); // Old implementation
}
```

**Monitor:**
- Job success rate (should be >95%)
- DLQ size (should be <5 jobs/day)
- User complaints (should be 0)

### Day 3-4: Increase to 50%

```typescript
const USE_QUEUE = Math.random() < 0.50; // 50% traffic
```

### Day 5-7: Full Rollout

```typescript
// Remove feature flag, use queue for all campaigns
return launchCampaignQueued(config);
```

---

## Troubleshooting

### Issue: "No pending jobs" but campaigns stuck in 'queuing'

**Cause:** Cron job not running or failed to trigger

**Fix:**
```sql
-- Manually trigger worker
SELECT net.http_post(
  url := current_setting('app.settings.supabase_url') || '/functions/v1/process-campaign-launch',
  headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
  body := '{}'::jsonb
);
```

### Issue: Jobs failing with "Decryption failed"

**Cause:** `ENCRYPTION_KEY` mismatch between Next.js and edge functions

**Fix:**
```bash
# Get key from Next.js env
cat .env.local | grep ENCRYPTION_KEY

# Set it for edge functions
npx supabase secrets set ENCRYPTION_KEY="same-key-here"
```

### Issue: Meta API errors "Invalid access token"

**Cause:** Access tokens in DB are expired

**Fix:**
1. Go to Meta Business Settings
2. Regenerate access token
3. Reconnect ad account in Tenzu UI

### Issue: Insights sync never completes

**Cause:** Too many campaigns in batch

**Fix:**
```typescript
// In process-insights-sync/index.ts, reduce batch size
const BATCH_SIZE = 5; // Was 10
```

---

## Performance Benchmarks

After deployment, verify these metrics (check admin dashboard):

| Metric | Target | Status |
|--------|--------|--------|
| Campaign launch success rate | >98% | ⏳ Monitor |
| Campaign launch duration | <30s | ⏳ Monitor |
| Insights sync success rate | 100% | ⏳ Monitor |
| Insights sync duration (per 10 campaigns) | <2min | ⏳ Monitor |
| DLQ size | <5 jobs/day | ⏳ Monitor |
| Stuck jobs | 0 | ⏳ Monitor |

---

## Rollback Plan

If issues arise, roll back to old implementation:

### Step 1: Disable Cron Jobs

```sql
SELECT cron.unschedule('process-campaign-launch-jobs');
SELECT cron.unschedule('process-insights-sync');
SELECT cron.unschedule('enqueue-insights-sync');
```

### Step 2: Revert Frontend

```typescript
// In campaigns/new/page.tsx
import { launchCampaign } from "@/actions/campaigns"; // Use old version
```

### Step 3: Re-enable Old Insights Sync

```sql
-- Re-schedule old sync function
SELECT cron.schedule(
  'sync-campaign-insights',
  '0 */6 * * *',
  $$ /* old sync logic */ $$
);
```

---

## Next Steps

After successful deployment:

1. **Monitor for 1 week** - Check admin dashboard daily
2. **Archive old code** - Remove old `launchCampaign` from campaigns.ts
3. **Document rollback** - Update runbooks with rollback procedures
4. **Implement Phase 4** - Add account health checks to queue (optional)

---

## Success Checklist

- [ ] All migrations applied successfully
- [ ] Edge functions deployed and environment variables set
- [ ] Manual tests pass for all 3 edge functions
- [ ] Cron jobs scheduled and running
- [ ] Frontend integrated with queue-based launch
- [ ] Admin dashboard accessible and showing metrics
- [ ] Launched 5 test campaigns successfully via queue
- [ ] Insights sync completed for all active campaigns
- [ ] DLQ is empty (no permanent failures)
- [ ] Documented rollback procedures

---

**Estimated Total Time:** 2-3 hours
**Risk Level:** Low (feature flag + gradual rollout)
**Rollback Time:** <10 minutes

**Questions?** Check admin dashboard at `/admin/jobs` or review edge function logs in Supabase Dashboard → Functions → Logs.
