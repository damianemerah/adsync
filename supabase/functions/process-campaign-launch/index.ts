/**
 * Campaign Launch Worker Edge Function
 *
 * Processes campaign_launch jobs from the queue and executes Meta API calls.
 *
 * Key Features:
 * - Rollback capability: If DB insert fails, automatically deletes Meta resources
 * - Retry logic: Transient errors are automatically retried with exponential backoff
 * - Monitoring: Records metrics for observability
 * - Notifications: Sends in-app notifications on success/failure
 *
 * Invoked by:
 * - pg_cron every minute to check for pending jobs
 * - Can also be triggered by pg_notify in future for real-time processing
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const META_API_VERSION = "v25.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================================================
// Main Handler
// ============================================================================

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
    // 1. FETCH NEXT PENDING JOB (FIFO with lock)
    const { data: job, error: fetchErr } = await supabase
      .from("job_queue")
      .select("*")
      .eq("type", "campaign_launch")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (fetchErr) {
      if (fetchErr.code === "PGRST116") {
        // No rows - queue is empty
        return new Response(
          JSON.stringify({ message: "No pending campaign launch jobs" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw fetchErr;
    }

    console.log(`[Worker] Processing job ${job.id} for campaign ${job.payload.campaignId}`);

    // 2. ACQUIRE LOCK (Mark as processing)
    const { error: lockErr, count } = await supabase
      .from("job_queue")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pending"); // Optimistic lock

    if (lockErr || count === 0) {
      console.log(`[Worker] Job ${job.id} already locked, skipping`);
      return new Response(
        JSON.stringify({ message: "Job already processing" }),
        { status: 200 }
      );
    }

    // 3. EXECUTE META API CHAIN WITH ROLLBACK TRACKING
    const { campaignId, config } = job.payload;
    const metaResources: Array<{ type: string; id: string }> = [];

    try {
      // ── FETCH CAMPAIGN DRAFT FROM DB ────────────────────────────────────
      const { data: campaign, error: campErr } = await supabase
        .from("campaigns")
        .select(`
          *,
          ad_accounts!inner(*)
        `)
        .eq("id", campaignId)
        .single();

      if (campErr || !campaign) {
        throw new Error(`Campaign ${campaignId} not found in database`);
      }

      const accessToken = await decrypt(
        campaign.ad_accounts.access_token,
        Deno.env.get("ENCRYPTION_KEY") ?? ""
      );

      const adAccountId = campaign.ad_accounts.platform_account_id;

      // Check if ad account has Meta Pixel configured (for conversion optimization)
      const hasMetaPixel = !!(
        campaign.ad_accounts.meta_pixel_id &&
        campaign.ad_accounts.capi_access_token
      );
      console.log(
        `[Worker] Meta Pixel configured: ${hasMetaPixel ? "YES" : "NO"}${hasMetaPixel ? ` (ID: ${campaign.ad_accounts.meta_pixel_id})` : ""}`
      );

      // ── STEP 1: GET FACEBOOK PAGE ───────────────────────────────────────
      console.log("[Worker] Step 1: Fetching Facebook pages");
      const pagesRes = await metaRequest(
        "/me/accounts?fields=id,name",
        "GET",
        accessToken
      );

      if (!pagesRes.data?.length) {
        throw new Error("No Facebook Page found. Please create one on Facebook.");
      }
      const pageId = pagesRes.data[0].id;
      console.log(`[Worker] ✅ Using page ${pageId}`);

      // ── STEP 2: CREATE META CAMPAIGN ────────────────────────────────────
      console.log("[Worker] Step 2: Creating Meta campaign");
      const metaCampaign = await createMetaCampaign(
        accessToken,
        adAccountId,
        config.name,
        config.objective,
        hasMetaPixel
      );
      metaResources.push({ type: "campaign", id: metaCampaign.id });
      console.log(`[Worker] ✅ Created campaign ${metaCampaign.id}`);

      // ── STEP 3: CREATE AD SET ───────────────────────────────────────────
      console.log("[Worker] Step 3: Creating ad set");
      const metaAdSet = await createMetaAdSet(
        accessToken,
        adAccountId,
        metaCampaign.id,
        pageId,
        config,
        hasMetaPixel
      );
      metaResources.push({ type: "adset", id: metaAdSet.id });
      console.log(`[Worker] ✅ Created ad set ${metaAdSet.id}`);

      // ── STEP 4: UPLOAD IMAGE ────────────────────────────────────────────
      console.log("[Worker] Step 4: Uploading creative");
      const imageRes = await uploadImageToMeta(
        accessToken,
        adAccountId,
        config.creatives[0]
      );
      const imageKey = Object.keys(imageRes.images)[0];
      const imageHash = imageRes.images[imageKey].hash;
      console.log(`[Worker] ✅ Uploaded image (hash: ${imageHash})`);

      // ── STEP 5: CREATE AD CREATIVE & AD ─────────────────────────────────
      console.log("[Worker] Step 5: Creating ad creative");

      // Process destination URL (attribution, WhatsApp formatting, etc.)
      let finalUrl = config.destinationValue;
      if (config.objective === "whatsapp") {
        finalUrl = formatWhatsAppUrl(
          config.destinationValue,
          config.adCopy.headline
        );
      } else if (config.objective === "leads") {
        finalUrl = ""; // Lead forms don't need destination URL
      } else {
        if (!finalUrl.startsWith("http")) {
          finalUrl = `https://${finalUrl}`;
        }
      }

      const metaAd = await createMetaAd(
        accessToken,
        adAccountId,
        metaAdSet.id,
        imageHash,
        pageId,
        config.adCopy,
        finalUrl,
        config.objective,
        config.leadGenFormId
      );
      metaResources.push({ type: "ad", id: metaAd.id });
      console.log(`[Worker] ✅ Created ad ${metaAd.id}`);

      // ── STEP 6: UPDATE CAMPAIGN IN DB ───────────────────────────────────
      console.log("[Worker] Step 6: Saving campaign to database");

      // v25.0: Track Advantage+ configuration
      const advantagePlusConfig = {
        audience: true, // Always enabled via targeting_automation in ad set
        placements: config.metaPlacement === "automatic",
        creative: false, // Not implemented yet
        budget: false, // Not implemented yet
      };

      const { error: updateErr } = await supabase
        .from("campaigns")
        .update({
          platform_campaign_id: metaCampaign.id,
          status: "pending_review", // Meta will review before activating
          advantage_plus_config: advantagePlusConfig, // v25.0: Track Advantage+ features
          uses_pixel_optimization: hasMetaPixel && config.objective === "traffic", // Track if using OUTCOME_SALES
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (updateErr) {
        console.error("[Worker] ❌ DB update failed, initiating rollback");
        throw new Error(`Database update failed: ${updateErr.message}`);
      }

      console.log(`[Worker] ✅ Campaign ${campaignId} saved to database`);

      // ── STEP 7: SEND SUCCESS NOTIFICATION ───────────────────────────────
      await supabase.from("notifications").insert({
        user_id: job.user_id,
        type: "success",
        category: "campaign",
        title: "🎉 Campaign Launched",
        message: `Your campaign "${config.name}" has been sent to Meta for review. You'll see results within 24 hours.`,
        action_url: "/campaigns",
        action_label: "View Campaigns",
      });

      // ── MARK JOB COMPLETE ───────────────────────────────────────────────
      await supabase
        .from("job_queue")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      const duration = Date.now() - startTime;
      await supabase.from("job_metrics").insert({
        job_type: "campaign_launch",
        duration_ms: duration,
        success: true,
      });

      console.log(`[Worker] ✅ Job ${job.id} completed in ${duration}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          campaignId: metaCampaign.id,
          duration,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    } catch (metaError: any) {
      console.error("[Worker] ❌ Meta API Error:", metaError.message);

      // ──────────────────────────────────────────────────────────────────
      // ROLLBACK: Delete all created Meta resources
      // ──────────────────────────────────────────────────────────────────
      if (metaResources.length > 0) {
        console.log(`[Worker] 🔄 Rolling back ${metaResources.length} Meta resources...`);

        for (const resource of metaResources.reverse()) {
          try {
            await deleteMetaResource(accessToken, resource.id);
            console.log(`[Worker] ✅ Deleted ${resource.type} ${resource.id}`);
          } catch (deleteErr: any) {
            console.error(
              `[Worker] ⚠️ Failed to delete ${resource.type} ${resource.id}:`,
              deleteErr.message
            );
          }
        }
      }

      // ── MARK CAMPAIGN AS FAILED IN DB ──────────────────────────────────
      await supabase
        .from("campaigns")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      // ── DETERMINE IF RETRYABLE ─────────────────────────────────────────
      const isRetryable =
        metaError.code === "ETIMEDOUT" ||
        metaError.metaCode === 4 || // Rate limit
        metaError.metaCode === 17 || // Temporary error
        metaError.metaCode === 2; // Temporary API error

      // ── MARK JOB AS FAILED (Will retry if retryable) ───────────────────
      await markJobFailed(
        supabase,
        job.id,
        metaError.message,
        isRetryable
      );

      // ── SEND ERROR NOTIFICATION ────────────────────────────────────────
      await supabase.from("notifications").insert({
        user_id: job.user_id,
        type: "critical",
        category: "campaign",
        title: "Campaign Launch Failed",
        message: `Failed to launch "${config.name}": ${metaError.message}. ${isRetryable ? "We'll retry automatically." : "Please check your settings and try again."}`,
        action_url: "/campaigns/new",
        action_label: "Try Again",
      });

      const duration = Date.now() - startTime;
      await supabase.from("job_metrics").insert({
        job_type: "campaign_launch",
        duration_ms: duration,
        success: false,
        error_code: metaError.metaCode?.toString(),
      });

      console.log(`[Worker] ❌ Job ${job.id} failed after ${duration}ms`);

      // Don't throw - we handled the error gracefully
      return new Response(
        JSON.stringify({
          success: false,
          error: metaError.message,
          rollback: metaResources.length > 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("[Worker] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// Meta API Helpers
// ============================================================================

async function metaRequest(
  endpoint: string,
  method: string,
  accessToken: string,
  body?: any
) {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

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
    err.subcode = data.error.error_subcode;
    err.userTitle = data.error.error_user_title; // v25.0
    err.userMsg = data.error.error_user_msg; // v25.0
    throw err;
  }

  return data;
}

async function createMetaCampaign(
  token: string,
  adAccountId: string,
  name: string,
  objective: string,
  hasMetaPixel: boolean = false
) {
  const id = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  // Map AdSync objectives to Meta objectives
  // CRITICAL: For "traffic" (Website Sales), use OUTCOME_SALES when Meta Pixel is configured
  // This enables conversion optimization instead of just click optimization
  const metaObjectiveMap: Record<string, string> = {
    traffic: hasMetaPixel ? "OUTCOME_SALES" : "OUTCOME_TRAFFIC",
    sales: "OUTCOME_SALES",
    awareness: "OUTCOME_AWARENESS",
    engagement: "OUTCOME_ENGAGEMENT",
    whatsapp: "OUTCOME_ENGAGEMENT", // Fixed: was OUTCOME_TRAFFIC, should be ENGAGEMENT for CONVERSATIONS
    leads: "OUTCOME_LEADS",
    app_promotion: "OUTCOME_APP_PROMOTION",
  };

  return metaRequest(`/${id}/campaigns`, "POST", token, {
    name,
    objective: metaObjectiveMap[objective] || "OUTCOME_SALES",
    status: "PAUSED",
    special_ad_categories: [],
    is_adset_budget_sharing_enabled: false,
  });
}

async function createMetaAdSet(
  token: string,
  adAccountId: string,
  campaignId: string,
  pageId: string,
  config: any,
  hasMetaPixel: boolean = false
) {
  const id = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  // Build targeting
  const targeting: any = {
    geo_locations: buildGeoTargeting(config.targetLocations, config.objective),
    interests: config.targetInterests
      .filter((i: any) => /^\d+$/.test(i.id))
      .map((i: any) => ({ id: i.id, name: i.name })),
    behaviors: config.targetBehaviors
      .filter((b: any) => /^\d+$/.test(b.id))
      .map((b: any) => ({ id: b.id, name: b.name })),
    age_min: config.targetAgeRange.min,
    age_max: 65, // Required by Meta when using Advantage+ audience
    targeting_automation: { advantage_audience: 1 },
  };

  if (config.targetGender === "male") targeting.genders = [1];
  if (config.targetGender === "female") targeting.genders = [2];
  if (config.targetLanguages?.length > 0) targeting.locales = config.targetLanguages;
  if (config.targetLifeEvents?.length > 0) {
    targeting.life_events = config.targetLifeEvents.map((e: any) => ({ id: e.id }));
  }

  // Optimization goal
  // CRITICAL: For "traffic" objective, use OFFSITE_CONVERSIONS when Meta Pixel configured
  // This optimizes for purchases instead of just page views
  const optimizationMap: Record<string, string> = {
    traffic: hasMetaPixel ? "OFFSITE_CONVERSIONS" : "LANDING_PAGE_VIEWS",
    sales: "OFFSITE_CONVERSIONS",
    awareness: "REACH",
    engagement: "POST_ENGAGEMENT",
    whatsapp: "CONVERSATIONS",
    leads: "LEAD_GENERATION",
    app_promotion: "APP_INSTALLS",
  };

  console.log(
    `[Worker] Ad Set optimization_goal: ${optimizationMap[config.objective]} (pixel: ${hasMetaPixel})`
  );

  const payload: any = {
    name: `${config.name} - Ad Set`,
    campaign_id: campaignId,
    daily_budget: config.budget * 100, // Convert Naira to cents
    billing_event: "IMPRESSIONS",
    optimization_goal: optimizationMap[config.objective] || "LINK_CLICKS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    status: "PAUSED",
    targeting,
    start_time: new Date(Date.now() + 10 * 60000).toISOString(),
  };

  // Add promoted_object for specific objectives
  if (config.objective === "engagement" || config.objective === "whatsapp") {
    payload.promoted_object = { page_id: pageId };
  }
  if (config.objective === "whatsapp") {
    payload.destination_type = "WHATSAPP";
  }
  if (config.objective === "app_promotion" && config.metaApplicationId) {
    payload.promoted_object = {
      application_id: config.metaApplicationId,
      ...(config.appStoreUrl && { object_store_url: config.appStoreUrl }),
    };
  }

  return metaRequest(`/${id}/adsets`, "POST", token, payload);
}

async function uploadImageToMeta(
  token: string,
  adAccountId: string,
  imageUrl: string
) {
  // Download image from Supabase Storage
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error("Failed to download image from storage");

  const imageBlob = await imageRes.blob();

  // Upload to Meta
  const formData = new FormData();
  formData.append("access_token", token);
  formData.append("filename", imageBlob, "creative.jpg");

  const id = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const res = await fetch(`${BASE_URL}/${id}/adimages`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  return data;
}

async function createMetaAd(
  token: string,
  adAccountId: string,
  adSetId: string,
  imageHash: string,
  pageId: string,
  adCopy: any,
  destinationUrl: string,
  objective: string,
  leadGenFormId?: string
) {
  const id = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  // Build call-to-action
  let callToAction: any;
  if (objective === "whatsapp") {
    callToAction = {
      type: "WHATSAPP_MESSAGE",
      value: { app_destination: "WHATSAPP" },
    };
  } else if (objective === "leads" && leadGenFormId) {
    callToAction = {
      type: "SIGN_UP",
      value: { lead_gen_form_id: leadGenFormId },
    };
  } else {
    const ctaCode =
      typeof adCopy.cta === "object" && adCopy.cta.platformCode
        ? adCopy.cta.platformCode
        : "SHOP_NOW";
    callToAction = { type: ctaCode };
  }

  // Build link_data
  const linkData: any = {
    image_hash: imageHash,
    message: adCopy.primary,
    name: adCopy.headline,
    call_to_action: callToAction,
  };

  if (objective !== "leads" && destinationUrl) {
    linkData.link = destinationUrl;
  }

  // Create creative
  const creativeRes = await metaRequest(`/${id}/adcreatives`, "POST", token, {
    name: "AdSync Creative",
    object_story_spec: {
      page_id: pageId,
      link_data: linkData,
    },
  });

  // Create ad
  return metaRequest(`/${id}/ads`, "POST", token, {
    name: "AdSync Ad 1",
    adset_id: adSetId,
    creative: { creative_id: creativeRes.id },
    status: "PAUSED",
  });
}

async function deleteMetaResource(token: string, resourceId: string) {
  return metaRequest(`/${resourceId}`, "DELETE", token);
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildGeoTargeting(locations: any[], objective: string) {
  const geo: any = {};

  // Broad objectives (awareness/engagement) target regions
  if (objective === "awareness" || objective === "engagement") {
    const regions = locations
      .filter((l) => l.type === "region")
      .map((l) => ({ key: l.id }));
    if (regions.length > 0) {
      geo.regions = regions;
    } else {
      geo.countries = ["NG"];
    }
  } else {
    // Conversion objectives target cities with radius
    const cities = locations
      .filter((l) => l.type === "city")
      .map((l) => ({ key: l.id, radius: 10, distance_unit: "kilometer" }));
    if (cities.length === 0) {
      cities.push({ key: "2420605", radius: 17, distance_unit: "kilometer" }); // Lagos fallback
    }
    geo.cities = cities;
  }

  return geo;
}

function formatWhatsAppUrl(phone: string, adHeadline: string) {
  let rawPhone = phone.replace(/\D/g, "");
  if (rawPhone.startsWith("0")) {
    rawPhone = "234" + rawPhone.slice(1);
  } else if (!rawPhone.startsWith("234")) {
    rawPhone = "234" + rawPhone;
  }
  const message = `Hi, I saw your ad about "${adHeadline}". Is it available?`;
  return `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;
}

async function decrypt(encrypted: string, key: string): Promise<string> {
  // Handle versioned encryption (v2:IV:DATA format)
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    // Legacy format or plaintext
    return encrypted;
  }

  const [version, ivHex, encryptedHex] = parts;

  if (version !== "v1" && version !== "v2") {
    // Unrecognized version, assume plaintext
    return encrypted;
  }

  // Decrypt using AES-256-GCM
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const encryptedBytes = new Uint8Array(
    encryptedHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  // GCM mode includes auth tag in ciphertext
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}

async function markJobFailed(
  supabase: any,
  jobId: string,
  error: string,
  shouldRetry: boolean
) {
  const { data: job } = await supabase
    .from("job_queue")
    .select("attempts, max_attempts, type, payload")
    .eq("id", jobId)
    .single();

  if (!job) return;

  const newAttempts = job.attempts + 1;
  const exhausted = newAttempts >= job.max_attempts;

  if (exhausted || !shouldRetry) {
    // Move to DLQ
    await supabase.from("job_dlq").insert({
      job_id: jobId,
      type: job.type,
      payload: job.payload,
      error_message: error,
      attempts: newAttempts,
    });

    await supabase
      .from("job_queue")
      .update({
        status: "failed",
        last_error: error,
        attempts: newAttempts,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } else {
    // Retry with exponential backoff
    const backoffMs = Math.min(1000 * Math.pow(2, newAttempts), 300000);
    const retryAt = new Date(Date.now() + backoffMs);

    await supabase
      .from("job_queue")
      .update({
        status: "pending",
        last_error: error,
        attempts: newAttempts,
        updated_at: retryAt.toISOString(),
      })
      .eq("id", jobId);
  }
}
