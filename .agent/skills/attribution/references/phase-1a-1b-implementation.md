# Attribution + ROI Dashboard — Full Implementation Reference

## Covers Phase 1A and Phase 1B

Read this entire file before writing any code for attribution or ROI features.

---

# PHASE 1A — The Attribution Layer

## "Every ad gets a traceable door"

**Target: Months 1–2**

---

### The Nigerian SME Landscape — Not Just WhatsApp

| Segment             | Est. Size | Current Ad Destination | Problem                                    |
| ------------------- | --------- | ---------------------- | ------------------------------------------ |
| WhatsApp-only       | ~56%      | Raw `wa.me` link       | Zero tracking after click                  |
| Website, no pixel   | ~30%      | Their URL              | Zero tracking, built the site, still blind |
| Website with pixel  | ~5–10%    | Tracking already works | Served well by Meta natively               |
| Linktree / bio link | Scattered | Partial tracking       | Inconsistent                               |

The Tenzu Attribution Link solves segments 1 and 2 identically. The destination type doesn't matter — the wrapper is the same. Segment 3 gets the optional pixel snippet on top.

---

### 1.1 Database Migration

**File:** `supabase/migrations/[timestamp]_attribution_layer.sql`

```sql
-- New table: attribution_links
CREATE TABLE attribution_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token            TEXT UNIQUE NOT NULL,        -- 8-char nanoid, e.g. "xK9mZ2pR"
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_id            UUID REFERENCES ads(id) ON DELETE SET NULL,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  destination_url  TEXT NOT NULL,               -- real wa.me/... OR https://... link
  destination_type TEXT NOT NULL DEFAULT 'whatsapp',
  -- 'whatsapp' | 'website' | 'linktree' | 'other'
  pixel_token      TEXT UNIQUE,                 -- longer token for pixel snippet (website owners)
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ
);

CREATE INDEX idx_attribution_links_token ON attribution_links(token);
CREATE INDEX idx_attribution_links_pixel_token ON attribution_links(pixel_token);
CREATE INDEX idx_attribution_links_campaign ON attribution_links(campaign_id);

-- New table: link_clicks
CREATE TABLE link_clicks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id          UUID REFERENCES attribution_links(id) ON DELETE CASCADE,
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  clicked_at       TIMESTAMPTZ DEFAULT NOW(),
  device_type      TEXT,            -- 'mobile' | 'desktop' | 'tablet'
  country          TEXT,            -- from CF-IPCountry header (default 'NG')
  referrer         TEXT,
  destination_type TEXT,            -- mirrors attribution_links.destination_type
  event_type       TEXT DEFAULT 'click',
  -- 'click'    = initial redirect hit (all destination types)
  -- 'view'     = pixel fired on website page load
  -- 'lead'     = pixel fired on form submit or WhatsApp open
  -- 'purchase' = pixel fired on order confirmation
  event_value_ngn  INTEGER          -- NGN sale value, populated for 'purchase' events only
);

CREATE INDEX idx_link_clicks_campaign ON link_clicks(campaign_id);
CREATE INDEX idx_link_clicks_clicked_at ON link_clicks(clicked_at);

-- Extend campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS whatsapp_clicks     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_clicks      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_link_clicks   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_click_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS last_click_at       TIMESTAMPTZ;

-- RLS
ALTER TABLE attribution_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_attribution_links" ON attribution_links
  FOR SELECT USING (true);
-- Public read required: /l/[token] route has no auth

CREATE POLICY "org_members_insert_links" ON attribution_links
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_update_own_links" ON attribution_links
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_read_own_clicks" ON link_clicks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Supabase function: increment correct click counter based on destination type
CREATE OR REPLACE FUNCTION increment_campaign_clicks(
  p_campaign_id      UUID,
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

### 1.2 Token Generation Utility

**New file:** `src/lib/attribution.ts`

```typescript
import { nanoid } from "nanoid"; // npm install nanoid

/**
 * Generates a short URL-safe attribution token — e.g. "xK9mZ2pR"
 */
export function generateAttributionToken(length = 8): string {
  return nanoid(length);
}

/**
 * Generates a longer pixel token for website owners
 */
export function generatePixelToken(): string {
  return nanoid(12);
}

/**
 * Builds the full Tenzu redirect URL
 */
export function buildAttributionUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://tenzu.africa";
  return `${base}/l/${token}`;
}
```

---

### 1.3 The Attribution Link Redirect Route

**New file:** `src/app/l/[token]/route.ts`

NOTE: This lives outside `/api/` intentionally. In Next.js App Router, route.ts
is valid anywhere. This produces clean `tenzu.africa/l/token` URLs inside Meta ads.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UAParser } from "ua-parser-js"; // npm install ua-parser-js

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const supabase = await createClient();
  const { token } = params;

  // 1. Look up the link — select destination_type too
  const { data: link } = await supabase
    .from("attribution_links")
    .select("id, campaign_id, organization_id, destination_url, destination_type")
    .eq("token", token)
    .single();

  // Graceful fallback if token not found
  if (!link) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Fire-and-forget analytics — never block the redirect
  const ua = request.headers.get("user-agent") || "";
  const parser = new UAParser(ua);
  const device = parser.getDevice().type || "desktop";
  const country = request.headers.get("cf-ipcountry") || "NG";

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
      supabase.rpc("increment_campaign_clicks", {
        p_campaign_id: link.campaign_id,
        p_destination_type: link.destination_type,
      });
    });

  // 3. Redirect immediately — 302 always, never 301
  return NextResponse.redirect(link.destination_url, { status: 302 });
}
```

---

### 1.4 Optional Pixel Snippet (Website Owners Only)

**New file:** `src/app/api/pixel/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PIXEL_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t"); // pixel_token (NOT redirect token)
  const event = searchParams.get("e") || "view"; // 'view' | 'lead' | 'purchase'
  const value = parseInt(searchParams.get("v") || "0"); // NGN sale value

  if (token) {
    const supabase = await createClient();

    const { data: link } = await supabase
      .from("attribution_links")
      .select("id, campaign_id, organization_id")
      .eq("pixel_token", token) // uses pixel_token, not token
      .single();

    if (link) {
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
            // Auto-credit revenue — same effect as "Mark as Sold"
            supabase.rpc("update_campaign_sales_summary", {
              p_campaign_id: link.campaign_id,
              p_amount_ngn: value,
            });
          }
        });
    }
  }

  // Always return pixel immediately
  return new NextResponse(PIXEL_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
```

**Snippet shown to website owners in campaign detail UI (after launch):**

```html
<!-- Tenzu Pixel — paste once in <head> -->
<script>
  (function (t) {
    new Image().src = "https://tenzu.africa/api/pixel?t=" + t + "&e=view";
    document.addEventListener("tenzu_purchase", function (e) {
      new Image().src =
        "https://tenzu.africa/api/pixel?t=" + t + "&e=purchase&v=" + (e.detail?.value || 0);
    });
  })("THEIR_PIXEL_TOKEN");
</script>
```

Show snippet only when `campaign.destination_type === 'website'`. One copy button. No docs needed.

---

### 1.5 Inject Attribution Link at Campaign Launch

**Modified file:** `src/actions/campaigns.ts`

Find the section around line 85 where `finalUrl` is built. Replace raw URL assignment with attribution link creation:

```typescript
import {
  generateAttributionToken,
  generatePixelToken,
  buildAttributionUrl,
} from "@/lib/attribution";

// ---- Inside launchCampaign(), after building the raw destination URL ----

let attributionLinkId: string | null = null;

if (config.objective === "whatsapp") {
  const whatsappUrl = generateWhatsAppLink(rawPhone, defaultMessage);

  const token = generateAttributionToken();
  const { data: attrLink } = await supabase
    .from("attribution_links")
    .insert({
      token,
      organization_id: orgId,
      destination_url: whatsappUrl,
      destination_type: "whatsapp",
    })
    .select("id, token")
    .single();

  finalUrl = attrLink ? buildAttributionUrl(attrLink.token) : whatsappUrl;
  attributionLinkId = attrLink?.id ?? null;
} else {
  // Website or other destination
  if (finalUrl && !finalUrl.startsWith("http")) finalUrl = `https://${finalUrl}`;
  if (!finalUrl) finalUrl = "https://google.com";

  const token = generateAttributionToken();
  const pixelToken = generatePixelToken();
  const { data: attrLink } = await supabase
    .from("attribution_links")
    .insert({
      token,
      organization_id: orgId,
      destination_url: finalUrl,
      destination_type: "website",
      pixel_token: pixelToken,
    })
    .select("id, token")
    .single();

  finalUrl = attrLink ? buildAttributionUrl(attrLink.token) : finalUrl;
  attributionLinkId = attrLink?.id ?? null;
}

// ---- After insertedCampaign is created (step 8) ----

if (attributionLinkId && dbCampaignId) {
  await supabase
    .from("attribution_links")
    .update({ campaign_id: dbCampaignId })
    .eq("id", attributionLinkId);
}
```

---

# PHASE 1B — The ROI Dashboard

## "Show me if my money is working"

**Target: Months 2–4**

---

### 2.1 Database Migration

**File:** `supabase/migrations/[timestamp]_sales_tracking.sql`

```sql
-- New table: whatsapp_sales
CREATE TABLE whatsapp_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  amount_ngn      INTEGER NOT NULL,  -- whole Naira (not kobo — user types this directly)
  note            TEXT,
  recorded_by     UUID REFERENCES users(id),
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_sales_campaign ON whatsapp_sales(campaign_id);
CREATE INDEX idx_whatsapp_sales_org ON whatsapp_sales(organization_id);

-- Extend campaigns table
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_ngn INTEGER DEFAULT 0;

-- RLS
ALTER TABLE whatsapp_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_own_sales" ON whatsapp_sales
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Supabase function: update campaign sales summary
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

### 2.2 Server Action: Record a Sale

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

  const { error } = await supabase.from("whatsapp_sales").insert({
    campaign_id: campaignId,
    organization_id: member.organization_id,
    amount_ngn: amountNgn,
    note: note || null,
    recorded_by: user.id,
  });
  if (error) throw new Error(error.message);

  await supabase.rpc("update_campaign_sales_summary", {
    p_campaign_id: campaignId,
    p_amount_ngn: amountNgn,
  });

  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  return { success: true };
}
```

---

### 2.3 ROI Hook

**New file:** `src/hooks/use-campaign-roi.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CampaignROI {
  campaignId: string;
  spendNgn: number;
  totalClicks: number;
  whatsappClicks: number;
  websiteClicks: number;
  salesCount: number;
  revenueNgn: number;
  costPerClickNgn: number;
  costPerSaleNgn: number;
  roiPercent: number;
}

export function useCampaignROI(campaignId: string) {
  return useQuery({
    queryKey: ["campaign-roi", campaignId],
    queryFn: async (): Promise<CampaignROI | null> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("campaigns")
        .select(
          "spend_cents, total_link_clicks, whatsapp_clicks, website_clicks, sales_count, revenue_ngn"
        )
        .eq("id", campaignId)
        .single();

      if (!data) return null;

      const FX_RATE = Number(process.env.NEXT_PUBLIC_USD_NGN_RATE) || 1600;
      const spendNgn = ((data.spend_cents || 0) / 100) * FX_RATE;
      const clicks = data.total_link_clicks || 0;
      const sales = data.sales_count || 0;
      const revenue = data.revenue_ngn || 0;

      return {
        campaignId,
        spendNgn,
        totalClicks: clicks,
        whatsappClicks: data.whatsapp_clicks || 0,
        websiteClicks: data.website_clicks || 0,
        salesCount: sales,
        revenueNgn: revenue,
        costPerClickNgn: clicks > 0 ? Math.round(spendNgn / clicks) : 0,
        costPerSaleNgn: sales > 0 ? Math.round(spendNgn / sales) : 0,
        roiPercent: spendNgn > 0 ? Math.round(((revenue - spendNgn) / spendNgn) * 100) : 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
```

---

### 2.4 Mark as Sold Button

**New file:** `src/components/campaigns/mark-as-sold-button.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
      toast.success(`₦${amountNum.toLocaleString()} sale recorded!`);
      setOpen(false);
      setAmount("");
      setNote("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
        <CheckCircle className="h-4 w-4" />
        Sold! 🎉
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record a Sale</DialogTitle>
            <p className="text-sm text-subtle-foreground">From: <strong>{campaignName}</strong></p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Sale Amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground font-medium">₦</span>
                <Input id="amount" className="pl-7" placeholder="15,000"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  type="text" inputMode="numeric" />
              </div>
            </div>
            <div>
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" className="mt-1" placeholder="e.g. Customer from Abuja"
                value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-primary text-primary-foreground">
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

### 2.5 ROI Metrics Card

**New file:** `src/components/campaigns/roi-metrics-card.tsx`

```typescript
"use client";

import { useCampaignROI } from "@/hooks/use-campaign-roi";
import { MessageCircle, Globe, ShoppingBag, TrendingUp } from "lucide-react";

export function ROIMetricsCard({ campaignId }: { campaignId: string }) {
  const { data: roi, isLoading } = useCampaignROI(campaignId);
  if (isLoading || !roi) return <ROIMetricsSkeleton />;

  const metrics = [
    {
      label: roi.whatsappClicks > 0 ? "People who messaged" : "Total clicks",
      value: (roi.whatsappClicks || roi.totalClicks).toLocaleString(),
      sub: roi.costPerClickNgn > 0 ? `₦${roi.costPerClickNgn.toLocaleString()} / click` : "No clicks yet",
      icon: roi.websiteClicks > roi.whatsappClicks ? Globe : MessageCircle,
    },
    {
      label: "Sales recorded",
      value: roi.salesCount.toLocaleString(),
      sub: roi.costPerSaleNgn > 0 ? `₦${roi.costPerSaleNgn.toLocaleString()} / sale` : "Tap 'Sold! 🎉' after closing",
      icon: ShoppingBag,
    },
    {
      label: "Revenue",
      value: `₦${roi.revenueNgn.toLocaleString()}`,
      sub: `Spent: ₦${Math.round(roi.spendNgn).toLocaleString()}`,
      icon: TrendingUp,
    },
    {
      label: "Return on spend",
      value: roi.roiPercent > 0 ? `+${roi.roiPercent}%` : roi.roiPercent === 0 ? "—" : `${roi.roiPercent}%`,
      sub: "Revenue vs. ad spend",
      icon: TrendingUp,
      highlight: roi.roiPercent > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-xl border border-border p-4">
          <m.icon className="h-4 w-4 text-primary mb-2" />
          <p className="text-xs text-subtle-foreground">{m.label}</p>
          <p className={`text-lg font-bold ${m.highlight ? "text-primary" : "text-foreground"}`}>{m.value}</p>
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
        <div key={i} className="rounded-xl border border-border p-4 animate-pulse">
          <div className="h-4 w-4 rounded bg-muted mb-2" />
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

```typescript
import { ROIMetricsCard } from "./roi-metrics-card";
import { MarkAsSoldButton } from "./mark-as-sold-button";

// Add above the existing metrics section in JSX:
<section className="space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold">Performance</h3>
    <MarkAsSoldButton campaignId={campaign.id} campaignName={campaign.name} />
  </div>
  <ROIMetricsCard campaignId={campaign.id} />
</section>
```
