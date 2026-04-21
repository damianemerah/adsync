"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";
import {
  disconnectAdAccount,
  setAsDefaultAccount,
} from "@/actions/ad-accounts";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

// --- TYPES ---

interface FundingSource {
  brand: string;
  last4: string;
}

export interface AdAccountUI {
  id: string;
  platform: "meta" | "tiktok";
  name: string;
  nickname: string | null;
  accountId: string;
  status: Database["public"]["Tables"]["ad_accounts"]["Row"]["health_status"];
  balance: string;
  currency: string;
  spendCap: string;
  paymentMethod: FundingSource;
  isDefault: boolean;
  lastSynced: string;
}

// --- HELPERS ---

const formatCurrency = (cents: number | null, currency: string | null) => {
  if (cents === null || cents === undefined) return "---";
  const amount = cents / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency || "NGN",
  }).format(amount);
};

// --- FETCHER ---

const fetchAdAccounts = async (
  activeOrgId: string | null,
): Promise<AdAccountUI[]> => {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let orgId = activeOrgId;

  if (!orgId) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!member || member.length === 0) return [];
    orgId = member[0].organization_id as string;
  }

  const { data, error } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", orgId)
    .is("disconnected_at", null)
    .order("connected_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data.map(
    (account: Database["public"]["Tables"]["ad_accounts"]["Row"]) => {
      const fundingDetails =
        (account.funding_source_details as unknown as FundingSource) || {
          brand: "Unknown",
          last4: "....",
        };

      return {
        id: account.id,
        platform: account.platform as "meta" | "tiktok",
        name: account.nickname || account.account_name || "Unnamed Account",
        nickname: account.nickname,
        accountId: account.platform_account_id,
        status: account.health_status,
        balance: formatCurrency(
          account.last_known_balance_cents,
          account.currency,
        ),
        currency: account.currency || "NGN",
        spendCap: "Unlimited",
        paymentMethod: fundingDetails,
        isDefault: account.is_default || false,
        lastSynced: new Date(
          account.last_health_check || account.connected_at || Date.now(),
        ).toLocaleDateString(),
      };
    },
  );
};

// ---------------------------------------------------------------------------
// Query Hook — subscribe to this if you only need to READ ad accounts
// ---------------------------------------------------------------------------

export function useAdAccountsList() {
  const { activeOrgId } = useActiveOrgContext();

  return useQuery({
    queryKey: ["ad_accounts", activeOrgId],
    queryFn: () => fetchAdAccounts(activeOrgId),
  });
}

// ---------------------------------------------------------------------------
// Mutation Hook — subscribe to this if you only need to WRITE ad accounts.
// No useQuery inside — components using this will NOT re-render on list changes.
// ---------------------------------------------------------------------------

export function useAdAccountMutations() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useActiveOrgContext();

  const disconnectMutation = useMutation({
    mutationFn: disconnectAdAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts", activeOrgId] });
    },
  });

  const defaultMutation = useMutation({
    mutationFn: setAsDefaultAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts", activeOrgId] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/ad-accounts/sync", {
        method: "POST",
        body: JSON.stringify({ accountId: id }),
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts", activeOrgId] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({
      id,
      newNickname,
    }: {
      id: string;
      newNickname: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("ad_accounts")
        .update({ nickname: newNickname === "" ? null : newNickname })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts", activeOrgId] });
    },
  });

  return {
    syncAccount: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    disconnectAccount: disconnectMutation.mutateAsync,
    setAsDefault: defaultMutation.mutateAsync,
    renameAccount: renameMutation.mutate,
  };
}

