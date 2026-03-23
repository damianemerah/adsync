import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_API_VERSION = "v25.0";
const BALANCE_WARN_THRESHOLD = 500_000; // ₦5,000
const BALANCE_PAUSE_THRESHOLD = 200_000; // ₦2,000

function isoDay(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

async function decrypt(encryptedToken: string, key: string): Promise<string> {
  const parts = encryptedToken.split(":");
  if (parts.length !== 3) return encryptedToken;
  const [ivHex, authTagHex, encryptedHex] = parts;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const iv = new Uint8Array(
    ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );
  const authTag = new Uint8Array(
    authTagHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );
  const encryptedBytes = new Uint8Array(
    encryptedHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );

  const combined = new Uint8Array(encryptedBytes.length + authTag.length);
  combined.set(encryptedBytes);
  combined.set(authTag, encryptedBytes.length);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      keyMaterial,
      combined,
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    console.error("Decryption failed", e);
    return encryptedToken;
  }
}

async function getOrgOwner(supabase: any, organizationId: string) {
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .single();
  return data?.user_id ?? null;
}

async function pauseAccountCampaigns(
  accessToken: string,
  platformAccountId: string,
): Promise<number> {
  const actId = platformAccountId.startsWith("act_")
    ? platformAccountId
    : `act_${platformAccountId}`;

  const listUrl = `https://graph.facebook.com/${META_API_VERSION}/${actId}/campaigns?fields=id,status&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=50&access_token=${accessToken}`;
  const listRes = await fetch(listUrl);
  const listData = await listRes.json();

  if (listData.error || !listData.data) return 0;

  let paused = 0;
  for (const campaign of listData.data) {
    try {
      const pauseRes = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${campaign.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            status: "PAUSED",
            access_token: accessToken,
          }),
        },
      );
      const pauseData = await pauseRes.json();
      if (pauseData.success) paused++;
    } catch (err: any) {
      console.error(`[Pause] Failed campaign ${campaign.id}:`, err.message);
    }
  }

  return paused;
}

async function sendInAppNotification(supabase: any, params: any) {
  const {
    userId,
    type,
    category,
    title,
    message,
    actionLabel,
    actionUrl,
    dedupKey,
  } = params;

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    category,
    title,
    message,
    action_label: actionLabel,
    action_url: actionUrl,
    dedup_key: dedupKey,
    is_read: false,
  });

  if (error) {
    if (error.code === "23505") {
      return { deduped: true };
    }
    console.error("Error inserting notification:", error);
  }
  return { deduped: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
    if (!ENCRYPTION_KEY) throw new Error("Missing ENCRYPTION_KEY");

    const today = isoDay();

    // ✅ Filter out soft-deleted (disconnected) accounts
    const { data: accounts, error: accErr } = await supabase
      .from("ad_accounts")
      .select("*")
      .in("health_status", ["healthy", "paused_by_system", "payment_issue"])
      .not("access_token", "is", null)
      .is("disconnected_at", null); // Only check health for connected accounts

    if (accErr) throw accErr;

    console.log(`[Cron] Checking ${accounts?.length ?? 0} ad accounts...`);

    const accountResults = await Promise.allSettled(
      (accounts ?? []).map(async (account) => {
        try {
          const accessToken = await decrypt(
            account.access_token,
            ENCRYPTION_KEY,
          );
          const actId = account.platform_account_id.startsWith("act_")
            ? account.platform_account_id
            : `act_${account.platform_account_id}`;

          const url = `https://graph.facebook.com/${META_API_VERSION}/${actId}?fields=balance,currency,account_status&access_token=${accessToken}`;
          const res = await fetch(url);
          const metaData = await res.json();

          if (metaData.error) {
            // v25.0 enhanced error logging
            console.error("Meta API Error:", {
              code: metaData.error.code,
              subcode: metaData.error.error_subcode,
              message: metaData.error.message,
              user_title: metaData.error.error_user_title,
              user_msg: metaData.error.error_user_msg,
              fbtrace_id: metaData.error.fbtrace_id,
            });

            if (metaData.error.code === 190) {
              await supabase
                .from("ad_accounts")
                .update({
                  health_status: "token_expired",
                  api_version: META_API_VERSION, // Track API version
                })
                .eq("id", account.id);
            }
            return {
              id: account.id,
              status: "meta_error",
              msg: metaData.error.message,
              error_code: metaData.error.code,
            };
          }

          const balance = parseInt(metaData.balance || "0");
          const fbStatus = metaData.account_status; // 1=Active, 2=Disabled, 3=Unsettled, 9=In Grace Period

          const newHealthStatus =
            fbStatus === 2
              ? "disabled"
              : fbStatus === 3 || fbStatus === 9
                ? "payment_issue"
                : account.health_status === "paused_by_system"
                  ? "paused_by_system"
                  : "healthy";

          await supabase
            .from("ad_accounts")
            .update({
              last_known_balance_cents: balance,
              last_health_check: new Date().toISOString(),
              health_status: newHealthStatus,
              api_version: META_API_VERSION, // v25.0: Track API version
            })
            .eq("id", account.id);

          const ownerId = await getOrgOwner(supabase, account.organization_id);

          // ── Billing problem detected ──────────────────────────────────────
          if (fbStatus === 3 || fbStatus === 9) {
            if (ownerId) {
              await sendInAppNotification(supabase, {
                userId: ownerId,
                type: "critical",
                category: "billing",
                title: "⚠️ Payment Issue on Ad Account",
                message: `Your Meta ad account has a billing problem (status ${fbStatus}). Add a valid payment method to resume campaigns.`,
                actionLabel: "Fix Billing",
                actionUrl: "/settings/general",
                dedupKey: `payment_issue:${account.id}:${today}`,
              });
            }
            return { id: account.id, status: "payment_issue" };
          }

          // ── Payment issue resolved — flip back to healthy ─────────────────
          if (account.health_status === "payment_issue" && fbStatus === 1) {
            await supabase
              .from("ad_accounts")
              .update({
                health_status: "healthy",
                last_health_check: new Date().toISOString(),
              })
              .eq("id", account.id);

            if (ownerId) {
              await sendInAppNotification(supabase, {
                userId: ownerId,
                type: "success",
                category: "billing",
                title: "✅ Payment Issue Resolved",
                message: `Your Meta ad account billing is now active. You can launch campaigns again.`,
                actionLabel: "Launch Campaign",
                actionUrl: "/campaigns/new",
                dedupKey: `payment_resolved:${account.id}:${today}`,
              });
            }
            return { id: account.id, status: "payment_resolved" };
          }

          if (fbStatus !== 1) return { id: account.id, status: "not_active" };

          if (!ownerId) return { id: account.id, status: "no_owner" };

          const currency = metaData.currency ?? "NGN";
          const balanceFormatted = `${currency} ${(balance / 100).toLocaleString()}`;

          if (balance < BALANCE_PAUSE_THRESHOLD) {
            if (!account.paused_by_system) {
              console.log(
                `[Balance] CRITICAL for account ${account.id} — pausing campaigns`,
              );
              const pausedCount = await pauseAccountCampaigns(
                accessToken,
                account.platform_account_id,
              );

              await supabase
                .from("ad_accounts")
                .update({
                  health_status: "paused_by_system",
                  paused_by_system: true,
                  auto_paused_at: new Date().toISOString(),
                })
                .eq("id", account.id);

              await sendInAppNotification(supabase, {
                userId: ownerId,
                type: "critical",
                category: "billing",
                title: "⛔ Ads Paused — Low Balance",
                message: `Your ad account balance dropped to ${balanceFormatted}, which is below our safety threshold. We automatically paused ${pausedCount} campaign${pausedCount !== 1 ? "s" : ""} to prevent Meta from charging you into a negative balance. Top up and resume when ready.`,
                actionLabel: "Top Up Now",
                actionUrl: "/settings/general",
                dedupKey: `low_balance_pause:${account.id}:${today}`,
              });

              return { id: account.id, status: "auto_paused", pausedCount };
            }

            await sendInAppNotification(supabase, {
              userId: ownerId,
              type: "critical",
              category: "billing",
              title: "Balance Still Low — Campaigns Paused",
              message: `Your account balance is still ${balanceFormatted}. Top up to resume your campaigns.`,
              actionLabel: "Top Up",
              actionUrl: "/settings/general",
              dedupKey: `low_balance_reminder:${account.id}:${today}`,
            });

            return { id: account.id, status: "still_paused" };
          }

          if (account.paused_by_system && balance >= BALANCE_WARN_THRESHOLD) {
            await supabase
              .from("ad_accounts")
              .update({
                health_status: "healthy",
                paused_by_system: false,
                auto_paused_at: null,
              })
              .eq("id", account.id);

            await sendInAppNotification(supabase, {
              userId: ownerId,
              type: "success",
              category: "billing",
              title: "✅ Balance Restored — Campaigns Ready",
              message: `Your ad account balance is now ${balanceFormatted}. Your campaigns were paused by our safety system — head to Campaigns to resume them when you're ready.`,
              actionLabel: "View Campaigns",
              actionUrl: "/campaigns",
              dedupKey: `balance_restored:${account.id}:${today}`,
            });

            return { id: account.id, status: "balance_restored" };
          }

          if (balance < BALANCE_WARN_THRESHOLD) {
            await sendInAppNotification(supabase, {
              userId: ownerId,
              type: "warning",
              category: "billing",
              title: "⚠️ Ad Balance Getting Low",
              message: `Your ad account balance is ${balanceFormatted}. If it drops below ₦2,000, we will automatically pause your campaigns to protect you from going into a negative balance. Top up soon to avoid interruption.`,
              actionLabel: "Top Up",
              actionUrl: "/settings/general",
              dedupKey: `low_balance_warn:${account.id}:${today}`,
            });
            return { id: account.id, status: "warned", balance };
          }

          return { id: account.id, status: "ok", balance };
        } catch (err: any) {
          console.error(
            `[Account] Error processing ${account.id}:`,
            err.message,
          );
          throw err;
        }
      }),
    );

    return new Response(
      JSON.stringify({
        success: true,
        accountsChecked: accounts?.length ?? 0,
        accountResults: accountResults.map((r) =>
          r.status === "fulfilled"
            ? r.value
            : { error: (r as any).reason?.message },
        ),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[Cron] Fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
