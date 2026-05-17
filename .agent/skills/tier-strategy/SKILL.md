---
name: tier-strategy
description: Manages Tenzu's subscription tier model and AI credit system. Use when working on `TIER_CONFIG`, tier resolver, credit gates, feature flags, upgrade prompts, `BILLING_PLANS`, Starter/Growth/Agency plan differences, spend-based auto-upgrades, or credit consumption logic.
---

# Tier Strategy Skill

## Overview

Tenzu uses a **subscription + credit** model. SMEs pay a monthly Naira subscription (via Paystack) for platform access and consume AI credits for image generation. Text/copy generation is always free.

**Key principle: All tiers get identical features. The only difference is monthly credit quota.**

Tier selection is also driven by Meta ad spend — the system automatically enforces a minimum (floor) tier based on the SME's 30-day spend. Users can always be on a *higher* tier than their spend requires, but never below the floor.

**Single source of truth for all tier config: `src/lib/constants.ts` → `TIER_CONFIG` and `PLAN_PRICES`.**

Always check `.agent/rules/decisions.md` before making any tier-related changes.

---

## The Three Tiers

All tiers get **identical AI features**. Differentiation is purely credit quota.

| Feature                        | Starter                       | Growth                         | Agency                        |
| ------------------------------ | ----------------------------- | ------------------------------ | ----------------------------- |
| **Monthly Price (₦)**          | ₦9,900                        | ₦24,900                        | ₦59,900                       |
| **AI Credits / Month**         | 50                            | 150                            | 250                           |
| **Target Spend**               | Up to ₦100K/mo                | ₦100K–₦300K/mo                 | Above ₦300K/mo                |
| **AI Skills**                  | ✅ Full Skills loaded         | ✅ Full Skills loaded          | ✅ Full Skills loaded         |
| **Copy Variations**            | 5                             | 5                              | 5                             |
| **Copy Refinements**           | Unlimited                     | Unlimited                      | Unlimited                     |
| **Image Model**                | FLUX 2 Pro + Nano Banana Pro  | FLUX 2 Pro + Nano Banana Pro   | FLUX 2 Pro + Nano Banana Pro  |
| **Monthly Chat Quota**         | 2,000                         | 2,000                          | 2,000                         |
| **Connected Ad Accounts**      | Unlimited                     | Unlimited                      | Unlimited                     |
| **Team Members**               | Unlimited                     | Unlimited                      | Unlimited                     |
| **Link Analytics Window**      | Lifetime                      | Lifetime                       | Lifetime                      |
| **Custom Link Slugs**          | ✅                            | ✅                             | ✅                            |

> **Note:** Plans are differentiated by credit quota, not feature access. Never block features based on tier — only block based on credit balance or subscription status.

---

## `TIER_CONFIG` (from `src/lib/constants.ts`)

```typescript
export const TIER_CONFIG = {
  starter: {
    ai: {
      strategyModel: "gpt-5.2",
      refinementModel: "gpt-5-mini",
      imageModel: "fal-ai/flux-2-pro",
      premiumImageModel: "fal-ai/nano-banana-pro",
      useSkills: true,
      maxCopyVariations: 5,
      maxRefinementsPerCampaign: Infinity,
    },
    credits: { monthly: 50, imageCost: 5, premiumImageCost: 8 },
    limits: {
      maxOrganizations: 999,     // effectively unlimited
      maxAdAccounts: 999,
      maxTeamMembers: 999,
      linkAnalyticsDays: 36500,  // lifetime
      customLinkSlugs: true,
      maxMonthlyChats: 2000,
      adSpendCeilingKobo: 10_000_000,  // ₦100,000 — auto-upgrade floor
      anomalyBufferKobo: 2_000_000,    // ₦20,000 buffer
    },
  },
  growth: {
    // identical ai config as starter
    credits: { monthly: 150, imageCost: 5, premiumImageCost: 8 },
    limits: {
      // identical limits as starter except:
      adSpendCeilingKobo: 30_000_000,  // ₦300,000 — auto-upgrade floor
      anomalyBufferKobo: 5_000_000,    // ₦50,000 buffer
    },
  },
  agency: {
    // identical ai config
    credits: { monthly: 250, imageCost: 5, premiumImageCost: 8 },
    limits: {
      // identical limits except:
      adSpendCeilingKobo: null,  // Unlimited
      anomalyBufferKobo: null,
    },
  },
};
```

---

## Spend-Based Automatic Tier Upgrade

**File: `src/lib/tier-resolver.ts`**

The tier a user is on must be at or above the floor tier determined by their 30-day Meta ad spend. This is enforced via `syncSpendAndUpdateTier()` in `src/actions/spend-sync.ts`.

| 30-day Ad Spend       | Floor Tier |
| --------------------- | ---------- |
| ≤ ₦100,000            | Starter    |
| ≤ ₦300,000            | Growth     |
| > ₦300,000            | Agency     |

**Anomaly buffers** prevent one-off campaign spikes from triggering upgrades prematurely:
- Starter → Growth: spend must exceed ₦100K + ₦20K buffer = ₦120K
- Growth → Agency: spend must exceed ₦300K + ₦50K buffer = ₦350K

**Grace window:** When spend exceeds the ceiling + buffer, a 7-day grace period starts before the tier actually changes. The user is notified in advance.

```typescript
// src/lib/tier-resolver.ts
export function resolveSpendTier(spendKobo: number, bufferKobo?: number): TierId
export function isTierChangeAllowed(requestedTier: TierId, currentSpendKobo: number): boolean
export function isUpgrade(candidateTier: TierId, currentTier: TierId): boolean
export function tierSpendRangeLabel(tier: TierId): string
```

**Rule:** Users can *upgrade* to any tier above their floor. They can *never downgrade below* their spend floor.

---

## Free Trial

New organizations get a **7-day free trial**:

- Trial features: identical to Growth tier, but 50 credits (same as Starter)
- After trial: user selects a paid plan and subscribes via Paystack
- `grantFreeTrialCredits()` in `src/actions/paystack.ts` — credits initial 50 credits
- `TRIAL_DAYS = 7` in `src/lib/constants.ts`
- Trial is only started once Meta Ad Account is connected (`subscription_status = 'incomplete'` until then)
- Organizations created via "Add Business" in Settings skip the trial and start on Starter

---

## Credit Costs (from `src/lib/constants.ts` → `CREDIT_COSTS`)

| Action                           | Credits | Notes                                     |
| -------------------------------- | ------- | ----------------------------------------- |
| Image gen — FLUX 2 Pro           | **5**   | Default for all tiers                     |
| Image edit / refine — FLUX 2 Pro | **3**   | Cheaper than gen to encourage iteration   |
| Image gen — Nano Banana Pro      | **8**   | Phase 3                                   |
| Ad copy strategy                 | **0**   | FREE — text generation is negligible cost |
| Copy refinement                  | **0**   | FREE                                      |
| Chat overage                     | **1**   | After 2,000 monthly chat quota            |
| Video — Kling v2 5s              | **40**  | Phase 2                                   |
| Video — Kling v2 10s             | **70**  | Phase 2                                   |
| Video — Veo 3.1 5s               | **50**  | Phase 2                                   |

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

## Monthly Credits by Plan (`PLAN_CREDITS`)

```
free_trial:  50 credits
starter:     50 credits
growth:     150 credits
agency:     250 credits
```

---

## Billing Plans Display (`BILLING_PLANS`)

`BILLING_PLANS` in `src/lib/constants.ts` is the single source of truth consumed by `billing-content.tsx`, `subscription-gate.tsx`, and the payment dialog. Plans are positioned around spend levels, not feature differences:

- **Starter** tagline: "For businesses spending up to ₦100K/mo on ads"
- **Growth** tagline: "For businesses spending ₦100K–₦300K/mo on ads" ← highlighted / recommended
- **Agency** tagline: "For businesses spending above ₦300K/mo on ads"

---

## DB Field: Where Tier Lives

Subscription tier is **per-user**, stored in `user_subscriptions.subscription_tier`.

**Do NOT reference `organizations.subscription_tier`** — that column does not exist.

```typescript
// ✅ Correct — reads from user_subscriptions
const { data: sub } = await supabase
  .from("user_subscriptions")
  .select("subscription_tier, subscription_status")
  .eq("user_id", userId)
  .single();

// ❌ Wrong — this column doesn't exist
const { data: org } = await supabase
  .from("organizations")
  .select("subscription_tier"); // ← will fail
```

---

## Credit Guard Pattern (`src/lib/credits.ts`)

```typescript
// In every server action that costs credits:
const { orgId, userId } = await requireCredits(supabase, CREDIT_COSTS.IMAGE_GEN_PRO);
// ... call AI model ...
await spendCredits(
  supabase,
  orgId,
  userId,
  CREDIT_COSTS.IMAGE_GEN_PRO,
  "image_gen_flux_pro",
  creativeId,
  "fal-ai/flux-2-pro"
);
```

- `requireCredits()` — auth + subscription gate + credit check. **Throws** on failure.
- `spendCredits()` — calls `deduct_credits` RPC atomically. Safe when `cost = 0`.
- `getOrgCredits()` — lightweight read for display. Reads `credits_balance` + `plan_credits_quota`.

**Text actions (`TEXT_GEN = 0`):** Still call `spendCredits` with `cost = 0` — it skips the deduction silently. Lets you log the action without charging.

---

## Subscription Gate (always check first)

Before any Meta API write and before any credit check:

```typescript
const allowedStatuses = ["active", "trialing"];
if (!allowedStatuses.includes(subscription_status)) {
  throw new Error("Subscription inactive");
}
```

`past_due` users in the grace window also get access — check `SubscriptionGate` component (`src/components/dashboard/subscription-gate.tsx`) for the full logic.

---

## Implementation Status

| Item                                                           | Status   |
| -------------------------------------------------------------- | -------- |
| `TIER_CONFIG` in `constants.ts` (all tiers equal)             | ✅ Built |
| `resolveSpendTier()` in `tier-resolver.ts`                    | ✅ Built |
| `requireCredits()` / `spendCredits()` in `credits.ts`         | ✅ Built |
| Credit deduction in image generation                          | ✅ Built |
| `useSkills: true` for all tiers                               | ✅ Built |
| `BILLING_PLANS` with spend-tier taglines                      | ✅ Built |
| `syncSpendAndUpdateTier()` in `spend-sync.ts`                 | ✅ Built |
| 7-day trial locked to Growth features                         | ✅ Built |
| Spend anomaly buffer + 7-day grace window                     | ✅ Built |
| Soft cap overage banner (80% warning)                         | ⬜ Phase 2 |
| Video generation (Kling / Veo)                                | ⬜ Phase 2 |
| Nano Banana Pro premium image gating                          | ⬜ Phase 3 |

---

## Key Rules

- **Never block features based on tier** — tier differences are credit quota only.
- **Never** hard-block Growth/Agency at 100% credits — downgrade image model, keep generating.
- **Starter:** Hard stop at 100% credits (no overage for image gen).
- **Never** skip the subscription status check. Credits are irrelevant if subscription is not active.
- **UI language:** "Credits" not "tokens." "Upgrade plan" not "subscribe." "Running low" not "quota exceeded."
- **1 credit = ₦50** for any user-facing price display.
- **Spend drives tier floor** — always call `syncSpendAndUpdateTier()` after Meta insights sync.
