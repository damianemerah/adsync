import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubscriptionGate } from "@/components/dashboard/subscription-gate";
import { StoreHydrator } from "@/components/dashboard/store-hydrator";

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

  // 2. Check Organization Membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(subscription_status)")
    .eq("user_id", user.id)
    .maybeSingle();

  // 🔴 LOCK: If no organization, force them to onboarding
  if (!membership) {
    console.log("No membership found");
    redirect("/onboarding");
  }

  const subStatus =
    (membership?.organizations as any)?.subscription_status || "expired";

  // 🟢 PASS: Render without Sidebar/Navbar
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <StoreHydrator userId={user.id} />
      {/* The Gate handles the blocking logic */}
      <SubscriptionGate status={subStatus}>{children}</SubscriptionGate>
    </div>
  );
}
