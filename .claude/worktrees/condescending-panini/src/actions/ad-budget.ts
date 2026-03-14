"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import {
  createCustomer,
  createUsdAccount,
  createVirtualCard,
  fundUsdAccount,
  getCardDetails as getSudoCardDetails,
  getAccountBalance,
  freezeCard,
  unfreezeCard,
  type SudoCardDetails,
} from "@/lib/sudo";
import { PLATFORM_FEE_RATE } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────
export interface AdBudgetWallet {
  id: string;
  organization_id: string;
  balance_ngn: number; // in kobo
  reserved_ngn: number; // in kobo
  created_at: string;
  updated_at: string;
}

export interface AdBudgetTransaction {
  id: string;
  organization_id: string;
  type: "topup" | "card_load" | "spend" | "refund" | "reserve" | "release";
  amount_ngn: number; // in kobo
  amount_usd: number | null;
  fx_rate: number | null;
  balance_after: number; // in kobo
  reference: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  fee_amount_ngn: number; // platform fee in kobo
  base_amount_ngn: number; // amount credited to wallet in kobo
  created_at: string;
}

export interface VirtualCard {
  id: string;
  organization_id: string;
  provider: string;
  provider_card_id: string;
  provider_customer_id: string | null;
  provider_account_id: string | null;
  last_four: string | null;
  expiry_month: string | null;
  expiry_year: string | null;
  status: "active" | "frozen" | "terminated";
  meta_account_id: string | null;
  balance_usd: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get the current ad budget wallet for the active organization
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdBudgetWallet(): Promise<AdBudgetWallet | null> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  const { data, error } = await supabase
    .from("ad_budget_wallets")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (acceptable for new orgs)
    console.error("Failed to fetch ad budget wallet:", error);
    throw error;
  }

  return data as AdBudgetWallet | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get ad budget transaction history for the active organization
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdBudgetTransactions(
  limit = 50,
): Promise<AdBudgetTransaction[]> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  const { data, error } = await supabase
    .from("ad_budget_transactions")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch ad budget transactions:", error);
    throw error;
  }

  return (data || []) as unknown as AdBudgetTransaction[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Get virtual card for the active organization
// ─────────────────────────────────────────────────────────────────────────────
export async function getVirtualCard(): Promise<VirtualCard | null> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  const { data, error } = await supabase
    .from("virtual_cards")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Failed to fetch virtual card:", error);
    throw error;
  }

  return data as VirtualCard | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit ad budget (called by Paystack webhook)
// This is NOT called directly by the client
// ─────────────────────────────────────────────────────────────────────────────
export async function creditAdBudget({
  organizationId,
  totalAmountKobo, // total amount charged by Paystack (base + fee), in kobo
  baseAmountKobo, // amount to credit to wallet, in kobo
  feeAmountKobo, // platform fee collected, in kobo
  paystackReference,
}: {
  organizationId: string;
  totalAmountKobo: number;
  baseAmountKobo: number;
  feeAmountKobo: number;
  paystackReference: string;
}): Promise<{ success: boolean; message: string; newBalance?: number }> {
  const supabase = await createClient();

  // ────────────────────────────────────────────────────────────────────────
  // 1. Idempotency check: Has this Paystack reference been processed before?
  // ────────────────────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from("ad_budget_transactions")
    .select("id")
    .eq("reference", paystackReference)
    .eq("type", "topup")
    .single();

  if (existing) {
    console.log(`Paystack reference ${paystackReference} already processed`);
    return { success: true, message: "Already processed" };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 2. Get current wallet balance (or initialize if missing)
  // ────────────────────────────────────────────────────────────────────────
  const { data: wallet } = await supabase
    .from("ad_budget_wallets")
    .select("balance_ngn")
    .eq("organization_id", organizationId)
    .single();

  const currentBalance = wallet?.balance_ngn || 0;
  // Only credit the BASE amount (excluding the platform fee)
  const newBalance = currentBalance + baseAmountKobo;

  // ────────────────────────────────────────────────────────────────────────
  // 3. Upsert wallet with new balance
  // ────────────────────────────────────────────────────────────────────────
  const { error: walletError } = await supabase
    .from("ad_budget_wallets")
    .upsert(
      {
        organization_id: organizationId,
        balance_ngn: newBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );

  if (walletError) {
    console.error("Failed to update ad budget wallet:", walletError);
    throw walletError;
  }

  // ────────────────────────────────────────────────────────────────────────
  // 4. Record transaction in audit log (with fee breakdown)
  // ────────────────────────────────────────────────────────────────────────
  const { error: txError } = await supabase
    .from("ad_budget_transactions")
    .insert({
      organization_id: organizationId,
      type: "topup",
      amount_ngn: baseAmountKobo,
      base_amount_ngn: baseAmountKobo,
      fee_amount_ngn: feeAmountKobo,
      balance_after: newBalance,
      reference: paystackReference,
      description: `Ad budget top-up via Paystack (₦${(baseAmountKobo / 100).toLocaleString()} + ₦${(feeAmountKobo / 100).toLocaleString()} fee)`,
      metadata: {
        total_charged_kobo: totalAmountKobo,
        base_amount_kobo: baseAmountKobo,
        fee_amount_kobo: feeAmountKobo,
        fee_rate: PLATFORM_FEE_RATE,
      },
    });

  if (txError) {
    console.error("Failed to record ad budget transaction:", txError);
    throw txError;
  }

  console.log(
    `✅ Credited ₦${(baseAmountKobo / 100).toLocaleString()} to org ${organizationId} (fee: ₦${(feeAmountKobo / 100).toLocaleString()}). New balance: ₦${(newBalance / 100).toLocaleString()}`,
  );

  return {
    success: true,
    message: "Ad budget credited successfully",
    newBalance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Paystack transaction for ad budget top-up
// ─────────────────────────────────────────────────────────────────────────────
export async function initializeAdBudgetTopup(
  amountNgn: number, // base amount in Naira (what user selected)
  callbackUrl: string,
): Promise<{
  authorization_url: string;
  reference: string;
  feeNgn: number;
  totalNgn: number;
}> {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET_KEY) throw new Error("Missing Paystack Secret Key");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  // ── Calculate fee (added on top) ───────────────────────────────────────
  const feeNgn = Math.round(amountNgn * PLATFORM_FEE_RATE); // e.g. ₦50,000 × 5% = ₦2,500
  const totalNgn = amountNgn + feeNgn; // ₦52,500
  const totalKobo = totalNgn * 100;
  const baseKobo = amountNgn * 100;
  const feeKobo = feeNgn * 100;

  const reference = `adsync_adbgt_${Date.now()}_${Math.floor(Math.random() * 9999)}`;

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: totalKobo, // Charge the FULL amount (base + fee)
      reference,
      callback_url: callbackUrl,
      metadata: {
        org_id: orgId,
        payment_type: "ad_budget_topup", // CRITICAL: Webhook uses this to route
        base_amount_kobo: baseKobo, // What gets credited to wallet
        fee_amount_kobo: feeKobo, // Platform fee (our profit)
        total_amount_kobo: totalKobo, // What Paystack charges
        fee_rate: PLATFORM_FEE_RATE,
        topup_amount_ngn: amountNgn, // Original user selection
      },
    }),
  });

  const data = await res.json();
  if (!data.status) {
    console.error("Paystack init failed:", data);
    throw new Error(data.message || "Paystack initialization failed");
  }

  return {
    authorization_url: data.data.authorization_url as string,
    reference: data.data.reference as string,
    feeNgn,
    totalNgn,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reserve ad budget for a campaign launch
// Returns true if sufficient balance, false otherwise
// ─────────────────────────────────────────────────────────────────────────────
export async function reserveAdBudget(
  campaignId: string,
  amountNgn: number, // in kobo
): Promise<boolean> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  const { data, error } = await supabase.rpc("reserve_ad_budget", {
    p_org_id: orgId,
    p_amount_ngn: amountNgn,
    p_campaign_id: campaignId,
  });

  if (error) {
    console.error("Failed to reserve ad budget:", error);
    throw error;
  }

  return data as boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create virtual USD card for the organization (via Sudo Africa)
// This is called when an org first tops up their ad budget
// ─────────────────────────────────────────────────────────────────────────────
export async function createOrganizationVirtualCard(): Promise<{
  success: boolean;
  card?: VirtualCard;
  cardDetails?: {
    pan: string;
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
  };
  message: string;
}> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  // ────────────────────────────────────────────────────────────────────────
  // 1. Check if card already exists
  // ────────────────────────────────────────────────────────────────────────
  const { data: existingCard } = await supabase
    .from("virtual_cards")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (existingCard) {
    return {
      success: true,
      card: existingCard as VirtualCard,
      message: "Virtual card already exists",
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // 2. Get organization details
  // ────────────────────────────────────────────────────────────────────────
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  if (!org) throw new Error("Organization not found");

  // Get user details for contact info
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Unauthorized");

  // ────────────────────────────────────────────────────────────────────────
  // 3. Create Sudo customer (cardholder)
  // ────────────────────────────────────────────────────────────────────────
  console.log(`Creating Sudo customer for org ${orgId}`);

  const customer = await createCustomer(
    orgId,
    org.name,
    user.email,
    user.phone || "+2348000000000", // TODO: Collect phone during onboarding
    {
      line1: "1 Sellam Street", // TODO: Collect address during onboarding
      city: "Lagos",
      state: "Lagos",
      postalCode: "100001",
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // 4. Create USD settlement account
  // ────────────────────────────────────────────────────────────────────────
  console.log(`Creating USD account for customer ${customer.id}`);

  const account = await createUsdAccount(customer.id);

  // ────────────────────────────────────────────────────────────────────────
  // 5. Create virtual USD card
  // ────────────────────────────────────────────────────────────────────────
  console.log(`Creating virtual USD card for customer ${customer.id}`);

  const sudoCard: SudoCardDetails = await createVirtualCard(
    customer.id,
    account.id,
    org.name,
    {
      line1: "1 Sellam Street",
      city: "Lagos",
      state: "Lagos",
      postalCode: "100001",
    },
  );

  // ────────────────────────────────────────────────────────────────────────
  // 6. Store card in database
  // ────────────────────────────────────────────────────────────────────────
  const { data: card, error: cardError } = await supabase
    .from("virtual_cards")
    .insert({
      organization_id: orgId,
      provider: "sudo",
      provider_card_id: sudoCard.id,
      provider_customer_id: customer.id,
      provider_account_id: account.id,
      last_four: sudoCard.last4,
      expiry_month: sudoCard.expiryMonth,
      expiry_year: sudoCard.expiryYear,
      status: "active",
      balance_usd: 0,
    })
    .select()
    .single();

  if (cardError) {
    console.error("Failed to store virtual card:", cardError);
    throw cardError;
  }

  console.log(
    `✅ Created and stored virtual USD card ${sudoCard.id} (ending in ${sudoCard.last4}) for org ${orgId}`,
  );

  // ────────────────────────────────────────────────────────────────────────
  // 7. Return card details (ONLY returned once on creation!)
  // ────────────────────────────────────────────────────────────────────────
  return {
    success: true,
    card: card as VirtualCard,
    cardDetails: {
      pan: sudoCard.pan,
      cvv: sudoCard.cvv,
      expiryMonth: sudoCard.expiryMonth,
      expiryYear: sudoCard.expiryYear,
    },
    message: "Virtual card created successfully",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fund the organization's virtual card with USD (convert from Naira balance)
// Called after Paystack top-up completes
// ─────────────────────────────────────────────────────────────────────────────
export async function fundVirtualCard(
  amountNgn: number, // Amount in Naira (NOT kobo)
): Promise<{
  success: boolean;
  amountUsd: number;
  fxRate: number;
  message: string;
}> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  // ────────────────────────────────────────────────────────────────────────
  // 1. Get virtual card
  // ────────────────────────────────────────────────────────────────────────
  const { data: card } = await supabase
    .from("virtual_cards")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (!card) {
    throw new Error("No virtual card found. Create one first.");
  }

  if (!card.provider_account_id) {
    throw new Error("Virtual card missing account ID");
  }

  // ────────────────────────────────────────────────────────────────────────
  // 2. Check wallet balance
  // ────────────────────────────────────────────────────────────────────────
  const { data: wallet } = await supabase
    .from("ad_budget_wallets")
    .select("balance_ngn, reserved_ngn")
    .eq("organization_id", orgId)
    .single();

  const availableBalance =
    (wallet?.balance_ngn || 0) - (wallet?.reserved_ngn || 0);
  const amountKobo = amountNgn * 100;

  if (availableBalance < amountKobo) {
    throw new Error(
      `Insufficient balance. Available: ₦${(availableBalance / 100).toLocaleString()}, Required: ₦${amountNgn.toLocaleString()}`,
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // 3. Fund USD account via Sudo
  // ────────────────────────────────────────────────────────────────────────
  console.log(
    `Funding USD account ${card.provider_account_id} with ₦${amountNgn}`,
  );

  const fundingResult = await fundUsdAccount(
    card.provider_account_id,
    amountNgn,
  );

  // ────────────────────────────────────────────────────────────────────────
  // 4. Deduct from Naira wallet
  // ────────────────────────────────────────────────────────────────────────
  const newBalance = (wallet?.balance_ngn || 0) - amountKobo;

  await supabase
    .from("ad_budget_wallets")
    .update({
      balance_ngn: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId);

  // ────────────────────────────────────────────────────────────────────────
  // 5. Record transaction
  // ────────────────────────────────────────────────────────────────────────
  await supabase.from("ad_budget_transactions").insert({
    organization_id: orgId,
    type: "card_load",
    amount_ngn: -amountKobo, // Negative = debit from Naira wallet
    amount_usd: fundingResult.amountUsd,
    fx_rate: fundingResult.fxRate,
    balance_after: newBalance,
    reference: fundingResult.transactionId,
    description: `Loaded $${fundingResult.amountUsd} to virtual card (₦${amountNgn} @ ${fundingResult.fxRate})`,
    metadata: {
      card_id: card.id,
      sudo_account_id: card.provider_account_id,
      sudo_transaction_id: fundingResult.transactionId,
    },
  });

  // ────────────────────────────────────────────────────────────────────────
  // 6. Update card balance
  // ────────────────────────────────────────────────────────────────────────
  const accountBalance = await getAccountBalance(
    card.provider_account_id,
  ).catch(() => ({ balance: fundingResult.amountUsd, currency: "USD" }));

  await supabase
    .from("virtual_cards")
    .update({
      balance_usd: accountBalance?.balance || fundingResult.amountUsd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", card.id);

  console.log(
    `✅ Funded card ${card.id}: ₦${amountNgn} → $${fundingResult.amountUsd} (rate: ${fundingResult.fxRate})`,
  );

  return {
    success: true,
    amountUsd: fundingResult.amountUsd,
    fxRate: fundingResult.fxRate,
    message: `Successfully loaded $${fundingResult.amountUsd} to your card`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get virtual card details with current balance
// ─────────────────────────────────────────────────────────────────────────────
export async function getVirtualCardWithBalance(): Promise<
  (VirtualCard & { live_balance_usd?: number }) | null
> {
  const card = await getVirtualCard();
  if (!card) return null;

  // Fetch live balance from Sudo
  if (card.provider_account_id) {
    try {
      const { balance } = await getAccountBalance(card.provider_account_id);
      return { ...card, live_balance_usd: balance };
    } catch (error) {
      console.error("Failed to fetch live balance:", error);
    }
  }

  return card;
}

// ─────────────────────────────────────────────────────────────────────────────
// Freeze the organization's virtual card
// ─────────────────────────────────────────────────────────────────────────────
export async function freezeOrganizationCard(): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  const { data: card } = await supabase
    .from("virtual_cards")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (!card) throw new Error("No virtual card found");

  await freezeCard(card.provider_card_id);

  await supabase
    .from("virtual_cards")
    .update({ status: "frozen", updated_at: new Date().toISOString() })
    .eq("id", card.id);

  return { success: true, message: "Card frozen successfully" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unfreeze the organization's virtual card
// ─────────────────────────────────────────────────────────────────────────────
export async function unfreezeOrganizationCard(): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  const { data: card } = await supabase
    .from("virtual_cards")
    .select("*")
    .eq("organization_id", orgId)
    .single();

  if (!card) throw new Error("No virtual card found");

  await unfreezeCard(card.provider_card_id);

  await supabase
    .from("virtual_cards")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", card.id);

  return { success: true, message: "Card unfrozen successfully" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified invoice/transaction history (merges subscription + ad budget)
// Powers the Settings > Invoices page
// ─────────────────────────────────────────────────────────────────────────────
export interface UnifiedInvoice {
  id: string;
  date: string;
  type: "subscription" | "credit_pack" | "ad_budget_topup" | "card_load";
  description: string;
  amount_display: string; // formatted for display
  amount_kobo: number;
  fee_display: string | null;
  status: string;
  reference: string | null;
}

export async function getUnifiedInvoices(
  limit = 50,
): Promise<UnifiedInvoice[]> {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();

  if (!orgId) throw new Error("No organization found");

  // 1. Fetch subscription/credit pack transactions
  const { data: subTxns } = await supabase
    .from("transactions")
    .select(
      "id, created_at, type, description, amount_cents, status, provider_reference",
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // 2. Fetch ad budget transactions
  const { data: adTxns } = await supabase
    .from("ad_budget_transactions")
    .select(
      "id, created_at, type, description, amount_ngn, fee_amount_ngn, reference",
    )
    .eq("organization_id", orgId)
    .in("type", ["topup", "card_load"])
    .order("created_at", { ascending: false })
    .limit(limit);

  // 3. Normalize subscription transactions
  const normalized: UnifiedInvoice[] = (subTxns || []).map((tx) => ({
    id: tx.id,
    date: tx.created_at ?? new Date().toISOString(),
    type: (tx.type === "credit_pack_purchase"
      ? "credit_pack"
      : "subscription") as UnifiedInvoice["type"],
    description:
      tx.description ||
      (tx.type === "credit_pack_purchase"
        ? "Credit Pack"
        : "Subscription Payment"),
    amount_display: `₦${((tx.amount_cents || 0) / 100).toLocaleString()}`,
    amount_kobo: tx.amount_cents || 0,
    fee_display: null,
    status: tx.status || "success",
    reference: tx.provider_reference,
  }));

  // 4. Normalize ad budget transactions
  (adTxns || []).forEach((tx: any) => {
    const feeKobo = tx.fee_amount_ngn || 0;
    normalized.push({
      id: tx.id,
      date: tx.created_at ?? new Date().toISOString(),
      type: tx.type === "card_load" ? "card_load" : "ad_budget_topup",
      description: tx.description || "Ad Budget Top-Up",
      amount_display: `₦${(Math.abs(tx.amount_ngn || 0) / 100).toLocaleString()}`,
      amount_kobo: Math.abs(tx.amount_ngn || 0),
      fee_display: feeKobo > 0 ? `₦${(feeKobo / 100).toLocaleString()}` : null,
      status: "success",
      reference: tx.reference,
    });
  });

  // 5. Sort by date descending
  normalized.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return normalized.slice(0, limit);
}
