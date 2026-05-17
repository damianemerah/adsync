"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { MetaService } from "@/lib/api/meta";
import { resolveSpendTier, isTierChangeAllowed } from "@/lib/tier-resolver";
import { PLAN_PRICES, PAYSTACK_PLAN_CODES, TIER_CONFIG } from "@/lib/constants";
import type { TierId } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/active-org";
import { sendNotification } from "@/lib/notifications";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const TIER_ORDER: Record<TierId, number> = { starter: 0, growth: 1, agency: 2 };
const TIER_NAMES: Record<TierId, string> = {
  starter: "Starter",
  growth: "Growth",
  agency: "Agency",
};

export interface SpendSyncResult {
  success: boolean;
  spendKobo: number;
  resolvedTier: TierId;
  previousTier: TierId;
  tierChanged: boolean;
  error?: string;
}

/**
 * Fetches last-30-day spend from Meta for all connected ad accounts
 * belonging to the user's current org, then updates subscription tier.
 *
 * Uses the anomaly buffer from TIER_CONFIG so that brief spend spikes
 * (e.g. a one-off campaign) don't immediately trigger a permanent upgrade.
 * When spend genuinely exceeds ceiling + buffer, a 7-day grace window is
 * started before the DB tier actually changes — giving the user advance
 * notice before their next Paystack charge.
 */
export async function syncSpendAndUpdateTier(
  userId?: string,
  explicitOrgId?: string,
): Promise<SpendSyncResult> {
  const supabase = await createClient();

  // 1. Auth
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, spendKobo: 0, resolvedTier: "starter", previousTier: "starter", tierChanged: false, error: "Unauthorized" };
    uid = user.id;
  }

  // 2. Resolve org
  const orgId = explicitOrgId ?? await getActiveOrgId();
  if (!orgId) {
    return { success: false, spendKobo: 0, resolvedTier: "starter", previousTier: "starter", tierChanged: false, error: "No organization found" };
  }

  // 3. Fetch current subscription + pending upgrade state
  const { data: userSub } = await supabase
    .from("user_subscriptions")
    .select("subscription_tier, paystack_sub_code, pending_tier_upgrade_to, pending_tier_upgrade_after")
    .eq("user_id", uid)
    .maybeSingle();

  const previousTier = (userSub?.subscription_tier ?? "starter") as TierId;
  const paystackSubCode = userSub?.paystack_sub_code ?? null;
  const pendingUpgradeTo = (userSub?.pending_tier_upgrade_to ?? null) as TierId | null;
  const pendingUpgradeAfter = userSub?.pending_tier_upgrade_after
    ? new Date(userSub.pending_tier_upgrade_after)
    : null;

  // 4. Get healthy Meta ad accounts for this org
  const { data: adAccounts } = await supabase
    .from("ad_accounts")
    .select("id, platform_account_id, access_token, currency")
    .eq("organization_id", orgId)
    .eq("platform", "meta")
    .eq("health_status", "healthy")
    .is("disconnected_at", null);

  if (!adAccounts || adAccounts.length === 0) {
    await supabase
      .from("user_subscriptions")
      .update({
        last_30d_spend_kobo: 0,
        spend_evaluated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", uid);

    return { success: true, spendKobo: 0, resolvedTier: previousTier, previousTier, tierChanged: false };
  }

  // 5. Fetch Meta Insights — last 30 days
  let totalSpendUsd = 0;
  for (const account of adAccounts) {
    try {
      const accessToken = decrypt(account.access_token);
      const insights = await MetaService.request(
        `/${account.platform_account_id}/insights?fields=spend&date_preset=last_30_days&level=account`,
        "GET",
        accessToken,
      );
      const spendUsd = parseFloat(insights.data?.[0]?.spend ?? "0");
      if (!isNaN(spendUsd)) totalSpendUsd += spendUsd;
    } catch (err) {
      console.warn(`[SpendSync] Failed to fetch insights for account ${account.id}:`, err);
    }
  }

  // 6. Convert USD → Kobo (live FX rate, fallback ₦1,500/$)
  const supabaseAdmin = createAdminClient();
  const { data: fxRow } = await supabaseAdmin
    .from("fx_rates")
    .select("rate_ngn_per_usd")
    .eq("is_active", true)
    .maybeSingle();

  const rateNgnPerUsd = fxRow?.rate_ngn_per_usd ? Number(fxRow.rate_ngn_per_usd) : 1500;
  const totalSpendKobo = Math.round(totalSpendUsd * rateNgnPerUsd * 100);
  const totalSpendNgn = totalSpendKobo / 100;
  const nowIso = new Date().toISOString();

  // 7. Resolve tier with anomaly buffer (prevents one-off spikes from triggering upgrade)
  const tierBuffer = (TIER_CONFIG[previousTier]?.limits?.anomalyBufferKobo as number | null) ?? 0;
  const resolvedTier = resolveSpendTier(totalSpendKobo, tierBuffer);
  const needsUpgrade = TIER_ORDER[resolvedTier] > TIER_ORDER[previousTier];

  // 8. Deferred upgrade state machine
  if (!needsUpgrade) {
    if (pendingUpgradeTo) {
      // Spend dropped below threshold — cancel the scheduled upgrade
      await supabase.from("user_subscriptions").update({
        pending_tier_upgrade_to: null,
        pending_tier_upgrade_after: null,
        last_30d_spend_kobo: totalSpendKobo,
        spend_evaluated_at: nowIso,
        updated_at: nowIso,
      }).eq("user_id", uid);

      sendNotification({
        userId: uid,
        organizationId: orgId,
        type: "info",
        category: "account",
        title: "No plan change needed",
        message: `Your Meta ad spend (₦${totalSpendNgn.toLocaleString("en-NG")}) has returned within your ${TIER_NAMES[previousTier]} plan limit. Your scheduled upgrade to ${TIER_NAMES[pendingUpgradeTo]} has been cancelled.`,
        actionUrl: "/settings/subscription",
        actionLabel: "View Billing",
        dedupKey: `spend_upgrade_cancelled_${uid}_${nowIso.slice(0, 7)}`,
      }).catch(() => {});
    } else {
      // No change needed — just refresh the spend cache
      await supabase.from("user_subscriptions").update({
        last_30d_spend_kobo: totalSpendKobo,
        spend_evaluated_at: nowIso,
        updated_at: nowIso,
      }).eq("user_id", uid);
    }

    return { success: true, spendKobo: totalSpendKobo, resolvedTier: previousTier, previousTier, tierChanged: false };
  }

  // Upgrade is needed — check the 7-day deferred window
  if (pendingUpgradeTo === resolvedTier && pendingUpgradeAfter && new Date() >= pendingUpgradeAfter) {
    // 7-day window has elapsed — apply the upgrade now
    const needsPaystackPlanUpdate = !!paystackSubCode;

    await supabase.from("user_subscriptions").update({
      subscription_tier: resolvedTier,
      pending_tier_upgrade_to: null,
      pending_tier_upgrade_after: null,
      last_30d_spend_kobo: totalSpendKobo,
      spend_evaluated_at: nowIso,
      updated_at: nowIso,
      ...(needsPaystackPlanUpdate ? { pending_paystack_plan_upgrade: true } : {}),
    }).eq("user_id", uid);

    sendNotification({
      userId: uid,
      organizationId: orgId,
      type: "success",
      category: "account",
      title: `Plan upgraded to ${TIER_NAMES[resolvedTier]}`,
      message: `Your plan has been upgraded from ${TIER_NAMES[previousTier]} to ${TIER_NAMES[resolvedTier]} based on your Meta ad spend (₦${totalSpendNgn.toLocaleString("en-NG")}). ${needsPaystackPlanUpdate ? "Update your billing to apply the new rate." : ""}`,
      actionUrl: "/settings/subscription",
      actionLabel: "View Billing",
      dedupKey: `spend_upgrade_applied_${uid}_${resolvedTier}_${nowIso.slice(0, 7)}`,
    }).catch(() => {});

    return { success: true, spendKobo: totalSpendKobo, resolvedTier, previousTier, tierChanged: true };
  }

  if (!pendingUpgradeTo || pendingUpgradeTo !== resolvedTier) {
    // First detection (or tier shifted) — start the 7-day clock
    const upgradeAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("user_subscriptions").update({
      pending_tier_upgrade_to: resolvedTier,
      pending_tier_upgrade_after: upgradeAfter,
      last_30d_spend_kobo: totalSpendKobo,
      spend_evaluated_at: nowIso,
      updated_at: nowIso,
    }).eq("user_id", uid);

    sendNotification({
      userId: uid,
      organizationId: orgId,
      type: "warning",
      category: "account",
      title: "Plan upgrade scheduled in 7 days",
      message: `Your Meta ad spend (₦${totalSpendNgn.toLocaleString("en-NG")}/mo) exceeds your ${TIER_NAMES[previousTier]} plan limit. Your plan will automatically upgrade to ${TIER_NAMES[resolvedTier]} in 7 days. You can update billing now to confirm.`,
      actionUrl: "/settings/subscription",
      actionLabel: "Update Billing",
      dedupKey: `spend_upgrade_pending_${uid}_${resolvedTier}_${nowIso.slice(0, 7)}`,
    }).catch(() => {});

    return { success: true, spendKobo: totalSpendKobo, resolvedTier, previousTier, tierChanged: false };
  }

  // Pending already set and < 7 days — just refresh the spend cache
  await supabase.from("user_subscriptions").update({
    last_30d_spend_kobo: totalSpendKobo,
    spend_evaluated_at: nowIso,
    updated_at: nowIso,
  }).eq("user_id", uid);

  return { success: true, spendKobo: totalSpendKobo, resolvedTier, previousTier, tierChanged: false };
}

// ─── Guard: reject downgrade below spend floor ────────────────────────────────

export async function validatePlanChange(requestedTier: TierId): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Unauthorized";

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("last_30d_spend_kobo, subscription_tier")
    .eq("user_id", user.id)
    .maybeSingle();

  const spendKobo = sub?.last_30d_spend_kobo ?? 0;
  const allowed = isTierChangeAllowed(requestedTier, spendKobo);

  if (!allowed) {
    const resolvedTier = resolveSpendTier(spendKobo);
    return `Your 30-day ad spend requires at least the ${TIER_NAMES[resolvedTier]} plan. You cannot downgrade to ${TIER_NAMES[requestedTier]}.`;
  }

  return null;
}

// ─── Initiate Paystack plan change (upgrade only) ─────────────────────────────

export async function initiateTierUpgrade(
  requestedTier: TierId,
  callbackUrl: string,
): Promise<{ authorization_url: string; reference: string }> {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Missing Paystack Secret Key");

  const blocked = await validatePlanChange(requestedTier);
  if (blocked) throw new Error(blocked);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  const priceNGN = PLAN_PRICES[requestedTier];
  if (!priceNGN) throw new Error(`Unknown plan: ${requestedTier}`);

  const reference = `tenzu_sub_${requestedTier}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const planCode = PAYSTACK_PLAN_CODES[requestedTier];

  const body: Record<string, unknown> = {
    email: user.email,
    amount: priceNGN * 100,
    reference,
    callback_url: callbackUrl,
    metadata: {
      org_id: orgId,
      plan_id: requestedTier,
      plan_interval: "monthly",
      tx_type: "subscription",
    },
  };

  if (planCode) body.plan = planCode;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Paystack init failed");

  return {
    authorization_url: data.data.authorization_url as string,
    reference: data.data.reference as string,
  };
}
