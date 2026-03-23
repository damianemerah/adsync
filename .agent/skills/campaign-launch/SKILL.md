---
name: campaign-launch
description: Governs the Tenzu campaign launch flow (1:1:1 structure on Meta). Use when working on `campaigns.ts` launch action, `meta.ts` API service, `policy-guard.ts`, `budget-launch-step.tsx`, attribution URL wrapping at launch time, or any pre-flight check before a Meta API write.
---

# Campaign Launch Skill

## When to Load

Load this skill when working on:

- `src/actions/campaigns.ts` — the full launch flow
- `src/lib/api/meta.ts` — Meta API service
- `src/lib/ai/policy-guard.ts` — pre-screen file
- `src/components/campaigns/new/steps/budget-launch-step.tsx`
- Pre-flight checks, campaign status updates

## Implementation Status

| Item                                               | Status                                                       |
| -------------------------------------------------- | ------------------------------------------------------------ |
| WhatsApp URL wrapping in attribution link          | ✅ Built                                                     |
| Website URL wrapping in attribution link           | ⬜ Pending — add to else branch at ~line 167 of campaigns.ts |
| Policy guard (`checkAdPolicy`) integration         | ✅ Built                                                     |
| Post-insert `attribution_links.campaign_id` update | ✅ Built                                                     |
| 1:1:1 campaign/adset/ad structure                  | ✅ Enforced                                                  |
| Phase 4 creative testing (1:1:N, Meta Creative Testing API)                | ⬜ Phase 4 Future |

## Reference Implementation

Full specs and code in:
`.agent/skills/campaign-launch/references/launch-and-policy.md`

## Current Launch Sequence in campaigns.ts

The existing launch flow follows this order — any changes must preserve it:

```
1. Auth check (getUser)
2. Organization + subscription gate (status must be 'active' or 'trialing')
3. Platform gate — TikTok returns { success: false, error: "coming soon" }
4. Get healthy ad account (platform = 'meta', health_status = 'healthy')
5. Build destination URL
   → WhatsApp: generateWhatsAppLink() → wrap in attribution link ← MODIFY HERE
   → Website: raw URL → wrap in attribution link ← ADD THIS
6. [NEW] Ad policy pre-screen — block HIGH, warn MEDIUM
7. Meta API chain:
   a. GET /me/accounts → get pageId
   b. createCampaign()
   c. createAdSet() — budget at ad set level, 1:1:1 rule
   d. createAdImage() — upload binary from Supabase Storage URL
   e. createAd() — link creative to ad set
8. Insert to campaigns table
9. Update attribution_links.campaign_id ← ADD AFTER INSERT
10. Save AI context (non-blocking .then())
11. Send notification (non-blocking .then())
12. revalidatePath("/campaigns")
13. Return { success: true, campaignId, dbCampaignId }
```

## Attribution Injection Point

In step 5, after building the destination URL, wrap it:

```typescript
// For WhatsApp objective:
const whatsappUrl = generateWhatsAppLink(rawPhone, defaultMessage);
const token = generateAttributionToken();
const { data: attrLink } = await supabase
  .from("attribution_links")
  .insert({
    token,
    organization_id: orgId,
    destination_url: whatsappUrl,
    destination_type: "whatsapp",
    // campaign_id updated after campaign insert (step 8)
  })
  .select("id, token")
  .single();
finalUrl = attrLink ? buildAttributionUrl(attrLink.token) : whatsappUrl;

// For website objective:
const token = generateAttributionToken();
const { data: attrLink } = await supabase
  .from("attribution_links")
  .insert({
    token,
    organization_id: orgId,
    destination_url: finalUrl, // the website URL
    destination_type: "website",
    pixel_token: nanoid(12), // longer token for pixel — different namespace
  })
  .select("id, token")
  .single();
finalUrl = attrLink ? buildAttributionUrl(attrLink.token) : finalUrl;
```

After step 8 (campaign inserted), link back:

```typescript
if (attrLink?.id && dbCampaignId) {
  await supabase
    .from("attribution_links")
    .update({ campaign_id: dbCampaignId })
    .eq("id", attrLink.id);
}
```

## Policy Guard

File: `src/lib/ai/policy-guard.ts`

High-risk Nigerian ad copy patterns to catch before Meta does:

- Financial: loan, borrow, guaranteed return, double your money, passive income
- Crypto: bitcoin, crypto, invest (in certain contexts)
- Health: cure, miracle, 100% effective, before/after weight loss claims
- Income: make money fast, earn daily, work from home (Nigerian MLM framing)
- Restricted imagery language: before/after, transformations with specific claims

Response shape:

```typescript
{ passed: boolean, riskLevel: 'low' | 'medium' | 'high', flags: string[], suggestion?: string }
```

HIGH → return { success: false, error: suggestion } — block launch
MEDIUM → allow launch, include policyWarning in success response
LOW → pass silently

## Return Shape (Never Throw)

```typescript
// Success
{ success: true, campaignId: string, dbCampaignId: string, policyWarning?: string }
// Failure
{ success: false, error: string, policyFlags?: string[] }
```

## 1:1:1 Rule

1 Campaign → 1 Ad Set → 1 Ad
Budget set at Ad Set level only (`is_adset_budget_sharing_enabled: false`)
Never break this structure for standard launches.

**Phase 4 Exception (Future — Not MVP):** Creative testing will introduce a controlled
1:1:N launch path (1 Campaign → 1 Ad Set → multiple Ads) via Meta's Creative Testing API.
This is a planned future feature gated behind a `creative_testing_enabled` flag. Do not
implement this speculatively. Until that flag exists, the rule is absolute.

## Phase 4 Roadmap — Creative Testing (Future)

Tenzu's response to Meta's Andromeda update: let Meta's algorithm evaluate multiple
creatives and auto-optimise toward the best performer.

### The Idea

- Launch 2–4 ad creatives into the same ad set (controlled 1:1:N relaxation)
- Meta Creative Testing API distributes spend fairly across variations
- After a learning period (~7 days), underperforming creatives are paused
- CAPI offline conversion signals train Meta's evaluation against real WhatsApp sales

### When to Implement

Only when a `creative_testing_enabled` feature flag exists in tier config AND the user
explicitly opts into creative testing mode in the launch wizard. The default 1:1:1 path
stays unchanged.

### CAPI Prerequisite

Creative testing is only valuable with CAPI configured. Without offline conversion
signals, Meta optimises on clicks alone — not actual sales. Prompt users to set up CAPI
(Settings → Business → Meta Pixel + CAPI token) before enabling creative testing.
See `attribution/SKILL.md` for CAPI setup details.
