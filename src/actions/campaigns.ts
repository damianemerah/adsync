"use server";

import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { MetaService } from "@/lib/api/meta";
import { revalidatePath } from "next/cache";
import { generateWhatsAppLink } from "@/lib/utils";
import { AdSyncObjective } from "@/lib/constants";
import { sendNotification } from "@/lib/notifications";
import { getCampaignById } from "@/lib/api/campaigns";
import {
  generateAttributionToken,
  generatePixelToken,
  buildAttributionUrl,
} from "@/lib/attribution";
import { validatePreLaunch, validateDestinationUrl } from "@/lib/intelligence";
import { pickGeoStrategy } from "@/lib/utils/geo-strategy";
import { getActiveOrgId } from "@/lib/active-org";
import type { CTAData } from "@/types/cta-types";
import type { Database } from "@/types/supabase";

export async function fetchCampaignById(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS will handle organization checks within getCampaignById if it uses Supabase,
  // BUT getCampaignById in lib/api/campaigns.ts expects a SupabaseClient.
  // We pass the server-side client.
  return await getCampaignById(supabase, id);
}

interface LaunchConfig {
  name: string;
  objective: AdSyncObjective; // Uses the type from constants
  budget: number; // In Naira
  platform: "meta" | "tiktok";
  metaPlacement?: "automatic" | "instagram" | "facebook"; // Which Meta surfaces
  metaSubPlacements?: Record<string, string[]>; // The exact checked positions
  adCopy: {
    primary: string;
    headline: string;
    cta: CTAData | string; // Support both for safety, prefer CTAData
  };
  creatives: string[]; // List of URLs (Supabase Storage)
  targetLocations: {
    id: string;
    name: string;
    type: string;
    country: string;
  }[];
  targetInterests: { id: string; name: string }[];
  targetBehaviors: { id: string; name: string }[];
  targetAgeRange: { min: number; max: number }; // NEW
  targetGender: "all" | "male" | "female"; // NEW
  targetLanguages?: number[]; // Phase 1 targeting
  exclusionAudienceIds?: string[]; // Phase 1 targeting
  targetLifeEvents?: { id: string; name: string }[]; // Life events e.g. Newly Engaged, New Parents
  destinationValue: string; // The raw input (Phone or URL)
  aiContext: any; // Using any for now to avoid circular dependency, but should match CampaignContext
  businessDescription?: string; // [NEW] For AI context building
  campaignId?: string; // [NEW] Draft ID to update instead of creating a new row
}

export async function launchCampaign(config: LaunchConfig) {
  console.log("🚀 [Server Action] Launching campaign:", config.name);
  console.log("📦 [Launch Payload Received]:", JSON.stringify(config, null, 2));
  const supabase = await createClient();

  // 1. Auth & User Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Organization & Subscription Check
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

  const { data: org } = await supabase
    .from("organizations")
    .select("subscription_status")
    .eq("id", orgId)
    .single();

  if (!org) {
    throw new Error("No organization found");
  }

  const subStatus = org.subscription_status;

  // 🛑 GATEKEEPER: Check Subscription
  if (subStatus !== "active" && subStatus !== "trialing") {
    throw new Error(
      "Your subscription has expired. Please renew to launch campaigns.",
    );
  }

  // 🛑 INTEGRATION: Pre-Launch Validation (Intelligence Layer)

  // 2a. Fetch History for Intelligence Context
  // We need to know if this is a "Starter" account (low spend/history)
  const { data: campaignHistory } = await supabase
    .from("campaigns")
    .select("id, summary" as any) // Cast to avoid typed string validation error if types are stale
    .eq("organization_id", orgId);

  const campaignCount = campaignHistory?.length || 0;

  // Sum up total lifetime spend from all campaigns (using synced insights)
  const totalHistoricalSpend =
    campaignHistory?.reduce((sum, camp) => {
      // If summary is missing or null, default to 0
      const spend = (camp as any).summary?.spend || 0;
      return sum + spend;
    }, 0) || 0;

  // Ensures budget, creative, and phone numbers meet Nigerian benchmarks/rules
  const validation = validatePreLaunch({
    name: config.name,
    objective: config.objective,
    budget: config.budget,
    platform: config.platform,
    destinationValue: config.destinationValue || "", // Fallback to empty string if null/undefined
    creatives: config.creatives,
    targetInterests: config.targetInterests,
    targetLocations: config.targetLocations,
    // New Context
    totalHistoricalSpend,
    campaignCount,
    adCopy: [config.adCopy.headline, config.adCopy.primary],
  });

  console.log("🛡️ [Pre-Launch Validation Result]:", validation);

  if (!validation.canLaunch) {
    // Return the first blocking error to the UI
    const firstError = validation.errors[0];
    throw new Error(firstError.message);
  }

  // 🛑 INTEGRATION: Async URL Reachability Validation
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

  // 🚧 PHASE 2 GATE: TikTok is not yet supported.
  // The UI allows selecting TikTok but the backend only has MetaService.
  // Without this guard, TikTok campaigns would silently fall through to Meta API calls
  // and fail with a confusing Meta error instead of a clear message.
  if (config.platform === "tiktok") {
    return {
      success: false,
      error:
        "TikTok Ads are coming soon! We're building it for Phase 2. Please select Meta (FB & IG) to launch your campaign now.",
    };
  }

  // 3. Get Ad Account
  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", orgId as string)
    .eq("platform", config.platform)
    .eq("health_status", "healthy")
    .order("is_default", { ascending: false })
    .limit(1)
    .single();

  console.log(orgId, "orgId");
  console.log(adAccount, "adAccount");
  // console.log(adAccount?.health_status, "health_status")

  if (!adAccount)
    throw new Error(`No connected ${config.platform} account found.`);

  // 4. DATA PREPARATION

  // A. Format Destination URL
  let finalUrl = config.destinationValue;

  if (config.objective === "whatsapp") {
    // Generate deep link: https://wa.me/23480...?text=...
    // Normalise the phone number before generating the link:
    // - Strip all non-numeric characters
    // - If it starts with "0" (local Nigerian format), replace with "234"
    // - If it starts with "+", remove the "+"
    // - If it already starts with "234", leave it
    let rawPhone = config.destinationValue || "2348012345678";
    rawPhone = rawPhone.replace(/\D/g, ""); // strip spaces, dashes, +
    if (rawPhone.startsWith("0")) {
      rawPhone = "234" + rawPhone.slice(1);
    } else if (!rawPhone.startsWith("234")) {
      rawPhone = "234" + rawPhone; // assume missing country code
    }
    const defaultMessage = `Hi, I saw your ad about "${config.adCopy.headline}". Is it available?`;
    const whatsappUrl = generateWhatsAppLink(rawPhone, defaultMessage);
    finalUrl = whatsappUrl;

    // -- Attribution: wrap the WhatsApp link in a trackable redirect --
    // If this fails, we silently fall back to the raw wa.me link (per code-conventions.md)
    try {
      const attrToken = generateAttributionToken();
      const { data: attrLink } = await supabase
        .from("attribution_links")
        .insert({
          token: attrToken,
          organization_id: orgId as string,
          destination_url: whatsappUrl,
          destination_type: "whatsapp",
          // campaign_id will be linked after the campaign DB row is created
        })
        .select("id, token")
        .single();

      if (attrLink) {
        // Skip replacing finalUrl in local dev because Meta API rejects localhost URLs
        const isLocalhost =
          process.env.NODE_ENV === "development" ||
          process.env.NEXT_PUBLIC_APP_URL?.includes("localhost");

        if (!isLocalhost) {
          finalUrl = buildAttributionUrl(attrLink.token);
          console.log("✅ Attribution link created:", finalUrl);
        } else {
          console.log(
            "⏭️ Skipping attribution URL replacement in local dev to avoid Meta API rejection.",
          );
        }
        // Stash the link ID so we can attach campaign_id later
        (config as any)._attributionLinkId = attrLink.id;
      }
    } catch (attrError) {
      console.warn(
        "⚠️ Attribution link creation failed (non-critical):",
        attrError,
      );
      // finalUrl remains the raw whatsappUrl — zero impact on launch
    }
  } else {
    // Ensure Website URL has protocol
    if (finalUrl && !finalUrl.startsWith("http")) {
      finalUrl = `https://${finalUrl}`;
    }
    // Fallback
    if (!finalUrl) finalUrl = "https://google.com";

    // -- Attribution: wrap the website link in a trackable redirect --
    const websiteUrl = finalUrl;
    try {
      const attrToken = generateAttributionToken();
      const pixelToken = generatePixelToken();
      const { data: attrLink } = await supabase
        .from("attribution_links")
        .insert({
          token: attrToken,
          organization_id: orgId as string,
          destination_url: websiteUrl,
          destination_type: "website",
          pixel_token: pixelToken,
        })
        .select("id, token")
        .single();

      if (attrLink) {
        // Skip replacing finalUrl in local dev because Meta API rejects localhost URLs
        const isLocalhost =
          process.env.NODE_ENV === "development" ||
          process.env.NEXT_PUBLIC_APP_URL?.includes("localhost");

        if (!isLocalhost) {
          finalUrl = buildAttributionUrl(attrLink.token);
          console.log("✅ Attribution link created (website):", finalUrl);
        } else {
          console.log(
            "⏭️ Skipping attribution URL replacement (website) in local dev to avoid Meta API rejection.",
          );
        }
        (config as any)._attributionLinkId = attrLink.id;
      }
    } catch (attrError) {
      console.warn(
        "⚠️ Website attribution link creation failed (non-critical):",
        attrError,
      );
      // finalUrl remains the raw websiteUrl — zero impact on launch
    }
  }

  // B. Budget to Cents
  const budgetInCents = config.budget * 100;

  try {
    const accessToken = decrypt(adAccount.access_token);
    const adAccountId = adAccount.platform_account_id;

    // 5. META API CHAIN

    // Step A: Find Facebook Page ID
    // We need a Page to represent the business in the ad
    const pages = await MetaService.request(
      "/me/accounts?fields=id,name",
      "GET",
      accessToken,
    );
    if (!pages.data?.length)
      throw new Error("No Facebook Page found. Please create one on Facebook.");
    const pageId = pages.data[0].id;

    // Step B: Prepare Targeting Objects
    // Now we use the stored IDs directly

    const validatedInterests = config.targetInterests
      .filter((i) => /^\d+$/.test(i.id))
      .map((i) => ({
        id: i.id,
        name: i.name,
      }));

    const validatedBehaviors = config.targetBehaviors
      .filter((b) => /^\d+$/.test(b.id))
      .map((b) => ({
        id: b.id,
        name: b.name,
      }));

    // Step C: Objective-aware Geo Strategy
    // pickGeoStrategy() is the server-side source of truth — overrides anything the AI suggested.
    const geoStrategy = pickGeoStrategy(config.objective);
    const geo_locations: any = {};

    if (geoStrategy.type === "broad") {
      // Awareness / Engagement: prefer regions (states), else fall back to country NG
      // Broad geo → better CPM efficiency and correct reach for brand awareness objectives.
      const regions = config.targetLocations
        .filter((l) => l.type === "region")
        .map((l) => ({ key: l.id }));

      if (regions.length > 0) {
        geo_locations.regions = regions;
      } else {
        // No region IDs — target entire Nigeria (safest broad fallback)
        geo_locations.countries = ["NG"];
      }
    } else {
      // Conversion (whatsapp / traffic): city-level, 10km, residents only
      // 10km covers typical urban delivery/service area without wasting spend on tourists.
      const cities = config.targetLocations
        .filter((l) => l.type === "city")
        .map((l) => ({
          key: l.id,
          radius: geoStrategy.radius_km,
          distance_unit: "kilometer",
        }));

      if (cities.length === 0) {
        // No city IDs stored — use Lagos safe fallback (matches LAGOS_DEFAULT in targeting-resolver.ts)
        cities.push({ key: "2420605", radius: 17, distance_unit: "kilometer" });
      }

      geo_locations.cities = cities;
    }

    // Note: location_types was removed in Meta v24 — Meta now targets
    // "living or recently in" by default and rejects the field.

    console.log(
      "🌍 [Geo Locations Payload]:",
      JSON.stringify(geo_locations, null, 2),
    );

    console.log("⚙️ [Config Data Checkpoint]:", config);

    // Step D: Create Campaign Container
    // MetaService handles mapping 'whatsapp' -> 'OUTCOME_TRAFFIC'
    const campaignRes = await MetaService.createCampaign(
      accessToken,
      adAccountId,
      config.name,
      config.objective,
    );

    console.log("🏗️ [Meta API - Campaign Created]:", campaignRes);

    // Step E: Create Ad Set (Targeting & Budget)
    // Pass `objective` so MetaService can resolve the correct optimization_goal.
    // Pass `pageId` so MetaService can include promoted_object for engagement campaigns.
    // Pass `metaPlacement` so MetaService applies publisher_platforms constraints.
    const adSetRes = await MetaService.createAdSet(
      accessToken,
      adAccountId,
      campaignRes.id,
      {
        name: config.name,
        dailyBudget: budgetInCents,
        pageId, // Needed for engagement promoted_object
        targeting: {
          geo_locations,
          interests: validatedInterests,
          behaviors: validatedBehaviors,
          age_min: config.targetAgeRange.min,
          age_max: config.targetAgeRange.max,
          gender: config.targetGender,
          locales: config.targetLanguages,
          exclusionAudienceIds: config.exclusionAudienceIds,
          lifeEvents: config.targetLifeEvents,
          metaSubPlacements: config.metaSubPlacements,
        },
      },
      config.objective,
      config.metaPlacement ?? "automatic", // Surface targeting
    );

    console.log("🎯 [Meta API - Ad Set Created]:", adSetRes);

    // Step F: Upload Image (Binary)
    // We take the first creative from the list (MVP Single Image)
    const imageRes = await MetaService.createAdImage(
      accessToken,
      adAccountId,
      config.creatives[0],
    );

    console.log("🖼️ [Meta API - Image Uploaded]:", imageRes);

    // Extract Image Hash
    const imageKey = Object.keys(imageRes.images)[0];
    const imageHash = imageRes.images[imageKey].hash;

    // Step G: Create Ad Creative & Ad
    const adRes = await MetaService.createAd(
      accessToken,
      adAccountId,
      adSetRes.id,
      imageHash,
      {
        pageId,
        primaryText: config.adCopy.primary,
        headline: config.adCopy.headline,
        destinationUrl: finalUrl, // The processed WhatsApp or Website link
      },
      // Pass platform code if available (CTAData), else fallback to string or default
      typeof config.adCopy.cta === "object" && config.adCopy.cta.platformCode
        ? config.adCopy.cta.platformCode
        : typeof config.adCopy.cta === "string"
          ? config.adCopy.cta
          : undefined,
      config.objective, // Pass objective so createAd builds correct WhatsApp CTA
    );

    console.log("📣 [Meta API - Ad Creative/Ad Created]:", adRes);

    // 6. SAVE TO DATABASE
    const payload = {
      organization_id: orgId,
      ad_account_id: adAccount.id,
      platform: config.platform,
      platform_campaign_id: campaignRes.id,
      name: config.name,
      objective: config.objective,
      status: "active", // It's created as 'PAUSED' on FB, but 'active' in our list means 'created'
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
        destination: finalUrl,
      } as any,
      ai_context: config.aiContext,
    };

    let dbCampaignId = config.campaignId;
    let savedCampaign;
    let dbError;

    if (dbCampaignId) {
      console.log(`Updating existing draft campaign: ${dbCampaignId}`);
      const { data, error } = await supabase
        .from("campaigns")
        .update(payload)
        .eq("id", dbCampaignId)
        .select("id")
        .single();
      savedCampaign = data;
      dbError = error;
    } else {
      console.log("Creating new campaign row");
      const { data, error } = await supabase
        .from("campaigns")
        .insert(payload)
        .select("id")
        .single();
      savedCampaign = data;
      dbError = error;
      dbCampaignId = data?.id;
    }

    if (dbError) {
      console.error("DB Insert Error (CRITICAL):", dbError);
      // We launched on Meta, but failed to save to DB.
      // Ideally, we should rollback (delete from Meta), but for now, let's just throw
      // so the user knows to "Sync" later.
      throw new Error(
        "Campaign launched on Meta, but failed to save globally. Please refresh or use 'Sync Campaigns'.",
      );
    }

    // 6b. LINK ATTRIBUTION — attach campaign_id to the attribution link
    const attributionLinkId = (config as any)._attributionLinkId;
    if (attributionLinkId && dbCampaignId) {
      // Fire-and-forget: don't block on this
      supabase
        .from("attribution_links")
        .update({ campaign_id: dbCampaignId })
        .eq("id", attributionLinkId)
        .then(({ error }) => {
          if (error)
            console.warn("⚠️ Failed to link attribution to campaign:", error);
          else
            console.log("✅ Attribution link tied to campaign:", dbCampaignId);
        });
    }

    // 7. BUILD AND SAVE AI CONTEXT (for context-aware generation)
    // This enables Studio to auto-enrich prompts with campaign data
    try {
      const aiContext = {
        businessDescription: config.businessDescription || config.name,
        targeting: {
          interests: config.targetInterests,
          behaviors: config.targetBehaviors,
          locations: config.targetLocations,
          demographics: {
            age_min: config.targetAgeRange.min,
            age_max: config.targetAgeRange.max,
            gender: config.targetGender,
          },
        },
        copy: {
          headline: config.adCopy.headline,
          bodyCopy: config.adCopy.primary,
        },
        platform: config.platform,
        objective: config.objective,
        metaSubPlacements: config.metaSubPlacements, // [NEW] Save user's specific sub-placements for studio
      };

      console.log("AI Context:", aiContext);

      // Save context to campaign (non-blocking - don't fail launch if this fails)
      if (dbCampaignId) {
        const { error: contextError } = await supabase
          .from("campaigns")
          .update({ ai_context: aiContext })
          .eq("id", dbCampaignId);

        if (contextError) {
          console.warn(
            "⚠️ Failed to save AI context (non-critical):",
            contextError,
          );
        } else {
          console.log("✅ Saved AI context for campaign:", config.name);
        }
      }
    } catch (contextError) {
      // Context saving failed - log but don't fail the launch
      console.warn("⚠️ AI context save error (non-critical):", contextError);
    }

    await sendNotification({
      userId: user.id,
      organizationId: orgId as string,
      title: "Campaign Launched",
      message: `Your campaign "${config.name}" has been sent to Meta for review.`,
      type: "success",
      category: "campaign",
      actionUrl: `/campaigns`,
      actionLabel: "View Campaigns",
    });

    revalidatePath("/campaigns");
    return {
      success: true,
      campaignId: campaignRes.id, // Meta platform ID
      dbCampaignId, // Database ID for redirects
      showPixelPrompt: config.objective === "traffic", // Signal UI to show snippet alert
    };
  } catch (error: any) {
    console.error("Launch Error:", error);

    // [INTEGRATION] Handle Meta "No Payment Method" Error
    if (error.subcode === 1359188) {
      console.log(
        "💳 Detected Meta missing payment method error, sending notification...",
      );
      try {
        // Find owner ID to send the notification
        const { data: owner } = await supabase
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", orgId)
          .eq("role", "owner")
          .limit(1);

        if (owner && owner.length > 0) {
          await sendNotification({
            userId: owner[0].user_id as string,
            organizationId: orgId as string,
            title: "Payment Method Required",
            message:
              "Your Meta Ad Account requires a valid payment method before launching campaigns.",
            type: "critical",
            category: "budget",
            actionUrl: "/ad-accounts",
            actionLabel: "Fix Account",
          });
        }

        await supabase
          .from("ad_accounts")
          .update({ health_status: "payment_issue" })
          .eq("id", adAccount.id);
      } catch (notifyErr) {
        console.error("⚠️ Failed to send payment notification:", notifyErr);
      }
    }

    // Return error message to UI
    return {
      success: false,
      error: error.message || "Failed to launch campaign",
    };
  }
}

export async function syncCampaigns(adAccountId: string) {
  const supabase = await createClient();

  // 1. Get Access Token for the Account
  // We need to look up the ad_account by its DB ID or Platform ID?
  // The UI usually passes the DB ID (UUID) of the ad_account.
  // Let's assume adAccountId is the UUID.

  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("id", adAccountId)
    .single();

  if (!adAccount) throw new Error("Ad Account not found");

  try {
    const token = decrypt(adAccount.access_token);
    const platformAccountId = adAccount.platform_account_id;

    // 2. Fetch from Meta
    const metaCampaigns = await MetaService.getCampaigns(
      token,
      platformAccountId,
    );

    console.log(`Fetched ${metaCampaigns.length} campaigns from Meta`);

    // 3. Upsert to DB
    const campaignsToUpsert = metaCampaigns.map((mc: any) => ({
      organization_id: adAccount.organization_id,
      ad_account_id: adAccount.id,
      platform: adAccount.platform,
      platform_campaign_id: mc.id,
      name: mc.name,
      objective: mc.objective.toLowerCase(), // Meta returns UPPERCASE usually
      status: mc.status.toLowerCase(),
      daily_budget_cents: mc.daily_budget
        ? parseInt(mc.daily_budget)
        : undefined,
      // We don't have targeting/creative snapshots for imported ones readily available
      // unless we fetch details. For now, leave null.
    })) as Database["public"]["Tables"]["campaigns"]["Insert"][];

    if (campaignsToUpsert.length > 0) {
      const { error } = await supabase.from("campaigns").upsert(
        campaignsToUpsert,
        { onConflict: "platform_campaign_id" }, // Make sure we have a unique constraint on this col!
      );

      if (error) console.error("Sync Upsert Error:", error);
    }

    revalidatePath("/campaigns");
    return { success: true, count: campaignsToUpsert.length };
  } catch (error: any) {
    console.error("Sync Error:", error);
    return { success: false, error: error.message };
  }
}

// Add this new Action
export async function updateCampaignStatus(
  campaignId: string,
  action: "PAUSED" | "ACTIVE" | "ARCHIVED",
) {
  const supabase = await createClient();

  // 1. Get Campaign & Token
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      ad_accounts (
        platform_account_id,
        access_token
      )
    `,
    )
    .eq("id", campaignId)
    .single();

  if (!campaign || !campaign.ad_accounts) throw new Error("Campaign not found");

  try {
    const token = decrypt(campaign.ad_accounts.access_token);
    const metaId = campaign.platform_campaign_id;

    // 2. Call Meta API
    // DELETE for Archive, POST for Status Update
    if (action === "ARCHIVED") {
      await MetaService.request(`/${metaId}`, "DELETE", token);

      // DB: Delete row (or soft delete if you prefer)
      await supabase.from("campaigns").delete().eq("id", campaignId);
    } else {
      await MetaService.request(`/${metaId}`, "POST", token, {
        status: action,
      });

      // DB: Update Status
      await supabase
        .from("campaigns")
        .update({
          status: action.toLowerCase(),
        })
        .eq("id", campaignId);
    }

    revalidatePath("/campaigns");
    return { success: true };
  } catch (error: any) {
    console.error("Campaign Update Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync detailed performance insights for a campaign
 * Fetches last 30 days of daily metrics from Meta API
 */
export async function syncCampaignInsights(campaignId: string) {
  const supabase = await createClient();

  // Get campaign and account
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      ad_accounts (
        platform_account_id,
        access_token
      )
    `,
    )
    .eq("id", campaignId)
    .single();

  if (!campaign || !campaign.ad_accounts) throw new Error("Campaign not found");

  try {
    const token = decrypt(campaign.ad_accounts.access_token);
    const metaId = campaign.platform_campaign_id;

    // Fetch insights for last 30 days with daily breakdown
    const insightsRes = await MetaService.request(
      `/${metaId}/insights?date_preset=last_30d&time_increment=1&fields=spend,impressions,clicks,reach,ctr,cpc,date_start`,
      "GET",
      token,
    );

    if (!insightsRes.data || insightsRes.data.length === 0) {
      return { success: true, count: 0, message: "No insights data available" };
    }

    // Process insights into performance array
    const performanceData = insightsRes.data.map((day: any) => ({
      date: day.date_start,
      spend: parseFloat(day.spend || "0"),
      impressions: parseInt(day.impressions || "0"),
      clicks: parseInt(day.clicks || "0"),
      reach: parseInt(day.reach || "0"),
      ctr: parseFloat(day.ctr || "0"),
      cpc: parseFloat(day.cpc || "0"),
    }));

    // Calculate summary
    const summary = performanceData.reduce(
      (acc: any, day: any) => ({
        spend: acc.spend + day.spend,
        impressions: acc.impressions + day.impressions,
        clicks: acc.clicks + day.clicks,
        reach: acc.reach + day.reach,
      }),
      { spend: 0, impressions: 0, clicks: 0, reach: 0 },
    );

    summary.ctr =
      summary.impressions > 0
        ? (summary.clicks / summary.impressions) * 100
        : 0;
    summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0;

    // Update campaign with performance data
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        performance: performanceData,
        summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (updateError) throw updateError;

    return {
      success: true,
      count: performanceData.length,
      summary,
    };
  } catch (error: any) {
    console.error("Sync Insights Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync ads for a campaign from Meta API
 * Fetches ad creative URLs and metrics
 */
export async function syncCampaignAds(campaignId: string) {
  const supabase = await createClient();

  // Get campaign and account
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      ad_accounts (
        platform_account_id,
        access_token
      )
    `,
    )
    .eq("id", campaignId)
    .single();

  if (!campaign || !campaign.ad_accounts) throw new Error("Campaign not found");

  try {
    const token = decrypt(campaign.ad_accounts.access_token);
    const metaId = campaign.platform_campaign_id;

    // Fetch ads for this campaign
    const adsRes = await MetaService.request(
      `/${metaId}/ads?fields=id,name,status,creative{image_url,thumbnail_url,object_story_spec},insights{spend,impressions,clicks,ctr}`,
      "GET",
      token,
    );

    if (!adsRes.data || adsRes.data.length === 0) {
      return { success: true, count: 0, message: "No ads found" };
    }

    // Process ads
    const adsData = adsRes.data.map((ad: any) => {
      const insights = ad.insights?.data?.[0] || {};
      const imageUrl =
        ad.creative?.image_url ||
        ad.creative?.thumbnail_url ||
        ad.creative?.object_story_spec?.video_data?.image_url ||
        ad.creative?.object_story_spec?.link_data?.image_hash;

      return {
        id: ad.id,
        name: ad.name,
        status: ad.status,
        image: imageUrl,
        spend: parseFloat(insights.spend || "0"),
        impressions: parseInt(insights.impressions || "0"),
        clicks: parseInt(insights.clicks || "0"),
        ctr: parseFloat(insights.ctr || "0"),
      };
    });

    // Update campaign with ads data
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        ads: adsData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (updateError) throw updateError;

    return {
      success: true,
      count: adsData.length,
    };
  } catch (error: any) {
    console.error("Sync Ads Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * [NEW] Fetch granular sub-placement insights from Meta
 * Powers the "Revenue by Surface" dashboard widget
 */
export async function getCampaignPlacementInsights(campaignId: string) {
  const supabase = await createClient();

  // Get campaign and account
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      `
      *,
      ad_accounts (
        platform_account_id,
        access_token
      )
    `,
    )
    .eq("id", campaignId)
    .single();

  if (!campaign || !campaign.ad_accounts) throw new Error("Campaign not found");

  try {
    const token = decrypt(campaign.ad_accounts.access_token);
    const metaId = campaign.platform_campaign_id;
    if (!metaId) throw new Error("Campaign has no Meta ID");

    // Fetch placement insights
    const res = await MetaService.getPlacementInsights(token, metaId);

    if (!res.data || res.data.length === 0) {
      return { success: true, data: [] };
    }

    return {
      success: true,
      data: res.data,
    };
  } catch (error: any) {
    console.error("Sync Placement Insights Error:", error);
    return { success: false, error: error.message };
  }
}
