import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

/**
 * Pixel endpoint — 1×1 transparent GIF for website owner event tracking.
 *
 * Usage (pasted once in site <head>):
 *   <img src="https://adsync.app/api/pixel?t=PIXEL_TOKEN&e=view" />
 *
 * Query params:
 *   t  = pixel_token (from attribution_links, NOT the redirect token)
 *   e  = event type: 'view' | 'lead' | 'purchase'  (default: 'view')
 *   v  = sale value in whole Naira (only for 'purchase' events)
 *
 * Rules (from SKILL.md):
 *   - Always return the GIF immediately — analytics is a side-effect
 *   - Purchase events auto-credit revenue via update_campaign_sales_summary RPC
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
