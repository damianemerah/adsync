"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";
import { nanoid } from "nanoid";
import { grantFreeTrialCredits } from "@/actions/paystack";

// ─── Switch Active Workspace ──────────────────────────────────────────────────

/**
 * Called by the WorkspaceSwitcher component when the user selects a different
 * organization. Sets the `Tenzu_active_org` cookie and revalidates the layout.
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

  // Revalidate layout and all pages to ensure they pick up the new active org
  revalidatePath("/", "layout");
  revalidatePath("/", "page");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBool(v: string | null | undefined): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
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
    phoneNumber?: string | null;
    whatsappNumber?: string | null;
    userId: string;
    grantTrialCredits: boolean;
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
    phoneNumber,
    whatsappNumber,
    userId,
    grantTrialCredits,
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
      business_phone: phoneNumber || null,
      whatsapp_number: whatsappNumber || null,
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

  if (grantTrialCredits) {
    await grantFreeTrialCredits(userId, org.id);
  }

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

  const phoneNumber = formData.get("phone_number") as string;
  const whatsappNumber = formData.get("whatsapp_number") as string;

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
          business_phone: phoneNumber || null,
          whatsapp_number: whatsappNumber || null,
        })
        .eq("id", existingOrgId);

      if (updateError) {
        console.error("Org update error:", updateError);
        return { error: "Failed to update organization" };
      }

      activeOrgId = existingOrgId;
    } else {
      // First-time: insert org locked to Growth tier but in incomplete state.
      // Trial (status, expiry, credits) is activated later when Meta connects.
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
        phoneNumber,
        whatsappNumber,
        userId: user.id,
        grantTrialCredits: false,
      });

      if (error || !orgId)
        return { error: error ?? "Failed to create organization" };
      activeOrgId = orgId;
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

    // Revalidate layout and all pages
    revalidatePath("/", "layout");
    revalidatePath("/", "page");

    if (shouldRedirect) redirect("/dashboard");
    return { success: true };
  }

  // ── ADD-BUSINESS PATH (settings) ────────────────────────────────────────────

  // Insert new org
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
      phoneNumber,
      whatsappNumber,
      userId: user.id,
      grantTrialCredits: false, // New additional orgs don't get free credits again
    },
  );

  if (insertError || !newOrgId) {
    return {
      error: insertError ?? "Failed to create business. Please try again.",
    };
  }

  // 5. Switch active workspace to the new org
  await setActiveOrganization(newOrgId);

  // Revalidate all pages to ensure dashboard and other pages pick up the new org
  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "page");
  return { success: true };
}

// ─── Provision Org Pixel Token ────────────────────────────────────────────────

/**
 * Returns the org's global pixel token, generating one if it doesn't exist yet.
 * Idempotent — safe to call on every settings page load.
 */
export async function provisionOrgPixelToken(
  orgId: string,
): Promise<{ token: string | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { token: null, error: "Not authenticated" };

  // Verify the caller belongs to this org
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!membership) return { token: null, error: "Access denied" };

  // Return existing token if already provisioned
  const { data: org } = await supabase
    .from("organizations")
    .select("pixel_token")
    .eq("id", orgId)
    .single();

  if (org?.pixel_token) return { token: org.pixel_token };

  // Generate and save a new 12-char token
  const token = nanoid(12);
  const { error } = await supabase
    .from("organizations")
    .update({ pixel_token: token })
    .eq("id", orgId);

  if (error) return { token: null, error: error.message };

  revalidatePath("/settings");
  return { token };
}

// ─── Delete Organization ──────────────────────────────────────────────────────

/**
 * Permanently deletes an organization and strictly requires the user to be an owner.
 * All related data (campaigns, ad accounts, etc.) is cascaded on the database level.
 * If the deleted organization was the currently active one, the cookie is cleared.
 */
export async function deleteOrganization(orgId: string): Promise<{
  error?: string;
  success?: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // 1. Verify ownership
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (membershipError || !membership) {
    return { error: "Organization not found or access denied" };
  }

  if (membership.role !== "owner") {
    return { error: "Only the business owner can delete the organization" };
  }

  // 2. Perform deletion
  const { error: deleteError } = await supabase
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (deleteError) {
    console.error("Failed to delete organization:", deleteError);
    return { error: "Failed to delete the business" };
  }

  // 3. Clear active org cookie if it was the deleted one
  const cookieStore = await cookies();
  const activeOrgFromCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  if (activeOrgFromCookie === orgId) {
    cookieStore.delete(ACTIVE_ORG_COOKIE);
  }

  // 4. Force layout refresh
  revalidatePath("/", "layout");

  return { success: true };
}
