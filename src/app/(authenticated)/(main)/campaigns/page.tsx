import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCampaigns } from "@/lib/api/campaigns";
import { CampaignsView } from "@/components/campaigns/campaigns-view";
import { Sidebar } from "@/components/layout/sidebar";

export default async function CampaignsPage() {
  // 1. Create Supabase client and check auth
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/campaigns");
  }

  // 2. Fetch campaigns on server (RLS handles filtering)
  const campaigns = await getCampaigns(supabase);

  // 3. Render with server-fetched data
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <CampaignsView campaigns={campaigns} />
      </div>
    </div>
  );
}
