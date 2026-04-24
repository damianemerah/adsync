import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { UAParser } from "ua-parser-js";
import type { Database } from "@/types/supabase";

/**
 * Attribution redirect handler.
 *
 * Flow:
 *  1. Look up token → get destination URL
 *  2. Fire-and-forget: record click + increment campaign counter
 *  3. 302 redirect to destination (per decisions.md: 302 not 301)
 *
 * This route runs WITHOUT auth — uses public RLS policies.
 * Target: < 50ms overhead.
 */

// Anon Supabase client (no cookies needed — public endpoint)
function createAnonClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createAnonClient();

  // 1. Look up the attribution link
  const { data: link } = await supabase
    .from("attribution_links")
    .select(
      "id, campaign_id, organization_id, destination_url, destination_type",
    )
    .eq("token", token)
    .single();

  // If link not found or expired, redirect to homepage gracefully
  if (!link) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Parse device info from User-Agent
  const ua = request.headers.get("user-agent") || "";
  const parser = new UAParser(ua);
  const deviceType = parser.getDevice().type || "desktop"; // mobile | tablet | desktop
  const country = request.headers.get("cf-ipcountry") || "NG";
  const referrer = request.headers.get("referer") || null;

  // Capture Meta's fbclid — appended by Meta when someone clicks a Meta ad.
  // This is the match key that links a "Mark as Sold" CAPI event back to the
  // exact ad click that drove it, improving Andromeda's conversion optimisation.
  const fbclid = request.nextUrl.searchParams.get("fbclid") || null;

  // 3. Fire-and-forget: record the click (never block the redirect)
  supabase
    .from("link_clicks")
    .insert({
      link_id: link.id,
      campaign_id: link.campaign_id,
      organization_id: link.organization_id,
      device_type: deviceType,
      destination_type: link.destination_type,
      country,
      referrer,
      event_type: "click",
      fbclid,
    })
    .then(({ error }) => {
      if (error) {
        console.error("link_clicks insert failed:", error);
        return;
      }
      // Increment the correct counter based on destination type
      if (link.campaign_id) {
        supabase
          .rpc("increment_campaign_clicks", {
            p_campaign_id: link.campaign_id,
            p_destination_type: link.destination_type,
          })
          .then(({ error: rpcError }) => {
            if (rpcError) console.error("increment_campaign_clicks failed:", rpcError);
          });
      }
    });

  // 4. Redirect immediately — user doesn't wait for analytics
  // For website links, append ?_ta={link.id} so the org-level pixel can resolve
  // which campaign drove this visit without needing per-campaign pixel tokens.
  let destination = link.destination_url;
  if (link.destination_type === "website") {
    try {
      const destUrl = new URL(destination);
      destUrl.searchParams.set("_ta", link.id);
      destination = destUrl.toString();
    } catch {
      // Malformed URL — redirect as-is
    }
  }
  return NextResponse.redirect(destination, { status: 302 });
}
