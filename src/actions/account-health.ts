"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";

export type CheckStatus = "healthy" | "warning" | "critical" | "loading";

export interface HealthCheck {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  problemCount?: number;
  detail?: string; // Expanded detail shown when chevron is clicked
  actionLabel?: string;
  actionUrl?: string;
}

export interface AccountHealthResult {
  totalProblems: number;
  checks: HealthCheck[];
  scannedAt: string;
}

export async function getAccountHealth(): Promise<AccountHealthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get the user's organization
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  const { data: orgData } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .single();

  if (!orgData) throw new Error("No organization found");

  // Credits are user-scoped — fetch from users table
  const { data: userData } = await supabase
    .from("users")
    .select("credits_balance, plan_credits_quota")
    .eq("id", user.id)
    .single();

  // Fetch all connected ad accounts for this org
  const { data: adAccounts } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", orgId);

  // Fetch active campaigns
  const { data: activeCampaigns } = await supabase
    .from("campaigns")
    .select("id, name, status, spend_cents, impressions, created_at")
    .eq("organization_id", orgId)
    .eq("status", "active");

  // Fetch spend in last 7 days from campaign_metrics
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentMetrics } = await supabase
    .from("campaign_metrics")
    .select("spend_cents, campaign_id")
    .gte("date", sevenDaysAgo.toISOString().split("T")[0]);

  const totalSpend7d = (recentMetrics || []).reduce(
    (sum, m) => sum + (m.spend_cents || 0),
    0,
  );

  // Fetch rejected ads
  const { data: rejectedAds } = await supabase
    .from("ads")
    .select("id, name, rejection_reason")
    .eq("status", "rejected")
    .limit(5);

  // ── BUILD CHECKS ────────────────────────────────────────────────────────

  const checks: HealthCheck[] = [];
  let totalProblems = 0;

  // 1. Ad Account Status
  const noAccounts = !adAccounts || adAccounts.length === 0;
  const expiredAccounts = (adAccounts || []).filter(
    (a) =>
      a.health_status === "token_expired" || a.health_status === "disabled",
  );
  const paymentIssueAccounts = (adAccounts || []).filter(
    (a) => a.health_status === "payment_issue",
  );

  if (noAccounts) {
    totalProblems++;
    checks.push({
      id: "ad_account_status",
      label: "Ad Account Connection",
      description: "No ad accounts connected to your workspace.",
      status: "critical",
      problemCount: 1,
      detail:
        "Connect a Meta Ads account to start running and monitoring campaigns.",
      actionLabel: "Connect Account",
      actionUrl: "/settings/general",
    });
  } else if (expiredAccounts.length > 0) {
    totalProblems += expiredAccounts.length;
    checks.push({
      id: "ad_account_status",
      label: "Ad Account Status",
      description: `${expiredAccounts.length} account(s) have connection issues.`,
      status: "critical",
      problemCount: expiredAccounts.length,
      detail: `Affected accounts: ${expiredAccounts.map((a) => a.nickname || a.account_name || a.platform_account_id).join(", ")}. Reconnect to resume campaign management.`,
      actionLabel: "Reconnect",
      actionUrl: "/settings/general",
    });
  } else if (paymentIssueAccounts.length > 0) {
    totalProblems += paymentIssueAccounts.length;
    checks.push({
      id: "ad_account_status",
      label: "Ad Account Status",
      description: `${paymentIssueAccounts.length} account(s) missing a payment method.`,
      status: "critical",
      problemCount: paymentIssueAccounts.length,
      detail: `Affected accounts: ${paymentIssueAccounts.map((a) => a.nickname || a.account_name || a.platform_account_id).join(", ")}. Add a payment method in your Meta Billing center to resume campaigns.`,
      actionLabel: "Fix Billing",
      actionUrl: "/settings/general",
    });
  } else {
    checks.push({
      id: "ad_account_status",
      label: "Ad Account Status",
      description: `${adAccounts!.length} account(s) connected and healthy.`,
      status: "healthy",
    });
  }

  // 2. Activity in Last 7 Days
  if (totalSpend7d === 0 && (adAccounts?.length ?? 0) > 0) {
    totalProblems++;
    checks.push({
      id: "recent_activity",
      label: "Activity in Last 7 Days",
      description: "Your ad accounts have no spend in the past week.",
      status: "warning",
      problemCount: 1,
      detail:
        "No ad spend recorded in the last 7 days. If you have active campaigns, try syncing your account or check your Meta Ads Manager.",
      actionLabel: "Sync Account",
      actionUrl: "/dashboard",
    });
  } else {
    checks.push({
      id: "recent_activity",
      label: "Activity in Last 7 Days",
      description: `₦${(totalSpend7d / 100).toLocaleString()} spent across all campaigns.`,
      status: "healthy",
    });
  }

  // 3. Active Campaigns Count
  const activeCount = activeCampaigns?.length ?? 0;
  if (activeCount === 0) {
    totalProblems++;
    checks.push({
      id: "active_campaigns",
      label: "Active Campaigns",
      description: "No active campaigns running in your account.",
      status: "warning",
      problemCount: 1,
      detail:
        "You have no campaigns currently running. Create a new campaign to start reaching your audience.",
      actionLabel: "Create Campaign",
      actionUrl: "/campaigns/new",
    });
  } else {
    checks.push({
      id: "active_campaigns",
      label: "Active Campaigns",
      description: `${activeCount} campaign${activeCount > 1 ? "s" : ""} currently running.`,
      status: "healthy",
    });
  }

  // 4. Ad Rejections
  const rejectedCount = rejectedAds?.length ?? 0;
  if (rejectedCount > 0) {
    totalProblems += rejectedCount;
    checks.push({
      id: "ad_rejections",
      label: "Ad Approval Status",
      description: `${rejectedCount} ad(s) were rejected by Meta.`,
      status: "critical",
      problemCount: rejectedCount,
      detail: `Rejected ads: ${(rejectedAds || []).map((a) => a.name).join(", ")}. Review and fix creative or copy to comply with Meta's policies.`,
      actionLabel: "View Campaigns",
      actionUrl: "/campaigns",
    });
  } else {
    checks.push({
      id: "ad_rejections",
      label: "Ad Approval Status",
      description: "All ads are approved and running.",
      status: "healthy",
    });
  }

  // 5. Account Balance (Low Funds)
  const lowBalanceAccounts = (adAccounts || []).filter(
    (a) =>
      a.last_known_balance_cents !== null &&
      a.last_known_balance_cents < 200000, // < ₦2,000
  );
  if (lowBalanceAccounts.length > 0) {
    totalProblems++;
    checks.push({
      id: "account_balance",
      label: "Ad Account Balance",
      description: `${lowBalanceAccounts.length} account(s) have a low balance.`,
      status: "warning",
      problemCount: lowBalanceAccounts.length,
      detail: `Accounts with low balance: ${lowBalanceAccounts.map((a) => `${a.nickname || a.account_name} (₦${((a.last_known_balance_cents || 0) / 100).toLocaleString()})`).join(", ")}. Top up to keep ads running without interruption.`,
      actionLabel: "Top Up",
      actionUrl: "/settings/subscription#budget",
    });
  } else if ((adAccounts?.length ?? 0) > 0) {
    checks.push({
      id: "account_balance",
      label: "Ad Account Balance",
      description: "Account balance is sufficient to run campaigns.",
      status: "healthy",
    });
  }

  // 6. Subscription / Credits (user-scoped, shared across all orgs)
  const creditsBalance = userData?.credits_balance ?? 0;
  const creditsQuota = userData?.plan_credits_quota ?? 100;
  const creditsPercent =
    creditsQuota > 0 ? (creditsBalance / creditsQuota) * 100 : 100;

  if (creditsPercent < 10) {
    totalProblems++;
    checks.push({
      id: "credits_balance",
      label: "AI Credits Balance",
      description: `Only ${creditsBalance.toLocaleString()} credits remaining (${Math.round(creditsPercent)}% left).`,
      status: "critical",
      problemCount: 1,
      detail:
        "Your AI credits are nearly depleted. Upgrade your plan or purchase a credit pack to keep generating creatives.",
      actionLabel: "Get Credits",
      actionUrl: "/settings/subscription#credits",
    });
  } else if (creditsPercent < 25) {
    totalProblems++;
    checks.push({
      id: "credits_balance",
      label: "AI Credits Balance",
      description: `${creditsBalance.toLocaleString()} credits remaining (${Math.round(creditsPercent)}% left).`,
      status: "warning",
      problemCount: 1,
      detail: "Your AI credits are running low. Consider upgrading your plan.",
      actionLabel: "Upgrade Plan",
      actionUrl: "/settings/subscription#plans",
    });
  } else {
    checks.push({
      id: "credits_balance",
      label: "AI Credits Balance",
      description: `${creditsBalance.toLocaleString()} credits available.`,
      status: "healthy",
    });
  }

  // 7. Data Freshness (Last Sync)
  const staleAccounts = (adAccounts || []).filter((a) => {
    if (!a.last_synced_at) return true;
    const hoursSince =
      (Date.now() - new Date(a.last_synced_at).getTime()) / (1000 * 60 * 60);
    return hoursSince > 48;
  });

  if (staleAccounts.length > 0 && (adAccounts?.length ?? 0) > 0) {
    checks.push({
      id: "data_freshness",
      label: "Data Sync Status",
      description: `${staleAccounts.length} account(s) haven't synced in 48+ hours.`,
      status: "warning",
      problemCount: staleAccounts.length,
      detail:
        "Your campaign data may be outdated. Sync your accounts to see the latest performance metrics.",
      actionLabel: "Sync Now",
      actionUrl: "/dashboard",
    });
    // Not counting this toward problems (lower priority)
  } else if ((adAccounts?.length ?? 0) > 0) {
    checks.push({
      id: "data_freshness",
      label: "Data Sync Status",
      description: "All accounts synced recently.",
      status: "healthy",
    });
  }

  return {
    totalProblems,
    checks,
    scannedAt: new Date().toISOString(),
  };
}
