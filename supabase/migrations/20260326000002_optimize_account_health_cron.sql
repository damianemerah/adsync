-- Optimize Account Health Cron Schedule
--
-- Context: We've added real-time webhooks for `adsets`, `ads`, `ad_account_update`, and `billing`.
-- These webhooks catch urgent events (ad rejections, pauses, payment failures) in real-time.
--
-- The account-health cron job still needs to run because:
--   ✅ It fetches exact balance amounts (webhooks don't send these)
--   ✅ It implements auto-pause logic when balance < ₦2,000
--   ✅ It acts as a safety net if webhooks fail
--
-- However, we can reduce frequency from every 4 hours to every 12 hours:
--   - Urgent events (payment failures, account disabled) are caught by webhooks in real-time
--   - Balance monitoring is still proactive but doesn't need sub-4-hour granularity
--   - Reduces API calls by ~67% while maintaining safety
--
-- This follows the hybrid approach: Webhooks as primary, polling as backup.

-- Unschedule the old 4-hour job
select cron.unschedule('account-health');

-- Reschedule to run every 12 hours
select cron.schedule(
  'account-health',
  '0 */12 * * *',  -- Changed from */4 to */12
  $$ select net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/account-health',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) $$
);

-- Migration applied: account-health now runs every 12 hours instead of every 4 hours
-- Expected impact:
--   - 67% reduction in account-health API calls (6 calls/day → 2 calls/day per account)
--   - Maintained safety: Balance checks still run twice daily
--   - Real-time alerts: Urgent events caught by webhooks immediately
