"use server";

import { createClient } from "@/lib/supabase/server";
import { TIER_CONFIG, TierId } from "@/lib/constants";
import { resolveSpendTier, tierSpendRangeLabel } from "@/lib/tier-resolver";

export async function getSubscriptionServer() {
  const supabase = await createClient();
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
        last_30d_spend_kobo,
        spend_evaluated_at,
        pending_paystack_plan_upgrade,
        pending_tier_upgrade_to,
        pending_tier_upgrade_after,
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
    ? new Date(sub.subscription_grace_ends_at).toISOString()
    : null;

  const expiresAt = sub?.subscription_expires_at
    ? new Date(sub.subscription_expires_at).toISOString()
    : new Date().toISOString();

  // ── Spend-based tier data ───────────────────────────────────────────────
  const spendKobo = sub?.last_30d_spend_kobo ?? 0;
  const spendEvaluatedAt = sub?.spend_evaluated_at ?? null;
  const spendFloorTier = resolveSpendTier(spendKobo);
  const spendRangeLabel = tierSpendRangeLabel(tier);
  const pendingPaystackPlanUpgrade = sub?.pending_paystack_plan_upgrade ?? false;
  const pendingTierUpgradeTo = sub?.pending_tier_upgrade_to ?? null;
  const pendingTierUpgradeAfter = sub?.pending_tier_upgrade_after ?? null;

  return {
    org: {
      status,
      tier,
      tierConfig: TIER_CONFIG[tier],
      expiresAt,
      graceEndsAt,
      creditsBalance: userRecord?.credits_balance ?? 0,
      creditQuota: userRecord?.plan_credits_quota ?? 0,
      // Spend-based tier context
      spendKobo,
      spendEvaluatedAt,
      spendFloorTier,
      spendRangeLabel,
      pendingPaystackPlanUpgrade,
      pendingTierUpgradeTo,
      pendingTierUpgradeAfter,
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
}
