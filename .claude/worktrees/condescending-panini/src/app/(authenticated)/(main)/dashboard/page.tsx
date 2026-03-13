import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/api/insights";
import { getCampaigns } from "@/lib/api/campaigns";
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Sidebar } from "@/components/layout/sidebar";
import { HelpCenterSheet } from "@/components/layout/help-center-sheet";

import { getActiveOrgId } from "@/lib/active-org";

export default async function DashboardPage() {
  // 1. Auth check
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // Resolve active org context
  const activeOrgId = await getActiveOrgId();

  if (!activeOrgId) {
    redirect("/onboarding");
  }

  // 2. Determine real onboarding completion states in parallel
  const [accountsRes, whatsappRes, campaignsRes] = await Promise.all([
    // Has at least one connected ad account?
    supabase
      .from("ad_accounts")
      .select("id")
      .eq("organization_id", activeOrgId)
      .limit(1),

    // Has verified WhatsApp?
    supabase
      .from("notification_settings")
      .select("verified")
      .eq("user_id", user.id)
      .eq("verified", true)
      .limit(1),

    // Has at least one launched (non-draft) campaign?
    supabase
      .from("campaigns")
      .select("id")
      .eq("organization_id", activeOrgId)
      .in("status", ["active", "paused", "completed"])
      .limit(1),
  ]);

  const hasAdAccount = !!(accountsRes.data && accountsRes.data.length > 0);
  const hasVerifiedWhatsApp = !!(
    whatsappRes.data && whatsappRes.data.length > 0
  );
  const hasFirstCampaign = !!(
    campaignsRes.data && campaignsRes.data.length > 0
  );

  // 3. Show empty/onboarding state if no ad accounts connected
  if (!hasAdAccount) {
    // Resolve display name from user metadata
    const userName =
      (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
      user.email?.split("@")[0] ||
      "there";

    return (
      <div className="flex min-h-screen bg-muted/30 font-sans">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="w-full border-b border-border bg-background/80 backdrop-blur-md">
            <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-2 sm:px-4 lg:px-6">
              <h1 className="text-xl font-heading font-bold text-foreground tracking-tight">
                Overview
              </h1>
              <HelpCenterSheet />
            </div>
          </header>
          <main className="flex-1 p-8 overflow-y-auto">
            <DashboardEmptyState
              userName={userName}
              hasAdAccount={hasAdAccount}
              hasVerifiedWhatsApp={hasVerifiedWhatsApp}
              hasFirstCampaign={hasFirstCampaign}
            />
          </main>
        </div>
      </div>
    );
  }

  // 4. Fetch dashboard data + campaigns in parallel
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

  // 5. Render full dashboard
  return (
    <div className="flex min-h-screen bg-muted/30 font-sans">
      <div className="flex flex-1 flex-col min-w-0 w-full">
        <header className="w-full border-b border-border bg-background/80 backdrop-blur-md">
          <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-2 sm:px-4 lg:px-6">
            <h1 className="text-xl font-heading font-bold text-foreground tracking-tight">
              Performance
            </h1>
            <HelpCenterSheet />
          </div>
        </header>
        <UnifiedDashboard
          initialData={safeData}
          campaigns={campaigns}
          userId={user.id}
        />
      </div>
    </div>
  );
}
