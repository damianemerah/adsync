import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // This is the User ID
  const error = searchParams.get("error");

  console.log("🚀🔥Meta Callback Params:", { code, state, error });

  if (error || !code) {
    console.debug("[Meta Callback] Rejected by user or missing code", {
      error,
      code,
      state,
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/ad-accounts?error=meta_rejected`
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
      `${process.env.NEXT_PUBLIC_APP_URL}/ad-accounts?error=token_failed`
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
  console.debug("[Meta Callback] Querying users table for id", { state });
  const { data: userData, error: userQueryError } = await supabase
    .from("users")
    .select("id")
    .eq("id", state as string)
    .maybeSingle();

  if (userQueryError) {
    console.error("[Meta Callback] Supabase user query error", userQueryError);
  }

  console.debug("[Meta Callback] User Data:", userData);

  if (!userData) {
    console.warn("[Meta Callback] No user found, redirecting to login");
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  // Get the Organization ID
  console.debug("[Meta Callback] Querying organization_members for user", {
    user_id: userData.id,
  });
  const { data: memberData, error: orgQueryError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userData.id)
    .single();

  if (orgQueryError) {
    console.error(
      "[Meta Callback] Organization member query error",
      orgQueryError
    );
  }
  console.debug("[Meta Callback] Organization Membership Data:", memberData);

  if (!memberData) {
    console.warn("[Meta Callback] No organization member found");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/ad-accounts?error=no_org`
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
      organization_id: memberData.organization_id,
      platform: "meta",
      platform_account_id: acc.account_id,
      account_name: acc.name,
      currency: acc.currency,
    });

    const { error: upsertError } = await supabase.from("ad_accounts").upsert(
      {
        organization_id: memberData.organization_id,
        platform: "meta",
        platform_account_id: acc.account_id,
        account_name: acc.name,
        currency: acc.currency,
        access_token: encrypt(finalToken), // 🔒 Secure storage
        health_status: "healthy",
        last_health_check: new Date().toISOString(),
        // Note: You might want to fetch/store funding source details here too if available
      },
      { onConflict: "organization_id, platform, platform_account_id" }
    );

    if (upsertError) {
      console.error("[Meta Callback] DB Error:", upsertError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/ad-accounts?error=db_save_failed`
      );
    }
    console.debug("[Meta Callback] Ad account upserted successfully");
  } else {
    console.warn(
      "[Meta Callback] No ad accounts found in Meta API response",
      accountsData
    );
  }

  console.debug("[Meta Callback] Redirecting to ad-accounts with success");
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/ad-accounts?success=meta_connected`
  );
}
