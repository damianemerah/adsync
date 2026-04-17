/**
 * Account Health Processor Edge Function
 *
 * Processes one pending account_health_check job from the queue.
 * Checks Meta API for account balance/status, sends notifications,
 * auto-pauses campaigns on low balance.
 *
 * Invoked by pg_cron every 3 minutes.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const META_API_VERSION = "v25.0";
const BALANCE_WARN_THRESHOLD = 500_000; // ₦5,000 in cents
const BALANCE_PAUSE_THRESHOLD = 200_000; // ₦2,000 in cents

function isoDay(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function decrypt(encryptedToken: string, key: string): Promise<string> {
  const parts = encryptedToken.split(":");
  if (parts.length !== 3) return encryptedToken;

  const [prefix, part2, part3] = parts;

  // v1/v2 → AES-256-CBC
  if (prefix === "v1" || prefix === "v2") {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
      { name: "AES-CBC" },
      false,
      ["decrypt"],
    );
    const iv = new Uint8Array(part2.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const encryptedBytes = new Uint8Array(part3.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    try {
      const buf = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, keyMaterial, encryptedBytes);
      return new TextDecoder().decode(buf);
    } catch {
      return encryptedToken;
    }
  }

  // AES-256-GCM
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const iv = new Uint8Array(prefix.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const authTag = new Uint8Array(part2.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const ciphertext = new Uint8Array(part3.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);
  try {
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyMaterial, combined);
    return new TextDecoder().decode(buf);
  } catch {
    return encryptedToken;
  }
}

async function encrypt(plaintext: string, key: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.padEnd(32).slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    new TextEncoder().encode(plaintext),
  );
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const authTag = encryptedBytes.slice(encryptedBytes.length - 16);
  const toHex = (buf: Uint8Array) =>
    Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${toHex(iv)}:${toHex(authTag)}:${toHex(ciphertext)}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrgOwner(supabase: any, organizationId: string): Promise<string | null> {
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .single();
  return data?.user_id ?? null;
}

async function sendInAppNotification(supabase: any, params: {
  userId: string;
  type: string;
  category: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  dedupKey: string;
  channels?: ("email" | "whatsapp")[];
}) {
  const { channels = ["email"], ...notifParams } = params;

  const { error } = await supabase.from("notifications").insert({
    user_id: notifParams.userId,
    type: notifParams.type,
    category: notifParams.category,
    title: notifParams.title,
    message: notifParams.message,
    action_label: notifParams.actionLabel,
    action_url: notifParams.actionUrl,
    dedup_key: notifParams.dedupKey,
    is_read: false,
  });

  if (error) {
    if (error.code === "23505") return { deduped: true };
    console.error("[process-account-health] Notification insert error:", error);
    return { deduped: false };
  }

  // Enqueue external delivery
  await supabase.from("job_queue").insert({
    type: "notification_send",
    organization_id: null,
    user_id: notifParams.userId,
    status: "pending",
    max_attempts: 3,
    payload: {
      userId: notifParams.userId,
      type: notifParams.type,
      category: notifParams.category,
      title: notifParams.title,
      message: notifParams.message,
      actionLabel: notifParams.actionLabel,
      actionUrl: notifParams.actionUrl,
      channels,
    },
  });

  return { deduped: false };
}

async function pauseAccountCampaigns(
  accessToken: string,
  platformAccountId: string,
): Promise<number> {
  const actId = platformAccountId.startsWith("act_")
    ? platformAccountId
    : `act_${platformAccountId}`;

  const listUrl =
    `https://graph.facebook.com/${META_API_VERSION}/${actId}/campaigns` +
    `?fields=id,status` +
    `&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]` +
    `&limit=50` +
    `&access_token=${accessToken}`;

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
          body: new URLSearchParams({ status: "PAUSED", access_token: accessToken }),
        },
      );
      const pauseData = await pauseRes.json();
      if (pauseData.success) paused++;
    } catch (err: any) {
      console.error(`[process-account-health] Failed to pause campaign ${campaign.id}:`, err.message);
    }
  }
  return paused;
}

async function tryRefreshToken(
  account: any,
  currentToken: string,
  encryptionKey: string,
  metaAppId: string,
  metaAppSecret: string,
  supabase: any,
): Promise<{ success: boolean; newToken?: string }> {
  const url =
    `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${metaAppId}` +
    `&client_secret=${metaAppSecret}` +
    `&fb_exchange_token=${encodeURIComponent(currentToken)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error || !data.access_token) return { success: false };

    const newToken = data.access_token as string;
    const encryptedToken = await encrypt(newToken, encryptionKey);

    let newTokenExpiresAt: string | null = null;
    try {
      const debugRes = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/debug_token` +
        `?input_token=${encodeURIComponent(newToken)}` +
        `&access_token=${metaAppId}|${metaAppSecret}`,
      );
      const debugData = await debugRes.json();
      if (debugData.data?.expires_at) {
        newTokenExpiresAt = new Date(debugData.data.expires_at * 1000).toISOString();
      }
    } catch { /* non-blocking */ }

    await supabase
      .from("ad_accounts")
      .update({
        access_token: encryptedToken,
        token_refreshed_at: new Date().toISOString(),
        token_expires_at: newTokenExpiresAt,
        health_status: "healthy",
        last_health_check: new Date().toISOString(),
      })
      .eq("id", account.id);

    return { success: true, newToken };
  } catch {
    return { success: false };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ?? "";
  const META_APP_ID = Deno.env.get("META_APP_ID") ?? "";
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";

  let job: any = null;

  try {
    // 1. ATOMICALLY CLAIM NEXT PENDING JOB (Bug 1+4 fix: FOR UPDATE SKIP LOCKED)
    const { data: claimedRows, error: fetchErr } = await supabase
      .rpc("claim_next_job", { p_type: "account_health_check" });

    if (fetchErr) {
      throw fetchErr;
    }

    job = claimedRows?.[0] ?? null;

    if (!job) {
      return new Response(
        JSON.stringify({ message: "No pending account health jobs" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const payload = job.payload as {
      adAccountId: string;
      platformAccountId: string;
      organizationId: string;
    };

    console.log(`[process-account-health] Processing account ${payload.adAccountId}`);

    // 3. FETCH ACCOUNT FROM DB
    const { data: account, error: accErr } = await supabase
      .from("ad_accounts")
      .select("*")
      .eq("id", payload.adAccountId)
      .single();

    if (accErr || !account) {
      throw new Error(`Account not found: ${payload.adAccountId}`);
    }

    const today = isoDay();
    const accessToken = await decrypt(account.access_token, ENCRYPTION_KEY);
    const actId = account.platform_account_id.startsWith("act_")
      ? account.platform_account_id
      : `act_${account.platform_account_id}`;

    // 4. CALL META API
    const url =
      `https://graph.facebook.com/${META_API_VERSION}/${actId}` +
      `?fields=balance,currency,account_status,amount_spent,spend_cap,is_prepay_account&access_token=${accessToken}`;
    const res = await fetch(url);
    const metaData = await res.json();

    let result: any;

    if (metaData.error) {
      console.error("[process-account-health] Meta API error:", metaData.error);

      if (metaData.error.code === 190) {
        // Try inline token refresh
        const refreshResult = await tryRefreshToken(
          account,
          accessToken,
          ENCRYPTION_KEY,
          META_APP_ID,
          META_APP_SECRET,
          supabase,
        );

        if (refreshResult.success) {
          const retryRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${actId}` +
            `?fields=balance,currency,account_status,amount_spent,spend_cap,is_prepay_account&access_token=${refreshResult.newToken}`,
          );
          const retryData = await retryRes.json();
          if (!retryData.error) {
            result = { id: account.id, status: "token_refreshed_and_ok" };
          }
        }

        if (!result) {
          const ownerId = await getOrgOwner(supabase, account.organization_id);
          await supabase
            .from("ad_accounts")
            .update({ health_status: "token_expired", api_version: META_API_VERSION })
            .eq("id", account.id);

          if (ownerId) {
            await sendInAppNotification(supabase, {
              userId: ownerId,
              type: "critical",
              category: "account",
              title: "Meta Account Disconnected — Reconnect Required",
              message: `Your Meta ad account (${account.platform_account_id}) has been disconnected because its access token has expired and could not be refreshed. Please reconnect to resume campaigns.`,
              actionLabel: "Reconnect",
              actionUrl: "/settings/business",
              dedupKey: `token_expired:${account.id}:${today}`,
              channels: ["email", "whatsapp"],
            });
          }
          result = { id: account.id, status: "token_expired" };
        }
      } else {
        result = { id: account.id, status: "meta_error", code: metaData.error.code };
      }
    } else {
      // 5. PROCESS BALANCE + STATUS
      // For prepaid accounts funded via bank transfer (e.g. NGN), Meta returns balance="0"
      // and tracks funds via spend_cap. Effective balance = spend_cap - amount_spent.
      const rawBalance = metaData.balance != null ? parseInt(metaData.balance, 10) : null;
      const isPrepay = metaData.is_prepay_account === true;
      const spendCap = metaData.spend_cap != null ? parseInt(metaData.spend_cap, 10) : 0;
      const amountSpent = metaData.amount_spent != null ? parseInt(metaData.amount_spent, 10) : 0;
      const balance = isPrepay && rawBalance === 0 && spendCap > 0
        ? spendCap - amountSpent
        : rawBalance;
      console.log(`[process-account-health] 💰 balance raw=${rawBalance} effective=${balance} isPrepay=${isPrepay} spendCap=${spendCap} amountSpent=${amountSpent}`);
      const fbStatus = metaData.account_status;

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
          api_version: META_API_VERSION,
        })
        .eq("id", account.id);

      const ownerId = await getOrgOwner(supabase, account.organization_id);

      if (fbStatus === 3 || fbStatus === 9) {
        result = { id: account.id, status: "payment_issue" };
      } else if (account.health_status === "payment_issue" && fbStatus === 1) {
        await supabase
          .from("ad_accounts")
          .update({ health_status: "healthy", last_health_check: new Date().toISOString() })
          .eq("id", account.id);

        if (ownerId) {
          await sendInAppNotification(supabase, {
            userId: ownerId,
            type: "success",
            category: "billing",
            title: "✅ Payment Issue Resolved",
            message: "Your Meta ad account billing is now active. You can launch campaigns again.",
            actionLabel: "Launch Campaign",
            actionUrl: "/campaigns/new",
            dedupKey: `payment_resolved:${account.id}:${today}`,
            channels: ["email"],
          });
        }
        result = { id: account.id, status: "payment_resolved" };
      } else if (fbStatus !== 1) {
        result = { id: account.id, status: "not_active" };
      } else if (!ownerId) {
        result = { id: account.id, status: "no_owner" };
      } else if (balance === null) {
        result = { id: account.id, status: "balance_unavailable" };
      } else {
        const currency = metaData.currency ?? "NGN";
        const balanceFormatted = `${currency} ${(balance / 100).toLocaleString()}`;

        if (balance < BALANCE_PAUSE_THRESHOLD) {
          if (!account.paused_by_system) {
            const pausedCount = await pauseAccountCampaigns(accessToken, account.platform_account_id);
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
              channels: ["email", "whatsapp"],
            });
            result = { id: account.id, status: "auto_paused", pausedCount };
          } else {
            await sendInAppNotification(supabase, {
              userId: ownerId,
              type: "critical",
              category: "billing",
              title: "Balance Still Low — Campaigns Paused",
              message: `Your account balance is still ${balanceFormatted}. Top up to resume your campaigns.`,
              actionLabel: "Top Up",
              actionUrl: "/settings/general",
              dedupKey: `low_balance_reminder:${account.id}:${today}`,
              channels: ["email"],
            });
            result = { id: account.id, status: "still_paused" };
          }
        } else if (account.paused_by_system && balance >= BALANCE_WARN_THRESHOLD) {
          await supabase
            .from("ad_accounts")
            .update({ health_status: "healthy", paused_by_system: false, auto_paused_at: null })
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
            channels: ["email"],
          });
          result = { id: account.id, status: "balance_restored" };
        } else if (balance < BALANCE_WARN_THRESHOLD) {
          await sendInAppNotification(supabase, {
            userId: ownerId,
            type: "warning",
            category: "billing",
            title: "⚠️ Ad Balance Getting Low",
            message: `Your ad account balance is ${balanceFormatted}. If it drops below ₦2,000, we will automatically pause your campaigns. Top up soon to avoid interruption.`,
            actionLabel: "Top Up",
            actionUrl: "/settings/general",
            dedupKey: `low_balance_warn:${account.id}:${today}`,
            channels: ["email"],
          });
          result = { id: account.id, status: "warned", balance };
        } else {
          result = { id: account.id, status: "ok", balance };
        }
      }
    }

    // 6. MARK COMPLETE
    const duration = Date.now() - startTime;
    await supabase
      .from("job_queue")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        payload: { ...job.payload, result },
      })
      .eq("id", job.id);

    await supabase.from("job_metrics").insert({
      job_type: "account_health_check",
      duration_ms: duration,
      success: true,
    });

    console.log(`[process-account-health] ✅ Job ${job.id} done in ${duration}ms: ${result.status}`);

    return new Response(
      JSON.stringify({ success: true, result, duration }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[process-account-health] Error:", error.message);

    if (job?.id) {
      const { data: currentJob } = await supabase
        .from("job_queue")
        .select("attempts, max_attempts")
        .eq("id", job.id)
        .single();

      if (currentJob) {
        const newAttempts = (currentJob.attempts ?? 0) + 1;
        const exhausted = newAttempts >= (currentJob.max_attempts ?? 3);

        if (exhausted) {
          // Bug 3 fix: atomic RPC — inserts into job_dlq AND marks job failed in one transaction
          await supabase.rpc("fail_job_to_dlq", {
            p_job_id: job.id,
            p_error_msg: error.message,
            p_error_stack: null,
            p_attempts: newAttempts,
          });
        } else {
          const backoffMs = Math.min(1000 * Math.pow(2, newAttempts), 300000);
          await supabase
            .from("job_queue")
            .update({
              status: "pending",
              last_error: error.message,
              attempts: newAttempts,
              updated_at: new Date(Date.now() + backoffMs).toISOString(),
            })
            .eq("id", job.id);
          console.log(`[process-account-health] Will retry in ${Math.round(backoffMs / 1000)}s`);
        }
      }
    }

    const duration = Date.now() - startTime;
    await supabase.from("job_metrics").insert({
      job_type: "account_health_check",
      duration_ms: duration,
      success: false,
      error_code: "PROCESSING_ERROR",
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { "Content-Type": "application/json" } }, // 200 so cron doesn't halt
    );
  }
});
