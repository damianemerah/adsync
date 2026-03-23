"use server";

/**
 * credits.ts — Central credit guard for all AI actions.
 *
 * Credits are USER-scoped (not org-scoped). All orgs owned by a user share
 * one credit pool stored in `users.credits_balance`.
 *
 * Usage pattern in every server action:
 *
 *   const { orgId, userId } = await requireCredits(supabase, CREDIT_COSTS.IMAGE_GEN_PRO);
 *   // ... call AI model ...
 *   await spendCredits(supabase, orgId, userId, CREDIT_COSTS.IMAGE_GEN_PRO, "image_gen_flux_pro", creativeId, "fal-ai/flux-2-pro");
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { getActiveOrgId } from "@/lib/active-org";

type Supabase = SupabaseClient<Database>;

// ─────────────────────────────────────────────────────────────────────────────
// requireCredits
//
// Authenticates the caller, resolves their orgId/userId, and verifies they
// have enough credits AND an active subscription before any AI call is made.
// Throws with a user-facing message on any failure.
// Returns { orgId, userId } so the caller can pass them to spendCredits.
// ─────────────────────────────────────────────────────────────────────────────
export async function requireCredits(
  supabase: Supabase,
  cost: number,
): Promise<{ orgId: string; userId: string }> {
  // 1. Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) throw new Error("No organization found");

  // 2. Resolve org subscription state
  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .select(
      `organization_id,
       organizations (
         id,
         subscription_status,
         subscription_expires_at
       )`,
    )
    .eq("user_id", user.id)
    .eq("organization_id", activeOrgId)
    .single();

  if (memberError || !member) throw new Error("No organization found");

  // @ts-ignore — nested join typing
  const org = member.organizations as {
    id: string;
    subscription_status: string;
    subscription_expires_at: string | null;
  };

  // 3. Subscription gate — block if not active or trialing
  const allowedStatuses = ["active", "trialing"];
  if (!allowedStatuses.includes(org.subscription_status)) {
    throw new Error(
      "Your subscription is inactive. Please renew to continue generating.",
    );
  }

  if (
    org.subscription_status === "trialing" &&
    org.subscription_expires_at &&
    new Date(org.subscription_expires_at).getTime() < Date.now()
  ) {
    throw new Error(
      "Your free trial has expired. Please upgrade to continue generating.",
    );
  }

  // 4. Credit gate — check USER-level balance (shared across all orgs)
  if (cost > 0) {
    const { data: userRecord } = await supabase
      .from("users")
      .select("credits_balance")
      .eq("id", user.id)
      .single();

    const balance = userRecord?.credits_balance ?? 0;
    if (balance < cost) {
      throw new Error(
        `Insufficient credits. You need ${cost} credit${cost !== 1 ? "s" : ""} but have ${balance}. Top up or upgrade your plan.`,
      );
    }
  }

  return { orgId: org.id, userId: user.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// spendCredits
//
// Atomically deducts credits via the DB RPC after a successful AI call.
// Safe to call even when cost = 0 (free actions) — it will skip the deduction.
// Returns the new balance, or null if free.
// ─────────────────────────────────────────────────────────────────────────────
export async function spendCredits(
  supabase: Supabase,
  orgId: string,
  userId: string,
  cost: number,
  reason: string,
  referenceId?: string | null,
  modelUsed?: string | null,
): Promise<number | null> {
  // Free actions — nothing to deduct
  if (cost === 0) return null;

  const { data, error } = await supabase.rpc("deduct_credits", {
    p_org_id: orgId,
    p_user_id: userId,
    p_credits: cost,
    p_reason: reason,
    p_reference: referenceId ?? undefined,
    p_model: modelUsed ?? undefined,
  });

  if (error) {
    // Log but don't throw — the AI call already happened, don't fail the user
    console.error("[spendCredits] RPC error:", error);
    return null;
  }

  const result = data as {
    success: boolean;
    balance_after?: number;
    error?: string;
  };

  if (!result.success) {
    // This should not normally happen (we checked upfront), but log it
    console.error("[spendCredits] Deduction failed:", result.error);
    return null;
  }

  return result.balance_after ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getUserCredits
//
// Lightweight helper to read the user's current credit balance.
// Credits are user-scoped — all orgs owned by the user share one pool.
// Used by hooks / non-gated reads.
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserCredits(
  supabase: Supabase,
  userId: string,
): Promise<{ balance: number; quota: number }> {
  const { data, error } = await supabase
    .from("users")
    .select("credits_balance, plan_credits_quota")
    .eq("id", userId)
    .single();

  if (error || !data) return { balance: 0, quota: 0 };
  return {
    balance: data.credits_balance ?? 0,
    quota: data.plan_credits_quota ?? 0,
  };
}
