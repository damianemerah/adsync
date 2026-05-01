import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import {
  cacheTag,
  cacheLife,
} from "next/cache";
import { SubscriptionGate } from "@/components/dashboard/subscription-gate";
import { StoreHydrator } from "@/components/dashboard/store-hydrator";
import { getActiveOrgId } from "@/lib/active-org";
import { ActiveOrgProvider } from "@/components/providers/active-org-provider";
import { Database } from "@/types/supabase";

// Uses service-role client (no cookies) so this function can be safely cached
// across requests with 'use cache'. The userId is the only input and is passed
// as a parameter — no dynamic data sources are accessed inside.
async function getUserSubStatus(userId: string): Promise<string> {
  "use cache";
  cacheTag(`subscription-${userId}`);
  cacheLife("minutes");
  const supabase = createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: userSub } = await supabase
    .from("user_subscriptions")
    .select("subscription_status, subscription_expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  const status = userSub?.subscription_status ?? "expired";
  if (
    status === "trialing" &&
    userSub?.subscription_expires_at &&
    new Date(userSub.subscription_expires_at).getTime() < Date.now()
  ) {
    return "expired";
  }
  return status;
}

export default async function FullscreenLayout({
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

  const activeOrgId = await getActiveOrgId();

  // 🔴 LOCK: If no organization, force them to onboarding
  if (!activeOrgId) {
    console.log("No membership/org found");
    redirect("/onboarding");
  }

  const subStatus = await getUserSubStatus(user.id);

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
