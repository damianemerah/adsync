-- Remove cron jobs that are redundant with real-time Meta webhooks.
--
-- 1. meta-status-sync (every 20m)
--    Replaced by: in_process_ad_objects webhook (handleInProcessAdObjects)
--    The webhook handles in_review → active transitions and approval-by-disappearance
--    in real-time. The 20-minute poll is pure redundancy.
--
-- 2. sync-campaign-insights (every 6h)
--    Deprecated: replaced by enqueue-insights-sync + process-insights-sync
--    queue architecture. Function has been deleted.

DO $$
BEGIN
  PERFORM cron.unschedule('meta-status-sync');
  RAISE NOTICE 'Unscheduled meta-status-sync cron job';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'meta-status-sync cron job not found (already removed): %', SQLERRM;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-campaign-insights');
  RAISE NOTICE 'Unscheduled sync-campaign-insights cron job';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'sync-campaign-insights cron job not found (already removed): %', SQLERRM;
END $$;
