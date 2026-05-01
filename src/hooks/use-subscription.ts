"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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

      // ── Fetch user-level subscription (single source of truth) ──────────────
      const { data: sub, error: subError } = await supabase
        .from("user_subscriptions")
        .select(
          `
            subscription_tier,
            subscription_status,
            subscription_expires_at,
            subscription_grace_ends_at,
            paystack_card_last4,
            paystack_card_type,
            paystack_card_bank,
            paystack_card_expiry
          `,
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (subError) throw subError;

      // ── Credits are user-scoped — fetch from users table ────────────────────
      const { data: userRecord } = await supabase
        .from("users")
        .select("credits_balance, plan_credits_quota")
        .eq("id", user.id)
        .single();

      const status = sub?.subscription_status ?? "incomplete";
      const tier = (sub?.subscription_tier ?? "starter") as TierId;

      const graceEndsAt = sub?.subscription_grace_ends_at
        ? new Date(sub.subscription_grace_ends_at)
        : null;

      const isInGracePeriod =
        status === "past_due" &&
        graceEndsAt !== null &&
        graceEndsAt > new Date();

      return {
        org: {
          status,
          tier,
          tierConfig: TIER_CONFIG[tier],
          expiresAt: sub?.subscription_expires_at
            ? new Date(sub.subscription_expires_at)
            : new Date(),
          graceEndsAt,
          isInGracePeriod,
          creditsBalance: userRecord?.credits_balance ?? 0,
          creditQuota: userRecord?.plan_credits_quota ?? 0,
          // Payment method display
          card: sub?.paystack_card_last4
            ? {
                last4: sub.paystack_card_last4,
                cardType: sub.paystack_card_type,
                bank: sub.paystack_card_bank,
                expiry: sub.paystack_card_expiry,
              }
            : null,
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
