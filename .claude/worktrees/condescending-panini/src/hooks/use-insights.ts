"use client";

import { useQuery } from "@tanstack/react-query";

export interface DashboardInsightsData {
  summary: {
    spend: string;
    impressions: string;
    clicks: string;
    cpc: string;
    ctr: string;
    reach: string;
  };
  performance: Array<{
    date: string;
    spend: number;
    clicks: number;
    impressions: number;
  }>;
  demographics: {
    age: any[];
    gender: any[];
    region: any[];
  };
}

export interface InsightsFilter {
  accountId?: string;
  campaignIds?: string[]; // ["all"] means no filter
  platform?: string;
}

export function useInsights(filter?: InsightsFilter) {
  const accountId = filter?.accountId || "";
  const campaignIds = filter?.campaignIds || ["all"];
  const platform = filter?.platform || "meta";

  return useQuery({
    queryKey: ["insights", platform, accountId, campaignIds.join(",")],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (accountId) params.set("accountId", accountId);
      params.set("campaignIds", campaignIds.join(","));
      if (platform) params.set("platform", platform);

      const res = await fetch(`/api/insights?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json() as Promise<DashboardInsightsData>;
    },
    // Refresh every 5 minutes to avoid spamming Meta API
    staleTime: 5 * 60 * 1000,
    // Keep previous data while fetching new filtered data (no flicker)
    placeholderData: (prev) => prev,
  });
}
