"use client";

import { useCampaignsList, useCampaignMutations } from "@/hooks/use-campaigns";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { CampaignDetailSheet } from "@/components/campaigns/campaign-detail-sheet";
import { SystemRestart, Plus } from "iconoir-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import { useAdAccountsList } from "@/hooks/use-ad-account";
import { useAuth } from "@/components/providers/auth-provider";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { GlobalContextBar } from "@/components/layout/global-context-bar";

function CampaignsPageContent() {
  const router = useRouter();
  const { data: campaigns, isLoading } = useCampaignsList();
  const { duplicateCampaign, deleteCampaign, archiveCampaign, renameCampaign, updateStatus } = useCampaignMutations();
  const { data: accounts, isLoading: isLoadingAccounts } = useAdAccountsList();
  const { user } = useAuth();

  // Platform / account / campaign filters from GlobalContextBar
  const {
    selectedPlatform,
    selectedAccountId,
    selectedCampaignIds,
  } = useDashboardStore();

  // Pre-filter by GlobalContextBar selectors (platform / account / campaign dropdown)
  const filteredCampaigns = campaigns?.filter((campaign) => {
    if (selectedPlatform && selectedPlatform !== "all" && campaign.platform && campaign.platform !== selectedPlatform) {
      return false;
    }
    if (selectedAccountId && campaign.ad_account_id && campaign.ad_account_id !== selectedAccountId) {
      return false;
    }
    if (selectedAccountId && !campaign.ad_account_id && campaign.status !== "draft") {
      return false;
    }
    if (!selectedCampaignIds.includes("all") && !selectedCampaignIds.includes(campaign.id)) {
      return false;
    }
    return true;
  });

  const handleOpen = (id: string) => {
    router.push(`/campaigns?campaign=${id}`);
  };

  const hasAdAccount = !!(accounts && accounts.length > 0);

  if (!isLoadingAccounts && !hasAdAccount) {
    const userName =
      (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
      user?.email?.split("@")[0] ||
      "there";

    return (
      <div className="flex flex-col bg-muted/30 min-h-screen">
        <PageHeader title="Campaigns" />
        <main className="flex-1 p-8 overflow-y-auto no-scrollbar">
          <DashboardEmptyState userName={userName} hasAdAccount={false} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-muted/30 h-full">
      <PageHeader title="Campaigns">
        <Link href="/campaigns/new">
          <Button className="gap-2 bg-primary font-bold shadow-sm border border-border shadow-primary/20">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </PageHeader>

      <GlobalContextBar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar">
        <div className="mx-auto max-w-[1600px]">
          <CampaignsView
            campaigns={filteredCampaigns || []}
            onRowClick={(id) => handleOpen(id)}
            onDuplicate={(id) => duplicateCampaign({ id })}
            onDelete={(id) => deleteCampaign({ id })}
            onArchive={(id) => archiveCampaign({ id })}
            onRename={(id, name) => renameCampaign({ id, name })}
            onToggleStatus={(id, action) => updateStatus({ id, action })}
            isLoading={isLoading}
            pageSize={10}
            defaultSort="recent"
          />
        </div>
      </main>

      <CampaignDetailSheet />
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <SystemRestart className="animate-spin" />
        </div>
      }
    >
      <CampaignsPageContent />
    </Suspense>
  );
}
