"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCampaignDetail } from "@/hooks/use-campaign-detail";
import { ROIMetricsCard } from "@/components/campaigns/roi-metrics-card";
import { MarkAsSoldButton } from "@/components/campaigns/mark-as-sold-button";
import { SubPlacementROICard } from "@/components/campaigns/sub-placement-roi-card";
import { PostLaunchRuleAlert } from "@/components/campaigns/post-launch-rule-alert";
import { DemographicsCard } from "@/components/campaigns/demographics-card";
import { LeadsList } from "@/components/campaigns/leads-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StatsReport,
  Calendar,
  CreditCard,
  OpenNewWindow,
  ViewGrid,
  MoreHoriz,
  Pause,
  Play,
  Settings,
  SystemRestart,
  Edit,
  ArrowRight,
  NavArrowDown,
  GraphUp,
  Mail,
  Copy,
} from "iconoir-react";
import { MetaIcon } from "@/components/ui/meta-icon";
import { DataTable, Column } from "@/components/ui/data-table";
import { Campaign } from "@/lib/api/campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCampaignMutations } from "@/hooks/use-campaigns";
import { CampaignMetrics } from "@/lib/utils/campaign-metrics";
import { EmptyState } from "@/components/ui/empty-state";

import {
  PerformanceChart,
  METRIC_CONFIG,
  MetricKey,
} from "@/components/dashboard/performance-chart";
import { useState, useMemo } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import {
  bucketPerformance,
  pickGranularity,
} from "@/lib/utils/date-bucketing";

interface CampaignDetailViewProps {
  campaign: Campaign;
}

export function CampaignDetailView({
  campaign: initialCampaign,
}: CampaignDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { updateStatus, isUpdating, duplicateCampaign, isDuplicating } = useCampaignMutations();
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>([
    "revenue",
    "spend",
  ]);
  const { dateRange } = useDashboardStore();
  const { campaign: liveCampaign } = useCampaignDetail(initialCampaign.id, {
    initialData: initialCampaign,
  });
  const campaign = liveCampaign ?? initialCampaign;

  // Tab management: read from URL query param
  const activeTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    const current = new URLSearchParams(searchParams.toString());
    if (value === "overview") {
      current.delete("tab"); // Keep URL clean for default tab
    } else {
      current.set("tab", value);
    }
    router.push(`${pathname}?${current.toString()}`);
  };

  // Determine if this is a lead gen campaign
  const isLeadGenCampaign = campaign.objective === "leads";

  const granularity = useMemo(
    () => pickGranularity(dateRange?.from, dateRange?.to),
    [dateRange?.from, dateRange?.to],
  );

  // Calculate CTR for chart data since API might return it or we compute it,
  // then bucket by day/week/month based on the selected range size.
  const chartData = useMemo(() => {
    let rawData = campaign.performance || [];

    if (dateRange?.from && dateRange?.to) {
      rawData = rawData.filter((day: any) => {
        const d = new Date(day.date);
        // Make sure it falls within the start of the "from" day and end of the "to" day
        d.setHours(0, 0, 0, 0);
        const fromDate = new Date(dateRange.from!);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateRange.to!);
        toDate.setHours(23, 59, 59, 999);
        return d >= fromDate && d <= toDate;
      });
    }

    const withCtr = rawData.map((day: any) => ({
      ...day,
      ctr:
        day.ctr ?? (day.impressions ? (day.clicks / day.impressions) * 100 : 0),
    }));

    return bucketPerformance(withCtr, granularity);
  }, [campaign.performance, dateRange, granularity]);

  const currencySymbol = campaign.adAccount?.currency === "NGN" ? "₦" : "$";

  // Formatters
  const formatMoney = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const handleStatusChange = (newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED") => {
    updateStatus({ id: campaign.id, action: newStatus });
  };

  if (campaign.status === "draft") {
    return (
      <div className="flex flex-col h-full bg-muted/50">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-card border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-xl font-heading font-bold text-foreground">
              {campaign.name || "Untitled Draft"}
            </h2>
            <Badge variant="warning-soft" className="mt-1">
              Draft
            </Badge>
          </div>
          <Button
            onClick={() => router.push(`/campaigns/new?draftId=${campaign.id}`)}
            className="bg-primary hover:bg-primary/90 font-bold shadow-sm border border-border min-h-11"
          >
            Resume Editing <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Empty State Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-subtle-foreground">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Edit className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            This campaign hasn't been launched yet.
          </h3>
          <p className="max-w-sm mt-2">
            It is currently saved as a draft. Resume editing to complete the
            setup and launch your ad.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted">
      {/* Header Section */}
      <div className="p-4 sm:p-6 bg-card border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-0 mb-4">
          <div className="flex items-center gap-3">
            {campaign.platform === "meta" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-meta/10 shrink-0">
                <MetaIcon className="h-7 w-7" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-tiktok text-brand-tiktok-foreground shrink-0">
                <span className="font-bold">Tk</span>
              </div>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-bold text-foreground">
                {campaign.name}
              </h2>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-subtle-foreground mt-0.5">
                <span>
                  ID: {campaign.platformCampaignId || campaign.id.slice(0, 8)}
                </span>
                <span>•</span>
                <span className="capitalize">
                  {campaign.objective.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 flex-1 sm:flex-none"
              onClick={() => {
                if (
                  campaign.platform === "meta" &&
                  campaign.platformCampaignId &&
                  campaign.adAccount?.platformAccountId
                ) {
                  // Direct to Facebook Ads Manager for this specific campaign
                  const actId = campaign.adAccount.platformAccountId;
                  const actStr = actId.startsWith("act_")
                    ? actId
                    : `act_${actId}`;
                  window.open(
                    `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${actStr}&campaign_ids=${campaign.platformCampaignId}`,
                    "_blank",
                  );
                } else {
                  window.open("https://adsmanager.facebook.com", "_blank");
                }
              }}
            >
              <OpenNewWindow className="h-4 w-4 mr-2" />
              View Ad
            </Button>
            <Button variant="ghost" size="icon" className="min-h-11 w-11 shrink-0">
              <MoreHoriz className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge
                variant="secondary"
                className={`text-sm px-4 py-2 min-h-11 flex items-center justify-center rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                  campaign.status === "active"
                    ? "bg-status-success-soft text-status-success"
                    : "bg-muted text-subtle-foreground border border-border"
                }`}
              >
                {isUpdating ? (
                  <SystemRestart className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : campaign.status === "active" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
                    </span>
                    Active - Delivering
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Pause className="h-3.5 w-3.5" />
                    Paused
                  </span>
                )}
                <NavArrowDown className="h-4 w-4 ml-2 opacity-50" />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")} className="min-h-11">
                <Play className="h-4 w-4 mr-2 text-status-success" />
                Set as Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("PAUSED")} className="min-h-11">
                <Pause className="h-4 w-4 mr-2 text-subtle-foreground" />
                Pause Campaign
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicateCampaign({ id: campaign.id })}
                disabled={isDuplicating}
                className="min-h-11"
              >
                <Copy className="h-4 w-4 mr-2 text-subtle-foreground" />
                Duplicate Campaign
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem
                className="text-status-danger min-h-11"
                onClick={() => handleStatusChange("ARCHIVED")}
              >
                Archive Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:block h-4 w-px bg-border mx-2" />
          <div className="flex items-center text-xs sm:text-sm text-subtle-foreground w-full sm:w-auto mt-2 sm:mt-0">
            <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
            {new Date(campaign.createdAt).toLocaleDateString()}
          </div>
          <div className="hidden sm:block h-4 w-px bg-border mx-2" />
          <div className="flex items-center text-xs sm:text-sm text-subtle-foreground w-full sm:w-auto mt-1 sm:mt-0">
            <CreditCard className="h-4 w-4 mr-1.5 text-muted-foreground" />
            Budget: {formatMoney(campaign.dailyBudgetCents / 100)}/day
          </div>
        </div>
      </div>

      
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col"
      >
        <div className="px-4 sm:px-6 bg-card border-b border-border">
          <TabsList className="bg-transparent h-12 p-0 gap-4 sm:gap-6 w-full justify-start overflow-x-auto no-scrollbar shrink-0">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-0 pb-3 pt-3 h-full font-semibold min-h-11 shrink-0"
            >
              <ViewGrid className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            {isLeadGenCampaign && (
              <TabsTrigger
                value="leads"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-0 pb-3 pt-3 h-full font-semibold min-h-11 shrink-0"
              >
                <Mail className="h-4 w-4 mr-2" />
                Leads
              </TabsTrigger>
            )}
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent px-0 pb-3 pt-3 h-full font-semibold min-h-11 shrink-0"
            >
              <GraphUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent
          value="overview"
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 m-0 no-scrollbar"
        >
          {/* Post-launch intelligence alert — surfaces highest-severity triggered rule */}
          <PostLaunchRuleAlert campaign={campaign} />

          {/* Attribution & ROI Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <StatsReport className="h-4 w-4" /> Attribution & ROI
              </h3>
              <MarkAsSoldButton campaignId={campaign.id} />
            </div>
            <ROIMetricsCard campaignId={campaign.id} />
            <SubPlacementROICard campaignId={campaign.id} />
          </div>

          
          {/* Ads Table */}
          <AdsTable ads={campaign.ads || []} formatMoney={formatMoney} />

          {/* Performance Graph */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <GraphUp className="h-4 w-4" /> Performance
              </h3>

              {/* Metric Toggles */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-muted p-1 rounded-lg">
                {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => {
                  const isActive = activeMetrics.includes(key);
                  const config = METRIC_CONFIG[key];
                  const Icon = config.icon;

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (isActive && activeMetrics.length === 1) return; // Prevent empty
                        setActiveMetrics((prev) =>
                          isActive
                            ? prev.filter((k) => k !== key)
                            : [...prev, key],
                        );
                      }}
                      className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[36px]
                      ${
                        isActive
                          ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                          : "text-subtle-foreground hover:text-foreground hover:bg-muted/80"
                      }
                    `}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-[300px] w-full bg-card border border-border rounded-lg p-4 shadow-none">
              <PerformanceChart
                data={chartData}
                activeMetrics={activeMetrics}
                granularity={granularity}
              />
            </div>
          </div>
        </TabsContent>

        {/* Leads Tab */}
        {isLeadGenCampaign && (
          <TabsContent value="leads" className="flex-1 overflow-y-auto p-4 sm:p-6 m-0 no-scrollbar">
            <LeadsList campaignId={campaign.id} />
          </TabsContent>
        )}

        {/* Analytics Tab */}
        <TabsContent
          value="analytics"
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 m-0 no-scrollbar"
        >
          {/* Demographics Visualization */}
          {campaign.demographics && (
            <div className="space-y-3">
              <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <StatsReport className="h-4 w-4" /> Demographics
              </h3>
              <DemographicsCard demographics={campaign.demographics} />
            </div>
          )}

          {/* Sub-Placement ROI */}
          <div className="space-y-3">
            <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <ViewGrid className="h-4 w-4" /> Placement Performance
            </h3>
            <SubPlacementROICard campaignId={campaign.id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Ads DataTable ────────────────────────────────────────────────────────────
function AdsTable({
  ads,
  formatMoney,
}: {
  ads: any[];
  formatMoney: (n: number) => string;
}) {
  const columns: Column<any>[] = [
    {
      key: "name",
      title: "Ad",
      headerClassName: "pl-4",
      className: "pl-4",
      render: (ad) => (
        <div className="flex items-center gap-3">
          {ad.image ? (
            <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-border bg-muted">
              <img
                src={ad.image}
                alt={ad.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-lg shrink-0 bg-muted flex items-center justify-center">
              <ViewGrid className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-[200px]">
            {ad.name}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (ad) => (
        <Badge
          variant="outline"
          className={`text-xs font-semibold capitalize min-h-8 flex items-center px-2 py-0.5 ${
            ad.status === "ACTIVE"
              ? "border-status-success-soft bg-status-success-soft text-status-success"
              : "border-border bg-muted text-subtle-foreground"
          }`}
        >
          {ad.status?.toLowerCase() ?? "—"}
        </Badge>
      ),
    },
    {
      key: "impressions",
      title: "Impressions",
      className: "font-mono text-foreground",
      render: (ad) => (ad.impressions ?? 0).toLocaleString(),
    },
    {
      key: "clicks",
      title: "Clicks",
      className: "font-mono text-foreground",
      render: (ad) => (ad.clicks ?? 0).toLocaleString(),
    },
    {
      key: "ctr",
      title: "CTR",
      className: "font-mono text-foreground",
      render: (ad) => `${Number(ad.ctr ?? 0).toFixed(2)}%`,
    },
    {
      key: "spend",
      title: "Spend",
      className: "font-mono text-foreground pr-4",
      headerClassName: "pr-4",
      render: (ad) => formatMoney(Number(ad.spend ?? 0)),
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
        <ViewGrid className="h-4 w-4" /> Ads ({ads.length})
      </h3>
      <DataTable
        columns={columns}
        data={ads}
        pageSize={5}
        striped
        emptyState={
          <EmptyState
            icon={<ViewGrid className="h-6 w-6" />}
            title="No ads yet"
            description="Ad performance data will appear here once your campaign is live."
            className="border-none shadow-none py-8"
          />
        }
      />
    </div>
  );
}


