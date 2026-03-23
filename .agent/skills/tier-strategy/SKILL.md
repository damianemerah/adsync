---
name: tier-strategy
description: Manages Tenzu's subscription tier model and AI credit system. Use when working on `TIER_CONFIG`, tier resolver, credit gates, feature flags, upgrade prompts, `useTierConfig` hook, Starter/Growth/Agency plan differences, or overage logic for AI credit consumption.
---

# Tier Strategy Skill

## Overview

Tenzu uses a **subscription + credit** model. SMEs pay a monthly Naira subscription (via Paystack) for platform access, and consume AI credits for image generation. Text/copy generation is free.

**Single source of truth for all tier config: `src/lib/constants.ts` → `TIER_CONFIG` and `PLAN_PRICES`.**

Always check `.agent/rules/decisions.md` before making any tier-related changes.

---

## The Three Tiers

| Feature                   | Starter               | Growth                | Agency                    |
| ------------------------- | --------------------- | --------------------- | ------------------------- |
| **Monthly Price (₦)**     | ₦10,000               | ₦25,000               | ₦60,000                   |
| **AI Credits / Month**    | 150                   | 400                   | 1,200                     |
| **Image Model**           | FLUX 2 Pro            | FLUX 2 Pro            | FLUX 2 Pro                |
| **Premium Image Model**   | —                     | —                     | Nano Banana Pro (Phase 3) |
| **AI Skills**             | ❌ Inline prompt only | ✅ Full Skills loaded | ✅ Full Skills loaded     |
| **Copy Variations**       | 2                     | 3                     | 5                         |
| **Copy Refinements**      | 3 per campaign        | Unlimited             | Unlimited                 |
| **Connected Ad Accounts** | 1                     | 3                     | Unlimited (999)           |
| **Team Members**          | 1 (solo)              | 3                     | 10                        |
| **Link Analytics Window** | 7 days                | 30 days               | Lifetime (36,500d)        |
| **Custom Link Slugs**     | ❌                    | ✅                    | ✅                        |

> **Note:** All tiers use the same `fal-ai/flux-2-pro` image model. Agency gets the optional `fal-ai/nano-banana-pro` premium model in Phase 3.

---

## `TIER_CONFIG` (from `src/lib/constants.ts`)

```typescript
export const TIER_CONFIG = {
  starter: {
    ai: {
      strategyModel: "gpt-5.2",
      refinementModel: "gpt-5-mini",
      imageModel: "fal-ai/flux-2-pro",
      premiumImageModel: null,
      useSkills: false, // inline system prompt only
      maxCopyVariations: 2,
      maxRefinementsPerCampaign: 3,
    },
    credits: { monthly: 150, imageCost: 3, premiumImageCost: null },
    limits: {
      maxAdAccounts: 1,
      maxTeamMembers: 1,
      linkAnalyticsDays: 7,
      customLinkSlugs: false,
    },
  },
  growth: {
    ai: {
      strategyModel: "gpt-5.2",
      refinementModel: "gpt-5-mini",
      imageModel: "fal-ai/flux-2-pro",
      premiumImageModel: null,
      useSkills: true, // full skills from .md files
      maxCopyVariations: 3,
      maxRefinementsPerCampaign: Infinity,
    },
    credits: { monthly: 400, imageCost: 3, premiumImageCost: null },
    limits: {
      maxAdAccounts: 3,
      maxTeamMembers: 3,
      linkAnalyticsDays: 30,
      customLinkSlugs: true,
    },
  },
  agency: {
    ai: {
      strategyModel: "gpt-5.2",
      refinementModel: "gpt-5-mini",
      imageModel: "fal-ai/flux-2-pro",
      premiumImageModel: "fal-ai/nano-banana-pro", // Phase 3
      useSkills: true,
      maxCopyVariations: 5,
      maxRefinementsPerCampaign: Infinity,
    },
    credits: { monthly: 1200, imageCost: 3, premiumImageCost: 8 },
    limits: {
      maxAdAccounts: 999, // treated as "unlimited" in UI
      maxTeamMembers: 10,
      linkAnalyticsDays: 36500, // treated as "lifetime" in UI
      customLinkSlugs: true,
    },
  },
};

export type TierId = keyof typeof TIER_CONFIG; // "starter" | "growth" | "agency"
```

---

## Credit Costs (from `src/lib/constants.ts` → `CREDIT_COSTS`)

| Action                           | Credits | Notes                                     |
| -------------------------------- | ------- | ----------------------------------------- |
| Image gen — FLUX 2 Pro           | **3**   | Default for all tiers                     |
| Image edit / refine — FLUX 2 Pro | **2**   |                                           |
| Image gen — Nano Banana Pro      | **8**   | Agency only, Phase 3                      |
| Ad copy strategy                 | **0**   | FREE — text generation is negligible cost |
| Copy refinement                  | **0**   | FREE                                      |
| Video — Kling v2 5s              | **35**  | Phase 2                                   |
| Video — Kling v2 10s             | **60**  | Phase 2                                   |
| Video — Veo 3.1 5s               | **42**  | Phase 2                                   |

> **Critical:** Text/copy generation costs 0 credits. Never gate copy on credits.

---

## Credit Pack Top-Ups (from `src/lib/constants.ts` → `CREDIT_PACKS`)

| Pack   | Credits | Price (₦) |
| ------ | ------- | --------- |
| Small  | 50      | ₦3,000    |
| Medium | 120     | ₦6,500    |
| Large  | 300     | ₦15,000   |

1 credit = ₦50 display value (`CREDIT_NGN_VALUE = 50`).

---

## Monthly Credits by Plan (from `src/lib/constants.ts` → `PLAN_CREDITS`)

```
free_trial: 50 credits
starter:   150 credits
growth:    400 credits
agency:   1200 credits
```

---

## Tier Resolver (server-side — `src/lib/tier.ts`)

The resolver reads `organizations.subscription_tier` from the DB via Supabase. It is **server-side only** (`"use server"`).

```typescript
// src/lib/tier.ts
export async function resolveTier(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ResolvedTier> {
  // Reads organization_members → organizations.subscription_tier
  // Returns { tierId, config, orgId }
  // Defaults to "starter" if no org or no tier found
}
```

**Do NOT create a client-side `useTierConfig` hook that re-implements this.** Use server actions + pass tier config as props, or query `organizations.subscription_tier` via TanStack Query.

---

## Credit Guard Pattern (`src/lib/credits.ts`)

```typescript
// In every server action that costs credits:
const { orgId, userId } = await requireCredits(
  supabase,
  CREDIT_COSTS.IMAGE_GEN_PRO,
);
// ... call AI model ...
await spendCredits(
  supabase,
  orgId,
  userId,
  CREDIT_COSTS.IMAGE_GEN_PRO,
  "image_gen_flux_pro",
  creativeId,
  "fal-ai/flux-2-pro",
);
```

- `requireCredits()` — auth + subscription gate + credit check. **Throws** on failure.
- `spendCredits()` — calls `deduct_credits` RPC atomically. Safe when `cost = 0`.
- `getOrgCredits()` — lightweight read for display. Reads `credits_balance` + `plan_credits_quota`.

**Text actions (`TEXT_GEN = 0`):** Still call `spendCredits` with `cost = 0` — it skips the deduction silently. This lets you log the action without charging.

---

## Subscription Gate (always check first)

Before any Meta API write and before any credit check:

```typescript
const allowedStatuses = ["active", "trialing"];
if (!allowedStatuses.includes(org.subscription_status)) {
  throw new Error("Subscription inactive");
}
```

This is separate from credit checks. `requireCredits()` handles both in sequence.

---

## Implementation Status

| Item                                                  | Status     |
| ----------------------------------------------------- | ---------- |
| `TIER_CONFIG` in `constants.ts`                       | ✅ Built   |
| `resolveTier()` in `tier.ts`                          | ✅ Built   |
| `requireCredits()` / `spendCredits()` in `credits.ts` | ✅ Built   |
| Credit deduction in image generation                  | ✅ Built   |
| Tier-aware model selection (`useSkills` flag)         | ✅ Built   |
| Copy refinement limits (3 for Starter)                | ⬜ Phase 2 |
| A/B copy variation limits                             | ⬜ Phase 2 |
| Soft cap overage banner (80% warning)                 | ⬜ Phase 2 |
| Ad account connection limit enforcement               | ⬜ Phase 2 |
| Team member limit enforcement                         | ⬜ Phase 2 |
| Link analytics time-windowing                         | ⬜ Phase 2 |
| Custom link slugs                                     | ⬜ Phase 3 |
| WhatsApp alerts                                       | ⬜ Phase 3 |
| Post-launch auto-optimization                         | ⬜ Phase 3 |
| Nano Banana Pro premium image (Agency)                | ⬜ Phase 3 |
| FLUX Schnell free preview                             | ⬜ Phase 3 |

Full deferred feature specs: `.agent/skills/tier-strategy/references/deferred-features.md`

---

## Key Rules

- **Never** hard-block Growth/Agency at 100% credits — downgrade image model, keep generating.
- **Starter:** Hard stop at 100% credits (no overage).
- **Never** skip the subscription status check. Credits are irrelevant if subscription is not active.
- **UI language:** "Credits" not "tokens." "Upgrade plan" not "subscribe." "Running low" not "quota exceeded."
- **1 credit = ₦50** for any user-facing price display.
