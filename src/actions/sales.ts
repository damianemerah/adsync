"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";
import { getActiveOrgId } from "@/lib/active-org";

/**
 * Record a manual sale against a campaign.
 * Used by the "Sold! 🎉" button in the campaign detail view.
 *
 * Flow:
 *  1. Insert into `whatsapp_sales`
 *  2. Call `update_campaign_sales_summary` RPC → increments revenue + sales_count
 *  3. Conditionally fire Meta CAPI offline Purchase event (if ad account has CAPI set up)
 *     - Looks up the most recent fbclid for this campaign for best match quality
 *     - Silently skips if no CAPI credentials configured — never blocks the sale
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

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization");

  // 1. Insert the sale row and get the new ID (used as CAPI dedup key)
  const { data: saleRow, error } = await supabase
    .from("whatsapp_sales")
    .insert({
      campaign_id: campaignId,
      organization_id: orgId,
      amount_ngn: amountNgn,
      note: note || null,
      recorded_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // 2. Update campaign revenue summary
  await supabase.rpc("update_campaign_sales_summary", {
    p_campaign_id: campaignId,
    p_amount_ngn: amountNgn,
  });

  // 3. Fire Meta CAPI offline Purchase event (fire-and-forget — never blocks the sale)
  fireCAPIWhatsAppSale({
    campaignId,
    amountNgn,
    saleId: saleRow?.id,
  }).catch((err) =>
    console.warn("⚠️ [CAPI] Background fire failed (non-critical):", err),
  );

  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Looks up CAPI credentials for the campaign's ad account, fetches the most
 * recent fbclid recorded for this campaign, then fires an offline Purchase
 * event to Meta CAPI.
 *
 * Uses the admin client to bypass RLS when reading ad_accounts credentials —
 * this is safe because this function only runs server-side and only reads
 * credentials belonging to the campaign's own ad account.
 */
async function fireCAPIWhatsAppSale({
  campaignId,
  amountNgn,
  saleId,
}: {
  campaignId: string;
  amountNgn: number;
  saleId?: string;
}) {
  const admin = createAdminClient();

  // Look up the campaign's ad_account — need meta_pixel_id + capi_access_token
  const { data: campaign } = await admin
    .from("campaigns")
    .select("ad_account_id")
    .eq("id", campaignId)
    .single();

  if (!campaign?.ad_account_id) return;

  const { data: adAccount } = await admin
    .from("ad_accounts")
    .select("meta_pixel_id, capi_access_token")
    .eq("id", campaign.ad_account_id)
    .single();

  // Silently skip — user hasn't configured CAPI yet (most users initially)
  if (!adAccount?.meta_pixel_id || !adAccount?.capi_access_token) return;

  // Look up the most recent fbclid for this campaign.
  // The fbclid is captured when someone clicks a Meta ad → Tenzu.app/l/TOKEN?fbclid=XXX
  // This connects the offline WhatsApp sale back to the exact Meta ad click.
  // Security: Use !inner join to ensure we only read clicks from campaigns that exist (org isolation)
  const { data: recentClick } = await admin
    .from("link_clicks")
    .select("fbclid, clicked_at, campaigns!inner(id, organization_id)")
    .eq("campaign_id", campaignId)
    .not("fbclid", "is", null)
    .order("clicked_at", { ascending: false })
    .limit(1)
    .single();

  const decryptedToken = decrypt(adAccount.capi_access_token);

  await MetaService.sendCAPIEvent(adAccount.meta_pixel_id, decryptedToken, {
    eventName: "Purchase",
    actionSource: "other", // offline / WhatsApp — no website involved
    valueNgn: amountNgn,
    fbclid: recentClick?.fbclid ?? null,
    fbclidClickedAt: recentClick?.clicked_at ?? null,
    eventId: saleId, // deduplication key
  });
}
