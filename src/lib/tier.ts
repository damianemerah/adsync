"use server";

/**
 * tier.ts — Server-side tier resolver.
 *
 * Resolves the current user's subscription tier and returns the
 * corresponding TIER_CONFIG. Used by AI services and feature gates
 * to determine model selection, credit costs, and limits.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { TIER_CONFIG, TierId } from "@/lib/constants";

type Supabase = SupabaseClient<Database>;

export type ResolvedTier = {
  tierId: TierId;
  config: (typeof TIER_CONFIG)[TierId];
  orgId: string;
};

/**
 * Resolve a user's subscription tier from their organization membership.
 * Returns the tier ID, full config, and org ID.
 */
export async function resolveTier(
  supabase: Supabase,
  userId: string,
): Promise<ResolvedTier> {
  const [{ data: userSub }, { data: member }] = await Promise.all([
    supabase
      .from("user_subscriptions")
      .select("subscription_tier")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .single(),
  ]);

  if (!member) {
    console.warn("[resolveTier] No org found for user, defaulting to starter");
    return {
      tierId: "starter",
      config: TIER_CONFIG.starter,
      orgId: "",
    };
  }

  const tierId = (userSub?.subscription_tier || "starter") as TierId;
  const config = TIER_CONFIG[tierId] || TIER_CONFIG.starter;

  return { tierId, config, orgId: member.organization_id || "" };
}
