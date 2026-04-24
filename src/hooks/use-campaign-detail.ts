"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchCampaignById,
  syncCampaignInsights,
  syncCampaignAds,
} from "@/actions/campaigns";
import type { Campaign } from "@/lib/api/campaigns";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

interface UseCampaignDetailOptions {
  initialData?: Campaign;
}

/**
 * Custom hook for managing campaign detail data with TanStack Query.
 * Replaces manual useEffect syncing with declarative data fetching.
 *
 * Features:
 * - Automatic 5-minute cache (aligns with getCampaignById cache)
 * - Refetch on window focus
 * - Manual refresh mutation
 * - Loading/error states
 * - Optimistic updates
 */
export function useCampaignDetail(
  campaignId: string | null,
  options: UseCampaignDetailOptions = {},
) {
  const queryClient = useQueryClient();
  const { activeOrgId } = useActiveOrgContext();

  // Main query for campaign data
  const query = useQuery({
    queryKey: ["campaign", campaignId, activeOrgId],
    queryFn: async () => {
      if (!campaignId) throw new Error("Campaign ID is required");
      const data = await fetchCampaignById(campaignId);
      if (!data) throw new Error("Campaign not found");
      return data;
    },
    enabled: !!campaignId && !!activeOrgId,
    initialData: options.initialData,
    staleTime: 5 * 60 * 1000, // aligns with getCampaignById server-side cache
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (q) =>
      q.state.data?.status === "active" ? 60_000 : false,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  // Mutation for syncing insights from Meta API
  const syncInsightsMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error("Campaign ID is required");
      const result = await syncCampaignInsights(campaignId);
      if (!result.success) {
        throw new Error(result.error || "Failed to sync insights");
      }
      return result;
    },
    onMutate: () => {
      toast.loading("Syncing campaign insights...", { id: "sync-insights" });
    },
    onSuccess: (data) => {
      // Invalidate campaign query to refetch with fresh data
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, activeOrgId],
      });
      // Also invalidate campaigns list
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      toast.success(`Synced ${data.count} days of insights`, {
        id: "sync-insights",
      });
    },
    onError: (error: Error) => {
      toast.error("Failed to sync insights", {
        id: "sync-insights",
        description: error.message,
      });
    },
  });

  // Mutation for syncing ads from Meta API
  const syncAdsMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error("Campaign ID is required");
      const result = await syncCampaignAds(campaignId);
      if (!result.success) {
        throw new Error(result.error || "Failed to sync ads");
      }
      return result;
    },
    onMutate: () => {
      toast.loading("Syncing campaign ads...", { id: "sync-ads" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, activeOrgId],
      });
      toast.success(`Synced ${data.count} ads`, { id: "sync-ads" });
    },
    onError: (error: Error) => {
      toast.error("Failed to sync ads", {
        id: "sync-ads",
        description: error.message,
      });
    },
  });

  // Combined sync mutation (insights + ads)
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error("Campaign ID is required");
      const [insights, ads] = await Promise.all([
        syncCampaignInsights(campaignId),
        syncCampaignAds(campaignId),
      ]);
      return { insights, ads };
    },
    onMutate: () => {
      toast.loading("Syncing campaign data...", { id: "sync-all" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["campaign", campaignId, activeOrgId],
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      toast.success(
        `Synced ${data.insights.count || 0} days of insights and ${data.ads.count || 0} ads`,
        { id: "sync-all" },
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to sync campaign", {
        id: "sync-all",
        description: error.message,
      });
    },
  });

  return {
    // Query data
    campaign: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,

    // Sync mutations
    syncInsights: syncInsightsMutation.mutate,
    isSyncingInsights: syncInsightsMutation.isPending,

    syncAds: syncAdsMutation.mutate,
    isSyncingAds: syncAdsMutation.isPending,

    syncAll: syncAllMutation.mutate,
    isSyncingAll: syncAllMutation.isPending,

    // Utility
    refetch: query.refetch,
    // syncInsights / syncAds / syncAll still exist on useCampaignDetail in case a future admin/diagnostic
    // surface needs them, but nothing in the main UI depends on them now. 
    
    // Users just open a campaign and data keeps itself fresh.
  };
}
