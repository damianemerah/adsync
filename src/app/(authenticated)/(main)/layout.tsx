import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { VerificationBanner } from "@/components/dashboard/verification-banner";
import { SubscriptionGate } from "@/components/dashboard/subscription-gate";
import { StoreHydrator } from "@/components/dashboard/store-hydrator";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/providers/sidebar-provider";
import { ContentWrapper } from "./content-wrapper";

function MainContent({ children }: { children: React.ReactNode }) {
  // Since this component is client-side (via useSidebar), we need to extract it or make this file client.
  // But wait, layout.tsx is server component. We can't use hooks here directly.
  // We need a wrapper component for the client-side margin logic.

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <ContentWrapper>{children}</ContentWrapper>
    </div>
  );
}

export default async function MainLayout({
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
    console.log("No membership found2");
    redirect("/onboarding");
  }

  const subStatus =
    (membership?.organizations as any)?.subscription_status || "expired";

  // 🟢 PASS: Render the dashboard with the Gate wrapper
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <ContentWrapper>
          {/* Banner sits here */}
          <VerificationBanner />
          <StoreHydrator userId={user.id} />

          {/* The Gate handles the blocking logic */}
          <SubscriptionGate status={subStatus}>{children}</SubscriptionGate>
        </ContentWrapper>
      </div>
    </SidebarProvider>
  );
}
