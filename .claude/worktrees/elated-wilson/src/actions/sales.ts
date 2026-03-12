"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Record a manual sale against a campaign.
 * Used by the "Sold! 🎉" button in the campaign detail view.
 *
 * Inserts into `whatsapp_sales` and calls `update_campaign_sales_summary`
 * to increment `campaigns.sales_count` and `campaigns.revenue_ngn`.
 */
export async function recordSale({
  campaignId,
  amountNgn,
  note,
}: {
  campaignId: string;
  amountNgn: number;
  note?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  if (!member) throw new Error("No organization");

  const { error } = await supabase.from("whatsapp_sales").insert({
    campaign_id: campaignId,
    organization_id: member.organization_id as string,
    amount_ngn: amountNgn,
    note: note || null,
    recorded_by: user.id,
  });
  if (error) throw new Error(error.message);

  await supabase.rpc("update_campaign_sales_summary", {
    p_campaign_id: campaignId,
    p_amount_ngn: amountNgn,
  });

  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  return { success: true };
}
