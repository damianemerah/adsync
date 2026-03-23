"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getActiveOrgId } from "@/lib/active-org";

/**
 * Dismisses (clears) meta_issues for a campaign.
 * This allows users to manually clear issues that have been resolved
 * or that they want to acknowledge.
 *
 * Security: Validates campaign belongs to user's active organization.
 */
export async function dismissCampaignIssue(campaignId: string) {
  const supabase = await createClient();

  // Security: Verify the campaign belongs to the user's active organization
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  // Validate ownership before updating
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("organization_id")
    .eq("id", campaignId)
    .single();

  if (!campaign) throw new Error("Campaign not found");

  if (campaign.organization_id !== orgId) {
    throw new Error("Unauthorized: Campaign does not belong to your organization");
  }

  // Clear the issues
  const { error } = await supabase
    .from("campaigns")
    .update({
      meta_issues: null,
      issues_checked_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (error) throw error;

  // Revalidate the campaigns page to reflect the change
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);

  return { success: true };
}
