import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/api/insights";
import { getCampaigns } from "@/lib/api/campaigns";
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard";
import { getActiveOrgId } from "@/lib/active-org";
import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query";

import { Suspense } from "react";
import DashboardLoading from "./loading";

async function DashboardDataLoader({ userId, activeOrgId }: { userId: string; activeOrgId: string }) {
  const supabase = await createClient();
  const queryClient = new QueryClient();

  const [{ data: connectedAccounts }, dashboardData, campaigns] =
    await Promise.all([
      supabase
        .from("ad_accounts")
        .select("id")
        .eq("organization_id", activeOrgId)
        .is("disconnected_at", null)
        .limit(1),
      getDashboardData(userId, activeOrgId, { campaignId: "all" }),
      getCampaigns(activeOrgId),
    ]);

  // Seed the campaigns query key so useCampaignsList doesn't double-fetch on mount
  queryClient.setQueryData(["campaigns", activeOrgId, null, null], campaigns);

  const hasConnectedAccount = (connectedAccounts?.length ?? 0) > 0;

  const safeData = dashboardData ?? {
    summary: {
      spend: "0",
      impressions: "0",
      clicks: "0",
      cpc: "0",
      ctr: "0",
      reach: "0",
    },
    performance: [],
    demographics: { age: [], gender: [], region: [] },
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-screen font-sans w-full">
        <div className="flex flex-1 flex-col min-w-0 w-full">
          <UnifiedDashboard
            initialData={safeData}
            campaigns={campaigns}
            userId={userId}
            hasConnectedAccount={hasConnectedAccount}
          />
        </div>
      </div>
    </HydrationBoundary>
  );
}

export default async function DashboardPage() {
  await connection();
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // 2. Resolve active org
  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) {
    redirect("/onboarding");
  }

  // 3. Render with Suspense wrapper to stream the loading state immediately
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardDataLoader userId={user.id} activeOrgId={activeOrgId} />
    </Suspense>
  );
}
