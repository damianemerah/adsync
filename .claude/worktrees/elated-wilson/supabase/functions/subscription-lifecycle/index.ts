import { serve } from "https://deno.land/std@0.168.0/http/server.ts"\;
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"\;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const today = new Date();
    const currentDay = today.getUTCDate();
    const nowIso = today.toISOString();

    let resetCount = 0;
    let expiredCount = 0;

    // 1. Credit Reset: Find active/trialing orgs where today is their billing cycle day
    // Also ensure we haven't already updated them today (last_billing_update_at)
    const { data: orgsToReset, error: resetErr } = await supabaseClient
      .from("organizations")
      .select("id, credit_quota, last_billing_update_at")
      .in("subscription_status", ["active", "trialing"])
      .eq("billing_cycle_day", currentDay);

    if (resetErr) throw resetErr;

    if (orgsToReset && orgsToReset.length > 0) {
      for (const org of orgsToReset) {
        // Skip if already updated in the last 20 hours
        if (org.last_billing_update_at) {
          const lastUpdate = new Date(org.last_billing_update_at);
          if (today.getTime() - lastUpdate.getTime() < 20 * 60 * 60 * 1000) {
            continue;
          }
        }

        // Reset credits to quota
        const { error: updateErr } = await supabaseClient
          .from("organizations")
          .update({
            credits_balance: org.credit_quota,
            last_billing_update_at: nowIso,
          })
          .eq("id", org.id);

        if (!updateErr) resetCount++;
      }
    }

    // 2. Trial Expiry Check
    const { data: expiredTrials, error: trialErr } = await supabaseClient
      .from("organizations")
      .select("id")
      .eq("subscription_status", "trialing")
      .lte("trial_ends_at", nowIso);

    if (trialErr) throw trialErr;

    if (expiredTrials && expiredTrials.length > 0) {
      const expiredIds = expiredTrials.map((o) => o.id);
      
      const { error: expireUpdateErr } = await supabaseClient
        .from("organizations")
        .update({ subscription_status: "expired" })
        .in("id", expiredIds);
        
      if (!expireUpdateErr) expiredCount = expiredIds.length;
    }

    // 3. Past Due Grace Period Expiry (Cancelled after 7 days)
    const gracePeriodEndIso = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: cancelErr } = await supabaseClient
      .from("organizations")
      .update({ subscription_status: "canceled" }) // or expired
      .eq("subscription_status", "past_due")
      .lte("updated_at", gracePeriodEndIso);
      
    if (cancelErr) throw cancelErr;

    return new Response(
      JSON.stringify({ 
        success: true, 
        creditsReset: resetCount,
        trialsExpired: expiredCount 
      }),
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
