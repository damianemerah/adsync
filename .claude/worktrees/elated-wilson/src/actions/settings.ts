"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateOrganization(orgId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Note: RLS policies should ensure the user is an admin/owner of this org to update it.
  const name = formData.get("orgName") as string;
  const industry = formData.get("industry") as string;
  const selling_method = formData.get("sellingMethod") as string;
  const price_tier = formData.get("priceTier") as string;
  const customer_gender = formData.get("customerGender") as string;
  const business_description = formData.get("businessDescription") as string;

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      industry,
      selling_method,
      price_tier,
      customer_gender,
      business_description,
    })
    .eq("id", orgId);

  if (error) {
    console.error("Failed to update organization:", error);
    return { error: "Failed to update organization details" };
  }

  revalidatePath("/(authenticated)/(main)/settings/business", "page");
  return { success: true };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const fullName = formData.get("fullName") as string;

  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });

  if (error) {
    console.error("Failed to update profile:", error);
    return { error: "Failed to update profile" };
  }

  revalidatePath("/(authenticated)/(main)/settings/general", "page");
  return { success: true };
}
