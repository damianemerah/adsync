import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInsights, getRecentCampaigns } from "@/lib/api/insights";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardEmptyState } from "@/components/dashboard/empty-state";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardPage() {
  // 1. Create Supabase client and check auth
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // 2. Check if user has ad accounts
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  let hasAccounts = false;
  if (member) {
    const { data: accounts } = await supabase
      .from("ad_accounts")
      .select("id")
      .eq("organization_id", member.organization_id as string)
      .limit(1);

    hasAccounts = !!accounts && accounts.length > 0;
  }

  // 3. Show empty state if no accounts
  if (!hasAccounts) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <div className="flex h-16 items-center justify-between px-8">
              <h1 className="text-xl font-heading font-bold text-slate-900">
                Overview
              </h1>
            </div>
          </header>
          <main className="flex-1 p-8 overflow-y-auto">
            <DashboardEmptyState />
          </main>
        </div>
      </div>
    );
  }

  // 4. Fetch data on server
  const [insights, campaigns] = await Promise.all([
    getInsights(supabase, user.id),
    getRecentCampaigns(supabase, 5),
  ]);

  // 5. Render with server-fetched data
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className=" flex flex-1 flex-col min-w-0">
        <DashboardView
          insights={insights}
          campaigns={campaigns}
          hasAccounts={hasAccounts}
        />
      </div>
    </div>
  );
}
