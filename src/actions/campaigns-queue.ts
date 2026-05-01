/**
 * Queue-based Campaign Launch Action
 *
 * This is the new implementation that enqueues campaign launch jobs
 * instead of executing Meta API calls inline. Benefits:
 * - User gets instant feedback
 * - Automatic retries on transient errors
 * - Rollback capability if Meta API succeeds but DB fails
 * - Better error handling and monitoring
 *
 * Migration path:
 * 1. Deploy this file alongside existing campaigns.ts
 * 2. Test with feature flag (10% traffic)
 * 3. Increase to 100%
 * 4. Remove old launchCampaign from campaigns.ts
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getActiveOrgId } from "@/lib/active-org";
import { validatePreLaunch, validateDestinationUrl } from "@/lib/intelligence";
import { enqueueJob } from "@/lib/queue/job-queue";
import type { CTAData } from "@/types/cta-types";
import type { AdSyncObjective } from "@/lib/constants";

// ============================================================================
// Types
// ============================================================================

export interface LaunchConfig {
  name: string;
  objective: AdSyncObjective;
  budget: number; // In Naira
  platform: "meta" | "tiktok";
  metaPlacement?: "automatic" | "instagram" | "facebook";
  adCopy: {
    primary: string;
    headline: string;
    cta: CTAData | string;
  };
  creatives: string[]; // Supabase Storage URLs
  targetLocations: {
    id: string;
    name: string;
    type: string;
    country: string;
  }[];
  targetInterests: { id: string; name: string }[];
  targetBehaviors: { id: string; name: string }[];
  targetAgeRange: { min: number; max: number };
  targetGender: "all" | "male" | "female";
  targetLanguages?: number[]; // Meta locale IDs
  exclusionAudienceIds?: string[];
  targetLifeEvents?: { id: string; name: string }[];
  destinationValue: string; // Phone number or URL
  aiContext?: any;
  businessDescription?: string;
  campaignId?: string; // Optional: Update existing draft instead of creating new
  // Objective-specific fields
  leadGenFormId?: string; // leads objective
  appStoreUrl?: string; // app_promotion objective
  metaApplicationId?: string; // app_promotion objective
}

// ============================================================================
// Main Launch Function
// ============================================================================

/**
 * Enqueues a campaign launch job (new queue-based implementation)
 *
 * @param config Campaign configuration
 * @returns Object with success status, campaign ID, job ID, and queue status
 */
export async function launchCampaignQueued(config: LaunchConfig) {
  console.log("🚀 [Queue] Launching campaign:", config.name);
  const supabase = await createClient();

  // ── 1. AUTH & USER CHECK ──────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // ── 2. ORGANIZATION & SUBSCRIPTION CHECK ──────────────────────────────
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  const [{ data: org }, { data: userSub }] = await Promise.all([
    supabase
      .from("organizations")
      .select("country_code")
      .eq("id", orgId)
      .single(),
    supabase
      .from("user_subscriptions")
      .select("subscription_status, subscription_expires_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!org) {
    throw new Error("No organization found");
  }

  const subStatus = userSub?.subscription_status ?? "incomplete";

  // 🛑 GATEKEEPER: Check Subscription
  if (subStatus !== "active" && subStatus !== "trialing") {
    throw new Error(
      "Your subscription has expired. Please renew to launch campaigns.",
    );
  }

  if (subStatus === "trialing" && userSub?.subscription_expires_at) {
    if (new Date(userSub.subscription_expires_at).getTime() < Date.now()) {
      throw new Error(
        "Your free trial has expired. Please upgrade to launch campaigns.",
      );
    }
  }

  // ── 3. PRE-LAUNCH VALIDATION (Intelligence Layer) ─────────────────────

  // Fetch history for intelligence context
  const { data: campaignHistory } = await supabase
    .from("campaigns")
    .select("id, summary")
    .eq("organization_id", orgId);

  const campaignCount = campaignHistory?.length || 0;
  const totalHistoricalSpend =
    campaignHistory?.reduce((sum, camp) => {
      const spend = (camp as any).summary?.spend || 0;
      return sum + spend;
    }, 0) || 0;

  // Run validation rules
  const validation = validatePreLaunch({
    name: config.name,
    objective: config.objective,
    budget: config.budget,
    platform: config.platform,
    destinationValue: config.destinationValue || "",
    creatives: config.creatives,
    targetInterests: config.targetInterests,
    targetLocations: config.targetLocations,
    totalHistoricalSpend,
    campaignCount,
    adCopy: [config.adCopy.headline, config.adCopy.primary],
  });

  console.log("🛡️ [Pre-Launch Validation]:", validation);

  if (!validation.canLaunch) {
    const firstError = validation.errors[0];
    throw new Error(firstError.message);
  }

  // ── 4. URL REACHABILITY CHECK (Async) ─────────────────────────────────
  if (config.objective !== "whatsapp" && config.destinationValue) {
    const urlIssue = await validateDestinationUrl(
      config.destinationValue,
      config.objective,
    );
    if (urlIssue && urlIssue.severity === "error") {
      throw new Error(urlIssue.message);
    } else if (urlIssue) {
      console.warn("⚠️ [URL Validation Warning]:", urlIssue.message);
    }
  }

  // ── 5. PLATFORM GATE ──────────────────────────────────────────────────
  if (config.platform === "tiktok") {
    return {
      success: false,
      error:
        "TikTok Ads are coming soon! We're building it for Phase 2. Please select Meta (FB & IG) to launch your campaign now.",
    };
  }

  // ── 6. GET AD ACCOUNT ─────────────────────────────────────────────────
  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", orgId)
    .eq("platform", config.platform)
    .eq("health_status", "healthy")
    .order("is_default", { ascending: false })
    .limit(1)
    .single();

  if (!adAccount) {
    throw new Error(`No connected ${config.platform} account found.`);
  }

  // ── 7. CREATE DRAFT CAMPAIGN (Immediately visible in UI) ─────────────
  const budgetInCents = config.budget * 100;

  const payload: any = {
    organization_id: orgId,
    ad_account_id: adAccount.id,
    platform: config.platform,
    name: config.name,
    objective: config.objective,
    status: "queuing", // NEW STATUS: indicates job is pending
    daily_budget_cents: budgetInCents,
    placement_type: config.metaPlacement ?? "automatic",
    targeting_snapshot: {
      locations: config.targetLocations,
      interests: config.targetInterests,
      behaviors: config.targetBehaviors,
      age: config.targetAgeRange,
      gender: config.targetGender,
      languages: config.targetLanguages,
      exclusions: config.exclusionAudienceIds,
      life_events: config.targetLifeEvents,
    },
    creative_snapshot: {
      creatives: config.creatives,
      ad_copy: config.adCopy,
      destination: config.destinationValue, // Store raw value, worker will process
    },
    ai_context: config.aiContext,
  };

  let dbCampaignId = config.campaignId;
  let dbError;

  if (dbCampaignId) {
    // Guard: don't re-queue a campaign that's already in-flight or live
    const { data: existing } = await supabase
      .from("campaigns")
      .select("status")
      .eq("id", dbCampaignId)
      .single();

    if (existing && existing.status && !["draft", "failed"].includes(existing.status)) {
      throw new Error(
        existing.status === "queuing"
          ? "This campaign is already queued for launch."
          : "This campaign has already been launched."
      );
    }

    // Update existing draft
    console.log(`[Queue] Updating existing draft campaign: ${dbCampaignId}`);
    const { error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", dbCampaignId)
      .eq("status", "draft"); // Only update if still draft

    dbError = error;
  } else {
    // Create new draft
    console.log("[Queue] Creating new campaign row");
    const { data, error } = await supabase
      .from("campaigns")
      .insert(payload)
      .select("id")
      .single();

    dbError = error;
    dbCampaignId = data?.id;
  }

  if (dbError) {
    console.error("[Queue] DB Insert Error:", dbError);
    throw new Error("Failed to create campaign draft");
  }

  // ── 8. ENQUEUE BACKGROUND JOB ─────────────────────────────────────────
  try {
    const jobId = await enqueueJob({
      type: "campaign_launch",
      payload: {
        campaignId: dbCampaignId,
        config, // Full launch config for worker
      },
      organizationId: orgId,
      userId: user.id,
      maxAttempts: 2, // Only retry once (Meta API operations are expensive)
    });

    console.log(`[Queue] ✅ Campaign ${dbCampaignId} enqueued as job ${jobId}`);

    revalidatePath("/campaigns");
    revalidateTag(`campaigns-${orgId}`, "minutes");
    revalidateTag(`dashboard-${orgId}`, "minutes");

    return {
      success: true,
      campaignId: dbCampaignId,
      jobId,
      status: "queuing",
      showPixelPrompt: config.objective === "traffic" || config.objective === "sales",
      message:
        "Campaign is being launched in the background. You'll be notified when it's ready.",
    };
  } catch (enqueueError: any) {
    console.error("[Queue] Failed to enqueue job:", enqueueError);

    console.log("dbCampaignId🔥", dbCampaignId);
    // Rollback: mark campaign as failed
    if (dbCampaignId) {
      await supabase
        .from("campaigns")
        .update({ status: "failed" })
        .eq("id", dbCampaignId);
    }

    throw new Error(`Failed to queue campaign launch: ${enqueueError.message}`);
  }
}

// ============================================================================
// Job Status Polling (for UI)
// ============================================================================

/**
 * Gets the current status of a campaign launch job
 * Call this from a useQuery hook to poll for updates
 */
export async function getCampaignJobStatus(campaignId: string) {
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status, platform_campaign_id")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return { status: "not_found", error: "Campaign not found" };
  }

  // If campaign has a platform_campaign_id, it successfully launched
  if (campaign.platform_campaign_id) {
    return {
      status: campaign.status, // "pending_review" or "active"
      launched: true,
      platform_campaign_id: campaign.platform_campaign_id,
    };
  }

  // Fetch associated job
  const { data: job } = await supabase
    .from("job_queue")
    .select("status, last_error, attempts, max_attempts")
    .eq("type", "campaign_launch")
    .contains("payload", { campaignId })
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!job) {
    return {
      status: campaign.status,
      launched: false,
      error: "Job not found",
    };
  }

  return {
    status: campaign.status,
    jobStatus: job.status,
    launched: false,
    error: job.last_error,
    attempts: job.attempts,
    maxAttempts: job.max_attempts,
  };
}

// ============================================================================
// Admin Helpers
// ============================================================================

/**
 * Retries a failed campaign launch job
 * (Call from admin UI after fixing the issue)
 */
export async function retryCampaignLaunch(campaignId: string) {
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, ad_accounts(*)")
    .eq("id", campaignId)
    .eq("status", "failed")
    .single();

  if (!campaign) {
    throw new Error("Campaign not found or not in failed state");
  }

  const orgId = await getActiveOrgId();
  if (!orgId || campaign.organization_id !== orgId) {
    throw new Error("Unauthorized");
  }

  // Reset status to queuing
  await supabase
    .from("campaigns")
    .update({ status: "queuing" })
    .eq("id", campaignId);

  // Re-enqueue job
  const jobId = await enqueueJob({
    type: "campaign_launch",
    payload: {
      campaignId,
      config: campaign.creative_snapshot, // Reconstruct config from snapshots
    },
    organizationId: orgId,
    maxAttempts: 2,
  });

  revalidatePath("/campaigns");
  revalidateTag(`campaigns-${orgId}`, "minutes");

  return { success: true, jobId };
}
