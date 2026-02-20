"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { PLAN_IDS, SUBSCRIPTION_STATUS } from "@/lib/constants";

export async function createOrganization(formData: FormData) {
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
  const selectedPlan = (formData.get("plan") as string) || PLAN_IDS.GROWTH;

  // Generate a simple slug (e.g. "Lagos Fashion" -> "lagos-fashion")
  const slug =
    orgName.toLowerCase().replace(/ /g, "-") +
    "-" +
    Math.floor(Math.random() * 1000);

  const userRole = formData.get("userRole") as string;

  // 2. Create Organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      slug: slug,
      industry, // Now captured
      selling_method: sellingMethod,
      price_tier: priceTier,
      customer_gender: customerGender,
      subscription_tier: selectedPlan,
      subscription_status: SUBSCRIPTION_STATUS.TRIALING,
      subscription_expires_at: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 14 Days Free
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

  // 4. Update User Metadata (Job Role)
  if (userRole) {
    await supabase.auth.updateUser({
      data: { job_role: userRole },
    });
  }

  // 4. Update User Metadata (Optional but helpful)
  // You might want to store the industry in the user or org table if you added that column

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
