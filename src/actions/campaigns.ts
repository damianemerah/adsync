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
import {
  allLocationsUnsupportedForCityTargeting,
  getFallbackCountryCodes,
} from "@/lib/constants/geo-targeting";
import { getActiveOrgId } from "@/lib/active-org";
import type { CTAData } from "@/types/cta-types";
import type { Database } from "@/types/supabase";
import { handleMetaError, getUserErrorDisplay } from "@/lib/meta-error-handler";
import { isMetaAPIError } from "@/types/meta-errors";

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
  targetWorkPositions?: { id: string; name: string }[]; // Work positions e.g. Manager, Director
  targetIndustries?: { id: string; name: string }[]; // Industry sectors e.g. Management, Healthcare
  targetingMode?: "b2b" | "b2c" | "broad"; // AI-classified campaign intent — drives signal density caps
  destinationValue: string; // The raw input (Phone or URL)
  aiContext: any; // Using any for now to avoid circular dependency, but should match CampaignContext
  businessDescription?: string; // [NEW] For AI context building
  campaignId?: string; // [NEW] Draft ID to update instead of creating a new row
  adAccountId?: string; // [NEW] DB UUID of the ad account to use — defaults to org's default account
  // Objective-specific fields
  leadGenFormId?: string; // leads: Meta Lead Gen Form ID
  appStoreUrl?: string; // app_promotion: Play Store or App Store URL
  metaApplicationId?: string; // app_promotion: Meta App ID
  // Carousel support (2-10 cards)
  carouselCards?: Array<{
    imageUrl: string;
    headline: string;
    description?: string;
    link?: string;
  }>;
}

function isVideoCreative(url: string): boolean {
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"];
  const lower = url.toLowerCase().split("?")[0]; // strip query params
  return videoExtensions.some((ext) => lower.endsWith(ext));
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
    .select("subscription_status, subscription_expires_at, country_code")
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

  if (subStatus === "trialing" && org.subscription_expires_at) {
    if (new Date(org.subscription_expires_at).getTime() < Date.now()) {
      throw new Error(
        "Your free trial has expired. Please upgrade to launch campaigns.",
      );
    }
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

  // 3. Get Ad Account — use explicit selection if provided, else pick the default
  const adAccountQuery = supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", orgId as string)
    .eq("platform", config.platform)
    .eq("health_status", "healthy");

  if (config.adAccountId) {
    adAccountQuery.eq("id", config.adAccountId);
  } else {
    adAccountQuery.order("is_default", { ascending: false });
  }

  const { data: adAccount } = await adAccountQuery.limit(1).single();

  console.log(orgId, "orgId");
  console.log(adAccount, "adAccount");
  // console.log(adAccount?.health_status, "health_status")

  if (!adAccount)
    throw new Error(`No connected ${config.platform} account found.`);

  // 4. DATA PREPARATION

  // A. Format Destination URL
  let finalUrl = config.destinationValue;

  if (config.objective === "whatsapp") {
    // ... existing whatsapp attribution block unchanged ...
    const orgCountryCode = org.country_code ?? "NG";
    let rawPhone = config.destinationValue || "2348012345678";
    rawPhone = rawPhone.replace(/\D/g, ""); // strip spaces, dashes, +
    if (orgCountryCode === "NG") {
      if (rawPhone.startsWith("0")) {
        rawPhone = "234" + rawPhone.slice(1);
      } else if (!rawPhone.startsWith("234")) {
        rawPhone = "234" + rawPhone; // assume missing country code
      }
    }
    const defaultMessage = `Hi, I saw your ad about "${config.adCopy.headline}". Is it available?`;
    const whatsappUrl = generateWhatsAppLink(
      rawPhone,
      defaultMessage,
      orgCountryCode,
    );
    finalUrl = whatsappUrl;

    try {
      const attrToken = generateAttributionToken();
      const { data: attrLink } = await supabase
        .from("attribution_links")
        .insert({
          token: attrToken,
          organization_id: orgId as string,
          destination_url: whatsappUrl,
          destination_type: "whatsapp",
        })
        .select("id, token")
        .single();

      if (attrLink) {
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
        (config as any)._attributionLinkId = attrLink.id;
      }
    } catch (attrError) {
      console.warn(
        "⚠️ Attribution link creation failed (non-critical):",
        attrError,
      );
    }
  } else if (config.objective === "leads") {
    // Lead Ads: Meta handles the form in-app — no destination URL or attribution link needed
    finalUrl = "";
    console.log(
      "📋 [Launch] Leads objective — skipping attribution link (no destination URL)",
    );
  } else {
    // Website / Sales / Traffic / Awareness / Engagement / App Promotion
    if (finalUrl && !finalUrl.startsWith("http")) {
      finalUrl = `https://${finalUrl}`;
    }
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

    const droppedInterests = config.targetInterests.filter(
      (i) => !/^\d+$/.test(i.id),
    );
    if (droppedInterests.length > 0) {
      console.warn(
        `[launch] Dropping ${droppedInterests.length} unresolved interests:`,
        droppedInterests.map((i) => i.name),
      );
    }

    const validatedInterests = config.targetInterests
      .filter((i) => /^\d+$/.test(i.id))
      .map((i) => ({
        id: i.id,
        name: i.name,
      }));

    const droppedBehaviors = config.targetBehaviors.filter(
      (b) => !/^\d+$/.test(b.id),
    );
    if (droppedBehaviors.length > 0) {
      console.warn(
        `[launch] Dropping ${droppedBehaviors.length} unresolved behaviors:`,
        droppedBehaviors.map((b) => b.name),
      );
    }

    const validatedBehaviors = config.targetBehaviors
      .filter((b) => /^\d+$/.test(b.id))
      .map((b) => ({
        id: b.id,
        name: b.name,
      }));

    // Signal caps are applied during Phase 2 resolution (audience-chat-step.tsx)
    // so users see exactly what Meta will receive in the summary panel.
    const validatedWorkPositions = (config.targetWorkPositions ?? [])
      .filter((p) => /^\d+$/.test(p.id));

    const validatedIndustries = (config.targetIndustries ?? [])
      .filter((i) => /^\d+$/.test(i.id));

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
      // Conversion (whatsapp / traffic): city-level, 17km radius, residents only.
      // NOTE: Some countries (e.g. Nigeria) don't support city targeting on Meta (error 1487479).
      // For those, we automatically fall back to country-level geo.
      const cities = config.targetLocations
        .filter((l) => l.type === "city")
        .map((l) => ({
          key: l.id,
          radius: geoStrategy.radius_km,
          distance_unit: "kilometer",
        }));

      if (allLocationsUnsupportedForCityTargeting(config.targetLocations)) {
        // Country doesn't support city targeting — fall back to country-level.
        const countryCodes = getFallbackCountryCodes(config.targetLocations);
        geo_locations.countries = countryCodes.length > 0 ? countryCodes : ["NG"];
      } else {
        if (cities.length === 0) {
          // No city IDs stored — use Lagos safe fallback (matches LAGOS_DEFAULT in targeting-resolver.ts)
          cities.push({ key: "2420605", radius: 17, distance_unit: "kilometer" });
        }
        geo_locations.cities = cities;
      }
    }

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
        pageId, // Needed for engagement/whatsapp promoted_object
        metaApplicationId: config.metaApplicationId, // app_promotion
        appStoreUrl: config.appStoreUrl, // app_promotion
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
          workPositions: validatedWorkPositions,
          industries: validatedIndustries,
        },
      },
      config.objective,
      config.metaPlacement ?? "automatic",
    );

    console.log("🎯 [Meta API - Ad Set Created]:", adSetRes);

    // Step F: Upload Images
    // Determine if this is a carousel (2+ cards) or single image ad
    const isCarousel = config.carouselCards && config.carouselCards.length >= 2;

    let imageHash: string | undefined;
    let videoId: string | undefined;
    let thumbnailUrl: string | null = null;
    let carouselImageData: Array<{
      imageHash: string;
      headline: string;
      description?: string;
      link?: string;
    }> = [];

    if (isCarousel && config.carouselCards) {
      // Carousel: Upload all images and build carousel cards
      console.log(
        `🎠 [Meta API - Uploading ${config.carouselCards.length} carousel images]`,
      );

      for (const card of config.carouselCards) {
        const imageRes = await MetaService.createAdImage(
          accessToken,
          adAccountId,
          card.imageUrl,
        );
        const imageKey = Object.keys(imageRes.images)[0];
        const hash = imageRes.images[imageKey].hash;

        carouselImageData.push({
          imageHash: hash,
          headline: card.headline,
          description: card.description,
          link: card.link,
        });
      }

      console.log(
        "🖼️ [Meta API - Carousel Images Uploaded]:",
        carouselImageData.length,
      );
    } else {
      const creativeUrl = config.creatives[0];

      if (isVideoCreative(creativeUrl)) {
        // Video creative path
        const videoRes = await MetaService.createAdVideo(
          accessToken,
          adAccountId,
          creativeUrl,
        );
        videoId = videoRes.id;
        console.log("🎬 [Meta API - Video Uploaded]:", videoRes);

        // Fetch Meta's auto-generated thumbnail — required by video_data (error_subcode 1443226)
        // Thumbnails may not be ready instantly; retry once with a short delay.
        thumbnailUrl = await MetaService.getVideoThumbnail(accessToken, videoId);
        if (!thumbnailUrl) {
          await new Promise((r) => setTimeout(r, 3000));
          thumbnailUrl = await MetaService.getVideoThumbnail(accessToken, videoId);
        }
        console.log("🖼️ [Meta API - Video Thumbnail]:", thumbnailUrl ?? "none");
      } else {
        // Image creative path
        const imageRes = await MetaService.createAdImage(
          accessToken,
          adAccountId,
          creativeUrl,
        );
        console.log("🖼️ [Meta API - Image Uploaded]:", imageRes);
        const imageKey = Object.keys(imageRes.images)[0];
        imageHash = imageRes.images[imageKey].hash;
      }
    }

    // Step G: Create Ad Creative & Ad
    const adRes = await MetaService.createAd(
      accessToken,
      adAccountId,
      adSetRes.id,
      isCarousel ? carouselImageData.map((c) => c.imageHash) : (imageHash ?? ""),
      {
        pageId,
        primaryText: config.adCopy.primary,
        headline: config.adCopy.headline,
        destinationUrl: finalUrl,
        leadGenFormId: config.leadGenFormId,
      },
      typeof config.adCopy.cta === "object" && config.adCopy.cta.platformCode
        ? config.adCopy.cta.platformCode
        : typeof config.adCopy.cta === "string"
          ? config.adCopy.cta
          : undefined,
      config.objective,
      isCarousel ? carouselImageData : undefined,
      videoId,
      thumbnailUrl,
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
      status: "pending_review", // Created as PAUSED on Meta while under review
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
        work_positions: config.targetWorkPositions,
        industries: config.targetIndustries,
      },
      creative_snapshot: {
        creatives: config.creatives,
        ad_copy: config.adCopy,
        destination: finalUrl,
        ...(isCarousel && { carousel_cards: config.carouselCards }),
      } as any,
      ai_context: config.aiContext,
      advantage_plus_config: { creative: true },
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
      campaignId: campaignRes.id,
      dbCampaignId,
      showPixelPrompt:
        config.objective === "traffic" || config.objective === "sales",
    };
  } catch (error: any) {
    console.error("Launch Error:", error);

    // Find owner ID for notifications
    const { data: owner } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("role", "owner")
      .limit(1)
      .single();

    // v25.0: Use enhanced error handler for Meta API errors
    if (isMetaAPIError(error)) {
      await handleMetaError(error, {
        userId: owner?.user_id || undefined,
        organizationId: orgId,
        supabase,
        adAccountId: adAccount.id,
      });
    }

    // Get user-facing error display (works for both Meta and non-Meta errors)
    const errorDisplay = getUserErrorDisplay(error);

    // Return enhanced error information to UI
    return {
      success: false,
      error: errorDisplay.message,
      errorDetails: errorDisplay, // v25.0: Include full error context for UI
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
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

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
    .eq("organization_id", orgId)
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
      // SECURITY: Always scope deletes to organization to prevent cross-tenant deletion
      await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId)
        .eq("organization_id", orgId);
    } else {
      // Meta requires Campaign + Ad Set + Ad to ALL be ACTIVE for delivery.
      // New campaigns are created with ACTIVE children (Campaign is the PAUSED kill-switch),
      // but campaigns launched under the old bug had PAUSED children — cascade fixes both.
      const metaStatus = action === "ACTIVE" ? "ACTIVE" : "PAUSED";

      // 2a. Update Campaign
      await MetaService.request(`/${metaId}`, "POST", token, { status: metaStatus });

      // 2b. Cascade to child Ad Sets and their Ads (fire sequentially — 1:1:1 rule)
      if (metaId) {
        try {
          const adSets = await MetaService.getCampaignAdSets(token, metaId);
          for (const adSet of adSets) {
            await MetaService.updateObjectStatus(token, adSet.id, metaStatus);
            // Cascade to Ads inside this Ad Set
            const ads = await MetaService.getAdSetAds(token, adSet.id);
            for (const ad of ads) {
              await MetaService.updateObjectStatus(token, ad.id, metaStatus);
            }
          }
          console.log(`✅ [Status] Cascaded ${metaStatus} to ${adSets.length} ad set(s) and their ads`);
        } catch (cascadeErr) {
          // Log but don't fail — the Campaign status itself succeeded
          console.warn("⚠️ [Status] Ad Set/Ad cascade failed (non-critical):", cascadeErr);
        }
      }

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
    return {
      success: false as const,
      error: error.message,
      metaSubcode: error.subcode as number | undefined,
      metaUserTitle: error.userTitle as string | undefined,
      metaUserMessage: error.userMessage as string | undefined,
    };
  }
}

/**
 * Duplicate a campaign as a new draft (without launching on Meta).
 * Copies all settings; clears metrics and platform_campaign_id.
 */
export async function duplicateCampaign(campaignId: string) {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return { success: false as const, error: "No organization found" };

  const { data: original, error: fetchError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("organization_id", orgId)
    .single();

  if (fetchError || !original) return { success: false as const, error: "Campaign not found" };

  const { data: newCampaign, error: insertError } = await supabase
    .from("campaigns")
    .insert({
      organization_id: original.organization_id,
      ad_account_id: original.ad_account_id,
      name: `${original.name} (Copy)`,
      objective: original.objective,
      platform: original.platform,
      daily_budget_cents: original.daily_budget_cents,
      placement_type: original.placement_type,
      targeting_profile_id: original.targeting_profile_id,
      targeting_snapshot: original.targeting_snapshot,
      creative_snapshot: original.creative_snapshot,
      ai_context: original.ai_context,
      ai_chat_snapshot: original.ai_chat_snapshot,
      advantage_plus_config: original.advantage_plus_config,
      uses_pixel_optimization: original.uses_pixel_optimization,
      status: "draft",
      platform_campaign_id: null,
    })
    .select("id")
    .single();

  if (insertError || !newCampaign) return { success: false as const, error: "Failed to duplicate campaign" };

  revalidatePath("/campaigns");
  return { success: true as const, campaignId: newCampaign.id };
}

/**
 * Sync detailed performance insights for a campaign
 * Fetches last 30 days of daily metrics from Meta API
 */
export async function syncCampaignInsights(campaignId: string) {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

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
    .eq("organization_id", orgId)
    .single();

  if (!campaign || !campaign.ad_accounts) throw new Error("Campaign not found");

  try {
    const token = decrypt(campaign.ad_accounts.access_token);
    const metaId = campaign.platform_campaign_id;

    // Fetch insights for the campaign's lifetime with daily breakdown.
    // Meta uses pagination for large date ranges, so we must loop to get all data.
    let insightsData: any[] = [];
    let nextUrl: string | null =
      `/${metaId}/insights?date_preset=maximum&time_increment=1&fields=spend,impressions,clicks,reach,ctr,cpc,date_start`;

    while (nextUrl) {
      // If nextUrl includes the graph URL root, strip it out so we can pass it to MetaService.request
      if (nextUrl.startsWith("https://graph.facebook.com")) {
        const urlObj = new URL(nextUrl);
        nextUrl = urlObj.pathname.replace("/v25.0", "") + urlObj.search;
      }

      const res = await MetaService.request(nextUrl, "GET", token);

      if (res.data && res.data.length > 0) {
        insightsData = [...insightsData, ...res.data];
      }

      // Check if there is another page of data
      if (res.paging && res.paging.next) {
        nextUrl = res.paging.next;
      } else {
        nextUrl = null; // Exit loop
      }
    }

    console.log(`insightsData length🔥: ${insightsData.length}`);

    if (insightsData.length === 0) {
      console.log("Returning early📧📧");
      return { success: true, count: 0, message: "No insights data available" };
    }

    // Process insights into performance array
    const performanceData = insightsData.map((day: any) => ({
      date: day.date_start,
      spend: parseFloat(day.spend || "0"),
      impressions: parseInt(day.impressions || "0"),
      clicks: parseInt(day.clicks || "0"),
      reach: parseInt(day.reach || "0"),
      ctr: parseFloat(day.ctr || "0"),
      cpc: parseFloat(day.cpc || "0"),
    }));

    console.log("performanceData🔥", performanceData);

    // Calculate summary
    const summary = performanceData.reduce(
      (acc: any, day: any) => ({
        spend: acc.spend + day.spend,
        impressions: acc.impressions + day.impressions,
        clicks: acc.clicks + day.clicks,
        reach: acc.reach + day.reach,
        ctr: 0,
        cpc: 0,
      }),
      { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpc: 0 },
    );

    summary.ctr =
      summary.impressions > 0
        ? (summary.clicks / summary.impressions) * 100
        : 0;
    summary.cpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0;

    // Step 1: Upsert daily rows to campaign_metrics
    const metricsRows = performanceData.map((day: any) => ({
      campaign_id: campaignId,
      date: day.date,
      spend_cents: Math.round(day.spend * 100),
      impressions: day.impressions,
      clicks: day.clicks,
      reach: day.reach,
      ctr: day.ctr,
      synced_at: new Date().toISOString(),
    }));

    console.log("metricsRows🔥", metricsRows);

    await supabase
      .from("campaign_metrics")
      .upsert(metricsRows, { onConflict: "campaign_id,date" });

    // Step 2: Update campaign summary row with real columns
    await supabase
      .from("campaigns")
      .update({
        spend_cents: Math.round(summary.spend * 100),
        impressions: summary.impressions,
        clicks: summary.clicks,
        ctr: summary.ctr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

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
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

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
    .eq("organization_id", orgId)
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

    return { success: true, count: adsData.length, ads: adsData };
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
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization found");

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
    .eq("organization_id", orgId)
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

/**
 * Upgrade a traffic campaign from OUTCOME_TRAFFIC to OUTCOME_SALES
 * when Meta Pixel is configured. This optimizes for conversions instead of clicks.
 *
 * IMPORTANT: Only works for campaigns with objective='traffic' that haven't been upgraded yet.
 */
export async function upgradeToPixelOptimization(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No organization");

  try {
    // 1. Fetch campaign with ad account details
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select(
        `
        id,
        objective,
        uses_pixel_optimization,
        platform_campaign_id,
        ad_accounts!inner(
          id,
          access_token,
          meta_pixel_id,
          capi_access_token
        )
      `
      )
      .eq("id", campaignId)
      .eq("organization_id", orgId)
      .single();

    if (campErr || !campaign) {
      throw new Error("Campaign not found");
    }

    // 2. Validate upgrade requirements
    if (campaign.objective !== "traffic") {
      throw new Error("Only Website Sales campaigns can be upgraded");
    }

    if (campaign.uses_pixel_optimization) {
      throw new Error("Campaign is already using pixel optimization");
    }

    if (
      !campaign.ad_accounts.meta_pixel_id ||
      !campaign.ad_accounts.capi_access_token
    ) {
      throw new Error(
        "Meta Pixel not configured. Please add your Pixel ID in Settings → Business."
      );
    }

    if (!campaign.platform_campaign_id) {
      throw new Error("Campaign not yet launched to Meta");
    }

    // 3. Decrypt access token
    const accessToken = decrypt(campaign.ad_accounts.access_token);

    // 4. Update Meta Campaign objective to OUTCOME_SALES
    await MetaService.request(
      `/${campaign.platform_campaign_id}`,
      "POST",
      accessToken,
      {
        objective: "OUTCOME_SALES",
      }
    );

    // 5. Get the ad set ID for this campaign
    const adSetRes = await MetaService.request(
      `/${campaign.platform_campaign_id}/adsets?fields=id,optimization_goal`,
      "GET",
      accessToken
    );

    if (!adSetRes.data || adSetRes.data.length === 0) {
      throw new Error("No ad set found for this campaign");
    }

    const adSetId = adSetRes.data[0].id;

    // 6. Update Ad Set optimization goal to OFFSITE_CONVERSIONS
    await MetaService.request(`/${adSetId}`, "POST", accessToken, {
      optimization_goal: "OFFSITE_CONVERSIONS",
    });

    // 7. Mark campaign as using pixel optimization in our DB
    const { error: updateErr } = await supabase
      .from("campaigns")
      .update({
        uses_pixel_optimization: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (updateErr) {
      console.error("Failed to update campaign flag:", updateErr);
      // Non-critical - Meta update succeeded, just log the error
    }

    // 8. Send success notification
    await sendNotification({
      userId: user.id,
      organizationId: orgId,
      type: "success",
      category: "campaign",
      title: "🎯 Campaign Upgraded!",
      message:
        "Your campaign now optimizes for purchases instead of clicks. You should see better conversion rates.",
      actionUrl: `/campaigns/${campaignId}`,
      actionLabel: "View Campaign",
    }, supabase);

    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${campaignId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Upgrade to Pixel Optimization Error:", error);

    // Handle Meta API errors gracefully
    if (isMetaAPIError(error)) {
      const display = getUserErrorDisplay(error);
      return {
        success: false,
        error: display.message,
      };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Hard-delete a campaign: Meta DELETE (if launched) + DB hard delete.
 * Irreversible — the campaign is permanently removed from Meta and Tenzu.
 * Draft campaigns (no platform_campaign_id) skip the Meta call.
 */
export async function deleteCampaign(campaignId: string) {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return { success: false as const, error: "No organization found" };

  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select(
      `
      id,
      name,
      platform_campaign_id,
      ad_accounts (
        access_token
      )
    `,
    )
    .eq("id", campaignId)
    .eq("organization_id", orgId)
    .single();

  if (fetchErr || !campaign) {
    return { success: false as const, error: "Campaign not found" };
  }

  try {
    // Step 1: Delete from Meta only if it was ever launched
    if (campaign.platform_campaign_id && campaign.ad_accounts?.access_token) {
      const token = decrypt(campaign.ad_accounts.access_token);
      try {
        await MetaService.deleteCampaign(token, campaign.platform_campaign_id);
        console.log(`🗑️ [Delete] Meta campaign ${campaign.platform_campaign_id} deleted`);
      } catch (metaErr: any) {
        // If Meta returns "does not exist" (code 100), it's already gone — safe to continue
        if (metaErr?.code !== 100) {
          console.warn("⚠️ [Delete] Meta deletion failed (non-fatal):", metaErr?.message);
        }
      }
    }

    // Step 2: Hard delete from DB
    const { error: deleteErr } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("organization_id", orgId);

    if (deleteErr) throw new Error(deleteErr.message);

    revalidatePath("/campaigns");
    return { success: true as const };
  } catch (error: any) {
    console.error("[deleteCampaign] Error:", error);
    return { success: false as const, error: error.message };
  }
}

/**
 * App-only soft archive: sets status='completed' in DB only.
 * The campaign remains on Meta untouched (still paused/active as it was).
 * Archived campaigns appear with "completed" status, hidden from active views.
 */
export async function archiveCampaign(campaignId: string) {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return { success: false as const, error: "No organization found" };

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("organization_id", orgId);

  if (error) {
    console.error("[archiveCampaign] DB Error:", error);
    return { success: false as const, error: error.message };
  }

  revalidatePath("/campaigns");
  return { success: true as const };
}

/**
 * Rename a campaign: updates name on Meta (if launched) + DB.
 * Name must be non-empty and ≤150 characters (Meta's limit).
 */
export async function renameCampaign(campaignId: string, newName: string) {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  if (!orgId) return { success: false as const, error: "No organization found" };

  const trimmedName = newName.trim();
  if (!trimmedName) return { success: false as const, error: "Name cannot be empty" };
  if (trimmedName.length > 150) return { success: false as const, error: "Name is too long (max 150 characters)" };

  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select(
      `
      id,
      platform_campaign_id,
      status,
      ad_accounts (
        access_token
      )
    `,
    )
    .eq("id", campaignId)
    .eq("organization_id", orgId)
    .single();

  if (fetchErr || !campaign) {
    return { success: false as const, error: "Campaign not found" };
  }

  try {
    // Step 1: Update on Meta if the campaign has been launched
    const isLaunched = !!campaign.platform_campaign_id && campaign.status !== "draft";
    if (isLaunched && campaign.ad_accounts?.access_token) {
      const token = decrypt(campaign.ad_accounts.access_token);
      try {
        await MetaService.renameCampaign(token, campaign.platform_campaign_id!, trimmedName);
        console.log(`✏️ [Rename] Meta campaign ${campaign.platform_campaign_id} renamed to "${trimmedName}"`);
      } catch (metaErr: any) {
        // Non-fatal: Meta may reject rename for deleted campaigns — continue with DB update
        console.warn("⚠️ [Rename] Meta rename failed (non-fatal):", metaErr?.message);
      }
    }

    // Step 2: Update in DB
    const { error: updateErr } = await supabase
      .from("campaigns")
      .update({ name: trimmedName, updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("organization_id", orgId);

    if (updateErr) throw new Error(updateErr.message);

    revalidatePath("/campaigns");
    return { success: true as const };
  } catch (error: any) {
    console.error("[renameCampaign] Error:", error);
    return { success: false as const, error: error.message };
  }
}
