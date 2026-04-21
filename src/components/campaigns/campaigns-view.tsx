"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
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
  Trash,
  Archive,
  EditPencil,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
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
}

export function CampaignsView({
  campaigns,
  onRowClick,
  onDuplicate,
  onDelete,
  onArchive,
  onRename,
  isLoading,
  pageSize = 10,
  showFilters = true,
  defaultSort = "revenue",
  controlledStatus,
  controlledSearch,
}: CampaignsViewProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>("all");

  // Dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);

  // When controlled props are provided, use them; otherwise use internal state
  const isControlled = controlledStatus !== undefined || controlledSearch !== undefined;
  const searchTerm = controlledSearch ?? internalSearchTerm;
  const statusFilter = controlledStatus ?? internalStatusFilter;

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

      // Build a mini sparkline from campaign-level metrics if available,
      // otherwise leave empty (chart handles empty gracefully)
      const trendData: number[] = campaign.metricsHistory
        ? campaign.metricsHistory.map((m: any) => m.clicks || 0)
        : [];

      const trendColor =
        campaign.status === "active"
          ? "var(--primary)"
          : "var(--muted-foreground)";

      // Resolve created_at timestamp for sorting
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
    });

    // Sort according to defaultSort prop
    if (defaultSort === "active-first") {
      return normalised.sort((a, b) => {
        const rankDiff =
          (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
        if (rankDiff !== 0) return rankDiff;
        return b.createdAtMs - a.createdAtMs; // Newest within same status
      });
    } else if (defaultSort === "recent") {
      return normalised.sort((a, b) => b.createdAtMs - a.createdAtMs);
    }
    // Default: revenue desc
    return normalised.sort((a, b) => b.revenueVal - a.revenueVal);
  }, [campaigns, defaultSort]);

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
      className: "font-semibold text-foreground pl-6",
      headerClassName: "pl-6",
      render: (campaign) => (
        <div className="flex items-center gap-3">
          <div
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              campaign.status === "active"
                ? "bg-primary animate-pulse"
                : "bg-muted-foreground/40"
            }`}
          />
          {campaign.platform === "meta" && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-chart-1-soft text-chart-1 border border-chart-1/15">
              <Facebook className="h-4 w-4" />
            </div>
          )}
          {campaign.platform === "tiktok" && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tiktok text-brand-tiktok-foreground">
              <span className="font-bold text-xs">Tk</span>
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
              className="rounded-sm px-3 py-1 font-semibold capitalize"
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
      className: "font-mono font-medium text-foreground",
      render: (campaign) => campaign.spendFormatted,
    },
    {
      key: "revenue",
      title: "Revenue",
      className: "font-mono font-bold text-status-success",
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
      render: (campaign) => campaign.salesVal,
    },
    {
      key: "impressions",
      title: "Impressions",
      className: "font-mono font-medium text-foreground",
      render: (campaign) => campaign.impressionsDisplay,
    },
    {
      key: "ctr",
      title: "CTR",
      className: "w-[160px]",
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
              {/* ── Rename ── */}
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
              {/* ── Separator before destructive actions ── */}
              {(onArchive || onDelete) && <DropdownMenuSeparator />}
              {/* ── Archive ── */}
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
              {/* ── Delete ── */}
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SystemRestart className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Status Filter Bar — hidden when parent controls filters or showFilters=false */}
      {showFilters && !isControlled && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={internalSearchTerm}
              onChange={(e) => setInternalSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-md border border-border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all placeholder:text-muted-foreground"
            />
            <GraphUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* Status Dropdown */}
          <Select value={internalStatusFilter} onValueChange={setInternalStatusFilter}>
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
          <span className="text-xs text-subtle-foreground ml-auto hidden sm:block">
            {filteredCampaigns.length} of {displayCampaigns.length} campaign
            {displayCampaigns.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Row count when controlled (no inner filter bar) */}
      {isControlled && filteredCampaigns.length !== displayCampaigns.length && (
        <p className="text-xs text-subtle-foreground">
          Showing {filteredCampaigns.length} of {displayCampaigns.length} campaign
          {displayCampaigns.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Mobile: card list (below md) */}
      <motion.div
        className="md:hidden space-y-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04 } },
        }}
      >
        {filteredCampaigns.length === 0 ? (
          searchTerm || statusFilter !== "all" ? (
            <Empty className="py-10 border border-dashed border-border rounded-lg">
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
            <Empty className="py-10 border border-dashed border-border rounded-lg">
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
        ) : (
          filteredCampaigns.map((campaign) => {
            const statusVariant: Record<
              string,
              | "success-soft"
              | "warning-soft"
              | "danger-soft"
              | "info-soft"
              | "secondary"
            > = {
              active: "success-soft",
              paused: "warning-soft",
              draft: "secondary",
              completed: "info-soft",
              failed: "danger-soft",
            };
            return (
              <motion.button
                key={campaign.id}
                type="button"
                onClick={() => onRowClick?.(campaign.id)}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
                }}
                whileTap={{ scale: 0.98 }}
                className="w-full text-left rounded-lg border border-border bg-card p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {campaign.platform === "meta" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chart-1-soft text-chart-1 border border-chart-1/15">
                      <Facebook className="h-4 w-4" />
                    </div>
                  )}
                  {campaign.platform === "tiktok" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tiktok text-brand-tiktok-foreground">
                      <span className="font-bold text-xs">Tk</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {campaign.name}
                    </p>
                    <p className="text-xs text-subtle-foreground">
                      {campaign.createdAtStr}
                    </p>
                  </div>
                  <Badge
                    variant={statusVariant[campaign.status] ?? "secondary"}
                    className="rounded-sm px-2 py-0.5 font-semibold capitalize shrink-0"
                  >
                    {campaign.status}
                  </Badge>
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
                              setRenameTarget({
                                id: campaign.id,
                                name: campaign.name,
                              });
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
                              setArchiveTarget({
                                id: campaign.id,
                                name: campaign.name,
                              });
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
                              setDeleteTarget({
                                id: campaign.id,
                                name: campaign.name,
                              });
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
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-subtle-foreground">
                      Spend
                    </p>
                    <p className="font-mono font-semibold text-foreground">
                      {campaign.spendFormatted}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-subtle-foreground">
                      Revenue
                    </p>
                    <p className="font-mono font-bold text-status-success">
                      {campaign.revenueFormatted}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-subtle-foreground">
                      ROAS
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold ${
                        campaign.roasVal >= 1.5
                          ? "bg-status-success-soft text-status-success"
                          : campaign.roasVal >= 1.0
                            ? "bg-status-warning-soft text-status-warning"
                            : "bg-status-danger-soft text-status-danger"
                      }`}
                    >
                      {campaign.roasFormatted}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-subtle-foreground border-t border-border pt-3">
                  <span>
                    CTR{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {campaign.ctrDisplay}
                    </span>
                  </span>
                  <span>
                    Clicks{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {campaign.clicksDisplay}
                    </span>
                  </span>
                  <span>
                    Sales{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {campaign.salesVal}
                    </span>
                  </span>
                </div>
              </motion.button>
            );
          })
        )}
      </motion.div>

      {/* Desktop: data table (md+) */}
      <div className="hidden md:block">
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
