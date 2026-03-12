"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Check } from "iconoir-react";
import { CampaignMetrics } from "@/lib/utils/campaign-metrics";

interface MetricCardProps {
  label: string;
  value: string;
  change: string | null;
  trend: "up" | "down" | "neutral";
  theme: "blue" | "green" | "purple" | "orange" | "indigo";
  isSelected: boolean;
  onToggle: () => void;
}

export function MetricCard({
  label,
  value,
  change,
  trend,
  theme = "blue",
  isSelected,
  onToggle,
}: MetricCardProps) {
  const themes = {
    blue: {
      activeBorder: "border-primary/30",
      activeBg: "bg-primary/5",
      checkbox: "bg-primary border-primary text-primary-foreground",
    },
    green: {
      activeBorder: "border-emerald-200",
      activeBg: "bg-emerald-50/50",
      checkbox: "bg-emerald-500 border-emerald-500 text-white",
    },
    purple: {
      activeBorder: "border-purple-200",
      activeBg: "bg-purple-50/50",
      checkbox: "bg-purple-500 border-purple-500 text-white",
    },
    orange: {
      activeBorder: "border-orange-200",
      activeBg: "bg-orange-50/50",
      checkbox: "bg-orange-500 border-orange-500 text-white",
    },
    indigo: {
      activeBorder: "border-indigo-200",
      activeBg: "bg-indigo-50/50",
      checkbox: "bg-indigo-500 border-indigo-500 text-white",
    },
  };

  const style = themes[theme] || themes.blue;

  return (
    <Card
      onClick={onToggle}
      className={cn(
        "relative overflow-hidden transition-all duration-200 cursor-pointer border p-0 shadow-none",
        "bg-card hover:shadow-soft",
        isSelected
          ? cn(style.activeBg, style.activeBorder, "shadow-sm")
          : "border-border",
      )}
    >
      <CardContent className="px-5 py-3 flex flex-col h-full justify-between">
        {/* Header: Label + Checkbox */}
        <div className="flex gap-2 items-center mb-3">
          <div
            className={cn(
              "h-5 w-5 rounded border flex items-center justify-center transition-colors",
              isSelected
                ? style.checkbox
                : "border-input bg-muted hover:border-ring",
            )}
          >
            {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </div>
          <p className="text-xs font-bold text-subtle-foreground uppercase tracking-wider">
            {label}
          </p>
        </div>

        {/* Value + Trend */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold font-heading text-foreground">
            {value}
          </h3>

          {change !== null && (
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
                trend === "up"
                  ? "text-emerald-700 bg-emerald-50"
                  : trend === "down"
                    ? "text-destructive bg-destructive/10"
                    : "text-muted-foreground bg-muted",
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
      </CardContent>
    </Card>
  );
}

/** Compute % change between two numeric values. Returns null if prev is 0. */
function pctChange(
  current: number,
  prev: number,
): { text: string; trend: "up" | "down" | "neutral" } | null {
  if (prev === 0) return null;
  const diff = ((current - prev) / prev) * 100;
  const abs = Math.abs(diff);
  return {
    text: `${abs.toFixed(1)}%`,
    trend: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
  };
}

interface MetricCardsProps {
  summary: {
    spend?: string | number;
    impressions?: string | number;
    clicks?: string | number;
    cpc?: string | number;
    ctr?: string | number;
    reach?: string | number;
    revenue?: string | number;
    sales?: string | number;
    // Optional prior-period fields for real % change
    prev_spend?: string | number;
    prev_impressions?: string | number;
    prev_clicks?: string | number;
    prev_cpc?: string | number;
    prev_ctr?: string | number;
    prev_revenue?: string | number;
    prev_sales?: string | number;
  };
  /** Controlled: which metric labels are currently selected */
  selectedMetrics: string[];
  /** Controlled: toggle callback */
  onToggle: (label: string) => void;
}

export function MetricCards({
  summary,
  selectedMetrics,
  onToggle,
}: MetricCardsProps) {
  // Format helpers
  const toNum = (val: string | number | undefined) =>
    parseFloat(String(val || "0"));
  const formatMoney = (val: string | number | undefined) =>
    `₦${toNum(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatInt = (val: string | number | undefined) =>
    Math.round(toNum(val)).toLocaleString();

  const spend = toNum(summary?.spend);
  const revenue = toNum(summary?.revenue);
  const sales = toNum(summary?.sales);
  const impressions = toNum(summary?.impressions);
  const clicks = toNum(summary?.clicks);
  const cpc = toNum(summary?.cpc);
  const ctr = toNum(summary?.ctr);

  const prevSpend = toNum(summary?.prev_spend);
  const prevRevenue = toNum(summary?.prev_revenue);
  const prevSales = toNum(summary?.prev_sales);
  const prevImpressions = toNum(summary?.prev_impressions);
  const prevClicks = toNum(summary?.prev_clicks);
  const prevCpc = toNum(summary?.prev_cpc);
  const prevCtr = toNum(summary?.prev_ctr);

  const roas = CampaignMetrics.calculateROAS(revenue, spend);
  const prevRoas = CampaignMetrics.calculateROAS(prevRevenue, prevSpend);

  const profit = CampaignMetrics.calculateProfit(revenue, spend);
  const prevProfit = CampaignMetrics.calculateProfit(prevRevenue, prevSpend);

  const spendChange = pctChange(spend, prevSpend);
  const revenueChange = pctChange(revenue, prevRevenue);
  const salesChange = pctChange(sales, prevSales);
  const roasChange = pctChange(roas, prevRoas);
  const profitChange = pctChange(profit, prevProfit);

  // ROAS Color Logic
  const roasStatus = CampaignMetrics.getROASStatus(roas);
  const roasTheme =
    roasStatus === "profit"
      ? "green"
      : roasStatus === "break-even"
        ? "orange"
        : "red";

  const metrics = [
    {
      label: "Total Revenue",
      value: formatMoney(revenue),
      change: revenueChange?.text ?? null,
      trend: (revenueChange?.trend ?? "neutral") as "up" | "down" | "neutral",
      theme: "green" as const,
    },
    {
      label: "ROAS",
      value: `${roas.toFixed(2)}x`,
      change: roasChange?.text ?? null,
      trend: (roasChange?.trend ?? "neutral") as "up" | "down" | "neutral",
      theme: roasTheme as any,
    },
    {
      label: "Total Sales",
      value: formatInt(sales),
      change: salesChange?.text ?? null,
      trend: (salesChange?.trend ?? "neutral") as "up" | "down" | "neutral",
      theme: "indigo" as const,
    },
    {
      label: "Total Spend",
      value: formatMoney(spend),
      change: spendChange?.text ?? null,
      trend: (spendChange?.trend ?? "neutral") as "up" | "down" | "neutral",
      theme: "blue" as const,
    },
    {
      label: "Profit / Loss",
      value: formatMoney(profit),
      change: profitChange?.text ?? null,
      trend: (profitChange?.trend ?? "neutral") as "up" | "down" | "neutral",
      theme: profit >= 0 ? "green" : "red",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {metrics.map((m) => (
        <MetricCard
          key={m.label}
          {...m}
          isSelected={selectedMetrics.includes(m.label)}
          onToggle={() => onToggle(m.label)}
        />
      ))}
    </div>
  );
}
