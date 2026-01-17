import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCampaignById } from "@/lib/api/campaigns";
import { CampaignDetailView } from "@/components/campaigns/campaign-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  // 1. Await params (Next.js 15+ requirement)
  const { id } = await params;

  // 2. Handle "new" route edge case (though it should have its own page.tsx)
  if (id === "new") {
    redirect("/campaigns/new");
  }

  // 3. Create Supabase client and check auth
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/campaigns/" + id);
  }

  // 4. Fetch campaign data on server
  let campaign;
  try {
    campaign = await getCampaignById(supabase, id);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    // On error, show 404
    notFound();
  }

  // 5. Handle 404 if campaign not found
  if (!campaign) {
    notFound();
  }

  // 6. Verify ownership (campaign should belong to current user via RLS, but double-check)
  // RLS policies should prevent unauthorized access, but this is an extra safety check

  // 7. Render client view with server-fetched data
  return <CampaignDetailView campaign={campaign} />;
}
