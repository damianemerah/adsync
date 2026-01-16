"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function useCampaigns() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          ad_accounts ( platform, currency )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map DB fields to UI friendly format
      return data.map((c) => ({
        id: c.id,
        name: c.name,
        platform: c.platform as 'meta' | 'tiktok' | null, // 'meta' | 'tiktok'
        status: (c.status as "active" | "paused" | "draft" | "completed") || "draft",
        budget: c.daily_budget_cents / 100,
        currency: c.ad_accounts?.currency || 'NGN',
        createdAt: new Date(c.created_at || Date.now()).toLocaleDateString(),
        clicks: 0, // Mocking metrics as column doesn't exist yet
        spend: 0,
        ctr: 0,
      }));
    },
  });

  // 2. Sync Mutation (Fetches from Meta -> Updates DB)
  const syncMutation = useMutation({
    mutationFn: async () => {
      // Get all active ad accounts first
      const { data: accounts } = await supabase
        .from("ad_accounts")
        .select("id")
        .eq("health_status", "healthy");

      if (!accounts || accounts.length === 0) throw new Error("No connected ad accounts.");

      // Sync each account
      const results = await Promise.all(
        accounts.map((acc) =>
          fetch("/api/campaigns/sync", {
            method: "POST",
            body: JSON.stringify({ accountId: acc.id }),
          }).then((res) => res.json())
        )
      );

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaigns synced from Meta");
    },
    onError: (error) => {
      toast.error("Failed to sync campaigns", { description: error.message });
    },
  });

  return { ...query, syncCampaigns: syncMutation.mutate, isSyncing: syncMutation.isPending };
}