import { unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { BusinessTab } from "../business-tab";

async function getOrganization(orgId: string) {
  "use cache";
  cacheTag(`org-${orgId}`);
  cacheLife("hours");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select(
      `id, name, slug, industry, selling_method, price_tier,
       customer_gender, business_description, created_at,
       pixel_token, logo_url, city, state, business_phone,
       whatsapp_number, business_website`
    )
    .eq("id", orgId)
    .maybeSingle();

  return data;
}

export async function BusinessLoader({
  activeOrgId,
  metaSessionId,
}: {
  activeOrgId: string | null;
  metaSessionId?: string;
}) {
  const organization = activeOrgId ? await getOrganization(activeOrgId) : null;

  return (
    <BusinessTab
      organization={organization}
      activeOrgId={activeOrgId}
      metaSessionId={metaSessionId}
    />
  );
}
