---
name: growth-strategy
description: Governs Tenzu's acquisition and subscription lifecycle model. Use when working on `SubscriptionGate`, trial flow, expired-vs-incomplete states, `TrialBanner`, `SpendTierBanner`, `GracePeriodBanner`, plan selection, paywall triggers, or any upsell/reactivation UX.
---

# Growth Strategy Skill — 7-Day Free Trial Model

## Core Philosophy

> **"Experience the full product first. Pay once you see the value."**

New users get 7 days of Growth-tier features for free. No credit card required upfront. They subscribe when the trial ends — or when they feel the pain of losing access.

This replaced the earlier "Connect for Free, Pay to Launch" read-only dashboard model, which was never built. See `rules/decisions.md` for the superseded decision.

---

## The Acquisition Funnel

```
Sign up
  → Connect Meta Ad Account
      → 7-day Growth trial starts (status: 'trialing', 50 credits)
          → Trial expires
              → SubscriptionGate shows paywall (select plan → Paystack → 'active')
```

Key touchpoints along the way:
- **Trial Banner** (`src/components/dashboard/trial-banner.tsx`) — countdown, urgency, upgrade CTA
- **Spend Tier Banner** (`src/components/dashboard/spend-tier-banner.tsx`) — warns of upcoming auto-tier upgrade based on Meta spend
- **Grace Period Banner** (`src/components/dashboard/grace-period-banner.tsx`) — payment failure notice with reactivation CTA

---

## Subscription Status Lifecycle

| Status         | Meaning                                                       | UX                                  |
| -------------- | ------------------------------------------------------------- | ----------------------------------- |
| `incomplete`   | Org created but Meta not yet connected; trial not started     | Onboarding flow                     |
| `trialing`     | 7-day trial active (full access, 50 credits)                  | Full access + trial banner          |
| `active`       | Paid subscription active                                      | Full access                         |
| `past_due`     | Payment failed; grace period in effect                        | Full access + grace period banner   |
| `expired`      | Trial ended without payment, or subscription lapsed           | SubscriptionGate paywall            |
| `cancelled`    | User explicitly cancelled                                     | SubscriptionGate paywall            |

> **"Free" is not a status.** There is no perpetual free tier. `incomplete` = not started, `trialing` = trial active, `expired` = lapsed.

---

## What SubscriptionGate Does

**File: `src/components/dashboard/subscription-gate.tsx`**

The gate wraps all authenticated pages. It checks subscription status and either:
- Passes through (full access): `active`, `trialing`, `past_due` (within grace window)
- Shows paywall modal: all other statuses

Settings page (`/settings/general`) always passes through so users can always manage their account.

The paywall modal shows:
- Left: plan summary (price, credits, tagline, current spend data)
- Right: CTA button → Paystack redirect
- First-time users see "Start Free Trial"; expired/cancelled see "Reactivate"

---

## Expired vs Incomplete UX

These are different emotional states and need different UX:

| State        | Who they are                             | UX goal                                                    |
| ------------ | ---------------------------------------- | ---------------------------------------------------------- |
| `expired`    | Was a user, stopped paying (or trial lapsed) | Re-activation nudge — remind them what they're missing |
| `incomplete` | Signed up but never connected Meta       | Onboarding completion — get them to the "Aha!" moment  |

Never show expired users an onboarding flow. Never show incomplete users a "reactivate" CTA.

---

## Spend-Tier Upgrade UX

When a user's 30-day Meta spend approaches the ceiling for their tier, `SpendTierBanner` appears:

- Starter approaching ₦100K → "You're growing fast! Your plan will upgrade to Growth next billing cycle."
- Growth approaching ₦300K → "You're scaling up! Your plan will upgrade to Agency next billing cycle."

This is a positive framing (growth = success), not a warning. The upgrade happens with a 7-day grace window after the threshold + anomaly buffer is crossed.

---

## Plan Selection Flow (post-trial)

When trial expires, the user is shown the plan selector (`src/components/subscription/plan-selector.tsx`):

1. Three plans displayed side-by-side using `BILLING_PLANS` from `src/lib/constants.ts`
2. Plans are positioned by spend level (Starter = up to ₦100K, Growth = up to ₦300K, Agency = above ₦300K)
3. Growth is highlighted as recommended
4. User selects plan → `initializePaystackTransaction()` → Paystack hosted page → webhook → `subscription_status = 'active'`

---

## What's Gated (Subscription Required)

All features require `active` or `trialing` status. There is no partial/read-only access for any subscription state below that.

| Gated action                    | Gate location                                      |
| ------------------------------- | -------------------------------------------------- |
| Create campaign                 | Server: `launchCampaign()` checks `sub_status`     |
| Pause / Resume campaign         | Server: `updateCampaignStatus()` checks sub status |
| AI copy generation              | Server: `requireCredits()`                         |
| AI image generation             | Server: `requireCredits()`                         |
| Mark as Sold                    | Server action gate                                 |

All gates are server-side. Client UI may show disabled states cosmetically, but the server is the enforcement point.

---

## Key Files

| File                                                             | Purpose                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| `src/components/dashboard/subscription-gate.tsx`                | Main paywall wrapper — status checks + modal         |
| `src/components/dashboard/trial-banner.tsx`                     | Trial countdown + urgency + upgrade CTA              |
| `src/components/dashboard/spend-tier-banner.tsx`                | Upcoming auto-tier upgrade warning                   |
| `src/components/dashboard/grace-period-banner.tsx`              | Payment failure + grace period notice                |
| `src/components/subscription/plan-selector.tsx`                 | Plan selection UI (post-trial / upgrade flow)        |
| `src/components/subscription/billing-content.tsx`               | Billing page — current plan, credits, plan change    |
| `src/actions/paystack.ts`                                        | `initializePaystackTransaction`, `grantFreeTrialCredits` |
| `src/actions/spend-sync.ts`                                      | `syncSpendAndUpdateTier` — spend-based tier upgrade  |
| `src/lib/constants.ts` → `BILLING_PLANS`                        | Plan data consumed by all billing UI                 |

---

## Key Rules

- **Never hide data with CSS alone.** All gates must be enforced server-side. Client UI is cosmetic only.
- **Never auto-downgrade.** Trial expires → `expired`. Never silently move a paying user to a lower-featured state.
- **Sync existing campaigns on Meta connect.** As soon as they connect their Meta account, trigger `syncCampaigns()` — this is the "Aha!" moment that starts the trial.
- **UI language:** "Start free trial" not "Free trial." "Upgrade" not "Subscribe." "Unlock" not "Pay."
- **Trial credit allocation:** 50 credits for all trial users, regardless of tier features shown.
