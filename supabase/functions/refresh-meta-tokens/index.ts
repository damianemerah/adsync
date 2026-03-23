import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const META_API_VERSION = "v25.0";
const STALE_DAYS = 50;

// ── AES-GCM helpers (Deno Web Crypto API) ─────────────────────────────────────

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

  // AES-GCM appends the 16-byte auth tag at the end of the ciphertext
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const authTag = encryptedBytes.slice(encryptedBytes.length - 16);

  const toHex = (buf: Uint8Array) =>
    Array.from(buf)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return `${toHex(iv)}:${toHex(authTag)}:${toHex(ciphertext)}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDay(date = new Date()): string {
  return date.toISOString().split("T")[0];
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
    if (error.code === "23505") return { deduped: true };
    console.error("Error inserting notification:", error);
  }
  return { deduped: false };
}

// ── Main ──────────────────────────────────────────────────────────────────────

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

    const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY");
    if (!ENCRYPTION_KEY) throw new Error("Missing ENCRYPTION_KEY");

    const META_APP_ID = Deno.env.get("META_APP_ID");
    const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error("Missing META_APP_ID or META_APP_SECRET");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = isoDay();
    const staleThreshold = new Date(
      Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Fetch all Meta accounts that have a token (including expired ones - we'll try to refresh them)
    // Only exclude permanently disabled accounts
    // ✅ Filter out soft-deleted (disconnected) accounts
    const { data: accounts, error: accErr } = await supabase
      .from("ad_accounts")
      .select("*")
      .eq("platform", "meta")
      .neq("health_status", "disabled")
      .not("access_token", "is", null)
      .is("disconnected_at", null); // Only refresh tokens for connected accounts

    if (accErr) throw accErr;

    console.log(
      `[TokenRefresh] Evaluating ${accounts?.length ?? 0} Meta ad accounts...`,
    );

    let checked = 0;
    let refreshed = 0;
    let failed = 0;
    let skipped = 0;

    const results = await Promise.allSettled(
      (accounts ?? []).map(async (account: any) => {
        checked++;

        // Determine staleness: use token_refreshed_at (or connected_at if never refreshed)
        // We use connected_at as fallback because that's when the long-lived token was issued
        const referenceTs: string | null =
          account.token_refreshed_at ?? account.connected_at ?? null;

        const isStale =
          referenceTs === null || referenceTs <= staleThreshold;

        // For expired tokens, always attempt refresh regardless of staleness
        const isExpired = account.health_status === "token_expired";

        if (!isStale && !isExpired) {
          skipped++;
          return { id: account.id, status: "skipped" };
        }

        console.log(
          `[TokenRefresh] Refreshing token for account ${account.id} (ref: ${referenceTs ?? "null"})`,
        );

        const currentToken = await decrypt(account.access_token, ENCRYPTION_KEY);

        const url =
          `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token` +
          `?grant_type=fb_exchange_token` +
          `&client_id=${META_APP_ID}` +
          `&client_secret=${META_APP_SECRET}` +
          `&fb_exchange_token=${encodeURIComponent(currentToken)}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
          const code = data.error.code;
          // v25.0 enhanced error logging
          console.error(`[TokenRefresh] Meta error for account ${account.id}:`, {
            code: data.error.code,
            subcode: data.error.error_subcode,
            message: data.error.message,
            user_title: data.error.error_user_title,
            user_msg: data.error.error_user_msg,
            fbtrace_id: data.error.fbtrace_id,
          });

          if (code === 190) {
            // Token is truly expired — mark it and notify owner
            await supabase
              .from("ad_accounts")
              .update({ health_status: "token_expired" })
              .eq("id", account.id);

            const ownerId = await getOrgOwner(supabase, account.organization_id);
            if (ownerId) {
              await sendInAppNotification(supabase, {
                userId: ownerId,
                type: "critical",
                category: "account",
                title: "Meta Account Disconnected — Reconnect Required",
                message: `Your Meta ad account "${account.name ?? account.platform_account_id}" has been disconnected because its access token expired before it could be refreshed. Please reconnect to resume campaigns.`,
                actionLabel: "Reconnect",
                actionUrl: "/settings/business",
                dedupKey: `token_expired:${account.id}:${today}`,
              });
            }
            failed++;
            return { id: account.id, status: "token_expired" };
          }

          failed++;
          return { id: account.id, status: "meta_error", code, msg: data.error.message };
        }

        const newToken: string = data.access_token;
        if (!newToken) {
          console.error(`[TokenRefresh] No access_token in response for account ${account.id}`);
          failed++;
          return { id: account.id, status: "no_token_in_response" };
        }

        const encryptedToken = await encrypt(newToken, ENCRYPTION_KEY);

        // Update token and restore health status if it was expired
        await supabase
          .from("ad_accounts")
          .update({
            access_token: encryptedToken,
            token_refreshed_at: new Date().toISOString(),
            health_status: "healthy",
            last_health_check: new Date().toISOString(),
          })
          .eq("id", account.id);

        // If this was an expired token that we just recovered, notify the owner
        if (isExpired) {
          const ownerId = await getOrgOwner(supabase, account.organization_id);
          if (ownerId) {
            await sendInAppNotification(supabase, {
              userId: ownerId,
              type: "success",
              category: "account",
              title: "Meta Account Reconnected",
              message: `Your Meta ad account "${account.name ?? account.platform_account_id}" has been successfully reconnected. Your campaigns can now resume.`,
              actionLabel: "View Account",
              actionUrl: "/settings/business",
              dedupKey: `token_restored:${account.id}:${today}`,
            });
          }
        }

        refreshed++;
        console.log(`[TokenRefresh] Successfully refreshed token for account ${account.id}`);
        return { id: account.id, status: "refreshed" };
      }),
    );

    return new Response(
      JSON.stringify({
        success: true,
        accountsChecked: checked,
        refreshed,
        failed,
        skipped,
        results: results.map((r) =>
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
    console.error("[TokenRefresh] Fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
