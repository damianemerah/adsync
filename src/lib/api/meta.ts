const API_VERSION = "v24.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

import { META_OBJECTIVE_MAP, AdSyncObjective } from "@/lib/constants";

export const MetaService = {
  // Generic Request Wrapper
  async request(
    endpoint: string,
    method: string,
    accessToken: string,
    body?: any
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
      throw new Error(data.error.message || "Meta API Failed");
    }

    return data;
  },
  searchInterests: async (token: string, query: string) => {
    // Searches for interests like "Fashion" to get ID "600312329"
    const data = await MetaService.request(
      `/search?type=adinterest&q=${encodeURIComponent(query)}&limit=1`,
      "GET",
      token
    );
    return data.data?.[0] || null; // Return first match or null
  },

  searchLocation: async (
    token: string,
    query: string,
    type: "city" | "region" | "country" = "region"
  ) => {
    // Searches for "Lagos" to get ID
    const data = await MetaService.request(
      `/search?type=adgeolocation&q=${encodeURIComponent(
        query
      )}&location_types=['${type}']&limit=1`,
      "GET",
      token
    );
    return data.data?.[0] || null;
  },

  // 1. Create Campaign (The Container)
  createCampaign: async (
    token: string,
    adAccountId: string,
    name: string,
    objective: string
  ) => {
    // Use the Constant Map
    // Cast strict type or fallback to Traffic
    const metaObjective =
      META_OBJECTIVE_MAP[objective as AdSyncObjective] || "OUTCOME_TRAFFIC";

    return MetaService.request(`/act_${adAccountId}/campaigns`, "POST", token, {
      name,
      objective: metaObjective,
      status: "PAUSED", // Always create paused for safety
      special_ad_categories: [], // Required field
      is_adset_budget_sharing_enabled: false, // ✅ THE FIX: Explicitly tell Meta "I want to manage budget at the Ad Set level"
    });
  },

  // 2. Create Ad Set (Budget & Targeting)
  createAdSet: async (
    token: string,
    adAccountId: string,
    campaignId: string,
    params: any
  ) => {
    return MetaService.request(`/act_${adAccountId}/adsets`, "POST", token, {
      name: `${params.name} - Ad Set`,
      campaign_id: campaignId,
      daily_budget: params.dailyBudget, // Cents
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      status: "PAUSED",
      targeting: params.targeting, // Prepared targeting object
      start_time: new Date(Date.now() + 10 * 60000).toISOString(), // Start in 10 mins
    });
  },
  createAdImage: async (
    token: string,
    adAccountId: string,
    imageUrl: string
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

      // 3. Post to Meta (Note: No Content-Type header; fetch handles boundary automatically)
      const res = await fetch(`${BASE_URL}/act_${adAccountId}/adimages`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Data:📧", data);

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
    copy: any
  ) => {
    // First, create the Ad Creative Object
    const creativeRes = await MetaService.request(
      `/act_${adAccountId}/adcreatives`,
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
            call_to_action: {
              type: "SHOP_NOW",
            },
          },
        },
      }
    );

    // Then connect it to the Ad Set
    return MetaService.request(`/act_${adAccountId}/ads`, "POST", token, {
      name: "AdSync Ad 1",
      adset_id: adSetId,
      creative: { creative_id: creativeRes.id },
      status: "PAUSED",
    });
  },

  getAccountInsights: async (token: string, adAccountId: string) => {
    // Fetch Last 30 Days by default
    return MetaService.request(
      `/act_${adAccountId}/insights?date_preset=last_30d&level=account&fields=spend,impressions,clicks,cpc,ctr,cpm,reach`,
      "GET",
      token
    );
  },
};
