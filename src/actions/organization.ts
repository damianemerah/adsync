"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";
import {
  TIER_CONFIG,
  TierId,
  SUBSCRIPTION_STATUS,
  PLAN_IDS,
} from "@/lib/constants";
import { grantFreeTrialCredits } from "@/actions/paystack";

// ─── Switch Active Workspace ──────────────────────────────────────────────────

/**
 * Called by the WorkspaceSwitcher component when the user selects a different
 * organization. Sets the `sellam_active_org` cookie and revalidates the layout.
 */
export async function setActiveOrganization(orgId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Validate that the user is actually a member of this org before switching
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!membership) return; // Silently abort if user doesn't belong to this org

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  revalidatePath("/", "layout");
}

// ─── Create New Organization ──────────────────────────────────────────────────

/**
 * Creates a brand-new organization for the current user.
 * Respects maxOrganizations limit based on the user's highest tier.
 * Does NOT overwrite existing organizations.
 */
export async function createOrganization(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const orgName = (formData.get("orgName") as string)?.trim();
  if (!orgName) return { error: "Business name is required" };

  const industry = formData.get("industry") as string;
  const sellingMethod = formData.get("sellingMethod") as string;
  const priceTier = formData.get("priceTier") as string;
  const customerGender = formData.get("customerGender") as string;
  const businessDescription = formData.get("businessDescription") as string;

  // 1. Count all orgs the user owns
  const { data: ownedMemberships, error: countError } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(subscription_tier)")
    .eq("user_id", user.id)
    .eq("role", "owner");

  if (countError) {
    console.error("Org count error:", countError);
    return { error: "Failed to check organization limit" };
  }

  const ownedCount = ownedMemberships?.length ?? 0;

  // 2. Determine the user's highest tier among all their orgs
  const tiers: TierId[] = (ownedMemberships ?? []).map((m) => {
    const org = m.organizations as { subscription_tier: string | null } | null;
    return (org?.subscription_tier || "starter") as TierId;
  });

  const tierOrder: TierId[] = ["starter", "growth", "agency"];
  const highestTier: TierId =
    tiers.length > 0
      ? tiers.reduce((best, t) =>
          tierOrder.indexOf(t) > tierOrder.indexOf(best) ? t : best,
        )
      : "starter";

  const maxOrgs = TIER_CONFIG[highestTier]?.limits?.maxOrganizations ?? 1;

  // 3. Check limit
  if (ownedCount >= maxOrgs) {
    const tierLabel =
      highestTier.charAt(0).toUpperCase() + highestTier.slice(1);
    return {
      error: `Your ${tierLabel} plan allows ${maxOrgs} business${maxOrgs === 1 ? "" : "es"}. Upgrade to create more.`,
    };
  }

  // 4. Generate a unique slug
  const slug =
    orgName.toLowerCase().replace(/\s+/g, "-") +
    "-" +
    Math.floor(Math.random() * 10000);

  // 5. Insert new organization
  const { data: newOrg, error: insertError } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      slug,
      industry: industry || null,
      business_description: businessDescription || null,
      selling_method: sellingMethod || null,
      price_tier: priceTier || null,
      customer_gender: customerGender || null,
      subscription_tier: PLAN_IDS.STARTER,
      subscription_status: SUBSCRIPTION_STATUS.TRIALING,
      subscription_expires_at: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select()
    .single();

  if (insertError || !newOrg) {
    console.error("Org insert error:", insertError);
    return { error: "Failed to create business. Please try again." };
  }

  // 6. Link user as owner
  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: newOrg.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    console.error("Member link error:", memberError);
    return { error: "Failed to complete business setup" };
  }

  // 7. Grant free trial credits
  await grantFreeTrialCredits(newOrg.id);

  // 8. Switch active workspace to the new org
  await setActiveOrganization(newOrg.id);

  revalidatePath("/", "layout");
  return { success: true };
}
