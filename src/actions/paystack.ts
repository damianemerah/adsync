"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { PLAN_PRICES, PAYSTACK_PLAN_CODES } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/active-org";
import { cacheTag, cacheLife } from "next/cache";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// Initialize a Paystack subscription transaction.
// Attaches a Paystack plan_code so that a successful charge automatically
// creates a recurring Paystack subscription — no manual renewals required.
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
  const reference = `tenzu_sub_${planId}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

  // Attach plan_code if available — this creates a Paystack Subscription object
  // and enables auto-renewal. Paystack handles retry logic and renewal emails.
  const planCode = PAYSTACK_PLAN_CODES[planId];

  const body: Record<string, unknown> = {
    email,
    amount: amountKobo,
    reference,
    callback_url: callbackUrl,
    metadata: {
      org_id: orgId,
      plan_id: planId,
      plan_interval: "monthly",
      tx_type: "subscription",
    },
  };

  // Only attach plan if env var is set — allows dev/test without dashboard setup
  if (planCode) {
    body.plan = planCode;
  }

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
// Initialize a ₦0 card authorization — used for "Add Payment Method" flow.
// Paystack stores the card as a reusable authorization.
// The ₦0 charge is reversed automatically; the customer just saves their card.
// ─────────────────────────────────────────────────────────────────────────────
export async function initializeCardAuthorization(
  callbackUrl: string,
): Promise<{ authorization_url: string; reference: string }> {
  if (!PAYSTACK_SECRET_KEY) throw new Error("Missing Paystack Secret Key");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  const reference = `tenzu_card_auth_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: 1, // ₦0 authorization — reversed automatically
      reference,
      callback_url: callbackUrl,
      metadata: {
        org_id: orgId,
        tx_type: "card_authorization",
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
// Cancel a Paystack subscription by disabling it via the API.
// Updates org status to 'canceled' so gating logic kicks in.
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelPaystackSubscription(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!PAYSTACK_SECRET_KEY) return { success: false, error: "Server config error" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // ── Read sub_code and customer_code from user_subscriptions (user-level) ──
  const { data: userSub, error: subError } = await supabase
    .from("user_subscriptions")
    .select("paystack_sub_code, paystack_customer_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subError || !userSub) return { success: false, error: "Subscription not found" };
  if (!userSub.paystack_sub_code) return { success: false, error: "No active subscription found" };

  // Call Paystack to disable the subscription
  const res = await fetch("https://api.paystack.co/subscription/disable", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: userSub.paystack_sub_code,
      token: userSub.paystack_customer_code ?? "",
    }),
  });

  const data = await res.json();
  if (!data.status) {
    console.error("Paystack cancel failed:", data.message);
    return { success: false, error: data.message || "Cancellation failed" };
  }

  // ── Write canceled status to user_subscriptions ──────────────────────────
  const { error: updateSubError } = await supabase
    .from("user_subscriptions")
    .update({ subscription_status: "canceled", updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (updateSubError) {
    console.error("Failed to update user_subscriptions after cancellation:", updateSubError);
    return { success: false, error: "Subscription canceled on Paystack but DB update failed" };
  }

  // ── Propagate mirror to all orgs this user owns ───────────────────────────
  const { data: ownedOrgs } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("role", "owner");

  if (ownedOrgs && ownedOrgs.length > 0) {
    const orgIds = ownedOrgs.map((m) => m.organization_id).filter((id): id is string => id !== null);
    await supabase
      .from("organizations")
      .update({ subscription_status: "canceled", updated_at: new Date().toISOString() })
      .in("id", orgIds);
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get stored payment method info for display.
// Card fingerprint is now user-level in user_subscriptions.
// ─────────────────────────────────────────────────────────────────────────────
export async function getStoredPaymentMethod(): Promise<{
  last4: string | null;
  cardType: string | null;
  bank: string | null;
  expiry: string | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("paystack_card_last4, paystack_card_type, paystack_card_bank, paystack_card_expiry")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.paystack_card_last4) return null;

  return {
    last4: sub.paystack_card_last4,
    cardType: sub.paystack_card_type,
    bank: sub.paystack_card_bank,
    expiry: sub.paystack_card_expiry,
  };
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
  const reference = `tenzu_pack_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

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
        tx_type: "credit_pack",
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

  const { error } = await supabase.rpc("add_credits", {
    p_user_id: userId,
    p_credits: 50,
    p_reason: "free_trial",
    p_org_id: orgId,
  });

  if (error) {
    console.error("Failed to grant trial credits:", error);
  } else {
    // Record a ₦0 invoice for the free trial so it shows in billing history
    await supabase.from("transactions").insert({
      organization_id: orgId,
      amount_cents: 0,
      currency: "NGN",
      status: "success",
      type: "subscription_payment",
      description: "Free Trial (7 Days)",
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

/**
 * Public entry point — resolves dynamic cookie-based values (orgId, userId)
 * outside the cache boundary, then delegates to the cached helper.
 */
export async function getInvoices(limit = 50): Promise<Invoice[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  return _fetchInvoicesCached(user.id, orgId, limit);
}

/**
 * Private cached helper — receives only plain, serializable args.
 * No cookies(), headers(), or createClient() allowed inside here.
 */
async function _fetchInvoicesCached(
  userId: string,
  orgId: string,
  limit: number,
): Promise<Invoice[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`invoices-${orgId}`);

  // Admin client is safe here: it's a synchronous factory with no cookie access
  const supabase = createAdminClient();

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
    description:
      tx.description ||
      (tx.type === "credit_pack_purchase" ? "Credit Pack" : "Subscription Payment"),
    amount_display: `₦${((tx.amount_cents || 0) / 100).toLocaleString()}`,
    amount_kobo: tx.amount_cents || 0,
    status: tx.status || "success",
    reference: tx.provider_reference,
  }));
}
