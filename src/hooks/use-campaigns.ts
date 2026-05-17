"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { launchCampaignQueued as launchCampaign } from "@/actions/campaigns-queue";
import { updateCampaignStatus, duplicateCampaign, deleteCampaign, archiveCampaign, renameCampaign } from "@/actions/campaigns";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

// ---------------------------------------------------------------------------
// Query Hook — subscribe to this if you only need to READ campaigns
// ---------------------------------------------------------------------------

interface UseCampaignsListOptions {
  dateRange?: { from?: Date; to?: Date };
  /** 1-indexed page number. When omitted, all campaigns are fetched (no pagination). */
  page?: number;
  /** Rows per page. Only used when `page` is provided. Default 20. */
  pageSize?: number;
  /** Filter by name (case-insensitive substring match). Server-side. */
  search?: string;
  /** Filter by status ("active" | "paused" | "draft"). Ignored when showArchived=true. */
  status?: string | null;
  /** When true, fetches only archived campaigns (status = "completed"). */
  showArchived?: boolean;
  /** Filter by ad account platform ("meta" | "tiktok"). */
  platform?: string | null;
  /** Filter by ad account ID. */
  accountId?: string | null;
  /** Restrict to specific campaign IDs. Pass ["all"] or [] to skip this filter. */
  campaignIds?: string[];
}

export function useCampaignsList(options: UseCampaignsListOptions = {}) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { activeOrgId } = useActiveOrgContext();

  const {
    page,
    pageSize = 20,
    search,
    status,
    showArchived = false,
    platform,
    accountId,
    campaignIds,
  } = options;

  const isPaginated = page !== undefined;

  const dateFrom =
    options.dateRange?.from && options.dateRange?.to
      ? format(options.dateRange.from, "yyyy-MM-dd")
      : undefined;
  const dateTo =
    options.dateRange?.from && options.dateRange?.to
      ? format(options.dateRange.to, "yyyy-MM-dd")
      : undefined;

  return useQuery({
    queryKey: [
      "campaigns",
      activeOrgId,
      page ?? null,
      isPaginated ? pageSize : null,
      search ?? "",
      status ?? null,
      showArchived,
      platform ?? null,
      accountId ?? null,
      dateFrom ?? null,
      dateTo ?? null,
    ],
    queryFn: async () => {
      // Determine select string — use !inner join only when filtering by platform
      const selectStr =
        platform && platform !== "all"
          ? `*, ad_accounts!inner( platform, currency, account_name )`
          : `*, ad_accounts( platform, currency, account_name )`;

      // Read campaigns + account freshness in parallel.
      let campaignsQ = supabase
        .from("campaigns")
        .select(selectStr, isPaginated ? { count: "exact" } : undefined)
        .order("created_at", { ascending: false });

      if (activeOrgId) campaignsQ = campaignsQ.eq("organization_id", activeOrgId);

      // Server-side filters (only applied when paginating)
      if (isPaginated) {
        if (search) campaignsQ = campaignsQ.ilike("name", `%${search}%`);
        if (showArchived) {
          campaignsQ = campaignsQ.eq("status", "completed");
        } else {
          campaignsQ = campaignsQ.neq("status", "completed");
          if (status) campaignsQ = campaignsQ.eq("status", status);
        }
        if (platform && platform !== "all")
          campaignsQ = (campaignsQ as any).eq("ad_accounts.platform", platform);
        if (accountId) campaignsQ = campaignsQ.eq("ad_account_id", accountId);
        if (campaignIds?.length && !campaignIds.includes("all"))
          campaignsQ = campaignsQ.in("id", campaignIds);

        const offset = (page - 1) * pageSize;
        campaignsQ = campaignsQ.range(offset, offset + pageSize - 1);
      }

      let accountsQ = supabase
        .from("ad_accounts")
        .select("id, last_synced_at")
        .eq("health_status", "healthy")
        .is("disconnected_at", null);
      if (activeOrgId) accountsQ = accountsQ.eq("organization_id", activeOrgId);

      const [campaignsRes, accountsRes] = await Promise.all([
        campaignsQ,
        accountsQ,
      ]);

      if (campaignsRes.error) throw campaignsRes.error;
      const data = campaignsRes.data ?? [];
      const totalCount = (campaignsRes as any).count ?? data.length;
      const accounts = accountsRes.data ?? [];

      // Cache-on-read: if any healthy account hasn't been synced in the last
      // 5 minutes, kick off a background sync. Once it finishes, invalidate
      // so the query reruns and returns the freshly written rows. The sync
      // endpoint updates ad_accounts.last_synced_at, so the next queryFn
      // call sees fresh accounts and won't re-trigger — natural loop break.
      const STALE_MS = 5 * 60 * 1000;
      const now = Date.now();
      const staleAccounts = accounts.filter(
        (a) =>
          !a.last_synced_at ||
          now - new Date(a.last_synced_at).getTime() > STALE_MS,
      );

      if (staleAccounts.length > 0) {
        Promise.all(
          staleAccounts.map((a) =>
            fetch("/api/campaigns/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accountId: a.id }),
            })
              .then((r) => r.json())
              .catch(() => null),
          ),
        ).then(() => {
          queryClient.invalidateQueries({
            queryKey: ["campaigns", activeOrgId],
          });
        });
      }

      // When a date range is supplied, override per-campaign lifetime totals
      // with sums from campaign_metrics over the selected window. This keeps
      // the campaigns table in sync with the global date picker.
      //
      // IMPORTANT: If a date range IS active, campaigns with NO rows in that
      // window must show zeros — NOT fall back to lifetime `campaigns.spend_cents`.
      const metricsByCampaign = new Map<
        string,
        { spend_cents: number; impressions: number; clicks: number }
      >();
      const isRangeActive = !!(dateFrom && dateTo);

      if (isRangeActive && data.length > 0) {
        const ids = data.map((c: any) => c.id);
        const { data: metricRows } = await supabase
          .from("campaign_metrics")
          .select("campaign_id, spend_cents, impressions, clicks")
          .in("campaign_id", ids)
          .gte("date", dateFrom!)
          .lte("date", dateTo!);

        for (const row of metricRows ?? []) {
          if (!row.campaign_id) continue;
          const agg = metricsByCampaign.get(row.campaign_id) ?? {
            spend_cents: 0,
            impressions: 0,
            clicks: 0,
          };
          agg.spend_cents += Number(row.spend_cents ?? 0);
          agg.impressions += Number(row.impressions ?? 0);
          agg.clicks += Number(row.clicks ?? 0);
          metricsByCampaign.set(row.campaign_id, agg);
        }
      }

      const campaigns = data.map((c: any) => {
        const ranged = metricsByCampaign.get(c.id);
        // When a range is active:
        //   - If this campaign has rows in the range → use ranged aggregates
        //   - If this campaign has NO rows in the range → show zeros (no "leaking" lifetime totals)
        // When no range is active → fall back to lifetime totals from campaigns table
        const useLifetime = !isRangeActive;
        const spendCents = ranged ? ranged.spend_cents : useLifetime ? (c.spend_cents || 0) : 0;
        const impressions = ranged ? ranged.impressions : useLifetime ? (c.impressions || 0) : 0;
        const clicks = ranged ? ranged.clicks : useLifetime ? (c.clicks || 0) : 0;
        const ctr = ranged
          ? impressions > 0
            ? (clicks / impressions) * 100
            : 0
          : useLifetime
            ? Number(c.ctr || 0)
            : 0;
        return {
          id: c.id,
          name: c.name,
          platform: c.platform as "meta" | "tiktok" | null,
          status:
            (c.status as "active" | "paused" | "draft" | "completed" | "queuing" | "failed") || "draft",
          budget: c.daily_budget_cents / 100,
          currency: c.ad_accounts?.currency || "NGN",
          createdAt: new Date(c.created_at || Date.now()).toLocaleDateString(),
          clicks,
          impressions,
          spend_cents: spendCents,
          spend: spendCents / 100,
          ctr,
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
        };
      });

      return {
        campaigns,
        totalCount,
        totalPages: isPaginated ? Math.ceil(totalCount / pageSize) : 1,
        page: page ?? 1,
      };
    },
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: (q) =>
      q.state.data?.campaigns?.some((c: any) => c.status === "active") ? 60_000 : false,
    refetchIntervalInBackground: false,
  });
}

// ---------------------------------------------------------------------------
// Mutation Hook — subscribe to this if you only need to WRITE campaigns.
// No useQuery inside — components using this will NOT re-render on list changes.
// ---------------------------------------------------------------------------

export function useCampaignMutations() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { activeOrgId } = useActiveOrgContext();

  // 1. Launch Mutation
  const launchMutation = useMutation({
    mutationFn: launchCampaign,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", activeOrgId] });
      if (data.success) {
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

  // 3. Duplicate Campaign Mutation
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

  // 5. Delete Campaign Mutation (Meta DELETE + DB hard delete)
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

  // 6. Archive Campaign Mutation (app-only — DB status='completed')
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

  // 7. Rename Campaign Mutation
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

