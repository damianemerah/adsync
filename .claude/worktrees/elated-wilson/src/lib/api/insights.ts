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

  const accountsRes = await query;
  const accounts = accountsRes.data;

  if (!accounts || accounts.length === 0) {
    return {
      performance: [],
      demographics: { age: [], gender: [], region: [] },
      summary: { spend: "0", impressions: "0", clicks: "0", ctr: "0" },
    };
  }

  const account = accounts[0];

  // 1b. Get Local Campaign Metrics (Revenue/Sales/Clicks)
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

  // ─── THE 5-MINUTE CACHE-ON-READ RULE ───────────────────────────────────────
  // Check if we have fresh data (synced within the last 5 minutes).
  // If so, skip the Meta API call entirely and serve from DB.
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  const lastSynced = account.last_synced_at
    ? new Date(account.last_synced_at).getTime()
    : 0;
  const isFresh = Date.now() - lastSynced < FIVE_MINUTES_MS;

  if (isFresh) {
    // ── FAST PATH: Aggregate from DB (< 100ms) ──────────────────────────────
    console.log(
      `[Insights] Cache HIT for account ${account.id} (synced ${Math.round((Date.now() - lastSynced) / 1000)}s ago). Serving from DB.`,
    );

    const { data: localCampaigns } = await campaignQuery;
    const campaigns = localCampaigns || [];

    const localSummary = campaigns.reduce(
      (acc, c) => ({
        spend: acc.spend + (c.spend_cents || 0) / 100,
        impressions: acc.impressions + (c.impressions || 0),
        clicks: acc.clicks + (c.clicks || 0),
        revenue: acc.revenue + (c.revenue_ngn || 0),
        sales: acc.sales + (c.sales_count || 0),
        whatsapp_clicks: acc.whatsapp_clicks + (c.whatsapp_clicks || 0),
        website_clicks: acc.website_clicks + (c.website_clicks || 0),
      }),
      {
        spend: 0,
        impressions: 0,
        clicks: 0,
        revenue: 0,
        sales: 0,
        whatsapp_clicks: 0,
        website_clicks: 0,
      },
    );

    const ctr =
      localSummary.impressions > 0
        ? ((localSummary.clicks / localSummary.impressions) * 100).toFixed(2)
        : "0";
    const cpc =
      localSummary.clicks > 0
        ? (localSummary.spend / localSummary.clicks).toFixed(2)
        : "0";

    return {
      performance: [], // Time-series from campaign_metrics available on detail page
      demographics: { age: [], gender: [], region: [] },
      summary: {
        spend: localSummary.spend.toFixed(2),
        impressions: localSummary.impressions.toString(),
        clicks: localSummary.clicks.toString(),
        ctr,
        cpc,
        reach: "0",
        revenue: localSummary.revenue,
        sales: localSummary.sales,
      },
    };
  }

  // ── STALE PATH: Hit Meta API, update DB cache ────────────────────────────
  console.log(
    `[Insights] Cache MISS for account ${account.id} (last synced: ${account.last_synced_at ?? "never"}). Fetching from Meta.`,
  );

  const token = decrypt(account.access_token);
  const actId = account.platform_account_id;

  try {
    // 2. Build Meta API URLs
    const datePreset = "last_30d";

    let perfUrl = `/act_${actId}/insights?date_preset=${datePreset}&time_increment=1&fields=spend,impressions,clicks,cpc,ctr,reach,date_start`;
    const ageUrl = `/act_${actId}/insights?date_preset=${datePreset}&fields=spend,impressions,clicks&breakdowns=age`;
    const genderUrl = `/act_${actId}/insights?date_preset=${datePreset}&fields=spend,impressions,clicks&breakdowns=gender`;
    const regionUrl = `/act_${actId}/insights?date_preset=${datePreset}&fields=spend,impressions,clicks&breakdowns=region`;

    if (filter?.campaignId && filter.campaignId !== "all") {
      const filtering = `&filtering=[{field:"campaign.id",operator:"IN",value:[${filter.campaignId}]}]`;
      perfUrl += filtering;
    }

    // 3. Parallel Fetch from Meta
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

    const summary = performance.reduce(
      (acc: any, day: any) => ({
        spend: (parseFloat(acc.spend) + parseFloat(day.spend || 0)).toFixed(2),
        impressions: acc.impressions + parseInt(day.impressions || 0),
        clicks: acc.clicks + parseInt(day.clicks || 0),
      }),
      { spend: "0", impressions: 0, clicks: 0 },
    );

    summary.ctr =
      summary.impressions > 0
        ? ((summary.clicks / summary.impressions) * 100).toFixed(2)
        : "0";
    summary.cpc =
      summary.clicks > 0
        ? (parseFloat(summary.spend) / summary.clicks).toFixed(2)
        : "0";
    summary.reach = performance
      .reduce((acc: number, day: any) => acc + parseInt(day.reach || 0), 0)
      .toString();

    // 5. Local Revenue/Sales Summary
    const { data: localCampaigns } = await campaignQuery;
    const localSummary = (localCampaigns || []).reduce(
      (acc, c) => ({
        revenue: acc.revenue + (c.revenue_ngn || 0),
        sales: acc.sales + (c.sales_count || 0),
        whatsapp_clicks: acc.whatsapp_clicks + (c.whatsapp_clicks || 0),
        website_clicks: acc.website_clicks + (c.website_clicks || 0),
      }),
      { revenue: 0, sales: 0, whatsapp_clicks: 0, website_clicks: 0 },
    );

    // 6. ✅ Stamp last_synced_at so subsequent loads hit the fast path
    await supabase
      .from("ad_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", account.id);

    return {
      performance,
      demographics: { age, gender, region },
      summary: {
        ...summary,
        revenue: localSummary.revenue,
        sales: localSummary.sales,
      },
    };
  } catch (error) {
    console.error("Dashboard Data Error:", error);
    // Fallback: serve from DB even if stale rather than showing nothing
    const { data: localCampaigns } = await campaignQuery;
    const campaigns = localCampaigns || [];
    const localSummary = campaigns.reduce(
      (acc, c) => ({
        spend: acc.spend + (c.spend_cents || 0) / 100,
        impressions: acc.impressions + (c.impressions || 0),
        clicks: acc.clicks + (c.clicks || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0 },
    );

    return {
      performance: [],
      demographics: { age: [], gender: [], region: [] },
      summary: {
        spend: localSummary.spend.toFixed(2),
        impressions: localSummary.impressions.toString(),
        clicks: localSummary.clicks.toString(),
        ctr: "0",
        cpc: "0",
      },
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
