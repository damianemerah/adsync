"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import { GlobalContextBar } from "@/components/layout/global-context-bar";
import { MetricCards } from "@/components/dashboard/metric-cards";
import {
  PerformanceChart,
  MetricKey,
} from "@/components/dashboard/performance-chart";
import { DemographicsCharts } from "@/components/dashboard/demographics-charts";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { RevenueChannelBreakdown } from "@/components/dashboard/revenue-channel-breakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignMetrics } from "@/lib/utils/campaign-metrics";
import { useDashboardStore } from "@/store/dashboard-store";
import { useInsights } from "@/hooks/use-insights";
import { useCampaigns } from "@/hooks/use-campaigns";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountHealthDialog } from "@/components/dashboard/account-health-dialog";
import { getAccountHealth } from "@/actions/account-health";
import { ShieldCheck, WarningTriangle } from "iconoir-react";
import { Button } from "@/components/ui/button";

interface UnifiedDashboardProps {
  initialData: any;
  campaigns: any[];
  userId: string;
}

// Map MetricCard labels → PerformanceChart MetricKey
const LABEL_TO_METRIC_KEY: Record<string, MetricKey> = {
  "Total Spend": "spend",
  Impressions: "impressions",
  Clicks: "clicks",
  CTR: "ctr",
};

export function UnifiedDashboard({
  initialData,
  campaigns,
  userId,
}: UnifiedDashboardProps) {
  const { selectedCampaignIds, selectedAccountId, selectedPlatform } =
    useDashboardStore();
  const router = useRouter();

  // Handle auto-refresh after connecting Meta account
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeOrgId } = useActiveOrgContext();

  // Live-fetch campaigns from DB
  const { data: liveCampaigns } = useCampaigns();
  const displayCampaigns = liveCampaigns ?? campaigns;

  // Track which metric cards the user has toggled ON
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [hasProblems, setHasProblems] = useState(false);

  // Run a quick health check on mount to know if we should flash the button
  useEffect(() => {
    getAccountHealth()
      .then((result) => {
        setHasProblems(result.totalProblems > 0);
      })
      .catch(() => {});
  }, []);

  const [selectedMetricLabels, setSelectedMetricLabels] = useState<string[]>([
    "Total Spend",
    "Impressions",
  ]);

  useEffect(() => {
    if (searchParams.get("success") === "meta_connected") {
      // The background sync takes a moment. Refetch after 3 seconds.
      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
        queryClient.invalidateQueries({
          queryKey: ["insights", selectedPlatform],
        });

        // Clean up URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete("success");
        window.history.replaceState({}, "", url.pathname + url.search);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, queryClient, activeOrgId, selectedPlatform]);

  // Live-fetch from /api/insights whenever filters change
  const { data: liveData, isLoading: isLoadingInsights } = useInsights({
    accountId: selectedAccountId || undefined,
    campaignIds: selectedCampaignIds,
    platform: selectedPlatform,
  });

  // Prefer live data; fall back to server-rendered initial data
  const dashboardData = liveData ?? initialData;

  // Derive active chart metrics from selected card labels
  const activeMetrics = selectedMetricLabels
    .map((label) => LABEL_TO_METRIC_KEY[label])
    .filter((key): key is MetricKey => !!key);

  // Expose toggle handler to MetricCards
  const handleMetricToggle = useCallback((label: string) => {
    setSelectedMetricLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }, []);

  // Calculate Revenue Breakdown from Campaigns
  // Heuristic: If WhatsApp clicks > Website clicks, assign revenue to WhatsApp, else Website.
  // In future, this should be precise based on where the conversion happened.
  const revenueBreakdown = displayCampaigns.reduce(
    (acc: any, campaign: any) => {
      const rev = campaign.revenueNgn || campaign.revenue_ngn || 0;
      const sales = campaign.salesCount || campaign.sales_count || 0;
      const wa = campaign.whatsappClicks || campaign.whatsapp_clicks || 0;
      const web = campaign.websiteClicks || campaign.website_clicks || 0;

      if (wa >= web) {
        acc.whatsappRevenue += rev;
        acc.whatsappSales += sales;
      } else {
        acc.websiteRevenue += rev;
        acc.websiteSales += sales;
      }
      return acc;
    },
    {
      whatsappRevenue: 0,
      websiteRevenue: 0,
      whatsappSales: 0,
      websiteSales: 0,
    },
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
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <MetricCards
              summary={dashboardData?.summary ?? initialData.summary}
              selectedMetrics={selectedMetricLabels}
              onToggle={handleMetricToggle}
            />
          )}

          {/* Performance Chart */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingInsights && !liveData ? (
                <Skeleton className="h-[400px] w-full rounded-xl" />
              ) : (
                <div className="h-[400px] w-full">
                  <PerformanceChart
                    data={dashboardData?.performance ?? []}
                    activeMetrics={
                      activeMetrics.length > 0
                        ? activeMetrics
                        : ["spend", "clicks"]
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Campaigns Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">
                Recent Campaigns
              </h2>
            </div>
            <CampaignsView
              campaigns={displayCampaigns}
              pageSize={5}
              onRowClick={(id) => router.push(`/campaigns?id=${id}`)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
