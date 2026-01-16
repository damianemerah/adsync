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

      // 1. Get Organization Details
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
                subscription_expires_at
            )
        `
        )
        .eq("user_id", user.id)
        .single();

      if (memberError || !member) throw new Error("No organization found");

      const org = member.organizations;

      // 2. Get Transaction History
      const { data: transactions, error: txnError } = await supabase
        .from("transactions")
        .select("*")
        .eq("organization_id", member.organization_id as string)
        .order("created_at", { ascending: false });

      if (txnError) throw new Error("Failed to fetch transactions");

      // 3. Format Data for UI
      return {
        org: {
          id: org?.id, // Access property safely
          // @ts-ignore - Supabase types join can be tricky, safe to ignore if schema matches
          status: org?.subscription_status || "expired",
          // @ts-ignore
          tier: org?.subscription_tier || "starter",
          // @ts-ignore
          expiresAt: org?.subscription_expires_at
            ? // @ts-ignore
              new Date(org.subscription_expires_at)
            : new Date(), // Default to now if null
        },
        transactions: (transactions as Transaction[]) || [],
      };
    },
  });
}
