"use server";

import { createClient } from "@/lib/supabase/server";
import { CampaignState } from "@/stores/campaign-store";
import { Database } from "@/types/supabase";
import { getActiveOrgId } from "@/lib/active-org";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];

// Helper to map Store State -> DB Columns
function mapStateToDb(state: Partial<CampaignState>) {
  const {
    campaignName,
    budget,
    targetInterests,
    targetBehaviors,
    locations,
    ageRange,
    gender,
    adCopy,
    selectedCreatives,
    objective,
    platform,
    aiPrompt,
    latestAiSummary,
    pendingGeneratedImage,
    messages,
    destinationValue,
  } = state;

  return {
    name: campaignName || "Untitled Campaign",
    daily_budget_cents: budget ? budget * 100 : null,
    // Store targeting in snapshot
    targeting_snapshot: {
      interests: targetInterests || [],
      behaviors: targetBehaviors || [],
      locations: locations || [],
      age_range: ageRange || { min: 18, max: 65 },
      gender: gender || "all",
    } as any,
    // Store creative in snapshot
    // pendingGeneratedImage is included so draft loads restore the generated image
    // in the chat bubble exactly where the user left off.
    creative_snapshot: {
      ad_copy: adCopy || { primary: "", headline: "", cta: null },
      selected_creatives: selectedCreatives || [],
      pending_generated_image: pendingGeneratedImage ?? null,
      destination: destinationValue || "",
    } as any,
    // Store AI chat snapshot
    // Filter out recovery/error messages to keep snapshot clean
    ai_chat_snapshot: {
      prompt: aiPrompt || "",
      summary: latestAiSummary || null,
      messages: (messages || []).filter(
        (m) =>
          m.role === "user" ||
          (m.role === "ai" &&
            !["recovery", "network_error"].includes(m.type || "text")),
      ),
    } as any,
    objective,
    platform,
    status: "draft",
  };
}

// Helper to map DB Columns -> Store State
function mapDbToState(campaign: CampaignRow): Partial<CampaignState> {
  const targeting = (campaign.targeting_snapshot as any) || {};
  const creative = (campaign.creative_snapshot as any) || {};
  const chat = (campaign.ai_chat_snapshot as any) || {};

  return {
    campaignName: campaign.name,
    budget: campaign.daily_budget_cents
      ? campaign.daily_budget_cents / 100
      : 5000,
    targetInterests: targeting.interests || [],
    targetBehaviors: targeting.behaviors || [],
    locations: targeting.locations || [],
    ageRange: targeting.age_range || { min: 18, max: 65 },
    gender: targeting.gender || "all",
    adCopy: creative.ad_copy || {
      primary: "",
      headline: "",
      cta: {
        intent: "buy_now",
        platformCode: "SHOP_NOW",
        displayLabel: "Shop now",
      },
    },
    selectedCreatives: creative.selected_creatives || [],
    // Restore pending image so the chat bubble re-renders it on draft load
    pendingGeneratedImage: creative.pending_generated_image ?? null,
    destinationValue: creative.destination || "",
    objective: campaign.objective as CampaignState["objective"],
    platform: campaign.platform as CampaignState["platform"],
    // Restore Chat State
    aiPrompt: chat.prompt || "",
    latestAiSummary: chat.summary || null,
    messages: chat.messages || [],
  };
}

// Helper to get organization
async function getOrganization(userId: string) {
  return await getActiveOrgId();
}

export async function saveDraft(
  state: Partial<CampaignState>,
  campaignId?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const orgId = await getOrganization(user.id);
  if (!orgId) throw new Error("No organization found");

  console.log("💾 [Drafts] Saving draft state for org:", orgId);

  const payload = {
    ...mapStateToDb(state),
    organization_id: orgId,
    status: "draft",
  };

  if (campaignId) {
    // Update existing
    const { error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", campaignId);

    if (error) throw new Error(error.message);
    return campaignId;
  } else {
    // Create new
    const { data, error } = await supabase
      .from("campaigns")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return data.id;
  }
}

export async function getDraft(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("organization_id", orgId)
    .single();

  if (error) {
    console.error("❌ [Drafts] Error fetching draft:", error);
    return null;
  }

  return mapDbToState(data);
}

export async function deleteDraft(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const orgId = await getOrganization(user.id);
  if (!orgId) throw new Error("No organization found");

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("organization_id", orgId)
    .eq("status", "draft");

  if (error) {
    console.error("❌ [Drafts] Error deleting draft:", error);
    throw new Error(error.message);
  }

  return true;
}
