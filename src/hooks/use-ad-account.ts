"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client"; // Ensure path matches your project structure
import { Database } from "@/types/supabase"; // Assuming you ran the gen types command
import {
  disconnectAdAccount,
  setAsDefaultAccount,
} from "@/actions/ad-accounts";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

// --- TYPES ---

// 1. Define the shape of your JSONB column
interface FundingSource {
  brand: string;
  last4: string;
}

// 2. Define the shape the UI expects (The "Mapped" Type)
export interface AdAccountUI {
  id: string;
  platform: "meta" | "tiktok"; // narrowed type
  name: string;
  nickname: string | null;
  accountId: string;
  status: Database["public"]["Tables"]["ad_accounts"]["Row"]["health_status"]; // Uses your DB Enum and allows null
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

  // 1. Get Current User
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let orgId = activeOrgId;

  if (!orgId) {
    // 2. Fallback: Get User's First Organization ID
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!member || member.length === 0) return [];
    orgId = member[0].organization_id as string;
  }

  // 3. Fetch Accounts (Explicitly scoped to Org)
  // ✅ Filter out soft-deleted (disconnected) accounts
  const { data, error } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", orgId)
    .is("disconnected_at", null) // Only show connected accounts
    .order("connected_at", { ascending: false });

  if (error) throw new Error(error.message);

  // --- THE MAPPING LAYER ---
  return data.map(
    (account: Database["public"]["Tables"]["ad_accounts"]["Row"]) => {
      // Handle JSONB Type Casting
      // We treat 'null' as a placeholder object to prevent UI crashes
      const fundingDetails =
        (account.funding_source_details as unknown as FundingSource) || {
          brand: "Unknown",
          last4: "....",
        };

      return {
        id: account.id,
        // Cast platform string to specific union type if needed
        platform: account.platform as "meta" | "tiktok",

        // Logic: Show nickname if set, otherwise account name
        name: account.nickname || account.account_name || "Unnamed Account",
        nickname: account.nickname,

        accountId: account.platform_account_id,
        status: account.health_status, // Maps directly to enum

        // Formatting
        balance: formatCurrency(
          account.last_known_balance_cents,
          account.currency,
        ),
        currency: account.currency || "NGN",
        spendCap: "Unlimited", // Placeholder until we fetch snapshot data

        paymentMethod: fundingDetails,

        isDefault: account.is_default || false,

        lastSynced: new Date(
          account.last_health_check || account.connected_at || Date.now(),
        ).toLocaleDateString(),
      };
    },
  );
};

// --- HOOK ---

export function useAdAccounts() {
  const queryClient = useQueryClient();
  const { activeOrgId } = useActiveOrgContext();

  const query = useQuery({
    queryKey: ["ad_accounts", activeOrgId],
    queryFn: () => fetchAdAccounts(activeOrgId),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectAdAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts", activeOrgId] });
    },
  });

  // Default Mutation (Server Action)
  const defaultMutation = useMutation({
    mutationFn: setAsDefaultAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad_accounts", activeOrgId] });
    },
  });

  // Sync Mutation (Calls API Route)
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
    ...query,
    syncAccount: syncMutation.mutateAsync, // Async allows waiting for UI spinners
    isSyncing: syncMutation.isPending,
    disconnectAccount: disconnectMutation.mutateAsync,
    setAsDefault: defaultMutation.mutateAsync,
    renameAccount: renameMutation.mutate,
  };
}
