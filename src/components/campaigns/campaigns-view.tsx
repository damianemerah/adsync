"use client";

import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  MoreVert,
  SystemRestart,
  Edit,
  Eye,
  Search,
  Rocket,
  Copy,
  Trash,
  Archive,
  EditPencil,
  Pause,
  Play,
  Download,
  Filter,
  TiktokSolid
} from "iconoir-react";
import { MetaIcon } from "@/components/ui/meta-icon";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkline } from "@/components/dashboard/sparkline";
import Link from "next/link";

import { CampaignMetrics } from "@/lib/utils/campaign-metrics";
import { CampaignIssuesBadge } from "@/components/campaigns/campaign-issues-badge";
import { AdvantagePlusBadge } from "@/components/campaigns/advantage-plus-badge";
import { cn } from "@/lib/utils";

interface CampaignsViewProps {
  campaigns: any[];
  onRowClick?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onToggleStatus?: (id: string, action: "PAUSED" | "ACTIVE") => void;
  isLoading?: boolean;
  /** Rows per page. Defaults to 10. Pass 0 to disable pagination. */
  pageSize?: number;
  /** If true, renders the search + status filter bar above the table */
  showFilters?: boolean;
  /**
   * Default sort order for the table.
   * - "revenue"      → sort by revenue descending (default)
   * - "recent"       → sort by created_at descending (most recent first)
   * - "active-first" → active campaigns first, then by created_at descending
   */
  defaultSort?: "revenue" | "recent" | "active-first";
  /** When provided, bypasses internal status state and filters by this value */
  controlledStatus?: string;
  /** When provided, bypasses internal search state and filters by this value */
  controlledSearch?: string;
  /** When false, shows a connect-account empty state instead of the generic one */
  hasConnectedAccount?: boolean;
  // --- Server-side pagination props ---
  /** Current page (1-indexed). When provided, enables server-side pagination mode. */
  currentPage?: number;
  /** Total number of pages from the server. */
  totalPages?: number;
  /** Total campaign count from the server (used for display). */
  totalCount?: number;
  /** Called when the user navigates to a different page. */
  onPageChange?: (page: number) => void;
  // --- Server-side filter props ---
  /** Controlled search value (raw, before debounce). */
  search?: string;
  onSearchChange?: (s: string) => void;
  /** Controlled status filter (null = all non-archived). */
  status?: string | null;
  onStatusChange?: (s: string | null) => void;
  /** Called when the active/archived tab changes. */
  onTabChange?: (tab: "active" | "archived") => void;
}

const ALL_COLUMN_KEYS = [
  "status",
  "amountSpent",
  "revenue",
  "roas",
  "sales",
  "impressions",
  "ctr",
  "clicks",
] as const;

export function CampaignsView({
  campaigns,
  onRowClick,
  onDuplicate,
  onDelete,
  onArchive,
  onRename,
  onToggleStatus,
  isLoading,
  pageSize = 10,
  showFilters = true,
  defaultSort = "revenue",
  controlledStatus,
  controlledSearch,
  hasConnectedAccount = true,
  // Server-side pagination
  currentPage,
  totalCount,
  onPageChange,
  // Server-side filters
  search: searchProp,
  onSearchChange,
  status: statusProp,
  onStatusChange,
  onTabChange,
}: CampaignsViewProps) {
  const isServerMode = onPageChange !== undefined;

  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all");
  const [activeViewTab, setActiveViewTab] = useState<"active" | "archived">("active");

  // Column visibility — all on by default
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMN_KEYS),
  );

  // Sort state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);

  // Mobile card pagination
  const [currentMobilePage, setCurrentMobilePage] = useState(1);

  // In server mode, use controlled props; otherwise fall back to legacy controlledStatus/Search or internal state
  const searchTerm = isServerMode ? (searchProp ?? "") : (controlledSearch ?? internalSearchTerm);
  const statusFilter = isServerMode ? (statusProp ?? "all") : (controlledStatus ?? internalStatusFilter);

  function handleSearchChange(value: string) {
    if (isServerMode) {
      onSearchChange?.(value);
    } else {
      setInternalSearchTerm(value);
    }
  }

  function handleStatusChange(value: string) {
    if (isServerMode) {
      onStatusChange?.(value === "all" ? null : value);
    } else {
      setInternalStatusFilter(value);
    }
  }

  function handleTabChange(tab: "active" | "archived") {
    setActiveViewTab(tab);
    onTabChange?.(tab);
  }

  // Reset mobile page to 1 whenever filters change
  useEffect(() => {
    setCurrentMobilePage(1);
  }, [searchTerm, statusFilter]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

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

  /** Status rank for active-first sorting */
  const STATUS_RANK: Record<string, number> = {
    active: 0,
    paused: 1,
    draft: 2,
    completed: 3,
    failed: 4,
  };

  /** Normalise campaign fields */
  const displayCampaigns = useMemo(() => {
    const normalised = campaigns.map((campaign) => {
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

      const trendData: number[] = campaign.metricsHistory
        ? campaign.metricsHistory.map((m: any) => m.clicks || 0)
        : [];

      const trendColor =
        campaign.status === "active"
          ? "var(--primary)"
          : "var(--muted-foreground)";

      const createdAtMs = campaign.createdAt
        ? new Date(campaign.createdAt).getTime()
        : campaign.created_at
          ? new Date(campaign.created_at).getTime()
          : 0;

      return {
        ...campaign,
        createdAtMs,
        createdAtStr: getRelativeTime(campaign.createdAt || campaign.created_at),
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
        spendVal,
        impressionsVal,
        clicksVal,
        ctrVal,
      };
    });

    if (defaultSort === "active-first") {
      return normalised.sort((a, b) => {
        const rankDiff =
          (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
        if (rankDiff !== 0) return rankDiff;
        return b.createdAtMs - a.createdAtMs;
      });
    } else if (defaultSort === "recent") {
      return normalised.sort((a, b) => b.createdAtMs - a.createdAtMs);
    }
    return normalised.sort((a, b) => b.revenueVal - a.revenueVal);
  }, [campaigns, defaultSort]);

  /** Client-side filtering — skipped in server mode since data is pre-filtered */
  const filteredCampaigns = useMemo(() => {
    if (isServerMode) return displayCampaigns;
    return displayCampaigns.filter((c) => {
      const matchesTab =
        activeViewTab === "archived"
          ? c.status === "completed"
          : c.status !== "completed";
      const matchesSearch =
        !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        activeViewTab === "archived" ||
        statusFilter === "all" ||
        c.status === statusFilter;
      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [isServerMode, displayCampaigns, searchTerm, statusFilter, activeViewTab]);

  /** Column sort applied after filter */
  const sortedCampaigns = useMemo(() => {
    if (!sortKey) {
      if (activeViewTab === "archived") {
        return [...filteredCampaigns].sort((a, b) => b.createdAtMs - a.createdAtMs);
      }
      return filteredCampaigns;
    }
    const sorted = [...filteredCampaigns].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (sortKey) {
        case "name":
          aVal = (a.name ?? "").toLowerCase();
          bVal = (b.name ?? "").toLowerCase();
          return sortDir === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        case "status":
          aVal = STATUS_RANK[a.status] ?? 99;
          bVal = STATUS_RANK[b.status] ?? 99;
          break;
        case "amountSpent":
          aVal = a.spendVal;
          bVal = b.spendVal;
          break;
        case "revenue":
          aVal = a.revenueVal;
          bVal = b.revenueVal;
          break;
        case "roas":
          aVal = a.roasVal;
          bVal = b.roasVal;
          break;
        case "sales":
          aVal = a.salesVal;
          bVal = b.salesVal;
          break;
        case "impressions":
          aVal = a.impressionsVal;
          bVal = b.impressionsVal;
          break;
        case "ctr":
          aVal = a.ctrVal;
          bVal = b.ctrVal;
          break;
        case "clicks":
          aVal = a.clicksVal;
          bVal = b.clicksVal;
          break;
        default:
          return 0;
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredCampaigns, sortKey, sortDir, activeViewTab]);

  // Mobile: slice filtered campaigns to the current page window
  const visibleMobileCampaigns =
    pageSize > 0
      ? filteredCampaigns.slice(0, currentMobilePage * pageSize)
      : filteredCampaigns;
  const hasMoreMobile =
    pageSize > 0 && visibleMobileCampaigns.length < filteredCampaigns.length;

  function exportCSV() {
    const headers = ["Name", "Status", "Spend", "Revenue", "ROAS", "Clicks", "Impressions"];
    const rows = sortedCampaigns.map((c) => [
      `"${(c.name ?? "").replace(/"/g, '""')}"`,
      c.status ?? "",
      c.spendFormatted ?? "",
      c.revenueFormatted ?? "",
      c.roasFormatted ?? "",
      c.clicksDisplay ?? "",
      c.impressionsDisplay ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `campaigns-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const allColumns: Column<any>[] = [
    {
      key: "name",
      title: "Name",
      className: "font-semibold text-foreground pl-4",
      headerClassName: "pl-4",
      sortable: true,
      render: (campaign) => (
        <div className="flex items-center gap-3">
          <div className="w-8 flex justify-center items-center shrink-0">
            {onToggleStatus && (campaign.status === "active" || campaign.status === "paused") ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus(
                    campaign.id,
                    campaign.status === "active" ? "PAUSED" : "ACTIVE",
                  );
                }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                  campaign.status === "active"
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-muted",
                )}
                title={campaign.status === "active" ? "Pause campaign" : "Resume campaign"}
              >
                {campaign.status === "active" ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  campaign.status === "active"
                    ? "bg-primary animate-pulse"
                    : "bg-muted-foreground/40"
                )}
              />
            )}
          </div>
          {campaign.platform === "meta" && (
            <div className="flex h-7 w-7 items-center justify-center shrink-0">
              <MetaIcon className="h-4 w-4" />
            </div>
          )}
          {campaign.platform === "tiktok" && (
            <div className="flex h-7 w-7 items-center justify-center text-brand-tiktok-foreground shrink-0">
              <TiktokSolid className="h-4 w-4" />
            </div>
          )}
          <span className="truncate max-w-[200px]">{campaign.name}</span>
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      sortable: true,
      render: (campaign) => {
        const statusVariant: Record<
          string,
          "success-soft" | "warning-soft" | "danger-soft" | "info-soft" | "secondary"
        > = {
          active: "success-soft",
          paused: "warning-soft",
          draft: "secondary",
          completed: "info-soft",
          failed: "danger-soft",
        };
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={statusVariant[campaign.status] ?? "secondary"}
              className="rounded-sm px-2.5 py-0.5 font-semibold capitalize text-xs"
            >
              {campaign.status}
            </Badge>
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
      className: "font-mono font-medium text-foreground",
      sortable: true,
      render: (campaign) => campaign.spendFormatted,
    },
    {
      key: "revenue",
      title: "Revenue",
      className: "font-mono font-bold text-status-success",
      sortable: true,
      render: (campaign) => campaign.revenueFormatted,
    },
    {
      key: "roas",
      title: "ROAS",
      className: "font-mono font-medium",
      sortable: true,
      render: (campaign) => (
        <span
          className={`px-2 py-0.5 rounded-md text-xs font-bold ${
            campaign.roasVal >= 1.5
              ? "bg-status-success-soft text-status-success"
              : campaign.roasVal >= 1.0
                ? "bg-status-warning-soft text-status-warning"
                : "bg-status-danger-soft text-status-danger"
          }`}
        >
          {campaign.roasFormatted}
        </span>
      ),
    },
    {
      key: "sales",
      title: "Sales",
      className: "font-mono font-medium text-foreground",
      sortable: true,
      render: (campaign) => campaign.salesVal,
    },
    {
      key: "impressions",
      title: "Impressions",
      className: "font-mono font-medium text-foreground",
      sortable: true,
      render: (campaign) => campaign.impressionsDisplay,
    },
    {
      key: "ctr",
      title: "CTR",
      className: "w-[160px]",
      sortable: true,
      render: (campaign) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-foreground">
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
      className: "font-mono font-medium text-foreground",
      sortable: true,
      render: (campaign) => campaign.clicksDisplay,
    },
    {
      key: "action",
      title: "",
      className: "pr-4 w-12",
      render: (campaign) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-muted text-subtle-foreground hover:text-foreground transition-colors">
                <MoreVert className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
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
              {onRename && (
                <DropdownMenuItem
                  onClick={() => {
                    setRenameTarget({ id: campaign.id, name: campaign.name });
                    setRenameValue(campaign.name);
                    setRenameDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <EditPencil className="h-4 w-4 mr-2" /> Rename
                </DropdownMenuItem>
              )}
              {(onArchive || onDelete) && <DropdownMenuSeparator />}
              {onArchive && (
                <DropdownMenuItem
                  onClick={() => {
                    setArchiveTarget({ id: campaign.id, name: campaign.name });
                    setArchiveDialogOpen(true);
                  }}
                  className="cursor-pointer text-status-warning focus:text-status-warning"
                >
                  <Archive className="h-4 w-4 mr-2" /> Archive
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => {
                    setDeleteTarget({ id: campaign.id, name: campaign.name });
                    setDeleteDialogOpen(true);
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // name and action columns are always shown; others respect visibility toggle
  const columns = allColumns.filter(
    (c) => c.key === "action" || c.key === "name" || visibleColumns.has(c.key),
  );

  // Column label map for the visibility toggle UI
  const COLUMN_LABELS: Record<string, string> = {
    status: "Status",
    amountSpent: "Spend",
    revenue: "Revenue",
    roas: "ROAS",
    sales: "Sales",
    impressions: "Impressions",
    ctr: "CTR",
    clicks: "Clicks",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SystemRestart className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tableHeader = showFilters ? (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 border-b border-border">
      {/* Title */}
      <h3 className="font-bold text-base text-foreground font-heading shrink-0">
        Campaigns
      </h3>

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search campaign..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full h-8 pl-8 pr-3 rounded-md border border-border bg-muted/40 text-sm outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all placeholder:text-muted-foreground"
        />
      </div>

      {/* Right-side controls */}
      <div className="flex items-center gap-2 lg:ml-auto">
        {/* Status filter — hidden on archived tab */}
        {activeViewTab === "active" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold border-border">
                <Filter className="h-3.5 w-3.5" />
                {statusFilter === "all" ? "Filter" : <span className="capitalize">{statusFilter}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["all", "active", "paused", "draft", "failed"].map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter === s}
                  onCheckedChange={() => handleStatusChange(s)}
                  className="capitalize cursor-pointer text-sm"
                >
                  {s === "all" ? "All Statuses" : s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold border-border">
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="4" height="4" rx="0.5" />
                <rect x="6" y="1" width="4" height="4" rx="0.5" />
                <rect x="11" y="1" width="4" height="4" rx="0.5" />
                <rect x="1" y="6" width="4" height="4" rx="0.5" />
                <rect x="6" y="6" width="4" height="4" rx="0.5" />
                <rect x="11" y="6" width="4" height="4" rx="0.5" />
              </svg>
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMN_KEYS.map((key) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={visibleColumns.has(key)}
                onCheckedChange={() => toggleColumn(key)}
                className="cursor-pointer text-sm"
              >
                {COLUMN_LABELS[key]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export CSV */}
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          disabled={sortedCampaigns.length === 0}
          className="h-8 gap-1.5 text-xs font-semibold border-border"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {/* Active / Archived tab toggle */}
      <Tabs
        value={activeViewTab}
        onValueChange={(v) => {
          const tab = v as "active" | "archived";
          handleTabChange(tab);
          if (!isServerMode) setInternalStatusFilter("all");
        }}
      >
        <TabsList>
          <TabsTrigger value="active">Campaigns</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Desktop: data table (md+) */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {tableHeader}
        <DataTable
          columns={columns}
          data={sortedCampaigns}
          onRowClick={(row) => onRowClick?.(row.id)}
          pageSize={pageSize}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          borderless
          striped={false}
          {...(isServerMode ? { totalCount, currentPage, onPageChange } : {})}
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
            ) : !hasConnectedAccount ? (
              <Empty className="py-12 border-none">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-muted text-muted-foreground">
                    <MetaIcon className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No ad account connected</EmptyTitle>
                  <EmptyDescription>
                    Connect your Meta ad account to start running and managing campaigns.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Link href="/settings/business">
                    <Button className="rounded-md bg-primary text-primary-foreground font-semibold">
                      Connect ad account
                    </Button>
                  </Link>
                </EmptyContent>
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
                    <Button className="rounded-md bg-primary text-primary-foreground font-semibold">
                      Create your first ad
                    </Button>
                  </Link>
                </EmptyContent>
              </Empty>
            )
          }
        />
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
                if (e.key === "Enter" && renameTarget && renameValue.trim()) {
                  onRename?.(renameTarget.id, renameValue);
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
              disabled={!renameValue.trim() || renameValue.trim() === renameTarget?.name}
              onClick={() => {
                if (renameTarget && renameValue.trim()) {
                  onRename?.(renameTarget.id, renameValue);
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
              <strong className="text-foreground">{archiveTarget?.name}</strong> will be hidden from active views.
              It will remain on Meta untouched — you can still view it in completed campaigns.
              This only affects your Tenzu dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-status-warning hover:bg-status-warning/90 text-status-warning-foreground"
              onClick={() => {
                if (archiveTarget) {
                  onArchive?.(archiveTarget.id);
                  setArchiveDialogOpen(false);
                }
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
              <strong className="text-foreground">{deleteTarget?.name}</strong> will be deleted from Meta and
              permanently removed from Tenzu. This action cannot be undone.
              Draft ads (not yet launched) will only be removed from Tenzu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (deleteTarget) {
                  onDelete?.(deleteTarget.id);
                  setDeleteDialogOpen(false);
                }
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
