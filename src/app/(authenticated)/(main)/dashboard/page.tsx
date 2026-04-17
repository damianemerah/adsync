import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/api/insights";
import { getCampaigns } from "@/lib/api/campaigns";
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { getActiveOrgId } from "@/lib/active-org";
import { getOnboardingStatus } from "@/lib/onboarding/onboarding-status";

export default async function DashboardPage() {
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

  // 3. Check onboarding progress
  const onboarding = await getOnboardingStatus(supabase, user);

  // 4. Show empty/onboarding state if no ad account is connected
  if (!onboarding.hasAdAccount) {
    return (
      <div className="flex min-h-screen bg-muted/30 font-sans">
        <div className="flex flex-1 flex-col min-w-0">
          <PageHeader title="Overview" className="static" />
          <main className="flex-1 p-8 overflow-y-auto">
            <DashboardEmptyState
              userName={onboarding.userName}
              hasAdAccount={onboarding.hasAdAccount}
              hasVerifiedWhatsApp={onboarding.hasVerifiedWhatsApp}
              hasFirstCampaign={onboarding.hasFirstCampaign}
            />
          </main>
        </div>
      </div>
    );
  }

  // 5. Fetch dashboard data + campaigns in parallel
  const [dashboardData, campaigns] = await Promise.all([
    getDashboardData(supabase, user.id, { campaignId: "all" }),
    getCampaigns(supabase),
  ]);

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

  // 6. Render full dashboard
  return (
    <div className="flex min-h-screen bg-muted/30 font-sans">
      <div className="flex flex-1 flex-col min-w-0 w-full">
        <PageHeader title="Performance" className="static" />
        <UnifiedDashboard
          initialData={safeData}
          campaigns={campaigns}
          userId={user.id}
        />
      </div>
    </div>
  );
}
