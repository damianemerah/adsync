# Meta API v25.0 Migration - COMPLETED ✅

**Migration Date:** March 24, 2026
**Status:** 🟢 **COMPLETE**
**Next Action Required:** Deploy edge functions and test

---

## ✅ Migration Summary

### Phase 1: Edge Functions Migration (100% COMPLETE)

All 5 edge functions have been migrated from v24.0 to v25.0:

1. ✅ **[sync-campaign-insights/index.ts](supabase/functions/sync-campaign-insights/index.ts)**
   - Updated API version to v25.0
   - Added `media_views`, `media_viewers` to insights fields
   - Added v25.0 enhanced error logging
   - Added `meta_issues` tracking in database
   - Updated database inserts with new metrics

2. ✅ **[account-health/index.ts](supabase/functions/account-health/index.ts)**
   - Updated META_API_VERSION to v25.0
   - Added v25.0 enhanced error logging with user-facing fields
   - Added `api_version` tracking in ad_accounts table
   - Enhanced error details in responses

3. ✅ **[process-campaign-launch/index.ts](supabase/functions/process-campaign-launch/index.ts)**
   - Updated META_API_VERSION to v25.0
   - Added v25.0 enhanced error logging in metaRequest()
   - Added Advantage+ configuration tracking
   - Saves `advantage_plus_config` JSONB to campaigns table

4. ✅ **[process-insights-sync/index.ts](supabase/functions/process-insights-sync/index.ts)**
   - Updated META_API_VERSION to v25.0
   - Added `media_views`, `media_viewers` to insights fields
   - Added v25.0 enhanced error logging
   - Updated metrics upsert with new fields

5. ✅ **[refresh-meta-tokens/index.ts](supabase/functions/refresh-meta-tokens/index.ts)**
   - Updated META_API_VERSION to v25.0
   - Added v25.0 enhanced error logging
   - Enhanced error tracking with user-facing fields

**Edge Functions Not Requiring Migration:**
- ✅ `post-launch-rules/index.ts` - No direct Meta API calls
- ✅ `weekly-report/index.ts` - No Meta API calls

---

### Phase 2: UI Components (100% COMPLETE)

Created new v25.0 UI components:

1. ✅ **[src/components/campaigns/campaign-issues-badge.tsx](src/components/campaigns/campaign-issues-badge.tsx)**
   - Displays `meta_issues` from database
   - Shows severity levels (critical/error/warning)
   - Compact and full modes
   - Tooltip with issue details

2. ✅ **[src/components/campaigns/advantage-plus-badge.tsx](src/components/campaigns/advantage-plus-badge.tsx)**
   - Displays `advantage_plus_config` features
   - Shows enabled optimization types
   - Tooltip with feature breakdown
   - Blue Sparkles icon for visual recognition

3. ✅ **Updated [src/components/campaigns/campaigns-view.tsx](src/components/campaigns/campaigns-view.tsx)**
   - Integrated CampaignIssuesBadge in status column
   - Integrated AdvantagePlusBadge in status column
   - Compact mode for table display

4. ✅ **Updated [src/hooks/use-campaign-roi.ts](src/hooks/use-campaign-roi.ts)**
   - Added `mediaViews` and `mediaViewers` to CampaignROI interface
   - Fetch `media_views` and `media_viewers` from campaigns table
   - Return new metrics in hook result

5. ✅ **Updated [src/components/campaigns/roi-metrics-card.tsx](src/components/campaigns/roi-metrics-card.tsx)**
   - Display Media Views metric (conditionally, only for video campaigns)
   - Show unique viewers in detail text
   - Purple color scheme for media metrics

---

## 🎯 Key v25.0 Features Implemented

### Enhanced Error Handling
- **User-facing error fields**: `error_user_title`, `error_user_msg`
- **Error tracking**: Stored in `campaigns.meta_issues` JSONB column
- **Error logging**: All edge functions now log structured v25.0 errors
- **UI display**: CampaignIssuesBadge shows errors in campaign list

### New Metrics (Video/Reel Campaigns)
- **`media_views`**: Total times video/reel was viewed
- **`media_viewers`**: Unique people who viewed media
- **Database**: Added to `campaigns` and `campaign_metrics` tables
- **UI**: Conditionally displayed in ROI metrics card

### Advantage+ Tracking
- **Database**: `campaigns.advantage_plus_config` JSONB column
- **Tracking**: Audience, placements, creative, budget optimizations
- **UI**: AdvantagePlusBadge shows enabled features
- **Launch**: Automatically tracked during campaign creation

### API Version Tracking
- **Database**: `ad_accounts.api_version` column
- **Edge Functions**: Update API version on each health check
- **Monitoring**: Track which accounts use which API version

---

## 📋 Database Schema Updates

All schema updates were applied via migration [20260324000005_meta_api_v25_upgrade.sql](supabase/migrations/20260324000005_meta_api_v25_upgrade.sql):

### campaigns table
```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS media_views INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS media_viewers INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS advantage_plus_config JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_issues JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS issues_checked_at TIMESTAMPTZ;
```

### campaign_metrics table
```sql
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS media_views INTEGER DEFAULT 0;
ALTER TABLE campaign_metrics ADD COLUMN IF NOT EXISTS media_viewers INTEGER DEFAULT 0;
```

### ad_accounts table
```sql
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS webhook_cert_updated BOOLEAN DEFAULT FALSE;
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS api_version TEXT DEFAULT 'v25.0';
```

---

## 🔍 Verification Checklist

### ✅ Completed
- [x] All edge functions migrated to v25.0
- [x] No remaining v24.0 references in edge functions
- [x] Main API file uses v25.0 ([src/lib/api/meta.ts](src/lib/api/meta.ts))
- [x] Database migration applied
- [x] TypeScript types updated ([src/types/supabase.ts](src/types/supabase.ts))
- [x] UI components created
- [x] UI components integrated into views
- [x] New metrics added to hooks

### ⏳ Next Steps (Testing & Deployment)

1. **Deploy Edge Functions**
   ```bash
   # Deploy all updated edge functions
   npx supabase functions deploy sync-campaign-insights
   npx supabase functions deploy account-health
   npx supabase functions deploy process-campaign-launch
   npx supabase functions deploy process-insights-sync
   npx supabase functions deploy refresh-meta-tokens
   ```

2. **Set Environment Variables**
   Ensure edge functions have access to `ENCRYPTION_KEY`:
   ```bash
   npx supabase secrets set ENCRYPTION_KEY="your-encryption-key"
   ```

3. **Test Each Edge Function**
   ```bash
   # Test insights sync
   curl -X POST https://your-project.supabase.co/functions/v1/sync-campaign-insights \
     -H "Authorization: Bearer YOUR_ANON_KEY"

   # Test account health
   curl -X POST https://your-project.supabase.co/functions/v1/account-health \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

4. **Monitor for Errors**
   - Check Supabase Function logs for any v25.0 error responses
   - Verify new metrics (`media_views`, `media_viewers`) are being populated
   - Confirm `meta_issues` column is being updated on errors
   - Check that Advantage+ config is saved during campaign launch

5. **UI Testing**
   - Create a video campaign and verify media metrics appear
   - Trigger a Meta API error and verify badge appears
   - Check Advantage+ badge displays for campaigns with auto placements
   - Verify tooltips show correct information

6. **Webhook Certificate Update** 🚨 **DEADLINE: March 31, 2026**
   - Follow [docs/meta-v25-webhook-cert-update.md](docs/meta-v25-webhook-cert-update.md)
   - Test webhook delivery before deadline
   - Update `webhook_cert_updated` flag in database

---

## 📚 Documentation Reference

- [Meta API v25.0 Upgrade Summary](docs/meta-api-v25-upgrade-summary.md)
- [Meta v25.0 Webhook Certificate Update](docs/meta-v25-webhook-cert-update.md)
- [Meta v25.0 Changelog](https://developers.facebook.com/docs/marketing-api/marketing-api-changelog/version25.0/)
- [Error Codes Reference](https://developers.facebook.com/docs/marketing-api/insights/error-codes/)

---

## 🎉 Migration Impact

### For Developers
- ✅ Better error handling and debugging
- ✅ Structured error tracking in database
- ✅ User-facing error messages from Meta
- ✅ Automatic retry logic for transient errors
- ✅ Advantage+ feature visibility

### For Users
- ✅ Clear error messages in UI
- ✅ Video/reel performance metrics
- ✅ Transparency on Meta's AI optimizations
- ✅ Better campaign health visibility
- ✅ Reduced manual intervention (auto-retry)

---

## 🚀 Next Feature Opportunities

Now that v25.0 is fully integrated, consider:

1. **Campaign Issues API Integration**
   - Use `MetaService.getCampaignIssues()` to proactively check campaigns
   - Display issues in campaign detail view
   - Send notifications for critical issues

2. **Advantage+ Creative Optimization**
   - Implement creative testing framework
   - Track which creatives Meta optimizes
   - Add creative.advantage_plus flag

3. **Media Metrics Analytics**
   - Build video performance dashboard
   - Track view-through rates
   - Compare video vs static creative performance

4. **Error Recovery Automation**
   - Auto-pause campaigns with critical errors
   - Auto-retry failed launches
   - Smart notification batching

---

**Migration completed by:** AI Assistant (Claude)
**Date:** March 24, 2026
**Status:** Ready for deployment and testing
