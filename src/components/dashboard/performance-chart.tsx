"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Dollar, Eye, CursorPointer, Magnet, GraphUp } from "iconoir-react";
import { EmptyState } from "@/components/ui/empty-state";

// Using CSS variables would be ideal, but Recharts often needs explicit colors.
// We can use the HSL values from globals.css or these semantic approximations.
// Primary: #12e193 (approx)
// Foreground: #020617
// Muted: #64748b

export const METRIC_CONFIG = {
  spend: {
    label: "Spend",
    color: "hsl(var(--primary))",
    icon: Dollar,
    theme: "blue",
  },
  impressions: {
    label: "People Reached",
    color: "hsl(var(--ai))", // Use AI purple from design system
    icon: Eye,
    theme: "purple",
  },
  clicks: {
    label: "Clicks",
    color: "#2563EB", // Blue
    icon: CursorPointer,
    theme: "green",
  },
  ctr: { label: "CTR", color: "#EA580C", icon: Magnet, theme: "orange" },
  revenue: {
    label: "Revenue",
    color: "#10b981", // Emerald
    icon: Dollar,
    theme: "green",
  },
  sales: {
    label: "Sales",
    color: "#6366f1", // Indigo
    icon: GraphUp,
    theme: "indigo",
  },
} as const;

export type MetricKey = keyof typeof METRIC_CONFIG;

interface PerformanceChartProps {
  data: any[];
  activeMetrics: MetricKey[];
}

export function PerformanceChart({
  data,
  activeMetrics,
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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--subtle-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dy={10}
          tickFormatter={(value) => value}
        />
        <YAxis
          stroke="hsl(var(--subtle-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dx={-10}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm border border-border)",
            color: "hsl(var(--popover-foreground))",
          }}
          labelStyle={{ color: "hsl(var(--subtle-foreground))" }}
        />
        <Legend />
        {activeMetrics.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={METRIC_CONFIG[key].label}
            stroke={METRIC_CONFIG[key].color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
            animationDuration={1000}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
