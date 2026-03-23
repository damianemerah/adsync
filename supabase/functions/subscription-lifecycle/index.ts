import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Edge functions invoked by pg_cron don't need CORS headers
// Removed permissive CORS that allowed any origin to call this endpoint

serve(async (req) => {
  // pg_cron uses POST, not OPTIONS
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
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

    // 1. Credit Reset: Find active/trialing orgs where today is their billing cycle day.
    //    Credits are user-scoped — reset on the users table per org owner.
    const { data: orgsToReset, error: resetErr } = await supabaseClient
      .from("organizations")
      .select("id, last_billing_update_at")
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

        // Find the org owner
        const { data: ownerMember } = await supabaseClient
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", org.id)
          .eq("role", "owner")
          .single();

        if (!ownerMember?.user_id) continue;

        // Reset user's credits to their plan quota
        const { data: userRecord } = await supabaseClient
          .from("users")
          .select("plan_credits_quota")
          .eq("id", ownerMember.user_id)
          .single();

        const quota = userRecord?.plan_credits_quota ?? 50;

        const { error: updateErr } = await supabaseClient
          .from("users")
          .update({ credits_balance: quota, credits_reset_at: nowIso })
          .eq("id", ownerMember.user_id);

        // Also stamp the org so we don't double-reset today
        await supabaseClient
          .from("organizations")
          .update({ last_billing_update_at: nowIso })
          .eq("id", org.id);

        if (!updateErr) resetCount++;
      }
    }

    // 2. Trial Expiry Check
    const { data: expiredTrials, error: trialErr } = await supabaseClient
      .from("organizations")
      .select("id")
      .eq("subscription_status", "trialing")
      .lte("subscription_expires_at", nowIso);

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
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
