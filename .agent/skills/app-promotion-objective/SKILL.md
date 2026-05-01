---
name: app-promotion-objective
description: Implements the OUTCOME_APP_PROMOTION campaign objective (Meta App Install Ads). Use when working on app install campaign creation, application_id collection UI, or the app-specific promoted_object structure in createAdSet(). Requires a mobile app registered in Meta's App Dashboard.
---

# App Promotion Objective Skill (OUTCOME_APP_PROMOTION)

## Status: 🟢 Implemented

The objective constant (`app_promotion`) is fully active in `src/lib/constants.ts`.
The App Info step (`src/components/campaigns/new/steps/app-info-step.tsx`) collects the Meta Application ID and App Store URL.
The `createAdSet()` in `src/lib/api/meta.ts` passes `promoted_object` with `application_id` and `object_store_url`.
The launch flow in `src/actions/campaigns.ts` passes app fields through to the Meta API.

---

## Why It Requires Changes

Meta's `OUTCOME_APP_PROMOTION` requires a `promoted_object` on the Ad Set with:

```json
{
  "promoted_object": {
    "application_id": "123456789", // Meta App ID from App Dashboard
    "object_store_url": "https://play.google.com/store/apps/details?id=com.example.app"
    // OR: "https://apps.apple.com/app/id1234567890"
  }
}
```

Without this, Meta returns: `"The campaign objective is app promotion but the ad set has no promoted_object with application_id"`.

The current `createAdSet()` only handles `page_id` for `engagement` and `whatsapp`. It has no `application_id` path.

---

## Implementation Plan

### Step 1 — UI: App Info Collection Step

Add a new conditional wizard step that appears **only** when `objective === 'app_promotion'`:

**File to create:** `src/components/campaigns/new/steps/app-info-step.tsx`

The step should collect:

- **App Store URL** (iOS App Store or Google Play) — text input
- Tenzu auto-detects platform from URL (Apple/Google) and the `application_id` from the URL

```typescript
// Parse Meta application_id from store URL
function parseAppId(url: string): { applicationId: string; platform: "ios" | "android" } | null {
  // Google Play: https://play.google.com/store/apps/details?id=COM_PACKAGE
  const gplay = url.match(/id=([a-zA-Z0-9_.]+)/);
  if (gplay) return { applicationId: gplay[1], platform: "android" };

  // App Store: https://apps.apple.com/app/id1234567890
  const apple = url.match(/\/id(\d+)/);
  if (apple) return { applicationId: apple[1], platform: "ios" };

  return null;
}
```

> ⚠️ Note: The `application_id` Meta needs is their **internal App ID**, not the Play Store package. For Meta-registered apps this comes from the Meta App Dashboard. For simplest Phase 1 implementation, accept the Meta App ID as a direct text field alongside the store URL.

### Step 2 — Campaign Store Extension

In `src/stores/campaign-store.ts`:

```typescript
// Add to CampaignDraft:
appStoreUrl?: string;        // The App Store / Play Store URL
metaApplicationId?: string;  // Meta App ID from App Dashboard
```

### Step 3 — `createAdSet()` in `meta.ts` — App Promoted Object

In `MetaService.createAdSet()`, update the `promotedObject` logic:

```typescript
// Existing logic (keep):
const needsPromotedObject = objective === "engagement" || objective === "whatsapp";
const promotedObject = needsPromotedObject && params.pageId
  ? { page_id: params.pageId }
  : undefined;

// Add app_promotion branch:
const appPromotedObject = objective === "app_promotion" && params.metaApplicationId
  ? {
      application_id: params.metaApplicationId,
      object_store_url: params.appStoreUrl,
    }
  : undefined;

// Merge in the request:
...(promotedObject && { promoted_object: promotedObject }),
...(appPromotedObject && { promoted_object: appPromotedObject }),
```

### Step 4 — campaigns.ts Launch Action

In `src/actions/campaigns.ts`, pass `metaApplicationId` and `appStoreUrl` from the wizard store through to `createAdSet()`.

For the destination URL / attribution link:

- App Install ads **can** have a destination URL (deep link into the app or fallback web page)
- If the user provides one, wrap it in a Tenzu smart link as normal (`destination_type: 'website'`)
- If no destination URL (simple install ad), skip attribution link creation

### Step 5 — Ad Creative

App install ads use a standard `link_data` creative with `DOWNLOAD` as the CTA:

```typescript
call_to_action: {
  type: "DOWNLOAD";
}
```

No change needed to `MetaService.createAd()` — the existing `ctaCode` param already supports `"DOWNLOAD"`.
The `getDefaultCTA()` in `cta-options.ts` will return `DOWNLOAD` for `app_promotion` via the `download` ctaBias in `OBJECTIVE_INTENT_MAP`.

---

## Files To Modify

| File                                                   | Change                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `src/lib/api/meta.ts`                                  | Update `createAdSet()` to handle `application_id` in `promoted_object` |
| `src/stores/campaign-store.ts`                         | Add `appStoreUrl` and `metaApplicationId` to `CampaignDraft`           |
| `src/actions/campaigns.ts`                             | Pass app fields to `createAdSet()`; handle attribution link optionally |
| `src/components/campaigns/new/steps/app-info-step.tsx` | [NEW] App info collection step                                         |
| `src/components/campaigns/new/CampaignWizard.tsx`      | Inject `app-info-step` when `objective === 'app_promotion'`            |
| `src/lib/constants.ts`                                 | Remove `comingSoon: true` once implemented                             |

---

## When To Implement

Remove `comingSoon: true` from `app_promotion` in `constants.ts` once:

1. `app-info-step.tsx` is built
2. `createAdSet()` handles `application_id` in `promoted_object`
3. Campaign store has `metaApplicationId` + `appStoreUrl`
4. `campaigns.ts` passes app fields through to the API

---

## References

- [Meta App Promotion Campaigns](https://developers.facebook.com/docs/marketing-api/app-ads/)
- [Meta Ad Set promoted_object — App](https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/#app-installs)
- [Advantage+ App Campaigns](https://developers.facebook.com/docs/marketing-api/app-ads/app-advantage-plus)
