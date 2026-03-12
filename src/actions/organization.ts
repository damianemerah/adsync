"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// ─── Shared: insert org row + owner member + trial credits ────────────────────

async function _insertOrgWithMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    name: string;
    slug: string;
    industry?: string | null;
    businessDescription?: string | null;
    sellingMethod?: string | null;
    priceTier?: string | null;
    customerGender?: string | null;
    subscriptionTier: string;
    userId: string;
  },
): Promise<{ orgId: string | null; error: string | null }> {
  const {
    name,
    slug,
    industry,
    businessDescription,
    sellingMethod,
    priceTier,
    customerGender,
    subscriptionTier,
    userId,
  } = params;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      industry: industry || null,
      business_description: businessDescription || null,
      selling_method: sellingMethod || null,
      price_tier: priceTier || null,
      customer_gender: customerGender || null,
      subscription_tier: subscriptionTier,
      subscription_status: SUBSCRIPTION_STATUS.TRIALING,
      subscription_expires_at: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select()
    .single();

  if (orgError || !org) {
    console.error("Org insert error:", orgError);
    return { orgId: null, error: "Failed to create organization" };
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: userId, role: "owner" });

  if (memberError) {
    console.error("Member link error:", memberError);
    return { orgId: null, error: "Failed to join organization" };
  }

  await grantFreeTrialCredits(org.id);

  return { orgId: org.id, error: null };
}

// ─── Create Organization ──────────────────────────────────────────────────────

/**
 * Unified createOrganization action.
 *
 * `isOnboarding: true` — first-run setup flow:
 *   - Skips the org-count limit check (user is creating their first workspace)
 *   - Updates an existing org if the user re-runs onboarding
 *   - Locks the trial to the Growth plan (best feature exposure)
 *   - Saves the user's job role and sets the active-org cookie
 *   - Optionally redirects to /dashboard
 *
 * `isOnboarding: false` (default) — "Add Business" from settings:
 *   - Enforces the maxOrganizations limit based on the user's highest tier
 *   - Always inserts a new org (Starter trial)
 *   - Switches the active workspace to the newly created org
 */
export async function createOrganization(
  formData: FormData,
  options: { isOnboarding?: boolean; shouldRedirect?: boolean } = {},
): Promise<{ error?: string; success?: boolean }> {
  const { isOnboarding = false, shouldRedirect = false } = options;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (shouldRedirect) redirect("/login");
    return { error: "Not authenticated" };
  }

  const orgName = (formData.get("orgName") as string)?.trim();
  if (!orgName) return { error: "Business name is required" };

  const industry = formData.get("industry") as string;
  const sellingMethod = formData.get("sellingMethod") as string;
  const priceTier = formData.get("priceTier") as string;
  const customerGender = formData.get("customerGender") as string;
  const businessDescription = formData.get("businessDescription") as string;
  const userRole = formData.get("userRole") as string;

  // ── ONBOARDING PATH ─────────────────────────────────────────────────────────
  if (isOnboarding) {
    // Check if user already owns an org (re-run case)
    const { data: ownedMemberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .limit(1);

    const existingOrgId = ownedMemberships?.[0]?.organization_id ?? null;
    let activeOrgId: string | null = null;

    if (existingOrgId) {
      // Re-run: update the existing org's profile fields
      // Trial plan stays Growth — do not override subscription_tier here
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          name: orgName,
          industry: industry || null,
          business_description: businessDescription || null,
          selling_method: sellingMethod || null,
          price_tier: priceTier || null,
          customer_gender: customerGender || null,
        })
        .eq("id", existingOrgId);

      if (updateError) {
        console.error("Org update error:", updateError);
        return { error: "Failed to update organization" };
      }

      activeOrgId = existingOrgId;
    } else {
      // First-time: insert org locked to Growth (best trial experience)
      const slug =
        orgName.toLowerCase().replace(/\s+/g, "-") +
        "-" +
        Math.floor(Math.random() * 10000);

      const { orgId, error } = await _insertOrgWithMember(supabase, {
        name: orgName,
        slug,
        industry,
        businessDescription,
        sellingMethod,
        priceTier,
        customerGender,
        subscriptionTier: PLAN_IDS.GROWTH, // ← Trial always on Growth
        userId: user.id,
      });

      if (error || !orgId) return { error: error ?? "Failed to create organization" };
      activeOrgId = orgId;
    }

    // Persist job role in user metadata
    if (userRole) {
      await supabase.auth.updateUser({ data: { job_role: userRole } });
    }

    // Set active-org cookie so the layout picks up the right workspace
    if (activeOrgId) {
      const cookieStore = await cookies();
      cookieStore.set(ACTIVE_ORG_COOKIE, activeOrgId, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    revalidatePath("/", "layout");

    if (shouldRedirect) redirect("/dashboard");
    return { success: true };
  }

  // ── ADD-BUSINESS PATH (settings) ────────────────────────────────────────────

  // 1. Load all owned orgs to check limits
  const { data: ownedMemberships, error: countError } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(subscription_tier)")
    .eq("user_id", user.id)
    .eq("role", "owner");

  if (countError) {
    console.error("Org count error:", countError);
    return { error: "Failed to check organization limit" };
  }

  // 2. Determine highest tier across all owned orgs
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

  // 3. Enforce limit
  if ((ownedMemberships?.length ?? 0) >= maxOrgs) {
    const tierLabel =
      highestTier.charAt(0).toUpperCase() + highestTier.slice(1);
    return {
      error: `Your ${tierLabel} plan allows ${maxOrgs} business${maxOrgs === 1 ? "" : "es"}. Upgrade to create more.`,
    };
  }

  // 4. Insert new org on Starter trial
  const slug =
    orgName.toLowerCase().replace(/\s+/g, "-") +
    "-" +
    Math.floor(Math.random() * 10000);

  const { orgId: newOrgId, error: insertError } = await _insertOrgWithMember(
    supabase,
    {
      name: orgName,
      slug,
      industry,
      businessDescription,
      sellingMethod,
      priceTier,
      customerGender,
      subscriptionTier: PLAN_IDS.STARTER, // ← New additional orgs start on Starter
      userId: user.id,
    },
  );

  if (insertError || !newOrgId) {
    return { error: insertError ?? "Failed to create business. Please try again." };
  }

  // 5. Switch active workspace to the new org
  await setActiveOrganization(newOrgId);

  revalidatePath("/", "layout");
  return { success: true };
}
