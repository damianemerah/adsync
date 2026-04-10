"use client";

import { useCampaigns } from "@/hooks/use-campaigns";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { CampaignDetailSheet } from "@/components/campaigns/campaign-detail-sheet";
import { SystemRestart, Plus, Refresh } from "iconoir-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense, useState } from "react"; // Added useState
import { GlobalFilter } from "@/components/layout/global-filter";
import { useDashboardStore } from "@/store/dashboard-store";
import { toast } from "sonner";
import { useAdAccounts } from "@/hooks/use-ad-account";
import { useAuth } from "@/components/providers/auth-provider";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";

function CampaignsPageContent() {
  const router = useRouter();
  const { data: campaigns, isLoading } = useCampaigns();
  const { data: accounts, isLoading: isLoadingAccounts } = useAdAccounts();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Store Filters
  const {
    selectedPlatform,
    selectedAccountId,
    status,
    searchQuery,
    dateRange,
  } = useDashboardStore();


  // 3. Filter Campaigns
  const filteredCampaigns = campaigns?.filter((campaign) => {
    // Platform Filter
    if (selectedPlatform !== "all" && campaign.platform !== selectedPlatform) {
      return false;
    }

    // Account Filter
    if (selectedAccountId && campaign.ad_account_id !== selectedAccountId) {
      return false;
    }

    // Status Filter
    if (
      status !== "all" &&
      campaign.status.toLowerCase() !== status.toLowerCase()
    ) {
      return false;
    }

    // Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        campaign.name.toLowerCase().includes(query) ||
        campaign.objective?.toLowerCase().includes(query) ||
        campaign.id.includes(query)
      );
    }

    // Date Range (Optional - usually filtered at API level for metrics, but we can do basic creation time here)
    if (dateRange?.from && dateRange?.to) {
      const campaignDate = new Date(campaign.created_at);
      if (campaignDate < dateRange.from || campaignDate > dateRange.to) {
        // return false; // NOTE: Typically we show all campaigns regardless of date, but filter METRICS by date.
        // For now, let's NOT filter campaigns list by date, as users might want to see old campaigns even if range is recent.
      }
    }

    return true;
  });

  // 4. Handlers
  const handleOpen = (id: string) => {
    router.push(`/campaigns?campaign=${id}`);
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!selectedAccountId) {
      toast.error("Please select an ad account filter to sync.");
      return;
    }

    // ✅ Defensive check: Validate that selected account still exists (fixes disconnect/reconnect stale ID bug)
    const accountExists = accounts?.find((a) => a.id === selectedAccountId);
    if (!accountExists) {
      toast.error(
        "Selected account no longer exists. Please select a different account or refresh the page.",
      );
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch("/api/campaigns/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccountId }),
      });
      const data = await res.json();
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        toast.success(`Synced ${data.count} campaigns from Meta.`);
      } else {
        toast.error(data.error || "Failed to sync campaigns.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSyncing(false);
    }
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

        <main className="flex-1 p-8 overflow-y-auto">
          <DashboardEmptyState
            userName={userName}
            hasAdAccount={false}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-muted/30 h-full">
      <PageHeader title="Campaigns">
        <Button
          variant="outline"
          disabled={isSyncing}
          onClick={handleSync}
          className="gap-2 font-semibold shadow-sm"
        >
          <Refresh
            className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
          />
          {isSyncing ? "Syncing..." : "Sync with Meta"}
        </Button>

        <Link href="/campaigns/new">
          <Button className="gap-2 bg-primary font-bold shadow-sm border border-border shadow-primary/20">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </PageHeader>

      {/* 4. Filter Toolbar */}
      <div className="border-b border-border bg-white px-6 py-4 lg:px-8">
        <GlobalFilter />
      </div>

      {/* 4. The Main List (Reusing your View Component) */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          <CampaignsView
            key={`${selectedPlatform}-${selectedAccountId}-${status}-${searchQuery}-${JSON.stringify(dateRange)}`}
            campaigns={filteredCampaigns || []}
            onRowClick={(id) => handleOpen(id)}
            isLoading={isLoading}
            pageSize={10}
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
