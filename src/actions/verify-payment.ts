"use server";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { PLAN_CREDITS } from "@/lib/constants";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * verifyAndActivate
 *
 * Called from the Paystack callback page (/settings/subscription?success=true)
 * to handle the race condition where the webhook hasn't fired yet.
 *
 * Strategy:
 *  1. Verify the transaction is genuinely successful with Paystack.
 *  2. Check if our webhook already processed it (transaction.status = 'success').
 *  3. If not, run the full activation logic ourselves as a fallback.
 *  4. Return { success, alreadyProcessed } so the UI can show the right message.
 */
export async function verifyAndActivate(reference: string): Promise<{
  success: boolean;
  alreadyProcessed: boolean;
  planId?: string;
}> {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error("Missing Paystack key");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
    throw new Error("Missing Supabase URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Missing Supabase service key");

  // Use service-role client so we can write to any org without RLS
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // 0. Verify the caller is authenticated
  const supabaseAuthClient = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuthClient.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Confirm with Paystack
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
  );
  const paystackData = await res.json();

  if (!paystackData.status || paystackData.data?.status !== "success") {
    throw new Error("Payment could not be verified. Please contact support.");
  }

  const txData = paystackData.data;
  const orgId: string | undefined = txData.metadata?.org_id;
  const txType: string = txData.metadata?.tx_type ?? "subscription";

  if (!orgId) {
    // Can't activate without org_id — webhook should handle it when it fires
    console.warn(
      "[verifyAndActivate] No org_id in metadata for ref:",
      reference,
    );
    return { success: false, alreadyProcessed: false };
  }

  // 2. Check if webhook already processed this reference
  const { data: existing } = await supabase
    .from("transactions")
    .select("status")
    .eq("provider_reference", reference)
    .maybeSingle();

  if (existing?.status === "success") {
    // Webhook beat us to it — nothing more to do
    const planId: string = txData.metadata?.plan_id ?? "starter";
    return { success: true, alreadyProcessed: true, planId };
  }

  // 3. Resolve the org owner (needed for both credit pack and subscription paths)
  const { data: ownerMember } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("role", "owner")
    .single();
  const ownerId = ownerMember?.user_id;

  if (!ownerId) {
    console.warn("[VerifyPayment] Could not resolve owner for org:", orgId);
    return { success: false, alreadyProcessed: false };
  }

  // 4. Verify caller owns the organization being paid for
  if (ownerId !== user.id) {
    throw new Error("Unauthorized: You do not own the organization for this payment.");
  }

  // ── Credit Pack fallback ──────────────────────────────────────────────────
  // Must branch BEFORE subscription logic to avoid misprocessing pack payments
  // as subscriptions (wrong type, wrong credits, potential subscription overwrite).
  if (txType === "credit_pack") {
    const packCredits: number = txData.metadata?.credits ?? 0;
    const packName: string = txData.metadata?.pack_name ?? "Credit Pack";

    const { error: txError } = await supabase.from("transactions").insert({
      organization_id: orgId,
      amount_cents: txData.amount,
      currency: (txData.currency ?? "NGN") as "NGN" | "USD",
      type: "credit_pack_purchase",
      description: `${packName} - ${packCredits} credits (callback fallback)`,
      payment_provider: "paystack",
      provider_reference: reference,
      status: "success",
    });

    if (txError?.code === "23505") {
      console.log(`[verifyAndActivate] Transaction ${reference} already inserted`);
      return { success: true, alreadyProcessed: true };
    } else if (txError) {
      console.error("Failed to insert transaction:", txError);
    }

    const { error: creditError } = await supabase.rpc("add_credits", {
      p_user_id: ownerId,
      p_credits: packCredits,
      p_reason: `credit_pack:${packName.toLowerCase().replace(/ /g, "_")}:callback_fallback`,
      p_org_id: orgId,
    });

    if (creditError) {
      console.error("[verifyAndActivate] Failed to grant pack credits:", creditError);
    }

    console.log(`[verifyAndActivate] ✅ Credit pack fallback: +${packCredits} credits for org ${orgId}`);
    return { success: true, alreadyProcessed: false };
  }

  // ── Subscription fallback (default) ──────────────────────────────────────
  const planId: string = txData.metadata?.plan_id ?? "starter";
  const creditsToGrant = PLAN_CREDITS[planId] ?? PLAN_CREDITS.starter;
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
  const planInterval: string = txData.metadata?.plan_interval ?? "monthly";

  // Activate subscription on user_subscriptions (source of truth)
  await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: ownerId,
        subscription_status: "active",
        subscription_tier: planId as "starter" | "growth" | "agency",
        subscription_expires_at: expiresAt,
        subscription_grace_ends_at: null,
        plan_interval: planInterval,
        paystack_customer_code: txData.customer?.customer_code ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  // Propagate mirrors to all orgs this user owns
  const { data: ownedOrgs } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", ownerId)
    .eq("role", "owner");

  if (ownedOrgs && ownedOrgs.length > 0) {
    const orgIds = ownedOrgs
      .map((m) => m.organization_id)
      .filter((id): id is string => id !== null);

    if (orgIds.length > 0) {
      await supabase
        .from("organizations")
        .update({
          subscription_status: "active",
          subscription_tier: planId as "starter" | "growth" | "agency",
          subscription_expires_at: expiresAt,
          plan_interval: planInterval,
          updated_at: new Date().toISOString(),
        })
        .in("id", orgIds);
    }
  }

  // Upsert transaction record
  const { error: subTxError } = await supabase.from("transactions").insert({
    organization_id: orgId,
    amount_cents: txData.amount,
    currency: txData.currency ?? "NGN",
    type: "subscription_payment",
    description: `${planId} plan – ${planInterval} (callback fallback)`,
    payment_provider: "paystack",
    provider_reference: reference,
    status: "success",
  });

  if (subTxError?.code === "23505") {
    console.log(`[verifyAndActivate] Transaction ${reference} already inserted`);
    return { success: true, alreadyProcessed: true, planId };
  } else if (subTxError) {
    console.error("Failed to insert transaction:", subTxError);
  }

  // Grant credits (atomic RPC) — credits are user-scoped
  if (ownerId) {
    await supabase
      .from("users")
      .update({ plan_credits_quota: creditsToGrant })
      .eq("id", ownerId);

    const { error: creditError } = await supabase.rpc("add_credits", {
      p_user_id: ownerId,
      p_credits: creditsToGrant,
      p_reason: `plan_renewal:${planId}:callback_fallback`,
      p_org_id: orgId,
    });

    if (creditError) {
      console.error("[verifyAndActivate] Failed to grant credits:", creditError);
    }
  }

  revalidateTag(`dashboard-${orgId}`, "minutes");
  revalidateTag(`campaigns-${orgId}`, "minutes");

  console.log(
    `[verifyAndActivate] ✅ Fallback activation: ${planId} for org ${orgId}`,
  );

  return { success: true, alreadyProcessed: false, planId };
}
