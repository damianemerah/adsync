import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { BusinessTab } from "../business-tab";

export default async function BusinessSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ meta_session?: string }>;
}) {
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
           subscription_tier, created_at, pixel_token, logo_url`,
        )
        .eq("id", activeOrgId)
        .single()
    : { data: null };

  const { meta_session } = await searchParams;

  return (
    <BusinessTab
      organization={organization}
      activeOrgId={activeOrgId}
      metaSessionId={meta_session}
    />
  );
}
