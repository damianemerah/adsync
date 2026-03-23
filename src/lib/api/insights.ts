import { decrypt } from "@/lib/crypto";
import { MetaService } from "@/lib/api/meta";
import { SupabaseClient } from "@supabase/supabase-js";
import { getActiveOrgId } from "@/lib/active-org";

/**
 * Server-side fetcher for dashboard insights.
 * Fast path (cache hit < 5 min): serves summary + performance chart from DB.
 * Stale path (cache miss): fetches from Meta API, persists to DB, then returns.
 */
export async function getDashboardData(
  supabase: SupabaseClient,
  userId: string,
  filter?: {
    campaignId?: string | "all";
    platform?: string;
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  // 1. Get active org ID from cookie
  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) return null;

  // Build query for ad accounts
  let query = supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", activeOrgId)
    .eq("platform", filter?.platform || "meta")
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
      summary: {
        spend: "0",
        impressions: "0",
        clicks: "0",
        ctr: "0",
        cpc: "0",
        reach: "0",
      },
    };
  }

  const account = accounts[0];

  // Campaign-level query for revenue/sales (platform-tracked) + aggregate spend metrics
  let campaignQuery = supabase
    .from("campaigns")
    .select(
      "revenue_ngn, sales_count, whatsapp_clicks, website_clicks, spend_cents, impressions, clicks",
    )
    .eq("organization_id", activeOrgId);

  if (filter?.accountId) {
    campaignQuery = campaignQuery.eq("ad_account_id", filter.accountId);
  }
  if (filter?.campaignId && filter.campaignId !== "all") {
    campaignQuery = campaignQuery.eq("id", filter.campaignId);
  }

  // ─── 5-MINUTE CACHE-ON-READ ────────────────────────────────────────────────
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  const lastSynced = account.last_synced_at
    ? new Date(account.last_synced_at).getTime()
    : 0;
  const isFresh = Date.now() - lastSynced < FIVE_MINUTES_MS;

  if (isFresh) {
    // ── FAST PATH: serve everything from DB ──────────────────────────────────
    console.log(
      `[Insights] Cache HIT for account ${account.id} (synced ${Math.round((Date.now() - lastSynced) / 1000)}s ago). Serving from DB.`,
    );

    let dailyQuery = supabase
      .from("campaign_metrics")
      .select(
        "date, spend_cents, impressions, clicks, reach, ctr, campaigns!inner(ad_account_id, organization_id)",
      )
      .eq("campaigns.ad_account_id", account.id)
      .eq("campaigns.organization_id", activeOrgId)
      .order("date", { ascending: true });

    if (filter?.campaignId && filter.campaignId !== "all") {
      dailyQuery = dailyQuery.eq("campaign_id", filter.campaignId);
    }
    if (filter?.dateFrom) dailyQuery = dailyQuery.gte("date", filter.dateFrom);
    if (filter?.dateTo) dailyQuery = dailyQuery.lte("date", filter.dateTo);
    if (!filter?.dateFrom && !filter?.dateTo) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      dailyQuery = dailyQuery.gte("date", thirtyDaysAgo);
    }

    const [{ data: localCampaigns }, { data: dailyRows }] = await Promise.all([
      campaignQuery,
      dailyQuery,
    ]);

    console.log("Local Campaigns🔥", localCampaigns?.length);

    const campaigns = localCampaigns || [];

    const localSummary = campaigns.reduce(
      (acc, c) => ({
        revenue: acc.revenue + (c.revenue_ngn || 0),
        sales: acc.sales + (c.sales_count || 0),
        whatsapp_clicks: acc.whatsapp_clicks + (c.whatsapp_clicks || 0),
        website_clicks: acc.website_clicks + (c.website_clicks || 0),
      }),
      {
        revenue: 0,
        sales: 0,
        whatsapp_clicks: 0,
        website_clicks: 0,
      },
    );

    let filteredSpendCents = 0;
    let filteredImpressions = 0;
    let filteredClicks = 0;
    for (const row of dailyRows ?? []) {
      filteredSpendCents += row.spend_cents ?? 0;
      filteredImpressions += row.impressions ?? 0;
      filteredClicks += row.clicks ?? 0;
    }
    const spend = filteredSpendCents / 100;

    const ctr =
      filteredImpressions > 0
        ? ((filteredClicks / filteredImpressions) * 100).toFixed(2)
        : "0";
    const cpc = filteredClicks > 0 ? (spend / filteredClicks).toFixed(2) : "0";

    // Aggregate campaign_metrics rows by date for the performance chart
    const byDate = new Map<
      string,
      {
        spend: number;
        impressions: number;
        clicks: number;
        reach: number;
        totalImprForCtr: number;
        weightedCtr: number;
      }
    >();
    for (const row of dailyRows ?? []) {
      const existing = byDate.get(row.date) ?? {
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        totalImprForCtr: 0,
        weightedCtr: 0,
      };
      existing.spend += row.spend_cents ?? 0;
      existing.impressions += row.impressions ?? 0;
      existing.clicks += row.clicks ?? 0;
      existing.reach += row.reach ?? 0;
      existing.totalImprForCtr += row.impressions ?? 0;
      existing.weightedCtr += (row.ctr ?? 0) * (row.impressions ?? 0);
      byDate.set(row.date, existing);
    }
    const performance = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        spend: v.spend / 100,
        impressions: v.impressions,
        clicks: v.clicks,
        reach: v.reach,
        ctr: v.totalImprForCtr > 0 ? v.weightedCtr / v.totalImprForCtr : 0,
      }));

    // Use cached demographics if available, else empty arrays
    const cachedDemographics = (account as any).demographics_cache ?? {
      age: [],
      gender: [],
      region: [],
    };

    return {
      performance,
      demographics: cachedDemographics,
      summary: {
        spend: spend.toFixed(2),
        impressions: filteredImpressions.toString(),
        clicks: filteredClicks.toString(),
        ctr,
        cpc,
        reach: "0",
        revenue: localSummary.revenue,
        sales: localSummary.sales,
      },
    };
  }

  // ── STALE PATH: fetch from Meta, persist to DB ───────────────────────────
  console.log(
    `[Insights] Cache MISS for account ${account.id} (last synced: ${account.last_synced_at ?? "never"}). Fetching from Meta.`,
  );

  const token = decrypt(account.access_token);
  const actId = account.platform_account_id;

  try {
    const dateParam =
      filter?.dateFrom && filter?.dateTo
        ? `time_range=${encodeURIComponent(JSON.stringify({ since: filter.dateFrom, until: filter.dateTo }))}`
        : `date_preset=last_30d`;

    let perfUrl = `/act_${actId}/insights?${dateParam}&time_increment=1&fields=spend,impressions,clicks,cpc,ctr,reach,date_start`;
    const ageUrl = `/act_${actId}/insights?${dateParam}&fields=spend,impressions,clicks&breakdowns=age`;
    const genderUrl = `/act_${actId}/insights?${dateParam}&fields=spend,impressions,clicks&breakdowns=gender`;
    const regionUrl = `/act_${actId}/insights?${dateParam}&fields=spend,impressions,clicks&breakdowns=region`;

    if (filter?.campaignId && filter.campaignId !== "all") {
      const filtering = `&filtering=[{field:"campaign.id",operator:"IN",value:[${filter.campaignId}]}]`;
      perfUrl += filtering;
    }

    const [perfRes, ageRes, genderRes, regionRes] = await Promise.all([
      MetaService.request(perfUrl, "GET", token),
      MetaService.request(ageUrl, "GET", token),
      MetaService.request(genderUrl, "GET", token),
      MetaService.request(regionUrl, "GET", token),
    ]);

    const performance = perfRes.data || [];
    const age = ageRes.data || [];
    const gender = genderRes.data || [];
    const region = regionRes.data || [];

    // Persist demographics cache + stamp last_synced_at
    const demographics = { age, gender, region };
    await supabase
      .from("ad_accounts")
      .update({
        last_synced_at: new Date().toISOString(),
        demographics_cache: demographics,
      })
      .eq("id", account.id);

    // Persist daily performance data to campaign_metrics for cache consistency
    // This ensures the fast path (DB cache) has the same data as the stale path (Meta API)
    if (performance.length > 0 && filter?.campaignId && filter.campaignId !== "all") {
      const metricsToUpsert = performance.map((day: any) => ({
        campaign_id: filter.campaignId,
        date: day.date_start,
        impressions: parseInt(day.impressions || "0"),
        clicks: parseInt(day.clicks || "0"),
        spend_cents: Math.round(parseFloat(day.spend || "0") * 100),
        reach: parseInt(day.reach || "0"),
        ctr: parseFloat(day.ctr || "0"),
        synced_at: new Date().toISOString(),
      }));

      // Upsert to handle updates to existing dates
      await supabase.from("campaign_metrics").upsert(metricsToUpsert, {
        onConflict: "campaign_id,date",
      });

      // Update campaign-level aggregates for real-time metrics
      const totalSpendCents = metricsToUpsert.reduce(
        (sum: number, m: any) => sum + (m.spend_cents || 0),
        0,
      );
      const totalImpressions = metricsToUpsert.reduce(
        (sum: number, m: any) => sum + (m.impressions || 0),
        0,
      );
      const totalClicks = metricsToUpsert.reduce(
        (sum: number, m: any) => sum + (m.clicks || 0),
        0,
      );
      const avgCtr =
        totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      await supabase
        .from("campaigns")
        .update({
          spend_cents: totalSpendCents,
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: avgCtr,
        })
        .eq("id", filter.campaignId);
    }

    // Build summary totals from daily rows
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

    return {
      performance: performance.map((day: any) => ({
        date: day.date_start,
        spend: parseFloat(day.spend || "0"),
        impressions: parseInt(day.impressions || "0"),
        clicks: parseInt(day.clicks || "0"),
        reach: parseInt(day.reach || "0"),
        ctr: parseFloat(day.ctr || "0"),
      })),
      demographics,
      summary: {
        ...summary,
        revenue: localSummary.revenue,
        sales: localSummary.sales,
      },
    };
  } catch (error) {
    console.error("Dashboard Data Error:", error);
    // Fallback: serve from DB even on Meta API failure
    const { data: localCampaigns } = await campaignQuery;
    const campaigns = localCampaigns || [];
    const localSummary = campaigns.reduce(
      (acc, c) => ({
        revenue: acc.revenue + (c.revenue_ngn || 0),
        sales: acc.sales + (c.sales_count || 0),
        whatsapp_clicks: acc.whatsapp_clicks + (c.whatsapp_clicks || 0),
        website_clicks: acc.website_clicks + (c.website_clicks || 0),
      }),
      { revenue: 0, sales: 0, whatsapp_clicks: 0, website_clicks: 0 },
    );

    let fallbackQuery = supabase
      .from("campaign_metrics")
      .select(
        "date, spend_cents, impressions, clicks, reach, ctr, campaigns!inner(ad_account_id, organization_id)",
      )
      .eq("campaigns.ad_account_id", account.id)
      .eq("campaigns.organization_id", activeOrgId)
      .order("date", { ascending: true });
    if (filter?.campaignId && filter.campaignId !== "all") {
      fallbackQuery = fallbackQuery.eq("campaign_id", filter.campaignId);
    }
    if (filter?.dateFrom) {
      fallbackQuery = fallbackQuery.gte("date", filter.dateFrom);
    }
    if (filter?.dateTo) {
      fallbackQuery = fallbackQuery.lte("date", filter.dateTo);
    }
    if (!filter?.dateFrom && !filter?.dateTo) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      fallbackQuery = fallbackQuery.gte("date", thirtyDaysAgo);
    }

    const { data: fallbackRows } = await fallbackQuery;

    let filteredSpendCents = 0;
    let filteredImpressions = 0;
    let filteredClicks = 0;
    for (const row of fallbackRows ?? []) {
      filteredSpendCents += row.spend_cents ?? 0;
      filteredImpressions += row.impressions ?? 0;
      filteredClicks += row.clicks ?? 0;
    }
    const spend = filteredSpendCents / 100;
    const ctr =
      filteredImpressions > 0
        ? ((filteredClicks / filteredImpressions) * 100).toFixed(2)
        : "0";
    const cpc = filteredClicks > 0 ? (spend / filteredClicks).toFixed(2) : "0";

    const fallbackByDate = new Map<
      string,
      {
        spend: number;
        impressions: number;
        clicks: number;
        reach: number;
        totalImprForCtr: number;
        weightedCtr: number;
      }
    >();
    for (const row of fallbackRows ?? []) {
      const existing = fallbackByDate.get(row.date) ?? {
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        totalImprForCtr: 0,
        weightedCtr: 0,
      };
      existing.spend += row.spend_cents ?? 0;
      existing.impressions += row.impressions ?? 0;
      existing.clicks += row.clicks ?? 0;
      existing.reach += row.reach ?? 0;
      existing.totalImprForCtr += row.impressions ?? 0;
      existing.weightedCtr += (row.ctr ?? 0) * (row.impressions ?? 0);
      fallbackByDate.set(row.date, existing);
    }
    const fallbackPerformance = Array.from(fallbackByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        spend: v.spend / 100,
        impressions: v.impressions,
        clicks: v.clicks,
        reach: v.reach,
        ctr: v.totalImprForCtr > 0 ? v.weightedCtr / v.totalImprForCtr : 0,
      }));

    return {
      performance: fallbackPerformance,
      demographics: (account as any).demographics_cache ?? {
        age: [],
        gender: [],
        region: [],
      },
      summary: {
        spend: spend.toFixed(2),
        impressions: filteredImpressions.toString(),
        clicks: filteredClicks.toString(),
        ctr,
        cpc,
        reach: "0",
        revenue: localSummary.revenue,
        sales: localSummary.sales,
      },
    };
  }
}

/**
 * Get recent campaigns for dashboard
 */
export async function getRecentCampaigns(
  supabase: SupabaseClient,
  limit: number = 5,
) {
  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) return [];

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
    .eq("organization_id", activeOrgId)
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
