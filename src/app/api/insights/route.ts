import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/api/insights";
import { getActiveOrgId } from "@/lib/active-org";

/**
 * GET /api/insights
 *
 * Query params:
 *  accountId    - specific ad account UUID (optional)
 *  campaignIds  - comma-separated campaign UUIDs, or "all" (optional)
 *  platform     - "meta" | "tiktok" | "all"  (optional, default "meta")
 *  dateFrom     - ISO date string (optional)
 *  dateTo       - ISO date string (optional)
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const orgId = await getActiveOrgId();
  if (!orgId) return new Response("No organization found", { status: 400 });

  // 2. Parse query params
  const { searchParams } = new URL(request.url);
  console.log("searchParams🔥", searchParams);
  const accountId = searchParams.get("accountId") || undefined;
  const campaignIdsRaw = searchParams.get("campaignIds") || "all";
  const platform = searchParams.get("platform") || "meta";
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;

  const campaignId =
    campaignIdsRaw === "all"
      ? "all"
      : campaignIdsRaw.split(",").filter(Boolean)[0]; // pass first for now; API supports one at a time

  // 3. Delegate to the shared server-side fetcher
  try {
    const data = await getDashboardData(user.id, orgId, {
      campaignId,
      platform,
      accountId,
      dateFrom,
      dateTo,
    });

    console.log("📊 [API/Insights] Data returned from getDashboardData:", {
      hasData: !!data,
      performanceLength: data?.performance?.length,
      summarySpend: data?.summary?.spend,
    });

    if (!data) {
      return NextResponse.json({
        summary: {
          spend: "0",
          impressions: "0",
          clicks: "0",
          ctr: "0",
          cpc: "0",
          reach: "0",
        },
        performance: [],
        demographics: { age: [], gender: [], region: [] },
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Insights API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
