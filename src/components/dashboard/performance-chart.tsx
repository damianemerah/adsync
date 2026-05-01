"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Dollar, Eye, CursorPointer, Magnet, GraphUp } from "iconoir-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatBucketTick,
  formatTooltipHeader,
  type BucketGranularity,
} from "@/lib/utils/date-bucketing";

// Using CSS variables would be ideal, but Recharts often needs explicit colors.
// We can use the HSL values from globals.css or these semantic approximations.
// Primary: #12e193 (approx)
// Foreground: #020617
// Muted: #64748b

export const METRIC_CONFIG = {
  spend: {
    label: "Spend",
    color: "var(--primary)",
    icon: Dollar,
    theme: "blue",
  },
  impressions: {
    label: "People Reached",
    color: "var(--ai)", // Use AI purple from design system
    icon: Eye,
    theme: "purple",
  },
  clicks: {
    label: "Link Clicks",
    color: "#2563EB", // Blue
    icon: CursorPointer,
    theme: "green",
  },
  ctr: { label: "Click Rate", color: "#EA580C", icon: Magnet, theme: "orange" },
  revenue: {
    label: "Revenue",
    color: "#10b981", // Emerald
    icon: Dollar,
    theme: "green",
  },
  cpc: {
    label: "Cost / Click",
    color: "#6366f1", // Indigo
    icon: Dollar,
    theme: "indigo",
  },
} as const;

export type MetricKey = keyof typeof METRIC_CONFIG;

interface PerformanceChartProps {
  data: any[];
  activeMetrics: MetricKey[];
  granularity?: BucketGranularity;
}

export function PerformanceChart({
  data,
  activeMetrics,
  granularity = "day",
}: PerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<GraphUp className="h-6 w-6" />}
        title="No data yet"
        description="Performance data will appear here once your campaign starts running."
        className="h-full border-none shadow-none"
      />
    );
  }

  // Target ~6 X-axis ticks regardless of granularity so a 28-day daily
  // window or a 17-week range both show a comparable number of date labels.
  const targetTicks = 6;
  const xAxisInterval =
    data.length <= targetTicks
      ? 0
      : Math.max(0, Math.floor(data.length / targetTicks) - 1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="hsl(var(--muted-foreground) / 0.25)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--subtle-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          dy={8}
          tick={{ fontSize: 11, fill: "hsl(var(--subtle-foreground))" }}
          interval={xAxisInterval}
          tickFormatter={(value: string) => formatBucketTick(value, granularity)}
        />
        <YAxis hide />
        <Tooltip
          cursor={{
            stroke: "hsl(var(--muted-foreground) / 0.4)",
            strokeDasharray: "3 3",
          }}
          content={<TrendsTooltip granularity={granularity} />}
        />
        {activeMetrics.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={METRIC_CONFIG[key].label}
            stroke={METRIC_CONFIG[key].color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
            animationDuration={800}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatTooltipValue(key: string, value: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  switch (key as MetricKey) {
    case "spend":
    case "revenue":
    case "cpc":
      return `₦${decimalFormatter.format(value)}`;
    case "ctr":
      return `${decimalFormatter.format(value)}%`;
    case "impressions":
    case "clicks":
      return integerFormatter.format(value);
    default:
      return integerFormatter.format(value);
  }
}

interface TrendsTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
  granularity: BucketGranularity;
}

function TrendsTooltip({
  active,
  payload,
  label,
  granularity,
}: TrendsTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md min-w-[180px]">
      <div className="text-xs text-subtle-foreground mb-1.5">
        {formatTooltipHeader(label, granularity)}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((p) => (
          <div
            key={p.dataKey}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-foreground">{p.name}</span>
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {formatTooltipValue(p.dataKey, p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
