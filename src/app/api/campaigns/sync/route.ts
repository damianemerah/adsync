import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { decrypt } from "@/lib/crypto";
import { CAMPAIGN_OBJECTIVES } from "@/lib/constants";
import { Database } from "@/types/supabase";

export async function POST(request: Request) {
  // Security: Validate the user's active organization before syncing
  const orgId = await getActiveOrgId();
  if (!orgId) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 401 },
    );
  }

  const supabase = createSupabaseAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { accountId } = await request.json();

  console.log(`🔄 [Sync] Starting sync for accountId: ${accountId}`);

  // 1. Get Account & Token + validate org ownership
  console.log("AccountId🔥", accountId);
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Security check: Ensure the ad account belongs to the requesting user's organization
  if (account.organization_id !== orgId) {
    return NextResponse.json(
      { error: "Unauthorized: Account does not belong to your organization" },
      { status: 403 },
    );
  }

  // ✅ Additional check: Don't sync disconnected accounts
  if (account.disconnected_at) {
    return NextResponse.json(
      { error: "Cannot sync disconnected account" },
      { status: 400 },
    );
  }

  try {
    const token = decrypt(account.access_token);

    const adAccountId = account.platform_account_id.startsWith("act_")
      ? account.platform_account_id
      : `act_${account.platform_account_id}`;

    // Fetch campaigns with lifetime insights for the campaigns table summary columns
    const fields = `
      id,name,status,objective,daily_budget,lifetime_budget,spend_cap,
      insights.date_preset(maximum){spend,clicks,impressions,ctr},
      promoted_object{id,name},
      adsets{id,name,status,daily_budget,targeting{geo_locations,behaviors,interests}},
      ads{id,name,status,creative{id,title,body,image_url,thumbnail_url}}
    `;
    const cleanFields = fields.replace(/\s/g, "");
    let nextPageUrl: string | null =
      `https://graph.facebook.com/v25.0/${adAccountId}/campaigns?fields=${cleanFields}&limit=50&access_token=${token}`;
    const campaigns: any[] = [];

    while (nextPageUrl) {
      const response: Response = await fetch(nextPageUrl);
      const data: any = await response.json();
      if (data.error) {
        console.error("[Sync] Meta API Error:", data.error);
        throw new Error(data.error.message);
      }
      campaigns.push(...(data.data || []));
      nextPageUrl = data.paging?.next ?? null;
    }

    console.log(`📥 [Sync] Fetched ${campaigns.length} campaigns from Meta`);

    // --- HELPER MAPPERS ---
    const mapStatus = (metaStatus: string) => {
      const s = metaStatus ? metaStatus.toUpperCase() : "";
      if (s === "ACTIVE") return "active";
      if (s === "PAUSED") return "paused";
      if (s === "ARCHIVED" || s === "DELETED") return "completed";
      if (s === "IN_PROCESS" || s === "WITH_ISSUES") return "active";
      return "paused";
    };

    const mapObjective = (metaObj: string) => {
      const obj = metaObj ? metaObj.toUpperCase() : "";
      if (obj === "OUTCOME_LEADS") return "whatsapp";
      const mapped = CAMPAIGN_OBJECTIVES.find((o) => o.metaObjective === obj);
      if (mapped) return mapped.id;
      if (obj === "OUTCOME_TRAFFIC") return "traffic";
      return "traffic";
    };

    // 3. Process & Upsert campaigns
    for (const c of campaigns) {
      try {
        const safeStatus = mapStatus(c.status);
        const safeObjective = mapObjective(c.objective);

        const insights = c.insights?.data?.[0] || {};
        const spendCents = insights.spend
          ? Math.round(parseFloat(insights.spend) * 100)
          : 0;
        const clicks = insights.clicks ? parseInt(insights.clicks) : 0;
        const impressions = insights.impressions
          ? parseInt(insights.impressions)
          : 0;
        const ctr = insights.ctr ? parseFloat(insights.ctr) : 0;

        console.log(
          `💾 [Sync] Upserting Campaign ${c.id}: ${c.name} | objective: ${safeObjective} | spend: ${spendCents} | impressions: ${impressions}`,
        );

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
          continue;
        }

        if (!campaignData) continue;

        // B. Fetch per-campaign daily metrics and write to campaign_metrics
        // We do this fire-and-forget style — don't let a failure here block the rest
        try {
          let dailyCursor: string | null =
            `https://graph.facebook.com/v25.0/${c.id}/insights?date_preset=last_30d&time_increment=1&fields=spend,impressions,clicks,reach,ctr,date_start&access_token=${token}`;
          const allDailyRows: any[] = [];

          while (dailyCursor) {
            const dailyRes: Response = await fetch(dailyCursor);
            const dailyData: any = await dailyRes.json();
            if (dailyData.error) break;
            allDailyRows.push(...(dailyData.data || []));
            dailyCursor = dailyData.paging?.next ?? null;
          }

          if (allDailyRows.length > 0) {
            const metricRows = allDailyRows.map((day: any) => ({
              campaign_id: campaignData.id,
              date: day.date_start,
              spend_cents: Math.round(parseFloat(day.spend || "0") * 100),
              impressions: parseInt(day.impressions || "0"),
              clicks: parseInt(day.clicks || "0"),
              reach: parseInt(day.reach || "0"),
              ctr: parseFloat(day.ctr || "0"),
              synced_at: new Date().toISOString(),
            }));

            const { error: metricsErr } = await supabase
              .from("campaign_metrics")
              .upsert(metricRows, { onConflict: "campaign_id,date" });

            if (metricsErr) {
              console.error(
                `[Sync] campaign_metrics upsert error for ${c.id}:`,
                metricsErr.message,
              );
            } else {
              console.log(
                `📊 [Sync] Wrote ${metricRows.length} daily rows for campaign ${c.id}`,
              );
            }
          }
        } catch (dailyErr) {
          console.error(
            `[Sync] Failed fetching daily metrics for campaign ${c.id}:`,
            dailyErr,
          );
        }

        // C. Ad Sets Upsert
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

        // D. Ads Upsert
        if (c.ads?.data) {
          const ads = c.ads.data.map((ad: any) => ({
            campaign_id: campaignData.id,
            platform_ad_id: ad.id,
            name: ad.name,
            status: mapStatus(ad.status),
            creative_snapshot: ad.creative || {},
            creative_id: null,
          }));

          const { error: adError } = await supabase
            .from("ads")
            .upsert(ads, { onConflict: "platform_ad_id" });

          if (adError)
            console.error(`[Sync] Ads Error ${c.id}:`, adError.message);
        }
      } catch (innerError) {
        console.error(`[Sync] Failed processing campaign ${c.id}`, innerError);
      }
    }

    // Stamp last_synced_at
    await supabase
      .from("ad_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", accountId);

    return NextResponse.json({ success: true, count: campaigns.length });
  } catch (e: any) {
    console.error(`[Sync] Fatal error:`, e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
