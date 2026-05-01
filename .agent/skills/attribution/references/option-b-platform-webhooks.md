# Option B: Shopify/WooCommerce Webhook Integration

## Overview

This document outlines the implementation plan for allowing Nigerian SMEs to connect their e-commerce platforms (Shopify, WooCommerce, Bumpa) directly to Tenzu. When connected, purchase events from these platforms automatically fire Tenzu's pixel endpoint, which credits campaign revenue and sends events to Meta CAPI — all without requiring the merchant to manually paste pixel code.

## Current Status

**Partial Implementation**: `src/components/campaigns/new/steps/budget-launch-step.tsx` (lines 638-655) shows placeholder buttons for platform integrations, but the actual webhook endpoints and connection flow are not implemented.

## Why This Matters

Many Nigerian merchants use hosted platforms (Shopify, WooCommerce) where they can't easily edit `<head>` tags or have technical limitations. Webhook integration provides:

1. **Zero-code installation** — Just connect once in Settings
2. **Automatic pixel firing** — All purchases tracked without manual snippet
3. **Better data accuracy** — Server-side events, no ad blockers
4. **Multi-campaign attribution** — Smart link tokens identify which campaign drove each sale

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Customer Journey                                            │
└─────────────────────────────────────────────────────────────┘
  1. Customer clicks Meta ad → tenzu.africa/l/TOKEN
  2. Redirect to Shopify/WooCommerce store (with ?ref=TOKEN)
  3. Customer completes purchase
  4. Platform fires webhook → Tenzu
  5. Tenzu programmatically fires pixel endpoint
  6. Revenue credited to campaign + Meta CAPI event sent

┌─────────────────────────────────────────────────────────────┐
│ Technical Flow                                              │
└─────────────────────────────────────────────────────────────┘
  Platform           Tenzu Webhook API           Pixel Logic
  ────────           ─────────────────           ───────────
  POST /webhook  →   Verify HMAC signature   →   Extract order
                 ↓
                 Parse order data
                 (amount, email, ref param)
                 ↓
                 Match ref=TOKEN to campaign
                 ↓
                 Call /api/pixel internally   →  Credit revenue
                 ↓                                + Fire CAPI
                 Return 200 OK
```

## Database Schema Changes

### New Table: `platform_connections`

```sql
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'shopify' | 'woocommerce' | 'bumpa'
  store_domain TEXT NOT NULL, -- e.g., 'mystore.myshopify.com'
  webhook_secret TEXT NOT NULL, -- For HMAC verification (encrypted)
  api_credentials JSONB, -- Platform-specific API keys (encrypted)
  status TEXT DEFAULT 'active', -- 'active' | 'paused' | 'error'
  last_webhook_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, platform, store_domain)
);

CREATE INDEX idx_platform_connections_org_status
ON platform_connections(organization_id, status);

COMMENT ON TABLE platform_connections IS
  'Stores connected e-commerce platforms for automatic pixel firing via webhooks.';
```

### Migration: Add `referral_token` to `attribution_links`

```sql
-- Allow matching webhook purchases back to campaigns
ALTER TABLE attribution_links
ADD COLUMN referral_param TEXT;

COMMENT ON COLUMN attribution_links.referral_param IS
  'Optional: Value appended as ?ref=TOKEN to destination URLs for webhook attribution.';

CREATE INDEX idx_attribution_links_referral_param
ON attribution_links(referral_param)
WHERE referral_param IS NOT NULL;
```

## Implementation Checklist

### Phase 1: Database & Core Logic

- [ ] Create migration: `platform_connections` table
- [ ] Update `attribution_links` table: add `referral_param` column
- [ ] Add webhook secret encryption helpers to `src/lib/crypto.ts`
- [ ] Update `src/lib/attribution.ts`: append `?ref=TOKEN` to website destination URLs

### Phase 2: Webhook Endpoints

- [ ] Create `/src/app/api/webhooks/shopify/route.ts`
- [ ] Create `/src/app/api/webhooks/woocommerce/route.ts`
- [ ] Create `/src/app/api/webhooks/bumpa/route.ts` (if Bumpa has webhooks)
- [ ] Implement HMAC signature verification for each platform
- [ ] Add order parsing logic (extract amount, email, ref param)
- [ ] Add internal pixel firing: `await fetch("/api/pixel?t=TOKEN&e=purchase&v=AMOUNT")`
- [ ] Add error logging and retry logic

### Phase 3: Settings UI

- [ ] Create `/src/components/settings/platform-connections-tab.tsx`
- [ ] Add "Connect Platform" button for each supported platform
- [ ] Create connection flow modal/sheet with form:
  - Platform selection dropdown
  - Store domain input
  - API credentials input (platform-specific)
  - Webhook URL display (copy-paste for user)
  - Test connection button
- [ ] Show connected platforms list with status indicators
- [ ] Add disconnect/pause actions

### Phase 4: Campaign Launch Integration

- [ ] Update `budget-launch-step.tsx`: Replace alert placeholders with actual connection flow
- [ ] Add platform connection status check in campaign launch validation
- [ ] Show "Platform Connected ✅" badge when pixel not needed (webhook handles it)
- [ ] Update `process-campaign-launch` edge function: Skip pixel warning if platform connected

### Phase 5: Server Actions

- [ ] Create `src/actions/platform-connections.ts`:
  - `connectPlatform(orgId, platform, storeDomain, webhookSecret, apiCredentials)`
  - `disconnectPlatform(connectionId)`
  - `testPlatformConnection(connectionId)`
  - `getPlatformConnections(orgId)`

### Phase 6: Testing & Documentation

- [ ] Test Shopify webhook with test orders
- [ ] Test WooCommerce webhook with test orders
- [ ] Add webhook troubleshooting guide in Settings UI
- [ ] Update SKILL.md with webhook implementation details
- [ ] Add user-facing docs: "How to Connect Your Store"

## File-by-File Implementation

### 1. Migration: `supabase/migrations/20260328000001_add_platform_connections.sql`

```sql
-- Table for connected e-commerce platforms
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopify', 'woocommerce', 'bumpa')),
  store_domain TEXT NOT NULL,
  webhook_secret TEXT NOT NULL, -- AES-256 encrypted
  api_credentials JSONB, -- AES-256 encrypted JSON string
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_webhook_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, platform, store_domain)
);

CREATE INDEX idx_platform_connections_org_status
ON platform_connections(organization_id, status);

CREATE INDEX idx_platform_connections_platform
ON platform_connections(platform, status);

-- Enable RLS
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view platform connections for their organizations"
ON platform_connections FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage platform connections"
ON platform_connections FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- Add referral param support to attribution links
ALTER TABLE attribution_links
ADD COLUMN referral_param TEXT;

COMMENT ON COLUMN attribution_links.referral_param IS
  'Optional: Appended as ?ref=TOKEN to destination URLs for webhook attribution matching.';

CREATE INDEX idx_attribution_links_referral_param
ON attribution_links(referral_param)
WHERE referral_param IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER set_platform_connections_updated_at
BEFORE UPDATE ON platform_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### 2. Crypto Helpers: Update `src/lib/crypto.ts`

```typescript
// Add platform credentials encryption helpers
export function encryptPlatformCredentials(credentials: Record<string, string>): string {
  const jsonString = JSON.stringify(credentials);
  return encrypt(jsonString);
}

export function decryptPlatformCredentials(encrypted: string): Record<string, string> {
  const decrypted = decrypt(encrypted);
  return JSON.parse(decrypted);
}
```

### 3. Attribution Logic: Update `src/lib/attribution.ts`

```typescript
// Add referral param support
export function buildAttributionUrl(
  token: string,
  destinationType: "whatsapp" | "website",
  options?: { addReferralParam?: boolean }
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tenzu.app";

  if (options?.addReferralParam && destinationType === "website") {
    // For webhook-enabled websites, append ref param after redirect
    // The /l/[token] route will add ?ref=TOKEN to destination URL
    return `${baseUrl}/l/${token}?track=1`;
  }

  return `${baseUrl}/l/${token}`;
}
```

### 4. Redirect Route: Update `src/app/l/[token]/route.ts`

```typescript
// Add referral param appending for webhook attribution
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  // ... existing lookup logic ...

  // Check if this campaign's org has platform webhooks enabled
  const trackParam = searchParams.get("track");
  if (trackParam === "1" && link.referral_param) {
    const separator = destinationUrl.includes("?") ? "&" : "?";
    destinationUrl = `${destinationUrl}${separator}ref=${link.referral_param}`;
  }

  // ... existing redirect logic ...
}
```

### 5. Webhook Endpoint: `src/app/api/webhooks/shopify/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import crypto from "crypto";

/**
 * Shopify Order Creation Webhook
 *
 * Setup in Shopify Admin:
 * 1. Settings → Notifications → Webhooks
 * 2. Create webhook: Order creation
 * 3. URL: https://tenzu.app/api/webhooks/shopify
 * 4. Format: JSON
 * 5. Copy webhook secret to Tenzu Settings
 */

function verifyShopifyWebhook(body: string, hmacHeader: string, secret: string): boolean {
  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body for HMAC verification
    const body = await request.text();
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
    const shopDomain = request.headers.get("x-shopify-shop-domain");

    if (!hmacHeader || !shopDomain) {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
    }

    // 2. Look up platform connection
    const admin = createAdminClient();
    const { data: connection } = await admin
      .from("platform_connections")
      .select("id, organization_id, webhook_secret")
      .eq("platform", "shopify")
      .eq("store_domain", shopDomain)
      .eq("status", "active")
      .single();

    if (!connection) {
      console.warn(`[Shopify Webhook] No active connection for ${shopDomain}`);
      return NextResponse.json({ error: "Store not connected" }, { status: 404 });
    }

    // 3. Verify HMAC signature
    const decryptedSecret = decrypt(connection.webhook_secret);
    if (!verifyShopifyWebhook(body, hmacHeader, decryptedSecret)) {
      console.error(`[Shopify Webhook] HMAC verification failed for ${shopDomain}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 4. Parse order data
    const order = JSON.parse(body);
    const orderValue = parseFloat(order.total_price); // In store currency
    const referralToken =
      order.note_attributes?.find((attr: any) => attr.name === "ref")?.value ||
      new URL(order.landing_site || "").searchParams.get("ref");

    console.log(`[Shopify Webhook] Order ${order.id} - ${orderValue} - ref: ${referralToken}`);

    // 5. Match to campaign via referral token
    if (referralToken) {
      const { data: link } = await admin
        .from("attribution_links")
        .select("pixel_token, campaign_id, organization_id")
        .eq("referral_param", referralToken)
        .eq("organization_id", connection.organization_id)
        .single();

      if (link?.pixel_token) {
        // 6. Fire Tenzu pixel programmatically
        const pixelUrl = new URL("/api/pixel", process.env.NEXT_PUBLIC_APP_URL);
        pixelUrl.searchParams.set("t", link.pixel_token);
        pixelUrl.searchParams.set("e", "purchase");
        pixelUrl.searchParams.set("v", Math.round(orderValue).toString());

        await fetch(pixelUrl.toString(), {
          headers: {
            "x-forwarded-for": request.headers.get("x-forwarded-for") || "",
            "user-agent": "Tenzu-Shopify-Webhook/1.0",
          },
        });

        console.log(`✅ [Shopify Webhook] Pixel fired for campaign ${link.campaign_id}`);
      }
    }

    // 7. Update last webhook timestamp
    await admin
      .from("platform_connections")
      .update({ last_webhook_at: new Date().toISOString() })
      .eq("id", connection.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Shopify Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
```

### 6. Webhook Endpoint: `src/app/api/webhooks/woocommerce/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import crypto from "crypto";

/**
 * WooCommerce Order Completed Webhook
 *
 * Setup in WordPress Admin:
 * 1. WooCommerce → Settings → Advanced → Webhooks
 * 2. Add webhook: Order completed
 * 3. Delivery URL: https://tenzu.app/api/webhooks/woocommerce
 * 4. Secret: Generate in Tenzu Settings → Integrations
 * 5. API Version: WP REST API Integration v3
 */

function verifyWooCommerceWebhook(body: string, signatureHeader: string, secret: string): boolean {
  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader));
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const body = await request.text();
    const signatureHeader = request.headers.get("x-wc-webhook-signature");
    const sourceUrl = request.headers.get("x-wc-webhook-source");

    if (!signatureHeader || !sourceUrl) {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
    }

    // Extract domain from source URL
    const storeDomain = new URL(sourceUrl).hostname;

    // 2. Look up platform connection
    const admin = createAdminClient();
    const { data: connection } = await admin
      .from("platform_connections")
      .select("id, organization_id, webhook_secret")
      .eq("platform", "woocommerce")
      .eq("store_domain", storeDomain)
      .eq("status", "active")
      .single();

    if (!connection) {
      console.warn(`[WooCommerce Webhook] No active connection for ${storeDomain}`);
      return NextResponse.json({ error: "Store not connected" }, { status: 404 });
    }

    // 3. Verify signature
    const decryptedSecret = decrypt(connection.webhook_secret);
    if (!verifyWooCommerceWebhook(body, signatureHeader, decryptedSecret)) {
      console.error(`[WooCommerce Webhook] Signature verification failed for ${storeDomain}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 4. Parse order data
    const order = JSON.parse(body);
    const orderValue = parseFloat(order.total);

    // Check for ref param in order meta or customer note
    const referralToken =
      order.meta_data?.find((meta: any) => meta.key === "_tenzu_ref")?.value ||
      order.customer_note?.match(/ref[=:](\w+)/)?.[1];

    console.log(`[WooCommerce Webhook] Order ${order.id} - ${orderValue} - ref: ${referralToken}`);

    // 5. Match to campaign via referral token
    if (referralToken) {
      const { data: link } = await admin
        .from("attribution_links")
        .select("pixel_token, campaign_id, organization_id")
        .eq("referral_param", referralToken)
        .eq("organization_id", connection.organization_id)
        .single();

      if (link?.pixel_token) {
        // 6. Fire Tenzu pixel programmatically
        const pixelUrl = new URL("/api/pixel", process.env.NEXT_PUBLIC_APP_URL);
        pixelUrl.searchParams.set("t", link.pixel_token);
        pixelUrl.searchParams.set("e", "purchase");
        pixelUrl.searchParams.set("v", Math.round(orderValue).toString());

        await fetch(pixelUrl.toString(), {
          headers: {
            "x-forwarded-for": request.headers.get("x-forwarded-for") || "",
            "user-agent": "Tenzu-WooCommerce-Webhook/1.0",
          },
        });

        console.log(`✅ [WooCommerce Webhook] Pixel fired for campaign ${link.campaign_id}`);
      }
    }

    // 7. Update last webhook timestamp
    await admin
      .from("platform_connections")
      .update({ last_webhook_at: new Date().toISOString() })
      .eq("id", connection.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[WooCommerce Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
```

### 7. Server Actions: `src/actions/platform-connections.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { encrypt, decrypt, encryptPlatformCredentials } from "@/lib/crypto";
import crypto from "crypto";

export async function connectPlatform(data: {
  platform: "shopify" | "woocommerce" | "bumpa";
  storeDomain: string;
  webhookSecret?: string; // For WooCommerce (user provides)
  apiCredentials?: Record<string, string>; // Platform-specific
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization");

  try {
    // Generate webhook secret if not provided (Shopify generates theirs)
    const secret = data.webhookSecret || crypto.randomBytes(32).toString("hex");

    const { error } = await supabase.from("platform_connections").insert({
      organization_id: orgId,
      platform: data.platform,
      store_domain: data.storeDomain,
      webhook_secret: encrypt(secret),
      api_credentials: data.apiCredentials ? encryptPlatformCredentials(data.apiCredentials) : null,
      status: "active",
    });

    if (error) throw error;

    return {
      success: true,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/${data.platform}`,
      webhookSecret: secret, // Return for user to paste in platform settings
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function disconnectPlatform(connectionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization");

  try {
    const { error } = await supabase
      .from("platform_connections")
      .delete()
      .eq("id", connectionId)
      .eq("organization_id", orgId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPlatformConnections() {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization");

  const { data, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function testPlatformConnection(connectionId: string) {
  // Future: Implement test webhook or API call to verify connection
  // For now, just mark as tested
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization");

  try {
    const { error } = await supabase
      .from("platform_connections")
      .update({ last_webhook_at: new Date().toISOString() })
      .eq("id", connectionId)
      .eq("organization_id", orgId);

    if (error) throw error;
    return { success: true, message: "Test successful! Webhook is configured correctly." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### 8. Settings UI: `src/components/settings/platform-connections-tab.tsx`

```typescript
"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Copy, Check, Trash, Plugin } from "iconoir-react";
import { toast } from "sonner";
import {
  connectPlatform,
  disconnectPlatform,
  getPlatformConnections,
} from "@/actions/platform-connections";

interface PlatformConnection {
  id: string;
  platform: string;
  store_domain: string;
  status: string;
  last_webhook_at: string | null;
  created_at: string;
}

export function PlatformConnectionsTab() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [storeDomain, setStoreDomain] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [generatedWebhookUrl, setGeneratedWebhookUrl] = useState("");
  const [generatedSecret, setGeneratedSecret] = useState("");

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const data = await getPlatformConnections();
      setConnections(data);
    } catch (error) {
      console.error("Failed to load platform connections:", error);
    }
  };

  const handleConnect = () => {
    if (!selectedPlatform || !storeDomain) {
      toast.error("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      toast.loading("Connecting platform...", { id: "connect-platform" });

      const result = await connectPlatform({
        platform: selectedPlatform as any,
        storeDomain,
        webhookSecret: webhookSecret || undefined,
      });

      if (result.success) {
        toast.success("Platform connected!", {
          id: "connect-platform",
          description: "Copy the webhook URL and secret to your platform settings.",
        });
        setGeneratedWebhookUrl(result.webhookUrl!);
        setGeneratedSecret(result.webhookSecret!);
        loadConnections();
        // Don't close sheet yet - user needs to copy credentials
      } else {
        toast.error("Connection failed", {
          id: "connect-platform",
          description: result.error,
        });
      }
    });
  };

  const handleDisconnect = (connectionId: string) => {
    if (!confirm("Are you sure you want to disconnect this platform?")) return;

    startTransition(async () => {
      toast.loading("Disconnecting...", { id: "disconnect-platform" });

      const result = await disconnectPlatform(connectionId);

      if (result.success) {
        toast.success("Platform disconnected", { id: "disconnect-platform" });
        loadConnections();
      } else {
        toast.error("Failed to disconnect", {
          id: "disconnect-platform",
          description: result.error,
        });
      }
    });
  };

  const copyToClipboard = (text: string, type: "url" | "secret") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
    toast.success(`${type === "url" ? "Webhook URL" : "Secret"} copied!`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>E-Commerce Platform Integrations</CardTitle>
              <CardDescription className="mt-1.5">
                Connect your Shopify, WooCommerce, or Bumpa store to automatically track sales
                without manual pixel installation.
              </CardDescription>
            </div>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Connect Platform
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Connect E-Commerce Platform</SheetTitle>
                </SheetHeader>

                <div className="space-y-4 mt-6">
                  {!generatedWebhookUrl ? (
                    <>
                      <div>
                        <Label htmlFor="platform">Platform</Label>
                        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                          <SelectTrigger id="platform">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shopify">Shopify</SelectItem>
                            <SelectItem value="woocommerce">WooCommerce</SelectItem>
                            <SelectItem value="bumpa">Bumpa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="store-domain">Store Domain</Label>
                        <Input
                          id="store-domain"
                          placeholder="mystore.myshopify.com"
                          value={storeDomain}
                          onChange={(e) => setStoreDomain(e.target.value)}
                        />
                      </div>

                      <Button onClick={handleConnect} disabled={isPending} className="w-full">
                        {isPending ? "Connecting..." : "Generate Webhook Credentials"}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm font-medium text-emerald-900 mb-2">
                          ✅ Connection Created!
                        </p>
                        <p className="text-xs text-emerald-700">
                          Copy these credentials and paste them in your {selectedPlatform}{" "}
                          settings.
                        </p>
                      </div>

                      <div>
                        <Label>Webhook URL</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={generatedWebhookUrl} readOnly className="font-mono text-xs" />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generatedWebhookUrl, "url")}
                          >
                            {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Webhook Secret</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input value={generatedSecret} readOnly className="font-mono text-xs" />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generatedSecret, "secret")}
                          >
                            {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                        <p className="font-medium mb-1">Next Steps:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Copy the webhook URL and secret above</li>
                          <li>Go to your {selectedPlatform} admin panel</li>
                          <li>Navigate to webhook settings</li>
                          <li>Create a new webhook for "Order Created" events</li>
                          <li>Paste the URL and secret</li>
                        </ol>
                      </div>

                      <Button
                        onClick={() => {
                          setIsSheetOpen(false);
                          setSelectedPlatform("");
                          setStoreDomain("");
                          setWebhookSecret("");
                          setGeneratedWebhookUrl("");
                          setGeneratedSecret("");
                        }}
                        className="w-full"
                      >
                        Done
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Plugin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No platforms connected yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm capitalize">{conn.platform}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{conn.store_domain}</p>
                    {conn.last_webhook_at && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Last webhook:{" "}
                        {new Date(conn.last_webhook_at).toLocaleDateString("en-NG")}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(conn.id)}
                    disabled={isPending}
                  >
                    <Trash className="w-4 h-4 mr-1.5" />
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 9. Update Budget Launch Step: `src/components/campaigns/new/steps/budget-launch-step.tsx`

Replace the alert placeholder (lines 638-655) with actual connection flow:

```typescript
// Replace the alert placeholder section with:
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
  <Sheet>
    <SheetTrigger asChild>
      <button className="p-3 bg-white border border-yellow-200 rounded-md hover:border-yellow-400 hover:shadow-sm transition-all text-center text-sm font-bold text-yellow-900">
        Shopify
      </button>
    </SheetTrigger>
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Connect Shopify</SheetTitle>
        <SheetDescription>
          Your Shopify store will automatically track sales via webhooks.
        </SheetDescription>
      </SheetHeader>
      {/* Use PlatformConnectionsTab component inline or create simplified version */}
    </SheetContent>
  </Sheet>

  {/* Repeat for WooCommerce, Bumpa */}

  <button
    onClick={() => setShowPixelInstructions(true)}
    className="p-3 bg-white border border-yellow-200 rounded-md hover:border-yellow-400 hover:shadow-sm transition-all text-center text-sm font-bold text-yellow-900"
  >
    Copy Code
  </button>
</div>
```

## Security Considerations

1. **HMAC Verification**: ALWAYS verify webhook signatures before processing
2. **Encrypted Storage**: Webhook secrets and API credentials stored with AES-256
3. **Rate Limiting**: Add rate limits to webhook endpoints (same as pixel endpoint)
4. **Admin Client Justification**: Webhook routes use `createAdminClient()` because they're public endpoints with no user session — same pattern as `/api/pixel`
5. **Replay Attack Prevention**: Check `last_webhook_at` timestamp to detect duplicate events
6. **Error Logging**: Log failed webhooks for debugging but never expose sensitive data

## Testing Strategy

### Shopify Test Webhooks

1. Use Shopify's webhook testing tool in admin panel
2. Or install on dev store and create test orders
3. Verify HMAC signature with Shopify's test secret

### WooCommerce Test Webhooks

1. Install WooCommerce on local WordPress
2. Use webhook testing plugins (e.g., WP Webhooks)
3. Create test orders with test payment gateway

### End-to-End Test Flow

1. Create Tenzu campaign with website objective
2. Connect platform in Settings → Integrations
3. Click ad → redirected to store with `?ref=TOKEN`
4. Complete purchase
5. Verify webhook received in logs
6. Confirm revenue credited to campaign
7. Check Meta CAPI event sent (if pixel configured)

## User-Facing Documentation

Create help article in Tenzu dashboard:

**"How to Connect Your Shopify Store"**

1. Go to Settings → Integrations
2. Click "Connect Platform"
3. Select "Shopify" and enter your store domain
4. Click "Generate Webhook Credentials"
5. Copy the webhook URL and secret
6. In Shopify Admin, go to Settings → Notifications → Webhooks
7. Create webhook for "Order creation" event
8. Paste the URL and secret from step 5
9. Save — You're done! All sales will now be tracked automatically.

## Future Enhancements

- [ ] Support for Bumpa webhooks (if available)
- [ ] Support for custom platforms via generic webhook
- [ ] Webhook retry mechanism for failed deliveries
- [ ] Dashboard showing webhook success rate
- [ ] Auto-pause campaigns if webhook fails repeatedly
- [ ] Multi-currency conversion (store currency → NGN)
- [ ] Product-level attribution (which products sold from which campaigns)

## Critical Rules

1. **ALWAYS verify webhook signatures** — reject if invalid
2. **NEVER expose webhook secrets in browser** — server-only decryption
3. **Fire-and-forget pattern** — webhook processing must not block response
4. **Graceful fallback** — if webhook fails, campaign still works (just less data)
5. **Rate limiting** — prevent webhook spam/abuse (similar to pixel endpoint)
6. **Error resilience** — log errors but return 200 OK to platform (avoid retries)
7. **Referral param matching** — ONLY credit campaigns where ref param matches
8. **Multi-org safety** — ALWAYS verify platform connection belongs to matched campaign's org

## Summary

This feature transforms Tenzu's pixel from a "copy-paste snippet" solution into a **zero-code webhook integration** for Nigerian SMEs on hosted platforms. Merchants connect once in Settings, and all future sales are automatically tracked, attributed, and sent to Meta CAPI — dramatically lowering the technical barrier for outcome-based advertising.

The implementation maintains Tenzu's fire-and-forget architecture principles while adding enterprise-grade webhook security and multi-platform support.
