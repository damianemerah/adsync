"use server";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Credit quotas that mirror plan_definitions — used as fallback if webhook missed
const PLAN_CREDITS: Record<string, number> = {
  starter: 150,
  growth: 400,
  agency: 1200,
};
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
  const planId: string = txData.metadata?.plan_id || "starter";

  if (!orgId) {
    // Can't activate without org_id — webhook should handle it when it fires
    console.warn(
      "[verifyAndActivate] No org_id in metadata for ref:",
      reference,
    );
    return { success: true, alreadyProcessed: false };
  }

  // 2. Check if webhook already processed this reference
  const { data: existing } = await supabase
    .from("transactions")
    .select("status")
    .eq("provider_reference", reference)
    .maybeSingle();

  if (existing?.status === "success") {
    // Webhook beat us to it — nothing more to do
    return { success: true, alreadyProcessed: true, planId };
  }

  // 3. Webhook hasn't fired yet — run full activation as fallback
  const creditsToGrant = PLAN_CREDITS[planId] ?? 150;
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
  const planInterval: string = txData.metadata?.plan_interval || "monthly";

  // Activate subscription
  await supabase
    .from("organizations")
    .update({
      subscription_status: "active",
      subscription_tier: planId as "starter" | "growth" | "agency",
      subscription_expires_at: expiresAt,
      plan_interval: planInterval,
      plan_credits_quota: creditsToGrant,
      paystack_customer_code: txData.customer?.customer_code ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  // Upsert transaction record
  await supabase.from("transactions").upsert(
    {
      organization_id: orgId,
      amount_cents: txData.amount,
      currency: txData.currency ?? "NGN",
      type: "subscription_payment",
      description: `${planId} plan – ${planInterval} (callback fallback)`,
      payment_provider: "paystack",
      provider_reference: reference,
      status: "success",
    },
    { onConflict: "provider_reference" },
  );

  // Grant credits (atomic RPC)
  const { error: creditError } = await supabase.rpc("add_credits", {
    p_org_id: orgId,
    p_credits: creditsToGrant,
    p_reason: `plan_renewal:${planId}:callback_fallback`,
    p_reference: undefined,
  });

  if (creditError) {
    console.error("[verifyAndActivate] Failed to grant credits:", creditError);
  }

  console.log(
    `[verifyAndActivate] ✅ Fallback activation: ${planId} for org ${orgId}`,
  );

  return { success: true, alreadyProcessed: false, planId };
}
