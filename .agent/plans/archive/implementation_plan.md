# Tenzu (formerly Tenzu) — Full Implementation Plan

## "Close the Loop: From Naira Spend to Sales"

---

## Executive Context

After deep research into the Nigerian SME market and a full read of the codebase, here is the strategic picture:

**What's already built (strong foundation):**

- Chat-first campaign wizard (solves the Ads Manager complexity wall)
- AI creative generation with Flux + context injection via `compileContextPrompt` in `src/lib/ai/context-compiler.ts`
- `CampaignContext` type and `hasValidContext` helper already defined
- `saveCampaignContext` in `src/lib/ai/service.ts` saves per-campaign AI context to DB
- WhatsApp as a campaign objective with `OUTCOME_APP_MESSAGING`
- Paystack billing in Naira for subscriptions
- Meta API integration with `Tenzu Guard` error handling
- Credits system, notifications (including WhatsApp alerts), targeting profiles
- `notification_settings` already has `whatsapp_number` field
- Onboarding captures `orgName` and `industry` — seeds for org-level AI context
- `targeting_profiles` stores `business_description` and `product_category` per profile

**The two critical gaps:**

**Gap 1 — Attribution blackhole:**
The current flow is `Chat → Creative → Launch → [blackhole]`. Raw `wa.me` links and raw website URLs go directly to Meta. When someone clicks, Tenzu sees nothing. The SME cannot answer: _"Is my ₦10,000 working?"_

**Gap 2 — AI context is campaign-scoped, not org-scoped:**
`CampaignContext` exists but is built fresh per campaign from user input. There is no persistent org-level profile that enriches every AI call from session one. Every new campaign starts blind — the AI doesn't know the business until the user types something in chat.

The entire 12-month roadmap closes both gaps.

---

## Phase Overview

| Phase  | Timeline           | Theme                   | Core Deliverable                                                                 |
| ------ | ------------------ | ----------------------- | -------------------------------------------------------------------------------- |
| **1A** | Now → Month 2      | Close the gap           | Tenzu Attribution Link — wraps WhatsApp AND website destinations                |
| **1B** | Month 2 → Month 4  | Make it legible         | Naira ROI Dashboard + "Mark as Sold"                                             |
| **1C** | Month 2 → Month 4  | AI that knows you       | Org-level context — extends existing `CampaignContext` and `context-compiler.ts` |
| **2A** | Month 4 → Month 7  | Remove payment friction | Naira ad budget top-up (Grey/Geegpay card abstraction)                           |
| **2B** | Month 7 → Month 9  | Creative intelligence   | UGC video pipeline + category playbooks                                          |
| **3**  | Month 9 → Month 12 | Compound moat           | AI optimization from attribution data                                            |

---

---

# PHASE 1A — The Attribution Layer

## "Every ad gets a traceable door"

**Target: Months 1–2**

This is the highest-leverage work in the entire roadmap. Nothing else compounds without it.

---

### The Nigerian SME Landscape — Not Just WhatsApp

The research shows Nigerian SMEs aren't a monolith. Attribution must serve all of them:

| Segment             | Est. Size | Current Ad Destination | Problem                                    |
| ------------------- | --------- | ---------------------- | ------------------------------------------ |
| WhatsApp-only       | ~56%      | Raw `wa.me` link       | Zero tracking after click                  |
| Website, no pixel   | ~30%      | Their URL              | Zero tracking, built the site, still blind |
| Website with pixel  | ~5–10%    | Tracking already works | Served well by Meta natively               |
| Linktree / bio link | Scattered | Partial tracking       | Inconsistent                               |

**The Tenzu Attribution Link solves segments 1 and 2 identically.** The destination doesn't matter — WhatsApp URL or website URL, the wrapper is the same. Segment 3 already has tracking; the optional pixel snippet gives them a Tenzu-native layer on top.

---

### Phase 1.5: Pixel Prompt in Campaign Creation

Add the "Connect Pixel" UI to the campaign creation flow for users running Website ads.

#### [MODIFY] [budget-launch-step.tsx](file:///home/chisom/projects/tenzu/src/components/campaigns/new/steps/budget-launch-step.tsx)

- Add a "Website Tracking" section right above the Launch button for users whose `objective` is `traffic` or `sales`.
- If the organization does _not_ have a pixel installed (we will mock this state for now or check settings), show:
  > **To track how much Naira this ad makes, you need the Tenzu Pixel.**
  > [Shopify] [WordPress] [Bumpa] [Copy Code]
- Include a "Skip for now" button.
- If skipped, show a warning in the "Campaign Check" checklist: ⚠️ _Sales tracking disabled. Connect Pixel to see ROI._
- Do _not_ block the user from launching.

## Verification Plan

### Automated Tests

- Run `npm run build` to ensure type-safety.

### Manual Verification

- Go to `/campaigns/new` and select "Make Sales (Website)".
- Proceed to the launch step and verify the "Connect Pixel" prompt appears.
- Click "Skip for now" and ensure the warning icon replaces the Tracking status in the checklist.
- Verify that users can still launch the campaign.

---

### What We're Building

Every ad destination, regardless of type, gets wrapped in a **Tenzu-hosted micro-redirect** (`tenzu.africa/l/[token]`) that:

1. Records the visit (which campaign, which ad, timestamp, device, destination type)
2. Immediately redirects to the real destination — WhatsApp, website, or any URL
3. Is invisible to the end user — zero friction added
4. For website owners: optionally accepts a pixel event callback for conversion tracking

This gives us a "pixel" without requiring the SME to own a website. And for SMEs who _do_ have a website, it gives them tracking without requiring them to install the Meta pixel.

---

### 1.1 Database Migration

**New table: `attribution_links`**

```sql
CREATE TABLE attribution_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token            TEXT UNIQUE NOT NULL,  -- short token, e.g. "xK9mZ2"
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_id            UUID REFERENCES ads(id) ON DELETE SET NULL,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  destination_url  TEXT NOT NULL,          -- the real wa.me/... OR https://... link
  destination_type TEXT NOT NULL DEFAULT 'whatsapp',
  -- 'whatsapp' | 'website' | 'linktree' | 'other'
  pixel_token      TEXT UNIQUE,            -- separate token for optional pixel snippet
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ             -- optional TTL
);

CREATE INDEX idx_attribution_links_token ON attribution_links(token);
CREATE INDEX idx_attribution_links_campaign ON attribution_links(campaign_id);
```

**New table: `link_clicks`**

```sql
CREATE TABLE link_clicks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id          UUID REFERENCES attribution_links(id) ON DELETE CASCADE,
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  clicked_at       TIMESTAMPTZ DEFAULT NOW(),
  device_type      TEXT,            -- 'mobile' | 'desktop' | 'tablet'
  country          TEXT,            -- from CF-IPCountry header
  referrer         TEXT,            -- utm source if present
  destination_type TEXT,            -- mirrors attribution_links.destination_type
  event_type       TEXT DEFAULT 'click',
  -- 'click' = initial redirect (all types)
  -- 'view'  = pixel fired on website page load
  -- 'lead'  = pixel fired on form submit / WhatsApp open
  -- 'purchase' = pixel fired on order confirmation
  event_value_ngn  INTEGER          -- populated for 'purchase' events
);

CREATE INDEX idx_link_clicks_campaign ON link_clicks(campaign_id);
CREATE INDEX idx_link_clicks_clicked_at ON link_clicks(clicked_at);
```

**Migration for `campaigns` table — add conversation tracking columns:**

```sql
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS whatsapp_clicks     INTEGER DEFAULT 0,
  -- WhatsApp-specific: incremented when destination_type = 'whatsapp'
  ADD COLUMN IF NOT EXISTS website_clicks      INTEGER DEFAULT 0,
  -- Website-specific: incremented when destination_type = 'website'
  ADD COLUMN IF NOT EXISTS total_link_clicks   INTEGER DEFAULT 0,
  -- All destination types combined (primary metric shown in dashboard)
  ADD COLUMN IF NOT EXISTS whatsapp_click_rate NUMERIC(5,2),
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
    .select(
      "id, campaign_id, organization_id, destination_url, destination_type",
    )
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
      destination_type: link.destination_type,
      country,
      referrer: request.headers.get("referer") || null,
      event_type: "click",
    })
    .then(() => {
      // Increment the correct counter based on destination type
      supabase.rpc("increment_campaign_clicks", {
        p_campaign_id: link.campaign_id,
        p_destination_type: link.destination_type,
      });
    });

  // 3. Redirect immediately — user doesn't wait for analytics
  return NextResponse.redirect(link.destination_url, { status: 302 });
}
```

**New Supabase function:** `increment_campaign_clicks`

```sql
CREATE OR REPLACE FUNCTION increment_campaign_clicks(
  p_campaign_id    UUID,
  p_destination_type TEXT DEFAULT 'whatsapp'
) RETURNS VOID AS $$
  UPDATE campaigns
  SET
    total_link_clicks = COALESCE(total_link_clicks, 0) + 1,
    whatsapp_clicks   = CASE WHEN p_destination_type = 'whatsapp'
                          THEN COALESCE(whatsapp_clicks, 0) + 1
                          ELSE COALESCE(whatsapp_clicks, 0) END,
    website_clicks    = CASE WHEN p_destination_type = 'website'
                          THEN COALESCE(website_clicks, 0) + 1
                          ELSE COALESCE(website_clicks, 0) END,
    last_click_at     = NOW()
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

### 1.3b Optional Pixel Snippet (Website Owners)

For SMEs with websites who want conversion tracking beyond the click, Tenzu provides a 4-line pixel snippet they paste once into their site `<head>`. **Not required — never a gate.**

**New file:** `src/app/api/pixel/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 1x1 transparent GIF
const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t"); // pixel_token from attribution_links
  const event = searchParams.get("e") || "view"; // 'view' | 'lead' | 'purchase'
  const value = parseInt(searchParams.get("v") || "0"); // NGN value for purchase

  if (token) {
    const supabase = await createClient();

    // Look up attribution link by pixel_token (not the redirect token)
    const { data: link } = await supabase
      .from("attribution_links")
      .select("id, campaign_id, organization_id")
      .eq("pixel_token", token)
      .single();

    if (link) {
      // Fire-and-forget: record the conversion event
      supabase
        .from("link_clicks")
        .insert({
          link_id: link.id,
          campaign_id: link.campaign_id,
          organization_id: link.organization_id,
          destination_type: "website",
          event_type: event,
          event_value_ngn: event === "purchase" ? value : null,
        })
        .then(() => {
          if (event === "purchase" && value > 0) {
            // Auto-credit revenue on purchase pixel event
            supabase.rpc("update_campaign_sales_summary", {
              p_campaign_id: link.campaign_id,
              p_amount_ngn: value,
            });
          }
        });
    }
  }

  // Always return pixel immediately — never block
  return new NextResponse(PIXEL_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
```

**The snippet website owners paste once:**

```html
<!-- Tenzu Pixel — paste once in <head> -->
<script>
  (function (t) {
    new Image().src = "https://tenzu.africa/api/pixel?t=" + t + "&e=view";
    // Fire purchase event: document.dispatchEvent(new CustomEvent("tenzu_purchase", {detail:{value:15000}}))
    document.addEventListener("tenzu_purchase", function (e) {
      new Image().src =
        "https://tenzu.africa/api/pixel?t=" +
        t +
        "&e=purchase&v=" +
        (e.detail?.value || 0);
    });
  })("THEIR_PIXEL_TOKEN");
</script>
```

Where to show this snippet in the UI: campaign detail view, after launch, for campaigns with `destination_type = 'website'`. One copy button. No documentation needed.

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

---

---

---

# PHASE 1C — Org-Level AI Context

## "The AI that already knows your business"

**Target: Months 2–4 (parallel with Phase 1B)**

---

### What's Already There (Don't Duplicate)

Reading the existing codebase before speccing this out:

| Existing                                  | Location                                      | Status                                                                              |
| ----------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CampaignContext` interface               | `src/lib/ai/context-compiler.ts`              | ✅ Exists — has `businessDescription`, `targeting`, `copy`, `platform`, `objective` |
| `compileContextPrompt()`                  | `src/lib/ai/context-compiler.ts`              | ✅ Exists — enriches Flux prompts with campaign context                             |
| `hasValidContext()`                       | `src/lib/ai/context-compiler.ts`              | ✅ Exists — validates context before use                                            |
| `saveCampaignContext()`                   | `src/lib/ai/service.ts`                       | ✅ Exists — saves per-campaign context to `campaigns.ai_context`                    |
| `targeting_profiles.business_description` | DB                                            | ✅ Exists — per-targeting-profile                                                   |
| `campaigns.ai_context`                    | DB                                            | ✅ Exists — per-campaign JSON                                                       |
| Onboarding `orgName` + `industry`         | `src/app/(authenticated)/onboarding/page.tsx` | ✅ Captured — NOT saved to org profile yet                                          |

**The gap:** All of this is campaign-scoped or profile-scoped. There is no persistent org-level description that the AI loads automatically on session start. Every new campaign begins with zero context unless the user re-types their business info.

---

### The Context Hierarchy

```
Layer 1 — Org Profile (MISSING — build this)
  organizations.business_description, business_category,
  business_location, target_audience, whatsapp_number
  → Loaded once, cached 30 mins, enriches EVERY AI call

Layer 2 — Targeting Profile (EXISTS in targeting_profiles table)
  business_description, product_category, validated_interests
  → Per-audience-type, already saved by generateAndSaveStrategy()

Layer 3 — Campaign Context (EXISTS in campaigns.ai_context)
  CampaignContext: targeting, copy, platform, objective
  → Saved per campaign by saveCampaignContext()

Layer 4 — User Message (EXISTS — user types in chat)
  → Real-time, overrides layers above where explicit
```

The fix is building Layer 1 and threading it into the existing compile chain.

---

### 1C.1 Database Migration

**Extend `organizations` table — do NOT create a new table:**

```sql
-- Extend existing organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS business_description TEXT,
  ADD COLUMN IF NOT EXISTS business_category    TEXT,
  -- Maps to INDUSTRIES list already in onboarding:
  -- 'fashion_beauty' | 'electronics' | 'services' | 'real_estate'
  -- | 'food_beverage' | 'tech_saas' | 'other'
  ADD COLUMN IF NOT EXISTS business_location    TEXT,
  -- e.g. "Lagos, Nigeria" — drives cultural context in compileContextPrompt()
  ADD COLUMN IF NOT EXISTS target_audience      TEXT,
  -- e.g. "women 18-35 in Lagos" — plain text, AI parses it
  ADD COLUMN IF NOT EXISTS whatsapp_number      TEXT;
  -- Their primary selling WhatsApp number
```

**File:** `supabase/migrations/[timestamp]_org_ai_context.sql`

No RLS changes needed — `organizations` already has RLS. The new columns inherit it.

---

### 1C.2 Save Org Context During Onboarding

The onboarding page already captures `orgName` and `industry` and passes them to `createOrganization()` in `src/actions/onboarding.ts`. We add two more fields to the existing onboarding Step 1 — no new step needed.

**Modified file:** `src/app/(authenticated)/onboarding/page.tsx`

Add to Step 1 (Business Name + Industry step), after the Industry dropdown:

```typescript
// Add to form state
const [businessDescription, setBusinessDescription] = useState("");
const [targetAudience, setTargetAudience] = useState("");

// Add to Step 1 JSX after the Industry Select:
<div className="space-y-2">
  <Label htmlFor="businessDescription" className="text-base">
    What do you sell? <span className="text-muted-foreground text-sm">(optional)</span>
  </Label>
  <Textarea
    id="businessDescription"
    placeholder="e.g. Women's fashion and accessories, Lagos-based, fast delivery"
    value={businessDescription}
    onChange={(e) => setBusinessDescription(e.target.value)}
    className="bg-muted border-border resize-none"
    rows={2}
  />
  <p className="text-xs text-muted-foreground">
    This helps our AI write better ads for your business from day one.
  </p>
</div>

<div className="space-y-2">
  <Label htmlFor="targetAudience" className="text-base">
    Who are your customers? <span className="text-muted-foreground text-sm">(optional)</span>
  </Label>
  <Input
    id="targetAudience"
    placeholder="e.g. Women 18-35 in Lagos and Abuja"
    value={targetAudience}
    onChange={(e) => setTargetAudience(e.target.value)}
    className="bg-muted border-border"
  />
</div>
```

**Modified file:** `src/actions/onboarding.ts`

Add `business_description`, `business_category`, and `target_audience` to the `organizations` insert:

```typescript
// In createOrganization() — extend the existing insert
const { data: org } = await supabase
  .from("organizations")
  .insert({
    name: orgName,
    slug: generateSlug(orgName),
    business_description:
      (formData.get("businessDescription") as string) || null,
    business_category: mapIndustryToCategory(industry), // new helper below
    target_audience: (formData.get("targetAudience") as string) || null,
    // ... existing fields
  })
  .select("id")
  .single();

// Helper: map onboarding industry strings to category keys
function mapIndustryToCategory(industry: string): string {
  const map: Record<string, string> = {
    "E-commerce (Fashion/Beauty)": "fashion_beauty",
    "E-commerce (Electronics)": "electronics",
    "Service Business": "services",
    "Real Estate": "real_estate",
    "Food & Beverage": "food_beverage",
    "Tech / SaaS": "tech_saas",
    Other: "other",
  };
  return map[industry] || "other";
}
```

---

### 1C.3 Org Context Hook

**New file:** `src/hooks/use-org-context.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface OrgContext {
  name: string;
  businessDescription: string | null;
  businessCategory: string | null;
  businessLocation: string | null;
  targetAudience: string | null;
  whatsappNumber: string | null;
}

export function useOrgContext() {
  return useQuery({
    queryKey: ["org-context"],
    queryFn: async (): Promise<OrgContext | null> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("organizations")
        .select(
          `
          name,
          business_description,
          business_category,
          business_location,
          target_audience,
          whatsapp_number
        `,
        )
        .single();

      if (!data) return null;

      return {
        name: data.name,
        businessDescription: data.business_description,
        businessCategory: data.business_category,
        businessLocation: data.business_location,
        targetAudience: data.target_audience,
        whatsappNumber: data.whatsapp_number,
      };
    },
    staleTime: 1000 * 60 * 30, // 30 minutes — org profile rarely changes
  });
}
```

---

### 1C.4 Extend CampaignContext — Modify Existing File

**Modified file:** `src/lib/ai/context-compiler.ts`

Extend the existing `CampaignContext` interface to include org-level data. Do NOT replace it — add to it:

```typescript
// ADD this new interface above CampaignContext
export interface OrgProfile {
  name: string;
  businessDescription?: string;
  businessCategory?: string;
  businessLocation?: string; // e.g. "Lagos, Nigeria"
  targetAudience?: string; // plain text, AI parses it
}

// MODIFY existing CampaignContext — add org as optional Layer 1
export interface CampaignContext {
  org?: OrgProfile; // ← ADD THIS — Layer 1 context
  businessDescription: string; // ← KEEP — Layer 3, campaign-specific override
  targeting: {
    interests: string[];
    behaviors: string[];
    locations: string[];
    demographics: {
      age_min: number;
      age_max: number;
      gender: "all" | "male" | "female";
    };
  };
  copy?: {
    headline: string;
    subHeadline?: string;
    bodyCopy: string;
  };
  platform?: "meta" | "tiktok" | "google";
  objective?: "awareness" | "sales" | "leads";
}
```

**Modify `compileContextPrompt()` in the same file** — inject org context as Layer 1 before the existing business description logic:

```typescript
export function compileContextPrompt(
  userPrompt: string,
  context: CampaignContext,
  format: CreativeFormat = "auto",
  aspectRatio: string = "1:1"
): string {
  let prompt = userPrompt.trim();

  // LAYER 1: Org profile (new — always injected first if available)
  if (context.org?.businessDescription) {
    prompt += ` for ${context.org.businessDescription}`;
  } else if (context.businessDescription) {
    // LAYER 3 fallback: campaign-specific description (existing behaviour)
    prompt += ` for ${context.businessDescription}`;
  }

  // Org location enriches location section (merges with campaign targeting.locations)
  const orgLocation = context.org?.businessLocation;

  // Audience hint from org profile
  if (context.org?.targetAudience) {
    prompt += `. Primary audience: ${context.org.targetAudience}`;
  }

  // ... rest of existing function unchanged from SECTION 3 onwards
```

---

### 1C.5 Settings Page — Edit Org Profile

SMEs who skipped the optional fields at onboarding need a place to fill them in later.

**Modified file:** `src/app/(authenticated)/settings/business/page.tsx`

Add to the existing business settings form:

```typescript
// New fields to add alongside existing org name/slug fields:

<div className="space-y-2">
  <Label>What do you sell?</Label>
  <Textarea
    placeholder="e.g. Women's fashion and accessories, Lagos-based, fast delivery"
    value={businessDescription}
    onChange={(e) => setBusinessDescription(e.target.value)}
    rows={2}
    className="bg-muted border-border resize-none"
  />
  <p className="text-xs text-muted-foreground">
    Helps Tenzu's AI write better ads without you re-explaining every time.
  </p>
</div>

<div className="space-y-2">
  <Label>Who are your customers?</Label>
  <Input
    placeholder="e.g. Women 18-35 in Lagos and Abuja"
    value={targetAudience}
    onChange={(e) => setTargetAudience(e.target.value)}
  />
</div>

<div className="space-y-2">
  <Label>Your WhatsApp selling number</Label>
  <Input
    placeholder="e.g. 08012345678"
    value={whatsappNumber}
    onChange={(e) => setWhatsappNumber(e.target.value)}
  />
  <p className="text-xs text-muted-foreground">
    Used as default destination for WhatsApp campaigns.
  </p>
</div>
```

**New server action:** `src/actions/onboarding.ts` — add `updateOrgProfile`:

```typescript
export async function updateOrgProfile(formData: FormData) {
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

  const { error } = await supabase
    .from("organizations")
    .update({
      business_description:
        (formData.get("businessDescription") as string) || null,
      business_category: (formData.get("businessCategory") as string) || null,
      business_location: (formData.get("businessLocation") as string) || null,
      target_audience: (formData.get("targetAudience") as string) || null,
      whatsapp_number: (formData.get("whatsappNumber") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.organization_id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/business");
}
```

---

### 1C.6 Wire Org Context Into Campaign Wizard

**Modified file:** `src/components/campaigns/new/steps/goal-platform-step.tsx`

At the start of the campaign wizard, load and pass org context down so the AI chat has it from the first message:

```typescript
import { useOrgContext } from "@/hooks/use-org-context";

// In the component:
const { data: orgContext } = useOrgContext();

// When initialising the AI strategy call, merge org context into the input:
const aiInput = {
  businessDescription:
    orgContext?.businessDescription || campaignStore.businessDescription || "",
  location: orgContext?.businessLocation || "Nigeria",
  targetAudience: orgContext?.targetAudience || undefined,
};
```

The AI chat then opens with context pre-loaded. Instead of: _"Tell me about your business"_, it opens with: _"I see you sell women's fashion in Lagos — shall we target working women 25–35 for this campaign?"_

---

### Phase 1C Deliverable Check

After this phase:

- `organizations` table has org profile columns populated from onboarding
- `CampaignContext` includes `org?: OrgProfile` as Layer 1
- `compileContextPrompt()` injects org description before campaign-specific data
- Campaign wizard pre-loads org context — AI knows the business from message one
- Business settings page lets SMEs update their profile at any time
- `use-org-context` hook caches org data for 30 mins — zero repeated DB calls
- The `used_context` tracking in `ai_requests` table now captures org-level hits

**The measurable impact:** Track `ai_requests.context_source` — the ratio of `org_profile` vs `user_input` context source should grow. More org-context hits = less user re-typing = better AI output quality from day one.

# PHASE 2A — Naira Ad Budget Top-Up

## "Pay in Naira. We handle the rest."

**Target: Months 4–7**

This is the payment friction solution. The goal is for SMEs to never see a dollar amount or need a dollar card.

---

### Architecture: Model 1 (Recommended — Per-User Isolated Cards)

```
SME pays ₦ to Tenzu via Paystack
  → Tenzu calls Grey/Geegpay API to fund a virtual USD card assigned to this organization
  → That virtual card is attached to the SME's own Meta ad account
  → Meta charges the virtual card
  → Each organization has their own card (ban isolation)
```

This is the safest architecture. Tenzu is a payment facilitator, not the advertiser of record.

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
          Pay in Naira. Tenzu handles your Meta ad spend.
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

### 2A.5 Ad Policy Pre-Screen

**New file:** `src/lib/ai/policy-guard.ts`

Run before every campaign launch to catch high-risk Nigerian ad copy patterns.

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HIGH_RISK_PATTERNS = [
  /\b(loan|borrow|lend|credit|interest rate)\b/i,
  /\b(crypto|bitcoin|invest|guaranteed return|double your money)\b/i,
  /\b(cure|treatment|heal|miracle|100% effective)\b/i,
  /\b(make money|earn daily|passive income|work from home)\b/i,
  /\b(before and after|weight loss guarantee|lose \d+ kg)\b/i,
];

export interface PolicyCheckResult {
  passed: boolean;
  riskLevel: "low" | "medium" | "high";
  flags: string[];
  suggestion?: string;
}

export async function checkAdPolicy(copy: {
  headline: string;
  primaryText: string;
}): Promise<PolicyCheckResult> {
  const fullText = `${copy.headline} ${copy.primaryText}`;
  const flags: string[] = [];

  // 1. Fast pattern check (no API call)
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(fullText)) {
      const match = fullText.match(pattern)?.[0];
      if (match) flags.push(match);
    }
  }

  if (flags.length === 0) {
    return { passed: true, riskLevel: "low", flags: [] };
  }

  // 2. If patterns flagged, use AI for nuanced assessment
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `You are a Meta ad policy expert. Assess this Nigerian SME ad copy for policy violations.
        
Headline: "${copy.headline}"
Body: "${copy.primaryText}"

Flagged terms: ${flags.join(", ")}

Reply in JSON: { "riskLevel": "low|medium|high", "willLikelyGetRejected": boolean, "suggestion": "brief rewrite suggestion if needed" }`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      passed: result.riskLevel === "low" || !result.willLikelyGetRejected,
      riskLevel: result.riskLevel || "medium",
      flags,
      suggestion: result.suggestion,
    };
  } catch {
    // If AI check fails, flag as medium and let user proceed with warning
    return {
      passed: true,
      riskLevel: "medium",
      flags,
      suggestion: "Review your copy before launching",
    };
  }
}
```

**Wire into `campaigns.ts` launch action** — add before Step D (Meta API chain):

```typescript
// Policy pre-screen
const policyCheck = await checkAdPolicy({
  headline: config.adCopy.headline,
  primaryText: config.adCopy.primary,
});

if (policyCheck.riskLevel === "high") {
  return {
    success: false,
    error: `Your ad copy may violate Meta's policies. ${policyCheck.suggestion || "Please review and edit before launching."}`,
    policyFlags: policyCheck.flags,
  };
}

// For medium risk, continue but warn (returned in success response)
```

---

### Phase 2A Deliverable Check

After this phase:

- SMEs top up ad budget in Naira via Paystack — no dollar card ever required
- Each organization has an isolated virtual card on their Meta account — ban risk isolated
- High-risk Nigerian ad copy is caught before launch, not after Meta rejects it
- Tenzu's `TenzuGuard` has a new pre-flight layer

---

---

# PHASE 2B — Creative Intelligence

## "Better ads for people who can't make ads"

**Target: Months 7–9**

The AI creative is already built. This phase makes it smarter and adds UGC video.

---

### 3.1 Category Playbooks

As attribution data accumulates, build category-specific creative defaults.

**New file:** `src/lib/ai/category-playbooks.ts`

```typescript
export type BusinessCategory =
  | "fashion"
  | "beauty"
  | "food"
  | "digital_services"
  | "real_estate"
  | "general";

export interface CategoryPlaybook {
  category: BusinessCategory;
  topCreativeFormats: string[]; // "product on white bg", "lifestyle", "before/after"
  copyTone: string; // "casual_nigerian", "aspirational", "urgency"
  highPerformingCTAs: string[];
  avoidPatterns: string[];
  systemPromptAddition: string; // injected into Flux/OpenAI prompts
}

export const CATEGORY_PLAYBOOKS: Record<BusinessCategory, CategoryPlaybook> = {
  fashion: {
    category: "fashion",
    topCreativeFormats: [
      "lifestyle model wearing product",
      "flat lay on clean background",
      "before/after outfit",
    ],
    copyTone: "aspirational",
    highPerformingCTAs: ["Shop Now", "Send Message"],
    avoidPatterns: ["discount percentage in image", "cluttered backgrounds"],
    systemPromptAddition:
      "Nigerian fashion aesthetic, vibrant colors, clean modern background, aspirational but relatable",
  },
  beauty: {
    category: "beauty",
    topCreativeFormats: [
      "close-up product shot",
      "before/after result",
      "user applying product",
    ],
    copyTone: "results_focused",
    highPerformingCTAs: ["Send Message", "Get Quote"],
    avoidPatterns: ["medical claims", "miracle language"],
    systemPromptAddition:
      "Nigerian beauty market, diverse skin tones, bright clean aesthetic, product prominently featured",
  },
  food: {
    category: "food",
    topCreativeFormats: [
      "hero food shot",
      "packaging on clean surface",
      "process/cooking shot",
    ],
    copyTone: "warm_casual",
    highPerformingCTAs: ["Order Now", "Send Message"],
    avoidPatterns: ["overly dark images", "small portions"],
    systemPromptAddition:
      "Nigerian food photography style, warm lighting, appetizing presentation, fresh ingredients visible",
  },
  digital_services: {
    category: "digital_services",
    topCreativeFormats: [
      "result/outcome graphic",
      "testimonial screenshot",
      "before/after result",
    ],
    copyTone: "credibility_focused",
    highPerformingCTAs: ["Learn More", "Send Message"],
    avoidPatterns: ["income claims", "guaranteed results language"],
    systemPromptAddition:
      "Professional clean design, result-oriented, credibility signals, modern Nigerian business aesthetic",
  },
  real_estate: {
    category: "real_estate",
    topCreativeFormats: [
      "property exterior shot",
      "interior lifestyle",
      "aerial view",
    ],
    copyTone: "premium_aspirational",
    highPerformingCTAs: ["Get Quote", "Send Message", "Book Now"],
    avoidPatterns: ["price in creative", "cluttered contact details"],
    systemPromptAddition:
      "Nigerian real estate market, premium property photography, aspirational living, modern architecture",
  },
  general: {
    category: "general",
    topCreativeFormats: [
      "product on clean background",
      "lifestyle usage",
      "offer graphic",
    ],
    copyTone: "casual_nigerian",
    highPerformingCTAs: ["Send Message", "Shop Now"],
    avoidPatterns: ["too much text in image", "dark low-quality photography"],
    systemPromptAddition:
      "Nigerian market, clean modern aesthetic, product clearly visible",
  },
};

export function detectCategory(businessDescription: string): BusinessCategory {
  const desc = businessDescription.toLowerCase();
  if (/fashion|cloth|wear|outfit|dress|shoe/.test(desc)) return "fashion";
  if (/beauty|hair|skin|makeup|cosmetic|salon/.test(desc)) return "beauty";
  if (/food|restaurant|catering|eat|meal|cook/.test(desc)) return "food";
  if (/digital|online|course|training|software|tech/.test(desc))
    return "digital_services";
  if (/property|real estate|land|house|apartment|estate/.test(desc))
    return "real_estate";
  return "general";
}
```

**Wire into `ai-images.ts`** — when `campaignContext` is present:

```typescript
import {
  detectCategory,
  CATEGORY_PLAYBOOKS,
} from "@/lib/ai/category-playbooks";

// In generateAdCreative, when campaign context exists:
if (campaignContext?.businessDescription) {
  const category = detectCategory(campaignContext.businessDescription);
  const playbook = CATEGORY_PLAYBOOKS[category];
  // Append to system prompt
  systemPrompt += `\n\nCategory context: ${playbook.systemPromptAddition}`;
}
```

---

### 3.2 UGC Video Pipeline

**This addresses SMEs who can take phone videos but can't edit them.**

The pipeline:

1. SME uploads a raw phone video (or takes one in-app)
2. Tenzu uses `fal.ai` video models to add: captions, trim, add CTA text overlay, music bed
3. Output is a 15–30 second Reels/Stories-ready ad video

**New file:** `src/actions/ai-video.ts`

```typescript
"use server";

import { fal } from "@fal-ai/client";
import { createClient } from "@/lib/supabase/server";
import { requireCredits, spendCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";

interface VideoProcessOptions {
  rawVideoUrl: string; // SME's uploaded video
  headline: string; // Overlay text
  ctaText: string; // CTA button text
  aspectRatio: "9:16" | "1:1"; // Stories vs Feed
  campaignId?: string;
}

export async function processUGCVideo({
  rawVideoUrl,
  headline,
  ctaText,
  aspectRatio,
  campaignId,
}: VideoProcessOptions) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Credit check — video costs more than image
  await requireCredits(user.id, CREDIT_COSTS.VIDEO_PROCESS || 20);

  // Call fal.ai video captioning/editing model
  // Using fal-ai/video-to-video or similar
  const result = await fal.subscribe("fal-ai/recraft-v3-video", {
    input: {
      video_url: rawVideoUrl,
      // Processing options depend on the model
      // This will be updated when fal.ai video API is confirmed
    },
  });

  // Spend credits after successful generation
  await spendCredits(
    user.id,
    CREDIT_COSTS.VIDEO_PROCESS || 20,
    "video_process",
  );

  return {
    success: true,
    videoUrl: (result as any).video?.url,
  };
}
```

> **Note:** Pin down the exact fal.ai video model and capabilities before implementing. The `fal-ai.md` and `fal-ai-edit.md` files in the repo should guide this. Video API is evolving rapidly — implement after confirming the right model for captioning + text overlay.

---

---

# PHASE 3 — The Intelligence Compounding Layer

## "The more you use it, the smarter it gets"

**Target: Months 9–12**

This is where Tenzu builds its moat. By this point, you have real attribution data across hundreds of Nigerian SME campaigns. Phase 3 is about turning that data into recommendations.

---

### 4.1 Performance Intelligence View

**New Supabase view:** `campaign_intelligence`

```sql
CREATE VIEW campaign_intelligence AS
SELECT
  c.id,
  c.organization_id,
  c.name,
  c.objective,
  c.daily_budget_cents,
  c.spend_cents,
  c.impressions,
  c.clicks,
  c.whatsapp_clicks,
  c.sales_count,
  c.revenue_ngn,
  -- Derived metrics
  CASE WHEN c.impressions > 0
    THEN ROUND((c.whatsapp_clicks::numeric / c.impressions) * 100, 2)
    ELSE 0 END AS whatsapp_click_rate,
  CASE WHEN c.whatsapp_clicks > 0
    THEN ROUND(c.sales_count::numeric / c.whatsapp_clicks * 100, 1)
    ELSE 0 END AS conversation_to_sale_rate,
  CASE WHEN c.sales_count > 0
    THEN ROUND((c.spend_cents::numeric / 100) * 1600 / c.sales_count)
    ELSE NULL END AS cost_per_sale_ngn,
  -- Targeting snapshot for pattern analysis
  c.targeting_snapshot,
  c.ai_context,
  c.created_at
FROM campaigns c
WHERE c.whatsapp_clicks IS NOT NULL;
```

---

### 4.2 AI Campaign Optimizer

**New file:** `src/lib/ai/campaign-optimizer.ts`

When a user starts a new campaign in the wizard, this service queries historical performance for their category and pre-populates smart defaults.

```typescript
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { detectCategory } from "./category-playbooks";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getOptimizationRecommendations({
  businessDescription,
  budgetNgn,
  organizationId,
}: {
  businessDescription: string;
  budgetNgn: number;
  organizationId: string;
}) {
  const supabase = await createClient();
  const category = detectCategory(businessDescription);

  // Pull aggregate performance data for this category across all orgs
  // (anonymized — no PII, just performance patterns)
  const { data: categoryBenchmarks } = await supabase
    .from("campaign_intelligence")
    .select(
      `
      whatsapp_click_rate,
      conversation_to_sale_rate,
      cost_per_sale_ngn,
      targeting_snapshot,
      daily_budget_cents
    `,
    )
    .filter("ai_context->>'businessDescription'", "ilike", `%${category}%`)
    .gte("whatsapp_clicks", 5) // Only include campaigns with meaningful data
    .order("whatsapp_click_rate", { ascending: false })
    .limit(20);

  if (!categoryBenchmarks || categoryBenchmarks.length === 0) {
    return null; // Not enough data yet
  }

  // Build context for the AI
  const benchmarkSummary = {
    avgClickRate: average(
      categoryBenchmarks.map((b: any) => b.whatsapp_click_rate),
    ),
    avgConversionRate: average(
      categoryBenchmarks.map((b: any) => b.conversation_to_sale_rate),
    ),
    topInterests: extractTopInterests(categoryBenchmarks),
  };

  const recommendation = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Based on performance data from ${categoryBenchmarks.length} similar Nigerian ${category} businesses:
      
Average WhatsApp click rate: ${benchmarkSummary.avgClickRate}%
Average conversation-to-sale rate: ${benchmarkSummary.avgConversionRate}%
Top performing interests: ${benchmarkSummary.topInterests.join(", ")}
User's budget: ₦${budgetNgn}/day

Suggest: 1) Best audience interests to target 2) Optimal daily budget allocation 3) Creative format recommendation.
Reply in JSON: { "interests": [], "budgetAdvice": "", "creativeFormat": "" }`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  return JSON.parse(recommendation.choices[0].message.content || "{}");
}

function average(nums: number[]): number {
  return nums.length
    ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
    : 0;
}

function extractTopInterests(benchmarks: any[]): string[] {
  const interestCounts: Record<string, number> = {};
  benchmarks.forEach((b) => {
    const interests = b.targeting_snapshot?.interests || [];
    interests.forEach((i: any) => {
      interestCounts[i.name] = (interestCounts[i.name] || 0) + 1;
    });
  });
  return Object.entries(interestCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name]) => name);
}
```

---

---

# What NOT To Build (Hard Stops)

These will be requested. The answer is no for 12 months.

| Request                          | Why No                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| TikTok Ads (it's in the UI)      | Remove from Phase 1 UI. Nigeria is Facebook/Instagram. Keeping it visible confuses SMEs and splits roadmap focus. Ship it in Phase 3 or later. |
| Full CRM / pipeline stages       | "Mark as Sold" is enough. A full CRM means competing with WhatsApp's own native features and adding onboarding complexity.                     |
| Web store / Shopify-like builder | SMEs don't want websites. They want more WhatsApp sales. Completely different product and market.                                              |
| Agency white-label dashboard     | Agencies' incentives are opposed to Tenzu's value prop. Their SME clients would own nothing.                                                  |
| Google Ads integration           | Wrong market right now.                                                                                                                        |
| Desktop-first features           | Your users are on phones.                                                                                                                      |

---

# Current Codebase Gaps Summary

## Attribution (Phase 1A)

| Gap                                                                             | Priority | Where to fix                                        |
| ------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| No attribution link creation at launch                                          | 🔴 P0    | `actions/campaigns.ts` line ~85                     |
| `attribution_links` table missing `destination_type`, `pixel_token`             | 🔴 P0    | New migration                                       |
| `link_clicks` table missing `event_type`, `event_value_ngn`, `destination_type` | 🔴 P0    | New migration                                       |
| `campaigns` missing `whatsapp_clicks`, `website_clicks`, `total_link_clicks`    | 🔴 P0    | Migration                                           |
| No `/l/[token]` redirect route                                                  | 🔴 P0    | `src/app/l/[token]/route.ts` (valid outside `/api`) |
| No `/api/pixel` route for website owners                                        | 🟠 P1    | `src/app/api/pixel/route.ts`                        |
| `increment_campaign_clicks` RPC doesn't exist yet                               | 🔴 P0    | New Supabase function                               |

## ROI Dashboard (Phase 1B)

| Gap                                              | Priority | Where to fix                                       |
| ------------------------------------------------ | -------- | -------------------------------------------------- |
| No `whatsapp_sales` table or `recordSale` action | 🔴 P0    | New migration + `src/actions/sales.ts`             |
| `campaigns` missing `sales_count`, `revenue_ngn` | 🔴 P0    | Migration                                          |
| No ROI metrics card component                    | 🟠 P1    | `src/components/campaigns/roi-metrics-card.tsx`    |
| No "Mark as Sold" button component               | 🟠 P1    | `src/components/campaigns/mark-as-sold-button.tsx` |

## AI Context (Phase 1C)

| Gap                                                                                                                            | Priority | Where to fix                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------- |
| `organizations` missing `business_description`, `business_category`, `business_location`, `target_audience`, `whatsapp_number` | 🔴 P0    | Migration — extend existing table                                                  |
| `CampaignContext` has no `org?: OrgProfile` Layer 1                                                                            | 🔴 P0    | Modify `src/lib/ai/context-compiler.ts`                                            |
| `compileContextPrompt()` doesn't inject org-level context                                                                      | 🔴 P0    | Modify existing function — don't replace                                           |
| Onboarding captures `industry` but doesn't save `business_description` to org                                                  | 🟠 P1    | Modify `src/app/(authenticated)/onboarding/page.tsx` + `src/actions/onboarding.ts` |
| No `use-org-context` hook                                                                                                      | 🟠 P1    | `src/hooks/use-org-context.ts`                                                     |
| Business settings page has no org profile fields                                                                               | 🟠 P1    | Modify `src/app/(authenticated)/settings/business/page.tsx`                        |
| No `updateOrgProfile` server action                                                                                            | 🟠 P1    | Add to `src/actions/onboarding.ts`                                                 |

## Other

| Gap                                                                 | Priority | Where to fix                                     |
| ------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| No ad policy pre-screen                                             | 🟠 P1    | `src/lib/ai/policy-guard.ts`                     |
| TikTok visible in objective selector (no backend support)           | 🟡 P2    | Remove from UI — already gated in `campaigns.ts` |
| No category playbooks in creative generation                        | 🟡 P2    | `src/lib/ai/category-playbooks.ts`               |
| Ad budget wallet (Naira top-up)                                     | 🟠 P1    | Phase 2A                                         |
| `notification_settings.whatsapp_number` exists but needs ROI alerts | 🟡 P2    | Extend existing notification system              |

---

# The North Star Metric

Track one number internally that defines whether Tenzu is winning:

> **% of campaigns where the SME has recorded at least one sale**

If this number is growing, the attribution loop is working, SMEs are getting value, and the data flywheel is spinning. If it's not, everything else is vanity metrics.

Target by end of month 6: **>30% of launched campaigns have at least 1 sale recorded.**
Target by end of month 12: **>50%.**

---

_Last updated: February 2026 (v2 — added multi-destination attribution, org-level AI context, Phase 1C)_
_Based on: Nigerian SME market research (Moniepoint 2024, CJID 2025, RSIS 2025), full codebase review of context-compiler.ts, service.ts, onboarding.tsx, campaigns.ts_
