import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { VerificationBanner } from "@/components/dashboard/verification-banner";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { SubscriptionGate } from "@/components/dashboard/subscription-gate";
import { StoreHydrator } from "@/components/dashboard/store-hydrator";
import { getActiveOrgId } from "@/lib/active-org";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/providers/sidebar-provider";
import { ActiveOrgProvider } from "@/components/providers/active-org-provider";
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

  // Resolve the active org from cookie (server-side)
  const activeOrgId = await getActiveOrgId();

  // 2. Check Organization Membership (for the active org, or any org if none is active)
  let membershipQuery = supabase
    .from("organization_members")
    .select(
      "organization_id, organizations(subscription_status, subscription_expires_at)",
    )
    .eq("user_id", user.id)
    .limit(1);

  if (activeOrgId) {
    membershipQuery = membershipQuery.eq("organization_id", activeOrgId);
  }

  const { data } = await membershipQuery;

  console.log("Membership data🔥🔥", data);
  const membership = data?.[0];

  // 🔴 LOCK: If no organization at all, force them to onboarding
  if (!membership) {
    console.log("No membership found2");
    redirect("/onboarding");
  }

  let subStatus =
    (membership?.organizations as any)?.subscription_status || "expired";

  const expiresAt = (membership?.organizations as any)?.subscription_expires_at;
  if (subStatus === "trialing" && expiresAt) {
    if (new Date(expiresAt).getTime() < Date.now()) {
      subStatus = "expired";
    }
  }

  // 🟢 PASS: Render the dashboard with the Gate wrapper
  return (
    <SidebarProvider>
      <ActiveOrgProvider activeOrgId={activeOrgId}>
        <div className="flex min-h-screen bg-slate-50 font-sans">
          <Sidebar activeOrgId={activeOrgId} />
          <ContentWrapper>
            {/* Banners */}
            <VerificationBanner />
            <TrialBanner />
            <StoreHydrator userId={user.id} />

            {/* The Gate handles the blocking logic */}
            <SubscriptionGate status={subStatus}>{children}</SubscriptionGate>
          </ContentWrapper>
        </div>
      </ActiveOrgProvider>
    </SidebarProvider>
  );
}
