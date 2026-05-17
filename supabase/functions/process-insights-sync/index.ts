/**
 * Insights Sync Processor Edge Function
 *
 * Processes insights_sync jobs from the queue in batches.
 *
 * Key Features:
 * - Batch processing (10 campaigns at a time) prevents timeout
 * - Parallel fetching within batch for speed
 * - Automatic retry on transient Meta API errors
 * - Rate limit protection (2 second delay between batches)
 * - Detailed error tracking per campaign
 *
 * Invoked by pg_cron every 5 minutes
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const META_API_VERSION = "v25.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const BATCH_SIZE = 10; // Process 10 campaigns at a time

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // 1. ATOMICALLY CLAIM NEXT PENDING JOB (Bug 1+4 fix: FOR UPDATE SKIP LOCKED)
    const { data: claimedRows, error: fetchErr } = await supabase
      .rpc("claim_next_job", { p_type: "insights_sync" });

    if (fetchErr) {
      throw fetchErr;
    }

    const job = claimedRows?.[0] ?? null;

    if (!job) {
      return new Response(
        JSON.stringify({ message: "No pending insights sync jobs" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Worker] Processing insights sync job ${job.id}`);

    // 3. PROCESS CAMPAIGNS IN BATCHES
    const { campaign_ids } = job.payload;
    let syncedCount = 0;
    let errorCount = 0;
    const errors: Array<{ campaignId: string; error: string }> = [];

    console.log(`[Worker] Syncing ${campaign_ids.length} campaigns in batches of ${BATCH_SIZE}`);

    for (let i = 0; i < campaign_ids.length; i += BATCH_SIZE) {
      const batchIds = campaign_ids.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(campaign_ids.length / BATCH_SIZE);

      console.log(`[Worker] Processing batch ${batchNum}/${totalBatches} (${batchIds.length} campaigns)`);

      // Fetch campaign details for this batch
      const { data: campaignBatch, error: campErr } = await supabase
        .from("campaigns")
        .select(`
          id,
          name,
          organization_id,
          platform_campaign_id,
          ad_account_id,
          status,
          creative_snapshot,
          advantage_plus_config,
          placement_cache,
          ad_accounts!inner(access_token)
        `)
        .in("id", batchIds);

      if (campErr || !campaignBatch) {
        console.error(`[Worker] Failed to fetch batch:`, campErr);
        errorCount += batchIds.length;
        continue;
      }

      // Process batch in parallel
      const results = await Promise.allSettled(
        campaignBatch.map((campaign) =>
          syncCampaignInsights(supabase, campaign)
        )
      );

      // Aggregate results
      results.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value.success) {
          syncedCount++;
        } else {
          errorCount++;
          const campaign = campaignBatch[idx];
          const error =
            result.status === "rejected"
              ? result.reason.message
              : result.value.error;
          errors.push({
            campaignId: campaign.id,
            error: error || "Unknown error",
          });
        }
      });

      // Rate limit protection: wait 2 seconds between batches
      if (i + BATCH_SIZE < campaign_ids.length) {
        console.log(`[Worker] Sleeping 2s before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // 4. MARK JOB COMPLETE
    console.log(`[Worker] Sync complete: ${syncedCount} succeeded, ${errorCount} failed`);

    await supabase
      .from("job_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        payload: {
          ...job.payload,
          result: {
            synced: syncedCount,
            errors: errorCount,
            error_details: errors.slice(0, 20), // Keep first 20 errors
          },
        },
      })
      .eq("id", job.id);

    const duration = Date.now() - startTime;
    await supabase.from("job_metrics").insert({
      job_type: "insights_sync",
      duration_ms: duration,
      success: true,
    });

    console.log(`[Worker] ✅ Job ${job.id} completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        errors: errorCount,
        duration,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Worker] Fatal error:", error);

    const duration = Date.now() - startTime;
    await supabase.from("job_metrics").insert({
      job_type: "insights_sync",
      duration_ms: duration,
      success: false,
      error_code: "FATAL_ERROR",
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// Sync Individual Campaign
// ============================================================================

async function syncCampaignInsights(supabase: any, campaign: any) {
  try {
    const accessToken = await decrypt(
      campaign.ad_accounts.access_token,
      Deno.env.get("ENCRYPTION_KEY") ?? ""
    );

    // Fetch daily insights and placement breakdown in parallel
    const [insights, placementData] = await Promise.allSettled([
      fetchMetaInsights(accessToken, campaign.platform_campaign_id),
      fetchPlacementInsights(accessToken, campaign.platform_campaign_id),
    ]);

    const insightsResult = insights.status === "fulfilled" ? insights.value : null;

    if (!insightsResult?.data || insightsResult.data.length === 0) {
      console.log(`[Sync] No insights for campaign ${campaign.id}`);
      return { success: true, reason: "no_data" };
    }

    // Transform and upsert daily metrics
    const metricsToUpsert = insightsResult.data.map((day: any) => ({
      campaign_id: campaign.id,
      date: day.date_start,
      spend_cents: Math.round(parseFloat(day.spend || "0") * 100),
      clicks: parseInt(day.clicks || "0", 10),
      impressions: parseInt(day.impressions || "0", 10),
      reach: parseInt(day.reach || "0", 10),
      ctr: parseFloat(day.ctr || "0"),
      synced_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from("campaign_metrics")
      .upsert(metricsToUpsert, { onConflict: "campaign_id,date" });

    if (upsertErr) {
      throw new Error(`DB upsert failed: ${upsertErr.message}`);
    }

    // Persist placement breakdown for creative signal detection
    const campaignUpdate: Record<string, any> = {};
    const freshPlacementCache = placementData.status === "fulfilled" && placementData.value?.data?.length > 0
      ? placementData.value.data
      : (campaign.placement_cache ?? []);

    if (placementData.status === "fulfilled" && placementData.value?.data?.length > 0) {
      campaignUpdate.placement_cache = freshPlacementCache;
      campaignUpdate.placement_synced_at = new Date().toISOString();
      console.log(`[Sync] Stored ${placementData.value.data.length} placement rows for campaign ${campaign.id}`);
    } else if (placementData.status === "rejected") {
      console.warn(`[Sync] Placement fetch failed for ${campaign.id}:`, placementData.reason?.message);
    }

    // Per-creative asset breakdown for dynamic campaigns
    const snapshot = campaign.creative_snapshot as any;
    if (snapshot?.ad_format_type === "dynamic_creative") {
      const assetData = await fetchCreativeAssetInsights(accessToken, campaign.platform_campaign_id)
        .catch((e: Error) => { console.warn(`[Sync] Asset breakdown failed for ${campaign.id}:`, e.message); return null; });
      if (assetData?.data?.length > 0) {
        const hashes: Record<string, string> = snapshot?.creative_hashes ?? {};
        const urlByHash = Object.fromEntries(Object.entries(hashes).map(([h, u]) => [h, u]));
        const assets = assetData.data.map((row: any) => {
          const hash = row.image_asset?.hash ?? "";
          const url = urlByHash[hash] ?? "";
          const impressions = parseInt(row.impressions || "0", 10);
          return {
            url,
            hash,
            impressions,
            clicks: parseInt(row.clicks || "0", 10),
            spendCents: Math.round(parseFloat(row.spend || "0") * 100),
            ctr: impressions > 0 ? parseFloat(row.ctr || "0") : null,
          };
        }).filter((a: any) => a.url); // only keep rows we can match to a URL
        campaignUpdate.creative_asset_cache = { assets, syncedAt: new Date().toISOString() };
        console.log(`[Sync] Stored ${assets.length} asset metrics for dynamic campaign ${campaign.id}`);
      }
    }

    // If campaign is pending_review and has impressions, transition to active
    if (campaign.status === "pending_review") {
      const hasImpressions = metricsToUpsert.some((m) => m.impressions > 0);
      if (hasImpressions) {
        campaignUpdate.status = "active";
        console.log(`[Sync] Campaign ${campaign.id} transitioned to active`);
      }
    }

    if (Object.keys(campaignUpdate).length > 0) {
      await supabase.from("campaigns").update(campaignUpdate).eq("id", campaign.id);
    }

    // Compute and materialise creative insights after fresh data is written
    await computeAndStoreInsights(supabase, campaign, freshPlacementCache, metricsToUpsert)
      .catch((e: Error) => console.warn(`[Sync] Insight compute failed for ${campaign.id}:`, e.message));

    console.log(
      `[Sync] ✅ Synced ${metricsToUpsert.length} days for campaign ${campaign.id}`
    );
    return { success: true };
  } catch (error: any) {
    console.error(`[Sync] ❌ Failed to sync campaign ${campaign.id}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Meta API Helpers
// ============================================================================

async function fetchMetaInsights(token: string, campaignId: string) {
  const url =
    `${BASE_URL}/${campaignId}/insights` +
    `?fields=impressions,reach,clicks,ctr,cpc,spend` + // v25.0
    `&date_preset=last_7d` +
    `&time_increment=1` +
    `&access_token=${token}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Meta API Error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (data.error) {
    // v25.0 enhanced error logging
    console.error("Meta API Error:", {
      code: data.error.code,
      subcode: data.error.error_subcode,
      message: data.error.message,
      user_title: data.error.error_user_title,
      user_msg: data.error.error_user_msg,
      fbtrace_id: data.error.fbtrace_id,
    });

    const err = new Error(data.error.message || "Meta API Failed") as any;
    err.metaCode = data.error.code;
    err.userTitle = data.error.error_user_title; // v25.0
    err.userMsg = data.error.error_user_msg; // v25.0
    throw err;
  }

  return data;
}

async function fetchPlacementInsights(token: string, campaignId: string) {
  const url =
    `${BASE_URL}/${campaignId}/insights` +
    `?fields=reach,impressions,spend,clicks,cpc,ctr` +
    `&breakdowns=publisher_platform,platform_position` +
    `&date_preset=last_30d` +
    `&access_token=${token}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Meta Placement API Error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (data.error) {
    const err = new Error(data.error.message || "Meta Placement API Failed") as any;
    err.metaCode = data.error.code;
    throw err;
  }

  return data;
}

async function fetchCreativeAssetInsights(token: string, campaignId: string) {
  const url =
    `${BASE_URL}/${campaignId}/insights` +
    `?fields=impressions,clicks,spend,ctr` +
    `&breakdowns=image_asset` +
    `&date_preset=last_30d` +
    `&access_token=${token}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meta Asset API Error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? "Meta Asset API Failed");
  return data;
}

// ── Signal evaluation (subset portable to Deno, no external imports) ──────────

type PlacementRow = {
  publisher_platform: string;
  platform_position: string;
  impressions: string | number;
  clicks: string | number;
  spend: string | number;
  ctr: string | number;
};

type DailyRow = { impressions: number; ctr: number };

type InsightRow = {
  organization_id: string;
  campaign_id: string;
  campaign_name: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  impact_label: string;
  cta_label: string;
  cta_href: string;
  computed_at: string;
};

async function computeAndStoreInsights(
  supabase: any,
  campaign: any,
  placements: PlacementRow[],
  dailyMetrics: DailyRow[]
) {
  const orgId: string = campaign.organization_id;
  const campaignId: string = campaign.id;
  const campaignName: string = campaign.name;
  const now = new Date().toISOString();
  const insights: InsightRow[] = [];

  // A+C is pushed at the end after all other signals are known — suppressed
  // when the campaign is otherwise healthy to avoid standalone noise.

  if (placements.length > 0) {
    const rows = placements.map((p) => {
      const impressions = parseInt(String(p.impressions || "0"), 10);
      const clicks = parseInt(String(p.clicks || "0"), 10);
      const spend = parseFloat(String(p.spend || "0"));
      const ctr = impressions > 0 ? parseFloat(String(p.ctr || "0")) || (clicks / impressions) * 100 : 0;
      return { ...p, impressions, clicks, spend, ctr };
    });
    const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
    const rowsWithShare = rows.map((r) => ({ ...r, spendShare: totalSpend > 0 ? r.spend / totalSpend : 0 }));
    const maxCtr = Math.max(...rowsWithShare.map((r) => r.ctr));
    const avgCtr = rowsWithShare.reduce((s, r) => s + r.ctr, 0) / rowsWithShare.length;
    const topPlacement = rowsWithShare.find((r) => r.ctr === maxCtr);
    const totalImpressions = rowsWithShare.reduce((s, r) => s + r.impressions, 0);

    // Signal: CTR gap
    const lowPlacements = rowsWithShare.filter((r) => r.impressions > 200 && r.ctr < avgCtr * 0.5);
    if (lowPlacements.length > 0 && topPlacement && maxCtr > 0) {
      const worst = lowPlacements.reduce((a, b) => a.ctr < b.ctr ? a : b);
      const worstName = `${worst.publisher_platform} ${worst.platform_position}`;
      const topName = `${topPlacement.publisher_platform} ${topPlacement.platform_position}`;
      insights.push({
        organization_id: orgId, campaign_id: campaignId, campaign_name: campaignName,
        type: "ctr_gap", severity: "warning",
        title: `${worstName} CTR is ${Math.round((maxCtr / Math.max(worst.ctr, 0.01) - 1) * 100)}% below your best placement`,
        description: `"${campaignName}": ${topName} achieves ${maxCtr.toFixed(1)}% CTR while ${worstName} only achieves ${worst.ctr.toFixed(1)}% CTR.`,
        impact_label: `${worst.ctr.toFixed(1)}% vs ${maxCtr.toFixed(1)}% CTR`,
        cta_label: "Create a placement-optimised version",
        cta_href: `/ai-creative/studio?campaignId=${campaignId}`,
        computed_at: now,
      });
    }

    // Signal: Spend waste
    const wasteful = rowsWithShare.filter((r) => r.spendShare > 0.3 && r.ctr < avgCtr * 0.6 && r.impressions > 200);
    for (const w of wasteful) {
      const name = `${w.publisher_platform} ${w.platform_position}`;
      insights.push({
        organization_id: orgId, campaign_id: campaignId, campaign_name: campaignName,
        type: "spend_waste", severity: "warning",
        title: `${Math.round(w.spendShare * 100)}% of budget goes to ${name} with low returns`,
        description: `"${campaignName}": ${name} consumes ${Math.round(w.spendShare * 100)}% of spend but achieves only ${w.ctr.toFixed(1)}% CTR (avg: ${avgCtr.toFixed(1)}%).`,
        impact_label: `${Math.round(w.spendShare * 100)}% spend, ${w.ctr.toFixed(1)}% CTR`,
        cta_label: "Improve Creative",
        cta_href: `/ai-creative/studio?campaignId=${campaignId}`,
        computed_at: now,
      });
    }

    // Signal: Winning placement
    if (topPlacement && topPlacement.ctr > avgCtr * 2.0 && totalImpressions > 500) {
      const topName = `${topPlacement.publisher_platform} ${topPlacement.platform_position}`;
      insights.push({
        organization_id: orgId, campaign_id: campaignId, campaign_name: campaignName,
        type: "winning_placement", severity: "opportunity",
        title: `${topName} is your best-performing placement`,
        description: `"${campaignName}": ${topName} achieves ${topPlacement.ctr.toFixed(1)}% CTR — ${Math.round(topPlacement.ctr / Math.max(avgCtr, 0.01))}× your placement average.`,
        impact_label: `${topPlacement.ctr.toFixed(1)}% CTR`,
        cta_label: "Create more native creatives",
        cta_href: `/ai-creative/studio?campaignId=${campaignId}`,
        computed_at: now,
      });
    }
  }

  // Signal: Fatigue (from last 14 daily rows if available)
  const totalMetricImpressions = dailyMetrics.reduce((s, d) => s + (d.impressions ?? 0), 0);
  if (dailyMetrics.length >= 14 && totalMetricImpressions > 500) {
    const sorted = [...dailyMetrics].slice(0, 14);
    const recent7 = sorted.slice(0, 7);
    const prev7 = sorted.slice(7, 14);
    const recentCtr = recent7.reduce((s, d) => s + (d.ctr ?? 0), 0) / 7;
    const prevCtr = prev7.reduce((s, d) => s + (d.ctr ?? 0), 0) / 7;
    if (prevCtr > 0.3 && recentCtr < prevCtr * 0.65) {
      const dropPct = Math.round((1 - recentCtr / prevCtr) * 100);
      insights.push({
        organization_id: orgId, campaign_id: campaignId, campaign_name: campaignName,
        type: "fatigue", severity: "warning",
        title: `CTR dropped ${dropPct}% in the last 7 days`,
        description: `"${campaignName}" shows creative fatigue: CTR fell from ${prevCtr.toFixed(1)}% to ${recentCtr.toFixed(1)}% over 7 days.`,
        impact_label: `−${dropPct}% CTR`,
        cta_label: "Generate variation",
        cta_href: `/ai-creative/studio?campaignId=${campaignId}`,
        computed_at: now,
      });
    }
  }

  // Signal: Advantage+ Creative (deferred) — only show alongside other issues
  const advConfig = campaign.advantage_plus_config as { creative?: boolean } | null;
  if (advConfig?.creative === true) {
    const hasWarningOrCritical = insights.some(
      (i) => i.severity === "warning" || i.severity === "critical"
    );
    if (hasWarningOrCritical) {
      insights.push({
        organization_id: orgId, campaign_id: campaignId, campaign_name: campaignName,
        type: "advantage_plus_creative", severity: "warning",
        title: "Meta is auto-modifying your creative",
        description: `Advantage+ Creative is active on "${campaignName}". Meta may be adding music, adjusting colours, or cropping your image without your approval.`,
        impact_label: "Auto-enhanced",
        cta_label: "Review in Ads Manager",
        cta_href: "https://www.facebook.com/adsmanager/manage/campaigns",
        computed_at: now,
      });
    }
  }

  if (insights.length === 0) {
    // No active signals — clear stale ones
    await supabase.from("creative_insights").delete().eq("campaign_id", campaignId);
    return;
  }

  // Upsert on (campaign_id, type); remove signals that no longer apply
  const { error: upsertErr } = await supabase
    .from("creative_insights")
    .upsert(insights, { onConflict: "campaign_id,type" });
  if (upsertErr) throw new Error(`creative_insights upsert failed: ${upsertErr.message}`);

  const activeTypes = insights.map((i) => i.type);
  await supabase
    .from("creative_insights")
    .delete()
    .eq("campaign_id", campaignId)
    .not("type", "in", `(${activeTypes.map((t) => `"${t}"`).join(",")})`);

  console.log(`[Sync] Stored ${insights.length} insights for campaign ${campaignId}`);
}

async function decrypt(encrypted: string, key: string): Promise<string> {
  const parts = encrypted.split(":");
  if (parts.length !== 3) return encrypted;

  const [prefix, part2, part3] = parts;

  // v1/v2 → AES-256-CBC (written by Next.js OAuth callback and refresh jobs)
  if (prefix === "v1" || prefix === "v2") {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );
    const iv = new Uint8Array(part2.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const encryptedBytes = new Uint8Array(part3.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    try {
      const buf = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, keyMaterial, encryptedBytes);
      return new TextDecoder().decode(buf);
    } catch (e) {
      console.error("CBC decryption failed", e);
      return encrypted;
    }
  }

  // Format A: IV_HEX:AUTH_TAG_HEX:CIPHERTEXT_HEX → AES-256-GCM (written by refresh-meta-tokens edge function)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const iv = new Uint8Array(prefix.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const authTag = new Uint8Array(part2.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const ciphertext = new Uint8Array(part3.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);
  try {
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyMaterial, combined);
    return new TextDecoder().decode(buf);
  } catch (e) {
    console.error("GCM decryption failed", e);
    return encrypted;
  }
}
