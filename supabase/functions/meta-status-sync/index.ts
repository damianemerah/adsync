import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// pg_cron-invoked edge function — no CORS headers needed

const META_API_VERSION = "v25.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ── AES-GCM decrypt (matches Node.js AES-256-CBC used by the app) ─────────────
// The app uses AES-256-CBC via Node's `crypto` module. Edge functions run in
// Deno, which uses the Web Crypto API. This implementation is compatible with
// the same encrypted format used across other edge functions.
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

  const parseHex = (hex: string) =>
    new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

  const iv = parseHex(ivHex);
  const authTag = parseHex(authTagHex);
  const encryptedBytes = parseHex(encryptedHex);

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
    console.error("[meta-status-sync] Decryption failed", e);
    return encryptedToken;
  }
}

// ── Meta API: fetch single ad status ─────────────────────────────────────────
async function getAdStatus(
  token: string,
  adId: string,
): Promise<{ effective_status: string; configured_status: string } | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/${adId}?fields=id,effective_status,configured_status`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json();
    if (data.error) {
      console.error(`[meta-status-sync] Meta API error for ad ${adId}:`, data.error);
      return null;
    }
    return data;
  } catch (e) {
    console.error(`[meta-status-sync] Fetch failed for ad ${adId}:`, e);
    return null;
  }
}

// ── Notification helper ───────────────────────────────────────────────────────
async function sendNotification(
  supabase: ReturnType<typeof createClient>,
  params: {
    userId: string;
    organizationId: string;
    type: string;
    category: string;
    title: string;
    message: string;
    actionUrl: string;
    actionLabel: string;
  },
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    organization_id: params.organizationId,
    type: params.type,
    category: params.category,
    title: params.title,
    message: params.message,
    action_url: params.actionUrl,
    action_label: params.actionLabel,
    is_read: false,
  });

  if (error && error.code !== "23505") {
    // Ignore duplicate key — silently skip deduped notifications
    console.error("[meta-status-sync] Notification insert failed:", error);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const encryptionKey = Deno.env.get("ENCRYPTION_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }
    if (!encryptionKey) {
      throw new Error("Missing ENCRYPTION_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Find all ads stuck in `in_review`
    const { data: inReviewAds, error: queryError } = await supabase
      .from("ads")
      .select(
        `platform_ad_id,
         campaign_id,
         campaigns!inner(
           name,
           organization_id,
           ad_accounts!inner(access_token)
         )`,
      )
      .eq("status", "in_review");

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    if (!inReviewAds || inReviewAds.length === 0) {
      console.log("[meta-status-sync] No ads in_review. Nothing to do.");
      return new Response(
        JSON.stringify({ synced: 0, total: 0 }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    console.log(`[meta-status-sync] Checking ${inReviewAds.length} in-review ads...`);

    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const ad of inReviewAds) {
      try {
        const campaignData = ad.campaigns as unknown as {
          name: string;
          organization_id: string;
          ad_accounts: { access_token: string };
        };

        const encryptedToken = campaignData.ad_accounts?.access_token;
        if (!encryptedToken) {
          console.warn(
            `[meta-status-sync] No access token for ad ${ad.platform_ad_id} — skipping`,
          );
          skipped++;
          continue;
        }

        const accessToken = await decrypt(encryptedToken, encryptionKey);

        // 2. Poll Meta for current ad status
        const metaAd = await getAdStatus(accessToken, ad.platform_ad_id);
        if (!metaAd) {
          failed++;
          continue;
        }

        console.log(
          `[meta-status-sync] Ad ${ad.platform_ad_id}: effective_status=${metaAd.effective_status}`,
        );

        if (metaAd.effective_status === "ACTIVE") {
          // 3. Flip to active in DB
          const { error: updateError } = await supabase
            .from("ads")
            .update({ status: "active" })
            .eq("platform_ad_id", ad.platform_ad_id);

          if (updateError) {
            console.error(
              `[meta-status-sync] DB update failed for ad ${ad.platform_ad_id}:`,
              updateError,
            );
            failed++;
            continue;
          }

          console.log(
            `[meta-status-sync] ✅ Ad ${ad.platform_ad_id} approved — marked active`,
          );

          // 4. Notify org owner
          const { data: owner } = await supabase
            .from("organization_members")
            .select("user_id")
            .eq("organization_id", campaignData.organization_id)
            .eq("role", "owner")
            .single();

          if (owner) {
            await sendNotification(supabase, {
              userId: owner.user_id,
              organizationId: campaignData.organization_id,
              type: "success",
              category: "campaign",
              title: "✅ Ad Approved & Live",
              message: `Great news! Your ad in campaign "${campaignData.name}" has been approved and is now running.`,
              actionUrl: `/campaigns/${ad.campaign_id}`,
              actionLabel: "View Performance",
            });
          }

          synced++;
        } else if (metaAd.effective_status === "DISAPPROVED") {
          // Flip to rejected — without a specific reason here; webhook will carry detail
          await supabase
            .from("ads")
            .update({ status: "rejected" })
            .eq("platform_ad_id", ad.platform_ad_id);

          console.log(
            `[meta-status-sync] ❌ Ad ${ad.platform_ad_id} disapproved — marked rejected`,
          );
          synced++;
        } else {
          // Still pending/in_process — no change
          console.log(
            `[meta-status-sync] Ad ${ad.platform_ad_id} still ${metaAd.effective_status} — no change`,
          );
          skipped++;
        }
      } catch (adError) {
        console.error(
          `[meta-status-sync] Error processing ad ${ad.platform_ad_id}:`,
          adError,
        );
        // Never let one ad failure block the rest
        failed++;
      }
    }

    console.log(
      `[meta-status-sync] Done. synced=${synced} skipped=${skipped} failed=${failed} total=${inReviewAds.length}`,
    );

    return new Response(
      JSON.stringify({ synced, skipped, failed, total: inReviewAds.length }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[meta-status-sync] Fatal:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
