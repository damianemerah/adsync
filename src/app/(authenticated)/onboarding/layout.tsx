import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if they have *any* organization memberships.
  // We only look for owners/members to confirm they've completed onboarding
  // and have at least one valid workspace.
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  // If they have completed onboarding (i.e. they are part of at least one org),
  // they do not need to be here. Kick them back to dashboard.
  if (memberships && memberships.length > 0) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
