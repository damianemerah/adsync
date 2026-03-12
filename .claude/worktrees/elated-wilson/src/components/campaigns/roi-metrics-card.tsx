"use client";

import { useCampaignROI } from "@/hooks/use-campaign-roi";
import {
  HandCash,
  GraphUp,
  ChatBubble,
  Globe,
  StatsReport,
} from "iconoir-react";

interface ROIMetricsCardProps {
  campaignId: string;
}

/**
 * ROI Metrics Card — shows Sellam attribution metrics in the campaign detail view.
 * Displays total clicks (split by WhatsApp/website), cost per click, sales count,
 * revenue, and ROI percentage. All monetary values in ₦ (Naira).
 */
export function ROIMetricsCard({ campaignId }: ROIMetricsCardProps) {
  const { data: roi, isLoading } = useCampaignROI(campaignId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse"
          >
            <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
            <div className="h-6 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!roi) return null;

  const metrics = [
    {
      label: "Total Clicks",
      value: roi.totalClicks.toLocaleString(),
      detail:
        roi.whatsappClicks > 0 || roi.websiteClicks > 0
          ? `${roi.whatsappClicks} WhatsApp · ${roi.websiteClicks} website`
          : undefined,
      icon: StatsReport,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Cost per Click",
      value:
        roi.costPerClickNgn > 0
          ? `₦${roi.costPerClickNgn.toLocaleString()}`
          : "—",
      detail:
        roi.spendNgn > 0
          ? `₦${Math.round(roi.spendNgn).toLocaleString()} total spend`
          : undefined,
      icon: HandCash,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Sales",
      value: roi.salesCount > 0 ? roi.salesCount.toLocaleString() : "—",
      detail:
        roi.revenueNgn > 0
          ? `₦${roi.revenueNgn.toLocaleString()} revenue`
          : "No sales recorded yet",
      icon: ChatBubble,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "ROI",
      value:
        roi.roiPercent !== 0
          ? `${roi.roiPercent > 0 ? "+" : ""}${roi.roiPercent}%`
          : "—",
      detail:
        roi.salesCount > 0
          ? `₦${roi.costPerSaleNgn.toLocaleString()} per sale`
          : "Record sales to see ROI",
      icon: GraphUp,
      color:
        roi.roiPercent > 0
          ? "text-emerald-600 bg-emerald-50"
          : roi.roiPercent < 0
            ? "text-red-600 bg-red-50"
            : "text-slate-600 bg-slate-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.label}
            className="bg-white border border-slate-200 rounded-xl p-4 space-y-1"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${m.color}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {m.label}
              </span>
            </div>
            <p className="text-xl font-bold text-slate-900">{m.value}</p>
            {m.detail && (
              <p className="text-xs text-slate-500 truncate">{m.detail}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
