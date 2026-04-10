const API_VERSION = "v25.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

import {
  CAMPAIGN_OBJECTIVES,
  AdSyncObjective,
  META_PLACEMENTS,
  MetaPlacement,
} from "@/lib/constants";
import { MetaAPIError, parseMetaError } from "@/types/meta-errors";

const getPlacementSpec = (placementId: MetaPlacement) => {
  const config = META_PLACEMENTS.find((p) => p.id === placementId);
  if (!config || config.id === "automatic") return {}; // Advantage+ — let Andromeda decide

  // Only restrict at publisher_platforms level — no instagram_positions/facebook_positions.
  // Meta's Andromeda ML delivers better ROI when given maximum placement freedom within a platform.
  return { publisher_platforms: config.publisherPlatforms };
};

/**
 * Build the Meta API targeting object.
 *
 * Separates hard controls (always enforced) from soft suggestions (Advantage+ treats
 * these as starting-point hints and can expand beyond them).
 *
 * Hard controls: geo_locations, age_min, age_max, locales, genders, exclusions, targeting_automation
 * Soft suggestions: interests, behaviors, life_events, work_positions, industries
 *
 * By the time this is called, signals have already been capped in campaigns.ts according
 * to the campaign's targeting_mode (b2b / b2c / broad). This function just assembles the payload.
 */
function buildTargetingPayload(
  targeting: any,
  placement: MetaPlacement,
): Record<string, unknown> {
  // --- Hard controls ---
  const hardControls: Record<string, unknown> = {
    geo_locations: targeting.geo_locations,
    age_min: targeting.age_min,
    // age_max must be 65 when advantage_audience: 1 — user's max becomes a soft suggestion only
    age_max: 65,
    targeting_automation: { advantage_audience: 1 },
  };

  if (targeting.locales?.length > 0)   hardControls.locales = targeting.locales;
  if (targeting.gender === "male")      hardControls.genders = [1];
  if (targeting.gender === "female")    hardControls.genders = [2];
  if (targeting.exclusionAudienceIds?.length > 0) {
    hardControls.exclusions = {
      custom_audiences: targeting.exclusionAudienceIds.map((id: string) => ({ id })),
    };
  }

  // --- Soft suggestions (Advantage+ treats as starting-point hints, not hard gates) ---
  const softSuggestions: Record<string, unknown> = {};

  if (targeting.interests?.length > 0)
    softSuggestions.interests = targeting.interests;
  if (targeting.behaviors?.length > 0)
    softSuggestions.behaviors = targeting.behaviors;
  if (targeting.lifeEvents?.length > 0) {
    softSuggestions.life_events = targeting.lifeEvents.map(
      (e: { id: string; name: string }) => ({ id: e.id, name: e.name }),
    );
  }
  if (targeting.workPositions?.length > 0) {
    softSuggestions.work_positions = targeting.workPositions.map(
      (p: { id: string; name: string }) => ({ id: p.id, name: p.name }),
    );
  }
  if (targeting.industries?.length > 0) {
    softSuggestions.industries = targeting.industries.map(
      (i: { id: string; name: string }) => ({ id: i.id, name: i.name }),
    );
  }

  return { ...hardControls, ...softSuggestions, ...getPlacementSpec(placement) };
}

// Maps AdSync objectives to the correct Meta optimization_goal for the Ad Set.
// Now driven by CAMPAIGN_OBJECTIVES constant.

export const MetaService = {
  // Generic Request Wrapper
  async request(
    endpoint: string,
    method: string,
    accessToken: string,
    body?: any,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Meta API request timed out after 30 seconds");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    const data = await res.json();

    if (data.error) {
      console.error("Meta API Error:", data.error);
      // v25.0: Enhanced error handling with user-friendly messages
      const metaError = parseMetaError(data.error);
      console.error("Parsed Meta Error:", metaError.toDebugInfo());
      throw metaError;
    }

    return data;
  },
  searchInterests: async (token: string, query: string) => {
    // Searches for interests like "Fashion" to get ID "600312329"
    const data = await MetaService.request(
      `/search?type=adinterest&q=${encodeURIComponent(query)}&limit=10`,
      "GET",
      token,
    );
    return data.data || [];
  },

  validateInterests: async (
    token: string,
    interestList: string[],
  ): Promise<Array<{ id: string; name: string; valid: boolean }>> => {
    // Validates whether interest names are valid in Meta's catalog and returns their IDs
    const encoded = encodeURIComponent(JSON.stringify(interestList));
    const data = await MetaService.request(
      `/search?type=adinterestvalid&interest_list=${encoded}&limit=25`,
      "GET",
      token,
    );
    return data.data || [];
  },

  suggestInterests: async (
    token: string,
    interestList: string[],
  ): Promise<Array<{ id: string; name: string; audience_size?: number }>> => {
    // Returns related interests based on interests the user has already selected
    const encoded = encodeURIComponent(JSON.stringify(interestList));
    const data = await MetaService.request(
      `/search?type=adinterestsuggestion&interest_list=${encoded}&limit=15`,
      "GET",
      token,
    );
    return data.data || [];
  },

  searchWorkPositions: async (
    token: string,
    query: string,
  ): Promise<Array<{ id: string; name: string }>> => {
    // Searches job titles / work positions for demographic targeting
    const data = await MetaService.request(
      `/search?type=adworkposition&q=${encodeURIComponent(query)}&limit=10`,
      "GET",
      token,
    );
    return data.data || [];
  },

  searchIndustries: async (
    token: string,
    adAccountId: string,
    query: string,
  ): Promise<Array<{ id: string; name: string }>> => {
    // Searches broad industry sectors for B2B demographic targeting
    const params = new URLSearchParams({
      type: "adTargetingCategory",
      class: "industries",
      q: query,
      limit: "10",
    });

    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    const data = await MetaService.request(
      `/${id}/targetingsearch?${params.toString()}`,
      "GET",
      token,
    );
    // Filter to only items that are actually industries — guards against cross-category results.
    return (data.data || []).filter(
      (item: any) => !item.type || item.type === "industries",
    );
  },

  searchBehaviors: async (
    token: string,
    adAccountId: string,
    query: string,
  ) => {
    // Browse all behaviors or search within category (query optional)
    const params = new URLSearchParams({
      type: "adTargetingCategory",
      class: "behaviors",
      q: query, // Filter by name
      limit: "10",
    });

    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    const data = await MetaService.request(
      `/${id}/targetingsearch?${params.toString()}`,
      "GET",
      token,
    );
    // Filter to only items that are actually behaviors — Meta's search can return
    // cross-category results (e.g. interests) even when class=behaviors is specified.
    return (data.data || []).filter(
      (item: any) => !item.type || item.type === "behaviors",
    );
  },

  searchLifeEvents: async (
    token: string,
    adAccountId: string,
    query: string,
  ) => {
    // Browse all life events or search within category (query optional)
    const params = new URLSearchParams({
      type: "adTargetingCategory",
      class: "life_events",
      q: query, // Filter by name
      limit: "10",
    });

    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    const data = await MetaService.request(
      `/${id}/targetingsearch?${params.toString()}`,
      "GET",
      token,
    );
    // Filter to only items that are actually life events — guards against cross-category results.
    return (data.data || []).filter(
      (item: any) => !item.type || item.type === "life_event",
    );
  },

  searchLocation: async (
    token: string,
    query: string,
    type: "city" | "region" | "country" = "region",
    countryCode?: string,
  ) => {
    const locationTypes = encodeURIComponent(JSON.stringify([type]));
    let url = `/search?type=adgeolocation&q=${encodeURIComponent(query)}&location_types=${locationTypes}&limit=10`;
    if (countryCode) url += `&country_code=${countryCode}`;
    const data = await MetaService.request(url, "GET", token);
    return data.data || [];
  },

  searchLocales: async (token: string, query: string) => {
    const data = await MetaService.request(
      `/search?type=adlocale&q=${encodeURIComponent(query)}&limit=20`,
      "GET",
      token,
    );
    return data.data || []; // Returns [{ key: number, name: string }]
  },

  // 1. Create Campaign (The Container)
  createCampaign: async (
    token: string,
    adAccountId: string,
    name: string,
    objective: string,
  ) => {
    // Cast strict type or fallback to OUTCOME_SALES
    const metaObjective =
      CAMPAIGN_OBJECTIVES.find((o) => o.id === objective)?.metaObjective ||
      "OUTCOME_SALES";

    console.log(
      "🎯 [Meta API] createCampaign - mapped objective:",
      metaObjective,
    );

    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    return MetaService.request(`/${id}/campaigns`, "POST", token, {
      name,
      objective: metaObjective,
      status: "PAUSED", // Always create paused for safety
      special_ad_categories: [], // Required field
      is_adset_budget_sharing_enabled: false, // ✅ THE FIX: Explicitly tell Meta "I want to manage budget at the Ad Set level"
    });
  },

  // 1.5 Get Campaigns (Sync)
  getCampaigns: async (
    token: string,
    adAccountId: string,
    limit: number = 50,
  ) => {
    // Fetch campaigns for the ad account
    // Fields: id, name, status, objective, start_time, promoted_object
    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;
    const data = await MetaService.request(
      `/${id}/campaigns?fields=id,name,status,objective,start_time,daily_budget,lifetime_budget,spend_cap&limit=${limit}&sort=start_time_descending`,
      "GET",
      token,
    );
    return data.data || [];
  },

  // 2. Create Ad Set (Budget & Targeting)
  // NOTE: `objective` param must be passed so we can pick the correct optimization_goal.
  // Hardcoding LINK_CLICKS for all objectives was causing Meta to misdeliver awareness/engagement campaigns.
  createAdSet: async (
    token: string,
    adAccountId: string,
    campaignId: string,
    params: any,
    objective: AdSyncObjective = "traffic", // Default to traffic if not provided
    placement: MetaPlacement = "automatic", // Meta surfaces
  ) => {
    // Resolve correct optimization goal from objective
    const optimizationGoal =
      CAMPAIGN_OBJECTIVES.find((o) => o.id === objective)
        ?.metaOptimizationGoal || "LINK_CLICKS";

    // billing_event must be compatible with optimization_goal:
    // LINK_CLICKS + IMPRESSIONS = valid
    // REACH + IMPRESSIONS = valid
    // POST_ENGAGEMENT + IMPRESSIONS = valid
    // CONVERSATIONS + IMPRESSIONS = valid
    const billingEvent = "IMPRESSIONS";

    // Signals are pre-capped in campaigns.ts by targeting_mode (b2b/b2c/broad).
    // This call just assembles the payload with hard controls separated from soft suggestions.
    const targetingPayload = buildTargetingPayload(params.targeting, placement);

    // promoted_object: page_id for engagement/whatsapp; application_id for app installs
    const needsPagePromotedObject =
      objective === "engagement" || objective === "whatsapp";
    const promotedObject =
      needsPagePromotedObject && params.pageId
        ? { page_id: params.pageId }
        : objective === "app_promotion" && params.metaApplicationId
          ? {
              application_id: params.metaApplicationId,
              ...(params.appStoreUrl && {
                object_store_url: params.appStoreUrl,
              }),
            }
          : undefined;

    // Click-to-WhatsApp requires destination_type=WHATSAPP on the ad set.
    // Without this, Meta won't route the click to WhatsApp even with CONVERSATIONS optimization.
    const destinationType = objective === "whatsapp" ? "WHATSAPP" : undefined;

    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    console.log(
      "🧩 [Meta API] createAdSet Payload:",
      JSON.stringify(
        { targetingPayload, dailyBudget: params.dailyBudget, placement },
        null,
        2,
      ),
    );

    return MetaService.request(`/${id}/adsets`, "POST", token, {
      name: `${params.name} - Ad Set`,
      campaign_id: campaignId,
      daily_budget: params.dailyBudget,
      billing_event: billingEvent,
      optimization_goal: optimizationGoal,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      // ACTIVE — the parent Campaign is PAUSED (the kill-switch).
      // Ad Set must be ACTIVE so activating the Campaign is all that's needed.
      status: "ACTIVE",
      targeting: targetingPayload,
      start_time: new Date(Date.now() + 10 * 60000).toISOString(),
      ...(promotedObject && { promoted_object: promotedObject }),
      ...(destinationType && { destination_type: destinationType }),
    });
  },
  createAdImage: async (
    token: string,
    adAccountId: string,
    imageUrl: string,
  ) => {
    try {
      // 1. Download the image from Supabase (Server-side)
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok)
        throw new Error("Failed to download image from storage");

      const imageBlob = await imageResponse.blob();

      // 2. Create FormData payload
      const formData = new FormData();
      formData.append("access_token", token);
      // 'filename' is required by Meta to detect file type
      formData.append("filename", imageBlob, "creative.jpg");

      const id = adAccountId.startsWith("act_")
        ? adAccountId
        : `act_${adAccountId}`;

      // 3. Post to Meta (Note: No Content-Type header; fetch handles boundary automatically)
      const res = await fetch(`${BASE_URL}/${id}/adimages`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("🖼️ [Meta API] Ad Image Upload Response:", data);

      if (data.error) {
        console.error("Meta Image Upload Error:", data.error);
        // v25.0: Use enhanced error parsing
        throw parseMetaError(data.error);
      }

      return data;
    } catch (e) {
      console.error("Image Processing Error:", e);
      throw e;
    }
  },

  createAdVideo: async (
    token: string,
    adAccountId: string,
    videoUrl: string,
  ): Promise<{ id: string }> => {
    try {
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok)
        throw new Error("Failed to download video from storage");

      const videoBlob = await videoResponse.blob();
      const formData = new FormData();
      formData.append("access_token", token);
      formData.append("source", videoBlob, "creative.mp4");

      const id = adAccountId.startsWith("act_")
        ? adAccountId
        : `act_${adAccountId}`;

      const res = await fetch(`${BASE_URL}/${id}/advideos`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("🎬 [Meta API] Ad Video Upload Response:", data);

      if (data.error) {
        console.error("Meta Video Upload Error:", data.error);
        throw parseMetaError(data.error);
      }

      return { id: data.id };
    } catch (e) {
      console.error("Video Processing Error:", e);
      throw e;
    }
  },

  /**
   * Fetch Meta's auto-generated thumbnails for an uploaded video.
   * Meta requires image_hash or image_url in video_data (error_subcode 1443226).
   * Returns the preferred thumbnail URI, or the first one if none is marked preferred.
   */
  getVideoThumbnail: async (
    token: string,
    videoId: string,
  ): Promise<string | null> => {
    try {
      const data = await MetaService.request(
        `/${videoId}/thumbnails?fields=uri,is_preferred`,
        "GET",
        token,
      );
      const thumbnails: Array<{ uri: string; is_preferred: boolean }> =
        data.data || [];
      if (thumbnails.length === 0) return null;
      const preferred = thumbnails.find((t) => t.is_preferred);
      return (preferred ?? thumbnails[0]).uri;
    } catch (e) {
      console.warn("⚠️ [Meta API] Failed to fetch video thumbnail:", e);
      return null;
    }
  },

  // 4. Create Ad (The Creative)
  // Supports both single image ads and carousel ads (2-10 images)
  createAd: async (
    token: string,
    adAccountId: string,
    adSetId: string,
    creativeHash: string | string[], // Single hash OR array of hashes for carousel
    copy: any,
    ctaCode: string = "SHOP_NOW",
    objective?: string,
    carouselCards?: Array<{
      imageHash: string;
      headline: string;
      description?: string;
      link?: string;
    }>,
    videoId?: string,
    thumbnailUrl?: string | null,
  ) => {
    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    const isWhatsApp = objective === "whatsapp";
    const isLead = objective === "leads";
    const isCarousel =
      Array.isArray(creativeHash) ||
      (carouselCards && carouselCards.length > 1);

    let callToAction: Record<string, any>;
    if (isWhatsApp) {
      callToAction = {
        type: "WHATSAPP_MESSAGE",
        value: { app_destination: "WHATSAPP" },
      };
    } else if (isLead && copy.leadGenFormId) {
      callToAction = {
        type: "SIGN_UP",
        value: { lead_gen_form_id: copy.leadGenFormId },
      };
    } else {
      callToAction = { type: ctaCode };
    }

    console.log("📣 [Meta API] createAd - CallToAction:", callToAction);
    console.log(
      "📣 [Meta API] createAd - Format:",
      isCarousel ? "CAROUSEL" : videoId ? "VIDEO" : "SINGLE_IMAGE",
    );

    let linkData: Record<string, any>;

    if (isCarousel && carouselCards && carouselCards.length >= 2) {
      // Carousel Ad Format (2-10 cards)
      const childAttachments = carouselCards.map((card) => ({
        image_hash: card.imageHash,
        name: card.headline,
        ...(card.description && { description: card.description }),
        link: card.link || copy.destinationUrl, // Fallback to main destination
        call_to_action: callToAction,
      }));

      linkData = {
        child_attachments: childAttachments,
        message: copy.primaryText,
        name: copy.headline, // Main carousel title
        ...(isLead ? {} : { link: copy.destinationUrl }), // Lead ads don't need link at parent level
      };

      console.log(
        `🎠 [Meta API] Creating carousel with ${childAttachments.length} cards`,
      );
    } else if (videoId) {
      // Video Ad Format
      // NOTE: `video_data` in object_story_spec does NOT support a top-level `link` field.
      // (Meta error_subcode 1443050). For traffic/sales objectives the destination URL
      // must be nested inside call_to_action.value.link — never at the video_data root.
      const videoCallToAction = isLead
        ? callToAction
        : {
            ...callToAction,
            value: {
              ...(callToAction.value ?? {}),
              link: copy.destinationUrl,
            },
          };

      linkData = {
        video_id: videoId,
        message: copy.primaryText,
        title: copy.headline,
        call_to_action: videoCallToAction,
        // Meta requires a thumbnail in video_data (error_subcode 1443226)
        ...(thumbnailUrl && { image_url: thumbnailUrl }),
      };
    } else {
      // Single Image Ad Format
      const singleHash = Array.isArray(creativeHash)
        ? creativeHash[0]
        : creativeHash;

      linkData = isLead
        ? {
            image_hash: singleHash,
            message: copy.primaryText,
            name: copy.headline,
            call_to_action: callToAction,
          }
        : {
            image_hash: singleHash,
            link: copy.destinationUrl,
            message: copy.primaryText,
            name: copy.headline,
            call_to_action: callToAction,
          };
    }

    const adName = isCarousel
      ? "AdSync Carousel Creative"
      : videoId
        ? "AdSync Video Creative"
        : "AdSync Creative";

    const creativeRes = await MetaService.request(
      `/${id}/adcreatives`,
      "POST",
      token,
      {
        name: adName,
        object_story_spec: {
          page_id: copy.pageId,
          ...(videoId ? { video_data: linkData } : { link_data: linkData }),
        },
        degrees_of_freedom_spec: {
          creative_features_spec: {
            standard_enhancements: {
              enroll_status: "OPT_IN"
            }
          }
        }
      },
    );

    return MetaService.request(`/${id}/ads`, "POST", token, {
      name: isCarousel ? "AdSync Carousel Ad" : videoId ? "AdSync Video Ad 1" : "AdSync Ad 1",
      adset_id: adSetId,
      creative: { creative_id: creativeRes.id },
      // ACTIVE — the parent Campaign (PAUSED) is the kill-switch.
      // Ad must be ACTIVE so activating the Campaign starts delivery immediately.
      status: "ACTIVE",
    });
  },

  // 4b. Create a Lead Gen Form on a Facebook Page (leads objective)
  createLeadGenForm: async (
    token: string,
    pageId: string,
    form: {
      name: string;
      questions: Array<{ type: string; label?: string; choices?: string[] }>;
      privacyPolicyUrl: string;
      thankYouMessage?: string;
    },
  ): Promise<{ id: string }> => {
    const questions = form.questions.map((q) => {
      if (q.type === "USER_CHOICE") {
        return {
          type: "USER_CHOICE",
          description: q.label,
          key: q.label?.toLowerCase().replace(/\s+/g, "_") || "user_choice",
          choices: (q.choices ?? [])
            .filter(Boolean)
            .map((c, i) => ({ key: `choice_${i + 1}`, display_value: c })),
        };
      }
      if (q.type === "CUSTOM") {
        return {
          type: "CUSTOM",
          key: q.label?.toLowerCase().replace(/\s+/g, "_") || "custom",
          label: q.label,
        };
      }
      return { type: q.type };
    });
    return MetaService.request(`/${pageId}/leadgen_forms`, "POST", token, {
      name: form.name,
      questions,
      privacy_policy: { url: form.privacyPolicyUrl },
      ...(form.thankYouMessage && {
        thank_you_page: { body: form.thankYouMessage },
      }),
    });
  },

  // 4b-i. List Facebook Pages connected to the user's access token scoped to the Ad Account
  getMetaPages: async (
    token: string,
    adAccountId: string,
  ): Promise<Array<{ id: string; name: string }>> => {
    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;
    const data = await MetaService.request(
      `/${id}/promote_pages?fields=id,name&limit=100`,
      "GET",
      token,
    );
    return (data.data || []).map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
    }));
  },

  // 4c. List existing Lead Gen Forms on a Facebook Page
  getLeadGenForms: async (
    token: string,
    pageId: string,
  ): Promise<Array<{ id: string; name: string; status: string }>> => {
    const data = await MetaService.request(
      `/${pageId}/leadgen_forms?fields=id,name,status&limit=20`,
      "GET",
      token,
    );
    return data.data || [];
  },

  // 4d. Retrieve Lead Data from Meta API (after webhook notification)
  getLeadData: async (
    token: string,
    leadgenId: string,
  ): Promise<{
    id: string;
    created_time: string;
    field_data: Array<{ name: string; values: string[] }>;
  }> => {
    const data = await MetaService.request(
      `/${leadgenId}?fields=id,created_time,field_data`,
      "GET",
      token,
    );
    return {
      id: data.id,
      created_time: data.created_time,
      field_data: data.field_data || [],
    };
  },

  getAccountInsights: async (token: string, adAccountId: string) => {
    // Fetch Last 30 Days by default
    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;
    return MetaService.request(
      `/${id}/insights?date_preset=last_30d&level=account&fields=spend,impressions,clicks,cpc,ctr,cpm,reach,media_views`,
      "GET",
      token,
    );
  },

  /**
   * Get time-series insights for a specific campaign
   * Returns daily breakdown of performance metrics
   */
  getCampaignInsights: async (token: string, campaignId: string) => {
    // time_increment=1 gives us daily breakdown
    // date_preset=last_30d covers the standard view
    return MetaService.request(
      `/${campaignId}/insights?fields=spend,impressions,clicks,cpc,ctr,reach,media_views&time_increment=1&date_preset=last_30d`,
      "GET",
      token,
    );
  },

  // Fetch Breakdown (Age/Gender/Location)
  getCampaignDemographics: async (token: string, campaignId: string) => {
    return MetaService.request(
      `/${campaignId}/insights?fields=reach,impressions,spend&breakdowns=age,gender&date_preset=maximum`,
      "GET",
      token,
    );
  },

  // [NEW] Fetch Breakdown specifically for Sub-Placements (Reels vs Feed etc)
  getPlacementInsights: async (token: string, campaignId: string) => {
    return MetaService.request(
      `/${campaignId}/insights?fields=reach,impressions,spend,clicks,cpc,ctr,actions,action_values,media_views&breakdowns=publisher_platform,platform_position&date_preset=maximum`,
      "GET",
      token,
    );
  },

  // Fetch specific Ad Account Balance
  getAdAccountBalance: async (token: string, adAccountId: string) => {
    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;
    return MetaService.request(
      `/${id}?fields=balance,currency,spend_cap`,
      "GET",
      token,
    );
  },

  // Fetch Ads inside a Campaign
  getCampaignAds: async (token: string, campaignId: string) => {
    return MetaService.request(
      `/${campaignId}/ads?fields=id,name,status,creative{thumbnail_url,image_url,title,body},insights{clicks,spend,ctr}`,
      "GET",
      token,
    );
  },

  // Fetch Ad Sets for a Campaign (used for cascade status updates)
  getCampaignAdSets: async (token: string, campaignId: string): Promise<Array<{ id: string }>> => {
    const data = await MetaService.request(
      `/${campaignId}/adsets?fields=id&limit=50`,
      "GET",
      token,
    );
    return data.data || [];
  },

  // Fetch Ads for an Ad Set (used for cascade status updates)
  getAdSetAds: async (token: string, adSetId: string): Promise<Array<{ id: string }>> => {
    const data = await MetaService.request(
      `/${adSetId}/ads?fields=id&limit=50`,
      "GET",
      token,
    );
    return data.data || [];
  },

  // Update status of a single ad set or ad
  updateObjectStatus: async (token: string, objectId: string, status: "ACTIVE" | "PAUSED") => {
    return MetaService.request(`/${objectId}`, "POST", token, { status });
  },

  /**
   * Send a server-side conversion event to Meta via the Conversions API (CAPI).
   *
   * This is the mechanism that trains Andromeda with Tenzu's offline WhatsApp
   * sales — events Meta would otherwise never see. It runs server-to-server so
   * no browser pixel is required.
   *
   * For WhatsApp sales:  action_source = "other"   (offline conversion)
   * For website sales:   action_source = "website"  (supplements browser pixel)
   *
   * @param pixelId         - The Meta Pixel / Dataset ID (from ad_accounts)
   * @param capiAccessToken - Decrypted CAPI system user access token
   * @param payload         - Conversion event data
   */
  sendCAPIEvent: async (
    pixelId: string,
    capiAccessToken: string,
    payload: {
      eventName: "Purchase" | "Lead" | "ViewContent";
      actionSource: "website" | "other";
      valueNgn?: number;
      eventSourceUrl?: string;
      fbclid?: string | null;
      fbclidClickedAt?: string | null; // ISO timestamp of the original click
      eventId?: string; // Dedup key — use sale row ID or pixel event ID
      currency?: string; // ISO currency code; defaults to 'NGN' for NG orgs
    },
  ): Promise<void> => {
    const eventTime = Math.floor(Date.now() / 1000);

    const userData: Record<string, string> = {};

    // Build fbc cookie value when we have a Meta click ID.
    // Format: fb.{version}.{click_timestamp_ms}.{fbclid}
    // Meta uses this server-side to match the conversion back to the ad click.
    if (payload.fbclid) {
      const clickTs = payload.fbclidClickedAt
        ? new Date(payload.fbclidClickedAt).getTime()
        : Date.now();
      userData.fbc = `fb.1.${clickTs}.${payload.fbclid}`;
    }

    const eventData: Record<string, any> = {
      event_name: payload.eventName,
      event_time: eventTime,
      action_source: payload.actionSource,
      user_data: userData,
      custom_data: {
        currency: payload.currency ?? "NGN",
        ...(payload.valueNgn != null && { value: payload.valueNgn }),
      },
    };

    if (payload.eventId) {
      eventData.event_id = payload.eventId;
    }

    if (payload.actionSource === "website" && payload.eventSourceUrl) {
      eventData.event_source_url = payload.eventSourceUrl;
    }

    const res = await fetch(
      `${BASE_URL}/${pixelId}/events?access_token=${capiAccessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [eventData] }),
      },
    );

    const result = await res.json();

    if (result.error) {
      // Log but never throw — CAPI failures must never block a sale from recording
      console.error("⚠️ [CAPI] Event send failed:", result.error);
    } else {
      console.log(
        `✅ [CAPI] ${payload.eventName} sent — events_received: ${result.events_received ?? 0}`,
      );
    }
  },

  /**
   * Get campaign-level issues (NEW in v25.0)
   *
   * Returns structured diagnostic information about campaign delivery issues,
   * policy violations, or configuration problems. This replaces the old ad review
   * status checks with more granular error reporting.
   *
   * @param token - Meta access token
   * @param campaignId - The campaign ID to check
   * @returns Campaign issues with error codes, messages, and severity levels
   */
  getCampaignIssues: async (token: string, campaignId: string) => {
    return MetaService.request(
      `/${campaignId}?fields=id,name,status,issues{error_code,error_message,error_summary,error_type,level}`,
      "GET",
      token
    );
  },

  /**
   * Get ad set-level issues (NEW in v25.0)
   *
   * @param token - Meta access token
   * @param adSetId - The ad set ID to check
   * @returns Ad set issues with error details
   */
  getAdSetIssues: async (token: string, adSetId: string) => {
    return MetaService.request(
      `/${adSetId}?fields=id,name,status,issues{error_code,error_message,error_summary,error_type,level}`,
      "GET",
      token
    );
  },

  /**
   * Get single ad status (used by cron poller for approval detection).
   * Fetches effective_status and configured_status to confirm whether an
   * in-review ad has been approved by Meta.
   *
   * @param token - Meta access token
   * @param adId  - The platform ad ID to fetch
   * @returns Ad object with effective_status and configured_status
   */
  getAd: async (token: string, adId: string) => {
    return MetaService.request(
      `/${adId}?fields=id,name,effective_status,configured_status`,
      "GET",
      token,
    );
  },

  /**
   * Hard-delete a campaign on Meta (DELETED status — irreversible).
   * Meta's Graph API uses a DELETE HTTP verb for this.
   * Only call this when the user explicitly wants to permanently remove the campaign from Meta.
   */
  deleteCampaign: async (token: string, campaignId: string): Promise<{ success: boolean }> => {
    return MetaService.request(`/${campaignId}`, "DELETE", token);
  },

  /**
   * Rename a campaign on Meta by sending a POST with `name`.
   * Meta allows renaming a PAUSED or ACTIVE campaign — DELETED campaigns cannot be renamed.
   */
  renameCampaign: async (
    token: string,
    campaignId: string,
    newName: string,
  ): Promise<{ success: boolean }> => {
    return MetaService.request(`/${campaignId}`, "POST", token, { name: newName });
  },
};
