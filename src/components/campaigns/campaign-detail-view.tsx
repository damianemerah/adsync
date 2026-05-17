"use client";

import { useRouter } from "next/navigation";
import { useCampaignDetail } from "@/hooks/use-campaign-detail";
import { ROIMetricsCard } from "@/components/campaigns/roi-metrics-card";
import { MarkAsSoldButton } from "@/components/campaigns/mark-as-sold-button";
import { SubPlacementROICard } from "@/components/campaigns/sub-placement-roi-card";
import { PostLaunchRuleAlert } from "@/components/campaigns/post-launch-rule-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  SystemRestart,
  Edit,
  ArrowRight,
  NavArrowDown,
  GraphUp,
  Copy,
  Archive,
  Trash,
  EditPencil,
  InfoCircle,
} from "iconoir-react";
import { MetaIcon } from "@/components/ui/meta-icon";
import { DataTable, Column } from "@/components/ui/data-table";
import { Campaign } from "@/lib/api/campaigns";
import { useCampaignMutations } from "@/hooks/use-campaigns";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  PerformanceChart,
  METRIC_CONFIG,
  MetricKey,
} from "@/components/dashboard/performance-chart";
import { useState, useMemo } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import {
  bucketPerformance,
  fillBucketRange,
  pickGranularity,
} from "@/lib/utils/date-bucketing";

const PERF_CHIP_METRICS = ["spend", "impressions", "clicks", "ctr", "cpc", "revenue"] as const;

const PERF_CHIP_COLORS: Record<string, string> = {
  spend: "#4F6EF7",
  impressions: "#E2445C",
  clicks: "#00C875",
  ctr: "#784BD1",
  cpc: "#FDAB3D",
  revenue: "#0F9B8E",
};

const PERF_CHIP_LABELS: Record<string, string> = {
  spend: "Spend",
  impressions: "Impr.",
  clicks: "Clicks",
  ctr: "CTR",
  cpc: "CPC",
  revenue: "Revenue",
};

const PERF_CHIP_TOOLTIPS: Record<string, string> = {
  spend: "Total amount spent in the selected period",
  impressions: "Total number of times your ads were seen",
  clicks: "Total link clicks from your ads",
  ctr: "Click-through rate — clicks ÷ impressions",
  cpc: "Average cost per click",
  revenue: "Estimated revenue attributed to this campaign",
};

interface CampaignDetailViewProps {
  campaign: Campaign;
}

export function CampaignDetailView({
  campaign: initialCampaign,
}: CampaignDetailViewProps) {
  const router = useRouter();
  const { updateStatus, isUpdating, duplicateCampaign, isDuplicating, renameCampaign, archiveCampaign, deleteCampaign, isDeleting } = useCampaignMutations();
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>([
    "revenue",
    "spend",
  ]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { dateRange } = useDashboardStore();
  const { campaign: liveCampaign } = useCampaignDetail(initialCampaign.id, {
    initialData: initialCampaign,
  });
  const campaign = liveCampaign ?? initialCampaign;

  const granularity = useMemo(
    () => pickGranularity(dateRange?.from, dateRange?.to),
    [dateRange?.from, dateRange?.to],
  );

  const currencySymbol = campaign.adAccount?.currency === "NGN" ? "₦" : "$";

  // Aggregate summary values displayed in the colored metric chips
  const perfSummaryValues = useMemo(() => {
    const s = campaign.summary || {};
    const spend = Number(s.spend || 0);
    const impressions = Number(s.impressions || 0);
    const clicks = Number(s.clicks || 0);
    const ctr = Number(s.ctr || 0);
    const cpc = Number(s.cpc || 0);
    const revenue = Number(s.revenue || 0);
    const fmt = (v: number) =>
      `${currencySymbol}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return {
      spend: fmt(spend),
      impressions: Math.round(impressions).toLocaleString(),
      clicks: Math.round(clicks).toLocaleString(),
      ctr: `${ctr.toFixed(2)}%`,
      cpc: fmt(cpc),
      revenue: fmt(revenue),
    };
  }, [campaign.summary, currencySymbol]);

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

    const bucketed = bucketPerformance(withCtr, granularity);
    return fillBucketRange(bucketed, dateRange?.from, dateRange?.to, granularity);
  }, [campaign.performance, dateRange, granularity]);

  // Formatters
  const formatMoney = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  const handleStatusChange = (newStatus: "ACTIVE" | "PAUSED" | "ARCHIVED") => {
    updateStatus({ id: campaign.id, action: newStatus });
  };

  if (campaign.status === "draft") {
    return (
      <div className="flex flex-col h-full bg-muted/50">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-card border-b border-border flex justify-between items-center space-x-1">
          <div>
            <h2 className="text-foreground truncate text-lg font-heading font-medium">
              {campaign.name || "Untitled Draft"}
            </h2>
            <Badge variant="warning-soft" className="mt-1">
              Draft
            </Badge>
          </div>

        </div>

        {/* Empty State Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-subtle-foreground">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Edit className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground">
            This campaign hasn't been launched yet.
          </h3>
          <p className="max-w-sm mt-2">
            It is currently saved as a draft. Resume editing to complete the
            setup and launch your ad.
          </p>
          <Button
            onClick={() => router.push(`/campaigns/new?draftId=${campaign.id}`)}
            className="mt-6 bg-primary hover:bg-primary/90 font-bold shadow-sm border border-border min-h-11"
          >
            Resume <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
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
              <h2 className="sm:text-xl font-heading font-bold text-foreground">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="min-h-11 w-11 shrink-0 mr-2">
                  <MoreHoriz className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => duplicateCampaign({ id: campaign.id })}
                  className="cursor-pointer"
                  disabled={isDuplicating}
                >
                  <Copy className="h-4 w-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRenameValue(campaign.name);
                    setRenameDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <EditPencil className="h-4 w-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setArchiveDialogOpen(true);
                  }}
                  className="cursor-pointer text-status-warning focus:text-status-warning"
                >
                  <Archive className="h-4 w-4 mr-2" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDeleteDialogOpen(true);
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                  disabled={isDeleting}
                >
                  <Trash className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
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
        <Card className="border border-border overflow-hidden">
          <CardHeader className="flex flex-col gap-3 pb-3">
            <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <GraphUp className="h-4 w-4" /> Performance
            </h3>
            {/* Metric chips — show aggregate value + toggle chart line */}
            <div className="w-full -mx-1 flex gap-0 overflow-x-auto no-scrollbar rounded-lg overflow-hidden border border-border">
              {PERF_CHIP_METRICS.map((key, idx) => {
                const color = PERF_CHIP_COLORS[key];
                const label = PERF_CHIP_LABELS[key];
                const value = perfSummaryValues[key];
                const isActive = activeMetrics.includes(key as MetricKey);
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (isActive && activeMetrics.length === 1) return;
                          setActiveMetrics((prev) =>
                            isActive
                              ? prev.filter((k) => k !== key)
                              : [...prev, key as MetricKey],
                          );
                        }}
                        className={[
                          "group flex-1 min-w-[90px] sm:min-w-0 flex flex-col items-start gap-0.5 px-3 py-2.5 transition-all",
                          idx > 0 ? "border-l border-white/10" : "",
                          !isActive ? "opacity-60" : "",
                        ].join(" ")}
                        style={{ backgroundColor: color }}
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          <span
                            className={[
                              "h-3 w-3 shrink-0 rounded-sm border flex items-center justify-center transition-all",
                              isActive
                                ? "bg-white/30 border-white/50"
                                : "bg-transparent border-white/30",
                            ].join(" ")}
                          >
                            {isActive && (
                              <svg viewBox="0 0 10 10" className="h-2 w-2" fill="none">
                                <path
                                  d="M2 5l2.5 2.5L8 3"
                                  stroke="white"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider truncate">
                            {label}
                          </span>
                          <InfoCircle className="h-2.5 w-2.5 text-white/50 shrink-0 ml-auto" />
                        </div>
                        <span className="text-sm font-bold text-white tabular-nums truncate w-full text-left pl-[18px]">
                          {value}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {PERF_CHIP_TOOLTIPS[key]}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="w-full h-[280px] sm:h-[320px]">
              <PerformanceChart
                data={chartData}
                activeMetrics={activeMetrics}
                granularity={granularity}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Rename Dialog ── */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Ad</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && renameValue.trim()) {
                  renameCampaign({ id: campaign.id, name: renameValue });
                  setRenameDialogOpen(false);
                }
              }}
              placeholder="Ad name"
              className="w-full"
              autoFocus
              maxLength={150}
            />
            <p className="text-xs text-subtle-foreground mt-1.5">
              {renameValue.length}/150 characters
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!renameValue.trim() || renameValue.trim() === campaign.name}
              onClick={() => {
                if (renameValue.trim()) {
                  renameCampaign({ id: campaign.id, name: renameValue });
                  setRenameDialogOpen(false);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Archive Confirmation ── */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this ad?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{campaign.name}</strong> will be hidden from active views.
              It will remain on Meta untouched — you can still view it in completed campaigns.
              This only affects your Tenzu dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-status-warning hover:bg-status-warning/90 text-status-warning-foreground"
              onClick={() => {
                archiveCampaign({ id: campaign.id });
                setArchiveDialogOpen(false);
                router.push("/campaigns");
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this ad?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{campaign.name}</strong> will be deleted from Meta and
              permanently removed from Tenzu. This action cannot be undone.
              Draft ads (not yet launched) will only be removed from Tenzu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                deleteCampaign({ id: campaign.id });
                setDeleteDialogOpen(false);
                router.push("/campaigns");
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        striped={false}
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


