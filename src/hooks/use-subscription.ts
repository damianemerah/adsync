"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];

export function useSubscription() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Get Organisation + credit balance
      const { data: member, error: memberError } = await supabase
        .from("organization_members")
        .select(
          `
            organization_id,
            organizations (
              id,
              name,
              subscription_status,
              subscription_tier,
              subscription_expires_at,
              credits_balance,
              plan_credits_quota
            )
          `,
        )
        .eq("user_id", user.id)
        .single();

      if (memberError || !member) throw new Error("No organization found");

      // @ts-ignore – nested join typing is loose in generated types
      const org = member.organizations as {
        id: string;
        name: string;
        subscription_status: string;
        subscription_tier: string;
        subscription_expires_at: string | null;
        credits_balance: number;
        plan_credits_quota: number;
      };

      // 2. Get Transaction History
      const { data: transactions, error: txnError } = await supabase
        .from("transactions")
        .select("*")
        .eq("organization_id", member.organization_id as string)
        .order("created_at", { ascending: false })
        .limit(50);

      if (txnError) throw new Error("Failed to fetch transactions");

      return {
        org: {
          id: org?.id,
          name: org?.name || "My Business",
          status: org?.subscription_status || "expired",
          tier: org?.subscription_tier || "starter",
          expiresAt: org?.subscription_expires_at
            ? new Date(org.subscription_expires_at)
            : new Date(),
          creditsBalance: org?.credits_balance ?? 0,
          creditQuota: org?.plan_credits_quota ?? 0,
        },
        transactions: (transactions as Transaction[]) || [],
      };
    },
  });
}

// Lightweight hook for quick credit balance checks (e.g. in the AI button)
export function useCreditBalance() {
  const { data } = useSubscription();
  return {
    balance: data?.org?.creditsBalance ?? 0,
    quota: data?.org?.creditQuota ?? 0,
    percentUsed:
      data?.org?.creditQuota && data.org.creditQuota > 0
        ? Math.round(
            ((data.org.creditQuota - data.org.creditsBalance) /
              data.org.creditQuota) *
              100,
          )
        : 0,
  };
}
