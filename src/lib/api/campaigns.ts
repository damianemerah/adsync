import { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { MetaService } from "@/lib/api/meta";
import { getActiveOrgId } from "@/lib/active-org";

/**
 * Server-side fetcher for a single campaign by ID with real-time Meta insights
 * Fetches both campaign details from DB and performance metrics from Meta API
 */
export async function getCampaignById(supabase: SupabaseClient, id: string) {
  // 1. Fetch Campaign & Account Info from DB
  const { data, error } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      ad_accounts (
        platform_account_id,
        platform,
        currency,
        account_name,
        access_token
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

  // Initialize Data Buckets
  let performanceData = [];
  let demographics: { age: any[]; gender: any[] } = { age: [], gender: [] };
  let ads: any[] = [];
  let summary = {
    spend: 0,
    clicks: 0,
    impressions: 0,
    ctr: 0,
    cpc: 0,
    reach: 0,
    revenue: 0,
    sales: 0,
    roas: 0,
  };
  let accountBalance = null;

  // 2. Live Fetch from Meta
  if (data.platform === "meta" && data.ad_accounts?.access_token) {
    // Fast-path: check if campaign_metrics has fresh data (within last 5 minutes)
    const { data: latestMetric } = await supabase
      .from("campaign_metrics")
      .select("synced_at")
      .eq("campaign_id", id)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isFresh =
      latestMetric?.synced_at &&
      Date.now() - new Date(latestMetric.synced_at).getTime() < 5 * 60 * 1000;

    // Ads freshness check (15-minute TTL)
    const { data: freshAd } = await supabase
      .from("ads")
      .select("synced_at")
      .eq("campaign_id", id)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const adsAreFresh =
      freshAd?.synced_at &&
      Date.now() - new Date(freshAd.synced_at).getTime() < 15 * 60 * 1000;

    if (adsAreFresh) {
      const { data: cachedAds } = await supabase
        .from("ads")
        .select(
          "platform_ad_id, name, status, creative_snapshot, clicks, impressions, spend_cents, ctr",
        )
        .eq("campaign_id", id);
      ads = (cachedAds || []).map((ad: any) => ({
        id: ad.platform_ad_id,
        name: ad.name,
        status: ad.status,
        image:
          ad.creative_snapshot?.thumbnail_url ||
          ad.creative_snapshot?.image_url ||
          "/placeholder.svg",
        clicks: ad.clicks || 0,
        spend: (ad.spend_cents || 0) / 100,
        ctr: ad.ctr || 0,
        impressions: ad.impressions || 0,
      }));
    }

    // Demographics freshness check (1-hour TTL)
    const demoIsFresh =
      data.demographics_synced_at &&
      Date.now() - new Date(data.demographics_synced_at).getTime() <
        60 * 60 * 1000;

    if (demoIsFresh && data.demographics_cache) {
      demographics = data.demographics_cache as { age: any[]; gender: any[] };
    }

    if (isFresh) {
      const { data: dbMetrics } = await supabase
        .from("campaign_metrics")
        .select("*")
        .eq("campaign_id", id)
        .order("date", { ascending: true });

      if (dbMetrics && dbMetrics.length > 0) {
        performanceData = dbMetrics.map((m: any) => ({
          date: new Date(m.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          spend: (m.spend_cents || 0) / 100,
          clicks: m.clicks || 0,
          impressions: m.impressions || 0,
        }));

        summary = dbMetrics.reduce(
          (acc: any, m: any) => ({
            spend: acc.spend + (m.spend_cents || 0) / 100,
            clicks: acc.clicks + (m.clicks || 0),
            impressions: acc.impressions + (m.impressions || 0),
            reach: acc.reach + (m.reach || 0),
          }),
          { spend: 0, clicks: 0, impressions: 0, reach: 0 },
        );
        summary.ctr = summary.impressions
          ? (summary.clicks / summary.impressions) * 100
          : 0;
        summary.cpc = summary.clicks ? summary.spend / summary.clicks : 0;
      }
    }

    try {
      const token = decrypt(data.ad_accounts.access_token);
      const campId = data.platform_campaign_id;
      const accId = data.ad_accounts.platform_account_id;

      // PARALLEL FETCHING for Speed — skip calls when cached data is fresh
      const [insightsRes, demoRes, adsRes, balanceRes] = await Promise.all([
        isFresh
          ? Promise.resolve({ data: null })
          : MetaService.getCampaignInsights(token, campId),
        demoIsFresh
          ? Promise.resolve({ data: null })
          : MetaService.getCampaignDemographics(token, campId),
        adsAreFresh
          ? Promise.resolve({ data: null })
          : MetaService.getCampaignAds(token, campId),
        // Use the account ID from DB (usually numeric). MetaService handles adding 'act_' prefix if needed.
        MetaService.getAdAccountBalance(token, accId),
      ]);

      console.log("insightsRes🔥", insightsRes);
      console.log("demoRes🔥", demoRes);
      console.log("adsRes🔥", adsRes);

      // --- A. Process Time Series & SAVE TO DB ---
      if (insightsRes.data && insightsRes.data.length > 0) {
        // 1. Map for UI
        performanceData = insightsRes.data
          .map((day: any) => ({
            date: new Date(day.date_start).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            spend: parseFloat(day.spend || "0"),
            clicks: parseInt(day.clicks || "0", 10),
            impressions: parseInt(day.impressions || "0", 10),
          }))
          .reverse();

        // 2. Calculate Summary
        summary = insightsRes.data.reduce(
          (acc: any, day: any) => ({
            spend: acc.spend + parseFloat(day.spend || "0"),
            clicks: acc.clicks + parseInt(day.clicks || "0", 10),
            impressions: acc.impressions + parseInt(day.impressions || "0", 10),
            reach: acc.reach + parseInt(day.reach || "0", 10),
          }),
          { spend: 0, clicks: 0, impressions: 0, reach: 0 },
        );

        summary.ctr = summary.impressions
          ? (summary.clicks / summary.impressions) * 100
          : 0;
        summary.cpc = summary.clicks ? summary.spend / summary.clicks : 0;

        // 3. ✅ NEW: Save Daily Snapshots to Database (Cache-on-Read)
        // We prepare an array of metrics to upsert
        const metricsToUpsert = insightsRes.data.map((day: any) => ({
          campaign_id: data.id,
          date: day.date_start, // SQL Date Format YYYY-MM-DD
          spend_cents: Math.round(parseFloat(day.spend || "0") * 100),
          clicks: parseInt(day.clicks || "0", 10),
          impressions: parseInt(day.impressions || "0", 10),
          reach: parseInt(day.reach || "0", 10),
          ctr: parseFloat(day.ctr || "0"),
          synced_at: new Date().toISOString(),
        }));

        // Fire and forget (don't await to block UI, or await if you want strict consistency)
        // Using 'upsert' with onConflict on (campaign_id, date)
        await supabase.from("campaign_metrics").upsert(metricsToUpsert, {
          onConflict: "campaign_id, date",
        });
      }

      // --- B. Process Demographics ---
      if (demoRes.data && demoRes.data.length > 0) {
        demographics.age = demoRes.data.map((d: any) => ({
          name: d.age,
          value: parseInt(d.reach),
        }));
        demographics.gender = demoRes.data.reduce((acc: any[], d: any) => {
          const existing = acc.find((x: any) => x.name === d.gender);
          if (existing) existing.value += parseInt(d.reach);
          else acc.push({ name: d.gender, value: parseInt(d.reach) });
          return acc;
        }, []);

        // Persist to campaigns table (fire-and-forget)
        await supabase
          .from("campaigns")
          .update({
            demographics_cache: demographics,
            demographics_synced_at: new Date().toISOString(),
          })
          .eq("id", id);
      }

      // --- C. Process Ads ---
      if (adsRes.data && adsRes.data.length > 0) {
        const now = new Date().toISOString();

        ads = adsRes.data.map((ad: any) => ({
          id: ad.id,
          name: ad.name,
          status: ad.status.toLowerCase(),
          image:
            ad.creative?.thumbnail_url ||
            ad.creative?.image_url ||
            "/placeholder.svg",
          clicks: ad.insights?.data?.[0]?.clicks || 0,
          spend: ad.insights?.data?.[0]?.spend || 0,
          ctr: ad.insights?.data?.[0]?.ctr || 0,
          impressions: parseInt(ad.insights?.data?.[0]?.impressions || "0"),
        }));

        // Upsert to ads table for cache-on-read
        const adsToUpsert = adsRes.data.map((ad: any) => ({
          platform_ad_id: ad.id,
          campaign_id: data.id,
          name: ad.name,
          status: ad.status.toLowerCase(),
          creative_snapshot: {
            thumbnail_url: ad.creative?.thumbnail_url || null,
            image_url: ad.creative?.image_url || null,
          },
          clicks: parseInt(ad.insights?.data?.[0]?.clicks || "0", 10),
          impressions: parseInt(ad.insights?.data?.[0]?.impressions || "0", 10),
          spend_cents: Math.round(
            parseFloat(ad.insights?.data?.[0]?.spend || "0") * 100,
          ),
          ctr: parseFloat(ad.insights?.data?.[0]?.ctr || "0"),
          synced_at: now,
        }));

        await supabase
          .from("ads")
          .upsert(adsToUpsert, { onConflict: "platform_ad_id" });
      }

      // --- D. Process Balance ---
      accountBalance = balanceRes.balance
        ? parseInt(balanceRes.balance) / 100
        : 0;
    } catch (e) {
      console.error("Meta Fetch Error:", e);

      // FALLBACK: If Meta API fails (e.g. Rate Limit), fetch historical data from DB
      const { data: dbMetrics } = await supabase
        .from("campaign_metrics")
        .select("*")
        .eq("campaign_id", id)
        .order("date", { ascending: true });

      if (dbMetrics && dbMetrics.length > 0) {
        performanceData = dbMetrics.map((m: any) => ({
          date: new Date(m.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          spend: (m.spend_cents || 0) / 100,
          clicks: m.clicks || 0,
          impressions: m.impressions || 0,
        }));
      }

      // Serve cached ads from DB
      if (!adsAreFresh) {
        const { data: cachedAds } = await supabase
          .from("ads")
          .select(
            "platform_ad_id, name, status, creative_snapshot, clicks, impressions, spend_cents, ctr",
          )
          .eq("campaign_id", id);
        if (cachedAds?.length) {
          ads = cachedAds.map((ad: any) => ({
            id: ad.platform_ad_id,
            name: ad.name,
            status: ad.status,
            image:
              ad.creative_snapshot?.thumbnail_url ||
              ad.creative_snapshot?.image_url ||
              "/placeholder.svg",
            clicks: ad.clicks || 0,
            spend: (ad.spend_cents || 0) / 100,
            ctr: ad.ctr || 0,
            impressions: ad.impressions || 0,
          }));
        }
      }

      // Serve cached demographics from DB
      if (!demoIsFresh && data.demographics_cache) {
        demographics = data.demographics_cache as { age: any[]; gender: any[] };
      }
    }
  }

  // Fetch pixel token for website attribution links (if any)
  let pixelToken: string | null = null;
  const { data: websiteLink } = await supabase
    .from("attribution_links")
    .select("pixel_token")
    .eq("campaign_id", id)
    .eq("destination_type", "website")
    .not("pixel_token", "is", null)
    .limit(1)
    .maybeSingle();
  if (websiteLink?.pixel_token) {
    pixelToken = websiteLink.pixel_token;
  }

  return {
    id: data.id,
    name: data.name,
    platform: data.platform as "meta" | "tiktok",
    status: data.status as "active" | "paused" | "draft" | "completed",
    objective: data.objective,
    dailyBudgetCents: data.daily_budget_cents,
    totalBudgetCents: data.total_budget_cents,
    platformCampaignId: data.platform_campaign_id,
    platformAdsetId: data.platform_adset_id,
    platformAdId: data.platform_ad_id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    launchedAt: data.launched_at ? new Date(data.launched_at) : null,
    // Related data
    adAccount: data.ad_accounts
      ? {
          platformAccountId: data.ad_accounts.platform_account_id,
          platform: data.ad_accounts.platform,
          currency: data.ad_accounts.currency || "NGN",
          accountName: data.ad_accounts.account_name,
        }
      : null,
    // Add new fields to return object
    adSets: [], // Would fetch similarly if needed
    ads: ads,
    demographics,
    accountBalance,
    // ... existing fields
    performance: performanceData,
    summary,
    // Attribution
    pixelToken,
    salesCount: data.sales_count || 0,
    revenueNgn: data.revenue_ngn || 0,
    whatsappClicks: data.whatsapp_clicks || 0,
    websiteClicks: data.website_clicks || 0,
    whatsappClickRate: data.whatsapp_click_rate || 0,
  };
}

/**
 * Server-side fetcher for all campaigns
 * Used in the campaigns list page
 * Note: Relies on RLS policies to filter campaigns by organization/user
 */
export async function getCampaigns(supabase: SupabaseClient) {
  // 1. Get active org ID from cookie
  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) return [];

  // 2. Fetch Campaigns for that Organization
  const { data, error } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      ad_accounts (
        platform,
        currency,
        account_name
      )
    `,
    )
    .eq("organization_id", activeOrgId) // 👈 Explicit Filter by active org
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((campaign: any) => ({
    id: campaign.id,
    name: campaign.name,
    // Cast types safely based on your DB Check constraints
    platform: campaign.platform as "meta" | "tiktok",
    status: campaign.status as "active" | "paused" | "draft" | "completed",
    dailyBudgetCents: campaign.daily_budget_cents,
    platformCampaignId: campaign.platform_campaign_id,
    createdAt: new Date(campaign.created_at || Date.now()), // Handle potential nulls

    // ✅ NEW: Map the cached metrics from DB
    clicks: campaign.clicks || 0,
    impressions: campaign.impressions || 0,
    spend: (campaign.spend_cents || 0) / 100, // Convert cents to main currency
    ctr: Number(campaign.ctr || 0),
    objective: campaign.objective,
    revenueNgn: campaign.revenue_ngn || 0,
    salesCount: campaign.sales_count || 0,
    whatsappClicks: campaign.whatsapp_clicks || 0,
    websiteClicks: campaign.website_clicks || 0,
    whatsappClickRate: campaign.whatsapp_click_rate || 0,

    // Handle Relations safely
    ad_account_id: campaign.ad_account_id,
    adAccount: campaign.ad_accounts
      ? {
          platform: campaign.ad_accounts.platform,
          currency: campaign.ad_accounts.currency || "NGN",
          accountName: campaign.ad_accounts.account_name,
        }
      : null,
  }));
}

/**
 * Type for a campaign returned by getCampaignById
 */
export type Campaign = NonNullable<Awaited<ReturnType<typeof getCampaignById>>>;

/**
 * Type for campaigns returned by getCampaigns
 */
export type CampaignListItem = Awaited<ReturnType<typeof getCampaigns>>[number];
