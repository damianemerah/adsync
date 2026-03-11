const API_VERSION = "v24.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

import {
  CAMPAIGN_OBJECTIVES,
  AdSyncObjective,
  META_PLACEMENTS,
  MetaPlacement,
} from "@/lib/constants";

const getPlacementSpec = (
  placementId: MetaPlacement,
  metaSubPlacements?: Record<string, string[]>,
) => {
  const config = META_PLACEMENTS.find((p) => p.id === placementId);
  if (!config || config.id === "automatic") return {}; // Advantage+

  const spec: any = { publisher_platforms: config.publisherPlatforms };

  // If sub-placements are provided (i.e. manual granular selection), inject them dynamically
  if (metaSubPlacements && placementId === "instagram") {
    spec.instagram_positions = metaSubPlacements.instagram;
  } else if (metaSubPlacements && placementId === "facebook") {
    spec.facebook_positions = metaSubPlacements.facebook;
  } else {
    // Fallback to the default configuration
    Object.assign(spec, config.positions);
  }

  return spec;
};

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
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (data.error) {
      console.error("Meta API Error:", data.error);
      const err = new Error(data.error.message || "Meta API Failed") as any;
      err.subcode = data.error.error_subcode;
      err.metaCode = data.error.code;
      throw err;
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
    return data.data || [];
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
    return data.data || [];
  },

  searchLocation: async (
    token: string,
    query: string,
    type: "city" | "region" | "country" = "city",
  ) => {
    // Searches for "Lagos" to get Meta geo key
    const data = await MetaService.request(
      `/search?type=adgeolocation&q=${encodeURIComponent(query)}&limit=10`,
      "GET",
      token,
    );
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

    // Construct the targeting object
    // NOTE: With advantage_audience: 1 (Advantage+ audience), Meta requires age_max === 65.
    // The user's selected age range becomes a suggestion via audience_controls, not a hard filter.
    const targetingPayload = {
      geo_locations: params.targeting.geo_locations,
      interests: params.targeting.interests,
      behaviors: params.targeting.behaviors,
      age_min: params.targeting.age_min,
      // age_max: params.targeting.age_max,
      age_max: 65, // Required by Meta when advantage_audience: 1 — user's max is passed as a suggestion below
      targeting_automation: {
        advantage_audience: 1, // Required by Meta Marketing API v24.0+
      },
      // Suggest the user's intended age cap to Meta's AI without hard-restricting it
      // ...(params.targeting.age_max &&
      //   params.targeting.age_max < 65 && {
      //     audience_controls: {
      //       age_max: params.targeting.age_max,
      //     },
      //   }),
      // Language targeting — only include if languages are selected
      ...(params.targeting.locales?.length > 0 && {
        locales: params.targeting.locales, // e.g. [6, 114] = English + Yoruba
      }),
      // Meta API for Gender: 1=Male, 2=Female. Omit for All.
      ...(params.targeting.gender === "male" && { genders: [1] }),
      ...(params.targeting.gender === "female" && { genders: [2] }),
      // Life Events — time-sensitive targeting (separate field from behaviors in Meta v24)
      ...(params.targeting.lifeEvents?.length > 0 && {
        life_events: params.targeting.lifeEvents.map(
          (e: { id: string; name: string }) => ({ id: e.id, name: e.name }),
        ),
      }),
      // Exclusions — omit if empty (Meta rejects empty exclusion objects)
      ...(params.targeting.exclusionAudienceIds?.length > 0 && {
        exclusions: {
          custom_audiences: params.targeting.exclusionAudienceIds.map(
            (id: string) => ({ id }),
          ),
        },
      }),
      ...getPlacementSpec(placement, params.metaSubPlacements),
    };

    // For App Messaging and Engagement, we must specify the promoted object (Page ID)
    const needsPromotedObject =
      objective === "engagement" || objective === "whatsapp";
    const promotedObject =
      needsPromotedObject && params.pageId
        ? { page_id: params.pageId }
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
      status: "PAUSED",
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
        throw new Error(data.error.message);
      }

      return data;
    } catch (e) {
      console.error("Image Processing Error:", e);
      throw e;
    }
  },

  // 4. Create Ad (The Creative)
  createAd: async (
    token: string,
    adAccountId: string,
    adSetId: string,
    creativeHash: string,
    copy: any,
    ctaCode: string = "SHOP_NOW", // Added ctaCode with default
    objective?: string, // Pass objective so we can build the correct CTA for WhatsApp
  ) => {
    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;

    // Click-to-WhatsApp requires a specific CTA structure — WHATSAPP_MESSAGE + app_destination.
    // Using SHOP_NOW or any other generic type here will cause Meta to reject the ad or route
    // clicks incorrectly.
    const isWhatsApp = objective === "whatsapp";
    const callToAction = isWhatsApp
      ? {
          type: "WHATSAPP_MESSAGE",
          value: { app_destination: "WHATSAPP" },
        }
      : { type: ctaCode };

    console.log("📣 [Meta API] createAd - CallToAction:", callToAction);

    // First, create the Ad Creative Object
    const creativeRes = await MetaService.request(
      `/${id}/adcreatives`,
      "POST",
      token,
      {
        name: "AdSync Creative",
        object_story_spec: {
          page_id: copy.pageId, // We need the user's FB Page ID
          link_data: {
            image_hash: creativeHash,
            link: copy.destinationUrl,
            message: copy.primaryText,
            name: copy.headline,
            call_to_action: callToAction,
          },
        },
      },
    );

    // Then connect it to the Ad Set
    return MetaService.request(`/${id}/ads`, "POST", token, {
      name: "AdSync Ad 1",
      adset_id: adSetId,
      creative: { creative_id: creativeRes.id },
      status: "PAUSED",
    });
  },

  getAccountInsights: async (token: string, adAccountId: string) => {
    // Fetch Last 30 Days by default
    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;
    return MetaService.request(
      `/${id}/insights?date_preset=last_30d&level=account&fields=spend,impressions,clicks,cpc,ctr,cpm,reach`,
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
      `/${campaignId}/insights?fields=spend,impressions,clicks,cpc,ctr,reach&time_increment=1&date_preset=last_30d`,
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
      `/${campaignId}/insights?fields=reach,impressions,spend,clicks,cpc,ctr,actions,action_values&breakdowns=publisher_platform,platform_position&date_preset=maximum`,
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
};
