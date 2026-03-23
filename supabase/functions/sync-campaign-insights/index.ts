import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_VERSION = "v25.0";

// Extremely simplified Meta API fetcher for edge function with v25.0 error handling
async function getCampaignInsights(token: string, campaignId: string) {
  const url = `https://graph.facebook.com/${API_VERSION}/${campaignId}/insights?fields=impressions,reach,clicks,ctr,cpc,spend,media_views,media_viewers&date_preset=last_7d&time_increment=1&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();

  // v25.0 enhanced error handling
  if (data.error) {
    console.error("Meta API Error:", {
      code: data.error.code,
      subcode: data.error.error_subcode,
      message: data.error.message,
      user_title: data.error.error_user_title,
      user_msg: data.error.error_user_msg,
      fbtrace_id: data.error.fbtrace_id,
    });
    throw new Error(data.error.message || `Meta API Error: ${res.statusText}`);
  }

  if (!res.ok) throw new Error(`Meta API Error: ${res.statusText}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Fetch active/paused/pending_review campaigns that have a platform_campaign_id
    const { data: campaigns, error: campErr } = await supabaseClient
      .from("campaigns")
      .select("id, platform_campaign_id, ad_account_id, status, meta_issues")
      .in("status", ["active", "paused", "pending_review"])
      .not("platform_campaign_id", "is", null);

    if (campErr) throw campErr;
    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ message: "No campaigns to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Map distinct ad account IDs
    const accountIds = [...new Set(campaigns.map((c) => c.ad_account_id))];

    // 3. Fetch tokens
    // ✅ Filter out soft-deleted (disconnected) accounts
    const { data: accounts, error: accErr } = await supabaseClient
      .from("ad_accounts")
      .select("id, access_token")
      .in("id", accountIds)
      .is("disconnected_at", null); // Only sync connected accounts

    if (accErr) throw accErr;
    
    const accountMap = new Map(accounts?.map((a) => [a.id, a.access_token]));

    const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
    if (!ENCRYPTION_KEY) throw new Error("Missing ENCRYPTION_KEY");

    // Helper function to decrypt token (AES-256-CBC format from Node.js crypto)
    async function decryptToken(encryptedToken: string): Promise<string> {
      // Parse format: "v2:IV:ENCRYPTED" or legacy "IV:ENCRYPTED"
      const parts = encryptedToken.split(":");
      let ivHex: string, encryptedHex: string;

      if (parts[0].startsWith("v")) {
        // New format: "v2:IV:ENCRYPTED"
        ivHex = parts[1];
        encryptedHex = parts[2];
      } else {
        // Legacy format: "IV:ENCRYPTED"
        ivHex = parts[0];
        encryptedHex = parts[1];
      }

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
        { name: "AES-CBC" },
        false,
        ["decrypt"]
      );

      const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const encryptedBytes = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        keyMaterial,
        encryptedBytes
      );

      return new TextDecoder().decode(decryptedBuffer);
    }

    // Helper function to process a single campaign
    async function processCampaign(campaign: any, token: string) {
      const insights = await getCampaignInsights(token, campaign.platform_campaign_id);

      if (insights.data && insights.data.length > 0) {
        const metricsToUpsert = insights.data.map((day: any) => ({
          campaign_id: campaign.id,
          date: day.date_start,
          spend_cents: Math.round(parseFloat(day.spend || "0") * 100),
          clicks: parseInt(day.clicks || "0", 10),
          impressions: parseInt(day.impressions || "0", 10),
          reach: parseInt(day.reach || "0", 10),
          ctr: parseFloat(day.ctr || "0"),
          media_views: parseInt(day.media_views || "0", 10), // v25.0 metric
          media_viewers: parseInt(day.media_viewers || "0", 10), // v25.0 metric
          synced_at: new Date().toISOString(),
        }));

        await supabaseClient.from("campaign_metrics").upsert(metricsToUpsert, {
          onConflict: "campaign_id,date",
        });

        // If campaign is pending_review and has impressions, transition to active
        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (campaign.status === "pending_review" && metricsToUpsert.some(m => m.impressions > 0)) {
          updatePayload.status = "active";
        }

        // v25.0: Clear meta_issues if sync succeeds and campaign had previous issues
        if (campaign.meta_issues) {
          updatePayload.meta_issues = null;
          updatePayload.issues_checked_at = new Date().toISOString();
        }

        await supabaseClient
          .from("campaigns")
          .update(updatePayload)
          .eq("id", campaign.id);

        return { success: true, campaignId: campaign.id };
      }
      return { success: false, campaignId: campaign.id, reason: "no_data" };
    }

    // 4. Process campaigns in parallel with concurrency limit
    // SECURITY FIX: Prevents timeout by processing campaigns concurrently
    // Process in batches of 10 to avoid overwhelming the Meta API
    const BATCH_SIZE = 10;
    const results = [];

    for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
      const batch = campaigns.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (campaign) => {
        const encryptedToken = accountMap.get(campaign.ad_account_id);
        if (!encryptedToken) {
          return { success: false, campaignId: campaign.id, error: "no_token" };
        }

        try {
          const token = await decryptToken(encryptedToken);
          return await processCampaign(campaign, token);
        } catch (err: any) {
          console.error(`Failed to sync campaign ${campaign.id}:`, err);

          // v25.0: Track campaign issues in database
          if (err.metaCode) {
            await supabaseClient
              .from("campaigns")
              .update({
                meta_issues: {
                  error_code: err.metaCode,
                  error_message: err.message,
                  error_summary: err.userTitle || err.message,
                  error_type: err.metaCode === 190 ? "critical" : "error",
                  level: "campaign",
                },
                issues_checked_at: new Date().toISOString(),
              })
              .eq("id", campaign.id);
          }

          return { success: false, campaignId: campaign.id, error: err.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    const syncedCount = results.filter(r => r.status === "fulfilled" && r.value.success).length;
    const errorCount = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)).length;

    return new Response(
      JSON.stringify({ success: true, synced: syncedCount, errors: errorCount }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
