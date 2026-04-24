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
  function parseBool(v: string | null): boolean | null {
    if (v === "true") return true;
    if (v === "false") return false;
    return null;
  }

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

  // Audience defaults
  const has_physical_location = parseBool(formData.get("hasPhysicalLocation") as string | null);
  const gets_leads_via_website = parseBool(formData.get("getsLeadsViaWebsite") as string | null);
  const sells_online = parseBool(formData.get("sellsOnline") as string | null);
  const books_appointments = parseBool(formData.get("booksAppointments") as string | null);
  const wants_contact_ads = parseBool(formData.get("wantsContactAds") as string | null);

  const defaultLocationsRaw = formData.get("defaultTargetLocations") as string | null;
  const defaultInterestsRaw = formData.get("defaultTargetInterests") as string | null;
  const default_target_locations = defaultLocationsRaw ? JSON.parse(defaultLocationsRaw) : undefined;
  const default_target_interests = defaultInterestsRaw ? JSON.parse(defaultInterestsRaw) : undefined;
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
      has_physical_location,
      gets_leads_via_website,
      sells_online,
      books_appointments,
      wants_contact_ads,
      ...(logo_url !== null && { logo_url }),
      ...(default_target_locations !== undefined && { default_target_locations }),
      ...(default_target_interests !== undefined && { default_target_interests }),
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

  revalidatePath("/(authenticated)/(main)/settings/business", "page");
  return { success: true };
}
