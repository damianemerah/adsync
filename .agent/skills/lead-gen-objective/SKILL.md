---
name: lead-gen-objective
description: Implements the OUTCOME_LEADS campaign objective (Meta Lead Ads / Instant Forms). Use when working on lead-gen campaign creation, Lead Gen Form builder UI, or the leads-specific ad creative structure. Distinct from the whatsapp/traffic objectives — no destination URL or attribution link is used.
---

# Lead Gen Objective Skill (OUTCOME_LEADS)

## Status: 🟢 Implemented

The objective constant (`leads`) is fully active in `src/lib/constants.ts`.
The Lead Form builder (select existing / AI generate / build manually) is in `src/components/campaigns/new/steps/lead-form-step.tsx`.
AI-suggested lead forms are generated via the core-strategy skill when objective is `leads` and available via local industry defaults in `src/lib/lead-form-defaults.ts`.
The launch flow in `src/actions/campaigns.ts` correctly skips attribution links and passes `leadGenFormId` to the Meta API.

---

## Why It's Different From Other Objectives

| Feature          | WhatsApp / Traffic / Sales              | Leads                             |
| ---------------- | --------------------------------------- | --------------------------------- |
| Destination URL  | Required (`wa.me/...` or `https://...`) | ❌ None                           |
| Tenzu Smart Link | Yes, wraps destination URL              | ❌ Not applicable                 |
| Attribution link | Yes (`attribution_links` row)           | ❌ Not needed                     |
| Meta Pixel       | Optional (CAPI)                         | ❌ Not needed                     |
| Ad Creative      | `link_data` with URL + CTA              | `lead_gen_form_id` attached       |
| Meta Form        | None                                    | ✅ **Must be created first**      |
| CAPI signal      | `Purchase` after "Sold!"                | `Lead` event (auto via Meta form) |

Meta Lead Ads capture contact info **inside** Facebook/Instagram using a native Instant Form. The user never leaves the platform. Tenzu sends no destination URL.

---

## Implementation Plan

### Step 1 — Lead Gen Form API Calls (new in `meta.ts`)

Add two new `MetaService` methods:

```typescript
// Create a new Lead Gen Form on a FB Page
MetaService.createLeadGenForm: async (
  token: string,
  pageId: string,
  form: {
    name: string;          // e.g. "New Customer Form"
    questions: Array<{
      type: "FULL_NAME" | "EMAIL" | "PHONE" | "CUSTOM";
      label?: string;      // Only for CUSTOM type
    }>;
    privacyPolicyUrl: string;
    thankYouMessage?: string;
  }
) => Promise<{ id: string }>

// List existing Lead Gen Forms on a Page (so user can re-use)
MetaService.getLeadGenForms: async (
  token: string,
  pageId: string
) => Promise<Array<{ id: string; name: string; status: string }>>
```

Meta API endpoint: `POST /{page-id}/leadgen_forms`

### Step 2 — UI: Lead Gen Form Builder Step

Add a new conditional wizard step that appears **only** when `objective === 'leads'`:

**File to modify:** `src/components/campaigns/new/steps/` — add `lead-form-step.tsx`

The step should allow the user to either:

1. **Create a new form** with name, fields (name, email, phone), and a privacy policy URL
2. **Select an existing form** from the page (fetched from `MetaService.getLeadGenForms`)

Store the selected/created `leadGenFormId` in the campaign wizard store (`campaign-store.ts`).

### Step 3 — Campaign Store Extension

In `src/stores/campaign-store.ts`:

```typescript
// Add to CampaignDraft interface:
leadGenFormId?: string;      // Only used when objective === 'leads'
```

### Step 4 — createAd() in `meta.ts` — Lead Ad Creative

Lead Ads use a **fundamentally different creative structure**. In `MetaService.createAd()`, add a branch for `objective === 'leads'`:

```typescript
// Lead Ad creative — no link_data, uses lead_gen_form_id
if (objective === "leads") {
  const creativeRes = await MetaService.request(`/${id}/adcreatives`, "POST", token, {
    name: "Tenzu Lead Creative",
    object_story_spec: {
      page_id: copy.pageId,
      link_data: {
        image_hash: creativeHash,
        message: copy.primaryText,
        name: copy.headline,
        call_to_action: {
          type: "LEARN_MORE",
          value: { lead_gen_form_id: leadGenFormId },
        },
      },
    },
  });
  // ... rest of ad creation
}
```

### Step 5 — campaigns.ts Launch Action

In `src/actions/campaigns.ts`, add a branch for `objective === 'leads'`:

```typescript
// NO attribution link creation for leads
// NO destination URL needed
// finalize with leadGenFormId from store
```

Skip steps 5 (destination URL build) and attribution link creation entirely.
Pass `leadGenFormId` through to `createAd()`.

### Step 6 — CAPI Lead Event (optional, Phase 2)

When a Lead is captured by Meta's form, Meta fires an automatic `Lead` event internally.
If the user has CAPI configured, Tenzu can additionally send a `Lead` CAPI event server-side
using `MetaService.sendCAPIEvent()` with `eventName: "Lead"`.

This is **optional** — Meta's native form fires the Lead event automatically without CAPI.
CAPI improves match quality and attribution but is not required.

---

## Files To Modify

| File                                                    | Change                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/lib/api/meta.ts`                                   | Add `createLeadGenForm()` and `getLeadGenForms()` methods; update `createAd()` with leads branch |
| `src/stores/campaign-store.ts`                          | Add `leadGenFormId` to `CampaignDraft`                                                           |
| `src/actions/campaigns.ts`                              | Skip attribution link for leads; pass `leadGenFormId`                                            |
| `src/components/campaigns/new/steps/lead-form-step.tsx` | [NEW] Lead Gen Form builder/selector step                                                        |
| `src/components/campaigns/new/CampaignWizard.tsx`       | Inject `lead-form-step` conditionally when `objective === 'leads'`                               |
| `src/lib/constants.ts`                                  | Remove `comingSoon: true` once implemented                                                       |

---

## When To Implement

Remove `comingSoon: true` from `leads` in `constants.ts` once:

1. `lead-form-step.tsx` is built
2. `MetaService.createLeadGenForm()` is implemented
3. `createAd()` has a leads branch
4. `campaigns.ts` launch action skips attribution link for leads

---

## References

- [Meta Lead Ads API](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create)
- [Meta Lead Gen Forms](https://developers.facebook.com/docs/marketing-api/reference/ad-creative-lead-gen-data-spec)
