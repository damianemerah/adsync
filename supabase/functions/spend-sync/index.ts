/**
 * Spend Sync Edge Function
 *
 * Runs daily at 01:00 UTC via pg_cron.
 * For every active/trialing user with connected Meta ad accounts:
 *   1. Fetches last-30d spend from Meta Insights
 *   2. Converts USD → NGN using the live FX rate
 *   3. Applies anomaly buffer before triggering upgrade detection
 *   4. Runs the deferred-upgrade state machine (7-day grace window)
 *   5. Sets pending_paystack_plan_upgrade when a Paystack sub exists
 *   6. Sends in-app + email notifications on state transitions
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ─── Tier config (mirrors src/lib/constants.ts) ───────────────────────────────

const STARTER_CEILING_KOBO = 10_000_000; // ₦100,000
const GROWTH_CEILING_KOBO  = 30_000_000; // ₦300,000
const STARTER_BUFFER_KOBO  =  2_000_000; // ₦20,000  — anomaly buffer
const GROWTH_BUFFER_KOBO   =  5_000_000; // ₦50,000  — anomaly buffer

type TierId = "starter" | "growth" | "agency";

const TIER_ORDER: Record<TierId, number> = { starter: 0, growth: 1, agency: 2 };
const TIER_NAMES: Record<TierId, string> = {
  starter: "Starter",
  growth: "Growth",
  agency: "Agency",
};
const TIER_BUFFER: Record<TierId, number> = {
  starter: STARTER_BUFFER_KOBO,
  growth: GROWTH_BUFFER_KOBO,
  agency: 0,
};

/**
 * Resolves the minimum tier for a spend amount, applying an anomaly buffer.
 * The buffer shifts the upgrade threshold UP so that brief spend spikes
 * (e.g. a one-off Black Friday campaign) don't trigger a permanent upgrade.
 */
function resolveSpendTier(spendKobo: number, bufferKobo: number = 0): TierId {
  if (spendKobo <= STARTER_CEILING_KOBO + bufferKobo) return "starter";
  if (spendKobo <= GROWTH_CEILING_KOBO + bufferKobo) return "growth";
  return "agency";
}

// ─── Token decryption (mirrors src/lib/crypto.ts) ────────────────────────────

async function decrypt(encryptedToken: string, key: string): Promise<string> {
  const parts = encryptedToken.split(":");
  if (parts.length !== 3) return encryptedToken;

  const [prefix, part2, part3] = parts;
  const hexToBytes = (hex: string) =>
    new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

  if (prefix === "v1" || prefix === "v2") {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
      { name: "AES-CBC" },
      false,
      ["decrypt"],
    );
    try {
      const buf = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv: hexToBytes(part2) },
        keyMaterial,
        hexToBytes(part3),
      );
      return new TextDecoder().decode(buf);
    } catch {
      return encryptedToken;
    }
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const ciphertext = hexToBytes(part3);
  const authTag = hexToBytes(part2);
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);
  try {
    const buf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: hexToBytes(prefix) },
      keyMaterial,
      combined,
    );
    return new TextDecoder().decode(buf);
  } catch {
    return encryptedToken;
  }
}

// ─── Notification helpers ─────────────────────────────────────────────────────

async function insertNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  orgId: string,
  type: string,
  title: string,
  message: string,
  actionLabel: string,
  dedupKey: string,
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    category: "account",
    title,
    message,
    action_label: actionLabel,
    action_url: "/settings/subscription",
    dedup_key: dedupKey,
    is_read: false,
  });
  // 23505 = unique_violation (dedup already exists) — silently skip
  if (error && error.code !== "23505") {
    console.warn("[SpendSync] Failed to insert notification:", error);
    return;
  }
  // Enqueue email delivery (fire-and-forget)
  await supabase.from("job_queue").insert({
    type: "notification_send",
    organization_id: orgId,
    user_id: userId,
    status: "pending",
    max_attempts: 3,
    payload: { userId, type, category: "account", title, message, actionLabel, actionUrl: "/settings/subscription", channels: ["email"] },
  }).then(() => {}).catch(() => {});
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encryptionKey = Deno.env.get("ENCRYPTION_KEY") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey ?? "",
  );

  try {
    // 1. Get active FX rate (fallback: ₦1,500/$)
    const { data: fxRow } = await supabase
      .from("fx_rates")
      .select("rate_ngn_per_usd")
      .eq("is_active", true)
      .maybeSingle();

    const rateNgnPerUsd = fxRow?.rate_ngn_per_usd ? Number(fxRow.rate_ngn_per_usd) : 1500;

    // 2. Fetch all active/trialing subscriptions with pending upgrade state
    const { data: subscriptions, error: subErr } = await supabase
      .from("user_subscriptions")
      .select("user_id, subscription_tier, paystack_sub_code, pending_tier_upgrade_to, pending_tier_upgrade_after")
      .in("subscription_status", ["active", "trialing"]);

    if (subErr) throw subErr;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, upgraded: 0, deferred: 0 }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    let processed = 0;
    let upgraded = 0;
    let deferred = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const uid = sub.user_id;
        const previousTier = sub.subscription_tier as TierId;
        const paystackSubCode = sub.paystack_sub_code ?? null;
        const pendingUpgradeTo = (sub.pending_tier_upgrade_to ?? null) as TierId | null;
        const pendingUpgradeAfter = sub.pending_tier_upgrade_after
          ? new Date(sub.pending_tier_upgrade_after)
          : null;

        // 3. Find the user's org
        const { data: membership } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", uid)
          .limit(1)
          .maybeSingle();

        if (!membership?.organization_id) continue;
        const orgId = membership.organization_id;

        // 4. Get healthy Meta ad accounts for this org
        const { data: accounts } = await supabase
          .from("ad_accounts")
          .select("id, platform_account_id, access_token")
          .eq("organization_id", orgId)
          .eq("platform", "meta")
          .eq("health_status", "healthy")
          .is("disconnected_at", null);

        if (!accounts || accounts.length === 0) {
          await supabase.from("user_subscriptions").update({
            last_30d_spend_kobo: 0,
            spend_evaluated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("user_id", uid);
          processed++;
          continue;
        }

        // 5. Fetch Meta Insights for each account
        let totalSpendUsd = 0;
        for (const account of accounts) {
          try {
            const accessToken = await decrypt(account.access_token, encryptionKey);
            const url = `https://graph.facebook.com/v25.0/${account.platform_account_id}/insights?fields=spend&date_preset=last_30_days&level=account&access_token=${accessToken}`;
            const res = await fetch(url);
            const data = await res.json();
            const spendUsd = parseFloat(data.data?.[0]?.spend ?? "0");
            if (!isNaN(spendUsd)) totalSpendUsd += spendUsd;
          } catch {
            // Non-critical — continue
          }
        }

        // 6. Convert to kobo
        const totalSpendKobo = Math.round(totalSpendUsd * rateNgnPerUsd * 100);
        const totalSpendNgn = totalSpendKobo / 100;
        const nowIso = new Date().toISOString();

        // 7. Resolve tier with anomaly buffer
        const tierBuffer = TIER_BUFFER[previousTier] ?? 0;
        const resolvedTier = resolveSpendTier(totalSpendKobo, tierBuffer);
        const needsUpgrade = TIER_ORDER[resolvedTier] > TIER_ORDER[previousTier];

        // 8. Deferred upgrade state machine
        if (!needsUpgrade) {
          if (pendingUpgradeTo) {
            // Spend dropped back — cancel the scheduled upgrade
            await supabase.from("user_subscriptions").update({
              pending_tier_upgrade_to: null,
              pending_tier_upgrade_after: null,
              last_30d_spend_kobo: totalSpendKobo,
              spend_evaluated_at: nowIso,
              updated_at: nowIso,
            }).eq("user_id", uid);

            await insertNotification(
              supabase, uid, orgId, "info",
              "No plan change needed",
              `Your Meta ad spend (₦${totalSpendNgn.toLocaleString("en-NG")}) has returned within your ${TIER_NAMES[previousTier]} plan limit. Your scheduled upgrade to ${TIER_NAMES[pendingUpgradeTo]} has been cancelled.`,
              "View Billing",
              `spend_upgrade_cancelled_${uid}_${nowIso.slice(0, 7)}`,
            );
          } else {
            // Just refresh spend cache
            await supabase.from("user_subscriptions").update({
              last_30d_spend_kobo: totalSpendKobo,
              spend_evaluated_at: nowIso,
              updated_at: nowIso,
            }).eq("user_id", uid);
          }
        } else if (pendingUpgradeTo === resolvedTier && pendingUpgradeAfter && new Date() >= pendingUpgradeAfter) {
          // 7-day window elapsed — apply the upgrade
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

          await insertNotification(
            supabase, uid, orgId, "success",
            `Plan upgraded to ${TIER_NAMES[resolvedTier]}`,
            `Your plan has been upgraded from ${TIER_NAMES[previousTier]} to ${TIER_NAMES[resolvedTier]} based on your Meta ad spend (₦${totalSpendNgn.toLocaleString("en-NG")}). ${needsPaystackPlanUpdate ? "Update your billing to apply the new rate." : ""}`,
            "View Billing",
            `spend_upgrade_applied_${uid}_${resolvedTier}_${nowIso.slice(0, 7)}`,
          );

          upgraded++;
        } else if (!pendingUpgradeTo || pendingUpgradeTo !== resolvedTier) {
          // First detection — start the 7-day clock
          const upgradeAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

          await supabase.from("user_subscriptions").update({
            pending_tier_upgrade_to: resolvedTier,
            pending_tier_upgrade_after: upgradeAfter,
            last_30d_spend_kobo: totalSpendKobo,
            spend_evaluated_at: nowIso,
            updated_at: nowIso,
          }).eq("user_id", uid);

          await insertNotification(
            supabase, uid, orgId, "warning",
            "Plan upgrade scheduled in 7 days",
            `Your Meta ad spend (₦${totalSpendNgn.toLocaleString("en-NG")}/mo) exceeds your ${TIER_NAMES[previousTier]} plan limit. Your plan will automatically upgrade to ${TIER_NAMES[resolvedTier]} in 7 days. You can update billing now to confirm.`,
            "Update Billing",
            `spend_upgrade_pending_${uid}_${resolvedTier}_${nowIso.slice(0, 7)}`,
          );

          deferred++;
        } else {
          // Pending < 7 days — refresh spend cache only
          await supabase.from("user_subscriptions").update({
            last_30d_spend_kobo: totalSpendKobo,
            spend_evaluated_at: nowIso,
            updated_at: nowIso,
          }).eq("user_id", uid);
        }

        processed++;
        // Small delay to avoid Meta API rate limits
        await new Promise((r) => setTimeout(r, 100));
      } catch (err: any) {
        errors.push(`${sub.user_id}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, upgraded, deferred, errors }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
