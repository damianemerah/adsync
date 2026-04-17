/**
 * Account Health Enqueuer Edge Function
 *
 * Runs on pg_cron every 4 hours. For each active ad account,
 * inserts one account_health_check job into the queue.
 *
 * The actual Meta API calls, balance checks, and notifications
 * are handled by process-account-health (runs every 3 minutes).
 *
 * Dedup: a unique partial index prevents duplicate pending jobs
 * per ad account — silently skips if one already exists.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Fetch all active ad accounts that need health checks
    const { data: accounts, error: accErr } = await supabase
      .from("ad_accounts")
      .select("id, platform_account_id, organization_id")
      .in("health_status", ["healthy", "paused_by_system", "payment_issue"])
      .not("access_token", "is", null)
      .is("disconnected_at", null);

    if (accErr) throw accErr;

    console.log(`[account-health enqueuer] Found ${accounts?.length ?? 0} accounts to check`);

    let enqueued = 0;
    let skipped = 0;

    for (const account of accounts ?? []) {
      const { error: jobErr } = await supabase.from("job_queue").insert({
        type: "account_health_check",
        organization_id: account.organization_id,
        status: "pending",
        max_attempts: 3,
        payload: {
          adAccountId: account.id,
          platformAccountId: account.platform_account_id,
          organizationId: account.organization_id,
        },
      });

      if (jobErr) {
        if (jobErr.code === "23505") {
          // Dedup: pending job already exists for this account
          console.log(`[account-health enqueuer] ⏭️ Skipping ${account.id} — pending job already exists`);
          skipped++;
        } else {
          console.error(`[account-health enqueuer] Error enqueueing ${account.id}:`, jobErr.message);
        }
      } else {
        enqueued++;
      }
    }

    console.log(`[account-health enqueuer] ✅ Enqueued ${enqueued}, skipped ${skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        accountsFound: accounts?.length ?? 0,
        enqueued,
        skipped,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[account-health enqueuer] Fatal:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
