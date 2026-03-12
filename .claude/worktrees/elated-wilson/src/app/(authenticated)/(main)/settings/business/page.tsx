import { createClient } from "@/lib/supabase/server";
import { BusinessTab } from "../business-tab";

export default async function BusinessSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch the user's organization with full details
  const { data: membership } = await supabase
    .from("organization_members")
    .select(
      `
      role,
      organizations (
        id,
        name,
        slug,
        industry,
        selling_method,
        price_tier,
        customer_gender,
        business_description,
        subscription_status,
        subscription_tier,
        created_at
      )
    `,
    )
    .eq("user_id", user.id)
    .single();

  // @ts-ignore – nested join typing
  const organization = membership?.organizations ?? null;

  return <BusinessTab organization={organization} />;
}
