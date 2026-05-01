"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MetaIcon } from "@/components/ui/meta-icon";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import { GlobalContextBar } from "@/components/layout/global-context-bar";
import { PerformanceTrendsCard } from "@/components/dashboard/performance-trends-card";
import { DemographicsCharts } from "@/components/dashboard/demographics-charts";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { CampaignDetailSheet } from "@/components/campaigns/campaign-detail-sheet";
import { RevenueChannelBreakdown } from "@/components/dashboard/revenue-channel-breakdown";
import { useDashboardStore } from "@/store/dashboard-store";
import { useInsights } from "@/hooks/use-insights";
import { useCampaignsList, useCampaignMutations } from "@/hooks/use-campaigns";
import { useMetaConnectionRefresh } from "@/hooks/use-meta-connection-refresh";
import { calculateChannelBreakdown, CampaignForBreakdown } from "@/lib/utils/campaign-metrics";

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
  hasConnectedAccount?: boolean;
}

export function UnifiedDashboard({
  initialData,
  campaigns,
  userId: _userId,
  hasConnectedAccount = true,
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

  // Invalidate queries automatically after a successful Meta OAuth connection
  useMetaConnectionRefresh({ activeOrgId, selectedPlatform });

  // Live-fetch campaigns from DB; fall back to server-rendered initial list.
  // Pass dateRange so metrics in the table reflect the calendar selection.
  const { data: liveCampaigns } = useCampaignsList({ dateRange });
  const { updateStatus } = useCampaignMutations();
  const allCampaigns = liveCampaigns ?? campaigns;

  // Apply all GlobalContextBar filters to the campaign list
  const displayCampaigns = allCampaigns.filter((c) => {
    if (selectedPlatform && selectedPlatform !== "all" && c.platform && c.platform !== selectedPlatform) return false;
    if (selectedAccountId && c.ad_account_id && c.ad_account_id !== selectedAccountId) return false;
    if (selectedAccountId && !c.ad_account_id && c.status !== "draft") return false;
    if (!selectedCampaignIds.includes("all") && !selectedCampaignIds.includes(c.id)) return false;
    if (status !== "all" && c.status !== status) return false;
    return true;
  });


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

  if (!hasConnectedAccount) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[70vh] gap-5 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
          <MetaIcon className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground">
            No ad account connected
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Connect your Meta ad account to start tracking performance and
            launching campaigns.
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/business">Connect Meta Account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Global Filter Bar — AccountHealthDialog is now self-contained inside the bar */}
      <GlobalContextBar />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Performance Chart — owns its own metric-toggle state */}
          <PerformanceTrendsCard
            performance={dashboardData?.performance ?? []}
            summary={dashboardData?.summary}
            isLoading={isLoadingInsights && !liveData}
          />

          {/* Recent Campaigns */}
            <CampaignsView
              campaigns={displayCampaigns}
              pageSize={5}
              defaultSort="active-first"
              onRowClick={(id) => router.push(`/dashboard?campaign=${id}`)}
              onToggleStatus={(id, action) => updateStatus({ id, action })}
            />

          {/* Analytics: Revenue + Demographics */}
          {/* Mobile: Revenue stacks, Demographics carousels horizontally */}
          {/* md+: `md:contents` dissolves the scroll wrapper into a 3-col grid */}
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
            <RevenueChannelBreakdown
              whatsappRevenue={revenueBreakdown.whatsappRevenue}
              websiteRevenue={revenueBreakdown.websiteRevenue}
              whatsappSales={revenueBreakdown.whatsappSales}
              websiteSales={revenueBreakdown.websiteSales}
            />
            {/*
             * POST-MVP: Smart Widget Grid
             *
             * Replace the fixed demographics section below with a user-configurable
             * <WidgetGrid> that persists per org in a `dashboard_widgets` DB table.
             *
             * DB SCHEMA (migration: dashboard_widgets)
             * ─────────────────────────────────────────
             * dashboard_widgets (
             *   id          uuid primary key default gen_random_uuid(),
             *   org_id      uuid not null references organizations(id) on delete cascade,
             *   user_id     uuid references auth.users(id),   -- null = org-wide default
             *   widget_type text not null,                    -- see WIDGET_TYPES below
             *   config      jsonb not null default '{}',      -- chart type, metric, breakdown, palette
             *   position    integer not null default 0,       -- sort order in grid
             *   created_at  timestamptz default now()
             * )
             * Index: (org_id, position)
             *
             * WIDGET_TYPES enum
             * ─────────────────
             * 'spend_by_gender'    | 'spend_by_age'       | 'spend_by_region'
             * 'impressions_by_age' | 'reach_by_region'    | 'metric_timeseries'
             * 'metric_table'
             *
             * config JSONB shape (per widget instance):
             * {
             *   metric:      "spend" | "impressions" | "reach" | "clicks" | ... (see METRICS below),
             *   breakdown:   "age" | "gender" | "region" | null,
             *   chartType:   "bar" | "column" | "timeseries" | "area" | "line" | "donut" | "pie" | "table",
             *   colorPalette:"mint" | "ocean" | "sunset" | "violet" | "default",
             * }
             *
             * SUPPORTED META METRICS (map display name → Meta API field)
             * ─────────────────────────────────────────────────────────────
             * "Spend"                              → spend
             * "Impressions"                        → impressions
             * "Reach"                              → reach
             * "Clicks"                             → clicks
             * "Link Click"                         → inline_link_clicks
             * "Landing Page View"                  → landing_page_views
             * "3-Second Video View"                → video_30_sec_watched_actions (action_type: video_view)
             * "25% Video View"                     → video_p25_watched_actions
             * "50% Video View"                     → video_p50_watched_actions
             * "75% Video View"                     → video_p75_watched_actions
             * "95% Video View"                     → video_p95_watched_actions
             * "100% Video View"                    → video_p100_watched_actions
             * "30-Second Video View"               → video_30_sec_watched_actions
             * "Video View All"                     → video_avg_time_watched_actions
             * "Page Engagement"                    → page_engagement
             * "Post Engagement"                    → post_engagement
             * "Post Reaction"                      → post_reactions_by_type_total
             * "Post Interaction Gross"             → post_activity
             * "Post Interaction Net"               → post_activity_unique
             * "Onsite Conversion.Post Net Like"    → page_likes (post context)
             * "Cost per Reach"                     → derived: spend / reach
             * "Cost Per 3-Second Video View"       → derived: spend / video_view_3s
             * "Cost per 25% Video View"            → derived: spend / video_view_25pct
             * "Cost per 50% Video View"            → derived: spend / video_view_50pct
             * "Cost per 75% Video View"            → derived: spend / video_view_75pct
             * "Cost per 95% Video View"            → derived: spend / video_view_95pct
             * "Cost per 100% Video View"           → derived: spend / video_view_100pct
             * "Cost per 30-Second Video View"      → derived: spend / video_view_30s
             *
             * LAYOUT RULES
             * ─────────────
             * - Default widgets (performance trends, demographics) are hardcoded ABOVE this grid
             *   and are NEVER removed — they are always visible regardless of widget config.
             * - User-added widgets render below defaults in a responsive 1–3 col grid.
             * - An <AddWidgetButton> fixed at the end of the grid opens <AddWidgetDialog>.
             * - <AddWidgetDialog> lets users pick: chart type → X axis metric → Y axis breakdown → palette.
             *   On confirm, POST to /api/dashboard/widgets (org-scoped, see active-org pattern).
             * - Reordering: drag-and-drop via @dnd-kit, writes position back to DB on drop.
             *
             * IMPLEMENTATION STEPS
             * ─────────────────────
             * 1. Write + apply migration for `dashboard_widgets` table (Supabase MCP).
             * 2. Create `src/hooks/use-dashboard-widgets.ts` (CRUD hook, org-scoped via useActiveOrgContext).
             * 3. Build `src/components/dashboard/widget-grid.tsx` — maps saved widgets to chart components.
             * 4. Build `src/components/dashboard/add-widget-dialog.tsx` — picker UI (see Wask reference).
             * 5. Build widget registry: `src/lib/widget-registry.ts` maps widget_type → React component.
             * 6. Update `useInsights` hook to accept a dynamic `fields: string[]` param so new metric
             *    widgets can request the exact Meta fields they need.
             * 7. Replace the demographics div below with: <WidgetGrid /> + <AddWidgetButton />.
             * 8. Keep <DemographicsCharts> above the grid as a hardcoded default.
             */}

            {/* scroll container on mobile, transparent in grid on md+ */}
            <div className="-mx-4 flex flex-col lg:flex-row gap-3 overflow-x-auto px-4 pb-2 no-scrollbar md:mx-0 md:overflow-visible md:px-0 md:pb-0 md:contents">
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
