"use client";

import { useEffect, useState } from "react";
import { getCampaignPlacementInsights } from "@/actions/campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Instagram,
  Facebook,
  ViewGrid,
  Sparks,
  RefreshDouble,
} from "iconoir-react";

interface SubPlacementROICardProps {
  campaignId: string;
}

interface PlacementData {
  publisher_platform: string;
  platform_position: string;
  spend: string;
  clicks: string;
  cpc: string;
}

/**
 * Sub-Placement ROI Widget
 * Shows detailed breakdown of Spend and Clicks per platform position (e.g. Reels, Feed)
 */
export function SubPlacementROICard({ campaignId }: SubPlacementROICardProps) {
  const [data, setData] = useState<PlacementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      try {
        setIsLoading(true);
        const res = await getCampaignPlacementInsights(campaignId);
        console.log("placement insights res🔥", res);
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (error) {
        console.error("Failed to load placement insights:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadInsights();
  }, [campaignId]);

  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <ViewGrid className="h-4 w-4 text-primary" /> Placement Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex justify-center items-center h-[200px]">
          <RefreshDouble className="h-8 w-8 text-slate-300 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    // If no data is available yet, don't show the card
    return null;
  }

  // Format placement names dynamically
  const formatPlacementName = (platform: string, position: string) => {
    const raw = position.replace(/_/g, " ").replace(platform, "").trim();
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Feed";
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === "instagram")
      return <Instagram className="h-4 w-4 text-pink-600" />;
    if (platform === "facebook")
      return <Facebook className="h-4 w-4 text-blue-600" />;
    return <ViewGrid className="h-4 w-4 text-slate-500" />;
  };

  // Sort by spend descending
  const sortedData = [...data].sort(
    (a, b) => parseFloat(b.spend) - parseFloat(a.spend),
  );

  // Calculate highest clicks to badge it as "🔥 High Converting"
  let maxClicks = 0;
  let bestConvertingIndex = -1;
  sortedData.forEach((row, i) => {
    const clicks = parseInt(row.clicks || "0", 10);
    if (clicks > maxClicks && clicks > 5) {
      // Threshold for "high converting"
      maxClicks = clicks;
      bestConvertingIndex = i;
    }
  });

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white mt-4">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
          <ViewGrid className="h-4 w-4 text-primary" /> Revenue by Surface
        </CardTitle>
        <Badge
          variant="secondary"
          className="bg-primary/10 text-primary font-bold text-[10px] space-x-1"
        >
          <Sparks className="h-3 w-3" />
          <span>PRO INSIGHTS</span>
        </Badge>
      </CardHeader>
      <div className="divide-y divide-slate-100">
        {sortedData.map((row, idx) => {
          const platformName =
            row.publisher_platform.charAt(0).toUpperCase() +
            row.publisher_platform.slice(1);
          const positionName = formatPlacementName(
            row.publisher_platform,
            row.platform_position,
          );
          const spend = parseFloat(row.spend || "0");
          const clicks = parseInt(row.clicks || "0", 10);
          const isWinner = idx === bestConvertingIndex;

          return (
            <div
              key={idx}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
            >
              {/* Left: Placement Info */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center">
                  {getPlatformIcon(row.publisher_platform)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">
                      {platformName} {positionName}
                    </p>
                    {isWinner && (
                      <Badge
                        variant="secondary"
                        className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 text-[10px] px-1.5 py-0 items-center justify-center flex gap-1 animate-in fade-in zoom-in duration-300"
                      >
                        🔥 High Converting
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {`${clicks} Clicks Driven`}
                  </p>
                </div>
              </div>

              {/* Right: Metrics */}
              <div className="flex items-center gap-6 sm:justify-end">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Spend
                  </p>
                  <p className="font-mono font-medium text-slate-900 mt-0.5">
                    ₦{spend.toLocaleString()}
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="text-right w-20">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    CPC
                  </p>
                  <p
                    className={`font-mono font-bold mt-0.5 ${clicks > 0 ? "text-emerald-600" : "text-amber-600"}`}
                  >
                    {clicks > 0
                      ? `₦${Math.round(spend / clicks).toLocaleString()}`
                      : "₦∞"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
