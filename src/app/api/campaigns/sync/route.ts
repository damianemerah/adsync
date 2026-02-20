import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { accountId } = await request.json();

  console.log(`[Sync] Starting sync for accountId: ${accountId}`);

  // 1. Get Account & Token
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const token = decrypt(account.access_token);

    // 2. Prepare Meta Request
    const adAccountId = account.platform_account_id.startsWith("act_")
      ? account.platform_account_id
      : `act_${account.platform_account_id}`;

    // ✅ ARCHITECTURAL CHANGE: Added 'insights' to fields
    // We use .date_preset(maximum) to get LIFETIME stats for the dashboard list
    // v24.0: Added promoted_object and spend_cap for completeness
    const fields = `
      id,name,status,objective,daily_budget,lifetime_budget,spend_cap,
      insights.date_preset(maximum){spend,clicks,impressions,ctr},
      promoted_object{id,name},
      adsets{id,name,status,daily_budget,targeting{geo_locations,behaviors,interests}},
      ads{id,name,status,creative{id,title,body,image_url,thumbnail_url}}
    `;

    // Remove whitespace for cleaner URL
    const cleanFields = fields.replace(/\s/g, "");
    const url = `https://graph.facebook.com/v24.0/${adAccountId}/campaigns?fields=${cleanFields}&limit=50&access_token=${token}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      console.error("[Sync] Meta API Error:", data.error);
      throw new Error(data.error.message);
    }

    const campaigns = data.data || [];
    console.log(`[Sync] Fetched ${campaigns.length} campaigns from Meta`);

    // --- HELPER MAPPERS (To satisfy DB Constraints) ---

    const mapStatus = (metaStatus: string) => {
      const s = metaStatus ? metaStatus.toUpperCase() : "";
      if (s === "ACTIVE") return "active";
      if (s === "PAUSED") return "paused";
      if (s === "ARCHIVED" || s === "DELETED") return "completed"; // Map deleted to completed so they show up but don't break
      if (s === "IN_PROCESS" || s === "WITH_ISSUES") return "active"; // Treat issues as active (user needs to see them)
      return "paused"; // Default fallback
    };

    const mapObjective = (metaObj: string) => {
      const obj = metaObj ? metaObj.toUpperCase() : "";
      // These must match your DB 'check' constraints exactly
      if (obj === "OUTCOME_TRAFFIC") return "traffic";
      if (obj === "OUTCOME_AWARENESS") return "awareness";
      if (obj === "OUTCOME_ENGAGEMENT") return "engagement"; // Check if your DB has 'engagement' or 'video_views'
      if (obj === "OUTCOME_LEADS") return "traffic"; // Fallback if 'leads' not in DB
      if (obj === "OUTCOME_SALES") return "traffic"; // Fallback if 'sales' not in DB
      return "traffic"; // Safe default
    };

    // 3. Process & Upsert
    for (const c of campaigns) {
      try {
        const safeStatus = mapStatus(c.status);
        const safeObjective = mapObjective(c.objective);

        // ✅ METRICS EXTRACTION
        // Safely access the first element of the insights array
        const insights = c.insights?.data?.[0] || {};

        // Convert string "150.50" -> 15050 cents
        const spendCents = insights.spend
          ? Math.round(parseFloat(insights.spend) * 100)
          : 0;
        const clicks = insights.clicks ? parseInt(insights.clicks) : 0;
        const impressions = insights.impressions
          ? parseInt(insights.impressions)
          : 0;
        const ctr = insights.ctr ? parseFloat(insights.ctr) : 0;

        // A. Campaign Upsert
        const { data: campaignData, error: campaignError } = await supabase
          .from("campaigns")
          .upsert(
            {
              organization_id: account.organization_id,
              ad_account_id: account.id,
              platform: "meta",
              platform_campaign_id: c.id,
              name: c.name,
              status: safeStatus,
              objective: safeObjective,
              daily_budget_cents: c.daily_budget ? parseInt(c.daily_budget) : 0,
              updated_at: new Date().toISOString(),
              // ✅ NEW: Persist the metrics
              spend_cents: spendCents,
              clicks: clicks,
              impressions: impressions,
              ctr: ctr,
            },
            { onConflict: "platform_campaign_id" },
          )
          .select()
          .single();

        if (campaignError) {
          console.error(
            `[Sync] DB Error on Campaign ${c.id}:`,
            campaignError.message,
          );
          continue; // Skip children if parent fails
        }

        if (!campaignData) continue;

        // B. Ad Sets Upsert
        if (c.adsets?.data) {
          const adsets = c.adsets.data.map((adset: any) => ({
            campaign_id: campaignData.id,
            platform_adset_id: adset.id,
            name: adset.name,
            status: mapStatus(adset.status),
            targeting_snapshot: adset.targeting || {},
            bid_amount_cents: adset.daily_budget
              ? parseInt(adset.daily_budget)
              : 0,
          }));
          const { error: asError } = await supabase
            .from("ad_sets")
            .upsert(adsets, { onConflict: "platform_adset_id" });

          if (asError)
            console.error(`[Sync] AdSet Error ${c.id}:`, asError.message);
        }

        // C. Ads Upsert
        if (c.ads?.data) {
          const ads = c.ads.data.map((ad: any) => ({
            campaign_id: campaignData.id,
            platform_ad_id: ad.id,
            name: ad.name,
            status: mapStatus(ad.status),
            // ✅ FIX: Save the Meta creative data as a snapshot
            creative_snapshot: ad.creative || {},
            creative_id: null, // We don't link to local library for external ads
          }));

          // Only insert if your DB supports it.
          // If 'ads' table requires 'creative_id' FKey, this part might fail for imported ads.
          // Assuming you added 'creative_snapshot' or similar JSONB column, or made creative_id nullable.
          const { error: adError } = await supabase
            .from("ads")
            .upsert(ads, { onConflict: "platform_ad_id" });

          if (adError)
            console.error(`[Sync] Ads Error ${c.id}:`, adError.message);
        }
      } catch (innerError) {
        console.error(`[Sync] Failed processing campaign ${c.id}`, innerError);
        // Continue to next campaign
      }
    }

    return NextResponse.json({ success: true, count: campaigns.length });
  } catch (e: any) {
    console.error(`[Sync] Fatal error:`, e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
