"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function updateOrganization(orgId: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const name = formData.get("orgName") as string;
  const industry = formData.get("industry") as string;
  const selling_method = formData.get("sellingMethod") as string;
  const price_tier = formData.get("priceTier") as string;
  const customer_gender = formData.get("customerGender") as string;
  const business_description = formData.get("businessDescription") as string;
  const city = (formData.get("city") as string) || null;
  const state = (formData.get("state") as string) || null;
  const business_phone = (formData.get("businessPhone") as string) || null;
  const business_website = (formData.get("businessWebsite") as string) || null;
  const whatsapp_number = (formData.get("whatsappNumber") as string) || null;

  const logo_url = formData.get("logoUrl") as string | null;

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      industry,
      selling_method,
      price_tier,
      customer_gender,
      business_description,
      city,
      state,
      business_phone,
      business_website,
      whatsapp_number,
      ...(logo_url !== null && { logo_url }),
    })
    .eq("id", orgId);

  if (error) {
    console.error("Failed to update organization:", error);
    return { error: "Failed to update organization details" };
  }

  revalidateTag(`org-${orgId}`, "hours");
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
  const phone = formData.get("phone") as string;
  const countryCode = formData.get("countryCode") as string;
  const job = formData.get("job") as string;
  const language = formData.get("language") as string;

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      phone,
      country_code: countryCode,
      job,
      language,
    },
  });

  if (error) {
    console.error("Failed to update profile:", error);
    return { error: "Failed to update profile" };
  }

  revalidatePath("/(authenticated)/(main)/settings/general", "page");
  return { success: true };
}

export async function updateOrganizationLogo(orgId: string, logoUrl: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: logoUrl })
    .eq("id", orgId);

  if (error) {
    console.error("Failed to update organization logo:", error);
    return { error: "Failed to update logo" };
  }

  revalidateTag(`org-${orgId}`, "hours");
  revalidatePath("/(authenticated)/(main)/settings/business", "page");
  return { success: true };
}

export async function updatePassword(password: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error("Failed to update password:", error);
    return { error: error.message || "Failed to update password" };
  }

  return { success: true };
}
