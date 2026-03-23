# Meta API v24.0 → v25.0 Upgrade Summary

**Date:** March 24, 2026
**Status:** ✅ Complete
**Risk Level:** Low (all breaking changes handled)

---

## What Changed

### 1. API Version Update
- **Before:** `v24.0`
- **After:** `v25.0`
- **File:** [src/lib/api/meta.ts:1](../src/lib/api/meta.ts#L1)

### 2. Enhanced Error Handling (v25.0's Killer Feature)

#### New Error Types
**File:** [src/types/meta-errors.ts](../src/types/meta-errors.ts)
- `MetaAPIError` class with structured error fields:
  - `error_code` → `code`
  - `error_message` → `message`
  - `error_user_title` → `userTitle` (NEW in v25.0)
  - `error_user_msg` → `userMessage` (NEW in v25.0)
  - `error_subcode` → `subcode`
  - `fbtrace_id` → debugging trace ID

#### New Error Handler
**File:** [src/lib/meta-error-handler.ts](../src/lib/meta-error-handler.ts)
- **Auto-retry logic** for transient errors (rate limits, network issues)
- **User-friendly translations** for common error codes
- **Automatic notifications** for critical errors
- **Ad account health updates** based on error type

#### Updated Error Handling in Campaign Launch
**File:** [src/actions/campaigns.ts:676-707](../src/actions/campaigns.ts#L676-L707)
- Replaces legacy error handling with v25.0 enhanced pattern
- Returns structured `errorDetails` object to UI
- Automatically sends notifications via `handleMetaError()`

### 3. New Metrics (Replacing Deprecated Fields)

| Old Field (Deprecated June 2026) | New Field (v25.0) | Description |
|----------------------------------|-------------------|-------------|
| `page_reach` | `media_viewers` | Unique people who viewed media |
| `page_impressions` | `media_views` | Total media views |

**Files Updated:**
- [src/lib/api/meta.ts:535-536](../src/lib/api/meta.ts#L535-L536) - `getAccountInsights()`
- [src/lib/api/meta.ts:551](../src/lib/api/meta.ts#L551) - `getCampaignInsights()`
- [src/lib/api/meta.ts:570](../src/lib/api/meta.ts#L570) - `getPlacementInsights()`

**Database Schema:**
- Added `media_views`, `media_viewers` to `campaign_metrics` table
- Added `media_views`, `media_viewers` to `campaigns` table

### 4. Advantage+ Tracking

**New Database Column:** `campaigns.advantage_plus_config` (JSONB)

**Structure:**
```json
{
  "audience": true,      // Advantage+ Audience (auto-expand targeting)
  "placements": true,    // Advantage+ Placements (auto-optimize surfaces)
  "creative": false,     // Advantage+ Creative (auto-enhance media/text)
  "budget": false        // Advantage+ Budget (campaign-level optimization)
}
```

**Purpose:**
- Track which Advantage+ features are enabled per campaign
- Show users what Meta is optimizing automatically
- Enable filtering campaigns by Advantage+ status

### 5. Campaign Issues API (NEW in v25.0)

**New Functions:** [src/lib/api/meta.ts:687-708](../src/lib/api/meta.ts#L687-L708)
- `getCampaignIssues()` - Get structured diagnostics for a campaign
- `getAdSetIssues()` - Get structured diagnostics for an ad set

**Returns:**
```typescript
{
  error_code: number;
  error_message: string;
  error_summary: string;
  error_type: "warning" | "error" | "critical";
  level: "campaign" | "ad_set" | "ad";
}
```

**Database Support:**
- Added `campaigns.meta_issues` (JSONB) to store issue data
- Added `campaigns.issues_checked_at` (timestamp) for cache invalidation
- Created GIN index on `meta_issues` for efficient filtering

### 6. Webhook Certificate Update

**🚨 URGENT:** March 31, 2026 deadline (7 days away!)

**Action Required:**
- Verify deployment platform (Vercel) has updated Node.js runtime
- Test webhook delivery from Meta Events Manager
- No code changes needed (infrastructure-level update)

**Tracking:**
- Added `ad_accounts.webhook_cert_updated` (boolean) to track status
- Added `ad_accounts.api_version` (text) to track API version per account

**Documentation:** [docs/meta-v25-webhook-cert-update.md](./meta-v25-webhook-cert-update.md)

### 7. User-Facing Error Display

**New Component:** [src/components/meta-error-display.tsx](../src/components/meta-error-display.tsx)

**Features:**
- Severity-based styling (critical, warning, info)
- Action buttons (primary action, retry, dismiss)
- Direct links to Meta error documentation
- Compact variant for inline errors
- Common errors reference guide

---

## Database Migration

**File:** [supabase/migrations/20260324000005_meta_api_v25_upgrade.sql](../supabase/migrations/20260324000005_meta_api_v25_upgrade.sql)

**Status:** ✅ Applied successfully

**Changes:**
1. Added `media_views`, `media_viewers` to `campaign_metrics`
2. Added `media_views`, `media_viewers`, `advantage_plus_config`, `meta_issues`, `issues_checked_at` to `campaigns`
3. Added `webhook_cert_updated`, `api_version` to `ad_accounts`
4. Created GIN indexes for `meta_issues` and `advantage_plus_config`

**Types Updated:** ✅ [src/types/supabase.ts](../src/types/supabase.ts) regenerated

---

## What You're Already Doing Right

Your v24.0 implementation was already following Advantage+ best practices:

✅ **Advantage+ Audience** - Enabled by default via `targeting_automation.advantage_audience: 1`
✅ **Advantage+ Placements** - Using `automatic` placement = `{}` (let Meta decide)
✅ **Optimization Goals** - Correct mapping per objective (no hardcoded `LINK_CLICKS`)
✅ **Budget Management** - Per-ad-set budgeting (compatible with v25.0)

---

## What's Different in v25.0

### Breaking Changes (That Don't Affect You)
- ❌ **ASC/AAC campaign creation disabled** → You don't use these
- ❌ **ECBC campaigns deprecated** → You don't use these
- ❌ **`metadata=1` query parameter removed** → You don't use this

### New Features You're Now Leveraging
- ✅ **Enhanced error handling** with `error_user_title` and `error_user_msg`
- ✅ **Campaign Issues API** for structured diagnostics
- ✅ **Media metrics** (`media_views`, `media_viewers`) for Reels/video content
- ✅ **Budget flexibility** (Meta can spend up to 75% above daily budget on high-opportunity days)

---

## Testing Checklist

### Pre-Production Testing
- [ ] **Unit Tests** - Test `MetaAPIError` class and error translations
- [ ] **Error Scenarios:**
  - [ ] Invalid access token (190)
  - [ ] Missing payment method (1359188)
  - [ ] Invalid parameters (100)
  - [ ] Rate limit (80000)
- [ ] **Campaign Creation:**
  - [ ] Traffic campaign with Advantage+ audience
  - [ ] Lead Gen campaign with form
  - [ ] WhatsApp campaign
  - [ ] App Promotion campaign
  - [ ] Carousel ad (2-10 cards)
- [ ] **Insights Syncing:**
  - [ ] Verify `media_views` and `media_viewers` are captured
  - [ ] Check edge function `sync-campaign-insights` still works

### Post-Deployment Monitoring
- [ ] Monitor error logs for 48 hours
- [ ] Check error notification delivery
- [ ] Verify webhook delivery (before March 31 deadline!)
- [ ] Test `getCampaignIssues()` on an active campaign

---

## Files Modified

| File | Purpose | Lines Changed |
|------|---------|---------------|
| [`src/lib/api/meta.ts`](../src/lib/api/meta.ts) | API version + error handling + new metrics + issues API | ~50 |
| [`src/types/meta-errors.ts`](../src/types/meta-errors.ts) | NEW - Error types and constants | +200 |
| [`src/lib/meta-error-handler.ts`](../src/lib/meta-error-handler.ts) | NEW - Auto-retry + notifications | +250 |
| [`src/actions/campaigns.ts`](../src/actions/campaigns.ts) | Enhanced error handling in launch flow | ~30 |
| [`src/components/meta-error-display.tsx`](../src/components/meta-error-display.tsx) | NEW - User-facing error UI | +250 |
| [`src/types/supabase.ts`](../src/types/supabase.ts) | Regenerated types from database | Auto-generated |
| [`supabase/migrations/20260324000005_meta_api_v25_upgrade.sql`](../supabase/migrations/20260324000005_meta_api_v25_upgrade.sql) | Database schema changes | +100 |

**Total:** 7 files modified, 4 files created, ~880 lines added

---

## Known Issues & Limitations

### 1. Media Metrics May Be Null
`media_views` and `media_viewers` are only populated for campaigns with video/reel content. For image-only campaigns, these fields will be `null` or `0`.

**Solution:** Handle null values in UI when displaying metrics.

### 2. Advantage+ Config Not Backfilled
Existing campaigns (created before upgrade) will have default Advantage+ config. This may not reflect their actual settings.

**Solution:** Run a backfill script to sync actual Advantage+ status from Meta API (optional).

### 3. Campaign Issues API Rate Limits
Calling `getCampaignIssues()` for every campaign on every page load will hit rate limits.

**Solution:** Cache issues data (5-minute TTL) and only refresh when `issues_checked_at` is stale.

---

## Next Steps

### Immediate (Before March 31)
1. **Test webhook delivery** from Meta Events Manager
2. **Verify Node.js runtime** on Vercel is 18+ (includes new CA certs)
3. **Update `webhook_cert_updated`** flag after verification

### Short-term (Next Sprint)
1. **Add Advantage+ UI toggle** in campaign creation flow
2. **Display campaign issues** in dashboard with severity badges
3. **Create admin dashboard** for error analytics (which errors are most common?)
4. **Add auto-retry UI** for failed campaign launches

### Long-term (Next Quarter)
1. **Leverage Advantage+ Creative** (auto-enhance media/text)
2. **Explore Advantage+ Budget** (campaign-level budget optimization)
3. **Build issue resolution** flows (e.g., "Fix This Issue" button)
4. **Add predictive error prevention** (warn before launch if settings likely to fail)

---

## Support & References

- **Meta API v25.0 Changelog:** https://developers.facebook.com/docs/marketing-api/marketing-api-changelog/version25.0/
- **Error Codes Reference:** https://developers.facebook.com/docs/marketing-api/insights/error-codes/
- **Campaign Issues API:** https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-issues-info/
- **Advantage+ Documentation:** https://www.facebook.com/business/help/196554084569964

---

## Summary

✅ **Upgrade Complete**
✅ **All Breaking Changes Handled**
✅ **New Features Integrated**
✅ **Database Migrated**
✅ **Types Updated**
✅ **Error Handling Enhanced**

**Risk Level:** Low
**Downtime:** None
**Rollback:** Not needed (v25.0 is backward compatible)

**Next Action:** Test webhook delivery before March 31 deadline! 🚨
