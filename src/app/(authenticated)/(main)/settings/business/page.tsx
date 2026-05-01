import { connection } from "next/server";
import { Suspense } from "react";
import { getActiveOrgId } from "@/lib/active-org";
import { BusinessLoader } from "./business-loader";
import BusinessSettingsLoading from "./loading";

export default async function BusinessSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ meta_session?: string }>;
}) {
  await connection();
  
  // Resolve active org from cookie
  const activeOrgId = await getActiveOrgId();
  const { meta_session } = await searchParams;

  return (
    <Suspense fallback={<BusinessSettingsLoading />}>
      <BusinessLoader
        activeOrgId={activeOrgId}
        metaSessionId={meta_session}
      />
    </Suspense>
  );
}
