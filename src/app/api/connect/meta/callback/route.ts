import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { TIER_CONFIG, TierId } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // Expected format: "userId:orgId"
  const [userId, orgId] = (state || "").split(":");
  const error = searchParams.get("error");

  console.log("🚀🔥Meta Callback Params:", { code, state, error });

  if (error || !code) {
    console.debug("[Meta Callback] Rejected by user or missing code", {
      error,
      code,
      state,
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=meta_rejected`,
    );
  }

  // 1. Exchange Code for Short-Lived Token (Updated to v25.0)
  const tokenUrl = `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/connect/meta/callback&client_secret=${process.env.META_APP_SECRET}&code=${code}`;
  console.debug("[Meta Callback] Exchanging code for short-lived token", {
    tokenUrl,
  });

  const tokenRes = await fetch(tokenUrl);
  const tokenData = await tokenRes.json();

  console.debug("[Meta Callback] Token Response:", tokenData);

  if (!tokenData.access_token) {
    console.error("[Meta Callback] Meta Token Error:", tokenData);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=token_failed`,
    );
  }

  // 2. Exchange Short-Lived for Long-Lived Token (60 Days) (Updated to v25.0)
  const longLivedUrl = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`;
  console.debug("[Meta Callback] Exchanging for long-lived token", {
    longLivedUrl,
  });

  const longRes = await fetch(longLivedUrl);
  const longData = await longRes.json();
  console.debug("[Meta Callback] Long-Lived Token Response:", longData);

  // ⚠️ CRITICAL: Only accept long-lived token, no fallback to short-lived
  if (!longData.access_token) {
    console.error("[Meta Callback] Long-lived token exchange failed:", longData);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/business?error=token_exchange_failed`,
    );
  }

  const finalToken = longData.access_token;
  console.debug("[Meta Callback] Long-lived token obtained successfully");

  // 2b. Validate token expiration using debug_token endpoint
  const debugUrl = `https://graph.facebook.com/v25.0/debug_token?input_token=${finalToken}&access_token=${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const debugRes = await fetch(debugUrl);
  const debugData = await debugRes.json();

  if (debugData.data?.expires_at) {
    const expiresAtSeconds = debugData.data.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const daysUntilExpiry = (expiresAtSeconds - now) / (60 * 60 * 24);

    console.debug("[Meta Callback] Token validation:", {
      expires_at: new Date(expiresAtSeconds * 1000).toISOString(),
      days_until_expiry: Math.floor(daysUntilExpiry),
    });

    // Verify we got a long-lived token (should be ~60 days)
    if (daysUntilExpiry < 30) {
      console.error("[Meta Callback] Token expiration too short:", {
        days: daysUntilExpiry,
        expected: "~60 days",
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/business?error=token_lifetime_too_short`,
      );
    }
  } else {
    console.warn("[Meta Callback] Could not validate token expiration");
  }

  // 3. Get User's Organization
  const supabase = await createClient(); // Await not needed for creating client, but needed for DB calls
  console.debug("[Meta Callback] Querying users table for id", { userId });
  const { data: userData, error: userQueryError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId as string)
    .maybeSingle();

  if (userQueryError) {
    console.error("[Meta Callback] Supabase user query error", userQueryError);
  }

  console.debug("[Meta Callback] User Data:", userData);

  if (!userData) {
    console.warn("[Meta Callback] No user found, redirecting to login");
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  // targetOrgId to use
  let targetOrgId = orgId;

  if (!targetOrgId) {
    console.debug(
      "[Meta Callback] No orgId in state, querying organization_members for user",
      {
        user_id: userData.id,
      },
    );
    // Fallback if missing
    const { data: memberData, error: orgQueryError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.id)
      .limit(1)
      .maybeSingle();

    if (orgQueryError) {
      console.error(
        "[Meta Callback] Organization member query error",
        orgQueryError,
      );
    }
    targetOrgId = memberData?.organization_id as string;
  } else {
    // Verify membership
    const { data: memberData, error: orgQueryError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.id)
      .eq("organization_id", targetOrgId)
      .maybeSingle();

    if (!memberData) {
      console.error(
        "[Meta Callback] User is not a member of the requested org",
      );
      targetOrgId = undefined as any;
    }
  }

  if (!targetOrgId) {
    console.warn("[Meta Callback] No valid organization member found");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=no_org`,
    );
  }

  // 3b. Enforce maxAdAccounts tier limit (defense-in-depth)
  const { data: orgData } = await supabase
    .from("organizations")
    .select("subscription_tier")
    .eq("id", targetOrgId)
    .single();

  const tier = (orgData?.subscription_tier || "starter") as TierId;
  const maxAccounts = TIER_CONFIG[tier]?.limits?.maxAdAccounts ?? 1;

  const { count: existingCount } = await supabase
    .from("ad_accounts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", targetOrgId);

  if ((existingCount ?? 0) >= maxAccounts) {
    console.warn(
      `[Meta Callback] Ad account limit reached (${existingCount}/${maxAccounts}) for tier ${tier}`,
    );
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/business?error=account_limit_reached`,
    );
  }

  // 4. Fetch the Ad Accounts attached to this token (Updated to v25.0)
  // We fetch 'amount_spent' to check activity, though funding details might be in a different edge
  const adAccountsUrl = `https://graph.facebook.com/v25.0/me/adaccounts?fields=name,account_id,currency,amount_spent&access_token=${finalToken}`;
  console.debug("[Meta Callback] Fetching ad accounts from Meta", {
    adAccountsUrl,
  });

  const accountsRes = await fetch(adAccountsUrl);
  const accountsData = await accountsRes.json();

  console.debug("[Meta Callback] Ad Accounts Data:", accountsData);

  // 5. Save to Database (Encrypted)
  if (accountsData.data && accountsData.data.length > 0) {
    if (accountsData.data.length === 1) {
      // Single account — save immediately, no picker needed
      const acc = accountsData.data[0];

      console.debug("[Meta Callback] Single account — upserting directly", {
        organization_id: targetOrgId,
        platform_account_id: acc.account_id,
      });

      const { error: upsertError } = await supabase.from("ad_accounts").upsert(
        {
          organization_id: targetOrgId,
          platform: "meta",
          platform_account_id: acc.account_id,
          account_name: acc.name,
          currency: acc.currency,
          access_token: encrypt(finalToken),
          health_status: "healthy",
          last_health_check: new Date().toISOString(),
          disconnected_at: null,
          // First account ever for this org becomes default automatically
          ...(existingCount === 0 ? { is_default: true } : {}),
        },
        { onConflict: "organization_id, platform, platform_account_id" },
      );

      if (upsertError) {
        console.error("[Meta Callback] DB Error:", upsertError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=db_save_failed`,
        );
      }

      // Subscribe this ad account to Meta webhooks (fire-and-forget)
      subscribeToMetaWebhooks(acc.account_id, finalToken).catch((err) => {
        console.warn("[Meta Callback] Webhook subscription failed silently:", err);
      });

      try {
        const { data: newAccount } = await supabase
          .from("ad_accounts")
          .select("id")
          .eq("organization_id", targetOrgId)
          .eq("platform_account_id", acc.account_id)
          .single();

        if (newAccount?.id) {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/campaigns/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId: newAccount.id }),
          }).catch((syncErr) => {
            console.warn("[Meta Callback] Initial sync failed silently:", syncErr);
          });
        }
      } catch (syncSetupErr) {
        console.warn("[Meta Callback] Could not initiate auto-sync:", syncSetupErr);
      }

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=meta_connected`,
      );
    } else {
      // Multiple accounts — store in pending session and let user choose
      console.debug("[Meta Callback] Multiple accounts found, creating pending session", {
        count: accountsData.data.length,
      });

      const accounts = accountsData.data.map((a: any) => ({
        account_id: a.account_id,
        name: a.name,
        currency: a.currency,
      }));

      const { data: pendingSession, error: pendingError } = await supabase
        .from("meta_oauth_pending")
        .insert({
          user_id: userId,
          org_id: targetOrgId,
          accounts,
          access_token: encrypt(finalToken),
        })
        .select("id")
        .single();

      if (pendingError || !pendingSession) {
        console.error("[Meta Callback] Failed to create pending session:", pendingError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/settings/business?error=db_save_failed`,
        );
      }

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/business?meta_session=${pendingSession.id}`,
      );
    }
  } else {
    console.warn(
      "[Meta Callback] No ad accounts found in Meta API response",
      accountsData,
    );
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=meta_connected`,
  );
}

// ─── Webhook Subscription ─────────────────────────────────────────────────────
// Subscribes the ad account to Meta webhooks so events fire to /api/webhooks/meta.
// Must be called after saving each ad account — Meta requires per-account subscription.

async function subscribeToMetaWebhooks(platformAccountId: string, accessToken: string) {
  const actId = platformAccountId.startsWith("act_")
    ? platformAccountId
    : `act_${platformAccountId}`;

  const res = await fetch(
    `https://graph.facebook.com/v25.0/${actId}/subscribed_apps`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        subscribed_fields:
          "with_issues_ad_objects,in_process_ad_objects,ad_account_update,client_account_status,leadgen,ads,adsets,campaigns",
        access_token: accessToken,
      }),
    },
  );

  const data = await res.json();
  if (data.success) {
    console.log(`[Meta Webhook] Subscribed account ${actId} to webhook fields`);
  } else {
    console.error(`[Meta Webhook] Subscription failed for ${actId}:`, data);
  }
}
