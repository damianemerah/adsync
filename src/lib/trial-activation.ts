"use server";

import { grantFreeTrialCredits } from "@/actions/paystack";
import { SUBSCRIPTION_STATUS, TRIAL_DAYS } from "@/lib/constants";

/**
 * Activates the 7-day trial for a user exactly once — when a Meta ad account
 * is first successfully connected. Idempotent: if user_subscriptions has a
 * non-incomplete status already, this is a no-op (prevents the
 * disconnect/reconnect exploit).
 *
 * Writes authoritative state to user_subscriptions, then propagates mirrors
 * to all orgs owned by this user.
 */
export async function activateTrialIfNeeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  userId: string,
): Promise<void> {
  // Check user_subscriptions — skip if trial already started (non-incomplete)
  const { data: userSub } = await supabase
    .from("user_subscriptions")
    .select("subscription_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (userSub && userSub.subscription_status !== SUBSCRIPTION_STATUS.INCOMPLETE) return;

  const now = new Date().toISOString();
  const trialExpiresAt = new Date(
    Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Write to user_subscriptions (source of truth)
  await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        subscription_status: SUBSCRIPTION_STATUS.TRIALING,
        subscription_expires_at: trialExpiresAt,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );

  // Propagate mirrors to all orgs this user owns
  const { data: ownedOrgs } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("role", "owner");

  if (ownedOrgs && ownedOrgs.length > 0) {
    const orgIds = ownedOrgs.map((m: { organization_id: string }) => m.organization_id);
    await supabase
      .from("organizations")
      .update({
        subscription_status: SUBSCRIPTION_STATUS.TRIALING,
        subscription_expires_at: trialExpiresAt,
        trial_activated_at: now,
        updated_at: now,
      })
      .in("id", orgIds);
  }

  // Keep auth metadata in sync for middleware use
  await supabase.auth.updateUser({ data: { trial_expires_at: trialExpiresAt } });

  grantFreeTrialCredits(userId, orgId).catch((err: unknown) => {
    console.warn("[TrialActivation] grantFreeTrialCredits failed:", err);
  });
}
