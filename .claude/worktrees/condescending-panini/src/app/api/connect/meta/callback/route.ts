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

  // 1. Exchange Code for Short-Lived Token (Updated to v24.0)
  const tokenUrl = `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/connect/meta/callback&client_secret=${process.env.META_APP_SECRET}&code=${code}`;
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

  // 2. Exchange Short-Lived for Long-Lived Token (60 Days) (Updated to v24.0)
  const longLivedUrl = `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`;
  console.debug("[Meta Callback] Exchanging for long-lived token", {
    longLivedUrl,
  });

  const longRes = await fetch(longLivedUrl);
  const longData = await longRes.json();
  console.debug("[Meta Callback] Long-Lived Token Response:", longData);

  const finalToken = longData.access_token || tokenData.access_token; // Fallback if exchange fails
  console.debug("[Meta Callback] Final access token selected", {
    finalToken: finalToken ? "[REDACTED]" : "undefined",
  });

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

  // 4. Fetch the Ad Accounts attached to this token (Updated to v24.0)
  // We fetch 'amount_spent' to check activity, though funding details might be in a different edge
  const adAccountsUrl = `https://graph.facebook.com/v24.0/me/adaccounts?fields=name,account_id,currency,amount_spent&access_token=${finalToken}`;
  console.debug("[Meta Callback] Fetching ad accounts from Meta", {
    adAccountsUrl,
  });

  const accountsRes = await fetch(adAccountsUrl);
  const accountsData = await accountsRes.json();

  console.debug("[Meta Callback] Ad Accounts Data:", accountsData);

  // 5. Save to Database (Encrypted)
  if (accountsData.data && accountsData.data.length > 0) {
    // For MVP, we add the first account found. In V2, we loop or ask user to select.
    const acc = accountsData.data[0];

    console.debug("[Meta Callback] Upserting ad account", {
      organization_id: targetOrgId,
      platform: "meta",
      platform_account_id: acc.account_id,
      account_name: acc.name,
      currency: acc.currency,
    });

    const { error: upsertError } = await supabase.from("ad_accounts").upsert(
      {
        organization_id: targetOrgId,
        platform: "meta",
        platform_account_id: acc.account_id,
        account_name: acc.name,
        currency: acc.currency,
        access_token: encrypt(finalToken), // 🔒 Secure storage
        health_status: "healthy",
        last_health_check: new Date().toISOString(),
        // Note: You might want to fetch/store funding source details here too if available
      },
      { onConflict: "organization_id, platform, platform_account_id" },
    );

    if (upsertError) {
      console.error("[Meta Callback] DB Error:", upsertError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=db_save_failed`,
      );
    }
    console.debug("[Meta Callback] Ad account upserted successfully");

    // ✅ AUTO-SYNC: Trigger campaign sync immediately after account is connected
    // This ensures campaigns are populated without the user having to press "Sync".
    // We look up the newly upserted account's DB uuid first.
    try {
      const { data: newAccount } = await supabase
        .from("ad_accounts")
        .select("id")
        .eq("organization_id", targetOrgId)
        .eq("platform_account_id", acc.account_id)
        .single();

      if (newAccount?.id) {
        console.debug(
          "[Meta Callback] Triggering initial campaign sync for account",
          newAccount.id,
        );
        // Fire-and-forget: don't await so the redirect is instant
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/campaigns/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: newAccount.id }),
        }).catch((syncErr) => {
          // Non-critical: user can manually sync later if this fails
          console.warn(
            "[Meta Callback] Initial sync failed silently:",
            syncErr,
          );
        });
      }
    } catch (syncSetupErr) {
      // Non-blocking — don't fail the redirect if sync setup throws
      console.warn(
        "[Meta Callback] Could not initiate auto-sync:",
        syncSetupErr,
      );
    }
  } else {
    console.warn(
      "[Meta Callback] No ad accounts found in Meta API response",
      accountsData,
    );
  }

  console.debug("[Meta Callback] Redirecting to dashboard with success");
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=meta_connected`,
  );
}
