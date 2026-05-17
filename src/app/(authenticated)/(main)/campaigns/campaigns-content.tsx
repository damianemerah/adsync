"use client";

import { useState, useEffect } from "react";
import { useCampaignsList, useCampaignMutations } from "@/hooks/use-campaigns";
import { useRouter } from "next/navigation";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { CampaignDetailSheet } from "@/components/campaigns/campaign-detail-sheet";
import { useDashboardStore } from "@/store/dashboard-store";
import { GlobalContextBar } from "@/components/layout/global-context-bar";

const PAGE_SIZE = 20;

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

  // Pagination + filter state owned here so server-side queries stay in sync
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Debounce search input before hitting the server
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, showArchived, selectedPlatform, selectedAccountId, selectedCampaignIds]);

  const { data, isLoading } = useCampaignsList({
    dateRange,
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    status,
    showArchived,
    platform: selectedPlatform && selectedPlatform !== "all" ? selectedPlatform : null,
    accountId: selectedAccountId || null,
    campaignIds: selectedCampaignIds,
  });

  const campaigns = data?.campaigns ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  const { duplicateCampaign, deleteCampaign, archiveCampaign, renameCampaign, updateStatus } = useCampaignMutations();

  const handleOpen = (id: string) => {
    router.push(`/campaigns?campaign=${id}`);
  };

  return (
    <div className="flex flex-col bg-muted/30 h-full">

      <GlobalContextBar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar">
        <div className="mx-auto max-w-[1600px]">
          <CampaignsView
            campaigns={campaigns}
            onRowClick={(id) => handleOpen(id)}
            onDuplicate={(id) => duplicateCampaign({ id })}
            onDelete={(id) => deleteCampaign({ id })}
            onArchive={(id) => archiveCampaign({ id })}
            onRename={(id, name) => renameCampaign({ id, name })}
            onToggleStatus={(id, action) => updateStatus({ id, action })}
            isLoading={isLoading}
            hasConnectedAccount={hasConnectedAccount}
            pageSize={PAGE_SIZE}
            defaultSort="recent"
            // Server-side pagination controls
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
            // Server-side filter controls
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={(s) => { setStatus(s); setPage(1); }}
            onTabChange={(tab) => { setShowArchived(tab === "archived"); setPage(1); }}
          />
        </div>
      </main>

      <CampaignDetailSheet />
    </div>
  );
}
