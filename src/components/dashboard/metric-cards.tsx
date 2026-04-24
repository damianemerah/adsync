"use client";

import { motion } from "motion/react";
import { MetricChip, type MetricTone } from "@/components/ui/metric-chip";
import {
  ChatBubble,
  Coins,
  StatUp,
  Shop,
  Wallet,
  Percentage,
} from "iconoir-react";
import { CampaignMetrics } from "@/lib/utils/campaign-metrics";

interface MetricCardProps {
  label: string;
  value: string;
  change: string | null;
  trend: "up" | "down" | "neutral";
  tone?: MetricTone;
  icon?: React.ReactNode;
}

export function MetricCard({
  label,
  value,
  change,
  trend,
  tone,
  icon,
}: MetricCardProps) {
  return (
    <MetricChip
      label={label}
      value={value}
      tone={tone}
      icon={icon}
      change={change}
      trend={trend}
    />
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
    whatsapp_clicks?: string | number;
    // Optional prior-period fields for real % change
    prev_spend?: string | number;
    prev_impressions?: string | number;
    prev_clicks?: string | number;
    prev_cpc?: string | number;
    prev_ctr?: string | number;
    prev_revenue?: string | number;
    prev_sales?: string | number;
    prev_whatsapp_clicks?: string | number;
  };
}

export function MetricCards({ summary }: MetricCardsProps) {
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
  const whatsappClicks = toNum(summary?.whatsapp_clicks);

  const prevSpend = toNum(summary?.prev_spend);
  const prevRevenue = toNum(summary?.prev_revenue);
  const prevSales = toNum(summary?.prev_sales);
  const prevImpressions = toNum(summary?.prev_impressions);
  const prevClicks = toNum(summary?.prev_clicks);
  const prevCpc = toNum(summary?.prev_cpc);
  const prevCtr = toNum(summary?.prev_ctr);
  const prevWhatsappClicks = toNum(summary?.prev_whatsapp_clicks);

  const roas = CampaignMetrics.calculateROAS(revenue, spend);
  const prevRoas = CampaignMetrics.calculateROAS(prevRevenue, prevSpend);

  const profit = CampaignMetrics.calculateProfit(revenue, spend);
  const prevProfit = CampaignMetrics.calculateProfit(prevRevenue, prevSpend);

  const spendChange = pctChange(spend, prevSpend);
  const revenueChange = pctChange(revenue, prevRevenue);
  const salesChange = pctChange(sales, prevSales);
  const roasChange = pctChange(roas, prevRoas);
  const profitChange = pctChange(profit, prevProfit);
  const whatsappChange = pctChange(whatsappClicks, prevWhatsappClicks);

  // ROAS tone — map status to a muted categorical tint
  const roasStatus = CampaignMetrics.getROASStatus(roas);
  const roasTone: MetricTone =
    roasStatus === "profit"
      ? "teal"
      : roasStatus === "break-even"
        ? "orange"
        : "pink";

  const heroMetrics: MetricCardProps[] = [
    {
      label: "Profit / Loss",
      value: formatMoney(profit),
      change: profitChange?.text ?? null,
      trend: profitChange?.trend ?? "neutral",
      tone: profit >= 0 ? "teal" : "pink",
      icon: <Percentage className="h-4 w-4" />,
    },
    {
      label: "Total Spend",
      value: formatMoney(spend),
      change: spendChange?.text ?? null,
      trend: spendChange?.trend ?? "neutral",
      tone: "blue",
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      label: "People Messaged",
      value: formatInt(whatsappClicks),
      change: whatsappChange?.text ?? null,
      trend: whatsappChange?.trend ?? "neutral",
      tone: "primary",
      icon: <ChatBubble className="h-4 w-4" />,
    },
  ];

  const secondaryMetrics: MetricCardProps[] = [
    {
      label: "Total Revenue",
      value: formatMoney(revenue),
      change: revenueChange?.text ?? null,
      trend: revenueChange?.trend ?? "neutral",
      tone: "teal",
      icon: <Coins className="h-4 w-4" />,
    },
    {
      label: "Total Sales",
      value: formatInt(sales),
      change: salesChange?.text ?? null,
      trend: salesChange?.trend ?? "neutral",
      tone: "purple",
      icon: <Shop className="h-4 w-4" />,
    },
    {
      label: "Return on Spend",
      value: `${roas.toFixed(2)}x`,
      change: roasChange?.text ?? null,
      trend: roasChange?.trend ?? "neutral",
      tone: roasTone,
      icon: <StatUp className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Hero Metrics */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04 } },
        }}
        className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3"
      >
        {heroMetrics.map((m) => (
          <motion.div
            key={m.label}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
            }}
          >
            <MetricChip
              label={m.label}
              value={m.value}
              tone={m.tone}
              icon={m.icon}
              change={m.change}
              trend={m.trend}
              className="h-full border-border"
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Secondary Metrics */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
        }}
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0"
      >
        {secondaryMetrics.map((m) => (
          <motion.div
            key={m.label}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
            }}
            className="min-w-40 shrink-0 sm:min-w-0"
          >
            <MetricChip
              label={m.label}
              value={m.value}
              tone={m.tone}
              icon={m.icon}
              change={m.change}
              trend={m.trend}
              className="h-full bg-muted/30 border-transparent sm:bg-card sm:border-border"
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
