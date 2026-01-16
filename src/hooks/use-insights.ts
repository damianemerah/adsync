"use client";

import { useQuery } from "@tanstack/react-query";

export interface InsightsData {
  spend: string; // Meta returns money as string
  impressions: string;
  clicks: string;
  cpc: string;
  ctr: string;
  reach: string;
}

export function useInsights() {
  return useQuery({
    queryKey: ["insights", "meta"], // Cache key
    queryFn: async () => {
      const res = await fetch("/api/insights");
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json() as Promise<InsightsData>;
    },
    // Refresh every 5 minutes so user doesn't spam refresh
    staleTime: 5 * 60 * 1000,
  });
}
