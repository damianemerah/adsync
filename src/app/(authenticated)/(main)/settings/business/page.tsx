import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { BusinessTab } from "../business-tab";

export default async function BusinessSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Resolve active org from cookie
  const activeOrgId = await getActiveOrgId();

  // Fetch the active organization's full details
  const { data: organization } = activeOrgId
    ? await supabase
        .from("organizations")
        .select(
          `id, name, slug, industry, selling_method, price_tier,
           customer_gender, business_description, subscription_status,
           subscription_tier, created_at`,
        )
        .eq("id", activeOrgId)
        .single()
    : { data: null };

  return <BusinessTab organization={organization} activeOrgId={activeOrgId} />;
}
