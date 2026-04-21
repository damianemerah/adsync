"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "iconoir-react";

export type MetricTone =
  | "blue"
  | "pink"
  | "purple"
  | "teal"
  | "orange"
  | "navy"
  | "primary"
  | "neutral";

type TrendDirection = "up" | "down" | "neutral";

const toneClasses: Record<MetricTone, { bg: string; icon: string }> = {
  blue: { bg: "bg-chart-1-soft", icon: "text-chart-1" },
  pink: { bg: "bg-chart-2-soft", icon: "text-chart-2" },
  purple: { bg: "bg-chart-3-soft", icon: "text-chart-3" },
  teal: { bg: "bg-chart-4-soft", icon: "text-chart-4" },
  orange: { bg: "bg-chart-5-soft", icon: "text-chart-5" },
  navy: { bg: "bg-chart-6-soft", icon: "text-chart-6" },
  primary: { bg: "bg-accent", icon: "text-primary" },
  neutral: { bg: "bg-muted", icon: "text-subtle-foreground" },
};

export interface MetricChipProps {
  label: string;
  value: React.ReactNode;
  tone?: MetricTone;
  icon?: React.ReactNode;
  change?: string | null;
  trend?: TrendDirection;
  className?: string;
}

export function MetricChip({
  label,
  value,
  tone = "neutral",
  icon,
  change,
  trend = "neutral",
  className,
}: MetricChipProps) {
  const t = toneClasses[tone];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              t.bg,
              t.icon,
            )}
          >
            {icon}
          </span>
        )}
        <p className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
          {label}
        </p>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="font-heading text-xl font-bold text-foreground">
          {value}
        </span>

        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              trend === "up" &&
                "bg-status-success-soft text-status-success",
              trend === "down" && "bg-status-danger-soft text-status-danger",
              trend === "neutral" && "bg-muted text-subtle-foreground",
            )}
          >
            {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
            {trend === "down" && (
              <ArrowUpRight className="h-3 w-3 rotate-90" />
            )}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
