---
name: naira-payments
description: Manages Tenzu's Naira-first payment system. Use when working on ad budget top-up (Phase 2A), Paystack webhooks, virtual USD card provisioning (Grey/Geegpay), `ad_budget_wallets` table, `ad-budget-topup.tsx` component, or anything related to the SME paying in Naira for ad spend.
---

# Naira Payments Skill

> **Note:** This skill documents the NG/NGN payment flow (Paystack + Sudo Africa). For global billing use Stripe. The active provider is determined by `organizations.billing_provider` (`'paystack'` for NG orgs, `'stripe'` for global orgs).

## When to Load

Load this skill when working on:

- `src/actions/ad-budget.ts` — new file
- `src/components/billing/ad-budget-topup.tsx` — new component
- `src/app/api/webhooks/paystack/route.ts` — extend existing webhook
- `ad_budget_wallets`, `virtual_cards`, `ad_budget_transactions` tables
- Grey or Geegpay virtual card API integration

## Reference Implementation

Full SQL, code, and specs in:
`.agent/skills/naira-payments/references/phase-2a-naira-payments.md`

Full status, provider selection rationale, and integration review notes in:
`.agent/skills/naira-payments/IMPLEMENTATION_STATUS.md`

## Two Separate Payment Flows — Never Confuse Them

### Flow 1: Tenzu Platform Subscription (ALREADY EXISTS)

```
SME → Paystack → organizations.subscription_status = 'active'
Handled by: src/actions/paystack.ts (existing)
```

### Flow 2: Ad Budget Top-Up (Phase 2A — COMPLETE)

```
SME pays ₦ → Paystack → webhook → creditAdBudget()
  → ad_budget_wallets.balance_ngn increases
  → Sudo Africa API funds org's virtual USD card
  → Virtual card is on SME's own Meta ad account
```

**Callback flow (client-side):**
```
Paystack redirects → ?topup_success=true
  → billing-content.tsx reads param
  → getVirtualCard() — if null → createOrganizationVirtualCard()
```

**Note:** Card creation only fires if the user lands on the callback page.
If the tab is closed before redirect, card is not created (webhook does not call createOrganizationVirtualCard). This is a known MVP gap.

## The Isolation Rule (Critical)

Each organization gets their OWN virtual card.
That card is attached to the SME's OWN Meta ad account.
Tenzu's card is NEVER the payment method on Meta.

Why: If one SME runs a banned ad and Meta flags the payment method,
only their card is affected. Other orgs are completely isolated.

## Paystack Webhook Extension Pattern

In the existing webhook handler (`api/webhooks/paystack/route.ts`),
distinguish ad budget top-ups by metadata:

```typescript
if (event === "charge.success") {
  const { reference, metadata, amount } = data;

  if (metadata?.payment_type === "ad_budget_topup") {
    // New: handle ad budget
    await creditAdBudget({
      organizationId: metadata.organizationId,
      amountNgn: amount, // Paystack sends kobo
      paystackReference: reference,
    });
  } else {
    // Existing: handle subscription
    // ... existing subscription logic unchanged
  }
}
```

## Idempotency Rule

Always check if Paystack reference already processed before crediting.
Use `provider_reference` as unique constraint in `ad_budget_transactions`.

```typescript
const { data: existing } = await supabase
  .from("ad_budget_transactions")
  .select("id")
  .eq("reference", paystackReference)
  .single();
if (existing) return { success: true, message: "Already processed" };
```

## Prepaid Only Rule

SME pays Tenzu BEFORE the card is loaded.
No credit. No post-billing.
Non-refundable once converted and loaded (Meta doesn't reliably refund unspent budget).

## Top-Up Presets

₦5,000 / ₦10,000 / ₦25,000 / ₦50,000
These map well to typical Nigerian SME weekly ad budgets.

## Key Tables

```
ad_budget_wallets:     organization_id (unique), balance_ngn, reserved_ngn
virtual_cards:         organization_id (unique), provider, provider_card_id, last_four, status, meta_account_id
ad_budget_transactions: organization_id, type, amount_ngn, balance_after, reference, description
```

## Ad Policy Pre-Screen (also triggered at payment time)

Before loading the virtual card for a campaign spend,
run the campaign's ad copy through policy-guard.ts.
High-risk copy = don't load card until copy is fixed.
This reduces chargebacks from Meta rejections.
