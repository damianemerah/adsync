"use client";

import { useCampaignsList, useCampaignMutations } from "@/hooks/use-campaigns";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { CampaignDetailSheet } from "@/components/campaigns/campaign-detail-sheet";
import { Plus } from "iconoir-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useDashboardStore } from "@/store/dashboard-store";
import { GlobalContextBar } from "@/components/layout/global-context-bar";

export function CampaignsContent({
  hasConnectedAccount,
}: {
  hasConnectedAccount?: boolean;
}) {
  const router = useRouter();
  const {
    selectedPlatform,
    selectedAccountId,
    selectedCampaignIds,
    dateRange,
  } = useDashboardStore();
  const { data: campaigns, isLoading } = useCampaignsList({ dateRange });
  const { duplicateCampaign, deleteCampaign, archiveCampaign, renameCampaign, updateStatus } = useCampaignMutations();

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

  return (
    <div className="flex flex-col bg-muted/30 h-full">

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
            hasConnectedAccount={hasConnectedAccount}
            pageSize={10}
            defaultSort="recent"
          />
        </div>
      </main>

      <CampaignDetailSheet />
    </div>
  );
}
