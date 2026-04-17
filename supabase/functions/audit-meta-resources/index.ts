/**
 * Meta Resource Audit Enqueuer Edge Function
 *
 * Runs daily. Finds campaigns with status='failed' that still have a
 * platform_campaign_id (meaning Meta resources were created but never cleaned up),
 * and enqueues one meta_resource_cleanup(audit) job per campaign.
 *
 * Skips campaigns that already have a pending or processing cleanup job.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Find failed campaigns with orphaned Meta resources (platform_campaign_id set)
    const { data: campaigns, error: campErr } = await supabase
      .from("campaigns")
      .select("id, name, platform_campaign_id, organization_id")
      .eq("status", "failed")
      .not("platform_campaign_id", "is", null);

    if (campErr) throw campErr;

    console.log(`[audit-meta-resources] Found ${campaigns?.length ?? 0} campaigns with orphaned resources`);

    if (!campaigns?.length) {
      return new Response(
        JSON.stringify({ success: true, enqueued: 0, message: "No orphaned resources found" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Find which campaigns already have a pending/processing cleanup job
    const campaignIds = campaigns.map((c) => c.id);
    const { data: existingJobs } = await supabase
      .from("job_queue")
      .select("payload")
      .eq("type", "meta_resource_cleanup")
      .in("status", ["pending", "processing"]);

    const alreadyQueued = new Set(
      (existingJobs ?? []).map((j) => j.payload?.campaignId).filter(Boolean),
    );

    let enqueued = 0;
    let skipped = 0;

    for (const campaign of campaigns) {
      if (alreadyQueued.has(campaign.id)) {
        console.log(`[audit-meta-resources] ⏭️ Skipping ${campaign.id} — cleanup already queued`);
        skipped++;
        continue;
      }

      const { error: jobErr } = await supabase.from("job_queue").insert({
        type: "meta_resource_cleanup",
        organization_id: campaign.organization_id,
        status: "pending",
        max_attempts: 3,
        payload: {
          campaignId: campaign.id,
          mode: "audit",
          resources: {},
        },
      });

      if (jobErr) {
        console.error(`[audit-meta-resources] Error enqueueing ${campaign.id}:`, jobErr.message);
      } else {
        enqueued++;
        console.log(`[audit-meta-resources] ✅ Enqueued cleanup for campaign "${campaign.name}"`);
      }
    }

    console.log(`[audit-meta-resources] Done — enqueued ${enqueued}, skipped ${skipped}`);

    return new Response(
      JSON.stringify({ success: true, enqueued, skipped }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[audit-meta-resources] Fatal:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
