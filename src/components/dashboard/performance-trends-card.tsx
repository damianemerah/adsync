"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoCircle } from "iconoir-react";
import {
  PerformanceChart,
  MetricKey,
  METRIC_CONFIG,
} from "@/components/dashboard/performance-chart";
import { useDashboardStore } from "@/store/dashboard-store";
import {
  bucketPerformance,
  fillBucketRange,
  pickGranularity,
} from "@/lib/utils/date-bucketing";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SummaryData {
  spend?: string | number;
  impressions?: string | number;
  clicks?: string | number;
  ctr?: string | number;
  cpc?: string | number;
  reach?: string | number;
}

interface PerformanceTrendsCardProps {
  /** Daily performance rows from the dashboard data */
  performance: { date: string; [key: string]: unknown }[];
  /** Aggregated summary from the filtered insights (GlobalContextBar state) */
  summary?: SummaryData;
  isLoading: boolean;
}

const CHARTABLE_METRICS: MetricKey[] = ["spend", "impressions", "clicks", "ctr", "revenue", "cpc"];

/**
 * Self-contained card that renders the Performance Trends chart with its own
 * metric-toggle state. Decoupled so toggling a metric only re-renders this
 * card and not the entire dashboard grid.
 */
// Metric summary chip colors (matching METRIC_CONFIG colors closely)
const SUMMARY_CHIP_COLORS: Record<string, string> = {
  spend: "#4F6EF7",      // Blue
  impressions: "#E2445C", // Red/Pink
  ctr: "#784BD1",         // Purple
  clicks: "#00C875",      // Green
  cpc: "#FDAB3D",         // Orange
  cpm: "#0F9B8E",         // Teal
};

const SUMMARY_METRIC_LABELS: Record<string, string> = {
  spend: "Spend",
  impressions: "Impr.",
  ctr: "CTR",
  clicks: "Clicks",
  cpc: "CPC",
  cpm: "CPM",
};

const SUMMARY_METRIC_TOOLTIPS: Record<string, string> = {
  spend: "Total amount spent in the selected period",
  impressions: "Total number of times your ads were seen",
  ctr: "Click-through rate — clicks ÷ impressions",
  clicks: "Total link clicks from your ads",
  cpc: "Average cost per click",
  cpm: "Cost per 1,000 impressions",
};

export function PerformanceTrendsCard({
  performance,
  summary,
  isLoading,
}: PerformanceTrendsCardProps) {
  const [activeMetrics, setActiveMetrics] =
    useState<MetricKey[]>(CHARTABLE_METRICS);
  const { dateRange } = useDashboardStore();

  const granularity = useMemo(
    () => pickGranularity(dateRange?.from, dateRange?.to),
    [dateRange?.from, dateRange?.to],
  );

  const bucketed = useMemo(() => {
    const withCpc = performance.map((d) => ({
      ...d,
      cpc:
        d.clicks && Number(d.clicks) > 0
          ? Number(d.spend) / Number(d.clicks)
          : 0,
    }));
    const grouped = bucketPerformance(withCpc, granularity);
    return fillBucketRange(
      grouped,
      dateRange?.from,
      dateRange?.to,
      granularity,
    );
  }, [performance, granularity, dateRange?.from, dateRange?.to]);

  // Derive CPM from summary
  const summaryValues = useMemo(() => {
    const toNum = (v: string | number | undefined) => parseFloat(String(v || "0"));
    const spend = toNum(summary?.spend);
    const impressions = toNum(summary?.impressions);
    const clicks = toNum(summary?.clicks);
    const ctr = toNum(summary?.ctr);
    const cpc = toNum(summary?.cpc);
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

    const fmtMoney = (v: number) =>
      `₦${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtInt = (v: number) => Math.round(v).toLocaleString();
    const fmtPct = (v: number) => `${v.toFixed(2)}%`;

    return {
      spend: fmtMoney(spend),
      impressions: fmtInt(impressions),
      clicks: fmtInt(clicks),
      ctr: fmtPct(ctr),
      cpc: fmtMoney(cpc),
      cpm: fmtMoney(cpm),
    };
  }, [summary]);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const SUMMARY_METRICS = ["spend", "impressions", "ctr", "clicks", "cpc", "cpm"] as const;

  // Map summary metric key → chart metric key (for toggling)
  const summaryToChartKey: Partial<Record<string, MetricKey>> = {
    spend: "spend",
    impressions: "impressions",
    ctr: "ctr",
    clicks: "clicks",
    cpc: "cpc",
  };

  return (
    <Card className="border border-border overflow-hidden">
      <CardHeader className="flex flex-col gap-3 pb-3">
        {/* <CardTitle>Performance Trends</CardTitle> */}

        {/*
         * POST-MVP: Expand metric set from 6 to ~28 Meta fields
         *
         * Currently SUMMARY_METRICS is hardcoded to 6 keys: spend, impressions, ctr, clicks, cpc, cpm.
         * Widget instances should drive which metrics appear here via their `config.metric[]` array.
         *
         * STEP 1 — extend SUMMARY_METRICS to the full supported set:
         *
         *   Display Name                        | Internal key          | Meta API field / derivation
         *   ─────────────────────────────────────┼───────────────────────┼────────────────────────────────────────────────
         *   Spend                               | spend                 | spend
         *   Impressions                         | impressions           | impressions
         *   Reach                               | reach                 | reach
         *   Clicks                              | clicks                | clicks
         *   CTR                                 | ctr                   | ctr (derived: clicks / impressions)
         *   CPC                                 | cpc                   | cpc (derived: spend / clicks)
         *   CPM                                 | cpm                   | cpm (derived: spend / impressions * 1000)
         *   Link Click                          | link_click            | inline_link_clicks
         *   Landing Page View                   | landing_page_view     | landing_page_views
         *   3-Second Video View                 | video_view_3s         | video_30_sec_watched_actions[action_type=video_view]
         *   25% Video View                      | video_view_25pct      | video_p25_watched_actions
         *   50% Video View                      | video_view_50pct      | video_p50_watched_actions
         *   75% Video View                      | video_view_75pct      | video_p75_watched_actions
         *   95% Video View                      | video_view_95pct      | video_p95_watched_actions
         *   100% Video View                     | video_view_100pct     | video_p100_watched_actions
         *   30-Second Video View                | video_view_30s        | video_30_sec_watched_actions
         *   Video View All                      | video_view_all        | video_avg_time_watched_actions
         *   Page Engagement                     | page_engagement       | page_engagement
         *   Post Engagement                     | post_engagement       | post_engagement
         *   Post Reaction                       | post_reaction         | post_reactions_by_type_total
         *   Post Interaction Gross              | post_interaction_gross| post_activity
         *   Post Interaction Net                | post_interaction_net  | post_activity_unique
         *   Onsite Conversion.Post Net Like     | post_net_like         | page_likes (post context)
         *   Cost per Reach                      | cost_per_reach        | derived: spend / reach
         *   Cost Per 3-Second Video View        | cost_per_3s_view      | derived: spend / video_view_3s
         *   Cost per 25% Video View             | cost_per_25pct_view   | derived: spend / video_view_25pct
         *   Cost per 50% Video View             | cost_per_50pct_view   | derived: spend / video_view_50pct
         *   Cost per 75% Video View             | cost_per_75pct_view   | derived: spend / video_view_75pct
         *   Cost per 95% Video View             | cost_per_95pct_view   | derived: spend / video_view_95pct
         *   Cost per 100% Video View            | cost_per_100pct_view  | derived: spend / video_view_100pct
         *   Cost per 30-Second Video View       | cost_per_30s_view     | derived: spend / video_view_30s
         *
         * STEP 2 — make `useInsights` accept `fields: string[]` so it requests only what's needed.
         *   Each metric key above maps to one or more Meta Insights `fields` params.
         *   Video metrics use action_type filtering on the returned `actions[]` array.
         *
         * STEP 3 — widget instance config stores `activeMetrics: MetricKey[]`.
         *   The summary bar renders only the metrics in config.activeMetrics (max ~6 for readability).
         *   The <AddWidgetDialog> lets users pick which metrics to show per widget.
         *
         * STEP 4 — add formatters for new metric types (video views → integer, cost metrics → currency).
         *   Extend SUMMARY_METRIC_LABELS, SUMMARY_CHIP_COLORS, and the tooltip formatter in
         *   performance-chart.tsx accordingly.
         */}
        {/* ── Aggregated Metric Summary Bar ── */}
        <div className="w-full -mx-1 flex gap-0 overflow-x-auto no-scrollbar rounded-lg overflow-hidden border border-border">
          {isLoading
            ? SUMMARY_METRICS.map((k) => (
                <div
                  key={k}
                  className="flex-1 min-w-[100px] h-[58px] bg-muted/40 animate-pulse"
                />
              ))
            : SUMMARY_METRICS.map((key, idx) => {
                const color = SUMMARY_CHIP_COLORS[key];
                const label = SUMMARY_METRIC_LABELS[key];
                const value = summaryValues[key as keyof typeof summaryValues];
                const chartKey = summaryToChartKey[key];
                const isChartActive = chartKey ? activeMetrics.includes(chartKey) : true;

                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (chartKey) toggleMetric(chartKey);
                        }}
                        className={[
                          "group flex-1 min-w-[90px] sm:min-w-0 flex flex-col items-start gap-0.5 px-3 py-2.5 transition-all",
                          idx > 0 ? "border-l border-white/10" : "",
                          !isChartActive ? "opacity-60" : "",
                        ].join(" ")}
                        style={{ backgroundColor: color }}
                      >
                        {/* Label row */}
                        <div className="flex items-center gap-1.5 w-full">
                          {/* Checkbox indicator */}
                          <span
                            className={[
                              "h-3 w-3 shrink-0 rounded-sm border flex items-center justify-center transition-all",
                              isChartActive
                                ? "bg-white/30 border-white/50"
                                : "bg-transparent border-white/30",
                            ].join(" ")}
                          >
                            {isChartActive && (
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
                        {/* Value */}
                        <span className="text-sm font-bold text-white tabular-nums truncate w-full text-left pl-[18px]">
                          {value}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {SUMMARY_METRIC_TOOLTIPS[key]}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="w-full h-[280px] sm:aspect-video lg:h-[400px] lg:aspect-auto rounded-md" />
        ) : (
          <div className="w-full h-[280px] sm:aspect-video lg:h-[400px] lg:aspect-auto">
            <PerformanceChart
              data={bucketed}
              activeMetrics={activeMetrics.length > 0 ? activeMetrics : CHARTABLE_METRICS}
              granularity={granularity}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
