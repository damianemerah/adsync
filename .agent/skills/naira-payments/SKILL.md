---
name: naira-payments
description: Manages Tenzu's Paystack subscription billing. Use when working on Paystack webhooks, subscription initialization, trial credit grants, plan changes, `initializePaystackTransaction`, `verifyTransaction`, or billing page UI.
---

# Naira Payments Skill

> **⚠️ Phase 2A DEPRECATED:** The Naira wallet + virtual USD card system (ad budget top-up via Grey/Geegpay) was fully dropped. Tenzu does NOT manage ad spend funds. SMEs pay Meta directly using Meta's native payment options (Card, Bank Transfer). Tables `ad_budget_wallets`, `virtual_cards`, and `ad_budget_transactions` are no longer in use.

> **Active billing provider:** Paystack (Naira subscriptions for platform access). For global billing (non-NG orgs), Stripe is the provider — determined by `organizations.billing_provider`.

---

## What Naira Payments Covers (Active)

**One flow only: Tenzu platform subscription.**

```
SME → Paystack → webhook → subscription_status = 'active'
```

The SME pays Tenzu in Naira for access to the platform. This is entirely separate from ad spend — ad spend goes directly from the SME's own bank/card to Meta.

---

## Two Payment Flows — Never Confuse Them

| Flow                           | Status      | Handler                                         |
| ------------------------------ | ----------- | ----------------------------------------------- |
| Platform subscription (Paystack) | ✅ Active  | `src/actions/paystack.ts`                       |
| Ad budget top-up (virtual card)  | 🚫 Dropped | ~~Phase 2A~~ — removed from roadmap             |

---

## Platform Subscription Flow (Active)

### Initialize a transaction

```typescript
// src/actions/paystack.ts
await initializePaystackTransaction({
  planId: "growth",           // "starter" | "growth" | "agency"
  userId,
  organizationId,
  callbackUrl: "/dashboard",
});
```

This creates a Paystack subscription transaction and returns a redirect URL to Paystack's hosted checkout.

### Webhook handler

**File: `src/app/api/webhooks/paystack/route.ts`**

Listens for `charge.success` events. Distinguish subscription payments from other charges via `metadata.payment_type`:

```typescript
if (event === "charge.success") {
  const { reference, metadata, amount } = data;

  if (metadata?.payment_type === "subscription") {
    // Handle platform subscription activation
    await activateSubscription({ userId, planId, reference });
  }
  // Note: "ad_budget_topup" payment_type is DEPRECATED — do not implement
}
```

### Idempotency rule

Always check if a Paystack reference has already been processed before acting on a webhook:

```typescript
const { data: existing } = await supabase
  .from("user_subscriptions")
  .select("id")
  .eq("paystack_reference", reference)
  .single();
if (existing) return { success: true, message: "Already processed" };
```

### Trial grant

When a new user connects their Meta Ad Account for the first time, grant trial credits:

```typescript
// src/actions/paystack.ts
await grantFreeTrialCredits(userId);
// Sets subscription_status = 'trialing', credits_balance = 50, trial_ends_at = now + 7 days
```

---

## Paystack Plan Codes

Plan codes are created in the Paystack dashboard and stored in env vars:

```
NEXT_PUBLIC_PAYSTACK_PLAN_STARTER
NEXT_PUBLIC_PAYSTACK_PLAN_GROWTH
NEXT_PUBLIC_PAYSTACK_PLAN_AGENCY
```

Maps in `src/lib/constants.ts` → `PAYSTACK_PLAN_CODES`.

---

## Key Tables

```
user_subscriptions:   subscription_tier, subscription_status, paystack_reference,
                      trial_ends_at, grace_period_ends_at, last_30d_spend_kobo,
                      pending_tier_upgrade_to, pending_tier_upgrade_after
users:                credits_balance, plan_credits_quota
```

Note: Subscription is **per-user**, not per-org. One user → one subscription → shared across all their organizations.

---

## Key Files

| File                                          | Purpose                                              |
| --------------------------------------------- | ---------------------------------------------------- |
| `src/actions/paystack.ts`                     | `initializePaystackTransaction`, `verifyTransaction`, `grantFreeTrialCredits` |
| `src/app/api/webhooks/paystack/route.ts`      | Webhook handler for Paystack events                  |
| `src/components/subscription/billing-content.tsx` | Billing page UI — current plan, credits, upgrade   |
| `src/lib/constants.ts` → `PAYSTACK_PLAN_CODES` | Plan code env var mapping                           |

---

## Key Rules

- **Prepaid only.** SMEs pay before accessing features. No credit/post-billing.
- **Idempotency always.** Check if reference was already processed before acting.
- **Never manage ad spend.** If someone asks about Naira wallets or virtual cards for Meta ad spend — that's deprecated. SMEs fund Meta ads directly.
- **Paystack for NG, Stripe for global.** Check `organizations.billing_provider` before deciding which flow to use.
