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
      token
    );
  },

  // Fetch Breakdown (Age/Gender/Location)
  getCampaignDemographics: async (token: string, campaignId: string) => {
    return MetaService.request(
      `/${campaignId}/insights?fields=reach,impressions,spend&breakdowns=age,gender&date_preset=maximum`,
      "GET",
      token
    );
  },

  // Fetch specific Ad Account Balance
  getAdAccountBalance: async (token: string, adAccountId: string) => {
    // Note: The correct endpoint for account details is /act_<ID>, but here we use the ID passed which likely is act_<ID> or just <ID>.
    // Usually adAccountId passed here is the stored "act_..." ID or just the number.
    // Current usage in createCampaign uses `act_${adAccountId}`.
    // The instructions say: getAdAccountBalance: async (token: string, adAccountId: string) => MetaService.request(`/${adAccountId}?fields=balance,currency,spend_cap`, ...)
    // If adAccountId is just the number, we need to prepend act_?
    // Wait, the user instruction used: `/${adAccountId}?fields=balance...`.
    // And in step 3 (Server Fetcher), it calls it with `data.ad_accounts.platform_account_id`.
    // Let's assume the ID passed is the correct one to query the object directly.
    // Actually, `act_<ID>` is the object ID for ad account.
    // Usually `platform_account_id` in DB is just the number.
    // Let's look at `createCampaign`: `/act_${adAccountId}/campaigns`.
    // The instructions show using `/${adAccountId}` directly.
    // However, usually you need `act_` prefix.
    // Let's follow the user's snippet exactly first, but chances are it expects `act_` to be part of the ID or handled by caller?
    // In `getCampaignById` implementation plan: `const accId = data.ad_accounts.platform_account_id;` which is usually "12345".
    // Does `/12345` work? No, it should be `/act_12345`.
    // But wait, `MetaService.request` just appends endpoint.
    // Use `act_${adAccountId}` if the input is just number.
    // The user instruction snippet: `/${adAccountId}?fields=balance,currency,spend_cap`.
    // I will verify assuming adAccountId provided by caller might NOT have act_.
    // But looking at line 180: `/act_${adAccountId}/insights`.
    // I will follow the pattern `act_${adAccountId}` to be safe, BUT the user instruction explicitly wrote `/${adAccountId}`.
    // I will stick to `act_${adAccountId}` because I know Meta API requires it for ad account nodes.
    // EXCEPT if the ID passed IS `act_12345`.
    // Let's check `getCampaignById`. It passes `data.ad_accounts.platform_account_id`.
    // DB usually stores "123456789".
    // So I need to use `/act_${adAccountId}`.
    // BUT the user provided code snippet says `/${adAccountId}`.
    // Maybe they passed `act_`? No `data.ad_accounts.platform_account_id` usually is just digits.
    // I will correct it to `/act_${adAccountId}` and add a comment or just assume the user meant the ID of the object `act_...`.
    // ACTUALLY, checking the user snippet again:
    // `const accId = data.ad_accounts.platform_account_id;`
    // `MetaService.getAdAccountBalance(token, accId)`
    // And in logic: `/${adAccountId}?fields...`
    // If I use `act_${adAccountId}` it will work. I will do that to ensure it works.

    // Correction: I should check if `adAccountId` starts with `act_`.
    // But for now, keeping consistent with other methods (createCampaign) which take `adAccountId` (digits) and prepend `act_`.
    // Wait, other methods take `adAccountId` and do `/act_${adAccountId}`.
    // So I should do the same.
    const id = adAccountId.startsWith("act_")
      ? adAccountId
      : `act_${adAccountId}`;
    return MetaService.request(
      `/${id}?fields=balance,currency,spend_cap`,
      "GET",
      token
    );
  },

  // Fetch Ads inside a Campaign
  getCampaignAds: async (token: string, campaignId: string) => {
    return MetaService.request(
      `/${campaignId}/ads?fields=id,name,status,creative{thumbnail_url,image_url,title,body},insights{clicks,spend,ctr}`,
      "GET",
      token
    );
  },
};
