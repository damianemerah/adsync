"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Facebook,
  MoreVert,
  GraphUp,
  SystemRestart,
  Edit,
  Eye,
  Search,
  Rocket,
  Copy,
} from "iconoir-react";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/dashboard/sparkline";
import Link from "next/link";

import { CampaignMetrics } from "@/lib/utils/campaign-metrics";
import { CampaignIssuesBadge } from "@/components/campaigns/campaign-issues-badge";
import { AdvantagePlusBadge } from "@/components/campaigns/advantage-plus-badge";

interface CampaignsViewProps {
  campaigns: any[];
  onRowClick?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  isLoading?: boolean;
  /** Rows per page. Defaults to 10. Pass 0 to disable pagination. */
  pageSize?: number;
  /** If true, renders the search + status filter bar above the table */
  showFilters?: boolean;
}

export function CampaignsView({
  campaigns,
  onRowClick,
  onDuplicate,
  isLoading,
  pageSize = 10,
  showFilters = true,
}: CampaignsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /** Relative time helper */
  function getRelativeTime(date: Date | string): string {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString();
  }

  /** Normalise campaign fields */
  const displayCampaigns = useMemo(() => {
    return campaigns
      .map((campaign) => {
        const currency =
          campaign.currency || campaign.adAccount?.currency || "NGN";
        const currencySymbol = currency === "NGN" ? "₦" : "$";

        const budgetVal =
          campaign.budget ||
          (campaign.dailyBudgetCents ? campaign.dailyBudgetCents / 100 : 0);
        const spendVal =
          campaign.spend ||
          (campaign.spend_cents ? campaign.spend_cents / 100 : 0);

        const impressionsVal = campaign.impressions || 0;
        const clicksVal = campaign.clicks || 0;
        const ctrVal = campaign.ctr || 0;

        // Build a mini sparkline from campaign-level metrics if available,
        // otherwise leave empty (chart handles empty gracefully)
        const trendData: number[] = campaign.metricsHistory
          ? campaign.metricsHistory.map((m: any) => m.clicks || 0)
          : [];

        const trendColor =
          campaign.status === "active"
            ? "#10b981" // emerald-500
            : "#94a3b8"; // slate-400

        return {
          ...campaign,
          createdAtStr: getRelativeTime(campaign.createdAt),
          spendFormatted: `${currencySymbol}${spendVal.toLocaleString(
            undefined,
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )}`,
          budgetFormatted: `${currencySymbol}${budgetVal.toLocaleString()}`,
          impressionsDisplay: Number(impressionsVal).toLocaleString(),
          clicksDisplay: Number(clicksVal).toLocaleString(),
          ctrDisplay: `${Number(ctrVal).toFixed(2)}%`,
          trendData,
          trendColor,
          // Revenue formatting
          revenueVal: campaign.revenueNgn || 0,
          revenueFormatted: `₦${(campaign.revenueNgn || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          roasVal: CampaignMetrics.calculateROAS(
            campaign.revenueNgn || 0,
            spendVal,
          ),
          roasFormatted: `${CampaignMetrics.calculateROAS(campaign.revenueNgn || 0, spendVal).toFixed(2)}x`,
          salesVal: campaign.salesCount || 0,
          conversionRateVal: CampaignMetrics.calculateConversionRate(
            campaign.salesCount || 0,
            clicksVal,
          ),
          conversionRateFormatted: `${CampaignMetrics.calculateConversionRate(campaign.salesCount || 0, clicksVal).toFixed(2)}%`,
        };
      })
      .sort((a, b) => b.revenueVal - a.revenueVal); // Default sort by Revenue Desc
  }, [campaigns]);

  /** Client-side filtering */
  const filteredCampaigns = useMemo(() => {
    return displayCampaigns.filter((c) => {
      const matchesSearch =
        !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [displayCampaigns, searchTerm, statusFilter]);

  // Import at top if not present, or use inline
  // We need to add columns for Revenue, ROAS, Sales
  const columns: Column<any>[] = [
    {
      key: "name",
      title: "Name",
      className: "font-semibold text-slate-900 pl-6",
      headerClassName: "pl-6",
      render: (campaign) => (
        <div className="flex items-center gap-3">
          <div
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              campaign.status === "active"
                ? "bg-emerald-500 animate-pulse"
                : "bg-slate-300"
            }`}
          />
          {campaign.platform === "meta" && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100/50 text-blue-600 border border-blue-100">
              <Facebook className="h-4 w-4" />
            </div>
          )}
          {campaign.platform === "tiktok" && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white border border-slate-800">
              <span className="font-bold text-[10px]">Tk</span>
            </div>
          )}
          <span>{campaign.name}</span>
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (campaign) => {
        const statusStyles: Record<string, string> = {
          active: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
          paused: "bg-amber-100 text-amber-700 hover:bg-amber-200",
          draft: "bg-slate-100 text-slate-600 hover:bg-slate-200",
          completed: "bg-blue-100 text-blue-700 hover:bg-blue-200",
          failed: "bg-red-100 text-red-700 hover:bg-red-200",
        };
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`rounded-full px-3 py-1 font-semibold border-0 capitalize ${
                statusStyles[campaign.status] ?? statusStyles.draft
              }`}
            >
              {campaign.status}
            </Badge>
            {/* v25.0: Show campaign issues and Advantage+ badges */}
            <CampaignIssuesBadge issues={campaign.meta_issues} compact />
            <AdvantagePlusBadge
              config={campaign.advantage_plus_config}
              compact
            />
          </div>
        );
      },
    },
    {
      key: "amountSpent",
      title: "Spend",
      className: "font-mono font-medium text-slate-700",
      render: (campaign) => campaign.spendFormatted,
    },
    {
      key: "revenue",
      title: "Revenue",
      className: "font-mono font-bold text-emerald-700",
      render: (campaign) => campaign.revenueFormatted,
    },
    {
      key: "roas",
      title: "ROAS",
      className: "font-mono font-medium",
      render: (campaign) => (
        <span
          className={`px-2 py-1 rounded-md text-xs font-bold ${
            campaign.roasVal >= 1.5
              ? "bg-emerald-100 text-emerald-700"
              : campaign.roasVal >= 1.0
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          {campaign.roasFormatted}
        </span>
      ),
    },
    {
      key: "sales",
      title: "Sales",
      className: "font-mono font-medium text-slate-700",
      render: (campaign) => campaign.salesVal,
    },
    {
      key: "impressions",
      title: "Impressions",
      className: "font-mono font-medium text-slate-700",
      render: (campaign) => campaign.impressionsDisplay,
    },
    {
      key: "ctr",
      title: "CTR",
      className: "w-[160px]",
      render: (campaign) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-slate-700">
            {campaign.ctrDisplay}
          </span>
          {campaign.trendData.length > 1 && (
            <Sparkline
              data={campaign.trendData}
              width={80}
              height={30}
              color={campaign.trendColor}
            />
          )}
        </div>
      ),
    },
    {
      key: "clicks",
      title: "Clicks",
      className: "font-mono font-medium text-slate-700",
      render: (campaign) => campaign.clicksDisplay,
    },
    {
      key: "action",
      title: "",
      className: "pr-6 w-12",
      render: (campaign) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <MoreVert className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {campaign.status === "draft" ? (
                <DropdownMenuItem
                  onClick={() =>
                    (window.location.href = `/campaigns/new?draftId=${campaign.id}`)
                  }
                  className="cursor-pointer font-medium"
                >
                  <Edit className="h-4 w-4 mr-2" /> Resume Draft
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href={`/campaigns/${campaign.id}`}>
                    <Eye className="h-4 w-4 mr-2" /> View Details
                  </Link>
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem
                  onClick={() => onDuplicate(campaign.id)}
                  className="cursor-pointer"
                >
                  <Copy className="h-4 w-4 mr-2" /> Duplicate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SystemRestart className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Status Filter Bar */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-md border border-border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all placeholder:text-muted-foreground"
            />
            <GraphUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* Status Dropdown */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10 border-border bg-card rounded-md font-medium text-foreground shadow-sm hover:border-primary/50 transition-colors">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="rounded-md shadow-sm border border-border">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Row count */}
          <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
            {filteredCampaigns.length} of {displayCampaigns.length} campaign
            {displayCampaigns.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredCampaigns}
        onRowClick={(row) => onRowClick?.(row.id)}
        pageSize={pageSize}
        emptyState={
          searchTerm || statusFilter !== "all" ? (
            <Empty className="py-12 border-none">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>No matching campaigns</EmptyTitle>
                <EmptyDescription>
                  Adjust your search filters to see more results.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Empty className="py-12 border-none">
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="bg-primary/10 text-primary"
                >
                  <Rocket className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>No campaigns yet</EmptyTitle>
                <EmptyDescription>
                  Create your first AI-optimized campaign to start generating
                  sales.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/campaigns/new">
                  <Button className="rounded-full bg-primary text-primary-foreground font-semibold">
                    Start Campaign
                  </Button>
                </Link>
              </EmptyContent>
            </Empty>
          )
        }
      />
    </div>
  );
}
