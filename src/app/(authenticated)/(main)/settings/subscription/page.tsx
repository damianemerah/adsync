import { connection } from "next/server";
import { Suspense } from "react";
import { BillingContent } from "@/components/subscription/billing-content";
import { BillingSkeleton } from "@/components/subscription/billing-skeleton";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getSubscriptionServer } from "@/actions/subscription";
import { getActiveOrgId } from "@/lib/active-org";

export default async function BillingPage() {
  // Explicitly opts this page into dynamic rendering.
  // Required for all pages in (authenticated) that live inside the
  // (main) layout — which accesses cookies() and auth.getUser().
  await connection();
  
  const queryClient = new QueryClient();
  const activeOrgId = await getActiveOrgId();

  await queryClient.prefetchQuery({
    queryKey: ["subscription", activeOrgId],
    queryFn: async () => {
      return await getSubscriptionServer();
    },
  });

  return (
    <div className="space-y-6">
      <Suspense fallback={<BillingSkeleton />}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <BillingContent />
        </HydrationBoundary>
      </Suspense>
    </div>
  );
}
