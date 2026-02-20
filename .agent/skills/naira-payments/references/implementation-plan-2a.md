# PHASE 2A — Naira Ad Budget Top-Up

## "Pay in Naira. We handle the rest."

**Target: Months 4–7**

This is the payment friction solution. The goal is for SMEs to never see a dollar amount or need a dollar card.

---

### Architecture: Model 1 (Recommended — Per-User Isolated Cards)

```
SME pays ₦ to Adsync via Paystack
  → Adsync calls Grey/Geegpay API to fund a virtual USD card assigned to this organization
  → That virtual card is attached to the SME's own Meta ad account
  → Meta charges the virtual card
  → Each organization has their own card (ban isolation)
```

This is the safest architecture. Adsync is a payment facilitator, not the advertiser of record.

---

### 2A.1 Database Migration

```sql
-- Ad budget wallet (Naira)
CREATE TABLE ad_budget_wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  balance_ngn     INTEGER NOT NULL DEFAULT 0,   -- in kobo (x100)
  reserved_ngn    INTEGER NOT NULL DEFAULT 0,   -- committed to running campaigns
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Virtual card registry per organization
CREATE TABLE virtual_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,         -- 'grey' | 'geegpay'
  provider_card_id TEXT NOT NULL,        -- external card ID
  last_four       TEXT,                  -- for display: "4242"
  status          TEXT DEFAULT 'active', -- 'active' | 'frozen' | 'terminated'
  meta_account_id TEXT,                  -- Meta ad account it's attached to
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ad budget transactions (audit trail)
CREATE TABLE ad_budget_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  type            TEXT NOT NULL,    -- 'topup' | 'spend' | 'refund' | 'reserve'
  amount_ngn      INTEGER NOT NULL, -- positive = credit, negative = debit
  balance_after   INTEGER NOT NULL,
  reference       TEXT,             -- Paystack reference or Meta charge ID
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- File: supabase/migrations/[timestamp]_ad_budget_wallet.sql
```

---

### 2A.2 Ad Budget Server Actions

**New file:** `src/actions/ad-budget.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get the current ad budget wallet for the authenticated org
 */
export async function getAdBudgetWallet() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!member) throw new Error("No organization");

  const { data } = await supabase
    .from("ad_budget_wallets")
    .select("*")
    .eq("organization_id", member.organization_id)
    .single();

  return data;
}

/**
 * Called by Paystack webhook after a successful ad budget top-up
 * NOT called directly by the client
 */
export async function creditAdBudget({
  organizationId,
  amountNgn,
  paystackReference,
}: {
  organizationId: string;
  amountNgn: number;
  paystackReference: string;
}) {
  const supabase = await createClient();

  // Idempotency: check if reference already processed
  const { data: existing } = await supabase
    .from("ad_budget_transactions")
    .select("id")
    .eq("reference", paystackReference)
    .single();

  if (existing) return { success: true, message: "Already processed" };

  // Get current balance
  const { data: wallet } = await supabase
    .from("ad_budget_wallets")
    .select("balance_ngn")
    .eq("organization_id", organizationId)
    .single();

  const currentBalance = wallet?.balance_ngn || 0;
  const newBalance = currentBalance + amountNgn;

  // Upsert wallet
  await supabase.from("ad_budget_wallets").upsert(
    {
      organization_id: organizationId,
      balance_ngn: newBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );

  // Record transaction
  await supabase.from("ad_budget_transactions").insert({
    organization_id: organizationId,
    type: "topup",
    amount_ngn: amountNgn,
    balance_after: newBalance,
    reference: paystackReference,
    description: `Ad budget top-up via Paystack`,
  });

  return { success: true, newBalance };
}
```

---

### 2A.3 Paystack Webhook Extension

**Modified file:** `src/app/api/webhooks/paystack/route.ts`

Add handling for the new `ad_budget_topup` payment type:

```typescript
// In the existing Paystack webhook handler, add this case:

if (event === "charge.success") {
  const { reference, metadata, amount } = data;

  // Existing subscription logic stays...

  // NEW: Ad budget top-up
  if (metadata?.payment_type === "ad_budget_topup") {
    const { organizationId } = metadata;
    await creditAdBudget({
      organizationId,
      amountNgn: amount, // Paystack sends in kobo, verify: amount is in kobo
      paystackReference: reference,
    });
  }
}
```

---

### 2A.4 Ad Budget Top-Up UI Component

**New file:** `src/components/billing/ad-budget-topup.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Plus } from "lucide-react";

const TOPUP_PRESETS = [
  { label: "₦5,000", amount: 5000 },
  { label: "₦10,000", amount: 10000 },
  { label: "₦25,000", amount: 25000 },
  { label: "₦50,000", amount: 50000 },
];

interface Props {
  currentBalanceNgn: number;
  organizationId: string;
}

export function AdBudgetTopup({ currentBalanceNgn, organizationId }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleTopUp() {
    if (!selected) return;
    setLoading(true);

    // Initialize Paystack inline with ad_budget_topup metadata
    const PaystackPop = (window as any).PaystackPop;
    const handler = PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
      email: "user@email.com", // replace with actual user email
      amount: selected * 100, // Paystack uses kobo
      currency: "NGN",
      metadata: {
        payment_type: "ad_budget_topup",
        organizationId,
        topup_amount_ngn: selected,
      },
      callback: (response: any) => {
        // Paystack webhook handles the actual credit
        // Just notify the user
        toast.success(`₦${selected.toLocaleString()} added to your ad budget!`);
        setLoading(false);
        router.refresh();
      },
      onClose: () => setLoading(false),
    });
    handler.openIframe();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Ad Budget Wallet
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pay in Naira. Adsync handles your Meta ad spend.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-primary/5 p-4 text-center">
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="text-3xl font-bold text-primary">
            ₦{currentBalanceNgn.toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Top Up</p>
          <div className="grid grid-cols-2 gap-2">
            {TOPUP_PRESETS.map((preset) => (
              <button
                key={preset.amount}
                onClick={() => setSelected(preset.amount)}
                className={`rounded-lg border p-3 text-sm font-medium transition-all ${
                  selected === preset.amount
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleTopUp}
          disabled={!selected || loading}
          className="w-full gap-2"
        >
          <Plus className="h-4 w-4" />
          {loading ? "Processing..." : `Add ${selected ? `₦${selected.toLocaleString()}` : "Budget"}`}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Powered by Paystack · Secure Naira payment · No dollar card needed
        </p>
      </CardContent>
    </Card>
  );
}
```

---

### Phase 2A Deliverable Check

After this phase:

- SMEs top up ad budget in Naira via Paystack — no dollar card ever required
- Each organization has an isolated virtual card on their Meta account — ban risk isolated
- High-risk Nigerian ad copy is caught before launch, not after Meta rejects it
- Adsync's `AdSyncGuard` has a new pre-flight layer

---
