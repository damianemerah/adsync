import { decrypt } from "@/lib/crypto";
import { MetaService } from "@/lib/api/meta";
import { SupabaseClient } from "@supabase/supabase-js";

// Interface removed as we return a dynamic object now

/**
 * Server-side fetcher for dashboard insights
 * Fetches performance metrics from Meta API for the last 30 days
 */
/**
 * Server-side fetcher for dashboard insights
 * Fetches performance metrics from Meta API with optional filtering
 */
export async function getDashboardData(
  supabase: SupabaseClient,
  userId: string,
  filter?: {
    campaignId?: string | "all";
    platform?: string;
    accountId?: string;
  },
) {
  // 1. Get Org & Ad Account
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (!member) return null;

  // Build query for ad accounts
  let query = supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", member.organization_id as string)
    .eq("platform", "meta") // Currently supporting Meta
    .eq("health_status", "healthy");

  if (filter?.accountId) {
    query = query.eq("id", filter.accountId);
  }

  // 1b. Get Local Campaign Metrics (Revenue/Sales)
  let campaignQuery = supabase
    .from("campaigns")
    .select(
      "revenue_ngn, sales_count, whatsapp_clicks, website_clicks, spend_cents, impressions, clicks",
    )
    .eq("organization_id", member.organization_id);

  if (filter?.accountId) {
    campaignQuery = campaignQuery.eq("ad_account_id", filter.accountId);
  }
  if (filter?.campaignId && filter.campaignId !== "all") {
    campaignQuery = campaignQuery.eq("id", filter.campaignId);
  }

  const [accountsRes, campaignsRes] = await Promise.all([query, campaignQuery]);

  const accounts = accountsRes.data;
  const localCampaigns = campaignsRes.data || [];

  if (!accounts || accounts.length === 0) {
    return {
      performance: [],
      demographics: { age: [], gender: [], region: [] },
      summary: { spend: "0", impressions: "0", clicks: "0", ctr: "0" },
    };
  }

  // For now, we aggregate across found accounts (usually 1 if filtered, or all)
  // In a real multi-account scenario we'd Promise.all map across them.
  // For MVP, let's take the first one or the selected one.
  const account = accounts[0];
  const token = decrypt(account.access_token);
  const actId = account.platform_account_id;

  try {
    // 2. Build Meta API URLs
    const datePreset = "last_30d"; // Can be dynamic later

    // A. Performance (Time Series)
    let perfUrl = `/act_${actId}/insights?date_preset=${datePreset}&time_increment=1&fields=spend,impressions,clicks,cpc,ctr,reach,date_start`;

    // B. Demographics (Breakdowns) - Cannot use time_increment with breakdowns usually, so we do separate calls
    // Note: Meta allows one breakdown type per call usually for complex metrics, or specific combos.
    const ageUrl = `/act_${actId}/insights?date_preset=${datePreset}&fields=spend,impressions,clicks&breakdowns=age`;
    const genderUrl = `/act_${actId}/insights?date_preset=${datePreset}&fields=spend,impressions,clicks&breakdowns=gender`;
    const regionUrl = `/act_${actId}/insights?date_preset=${datePreset}&fields=spend,impressions,clicks&breakdowns=region`;

    // Apply Filtering if Campaign ID is present
    if (filter?.campaignId && filter.campaignId !== "all") {
      const filtering = `&filtering=[{field:"campaign.id",operator:"IN",value:[${filter.campaignId}]}]`;
      perfUrl += filtering;
      // Append to breakdown URLs
      /*
         Note: Meta API syntax for filtering is standard.
         We need to construct it carefully.
      */
    }

    // 3. Parallel Fetch
    /*
      We use MetaService.request which expects the endpoint (without base).
      Standard endpoints are /act_<id>/insights...
    */
    const [perfRes, ageRes, genderRes, regionRes] = await Promise.all([
      MetaService.request(perfUrl, "GET", token),
      MetaService.request(ageUrl, "GET", token),
      MetaService.request(genderUrl, "GET", token),
      MetaService.request(regionUrl, "GET", token),
    ]);

    // 4. Process Data
    const performance = perfRes.data || [];
    const age = ageRes.data || [];
    const gender = genderRes.data || [];
    const region = regionRes.data || [];

    // Calculate Summary Totals from Performance Data
    const summary = performance.reduce(
      (acc: any, day: any) => ({
        spend: (parseFloat(acc.spend) + parseFloat(day.spend || 0)).toFixed(2),
        impressions: acc.impressions + parseInt(day.impressions || 0),
        clicks: acc.clicks + parseInt(day.clicks || 0),
      }),
      { spend: "0", impressions: 0, clicks: 0 },
    );

    // Calculate CTR safely
    // Calculate CTR safely
    summary.ctr =
      summary.impressions > 0
        ? ((summary.clicks / summary.impressions) * 100).toFixed(2)
        : "0";

    // Calculate CPC safely
    summary.cpc =
      summary.clicks > 0
        ? (parseFloat(summary.spend) / summary.clicks).toFixed(2)
        : "0";

    // Sum Reach (Approximation)
    summary.reach = performance
      .reduce((acc: number, day: any) => acc + parseInt(day.reach || 0), 0)
      .toString();

    // Calculate Local Metrics Summaries
    const localSummary = localCampaigns.reduce(
      (acc, c) => ({
        revenue: acc.revenue + (c.revenue_ngn || 0),
        sales: acc.sales + (c.sales_count || 0),
        whatsapp_clicks: acc.whatsapp_clicks + (c.whatsapp_clicks || 0),
        website_clicks: acc.website_clicks + (c.website_clicks || 0),
      }),
      { revenue: 0, sales: 0, whatsapp_clicks: 0, website_clicks: 0 },
    );

    return {
      performance,
      demographics: {
        age,
        gender,
        region,
      },
      summary: {
        ...summary,
        revenue: localSummary.revenue,
        sales: localSummary.sales,
        // We can overwrite clicks with local reliable data if we want, but Meta's time-series is better for trends.
        // For revenue-first dashboard, we definitely need revenue.
      },
    };
  } catch (error) {
    console.error("Dashboard Data Error:", error);
    return {
      performance: [],
      demographics: { age: [], gender: [], region: [] },
      summary: { spend: "0", impressions: "0", clicks: "0", ctr: "0" },
    };
  }
}

/**
 * Get recent campaigns for dashboard
 * Filters by organization_id to match RLS policy
 */
export async function getRecentCampaigns(
  supabase: SupabaseClient,
  limit: number = 5,
) {
  // 1. Get Current User
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 2. Get User's Organization ID
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return [];

  // 3. Fetch Recent Campaigns for that Organization
  const { data, error } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      ad_accounts (
        platform,
        currency
      )
    `,
    )
    .eq("organization_id", member.organization_id) // 👈 Explicit Filter
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent campaigns:", error);
    return [];
  }

  return (data || []).map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    platform: campaign.platform as "meta" | "tiktok",
    status: campaign.status as "active" | "paused" | "draft" | "completed",
    dailyBudgetCents: campaign.daily_budget_cents,
    createdAt: new Date(campaign.created_at || Date.now()),
    adAccount: campaign.ad_accounts
      ? {
          platform: campaign.ad_accounts.platform,
          currency: campaign.ad_accounts.currency || "NGN",
        }
      : null,
  }));
}
