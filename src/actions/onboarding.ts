"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { PLAN_IDS, SUBSCRIPTION_STATUS } from "@/lib/constants";
import { grantFreeTrialCredits } from "@/actions/paystack";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";

export async function createOrganization(
  formData: FormData,
  shouldRedirect: boolean = true,
) {
  const supabase = await createClient();

  // 1. Get Current User
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgName = formData.get("orgName") as string;
  const industry = formData.get("industry") as string;
  const sellingMethod = formData.get("sellingMethod") as string;
  const priceTier = formData.get("priceTier") as string;
  const customerGender = formData.get("customerGender") as string;
  const businessDescription = formData.get("businessDescription") as string;
  const selectedPlan = (formData.get("plan") as string) || PLAN_IDS.GROWTH;

  // Generate a simple slug (e.g. "Lagos Fashion" -> "lagos-fashion")
  const slug =
    orgName.toLowerCase().replace(/ /g, "-") +
    "-" +
    Math.floor(Math.random() * 1000);

  const userRole = formData.get("userRole") as string;

  // 1.5 Check if user already owns an organization
  const { data: existingMembers } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .limit(1);

  const existingMember = existingMembers?.[0];

  let activeOrgId: string | null = null;

  if (existingMember?.organization_id) {
    // 2a. Update existing organization (onboarding re-run)
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        name: orgName,
        industry,
        business_description: businessDescription,
        selling_method: sellingMethod,
        price_tier: priceTier,
        customer_gender: customerGender,
        subscription_tier: selectedPlan,
      })
      .eq("id", existingMember.organization_id);

    if (updateError) {
      console.error("Org Update Error:", updateError);
      return { error: "Failed to update organization" };
    }

    activeOrgId = existingMember.organization_id;
  } else {
    // 2b. Create Organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        slug: slug,
        industry,
        business_description: businessDescription,
        selling_method: sellingMethod,
        price_tier: priceTier,
        customer_gender: customerGender,
        subscription_tier: selectedPlan,
        subscription_status: SUBSCRIPTION_STATUS.TRIALING,
        subscription_expires_at: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .select()
      .single();

    if (orgError) {
      console.error("Org Creation Error:", orgError);
      return { error: "Failed to create organization" };
    }

    // 3. Link User to Org (Owner)
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      console.error("Member Link Error:", memberError);
      return { error: "Failed to join organization" };
    }

    // Grant free trial credits (50) to new organizations
    await grantFreeTrialCredits(org.id);

    activeOrgId = org.id;
  }

  // 4. Update User Metadata (Job Role)
  if (userRole) {
    await supabase.auth.updateUser({
      data: { job_role: userRole },
    });
  }

  // 5. Set the active org cookie so the sidebar shows the correct business immediately
  if (activeOrgId) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, activeOrgId, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  revalidatePath("/", "layout");

  if (shouldRedirect) {
    redirect("/dashboard");
  } else {
    return { success: true };
  }
}
