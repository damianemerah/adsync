import { decrypt } from "@/lib/crypto";
import { MetaService } from "@/lib/api/meta";
import { SupabaseClient } from "@supabase/supabase-js";

export interface InsightsData {
  spend: string;
  impressions: string;
  clicks: string;
  cpc: string;
  ctr: string;
  reach: string;
}

/**
 * Server-side fetcher for dashboard insights
 * Fetches performance metrics from Meta API for the last 30 days
 */
export async function getInsights(
  supabase: SupabaseClient,
  userId: string
): Promise<InsightsData> {
  // 1. Get Org & Ad Account
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (!member) {
    // Return zeros if no org
    return {
      spend: "0",
      impressions: "0",
      clicks: "0",
      cpc: "0",
      ctr: "0",
      reach: "0",
    };
  }

  const { data: account } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", member.organization_id as string)
    .eq("platform", "meta")
    .eq("health_status", "healthy")
    .limit(1)
    .single();

  if (!account) {
    // Return zeros if no account connected
    return {
      spend: "0",
      impressions: "0",
      clicks: "0",
      cpc: "0",
      ctr: "0",
      reach: "0",
    };
  }

  try {
    // 2. Call Meta API
    const accessToken = decrypt(account.access_token);
    const data = await MetaService.getAccountInsights(
      accessToken,
      account.platform_account_id
    );

    // 3. Format Data
    const stats = data.data?.[0] || {};

    return {
      spend: stats.spend || "0",
      impressions: stats.impressions || "0",
      clicks: stats.clicks || "0",
      cpc: stats.cpc || "0",
      ctr: stats.ctr || "0",
      reach: stats.reach || "0",
    };
  } catch (error) {
    console.error("Insights Error:", error);
    // Return zeros on error
    return {
      spend: "0",
      impressions: "0",
      clicks: "0",
      cpc: "0",
      ctr: "0",
      reach: "0",
    };
  }
}

/**
 * Get recent campaigns for dashboard
 * Filters by organization_id to match RLS policy
 */
export async function getRecentCampaigns(
  supabase: SupabaseClient,
  limit: number = 5
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
    `
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
