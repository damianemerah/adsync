"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { launchCampaignQueued as launchCampaign } from "@/actions/campaigns-queue";
import { updateCampaignStatus, duplicateCampaign, deleteCampaign, archiveCampaign, renameCampaign } from "@/actions/campaigns";
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
          (c.status as "active" | "paused" | "draft" | "completed" | "queuing" | "failed") || "draft",
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
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      if (data.success) {
        // When queuing, the step shows its own success modal — don't also redirect
        if ((data as any).status !== "queuing") {
          toast.success("Campaign launched successfully!");
          router.push("/campaigns");
        }
      } else {
        toast.error("Failed to queue campaign", {
          description: (data as any).error,
        });
      }
    },
    onError: (error) => {
      toast.error("An error occurred", { description: error.message });
    },
  });

  // 4. Duplicate Campaign Mutation
  const duplicateCampaignMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const result = await duplicateCampaign(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      toast.success("Campaign duplicated", { description: "A draft copy has been created." });
      router.refresh();
    },
    onError: (error) => {
      toast.error("Failed to duplicate campaign", { description: error.message });
    },
  });

  // 5. Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "PAUSED" | "ACTIVE" | "ARCHIVED";
    }) => {
      const result = await updateCampaignStatus(id, action);
      if (!result.success) {
        const err = new Error(result.error) as any;
        err.metaSubcode = result.metaSubcode;
        err.metaUserMessage = result.metaUserMessage;
        err.campaignId = id;
        throw err;
      }
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ["campaign", variables.id] });
      toast.success(`Campaign ${variables.action.toLowerCase()} successfully`);
      router.refresh();
    },
    onError: (error: any) => {
      if (error.metaSubcode === 1487566) {
        toast.error("Campaign Deleted on Meta", {
          description: "This campaign was deleted from Meta. Duplicate it to re-create with the same settings.",
          action: {
            label: "Duplicate",
            onClick: () => duplicateCampaignMutation.mutate({ id: error.campaignId }),
          },
        });
      } else {
        toast.error("Failed to update status", { description: error.message });
      }
    },
  });

  // 6. Delete Campaign Mutation (Meta DELETE + DB hard delete)
  const deleteCampaignMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const result = await deleteCampaign(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      toast.success("Ad deleted", { description: "The ad has been permanently removed." });
      router.refresh();
    },
    onError: (error: any) => {
      toast.error("Failed to delete ad", { description: error.message });
    },
  });

  // 7. Archive Campaign Mutation (app-only — DB status='completed')
  const archiveCampaignMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const result = await archiveCampaign(id);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      toast.success("Ad archived", { description: "The ad has been archived and hidden from active views." });
      router.refresh();
    },
    onError: (error: any) => {
      toast.error("Failed to archive ad", { description: error.message });
    },
  });

  // 8. Rename Campaign Mutation
  const renameCampaignMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await renameCampaign(id, name);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      toast.success("Ad renamed successfully");
      router.refresh();
    },
    onError: (error: any) => {
      toast.error("Failed to rename ad", { description: error.message });
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
    // Duplicate
    duplicateCampaign: duplicateCampaignMutation.mutate,
    isDuplicating: duplicateCampaignMutation.isPending,
    // Delete
    deleteCampaign: deleteCampaignMutation.mutate,
    isDeleting: deleteCampaignMutation.isPending,
    // Archive
    archiveCampaign: archiveCampaignMutation.mutate,
    isArchiving: archiveCampaignMutation.isPending,
    // Rename
    renameCampaign: renameCampaignMutation.mutate,
    isRenaming: renameCampaignMutation.isPending,
  };
}
