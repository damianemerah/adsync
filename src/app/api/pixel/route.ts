import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";
import type { Database } from "@/types/supabase";

/**
 * Pixel endpoint — 1×1 transparent GIF for website owner event tracking.
 *
 * Usage (pasted once in site <head>):
 *   <img src="https://sellam.app/api/pixel?t=PIXEL_TOKEN&e=view" />
 *
 * Query params:
 *   t  = pixel_token (from attribution_links, NOT the redirect token)
 *   e  = event type: 'view' | 'lead' | 'purchase'  (default: 'view')
 *   v  = sale value in whole Naira (only for 'purchase' events)
 *
 * Rules (from SKILL.md):
 *   - Always return the GIF immediately — analytics is a side-effect
 *   - Purchase events auto-credit revenue via update_campaign_sales_summary RPC
 *   - Purchase events also fire a Meta CAPI website Purchase event if CAPI is configured
 */

const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

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
  const token = searchParams.get("t"); // pixel_token
  const event = searchParams.get("e") || "view"; // 'view' | 'lead' | 'purchase'
  const value = parseInt(searchParams.get("v") || "0"); // NGN sale value

  if (token) {
    const supabase = createAnonClient();

    const { data: link } = await supabase
      .from("attribution_links")
      .select("id, campaign_id, organization_id")
      .eq("pixel_token", token)
      .single();

    if (link) {
      // Fire-and-forget: record the event
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
          if (event === "purchase" && value > 0 && link.campaign_id) {
            // Auto-credit revenue — same effect as "Mark as Sold"
            supabase.rpc("update_campaign_sales_summary", {
              p_campaign_id: link.campaign_id,
              p_amount_ngn: value,
            });

            // Also fire Meta CAPI website Purchase event if the ad account has
            // CAPI configured. Uses event_source_url from the Referer header for
            // better match quality. Silently skips if credentials aren't set up.
            const referer = request.headers.get("referer") || undefined;
            fireCAPIWebsitePurchase({
              campaignId: link.campaign_id,
              valueNgn: value,
              eventSourceUrl: referer,
            }).catch((err) =>
              console.warn("⚠️ [CAPI] Pixel fire failed (non-critical):", err),
            );
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
