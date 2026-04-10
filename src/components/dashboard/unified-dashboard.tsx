"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import { GlobalContextBar } from "@/components/layout/global-context-bar";
import { MetricCards } from "@/components/dashboard/metric-cards";
import {
  PerformanceChart,
  MetricKey,
  METRIC_CONFIG,
} from "@/components/dashboard/performance-chart";
import { DemographicsCharts } from "@/components/dashboard/demographics-charts";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { CampaignDetailSheet } from "@/components/campaigns/campaign-detail-sheet";
import { RevenueChannelBreakdown } from "@/components/dashboard/revenue-channel-breakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignMetrics } from "@/lib/utils/campaign-metrics";
import { useDashboardStore } from "@/store/dashboard-store";
import { useInsights } from "@/hooks/use-insights";
import { useCampaigns } from "@/hooks/use-campaigns";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountHealthDialog } from "@/components/dashboard/account-health-dialog";
import { getAccountHealth } from "@/actions/account-health";
import { Button } from "@/components/ui/button";

interface UnifiedDashboardProps {
  initialData: any;
  campaigns: any[];
  userId: string;
}

// Metrics available in the performance time-series data
const CHARTABLE_METRICS: MetricKey[] = [
  "spend",
  "impressions",
  "clicks",
  "ctr",
];

export function UnifiedDashboard({
  initialData,
  campaigns,
  userId,
}: UnifiedDashboardProps) {
  const {
    selectedCampaignIds,
    selectedAccountId,
    selectedPlatform,
    dateRange,
    status,
  } = useDashboardStore();
  const router = useRouter();

  // Handle auto-refresh after connecting Meta account
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeOrgId } = useActiveOrgContext();

  // Live-fetch campaigns from DB
  const { data: liveCampaigns } = useCampaigns();
  const allCampaigns = liveCampaigns ?? campaigns;
  const displayCampaigns =
    status === "all"
      ? allCampaigns
      : allCampaigns.filter((c: any) => c.status === status);

  // Track which metric cards the user has toggled ON
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);

  // Run a quick background health check to know if we should flash the button
  const { data: healthData } = useQuery({
    queryKey: ["account-health"],
    queryFn: getAccountHealth,
    staleTime: 5 * 60 * 1000,
  });
  const hasProblems = (healthData?.totalProblems ?? 0) > 0;

  const [activeMetrics, setActiveMetrics] =
    useState<MetricKey[]>(CHARTABLE_METRICS);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

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

  // Convert dateRange to ISO strings for the API.
  // Zustand persist rehydrates Date fields as strings, so handle both.
  const toISODate = (d: Date | string | undefined) =>
    d ? new Date(d).toISOString().split("T")[0] : undefined;
  const dateFrom = dateRange?.from ? toISODate(dateRange.from) : undefined;
  const dateTo = dateRange?.to ? toISODate(dateRange.to) : undefined;

  // Live-fetch from /api/insights whenever filters change
  const { data: liveData, isLoading: isLoadingInsights } = useInsights({
    accountId: selectedAccountId || undefined,
    campaignIds: selectedCampaignIds,
    platform: selectedPlatform,
    dateFrom,
    dateTo,
  });
  console.log("Livedata🔥🔥", liveData);

  // Prefer live data; fall back to server-rendered initial data
  const dashboardData = liveData ?? initialData;

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
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <MetricCards
              summary={dashboardData?.summary ?? initialData.summary}
            />
          )}

          {/* Performance Chart */}
          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle>Performance Trends</CardTitle>
              <div className="flex flex-wrap gap-2">
                {CHARTABLE_METRICS.map((key) => {
                  const cfg = METRIC_CONFIG[key];
                  const active = activeMetrics.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleMetric(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        active
                          ? "border-transparent text-white"
                          : "border-border text-muted-foreground bg-card hover:border-primary/40"
                      }`}
                      style={
                        active ? { backgroundColor: cfg.color } : undefined
                      }
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: active
                            ? "rgba(255,255,255,0.7)"
                            : cfg.color,
                        }}
                      />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingInsights && !liveData ? (
                <Skeleton className="h-[400px] w-full rounded-md" />
              ) : (
                <div className="h-[400px] w-full">
                  <PerformanceChart
                    data={dashboardData?.performance ?? []}
                    activeMetrics={
                      activeMetrics.length > 0
                        ? activeMetrics
                        : CHARTABLE_METRICS
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
              <Link href="/campaigns">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  View All
                </Button>
              </Link>
            </div>
            <CampaignsView
              campaigns={displayCampaigns}
              pageSize={5}
              onRowClick={(id) => router.push(`/dashboard?campaign=${id}`)}
            />
          </div>
        </div>
      </main>
      <CampaignDetailSheet />
    </div>
  );
}
