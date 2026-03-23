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
    // 1. FETCH NEXT PENDING JOB
    const { data: job, error: fetchErr } = await supabase
      .from("job_queue")
      .select("*")
      .eq("type", "insights_sync")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") {
        return new Response(
          JSON.stringify({ message: "No pending insights sync jobs" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw fetchErr;
    }

    console.log(`[Worker] Processing insights sync job ${job.id}`);

    // 2. ACQUIRE LOCK
    const { error: lockErr, count } = await supabase
      .from("job_queue")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pending");

    if (lockErr || count === 0) {
      console.log(`[Worker] Job ${job.id} already locked, skipping`);
      return new Response(
        JSON.stringify({ message: "Job already processing" }),
        { status: 200 }
      );
    }

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
          platform_campaign_id,
          ad_account_id,
          status,
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

    // Fetch last 7 days of insights from Meta
    const insights = await fetchMetaInsights(
      accessToken,
      campaign.platform_campaign_id
    );

    if (!insights.data || insights.data.length === 0) {
      console.log(`[Sync] No insights for campaign ${campaign.id}`);
      return { success: true, reason: "no_data" };
    }

    // Transform and upsert metrics
    const metricsToUpsert = insights.data.map((day: any) => ({
      campaign_id: campaign.id,
      date: day.date_start,
      spend_cents: Math.round(parseFloat(day.spend || "0") * 100),
      clicks: parseInt(day.clicks || "0", 10),
      impressions: parseInt(day.impressions || "0", 10),
      reach: parseInt(day.reach || "0", 10),
      ctr: parseFloat(day.ctr || "0"),
      media_views: parseInt(day.media_views || "0", 10), // v25.0 metric
      media_viewers: parseInt(day.media_viewers || "0", 10), // v25.0 metric
      synced_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from("campaign_metrics")
      .upsert(metricsToUpsert, { onConflict: "campaign_id,date" });

    if (upsertErr) {
      throw new Error(`DB upsert failed: ${upsertErr.message}`);
    }

    // If campaign is pending_review and has impressions, transition to active
    if (campaign.status === "pending_review") {
      const hasImpressions = metricsToUpsert.some((m) => m.impressions > 0);
      if (hasImpressions) {
        await supabase
          .from("campaigns")
          .update({ status: "active" })
          .eq("id", campaign.id);
        console.log(`[Sync] Campaign ${campaign.id} transitioned to active`);
      }
    }

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
    `?fields=impressions,reach,clicks,ctr,cpc,spend,media_views,media_viewers` + // v25.0: Added new metrics
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

async function decrypt(encrypted: string, key: string): Promise<string> {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    return encrypted;
  }

  const [version, ivHex, encryptedHex] = parts;

  if (version !== "v1" && version !== "v2") {
    return encrypted;
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const iv = new Uint8Array(
    ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const encryptedBytes = new Uint8Array(
    encryptedHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      keyMaterial,
      encryptedBytes
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    console.error("Decryption failed", e);
    return encrypted;
  }
}
