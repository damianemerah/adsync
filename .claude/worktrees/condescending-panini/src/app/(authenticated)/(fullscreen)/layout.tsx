import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubscriptionGate } from "@/components/dashboard/subscription-gate";
import { StoreHydrator } from "@/components/dashboard/store-hydrator";
import { getActiveOrgId } from "@/lib/active-org";
import { ActiveOrgProvider } from "@/components/providers/active-org-provider";

export default async function FullscreenLayout({
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

  const activeOrgId = await getActiveOrgId();

  // 🔴 LOCK: If no organization, force them to onboarding
  if (!activeOrgId) {
    console.log("No membership/org found");
    redirect("/onboarding");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("subscription_status")
    .eq("id", activeOrgId)
    .single();

  const subStatus = org?.subscription_status || "expired";

  // 🟢 PASS: Render without Sidebar/Navbar
  return (
    <ActiveOrgProvider activeOrgId={activeOrgId}>
      <div className="min-h-screen bg-slate-50 font-sans">
        <StoreHydrator userId={user.id} />
        {/* The Gate handles the blocking logic */}
        <SubscriptionGate status={subStatus}>{children}</SubscriptionGate>
      </div>
    </ActiveOrgProvider>
  );
}
