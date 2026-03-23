"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { launchCampaign, updateCampaignStatus } from "@/actions/campaigns";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

export function useCampaigns() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { activeOrgId } = useActiveOrgContext();

  // 1. Fetch Campaigns
  const query = useQuery({
    queryKey: ["campaigns", activeOrgId],
    queryFn: async () => {
      let q = supabase
        .from("campaigns")
        .select(
          `
          *,
          ad_accounts ( platform, currency, account_name )
        `,
        )
        .order("created_at", { ascending: false });

      if (activeOrgId) {
        q = q.eq("organization_id", activeOrgId);
      }

      const { data, error } = await q;

      if (error) throw error;

      // Map DB fields to UI-friendly format
      return data.map((c: any) => ({
        id: c.id,
        name: c.name,
        platform: c.platform as "meta" | "tiktok" | null, // 'meta' | 'tiktok'
        status:
          (c.status as "active" | "paused" | "draft" | "completed") || "draft",
        budget: c.daily_budget_cents / 100,
        currency: c.ad_accounts?.currency || "NGN",
        createdAt: new Date(c.created_at || Date.now()).toLocaleDateString(),
        clicks: c.clicks || 0,
        impressions: c.impressions || 0,
        spend_cents: c.spend_cents || 0,
        spend: (c.spend_cents || 0) / 100,
        ctr: Number(c.ctr || 0),
        ad_account_id: c.ad_account_id,
        objective: c.objective,
        created_at: c.created_at,
        revenueNgn: c.revenue_ngn || 0,
        salesCount: c.sales_count || 0,
        whatsappClicks: c.whatsapp_clicks || 0,
        websiteClicks: c.website_clicks || 0,
        whatsappClickRate: c.whatsapp_click_rate || 0,
        adAccount: c.ad_accounts
          ? {
              platform: c.ad_accounts.platform,
              currency: c.ad_accounts.currency || "NGN",
              accountName: c.ad_accounts.account_name,
            }
          : null,
      }));
    },
  });

  // 2. Sync Mutation (Fetches from Meta -> Updates DB)
  const syncMutation = useMutation({
    mutationFn: async () => {
      // Get all active ad accounts first
      // ✅ Filter out soft-deleted (disconnected) accounts
      let q = supabase
        .from("ad_accounts")
        .select("id")
        .eq("health_status", "healthy")
        .is("disconnected_at", null); // Only sync connected accounts
      if (activeOrgId) q = q.eq("organization_id", activeOrgId);
      const { data: accounts } = await q;

      if (!accounts || accounts.length === 0)
        throw new Error("No connected ad accounts.");

      // Sync each account
      const results = await Promise.all(
        accounts.map((acc) =>
          fetch("/api/campaigns/sync", {
            method: "POST",
            body: JSON.stringify({ accountId: acc.id }),
          }).then((res) => res.json()),
        ),
      );

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      toast.success("Campaigns synced from Meta");
      router.refresh();
    },
    onError: (error) => {
      toast.error("Failed to sync campaigns", { description: error.message });
    },
  });

  // 3. Launch Mutation
  const launchMutation = useMutation({
    mutationFn: launchCampaign,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
        toast.success("Campaign launched successfully!");
        router.push("/campaigns");
      } else {
        toast.error("Failed to launch campaign", {
          description: data.error,
        });
      }
    },
    onError: (error) => {
      toast.error("An error occurred", { description: error.message });
    },
  });

  // 4. Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "PAUSED" | "ACTIVE" | "ARCHIVED";
    }) => {
      const result = await updateCampaignStatus(id, action);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["campaign", variables.id] });
      toast.success(`Campaign ${variables.action.toLowerCase()} successfully`);
      router.refresh();
    },
    onError: (error) => {
      toast.error("Failed to update status", { description: error.message });
    },
  });

  return {
    ...query,
    // Sync
    syncCampaigns: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    // Launch
    launchCampaign: launchMutation.mutate,
    isLaunching: launchMutation.isPending,
    // Update
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
  };
}
