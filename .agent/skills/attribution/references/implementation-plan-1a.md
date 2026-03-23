# PHASE 1A — The Attribution Layer

## "Every ad gets a traceable door"

**Target: Months 1–2**

This is the highest-leverage work in the entire roadmap. Nothing else compounds without it.

---

### What We're Building

When a Nigerian SME's ad runs via Tenzu with a WhatsApp objective, the current destination URL is a raw `wa.me/234...` link. When someone clicks, they land in WhatsApp — and Tenzu sees nothing.

We replace that raw link with an **Tenzu-hosted micro-redirect** (`tenzu.africa/l/[token]`) that:

1. Records the visit (which campaign, which ad, timestamp, device)
2. Immediately redirects to the original WhatsApp deep link
3. Is invisible to the end user — zero friction added

This gives us a "pixel" without requiring the SME to own a website.

---

### 1.1 Database Migration

**New table: `attribution_links`**

```sql
CREATE TABLE attribution_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT UNIQUE NOT NULL, -- short token, e.g. "xK9mZ2"
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_id           UUID REFERENCES ads(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  destination_url TEXT NOT NULL,         -- the real wa.me/... link
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ            -- optional TTL
);

CREATE INDEX idx_attribution_links_token ON attribution_links(token);
CREATE INDEX idx_attribution_links_campaign ON attribution_links(campaign_id);
```

**New table: `link_clicks`**

```sql
CREATE TABLE link_clicks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id         UUID REFERENCES attribution_links(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  clicked_at      TIMESTAMPTZ DEFAULT NOW(),
  device_type     TEXT,           -- 'mobile' | 'desktop' | 'tablet'
  country         TEXT,           -- from CF-IPCountry header
  referrer        TEXT            -- utm source if present
);

CREATE INDEX idx_link_clicks_campaign ON link_clicks(campaign_id);
CREATE INDEX idx_link_clicks_clicked_at ON link_clicks(clicked_at);
```

**Migration for `campaigns` table — add conversation tracking columns:**

```sql
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS whatsapp_clicks     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_click_rate NUMERIC(5,2),  -- clicks / impressions %
  ADD COLUMN IF NOT EXISTS last_click_at       TIMESTAMPTZ;
```

**File:** `supabase/migrations/[timestamp]_attribution_layer.sql`

---

### 1.2 The Attribution Link Route

**New file:** `src/app/l/[token]/route.ts`

This is a Next.js Route Handler (not a page) — it must be as fast as possible.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UAParser } from "ua-parser-js"; // npm install ua-parser-js

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const supabase = await createClient();
  const { token } = params;

  // 1. Look up the link
  const { data: link } = await supabase
    .from("attribution_links")
    .select("id, campaign_id, organization_id, destination_url")
    .eq("token", token)
    .single();

  // If link not found, redirect to homepage gracefully
  if (!link) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Fire-and-forget: record the click
  // Use waitUntil if on Edge runtime, or just don't await
  const ua = request.headers.get("user-agent") || "";
  const parser = new UAParser(ua);
  const device = parser.getDevice().type || "desktop";
  const country = request.headers.get("cf-ipcountry") || "NG";

  // Non-blocking insert
  supabase
    .from("link_clicks")
    .insert({
      link_id: link.id,
      campaign_id: link.campaign_id,
      organization_id: link.organization_id,
      device_type: device,
      country,
      referrer: request.headers.get("referer") || null,
    })
    .then(() => {
      // Also increment the campaign counter
      supabase.rpc("increment_campaign_clicks", {
        p_campaign_id: link.campaign_id,
      });
    });

  // 3. Redirect immediately — user doesn't wait for analytics
  return NextResponse.redirect(link.destination_url, { status: 302 });
}
```

**New Supabase function:** `increment_campaign_clicks`

```sql
CREATE OR REPLACE FUNCTION increment_campaign_clicks(p_campaign_id UUID)
RETURNS VOID AS $$
  UPDATE campaigns
  SET
    whatsapp_clicks = COALESCE(whatsapp_clicks, 0) + 1,
    last_click_at = NOW()
  WHERE id = p_campaign_id;
$$ LANGUAGE SQL;
```

---

### 1.3 Token Generation Utility

**New file:** `src/lib/attribution.ts`

```typescript
import { nanoid } from "nanoid"; // npm install nanoid

/**
 * Generates a short, URL-safe attribution token
 * e.g. "xK9mZ2pR"
 */
export function generateAttributionToken(length = 8): string {
  return nanoid(length);
}

/**
 * Builds the full Tenzu redirect URL
 */
export function buildAttributionUrl(token: string, baseUrl?: string): string {
  const base =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://tenzu.africa";
  return `${base}/l/${token}`;
}
```

---

### 1.4 Inject Attribution Link at Campaign Launch

**Modified file:** `src/actions/campaigns.ts`

In the `launchCampaign` function, after building `finalUrl` for WhatsApp objective, replace the raw `wa.me` link with an Tenzu attribution link.

**Find this section (~line 85 in campaigns.ts):**

```typescript
finalUrl = generateWhatsAppLink(rawPhone, defaultMessage);
```

**Replace with:**

```typescript
const whatsappUrl = generateWhatsAppLink(rawPhone, defaultMessage);

// Create attribution link that wraps the WhatsApp URL
const token = generateAttributionToken();
const { data: attrLink } = await supabase
  .from("attribution_links")
  .insert({
    token,
    organization_id: orgId,
    destination_url: whatsappUrl,
    // campaign_id will be updated after campaign is inserted below
  })
  .select("id, token")
  .single();

finalUrl = attrLink ? buildAttributionUrl(attrLink.token) : whatsappUrl; // Fallback to raw link if insert fails

// Store token for later linking to campaign
const attributionLinkId = attrLink?.id;
```

Then after `insertedCampaign` is created, link back:

```typescript
if (attributionLinkId && dbCampaignId) {
  await supabase
    .from("attribution_links")
    .update({ campaign_id: dbCampaignId })
    .eq("id", attributionLinkId);
}
```

---

### 1.5 RLS Policies

```sql
-- Attribution links: org members can read their own
ALTER TABLE attribution_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_own_links" ON attribution_links
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Link clicks: org members can read their own
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_read_own_clicks" ON link_clicks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Public read for the redirect route (no auth needed for /l/[token])
CREATE POLICY "public_read_attribution_links" ON attribution_links
  FOR SELECT USING (true);
```

---

### Phase 1A Deliverable Check

After this phase, for every WhatsApp campaign launched via Tenzu:

- Ad destination is `tenzu.africa/l/[token]` not raw WhatsApp
- Every click is recorded in `link_clicks`
- `campaigns.whatsapp_clicks` increments in real-time
- The redirect is imperceptible to end users (<50ms overhead)
- No website or pixel required from the SME

---

---

# PHASE 1B — The ROI Dashboard

## "Show me if my money is working"

**Target: Months 2–4**

Attribution data is worthless unless it's visible. This phase makes it legible.

---

### What We're Building

1. **"Mark as Sold" button** — the simplest possible revenue input
2. **Naira ROI Dashboard** — campaign cards showing ₦ spent → conversations → sales → profit
3. **WhatsApp click rate metric** — new signal on existing campaign cards

---

### 2.1 Database Migration — Sales Tracking

**New table: `whatsapp_sales`**

```sql
CREATE TABLE whatsapp_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  amount_ngn      INTEGER NOT NULL,  -- sale amount in Naira (no kobo, keep it simple)
  note            TEXT,              -- optional: "Customer from Lagos"
  recorded_by     UUID REFERENCES users(id),
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_sales_campaign ON whatsapp_sales(campaign_id);
CREATE INDEX idx_whatsapp_sales_org ON whatsapp_sales(organization_id);
```

**Migration for `campaigns` — add revenue summary columns:**

```sql
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS sales_count   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_ngn   INTEGER DEFAULT 0;
```

**File:** `supabase/migrations/[timestamp]_sales_tracking.sql`

---

### 2.2 "Mark as Sold" Server Action

**New file:** `src/actions/sales.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function recordSale({
  campaignId,
  amountNgn,
  note,
}: {
  campaignId: string;
  amountNgn: number;
  note?: string;
}) {
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

  // Insert sale record
  const { error } = await supabase.from("whatsapp_sales").insert({
    campaign_id: campaignId,
    organization_id: member.organization_id,
    amount_ngn: amountNgn,
    note: note || null,
    recorded_by: user.id,
  });

  if (error) throw new Error(error.message);

  // Update campaign summary totals
  await supabase.rpc("update_campaign_sales_summary", {
    p_campaign_id: campaignId,
    p_amount_ngn: amountNgn,
  });

  revalidatePath("/campaigns");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function getSalesByCampaign(campaignId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("whatsapp_sales")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("recorded_at", { ascending: false });

  return data || [];
}
```

**New Supabase function:**

```sql
CREATE OR REPLACE FUNCTION update_campaign_sales_summary(
  p_campaign_id UUID,
  p_amount_ngn  INTEGER
) RETURNS VOID AS $$
  UPDATE campaigns
  SET
    sales_count = COALESCE(sales_count, 0) + 1,
    revenue_ngn = COALESCE(revenue_ngn, 0) + p_amount_ngn
  WHERE id = p_campaign_id;
$$ LANGUAGE SQL;
```

---

### 2.3 ROI Metrics Hook

**New file:** `src/hooks/use-campaign-roi.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CampaignROI {
  campaignId: string;
  spendNgn: number; // from campaigns.spend_cents / 100 * fx_rate
  spendCents: number;
  whatsappClicks: number; // from campaigns.whatsapp_clicks
  salesCount: number; // from campaigns.sales_count
  revenueNgn: number; // from campaigns.revenue_ngn
  costPerClickNgn: number; // spendNgn / whatsappClicks
  costPerSaleNgn: number; // spendNgn / salesCount
  roiPercent: number; // (revenueNgn - spendNgn) / spendNgn * 100
}

export function useCampaignROI(campaignId: string) {
  return useQuery({
    queryKey: ["campaign-roi", campaignId],
    queryFn: async (): Promise<CampaignROI | null> => {
      const supabase = createClient();

      const { data: campaign } = await supabase
        .from("campaigns")
        .select(
          `
          id,
          spend_cents,
          whatsapp_clicks,
          sales_count,
          revenue_ngn,
          daily_budget_cents
        `,
        )
        .eq("id", campaignId)
        .single();

      if (!campaign) return null;

      // Use stored USD spend + approximate NGN conversion
      // In Phase 2A, this gets replaced with actual Naira billing
      const FX_RATE = 1600; // TODO: make this dynamic via an env or config table
      const spendNgn = ((campaign.spend_cents || 0) / 100) * FX_RATE;

      const clicks = campaign.whatsapp_clicks || 0;
      const sales = campaign.sales_count || 0;
      const revenue = campaign.revenue_ngn || 0;

      return {
        campaignId,
        spendNgn,
        spendCents: campaign.spend_cents || 0,
        whatsappClicks: clicks,
        salesCount: sales,
        revenueNgn: revenue,
        costPerClickNgn: clicks > 0 ? Math.round(spendNgn / clicks) : 0,
        costPerSaleNgn: sales > 0 ? Math.round(spendNgn / sales) : 0,
        roiPercent:
          spendNgn > 0
            ? Math.round(((revenue - spendNgn) / spendNgn) * 100)
            : 0,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
```

---

### 2.4 Mark as Sold UI Component

**New file:** `src/components/campaigns/mark-as-sold-button.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordSale } from "@/actions/sales";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

interface Props {
  campaignId: string;
  campaignName: string;
}

export function MarkAsSoldButton({ campaignId, campaignName }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const amountNum = parseInt(amount.replace(/,/g, ""));
    if (!amountNum || amountNum <= 0) {
      toast.error("Enter a valid sale amount");
      return;
    }

    setLoading(true);
    try {
      await recordSale({ campaignId, amountNgn: amountNum, note });
      toast.success(`Sale of ₦${amountNum.toLocaleString()} recorded!`);
      setOpen(false);
      setAmount("");
      setNote("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record sale");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
      >
        <CheckCircle className="h-4 w-4" />
        Record Sale
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record a WhatsApp Sale</DialogTitle>
            <p className="text-sm text-muted-foreground">
              From: <strong>{campaignName}</strong>
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Sale Amount (₦)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  ₦
                </span>
                <Input
                  id="amount"
                  className="pl-7"
                  placeholder="15,000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="text"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                className="mt-1"
                placeholder="e.g. Customer from Abuja"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? "Saving..." : "Record Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

### 2.5 ROI Card Component

**New file:** `src/components/campaigns/roi-metrics-card.tsx`

```typescript
"use client";

import { useCampaignROI } from "@/hooks/use-campaign-roi";
import { MessageCircle, ShoppingBag, TrendingUp, Banknote } from "lucide-react";

interface Props {
  campaignId: string;
}

export function ROIMetricsCard({ campaignId }: Props) {
  const { data: roi, isLoading } = useCampaignROI(campaignId);

  if (isLoading || !roi) return <ROIMetricsSkeleton />;

  const metrics = [
    {
      label: "WhatsApp Chats",
      value: roi.whatsappClicks.toLocaleString(),
      sub: roi.whatsappClicks > 0
        ? `₦${roi.costPerClickNgn.toLocaleString()} / chat`
        : "No clicks yet",
      icon: MessageCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Sales Recorded",
      value: roi.salesCount.toLocaleString(),
      sub: roi.salesCount > 0
        ? `₦${roi.costPerSaleNgn.toLocaleString()} / sale`
        : "Tap 'Record Sale' after closing",
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Revenue (₦)",
      value: `₦${roi.revenueNgn.toLocaleString()}`,
      sub: `Spent: ₦${Math.round(roi.spendNgn).toLocaleString()}`,
      icon: Banknote,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Return on Ad Spend",
      value: roi.roiPercent > 0 ? `+${roi.roiPercent}%` : roi.roiPercent === 0 ? "—" : `${roi.roiPercent}%`,
      sub: "Revenue vs. ad spend",
      icon: TrendingUp,
      color: roi.roiPercent > 0 ? "text-green-600" : "text-muted-foreground",
      bg: roi.roiPercent > 0 ? "bg-green-50" : "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border p-4">
          <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${m.bg}`}>
            <m.icon className={`h-4 w-4 ${m.color}`} />
          </div>
          <p className="text-xs text-muted-foreground">{m.label}</p>
          <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
        </div>
      ))}
    </div>
  );
}

function ROIMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border p-4 animate-pulse">
          <div className="h-8 w-8 rounded-lg bg-muted mb-2" />
          <div className="h-3 w-16 bg-muted rounded mb-1" />
          <div className="h-5 w-12 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
```

---

### 2.6 Wire Into Campaign Detail View

**Modified file:** `src/components/campaigns/campaign-detail-view.tsx`

Add these imports and components to the campaign detail view:

```typescript
import { ROIMetricsCard } from "./roi-metrics-card";
import { MarkAsSoldButton } from "./mark-as-sold-button";

// In the campaign detail JSX, add above the existing metrics:
<section className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold">WhatsApp Performance</h3>
    <MarkAsSoldButton
      campaignId={campaign.id}
      campaignName={campaign.name}
    />
  </div>
  <ROIMetricsCard campaignId={campaign.id} />
</section>
```

---

### Phase 1B Deliverable Check

After this phase:

- Every campaign detail page shows: WhatsApp chats started, sales count, revenue in ₦, cost per sale
- One-tap sale recording takes 10 seconds
- The dashboard shows aggregated Naira ROI across all campaigns
- SME can now answer: _"This ad brought me 14 conversations, 6 sales, ₦84,000 revenue. My ₦8,000 spend earned me 10.5x."_

---
