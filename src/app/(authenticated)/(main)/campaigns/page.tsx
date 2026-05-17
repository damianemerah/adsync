import { Suspense } from "react";
import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query";
import { getActiveOrgId } from "@/lib/active-org";
import { getCampaigns } from "@/lib/api/campaigns";
import { createClient } from "@/lib/supabase/server";
import { CampaignsContent } from "./campaigns-content";
import CampaignsLoading from "./loading";

export default async function CampaignsPage() {
  const orgId = await getActiveOrgId();
  const queryClient = new QueryClient();

  let hasConnectedAccount = false;

  if (orgId) {
    const supabase = await createClient();
    const [campaigns, { count }] = await Promise.all([
      getCampaigns(orgId),
      supabase
        .from("ad_accounts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .is("disconnected_at", null),
    ]);

    hasConnectedAccount = (count ?? 0) > 0;
    // Seed the first-page query key so useCampaignsList skips the loading
    // flash on first mount. The hook's refetchOnMount:"always" will refresh in
    // the background with the full client-side logic (date filters, sync check).
    queryClient.setQueryData(
      ["campaigns", orgId, 1, 20, "", null, false, null, null, null, null],
      campaigns,
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<CampaignsLoading />}>
        <CampaignsContent hasConnectedAccount={hasConnectedAccount} />
      </Suspense>
    </HydrationBoundary>
  );
}
