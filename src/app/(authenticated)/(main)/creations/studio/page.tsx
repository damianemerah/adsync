import { getActiveOrgId } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type AspectRatio } from "@/components/creatives/studio/prompt-input";
import { StudioClient } from "./studio-client";
import { type CampaignContext } from "@/lib/ai/context-compiler";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface StudioPageProps {
  searchParams: {
    image?: string;
    edit?: string;
    campaign_id?: string;
    returnTo?: string;
    returnStep?: string;
    prompt?: string;
    aspectRatio?: string;
    draftId?: string;
  };
}

export default async function StudioPage({ searchParams }: StudioPageProps) {
  // Enforce auth and get tenant id for scoping
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const organization_id = await getActiveOrgId();
  if (!organization_id) {
    redirect("/onboarding");
  }

  const awaitedSearchParams = await searchParams;
  const editId = awaitedSearchParams.edit ?? null;
  const campaignId = awaitedSearchParams.campaign_id ?? null;

  // Compile initial props explicitly
  const initialParams = {
    image: awaitedSearchParams.image ?? null,
    prompt: awaitedSearchParams.prompt ?? null,
    aspectRatio: (awaitedSearchParams.aspectRatio as AspectRatio) ?? null,
    editId: editId,
    returnTo: awaitedSearchParams.returnTo ?? null,
    draftId: awaitedSearchParams.draftId ?? null,
  };

  let campaignContext: CampaignContext | null = null;
  let campaignName: string | null = null;
  if (campaignId) {
    const { data: campaignData, error } = await supabase
      .from("campaigns")
      .select("ai_context, name")
      .eq("id", campaignId)
      .eq("organization_id", organization_id)
      .single();

    if (!error && campaignData) {
      campaignContext = (campaignData.ai_context as unknown as CampaignContext) ?? null;
      campaignName = campaignData.name;
    }
  }

  let editCreative = null;
  let historyData = null;
  if (editId) {
    const { data: creativeData, error } = await supabase
      .from("creatives")
      .select("*")
      .eq("id", editId)
      .eq("organization_id", organization_id)
      .single();

    if (!error && creativeData) {
      editCreative = creativeData;
    }
    
    // We don't fetch full historyData here. We let the client handle it via react-query, or we fetch it here.
    // Client has useCreativeHistory hook that handles this, but since StudioClient expects historyData, 
    // let's just pass null and let useStudioSessionSync fall back on client react-query if missing wait, 
    // we should let useCreativeHistory manage history.
    // Actually in StudioClient, we didn't migrate the useCreativeHistory hook. Let me check StudioClient...
  }

  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><Skeleton className="h-[50vh] w-[50vh] rounded-lg" /></div>}>
      <StudioClient
        userFirstName={user?.user_metadata?.full_name?.split(" ")[0] || "Creator"}
        campaignContext={campaignContext}
        campaignName={campaignName}
        editCreative={editCreative}
        historyData={historyData} // Let client fetch history or fetch here if needed
        initialParams={initialParams}
      />
    </Suspense>
  );
}
