"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import { GlobalContextBar } from "@/components/layout/global-context-bar";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { PerformanceTrendsCard } from "@/components/dashboard/performance-trends-card";
import { DemographicsCharts } from "@/components/dashboard/demographics-charts";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { CampaignDetailSheet } from "@/components/campaigns/campaign-detail-sheet";
import { RevenueChannelBreakdown } from "@/components/dashboard/revenue-channel-breakdown";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountHealthDialog } from "@/components/dashboard/account-health-dialog";
import { Button } from "@/components/ui/button";
import { getAccountHealth } from "@/actions/account-health";
import { useDashboardStore } from "@/store/dashboard-store";
import { useInsights } from "@/hooks/use-insights";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useMetaConnectionRefresh } from "@/hooks/use-meta-connection-refresh";
import { calculateChannelBreakdown, CampaignForBreakdown } from "@/lib/utils/campaign-metrics";
import { useState } from "react";

interface UnifiedDashboardProps {
  initialData: {
    summary: {
      spend: string;
      impressions: string;
      clicks: string;
      cpc: string;
      ctr: string;
      reach: string;
      revenue?: number;
      sales?: number;
    };
    performance: { date: string; [key: string]: unknown }[];
    demographics: {
      age: unknown[];
      gender: unknown[];
      region: unknown[];
    };
  };
  campaigns: {
    id: string;
    revenue_ngn?: number | null;
    sales_count?: number | null;
    whatsapp_clicks?: number | null;
    website_clicks?: number | null;
    platform?: string;
    ad_account_id?: string;
    status?: string;
    [key: string]: unknown;
  }[];
  userId: string;
}

export function UnifiedDashboard({
  initialData,
  campaigns,
  userId: _userId,
}: UnifiedDashboardProps) {
  const {
    selectedCampaignIds,
    selectedAccountId,
    selectedPlatform,
    dateRange,
    status,
  } = useDashboardStore();
  const router = useRouter();
  const { activeOrgId } = useActiveOrgContext();
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);

  // Invalidate queries automatically after a successful Meta OAuth connection
  useMetaConnectionRefresh({ activeOrgId, selectedPlatform });

  // Live-fetch campaigns from DB; fall back to server-rendered initial list
  const { data: liveCampaigns } = useCampaigns();
  const allCampaigns = liveCampaigns ?? campaigns;

  // Apply all GlobalContextBar filters to the campaign list
  const displayCampaigns = allCampaigns.filter((c) => {
    if (selectedPlatform && selectedPlatform !== "all" && c.platform !== selectedPlatform) return false;
    if (selectedAccountId && c.ad_account_id !== selectedAccountId) return false;
    if (!selectedCampaignIds.includes("all") && !selectedCampaignIds.includes(c.id)) return false;
    if (status !== "all" && c.status !== status) return false;
    return true;
  });

  // Background account health check to know if we should flash the button
  const { data: healthData } = useQuery({
    queryKey: ["account-health"],
    queryFn: getAccountHealth,
    staleTime: 5 * 60 * 1000,
  });
  const hasProblems = (healthData?.totalProblems ?? 0) > 0;

  // Convert Zustand-persisted dateRange (may be string or Date) to ISO strings
  const toISODate = (d: Date | string | undefined) =>
    d ? new Date(d).toISOString().split("T")[0] : undefined;
  const dateFrom = dateRange?.from ? toISODate(dateRange.from) : undefined;
  const dateTo = dateRange?.to ? toISODate(dateRange.to) : undefined;

  // Live-fetch metrics from /api/insights whenever filters change
  const { data: liveData, isLoading: isLoadingInsights } = useInsights({
    accountId: selectedAccountId || undefined,
    campaignIds: selectedCampaignIds,
    platform: selectedPlatform,
    dateFrom,
    dateTo,
  });

  // Prefer live data; fall back to server-rendered initial data
  const dashboardData = liveData ?? initialData;

  // Revenue attribution per channel (WhatsApp vs Website)
  const revenueBreakdown = calculateChannelBreakdown(
    displayCampaigns as CampaignForBreakdown[]
  );

  return (
    <div>
      {/* Account Health Dialog */}
      <AccountHealthDialog
        open={healthDialogOpen}
        onOpenChange={setHealthDialogOpen}
      />

      {/* Global Filter Bar */}
      <GlobalContextBar
        onHealthCheckClick={() => setHealthDialogOpen(true)}
        hasProblems={hasProblems}
      />

      {/* Main Content */}
      <main className="flex-1 p-2 md:p-4 lg:p-6 overflow-y-auto">
        <div className="mx-auto space-y-8">
          {/* Metrics Grid */}
          {isLoadingInsights && !liveData ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <MetricCards summary={dashboardData?.summary ?? initialData.summary} />
          )}

          {/* Performance Chart — owns its own metric-toggle state */}
          <PerformanceTrendsCard
            performance={dashboardData?.performance ?? []}
            isLoading={isLoadingInsights && !liveData}
          />

          {/* Recent Campaigns */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">
                Recent Campaigns
              </h2>
              <Link href="/campaigns">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm text-subtle-foreground hover:text-primary"
                >
                  View All
                </Button>
              </Link>
            </div>
            <CampaignsView
              campaigns={displayCampaigns}
              pageSize={5}
              showFilters={false}
              defaultSort="active-first"
              onRowClick={(id) => router.push(`/dashboard?campaign=${id}`)}
            />
          </div>

          {/* Revenue Breakdown & Demographics Grid */}
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1 h-full">
              <RevenueChannelBreakdown
                whatsappRevenue={revenueBreakdown.whatsappRevenue}
                websiteRevenue={revenueBreakdown.websiteRevenue}
                whatsappSales={revenueBreakdown.whatsappSales}
                websiteSales={revenueBreakdown.websiteSales}
              />
            </div>
            <div className="lg:col-span-2">
              <DemographicsCharts
                demographics={
                  dashboardData?.demographics ?? {
                    age: [],
                    gender: [],
                    region: [],
                  }
                }
              />
            </div>
          </div>
        </div>
      </main>
      <CampaignDetailSheet />
    </div>
  );
}
