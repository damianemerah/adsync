/**
 * Insights Sync Job Enqueuer
 *
 * Creates a batch job to sync Meta campaign insights for all active campaigns.
 * This replaces the old sync-campaign-insights function which processed
 * everything inline and risked timeouts.
 *
 * New Architecture:
 * 1. This function (runs every 6 hours via cron)
 *    → Creates ONE job containing all campaign IDs
 * 2. process-insights-sync worker (polls every 5 minutes)
 *    → Processes campaigns in batches of 10
 *    → Records metrics, retries failures
 *
 * Benefits:
 * - Handles 1000+ campaigns without timeout
 * - Failed syncs are automatically retried
 * - Visibility into which campaigns failed
 * - Better rate limit handling (sleeps between batches)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("[Enqueuer] Fetching campaigns that need syncing...");

    // Fetch all active/paused/pending_review campaigns with platform IDs
    const { data: campaigns, error: fetchErr } = await supabase
      .from("campaigns")
      .select("id, name, organization_id, platform_campaign_id, ad_account_id")
      .in("status", ["active", "paused", "pending_review"])
      .not("platform_campaign_id", "is", null)
      .order("updated_at", { ascending: true }); // Prioritize least-recently-updated

    if (fetchErr) {
      throw new Error(`Failed to fetch campaigns: ${fetchErr.message}`);
    }

    if (!campaigns || campaigns.length === 0) {
      console.log("[Enqueuer] No campaigns to sync");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No campaigns to sync",
          campaignCount: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Enqueuer] Found ${campaigns.length} campaigns to sync`);

    // Group campaigns by organization (for better monitoring)
    const orgGroups = campaigns.reduce((acc, campaign) => {
      if (!acc[campaign.organization_id]) {
        acc[campaign.organization_id] = [];
      }
      acc[campaign.organization_id].push(campaign);
      return acc;
    }, {} as Record<string, any[]>);

    console.log(`[Enqueuer] Grouped into ${Object.keys(orgGroups).length} organizations`);

    // Create ONE job per organization (prevents one org's failures from blocking others)
    const jobIds: string[] = [];

    for (const [orgId, orgCampaigns] of Object.entries(orgGroups)) {
      const { data: job, error: jobErr } = await supabase
        .from("job_queue")
        .insert({
          type: "insights_sync",
          payload: {
            campaign_ids: orgCampaigns.map((c) => c.id),
            organization_id: orgId,
            campaign_count: orgCampaigns.length,
          },
          organization_id: orgId,
          status: "pending",
          max_attempts: 2, // Retry once
        })
        .select("id")
        .single();

      // jobErr code 23505 = unique constraint violation (dedup index).
      // This means a pending job already exists for this org — skip silently.
      if (jobErr) {
        if (jobErr.code === "23505") {
          console.log(`[Enqueuer] ⏭️ Skipping org ${orgId} — pending job already exists`);
          continue;
        }
        console.error(`[Enqueuer] Failed to create job for org ${orgId}:`, jobErr);
        continue;
      }

      jobIds.push(job.id);
      console.log(
        `[Enqueuer] ✅ Created job ${job.id} for ${orgCampaigns.length} campaigns (org ${orgId})`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobsCreated: jobIds.length,
        campaignCount: campaigns.length,
        jobIds,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Enqueuer] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
