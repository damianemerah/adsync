"use client";

import { useQuery } from "@tanstack/react-query";
import { useActiveOrgContext } from "@/components/providers/active-org-provider";
import { getSubscriptionServer } from "@/actions/subscription";

export function useSubscription() {
  const { activeOrgId } = useActiveOrgContext();

  return useQuery({
    queryKey: ["subscription", activeOrgId],
    queryFn: async () => {
      return await getSubscriptionServer();
    },
    select: (data) => {
      const graceEndsAt = data.org.graceEndsAt ? new Date(data.org.graceEndsAt) : null;
      const expiresAt = new Date(data.org.expiresAt);
      const isInGracePeriod =
        data.org.status === "past_due" &&
        graceEndsAt !== null &&
        graceEndsAt > new Date();
      const pendingTierUpgradeAfter = data.org.pendingTierUpgradeAfter
        ? new Date(data.org.pendingTierUpgradeAfter)
        : null;

      return {
        ...data,
        org: {
          ...data.org,
          graceEndsAt,
          expiresAt,
          isInGracePeriod,
          pendingTierUpgradeAfter,
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
