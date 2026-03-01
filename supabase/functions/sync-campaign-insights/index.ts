import { serve } from "https://deno.land/std@0.168.0/http/server.ts"\;
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"\;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extremely simplified Meta API fetcher for edge function
async function getCampaignInsights(token: string, campaignId: string) {
  const url = `https://graph.facebook.com/v19.0/${campaignId}/insights?fields=impressions,reach,clicks,ctr,cpc,spend&date_preset=last_7d&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meta API Error: ${res.statusText}`);
  return res.json();
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

    // 1. Fetch active/paused campaigns that have a platform_campaign_id
    const { data: campaigns, error: campErr } = await supabaseClient
      .from("campaigns")
      .select("id, platform_campaign_id, ad_account_id")
      .in("status", ["active", "paused"])
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
    const { data: accounts, error: accErr } = await supabaseClient
      .from("ad_accounts")
      .select("id, access_token")
      .in("id", accountIds);

    if (accErr) throw accErr;
    
    const accountMap = new Map(accounts?.map((a) => [a.id, a.access_token]));

    let syncedCount = 0;
    let errorCount = 0;

    // 4. Process each campaign
    for (const campaign of campaigns) {
      const encryptedToken = accountMap.get(campaign.ad_account_id);
      if (!encryptedToken) continue;

      try {
        // Need to decrypt token - using a simplified decrypt approach if the edge function doesn't have the key
        // Wait, Deno edge functions can't decrypt easily unless they share the ENCRYPTION_KEY env var.
        // For simplicity in this architectural demo, we'll assume the token is passed to a Next.js API route 
        // OR the Edge Function has the ENCRYPTION_KEY.
        
        // Actually, it's safer to have the Edge Function call a secure internal Next.js API route 
        // OR just have the Next.js API route handle it since it already has `decrypt()`.
        // Let's rewrite this to use the Next.js route for the heavy lifting of decryption, or just do it in Deno.

        // Since we want to use pg_cron -> Edge Function, the Edge Function can just call the Meta API 
        // IF we give it the ENCRYPTION_KEY.
        const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
        if (!ENCRYPTION_KEY) throw new Error("Missing ENCRYPTION_KEY");

        // Deno decryption (AES-256-GCM)
        const [ivHex, authTagHex, encryptedHex] = encryptedToken.split(":");
        
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
          { name: "AES-GCM" },
          false,
          ["decrypt"]
        );

        const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const authTag = new Uint8Array(authTagHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const encryptedBytes = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        
        const combined = new Uint8Array(encryptedBytes.length + authTag.length);
        combined.set(encryptedBytes);
        combined.set(authTag, encryptedBytes.length);

        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          keyMaterial,
          combined
        );
        const token = new TextDecoder().decode(decryptedBuffer);

        // Fetch insights
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
            synced_at: new Date().toISOString(),
          }));

          await supabaseClient.from("campaign_metrics").upsert(metricsToUpsert, {
            onConflict: "campaign_id, date",
          });
          
          await supabaseClient
            .from("campaigns")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", campaign.id);
            
          syncedCount++;
        }
      } catch (err) {
        console.error(`Failed to sync campaign ${campaign.id}:`, err);
        errorCount++;
      }
    }

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
