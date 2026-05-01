import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { OnboardingInner } from "./onboarding-inner";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasExistingOrg = false;
  if (user) {
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);
    hasExistingOrg = (memberships?.length ?? 0) > 0;
  }

  return (
    <Suspense>
      <OnboardingInner hasExistingOrg={hasExistingOrg} />
    </Suspense>
  );
}
