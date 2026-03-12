"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase";
import { TIER_CONFIG, TierId } from "@/lib/constants";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

export function useSubscription() {
  const supabase = createClient();
  const { activeOrgId } = useActiveOrgContext();

  return useQuery({
    queryKey: ["subscription", activeOrgId],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let query = supabase
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
        .eq("user_id", user.id);

      if (activeOrgId) {
        query = query.eq("organization_id", activeOrgId);
      }

      const { data: members, error: memberError } = await query.limit(1);

      if (memberError || !members || members.length === 0)
        throw new Error("No organization found");
      const member = members[0];

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

      return {
        org: {
          id: org?.id,
          name: org?.name || "My Business",
          status: org?.subscription_status || "expired",
          tier: org?.subscription_tier || "starter",
          tierConfig:
            TIER_CONFIG[(org?.subscription_tier || "starter") as TierId],
          expiresAt: org?.subscription_expires_at
            ? new Date(org.subscription_expires_at)
            : new Date(),
          creditsBalance: org?.credits_balance ?? 0,
          creditQuota: org?.plan_credits_quota ?? 0,
        },
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
