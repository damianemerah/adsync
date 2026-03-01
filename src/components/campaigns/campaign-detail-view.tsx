"use client";

import { useEffect } from "react";
import { syncCampaignInsights, syncCampaignAds } from "@/actions/campaigns";
import { useRouter } from "next/navigation";
import { ROIMetricsCard } from "@/components/campaigns/roi-metrics-card";
import { MarkAsSoldButton } from "@/components/campaigns/mark-as-sold-button";
import { PixelSnippetCard } from "@/components/campaigns/pixel-snippet-card";
import { SubPlacementROICard } from "@/components/campaigns/sub-placement-roi-card";
import { PostLaunchRuleAlert } from "@/components/campaigns/post-launch-rule-alert";
import { DemographicsCard } from "@/components/campaigns/demographics-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  Facebook,
  Globe,
  ViewGrid,
  MoreHoriz,
  Pause,
  Play,
  Settings,
  SystemRestart,
  Edit,
  ArrowRight,
  GraphUp,
} from "iconoir-react";
import { DataTable, Column } from "@/components/ui/data-table";
import { Campaign } from "@/lib/api/campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCampaigns } from "@/hooks/use-campaigns";
import { CampaignMetrics } from "@/lib/utils/campaign-metrics";

import {
  PerformanceChart,
  METRIC_CONFIG,
  MetricKey,
} from "@/components/dashboard/performance-chart";
import { useState, useMemo } from "react";
import { useDashboardStore } from "@/store/dashboard-store";

interface CampaignDetailViewProps {
  campaign: Campaign;
}

export function CampaignDetailView({ campaign }: CampaignDetailViewProps) {
  const router = useRouter();
  const { updateStatus, isUpdating } = useCampaigns();
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>([
    "revenue",
    "spend",
  ]);
  const { dateRange } = useDashboardStore();

  // Auto-sync insights and ads when component mounts if data is stale or missing
  useEffect(() => {
    const syncData = async () => {
      // Only sync for active/paused campaigns (not drafts)
      if (campaign.status === "draft") return;

      // Check if performance data exists and is recent (within last hour)
      const hasRecentData =
        campaign.performance && campaign.performance.length > 0;
      const lastUpdate = campaign.updatedAt
        ? new Date(campaign.updatedAt)
        : null;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const isStale = !lastUpdate || lastUpdate < oneHourAgo;

      if (!hasRecentData || isStale) {
        // Sync in background without blocking UI
        Promise.all([
          syncCampaignInsights(campaign.id).catch((err) =>
            console.error("Insights sync failed:", err),
          ),
          syncCampaignAds(campaign.id).catch((err) =>
            console.error("Ads sync failed:", err),
          ),
        ]);
      }
    };

    syncData();
  }, [campaign.id, campaign.status, campaign.updatedAt, campaign.performance]);

  // Calculate CTR for chart data since API might return it or we compute it
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

    return rawData.map((day: any) => ({
      ...day,
      // If API doesn't return computed CTR per day, do it safely
      ctr:
        day.ctr ?? (day.impressions ? (day.clicks / day.impressions) * 100 : 0),
    }));
  }, [campaign.performance, dateRange]);

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
      <div className="flex flex-col h-full bg-slate-50/50">
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {campaign.name || "Untitled Draft"}
            </h2>
            <Badge
              variant="secondary"
              className="mt-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            >
              Draft
            </Badge>
          </div>
          <Button
            onClick={() => router.push(`/campaigns/new?draftId=${campaign.id}`)}
            className="bg-primary hover:bg-primary/90 font-bold shadow-lg"
          >
            Resume Editing <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Empty State Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Edit className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">
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
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header Section */}
      <div className="p-6 bg-white border-b border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {campaign.platform === "meta" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Facebook className="h-6 w-6" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                <span className="font-bold">Tk</span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {campaign.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
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
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreHoriz className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge
                variant="secondary"
                className={`text-sm px-3 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
                  campaign.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isUpdating ? (
                  <SystemRestart className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : campaign.status === "active" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Active - Delivering
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Pause className="h-3.5 w-3.5" />
                    Paused
                  </span>
                )}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
                <Play className="h-4 w-4 mr-2 text-emerald-500" />
                Set as Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange("PAUSED")}>
                <Pause className="h-4 w-4 mr-2 text-slate-500" />
                Pause Campaign
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleStatusChange("ARCHIVED")}
              >
                Archive Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-slate-200 mx-2" />
          <div className="flex items-center text-sm text-slate-600">
            <Calendar className="h-4 w-4 mr-1.5 text-slate-400" />
            {new Date(campaign.createdAt).toLocaleDateString()}
          </div>
          <div className="h-4 w-px bg-slate-200 mx-2" />
          <div className="flex items-center text-sm text-slate-600">
            <CreditCard className="h-4 w-4 mr-1.5 text-slate-400" />
            Budget: {formatMoney(campaign.dailyBudgetCents / 100)}/day
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-px bg-slate-200 border-b border-slate-200">
        <StatBox
          label="Revenue"
          value={formatMoney(campaign.revenueNgn || 0)}
        />
        <StatBox
          label="ROAS"
          value={`${CampaignMetrics.calculateROAS(campaign.revenueNgn || 0, campaign.summary.spend).toFixed(2)}x`}
        />
        <StatBox label="Sales" value={formatNumber(campaign.salesCount || 0)} />
        <StatBox
          label="Spend"
          value={formatMoney(campaign.summary.spend)}
          isLast
        />
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Post-launch intelligence alert — surfaces highest-severity triggered rule */}
        <PostLaunchRuleAlert campaign={campaign} />

        {/* Attribution & ROI Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <StatsReport className="h-4 w-4" /> Attribution & ROI
            </h3>
            <MarkAsSoldButton campaignId={campaign.id} />
          </div>
          <ROIMetricsCard campaignId={campaign.id} />
          {campaign.pixelToken && (
            <PixelSnippetCard pixelToken={campaign.pixelToken} />
          )}
          <SubPlacementROICard campaignId={campaign.id} />
        </div>

        {/* Ad Set / Targeting Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configuration
          </h3>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="p-4 space-y-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Optimization Goal
                  </span>
                  <p className="font-medium text-slate-900 capitalize">
                    {campaign.objective.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="p-4 space-y-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Bid Strategy
                  </span>
                  <p className="font-medium text-slate-900">Highest Volume</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demographics Visualization */}
        {campaign.demographics && (
          <div className="space-y-3">
            <DemographicsCard demographics={campaign.demographics} />
          </div>
        )}

        {/* Ads Table */}
        <AdsTable ads={campaign.ads || []} formatMoney={formatMoney} />

        {/* Performance Graph */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <GraphUp className="h-4 w-4" /> Performance
            </h3>

            {/* Metric Toggles */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
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
                      flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                      ${
                        isActive
                          ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
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

          <div className="h-[300px] w-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <PerformanceChart data={chartData} activeMetrics={activeMetrics} />
          </div>
        </div>
      </div>
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
            <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-slate-100 bg-slate-100">
              <img
                src={ad.image}
                alt={ad.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-lg shrink-0 bg-slate-100 flex items-center justify-center">
              <ViewGrid className="h-4 w-4 text-slate-400" />
            </div>
          )}
          <span className="font-semibold text-slate-900 truncate max-w-[200px]">
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
          className={`text-xs font-semibold capitalize ${
            ad.status === "ACTIVE"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {ad.status?.toLowerCase() ?? "—"}
        </Badge>
      ),
    },
    {
      key: "impressions",
      title: "Impressions",
      className: "font-mono text-slate-700",
      render: (ad) => (ad.impressions ?? 0).toLocaleString(),
    },
    {
      key: "clicks",
      title: "Clicks",
      className: "font-mono text-slate-700",
      render: (ad) => (ad.clicks ?? 0).toLocaleString(),
    },
    {
      key: "ctr",
      title: "CTR",
      className: "font-mono text-slate-700",
      render: (ad) => `${(ad.ctr ?? 0).toFixed(2)}%`,
    },
    {
      key: "spend",
      title: "Spend",
      className: "font-mono text-slate-700 pr-4",
      headerClassName: "pr-4",
      render: (ad) => formatMoney(Number(ad.spend ?? 0)),
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
        <ViewGrid className="h-4 w-4" /> Ads ({ads.length})
      </h3>
      <DataTable
        columns={columns}
        data={ads}
        pageSize={5}
        striped
        emptyState={
          <div className="text-center py-8 text-slate-500 text-sm">
            No ads found for this campaign.
          </div>
        }
      />
    </div>
  );
}

function StatBox({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div className={`bg-white p-4 ${isLast ? "" : ""}`}>
      <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
