"use server";

import { createClient } from "@/lib/supabase/server";
import { PLAN_PRICES } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/active-org";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// Initialize a Paystack transaction and return the hosted checkout URL
// ─────────────────────────────────────────────────────────────────────────────
export async function initializePaystackTransaction(
  email: string,
  planId: string, // 'starter' | 'growth' | 'agency'
  callbackUrl: string,
  orgId: string,
) {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Missing Paystack Secret Key");

  const priceNGN = PLAN_PRICES[planId];
  if (!priceNGN) throw new Error(`Unknown plan: ${planId}`);

  const amountKobo = priceNGN * 100;
  const reference = `adsync_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountKobo,
      reference,
      callback_url: callbackUrl,
      metadata: {
        org_id: orgId,
        plan_id: planId,
        plan_interval: "monthly",
      },
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Paystack init failed");

  return {
    authorization_url: data.data.authorization_url as string,
    reference: data.data.reference as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify a Paystack transaction by reference (used on callback page)
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyTransaction(reference: string) {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Missing Paystack Secret Key");

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    },
  );

  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Verification failed");

  return data.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get authenticated user's email + orgId (called from client components)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPaymentContext(): Promise<{
  email: string;
  orgId: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  return { email: user.email, orgId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase a credit pack (one-off top-up, no plan change)
// ─────────────────────────────────────────────────────────────────────────────
export async function initializeCreditPackPurchase(
  packId: string, // 'small' | 'medium' | 'large'
  callbackUrl: string,
): Promise<{ authorization_url: string; reference: string }> {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Missing Paystack Secret Key");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Unauthorized");

  // Resolve org
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  // Fetch pack details from DB
  const { data: pack, error: packError } = await supabase
    .from("credit_packs")
    .select("id, name, credits, price_ngn")
    .eq(
      "name",
      packId === "small"
        ? "Small Pack"
        : packId === "medium"
          ? "Medium Pack"
          : "Large Pack",
    )
    .eq("is_active", true)
    .single();

  if (packError || !pack) throw new Error(`Credit pack '${packId}' not found`);

  const amountKobo = pack.price_ngn * 100;
  const reference = `adsync_pack_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: amountKobo,
      reference,
      callback_url: callbackUrl,
      metadata: {
        org_id: orgId,
        pack_id: pack.id,
        pack_name: pack.name,
        credits: pack.credits,
        tx_type: "credit_pack", // Webhook uses this to branch logic
      },
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Paystack init failed");

  return {
    authorization_url: data.data.authorization_url as string,
    reference: data.data.reference as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Grant free trial credits to a new user (called during onboarding).
// Credits are user-scoped; orgId is kept for audit trail only.
// ─────────────────────────────────────────────────────────────────────────────
export async function grantFreeTrialCredits(
  userId: string,
  orgId: string,
): Promise<void> {
  const supabase = await createClient();

  // Use RPC so the credit transaction is atomic
  const { error } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_credits: 50,
    p_reason: "free_trial",
    p_org_id: orgId,
  });

  if (error) {
    console.error("Failed to grant trial credits:", error);
    // Non-fatal – log but don't throw, UI can still work
  } else {
    // Record a ₦0 invoice for the free trial so it shows in billing history
    await supabase.from("transactions").insert({
      organization_id: orgId,
      amount_cents: 0,
      currency: "NGN",
      status: "success",
      type: "subscription_payment",
      description: "Free Trial (14 Days)",
      provider_reference: `trial_${Date.now()}`,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get transaction history for invoices page
// ─────────────────────────────────────────────────────────────────────────────
export interface Invoice {
  id: string;
  date: string;
  type: "subscription" | "credit_pack";
  description: string;
  amount_display: string;
  amount_kobo: number;
  status: string;
  reference: string | null;
}

export async function getInvoices(limit = 50): Promise<Invoice[]> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  const { data, error } = await supabase
    .from("transactions")
    .select("id, created_at, type, description, amount_cents, status, provider_reference")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch transactions:", error);
    throw error;
  }

  return (data || []).map((tx) => ({
    id: tx.id,
    date: tx.created_at ?? new Date().toISOString(),
    type: (tx.type === "credit_pack_purchase" ? "credit_pack" : "subscription") as Invoice["type"],
    description: tx.description || (tx.type === "credit_pack_purchase" ? "Credit Pack" : "Subscription Payment"),
    amount_display: `₦${((tx.amount_cents || 0) / 100).toLocaleString()}`,
    amount_kobo: tx.amount_cents || 0,
    status: tx.status || "success",
    reference: tx.provider_reference,
  }));
}
