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
    type: "city" | "region" | "country" = "region",
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
        advantage_audience: 1, // Required by Meta Marketing API v25.0+
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
      // Life Events — time-sensitive targeting (separate field from behaviors in Meta v25)
      ...(params.targeting.lifeEvents?.length > 0 && {
        life_events: params.targeting.lifeEvents.map(
          (e: { id: string; name: string }) => ({ id: e.id, name: e.name }),
        ),
      }),
      // Work Positions — job title demographic targeting
      ...(params.targeting.workPositions?.length > 0 && {
        work_positions: params.targeting.workPositions.map(
          (p: { id: string; name: string }) => ({ id: p.id, name: p.name }),
        ),
      }),
      // Industries — broad sector targeting for B2B/wholesale/professional products
      ...(params.targeting.industries?.length > 0 && {
        industries: params.targeting.industries.map(
          (i: { id: string; name: string }) => ({ id: i.id, name: i.name }),
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
      ...getPlacementSpec(placement),
    };

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
        // v25.0: Use enhanced error parsing
        throw parseMetaError(data.error);
      }

      return data;
    } catch (e) {
      console.error("Image Processing Error:", e);
      throw e;
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
      isCarousel ? "CAROUSEL" : "SINGLE_IMAGE",
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
    } else {
      // Single Image Ad Format (legacy path)
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

    const creativeRes = await MetaService.request(
      `/${id}/adcreatives`,
      "POST",
      token,
      {
        name: isCarousel ? "AdSync Carousel Creative" : "AdSync Creative",
        object_story_spec: {
          page_id: copy.pageId,
          link_data: linkData,
        },
      },
    );

    return MetaService.request(`/${id}/ads`, "POST", token, {
      name: isCarousel ? "AdSync Carousel Ad" : "AdSync Ad 1",
      adset_id: adSetId,
      creative: { creative_id: creativeRes.id },
      status: "PAUSED",
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
    // v25.0: Added media_views, media_viewers (new metrics)
    return MetaService.request(
      `/${id}/insights?date_preset=last_30d&level=account&fields=spend,impressions,clicks,cpc,ctr,cpm,reach,media_views,media_viewers`,
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
    // v25.0: Added media_views, media_viewers (new metrics for video/reel content)
    return MetaService.request(
      `/${campaignId}/insights?fields=spend,impressions,clicks,cpc,ctr,reach,media_views,media_viewers&time_increment=1&date_preset=last_30d`,
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
    // v25.0: Added media_views, media_viewers for video/reel placement insights
    return MetaService.request(
      `/${campaignId}/insights?fields=reach,impressions,spend,clicks,cpc,ctr,actions,action_values,media_views,media_viewers&breakdowns=publisher_platform,platform_position&date_preset=maximum`,
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
};
