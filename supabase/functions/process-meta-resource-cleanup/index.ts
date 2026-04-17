/**
 * Meta Resource Cleanup Processor Edge Function
 *
 * Processes meta_resource_cleanup jobs from the queue.
 *
 * Two modes:
 *   rollback — deletes specific Meta resources that were created during a
 *              failed campaign launch (campaign, adset, ad). Resources are
 *              listed in payload.resources.
 *
 *   audit    — called by the daily audit cron. Looks up the campaign's
 *              platform_campaign_id and deletes it from Meta (which cascades
 *              to all child ad sets and ads).
 *
 * Invoked by pg_cron every 5 minutes.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const META_API_VERSION = "v25.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

async function decrypt(encrypted: string, key: string): Promise<string> {
  const parts = encrypted.split(":");
  if (parts.length !== 3) return encrypted;

  const [prefix, part2, part3] = parts;

  if (prefix === "v1" || prefix === "v2") {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
      { name: "AES-CBC" },
      false,
      ["decrypt"],
    );
    const iv = new Uint8Array(part2.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const encryptedBytes = new Uint8Array(part3.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    try {
      const buf = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, keyMaterial, encryptedBytes);
      return new TextDecoder().decode(buf);
    } catch {
      return encrypted;
    }
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
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
  } catch {
    return encrypted;
  }
}

async function deleteMetaResource(token: string, resourceId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/${resourceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.error) {
    // 100 = "Invalid parameter" — resource may already be gone
    if (data.error.code === 100 || data.error.code === 803) {
      console.log(`[process-meta-resource-cleanup] Resource ${resourceId} already deleted (${data.error.code})`);
      return true; // treat as success — it's gone
    }
    throw new Error(`Meta delete error ${data.error.code}: ${data.error.message}`);
  }
  return data.success === true;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ?? "";

  let job: any = null;

  try {
    // 1. ATOMICALLY CLAIM NEXT PENDING JOB (Bug 1+4 fix: FOR UPDATE SKIP LOCKED)
    const { data: claimedRows, error: fetchErr } = await supabase
      .rpc("claim_next_job", { p_type: "meta_resource_cleanup" });

    if (fetchErr) {
      throw fetchErr;
    }

    job = claimedRows?.[0] ?? null;

    if (!job) {
      return new Response(
        JSON.stringify({ message: "No pending meta resource cleanup jobs" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const payload = job.payload as {
      campaignId: string;
      mode: "rollback" | "audit";
      resources?: {
        metaCampaignId?: string;
        metaAdSetId?: string;
        metaAdId?: string;
      };
    };

    console.log(`[process-meta-resource-cleanup] Mode: ${payload.mode}, campaign: ${payload.campaignId}`);

    // 3. FETCH CAMPAIGN + AD ACCOUNT FOR TOKEN
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("*, ad_accounts!inner(access_token, platform_account_id)")
      .eq("id", payload.campaignId)
      .single();

    if (campErr || !campaign) {
      throw new Error(`Campaign ${payload.campaignId} not found`);
    }

    const accessToken = await decrypt(campaign.ad_accounts.access_token, ENCRYPTION_KEY);
    const deleted: string[] = [];
    const failed: string[] = [];

    // 4. DELETE RESOURCES
    if (payload.mode === "rollback" && payload.resources) {
      // Delete in reverse order: ad → adset → campaign
      const orderedIds = [
        payload.resources.metaAdId,
        payload.resources.metaAdSetId,
        payload.resources.metaCampaignId,
      ].filter(Boolean) as string[];

      for (const resourceId of orderedIds) {
        try {
          await deleteMetaResource(accessToken, resourceId);
          deleted.push(resourceId);
          console.log(`[process-meta-resource-cleanup] ✅ Deleted ${resourceId}`);
        } catch (err: any) {
          failed.push(resourceId);
          console.error(`[process-meta-resource-cleanup] ❌ Failed to delete ${resourceId}:`, err.message);
          throw err; // propagate so we retry
        }
      }
    } else if (payload.mode === "audit") {
      // For audit mode, delete via campaign ID (cascades to child resources)
      if (campaign.platform_campaign_id) {
        try {
          await deleteMetaResource(accessToken, campaign.platform_campaign_id);
          deleted.push(campaign.platform_campaign_id);
          console.log(`[process-meta-resource-cleanup] ✅ Deleted campaign ${campaign.platform_campaign_id} and children`);
        } catch (err: any) {
          failed.push(campaign.platform_campaign_id);
          throw err;
        }
      } else {
        console.log(`[process-meta-resource-cleanup] No platform_campaign_id for ${payload.campaignId} — nothing to clean`);
      }
    }

    // 5. CLEAR platform_campaign_id ONCE CLEANED
    if (deleted.length > 0 && (payload.resources?.metaCampaignId || payload.mode === "audit")) {
      await supabase
        .from("campaigns")
        .update({ platform_campaign_id: null })
        .eq("id", payload.campaignId);
    }

    // 6. MARK COMPLETE
    const duration = Date.now() - startTime;
    const result = { deleted, failed };

    await supabase
      .from("job_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        payload: { ...job.payload, result },
      })
      .eq("id", job.id);

    await supabase.from("job_metrics").insert({
      job_type: "meta_resource_cleanup",
      duration_ms: duration,
      success: true,
    });

    console.log(`[process-meta-resource-cleanup] ✅ Job ${job.id} done in ${duration}ms`);

    return new Response(
      JSON.stringify({ success: true, result, duration }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[process-meta-resource-cleanup] Error:", error.message);

    if (job?.id) {
      const { data: currentJob } = await supabase
        .from("job_queue")
        .select("attempts, max_attempts")
        .eq("id", job.id)
        .single();

      if (currentJob) {
        const newAttempts = (currentJob.attempts ?? 0) + 1;
        const exhausted = newAttempts >= (currentJob.max_attempts ?? 3);

        if (exhausted) {
          // Bug 3 fix: atomic RPC — inserts into job_dlq AND marks job failed in one transaction
          await supabase.rpc("fail_job_to_dlq", {
            p_job_id: job.id,
            p_error_msg: error.message,
            p_error_stack: null,
            p_attempts: newAttempts,
          });
        } else {
          const backoffMs = Math.min(1000 * Math.pow(2, newAttempts), 300000);
          await supabase
            .from("job_queue")
            .update({
              status: "pending",
              last_error: error.message,
              attempts: newAttempts,
              updated_at: new Date(Date.now() + backoffMs).toISOString(),
            })
            .eq("id", job.id);
          console.log(`[process-meta-resource-cleanup] Will retry in ${Math.round(backoffMs / 1000)}s`);
        }
      }
    }

    const duration = Date.now() - startTime;
    await supabase.from("job_metrics").insert({
      job_type: "meta_resource_cleanup",
      duration_ms: duration,
      success: false,
      error_code: "CLEANUP_ERROR",
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
});
