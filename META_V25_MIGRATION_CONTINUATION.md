# Meta API v24.0 → v25.0 Migration - Session Continuation Guide

**Date Created:** March 24, 2026
**Migration Status:** 🟡 **In Progress** (Core infrastructure complete, integration pending)
**Next Deadline:** 🚨 **March 31, 2026** - Webhook certificate update

---

## 🎯 What Was Completed in Previous Session

### ✅ Completed Tasks

1. **API Version Updated**: Changed `API_VERSION` from `"v24.0"` to `"v25.0"` in [`src/lib/api/meta.ts:1`](src/lib/api/meta.ts#L1)

2. **Enhanced Error Handling System** (v25.0's killer feature):
   - Created [`src/types/meta-errors.ts`](src/types/meta-errors.ts) - Error types, constants, and `MetaAPIError` class
   - Created [`src/lib/meta-error-handler.ts`](src/lib/meta-error-handler.ts) - Auto-retry logic + notifications
   - Created [`src/components/meta-error-display.tsx`](src/components/meta-error-display.tsx) - User-facing error UI
   - Updated error handling in [`src/actions/campaigns.ts:676-707`](src/actions/campaigns.ts#L676-L707)

3. **New v25.0 Metrics Added**:
   - Updated `getAccountInsights()`, `getCampaignInsights()`, `getPlacementInsights()` to fetch `media_views` and `media_viewers`
   - Added database columns via migration

4. **Campaign Issues API**:
   - Added `getCampaignIssues()` and `getAdSetIssues()` functions to `MetaService`
   - Database support with `meta_issues` and `issues_checked_at` columns

5. **Advantage+ Tracking**:
   - Added `advantage_plus_config` JSONB column to campaigns table
   - Database schema ready for UI integration

6. **Database Migration**:
   - Created and applied [`supabase/migrations/20260324000005_meta_api_v25_upgrade.sql`](supabase/migrations/20260324000005_meta_api_v25_upgrade.sql)
   - Updated [`src/types/supabase.ts`](src/types/supabase.ts)

7. **Documentation**:
   - Created [`docs/meta-api-v25-upgrade-summary.md`](docs/meta-api-v25-upgrade-summary.md) - Complete upgrade guide
   - Created [`docs/meta-v25-webhook-cert-update.md`](docs/meta-v25-webhook-cert-update.md) - Webhook deadline info

---

## ⚠️ What's Still Using v24.0 (NOT MIGRATED YET)

### 1. Edge Functions (Supabase Functions) - **PRIORITY: HIGH**
**Location:** `supabase/functions/*/index.ts`

These functions still reference v24.0 in their fetch calls. They need to be updated to use v25.0 and leverage the new error handling.

**Files to check:**
```bash
grep -r "v24.0\|graph.facebook.com" supabase/functions/
```

Expected files needing migration:
- `supabase/functions/sync-campaign-insights/index.ts`
- `supabase/functions/account-health/index.ts`
- `supabase/functions/post-launch-rules/index.ts`
- `supabase/functions/weekly-report/index.ts`
- `supabase/functions/process-campaign-launch/index.ts` (if it exists)

### 2. Client-Side API Calls
**Search for:** Any hardcoded API version strings or fetch calls to Meta API

```bash
grep -r "v24\.0\|v24\|graph\.facebook\.com" src/ --include="*.ts" --include="*.tsx"
```

### 3. Environment Variables
**Check:** `.env`, `.env.local`, Vercel environment variables

Some projects hardcode API versions in env vars like:
```bash
META_API_VERSION=v24.0
```

---

## 🚧 Migration Roadmap (What to Do Next)

### Phase 1: Edge Functions Migration (Priority: HIGH)

Edge functions are **system-wide background jobs** that run as cron tasks. They need special handling because they:
- Don't use the `MetaService` (they have direct fetch calls)
- Use service role credentials
- Process **all organizations** (not scoped to active org)

#### Step-by-Step for Each Edge Function:

**Example: `supabase/functions/sync-campaign-insights/index.ts`**

1. **Search for hardcoded API version:**
   ```typescript
   // BEFORE (v24.0)
   const res = await fetch(`https://graph.facebook.com/v24.0/${campaignId}/insights`, {
     headers: { Authorization: `Bearer ${token}` }
   });
   ```

2. **Update to v25.0 + add new metrics:**
   ```typescript
   // AFTER (v25.0)
   const API_VERSION = "v25.0";
   const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${campaignId}/insights`, {
     method: "GET",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${token}`
     }
   });
   ```

3. **Add new metrics to field list:**
   ```typescript
   // BEFORE
   fields: "spend,impressions,clicks,cpc,ctr,reach"

   // AFTER (v25.0)
   fields: "spend,impressions,clicks,cpc,ctr,reach,media_views,media_viewers"
   ```

4. **Add enhanced error handling:**
   ```typescript
   const data = await res.json();

   if (data.error) {
     console.error("Meta API Error:", {
       code: data.error.code,
       subcode: data.error.error_subcode,
       message: data.error.message,
       user_title: data.error.error_user_title,      // NEW in v25.0
       user_msg: data.error.error_user_msg,          // NEW in v25.0
       fbtrace_id: data.error.fbtrace_id,
     });

     // Update campaign with error info (v25.0)
     await supabase
       .from("campaigns")
       .update({
         meta_issues: {
           error_code: data.error.code,
           error_message: data.error.message,
           error_summary: data.error.error_user_title || data.error.message,
           error_type: data.error.code === 190 ? "critical" : "error",
           level: "campaign",
         },
         issues_checked_at: new Date().toISOString(),
       })
       .eq("platform_campaign_id", campaignId);

     throw new Error(data.error.message);
   }
   ```

5. **Update database inserts to include new metrics:**
   ```typescript
   // BEFORE
   await supabase.from("campaign_metrics").insert({
     campaign_id: dbCampaignId,
     date: metric.date_start,
     spend_cents: Math.round((parseFloat(metric.spend) || 0) * 100),
     impressions: parseInt(metric.impressions) || 0,
     clicks: parseInt(metric.clicks) || 0,
     reach: parseInt(metric.reach) || 0,
     ctr: parseFloat(metric.ctr) || 0,
   });

   // AFTER (v25.0 - add media_views and media_viewers)
   await supabase.from("campaign_metrics").insert({
     campaign_id: dbCampaignId,
     date: metric.date_start,
     spend_cents: Math.round((parseFloat(metric.spend) || 0) * 100),
     impressions: parseInt(metric.impressions) || 0,
     clicks: parseInt(metric.clicks) || 0,
     reach: parseInt(metric.reach) || 0,
     ctr: parseFloat(metric.ctr) || 0,
     media_views: parseInt(metric.media_views) || 0,        // NEW
     media_viewers: parseInt(metric.media_viewers) || 0,    // NEW
   });
   ```

6. **Update campaigns table aggregates:**
   ```typescript
   // Update campaign summary with new metrics
   await supabase
     .from("campaigns")
     .update({
       impressions: totalImpressions,
       clicks: totalClicks,
       spend_cents: totalSpendCents,
       media_views: totalMediaViews,      // NEW
       media_viewers: totalMediaViewers,  // NEW
       issues_checked_at: new Date().toISOString(), // NEW
     })
     .eq("id", dbCampaignId);
   ```

#### Edge Functions Checklist:

For **each edge function**, apply these changes:

- [ ] `sync-campaign-insights/index.ts`
  - [ ] Update API version to v25.0
  - [ ] Add `media_views`, `media_viewers` to fields
  - [ ] Update `campaign_metrics` inserts
  - [ ] Update `campaigns` summary updates
  - [ ] Add `meta_issues` error tracking

- [ ] `account-health/index.ts`
  - [ ] Update API version to v25.0
  - [ ] Add enhanced error handling
  - [ ] Update ad_accounts health_status logic

- [ ] `post-launch-rules/index.ts`
  - [ ] Update API version to v25.0
  - [ ] Add `media_views`, `media_viewers` to metrics checks
  - [ ] Use new error handling

- [ ] `weekly-report/index.ts`
  - [ ] Update API version to v25.0
  - [ ] Include `media_views`, `media_viewers` in reports

- [ ] `process-campaign-launch/index.ts` (if exists)
  - [ ] Update API version to v25.0
  - [ ] Use `MetaService` or replicate its error handling

---

### Phase 2: Integrate New Components & Functions (Priority: MEDIUM)

We **created** these files but they're **not being used yet**. Here's how to integrate them:

#### 1. **MetaErrorDisplay Component**

**Where to use:** Campaign launch flow, ad account connection pages

**Example Integration:**

**File:** `src/app/(authenticated)/(fullscreen)/campaigns/new/page.tsx`

```typescript
import { MetaErrorDisplay, CommonMetaErrors } from "@/components/meta-error-display";

// Inside your component
const [launchError, setLaunchError] = useState<any>(null);

const handleLaunch = async () => {
  const result = await launchCampaign(config);

  if (!result.success && result.errorDetails) {
    // Use the errorDetails from v25.0 enhanced error handling
    setLaunchError(result.errorDetails);
  }
};

// In your JSX
{launchError && (
  <MetaErrorDisplay
    error={launchError}
    onRetry={() => {
      setLaunchError(null);
      handleLaunch();
    }}
    onDismiss={() => setLaunchError(null)}
  />
)}

{/* Show common errors proactively */}
<CommonMetaErrors />
```

**File:** `src/app/(authenticated)/(main)/ad-accounts/page.tsx` (connection flow)

```typescript
import { MetaErrorDisplay } from "@/components/meta-error-display";

// When OAuth fails or token is expired
{connectionError && (
  <MetaErrorDisplay
    error={{
      title: "Connection Failed",
      message: connectionError.message,
      code: connectionError.code,
      actionable: true,
      actionLabel: "Try Again",
      actionUrl: "/ad-accounts/connect",
    }}
  />
)}
```

#### 2. **getCampaignIssues() Function**

**Where to use:** Campaign detail pages, dashboard health checks

**Example Integration:**

**File:** `src/app/(authenticated)/(main)/campaigns/[id]/page.tsx`

```typescript
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";

async function checkCampaignHealth(campaignId: string, platformCampaignId: string, adAccountId: string) {
  const supabase = await createClient();

  // Get decrypted access token
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("access_token")
    .eq("id", adAccountId)
    .single();

  if (!account) return;

  const token = decrypt(account.access_token);

  try {
    // v25.0: Fetch structured campaign issues
    const issuesData = await MetaService.getCampaignIssues(token, platformCampaignId);

    if (issuesData.issues && issuesData.issues.length > 0) {
      // Store issues in database
      await supabase
        .from("campaigns")
        .update({
          meta_issues: issuesData.issues,
          issues_checked_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      // Send notification for critical issues
      const criticalIssues = issuesData.issues.filter(
        (i: any) => i.error_type === "critical"
      );

      if (criticalIssues.length > 0) {
        await sendNotification({
          userId: user.id,
          organizationId: orgId,
          title: "Campaign Issues Detected",
          message: `${criticalIssues.length} critical issue(s) found in ${campaign.name}`,
          type: "critical",
          category: "campaign",
          actionUrl: `/campaigns/${campaignId}`,
          actionLabel: "View Issues",
        });
      }
    } else {
      // Clear issues if none found
      await supabase
        .from("campaigns")
        .update({
          meta_issues: null,
          issues_checked_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
    }
  } catch (error) {
    console.error("Failed to check campaign issues:", error);
  }
}
```

**UI Component for Displaying Issues:**

**File:** `src/components/campaigns/campaign-issues-badge.tsx` (CREATE THIS)

```typescript
"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CampaignIssue {
  error_code: number;
  error_message: string;
  error_summary: string;
  error_type: "warning" | "error" | "critical";
  level: "campaign" | "ad_set" | "ad";
}

export function CampaignIssuesBadge({
  issues
}: {
  issues: CampaignIssue[] | null
}) {
  if (!issues || issues.length === 0) return null;

  const criticalCount = issues.filter(i => i.error_type === "critical").length;
  const warningCount = issues.filter(i => i.error_type === "warning").length;

  if (criticalCount > 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        {criticalCount} Critical Issue{criticalCount > 1 ? "s" : ""}
      </Badge>
    );
  }

  if (warningCount > 0) {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {warningCount} Warning{warningCount > 1 ? "s" : ""}
      </Badge>
    );
  }

  return null;
}
```

**Use in Campaign List:**

```typescript
// src/components/campaigns/campaigns-view.tsx
import { CampaignIssuesBadge } from "./campaign-issues-badge";

{campaigns.map((campaign) => (
  <div key={campaign.id} className="campaign-card">
    <h3>{campaign.name}</h3>
    <CampaignIssuesBadge issues={campaign.meta_issues} />
  </div>
))}
```

#### 3. **Advantage+ Config Display**

**File:** `src/components/campaigns/advantage-plus-badge.tsx` (CREATE THIS)

```typescript
"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AdvantagePlusConfig {
  audience: boolean;
  placements: boolean;
  creative: boolean;
  budget: boolean;
}

export function AdvantagePlusBadge({
  config
}: {
  config: AdvantagePlusConfig | null
}) {
  if (!config) return null;

  const enabledFeatures = Object.entries(config)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);

  if (enabledFeatures.length === 0) return null;

  const featureLabels = {
    audience: "Audience",
    placements: "Placements",
    creative: "Creative",
    budget: "Budget",
  };

  const tooltipText = enabledFeatures
    .map(f => featureLabels[f as keyof typeof featureLabels])
    .join(", ");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1 cursor-help">
            <Sparkles className="h-3 w-3" />
            Advantage+ ({enabledFeatures.length})
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Meta is optimizing: {tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Use in Campaign Creation:**

**File:** `src/components/campaigns/new/steps/budget-launch-step.tsx`

```typescript
import { AdvantagePlusBadge } from "@/components/campaigns/advantage-plus-badge";

// Show what Advantage+ features are enabled
<div className="advantage-plus-summary">
  <h3>Optimization Settings</h3>
  <AdvantagePlusBadge
    config={{
      audience: true,  // Based on your targeting settings
      placements: placement === "automatic",
      creative: false,
      budget: false,
    }}
  />
</div>
```

**Save config to database:**

```typescript
// In launchCampaign() action
await supabase
  .from("campaigns")
  .update({
    advantage_plus_config: {
      audience: true, // You always enable this
      placements: config.metaPlacement === "automatic",
      creative: false, // Not implemented yet
      budget: false,   // Not implemented yet
    },
  })
  .eq("id", campaignId);
```

#### 4. **Media Views/Viewers Display**

**File:** `src/components/campaigns/roi-metrics-card.tsx`

```typescript
// Add new metrics to your ROI display

export function ROIMetricsCard({ campaign }: { campaign: Campaign }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Existing metrics */}
          <MetricItem label="Impressions" value={campaign.impressions} />
          <MetricItem label="Clicks" value={campaign.clicks} />
          <MetricItem label="CTR" value={`${campaign.ctr}%`} />

          {/* NEW v25.0 metrics (only show if > 0) */}
          {campaign.media_views > 0 && (
            <MetricItem
              label="Media Views"
              value={campaign.media_views}
              tooltip="Times your video/reel was viewed"
            />
          )}
          {campaign.media_viewers > 0 && (
            <MetricItem
              label="Unique Viewers"
              value={campaign.media_viewers}
              tooltip="People who viewed your media"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Phase 3: Test & Validate (Priority: HIGH)

#### Testing Checklist:

1. **Edge Functions Testing:**
   ```bash
   # Test insights sync manually
   npx supabase functions serve sync-campaign-insights --env-file .env.local

   # Trigger via HTTP
   curl -X POST http://localhost:54321/functions/v1/sync-campaign-insights \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"campaignId": "123"}'
   ```

2. **Error Handling Testing:**
   - Force a 190 error (expired token) and verify notification sent
   - Force a 1359188 error (missing payment) and verify UI displays correctly
   - Test retry logic with rate limit error

3. **Metrics Testing:**
   - Create a video campaign
   - Run insights sync
   - Verify `media_views` and `media_viewers` are populated
   - Check dashboard displays new metrics

4. **Campaign Issues Testing:**
   - Create a campaign with policy issues
   - Call `getCampaignIssues()`
   - Verify `meta_issues` column updated
   - Check badge displays in UI

---

### Phase 4: Cleanup Old v24.0 References (Priority: LOW)

**Search commands:**

```bash
# Find all v24.0 references
grep -r "v24\.0" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next

# Find all hardcoded API URLs
grep -r "graph\.facebook\.com" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next

# Find old error handling patterns (before v25.0)
grep -r "error\.subcode" . --exclude-dir=node_modules --exclude-dir=.git
```

---

## 📋 Quick Reference

### Key Files Created (Use These!)

| File | Purpose | How to Use |
|------|---------|------------|
| [`src/types/meta-errors.ts`](src/types/meta-errors.ts) | Error types & constants | Import `MetaAPIError`, `isMetaAPIError`, `parseMetaError` |
| [`src/lib/meta-error-handler.ts`](src/lib/meta-error-handler.ts) | Auto-retry + notifications | Import `handleMetaError`, `getUserErrorDisplay`, `withRetry` |
| [`src/components/meta-error-display.tsx`](src/components/meta-error-display.tsx) | Error UI components | Import `MetaErrorDisplay`, `MetaErrorCompact`, `CommonMetaErrors` |
| [`docs/meta-api-v25-upgrade-summary.md`](docs/meta-api-v25-upgrade-summary.md) | Complete upgrade guide | Read for full context |
| [`docs/meta-v25-webhook-cert-update.md`](docs/meta-v25-webhook-cert-update.md) | Webhook deadline info | Test before March 31! |

### New Database Columns (Use These!)

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `campaigns` | `media_views` | INTEGER | Total media views |
| `campaigns` | `media_viewers` | INTEGER | Unique media viewers |
| `campaigns` | `advantage_plus_config` | JSONB | Tracks enabled Advantage+ features |
| `campaigns` | `meta_issues` | JSONB | Structured error data from Meta |
| `campaigns` | `issues_checked_at` | TIMESTAMP | Last issue check time |
| `campaign_metrics` | `media_views` | INTEGER | Daily media views |
| `campaign_metrics` | `media_viewers` | INTEGER | Daily unique viewers |
| `ad_accounts` | `webhook_cert_updated` | BOOLEAN | Webhook cert status |
| `ad_accounts` | `api_version` | TEXT | API version used |

### Migration Pattern for Edge Functions

```typescript
// 1. Update API version constant
const API_VERSION = "v25.0";

// 2. Add new metrics to fields
fields: "spend,impressions,clicks,cpc,ctr,reach,media_views,media_viewers"

// 3. Enhanced error handling
if (data.error) {
  console.error("Meta API Error:", {
    code: data.error.code,
    subcode: data.error.error_subcode,
    message: data.error.message,
    user_title: data.error.error_user_title,
    user_msg: data.error.error_user_msg,
  });

  // Update campaign with error info
  await supabase
    .from("campaigns")
    .update({
      meta_issues: {
        error_code: data.error.code,
        error_message: data.error.message,
        error_type: "error",
      },
      issues_checked_at: new Date().toISOString(),
    })
    .eq("platform_campaign_id", campaignId);
}

// 4. Update database inserts/updates
await supabase.from("campaign_metrics").insert({
  // ... existing fields
  media_views: parseInt(metric.media_views) || 0,
  media_viewers: parseInt(metric.media_viewers) || 0,
});
```

---

## 🚨 Critical Reminders

1. **March 31, 2026 Deadline**: Test webhook delivery ASAP (7 days away!)
2. **Edge Functions**: These are the biggest remaining migration task
3. **Testing**: Don't deploy edge functions without testing locally first
4. **Type Safety**: Run `npx tsc --noEmit` before committing
5. **Documentation**: Reference the 2 .md files in `docs/` for full context

---

## 📞 If You Get Stuck

1. **Read the docs first:**
   - [`docs/meta-api-v25-upgrade-summary.md`](docs/meta-api-v25-upgrade-summary.md)
   - [`docs/meta-v25-webhook-cert-update.md`](docs/meta-v25-webhook-cert-update.md)

2. **Check official Meta docs:**
   - [v25.0 Changelog](https://developers.facebook.com/docs/marketing-api/marketing-api-changelog/version25.0/)
   - [Error Codes Reference](https://developers.facebook.com/docs/marketing-api/insights/error-codes/)
   - [Campaign Issues API](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-issues-info/)

3. **Common issues:**
   - Type errors? Run `npx supabase gen types typescript --project-id iomvjxlfxeppizkhehcl`
   - Edge function failing? Check it has service role key and correct API version
   - Metrics null? Only video/reel campaigns have `media_views`/`media_viewers`
   - Error not displaying? Make sure you're using `errorDetails` from the action response

---

## 📊 Migration Progress Tracker

### Core Infrastructure (100% Complete ✅)
- [x] API version updated to v25.0
- [x] Error types and classes created
- [x] Error handler with auto-retry
- [x] Error display components
- [x] Database migration applied
- [x] New metrics added to insights APIs
- [x] Campaign Issues API integrated
- [x] Documentation created

### Edge Functions (0% Complete ⏳)
- [ ] `sync-campaign-insights/index.ts`
- [ ] `account-health/index.ts`
- [ ] `post-launch-rules/index.ts`
- [ ] `weekly-report/index.ts`
- [ ] `process-campaign-launch/index.ts`

### UI Integration (0% Complete ⏳)
- [ ] MetaErrorDisplay in campaign launch flow
- [ ] CampaignIssuesBadge component created
- [ ] CampaignIssuesBadge in campaign list
- [ ] AdvantagePlusBadge component created
- [ ] AdvantagePlusBadge in campaign cards
- [ ] Media metrics in ROI cards
- [ ] Common errors reference in forms

### Testing (0% Complete ⏳)
- [ ] Edge functions tested locally
- [ ] Error handling tested (190, 1359188, 80000)
- [ ] Metrics display tested
- [ ] Campaign issues tested
- [ ] Webhook certificate tested

---

## 🎯 Next Session Action Items

**Start here:**

1. **Run migration finder:**
   ```bash
   grep -r "v24\.0\|graph\.facebook\.com" supabase/functions/ src/
   ```

2. **Pick one edge function** (start with `sync-campaign-insights`)

3. **Follow the migration pattern** outlined in Phase 1

4. **Test locally** before deploying

5. **Move to next edge function** and repeat

Good luck with the migration! 🚀

---

**Last Updated:** March 24, 2026
**By:** AI Assistant (Claude)
**Status:** Ready for continuation
