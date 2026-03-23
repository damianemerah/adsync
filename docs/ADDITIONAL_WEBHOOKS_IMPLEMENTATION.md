# Additional Meta Webhooks Implementation Guide

## Overview

This document outlines additional Meta webhook fields that should be implemented to enhance real-time campaign management in Tenzu. These webhooks provide faster alerts, reduce API polling, and improve user experience by notifying users immediately when critical events occur.

## Current Webhook Coverage (✅ Already Implemented)

| Webhook Field | Purpose | File Reference |
|---------------|---------|----------------|
| `leadgen` | Capture lead form submissions | [route.ts:242](../src/app/api/webhooks/meta/route.ts#L242) |
| `campaigns` | Campaign status changes (ACTIVE, PAUSED, WITH_ISSUES) | [route.ts:183](../src/app/api/webhooks/meta/route.ts#L183) |
| `with_issues_ad_objects` | Policy violations, ad rejections | [route.ts:117](../src/app/api/webhooks/meta/route.ts#L117) |
| `ad_account_update` | Account health, payment failures | [route.ts:149](../src/app/api/webhooks/meta/route.ts#L149) |

## Recommended Additional Webhooks

---

## 🔴 HIGH PRIORITY

### 1. `adsets` Field

**Purpose:** Detect when Meta automatically pauses ad sets due to budget depletion or low performance issues.

**Events Triggered:**
- Ad set status changes (ACTIVE → PAUSED → CAMPAIGN_PAUSED)
- Budget exhaustion
- Delivery issues
- Optimization goal problems

**Benefits:**
- ✅ Alert users immediately when ad sets stop delivering
- ✅ Faster than 6-hour insights sync
- ✅ Proactive budget management notifications
- ✅ Reduces user frustration ("Why did my ads stop?")

#### Implementation

**Location:** Add to `processMetaEvent()` in [src/app/api/webhooks/meta/route.ts](../src/app/api/webhooks/meta/route.ts#L72)

```typescript
// --- 6. Handle Ad Set Status Changes ---
if (field === "adsets") {
  const adsetId = value.id;
  const effectiveStatus = value.effective_status;
  const configuredStatus = value.configured_status;
  const adsetName = value.name || "Ad Set";

  console.log(`📊 Ad Set Status Change [${adsetId}]: ${effectiveStatus}`);

  try {
    // Find campaign via ad set
    const { data: adset } = await supabase
      .from("ad_sets")
      .select("campaign_id, campaigns!inner(name, organization_id)")
      .eq("platform_adset_id", adsetId)
      .single();

    if (!adset) {
      console.log("Skipping adset event: Ad Set not found in AdSync DB.");
      return;
    }

    const campaignId = adset.campaign_id;
    const campaignName = (adset.campaigns as any).name;
    const organizationId = (adset.campaigns as any).organization_id;

    // Get org owner
    const { data: owner } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "owner")
      .single();

    if (!owner) return;

    // Alert on critical status changes
    if (effectiveStatus === "CAMPAIGN_PAUSED") {
      await sendNotification(
        {
          userId: owner.user_id,
          organizationId: organizationId,
          title: "⚠️ Ad Set Paused: Budget Issue",
          message: `Your ad set in campaign "${campaignName}" has been paused due to budget depletion or account issues.`,
          type: "critical",
          category: "budget",
          actionUrl: `/campaigns/${campaignId}`,
          actionLabel: "Review Campaign",
        },
        supabase,
      );
    } else if (effectiveStatus === "ACCOUNT_PAUSED") {
      await sendNotification(
        {
          userId: owner.user_id,
          organizationId: organizationId,
          title: "🚨 Ad Set Stopped: Account Issue",
          message: `Your ad set in campaign "${campaignName}" has stopped due to an ad account issue. Please check your ad account health.`,
          type: "critical",
          category: "account",
          actionUrl: "/ad-accounts",
          actionLabel: "Check Account",
        },
        supabase,
      );
    } else if (effectiveStatus === "WITH_ISSUES") {
      await sendNotification(
        {
          userId: owner.user_id,
          organizationId: organizationId,
          title: "⚠️ Ad Set Has Issues",
          message: `Your ad set in campaign "${campaignName}" is experiencing delivery issues.`,
          type: "warning",
          category: "campaign",
          actionUrl: `/campaigns/${campaignId}`,
          actionLabel: "View Details",
        },
        supabase,
      );
    }

    // Optional: Update DB status
    await supabase
      .from("ad_sets")
      .update({ status: effectiveStatus.toLowerCase() })
      .eq("platform_adset_id", adsetId);

    console.log(`✅ Ad Set ${adsetId} status updated: ${effectiveStatus}`);
  } catch (error) {
    console.error("Error processing adset webhook:", error);
  }
}
```

#### Subscription Instructions

1. Go to **Meta App Dashboard** → **Webhooks**
2. Select **Ad Account** object
3. Subscribe to **`adsets`** field
4. Save changes

**API Subscription:**
```bash
curl -X POST "https://graph.facebook.com/v25.0/{ad-account-id}/subscribed_apps" \
  -d "subscribed_fields=adsets" \
  -d "access_token={access-token}"
```

---

### 2. `ads` Field

**Purpose:** Immediate notification of individual ad approval/rejection by Meta's review system.

**Events Triggered:**
- Ad approved (IN_PROCESS → ACTIVE)
- Ad rejected (DISAPPROVED)
- Ad paused by Meta due to low performance
- Ad delivery errors

**Benefits:**
- ✅ Know about rejections instantly (vs. waiting for polling)
- ✅ Faster issue resolution
- ✅ Better user experience ("Why isn't my ad running?")
- ✅ Reduce support tickets

#### Implementation

**Location:** Add to `processMetaEvent()` in [src/app/api/webhooks/meta/route.ts](../src/app/api/webhooks/meta/route.ts#L72)

```typescript
// --- 7. Handle Individual Ad Status Changes ---
if (field === "ads") {
  const adId = value.id;
  const effectiveStatus = value.effective_status;
  const configuredStatus = value.configured_status;
  const adName = value.name || "Ad";

  console.log(`🎬 Ad Status Change [${adId}]: ${effectiveStatus}`);

  try {
    // Find campaign via ad
    const { data: ad } = await supabase
      .from("ads")
      .select("campaign_id, campaigns!inner(name, organization_id)")
      .eq("platform_ad_id", adId)
      .single();

    if (!ad) {
      console.log("Skipping ad event: Ad not found in AdSync DB.");
      return;
    }

    const campaignId = ad.campaign_id;
    const campaignName = (ad.campaigns as any).name;
    const organizationId = (ad.campaigns as any).organization_id;

    // Get org owner
    const { data: owner } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "owner")
      .single();

    if (!owner) return;

    // Alert on ad rejection
    if (effectiveStatus === "DISAPPROVED") {
      await sendNotification(
        {
          userId: owner.user_id,
          organizationId: organizationId,
          title: "❌ Ad Rejected by Meta",
          message: `Your ad in campaign "${campaignName}" was disapproved by Meta. Review and fix the issue to resume delivery.`,
          type: "critical",
          category: "campaign",
          actionUrl: `/campaigns/${campaignId}`,
          actionLabel: "View Campaign",
        },
        supabase,
      );
    }

    // Alert when ad goes live
    else if (
      effectiveStatus === "ACTIVE" &&
      configuredStatus === "ACTIVE"
    ) {
      await sendNotification(
        {
          userId: owner.user_id,
          organizationId: organizationId,
          title: "✅ Ad Approved & Live",
          message: `Great news! Your ad in campaign "${campaignName}" has been approved and is now running.`,
          type: "success",
          category: "campaign",
          actionUrl: `/campaigns/${campaignId}`,
          actionLabel: "View Performance",
        },
        supabase,
      );
    }

    // Update DB status
    await supabase
      .from("ads")
      .update({ status: effectiveStatus.toLowerCase() })
      .eq("platform_ad_id", adId);

    console.log(`✅ Ad ${adId} status updated: ${effectiveStatus}`);
  } catch (error) {
    console.error("Error processing ad webhook:", error);
  }
}
```

#### Subscription Instructions

1. Go to **Meta App Dashboard** → **Webhooks**
2. Select **Ad Account** object
3. Subscribe to **`ads`** field
4. Save changes

**API Subscription:**
```bash
curl -X POST "https://graph.facebook.com/v25.0/{ad-account-id}/subscribed_apps" \
  -d "subscribed_fields=ads" \
  -d "access_token={access-token}"
```

---

## 🟡 MEDIUM PRIORITY

### 3. `account_budget` Field

**Purpose:** Track when account spending limits/budgets are approaching or have been reached.

**Events Triggered:**
- Daily/monthly budget threshold reached
- Spending cap hit
- Budget reset events

**Benefits:**
- ✅ Proactive budget alerts
- ✅ Prevent unexpected ad pauses
- ✅ Better spend management

#### Implementation

```typescript
// --- 8. Handle Account Budget Alerts ---
if (field === "account_budget") {
  const budgetRemaining = value.budget_remaining;
  const budgetLimit = value.budget_limit;
  const thresholdPercentage = (budgetRemaining / budgetLimit) * 100;

  if (thresholdPercentage < 10) {
    await sendNotification(
      {
        userId: owner.user_id,
        organizationId: account.organization_id,
        title: "⚠️ Budget Alert: 90% Spent",
        message: `You've used 90% of your account budget. Top up to keep ads running.`,
        type: "warning",
        category: "budget",
        actionUrl: "/billing",
        actionLabel: "Add Budget",
      },
      supabase,
    );
  }
}
```

---

### 4. `billing` Field

**Purpose:** Real-time billing events and payment failures (more detailed than `account_status`).

**Events Triggered:**
- Payment method charged
- Payment failure (declined card, insufficient funds)
- Credit/refund applied
- Billing threshold reached

**Benefits:**
- ✅ Better visibility into Meta billing
- ✅ Faster payment issue resolution
- ✅ Audit trail for virtual card transactions

#### Implementation

```typescript
// --- 9. Handle Billing Events ---
if (field === "billing") {
  const eventType = value.event_type; // "charge", "refund", "failed"
  const amount = value.amount;
  const currency = value.currency;

  if (eventType === "failed") {
    await sendNotification(
      {
        userId: owner.user_id,
        organizationId: account.organization_id,
        title: "💳 Payment Failed",
        message: `Meta couldn't charge your payment method. Your ads may be paused. Please update your billing info.`,
        type: "critical",
        category: "budget",
        actionUrl: "/ad-accounts",
        actionLabel: "Fix Payment",
      },
      supabase,
    );
  }
}
```

---

## Meta Webhook Subscription Checklist

### Required Setup

- [ ] **App Created** in Meta Developer Dashboard
- [ ] **App Permissions:**
  - `ads_management` (required for ad account webhooks)
  - `pages_read_engagement` (required for page webhooks)
  - `leads_retrieval` (for leadgen webhooks)
- [ ] **Webhook Endpoint Configured:**
  - URL: `https://yourdomain.com/api/webhooks/meta`
  - Verify Token: Set in `META_WEBHOOK_VERIFY_TOKEN` env var
- [ ] **App Secret:** Set in `META_APP_SECRET` env var

### Subscription Steps

1. **Via Meta App Dashboard:**
   - Go to **Webhooks** → Select object type (Ad Account / Page)
   - Subscribe to desired fields
   - Click **Test** to verify endpoint

2. **Via API (Programmatic):**
   ```bash
   # Subscribe to multiple fields at once
   curl -X POST "https://graph.facebook.com/v25.0/{ad-account-id}/subscribed_apps" \
     -d "subscribed_fields=adsets,ads,campaigns,with_issues_ad_objects,account_budget,billing" \
     -d "access_token={access-token}"
   ```

3. **Verify Subscription:**
   ```bash
   # Check what fields you're subscribed to
   curl -X GET "https://graph.facebook.com/v25.0/{ad-account-id}/subscribed_apps" \
     -d "access_token={access-token}"
   ```

---

## Redundancy Analysis with Existing Systems

### Current Edge Functions & Cron Jobs

Tenzu already has several edge functions that poll Meta API for status updates. Adding webhooks will create overlap—this is **intentional and beneficial**, but we should optimize to avoid waste.

| Edge Function | Frequency | What It Polls | Overlap with Webhooks? |
|---------------|-----------|---------------|------------------------|
| **account-health** | Every 4 hours | Account balance, status, active campaigns | ✅ **HIGH** - `adsets`, `ads`, `billing` webhooks |
| **sync-campaign-insights** | Every 6 hours | Campaign metrics (spend, impressions, CTR) | ❌ **NO** - Webhooks don't send metrics |
| **post-launch-rules** | Every 12 hours | Performance benchmarks, optimization alerts | ❌ **NO** - Intelligence layer, not data sync |
| **syncCampaignAds** | On-demand (manual) | Ad status, creative URLs, metrics | ⚠️ **PARTIAL** - Status via webhook, metrics stay |

### Detailed Overlap Analysis

#### 🔴 HIGH REDUNDANCY: account-health.ts

**Current Behavior:**
```typescript
// Every 4 hours, polls Meta API for:
1. Account balance (last_known_balance_cents)
2. Account status (active=1, disabled=2, unsettled=3, grace=9)
3. Lists ACTIVE campaigns (to pause if balance is low)
4. Sends notifications for payment issues
```

**With Proposed Webhooks:**
- `ad_account_update` webhook → Already subscribed! (account status changes)
- `billing` webhook → Real-time payment failures
- `account_budget` webhook → Real-time budget alerts
- `adsets` webhook → Real-time ad set pauses

**Recommendation:**
- ✅ **Keep:** Balance checking + auto-pause logic (webhooks don't send balance amounts)
- ✅ **Keep:** Low balance warnings (calculated from balance)
- ⚠️ **Reduce frequency:** 4 hours → 12 hours (webhooks catch urgent issues)
- ❌ **Remove:** Account status monitoring (already have `ad_account_update` webhook)

**Why Keep Polling:**
- Meta webhooks don't send balance amounts (only events)
- Auto-pause logic requires knowing exact balance
- Safety net if webhooks fail

#### 🟡 MEDIUM REDUNDANCY: syncCampaignAds (On-Demand)

**Current Behavior:**
```typescript
// User clicks "Refresh" button:
1. Fetches ad status (ACTIVE, PAUSED, DISAPPROVED)
2. Fetches creative URLs (image_url, thumbnail_url)
3. Fetches ad metrics (spend, impressions, clicks)
```

**With Proposed Webhooks:**
- `ads` webhook → Real-time ad status changes

**Recommendation:**
- ✅ **Keep:** Creative URLs + metrics (webhooks don't send these)
- ⚠️ **Optional:** Remove `status` field from API call (webhook updates DB already)
- ✅ **Keep on-demand:** Manual refresh is infrequent, low cost

**Why Keep Polling:**
- Webhooks don't send creative URLs or metrics
- Users need to see current state when opening detail view
- On-demand is infrequent (no cost concern)

#### ✅ NO REDUNDANCY: sync-campaign-insights.ts

**Current Behavior:**
```typescript
// Every 6 hours:
1. Fetches time-series metrics (daily breakdown)
2. 7-day rolling window of spend, impressions, clicks, CTR
3. Stores in campaign_metrics table for charts
```

**With Proposed Webhooks:**
- No overlap—webhooks send status changes, not metrics

**Recommendation:**
- ✅ **Keep as is:** No changes needed
- ✅ **Complementary:** Webhooks alert on issues, insights provide data

#### ✅ NO REDUNDANCY: post-launch-rules.ts

**Current Behavior:**
```typescript
// Every 12 hours:
1. Analyzes campaign performance vs. Nigerian benchmarks
2. Sends alerts for low CTR, high CPC, scaling opportunities
3. Intelligence layer using fetched metrics
```

**With Proposed Webhooks:**
- No overlap—webhooks can't do benchmark analysis

**Recommendation:**
- ✅ **Keep as is:** No changes needed
- ✅ **Complementary:** Webhooks alert on events, rules analyze performance

---

## Optimization Recommendations

### Recommended Changes

#### 1. Reduce account-health Frequency (HIGH PRIORITY)

**Change:** 4 hours → 12 hours

**Reason:**
- Webhooks (`ad_account_update`, `billing`) catch urgent issues in real-time
- Balance checking still needed (webhooks don't send amounts)
- 12-hour polling is sufficient for balance monitoring

**Implementation:**
```sql
-- Migration: supabase/migrations/YYYYMMDD_optimize_cron_schedules.sql
select cron.unschedule('account-health');
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
```

#### 2. Keep sync-campaign-insights Unchanged (NO CHANGES)

**Reason:**
- Webhooks don't send metrics (spend, CTR, impressions)
- Historical data needed for charts/dashboards
- No overlap with webhooks

#### 3. Keep post-launch-rules Unchanged (NO CHANGES)

**Reason:**
- Intelligence analysis, not data sync
- Benchmark comparison requires metrics
- No overlap with webhooks

#### 4. Optional: Remove Status Field from syncCampaignAds (LOW PRIORITY)

**Change:** Remove `status` field from manual ad sync query

**Reason:**
- Webhook updates status in real-time
- User sees current status from DB (already updated by webhook)
- Reduces API call payload size

**Implementation:**
```typescript
// src/actions/campaigns.ts:1019 (OPTIONAL)
const adsRes = await MetaService.request(
  `/${metaId}/ads?fields=id,name,creative{image_url,thumbnail_url,object_story_spec},insights{spend,impressions,clicks,ctr}`,
  // Removed: status field (webhook handles it)
  "GET",
  token,
);
```

**Note:** This is optional—on-demand refreshes are infrequent enough that it doesn't matter.

---

## Migration Strategy

### Safe Rollout Plan

**Phase 1: Add Webhooks (Week 1)**
1. Implement `adsets` webhook handler
2. Implement `ads` webhook handler
3. Subscribe to fields in Meta App Dashboard
4. Test with live campaigns
5. **Do NOT reduce polling yet** (run both in parallel)

**Phase 2: Monitor (Week 2)**
1. Verify webhooks are firing (check logs)
2. Confirm notifications are sent
3. Ensure no missed events
4. Monitor webhook delivery rate (should be 99%+)

**Phase 3: Optimize Polling (Week 3)**
1. Reduce account-health from 4h → 12h
2. Document reasoning in migration
3. Monitor for any issues

**Phase 4: Measure Impact (Week 4)**
1. Track API call reduction (expect 80% fewer status checks)
2. Verify faster alert times (real-time vs 4-hour lag)
3. Confirm no regressions

### Rollback Plan

If webhooks fail or are unreliable:

1. **Immediate:** Keep polling at current frequency (4 hours)
2. **Temporary:** Disable webhook handlers (comment out in route.ts)
3. **Investigate:** Check Meta App Dashboard for webhook issues
4. **Resume:** Once stable, re-enable webhooks and retry optimization

**Key Principle:** Never remove polling entirely—use webhooks as primary, polling as backup.

---

## Hybrid Approach (Recommended Architecture)

### Best Practice: Webhooks + Polling

Don't replace polling entirely. Use **webhooks as primary, polling as backup**.

| Event Type | Primary Mechanism | Backup Mechanism | Frequency |
|------------|-------------------|------------------|-----------|
| **Ad rejection** | Webhook (`ads`) | Insights sync | Real-time / 6h |
| **Ad set pause** | Webhook (`adsets`) | Account health | Real-time / 12h |
| **Balance low** | Account health | Manual check | 12h / On-demand |
| **Payment fail** | Webhook (`billing`) | Account health | Real-time / 12h |
| **Metrics sync** | Insights sync | Manual refresh | 6h / On-demand |
| **Performance alerts** | Post-launch rules | N/A | 12h |

### Why Hybrid?

**Webhooks Advantages:**
- ✅ Real-time alerts (no polling lag)
- ✅ Event-driven (only notified when something changes)
- ✅ Reduced API calls (Meta pushes, you don't pull)

**Webhooks Limitations:**
- ❌ Can fail (network issues, downtime)
- ❌ Don't send full data (status only, not metrics)
- ❌ No historical backfill (only future events)

**Polling Advantages:**
- ✅ Reliable (you control timing)
- ✅ Fetches full data (metrics, balances, etc.)
- ✅ Historical backfill (can catch missed events)

**Polling Disadvantages:**
- ❌ Delayed (4-6 hour lag)
- ❌ API call overhead (pulls even when nothing changed)
- ❌ Rate limit concerns (many calls)

**Conclusion:** Webhooks + polling = best of both worlds.

---

## Cost-Benefit Analysis

### Before Webhooks (Current State)

**API Calls for Status Monitoring:**
- `account-health:` 6 calls/day × 5 accounts = 30 calls/day
  - Fetches account status (already have webhook!)
  - Fetches balance (still needed)
  - Fetches active campaigns (still needed for auto-pause)
- `Manual ad sync:` ~10-20 calls/day
  - User-triggered refreshes
  - Fetches ad status (can be replaced by webhook)

**Total:** ~40-50 API calls/day for status monitoring

### After Webhooks (Optimized State)

**API Calls for Status Monitoring:**
- `account-health:` 2 calls/day × 5 accounts = 10 calls/day (reduced to 12h)
  - Fetches balance (webhooks don't send amounts)
  - Fetches active campaigns (for auto-pause logic)
  - ~~Fetches account status~~ (replaced by webhook)
- `Manual ad sync:` 10-20 calls/day (unchanged, on-demand)
  - Fetches creative URLs + metrics
  - ~~Fetches ad status~~ (replaced by webhook, but optional to keep)

**Total:** ~20-30 API calls/day for status monitoring

**Savings:** 50-60% reduction in status-related API calls

### Benefits Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Alert Speed** | 4-hour lag | Real-time | **99% faster** |
| **API Calls/Day** | 40-50 | 20-30 | **50% reduction** |
| **Missed Events** | Possible (between polls) | Near zero | **99.9% reliability** |
| **User Experience** | Delayed notifications | Instant alerts | **Significant** |
| **Cost** | Higher API usage | Lower API usage | **Reduced** |

### ROI Estimate

**Assumptions:**
- 100 active campaigns across all orgs
- 20 status changes per day (ad rejections, pauses, etc.)
- $0.0001 per Meta API call (estimate)

**Before Webhooks:**
- 50 API calls/day × $0.0001 = $0.005/day = **$1.83/year**
- 20 status changes × 4-hour avg lag = 80 hours of delayed alerts

**After Webhooks:**
- 25 API calls/day × $0.0001 = $0.0025/day = **$0.91/year**
- 20 status changes × 0-minute lag = 0 hours of delay

**Savings:** $0.92/year + 80 hours of user frustration eliminated

---

## Testing Webhooks

### Test Events via Meta Graph API Explorer

1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app
3. Use these endpoints to trigger test events:

**Test Ad Set Pause:**
```bash
# Pause an ad set to trigger adsets webhook
curl -X POST "https://graph.facebook.com/v25.0/{adset-id}" \
  -d "status=PAUSED" \
  -d "access_token={access-token}"
```

**Test Ad Approval:**
```bash
# Create a test ad (will trigger ads webhook when approved)
curl -X POST "https://graph.facebook.com/v25.0/{adset-id}/ads" \
  -d "name=Test Ad" \
  -d "status=PAUSED" \
  -d "creative={...}" \
  -d "access_token={access-token}"
```

### Monitor Webhook Logs

Check Supabase Edge Function logs or your webhook route logs for:
```
📊 Ad Set Status Change [123456]: CAMPAIGN_PAUSED
🎬 Ad Status Change [789012]: DISAPPROVED
✅ Ad Set 123456 status updated: CAMPAIGN_PAUSED
```

---

## Benefits Summary

| Webhook | Current Polling Delay | With Webhook | Improvement |
|---------|----------------------|--------------|-------------|
| `adsets` | 6 hours (insights sync) | Real-time | **99.9% faster** |
| `ads` | 6 hours (insights sync) | Real-time | **99.9% faster** |
| `account_budget` | Manual check | Real-time | **Proactive alerts** |
| `billing` | No visibility | Real-time | **New capability** |

### ROI of Implementation

- **Reduced Support Tickets:** Users self-diagnose ad issues faster
- **Better UX:** Immediate feedback vs. "why isn't my ad running?"
- **Reduced API Calls:** Less need for status polling
- **Proactive Alerts:** Prevent budget issues before they pause campaigns

---

## Implementation Priority

### Phase 1 (Implement Now)
1. ✅ `adsets` field - Critical for budget management
2. ✅ `ads` field - Critical for ad approval tracking

### Phase 2 (Next Sprint)
3. ⬜ `account_budget` field - Nice to have for proactive alerts
4. ⬜ `billing` field - Useful for virtual card audit trail

---

## Files to Modify

| File | Changes |
|------|---------|
| [src/app/api/webhooks/meta/route.ts](../src/app/api/webhooks/meta/route.ts) | Add 4 new webhook handlers (`adsets`, `ads`, `account_budget`, `billing`) |
| `supabase/migrations/YYYYMMDD_add_status_to_ads_adsets.sql` | Add `status` column to `ads` and `ad_sets` tables if not already present |

---

## Related Documentation

- [Meta Webhooks for Ad Accounts](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-ad-accounts/)
- [Lead Capture System](./LEAD_CAPTURE_SYSTEM.md) (existing implementation)
- [Meta API v25 Migration](./meta-api-v25-upgrade-summary.md)

---

## Support & Troubleshooting

### Webhook Not Receiving Events

1. **Check subscription:**
   ```bash
   curl "https://graph.facebook.com/v25.0/{ad-account-id}/subscribed_apps?access_token={token}"
   ```

2. **Verify webhook endpoint is publicly accessible:**
   ```bash
   curl -X GET "https://yourdomain.com/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
   ```
   Should return `test` (the challenge value)

3. **Check webhook logs** for signature validation errors

### Duplicate Events

Meta may send the same webhook multiple times. Your handler should be **idempotent**:
- Use `leadgen_id`, `ad_id`, etc. as unique keys
- Check if record exists before inserting
- Update timestamps on duplicate events

### Rate Limiting

Webhooks are not rate-limited, but your notification system might be. Consider:
- Batching notifications if multiple events occur simultaneously
- Deduplication logic (don't notify twice for same issue)

---

**Last Updated:** 2026-03-26
**Status:** Ready for implementation
**Priority:** HIGH (adsets, ads), MEDIUM (account_budget, billing)
