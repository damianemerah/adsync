import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";
import type { Database } from "@/types/supabase";

/**
 * Pixel endpoint — 1×1 transparent GIF for website owner event tracking.
 *
 * Usage (pasted once in site <head> via Settings → Business → Tenzu Pixel):
 *   snippet auto-fires on page load and listens for Tenzu_purchase events
 *
 * Query params:
 *   t   = org pixel_token (from organizations.pixel_token — one per org)
 *   _ta = attribution link ID (appended to destination URL at redirect time)
 *   e   = event type: 'view' | 'lead' | 'purchase'  (default: 'view')
 *   v   = sale value in whole Naira (only for 'purchase' events)
 *
 * Rules (from SKILL.md):
 *   - Always return the GIF immediately — analytics is a side-effect
 *   - Purchase events auto-credit revenue via update_campaign_sales_summary RPC
 *   - Purchase events also fire a Meta CAPI website Purchase event if CAPI is configured
 *   - If _ta is missing, event is recorded at org level with no campaign attribution
 */

const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

// Simple in-memory rate limiter to prevent click fraud
// Maps IP address -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // Max 20 pixel fires per IP per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    // New window
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Anon client — pixel fires without auth
function createAnonClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t"); // org pixel_token (organizations.pixel_token)
  const ta = searchParams.get("_ta"); // attribution link ID (optional, for campaign resolution)
  const event = searchParams.get("e") || "view"; // 'view' | 'lead' | 'purchase'
  const value = parseInt(searchParams.get("v") || "0"); // NGN sale value

  // Extract IP for rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") ||
             "unknown";

  // Check rate limit (prevent click fraud)
  if (!checkRateLimit(ip)) {
    console.warn(`[Pixel] Rate limit exceeded for IP: ${ip}`);
    // Still return pixel (don't break page load), just don't record event
    return new NextResponse(PIXEL_GIF, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  if (token) {
    const supabase = createAnonClient();

    // 1. Look up org by its global pixel token
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("pixel_token", token)
      .single();

    if (org) {
      // 2. If an attribution link ID was provided, resolve campaign from it.
      //    Security: enforce org boundary so one org can't claim another's link.
      let linkId: string | null = null;
      let campaignId: string | null = null;

      if (ta) {
        const { data: link } = await supabase
          .from("attribution_links")
          .select("id, campaign_id")
          .eq("id", ta)
          .eq("organization_id", org.id)
          .maybeSingle();

        if (link) {
          linkId = link.id;
          campaignId = link.campaign_id;
        }
      }

      // 3. Fire-and-forget: only record if we resolved a link (link_id is NOT NULL in schema)
      if (linkId && campaignId) {
        supabase
          .from("link_clicks")
          .insert({
            link_id: linkId,
            campaign_id: campaignId,
            organization_id: org.id,
            destination_type: "website",
            event_type: event,
            event_value_ngn: event === "purchase" ? value : null,
          })
          .then(() => {
            if (event === "purchase" && value > 0) {
              // Auto-credit revenue — same effect as "Mark as Sold"
              supabase.rpc("update_campaign_sales_summary", {
                p_campaign_id: campaignId!,
                p_amount_ngn: value,
              });

              // Also fire Meta CAPI website Purchase event if the ad account has
              // CAPI configured. Silently skips if credentials aren't set up.
              const referer = request.headers.get("referer") || undefined;
              fireCAPIWebsitePurchase({
                campaignId: campaignId!,
                valueNgn: value,
                eventSourceUrl: referer,
              }).catch((err) =>
                console.warn("⚠️ [CAPI] Pixel fire failed (non-critical):", err),
              );
            }
          });
      }
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

/**
 * Looks up CAPI credentials for the campaign's ad account and fires a
 * website Purchase event. Uses the admin client to read ad_accounts past RLS.
 */
async function fireCAPIWebsitePurchase({
  campaignId,
  valueNgn,
  eventSourceUrl,
}: {
  campaignId: string;
  valueNgn: number;
  eventSourceUrl?: string;
}) {
  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("campaigns")
    .select("ad_account_id")
    .eq("id", campaignId)
    .single();

  if (!campaign?.ad_account_id) return;

  const { data: adAccount } = await admin
    .from("ad_accounts")
    .select("meta_pixel_id, capi_access_token")
    .eq("id", campaign.ad_account_id)
    .single();

  if (!adAccount?.meta_pixel_id || !adAccount?.capi_access_token) return;

  const decryptedToken = decrypt(adAccount.capi_access_token);

  await MetaService.sendCAPIEvent(adAccount.meta_pixel_id, decryptedToken, {
    eventName: "Purchase",
    actionSource: "website",
    valueNgn,
    eventSourceUrl,
  });
}
