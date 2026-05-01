import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  // Only redirect to dashboard if they have an org AND a connected ad account.
  // If they have an org but no ad account yet, let them stay to complete step 3.
  if (memberships && memberships.length > 0) {
    const { data: adAccounts } = await supabase
      .from("ad_accounts")
      .select("id")
      .eq("organization_id", memberships[0].organization_id!)
      .is("disconnected_at", null)
      .limit(1);

    if (adAccounts && adAccounts.length > 0) {
      redirect("/dashboard");
    }
  }

  return <>{children}</>;
}
