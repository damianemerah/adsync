import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";
import { TIER_CONFIG, TierId } from "@/lib/constants";
import { activateTrialIfNeeded } from "@/lib/trial-activation";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, accountId } = body as {
    sessionId: string;
    accountId: string;
  };

  if (!sessionId || !accountId) {
    return NextResponse.json(
      { error: "sessionId and accountId are required" },
      { status: 400 },
    );
  }

  // 1. Load and validate the pending session
  const { data: session, error: sessionError } = await supabase
    .from("meta_oauth_pending")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Session not found or already used" },
      { status: 404 },
    );
  }

  if (new Date(session.expires_at) < new Date()) {
    await supabase.from("meta_oauth_pending").delete().eq("id", sessionId);
    return NextResponse.json(
      { error: "Session expired. Please reconnect your Meta account." },
      { status: 410 },
    );
  }

  // 2. Find the chosen account in the session
  const accounts = session.accounts as Array<{
    account_id: string;
    name: string;
    currency: string;
  }>;
  const chosen = accounts.find((a) => a.account_id === accountId);

  if (!chosen) {
    return NextResponse.json(
      { error: "Selected account not found in session" },
      { status: 400 },
    );
  }

  const orgId = session.org_id;

  // 3. Re-check tier limit
  const { data: userSubData } = await supabase
    .from("user_subscriptions")
    .select("subscription_tier")
    .eq("user_id", user.id)
    .maybeSingle();

  const tier = (userSubData?.subscription_tier || "starter") as TierId;
  const maxAccounts = TIER_CONFIG[tier]?.limits?.maxAdAccounts ?? 1;

  const { count: existingCount } = await supabase
    .from("ad_accounts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .is("disconnected_at", null);

  if ((existingCount ?? 0) >= maxAccounts) {
    return NextResponse.json(
      {
        error: `Ad account limit reached (${existingCount}/${maxAccounts}) for your plan.`,
      },
      { status: 403 },
    );
  }

  // 4. Decrypt token and upsert chosen account
  const accessToken = decrypt(session.access_token);

  const { error: upsertError } = await supabase.from("ad_accounts").upsert(
    {
      organization_id: orgId,
      platform: "meta",
      platform_account_id: chosen.account_id,
      account_name: chosen.name,
      currency: chosen.currency,
      access_token: encrypt(accessToken),
      health_status: "healthy",
      last_health_check: new Date().toISOString(),
      connected_at: new Date().toISOString(),
      token_expires_at: session.token_expires_at ?? null,
      token_refreshed_at: null,
      disconnected_at: null,
      // First account for this org becomes default automatically
      ...(existingCount === 0 ? { is_default: true } : {}),
    },
    { onConflict: "organization_id, platform, platform_account_id" },
  );

  if (upsertError) {
    console.error("[Meta Select] DB upsert error:", upsertError);
    return NextResponse.json(
      { error: "Failed to save ad account" },
      { status: 500 },
    );
  }

  // Activate trial exactly once — idempotent, anti-exploit guard inside
  await activateTrialIfNeeded(supabase, orgId, user.id);

  // 5. Subscribe this ad account to Meta webhooks (fire-and-forget)
  subscribeToMetaWebhooks(chosen.account_id, accessToken).catch((err) => {
    console.warn("[Meta Select] Webhook subscription failed silently:", err);
  });

  // 6. Delete the pending session (consumed)
  await supabase.from("meta_oauth_pending").delete().eq("id", sessionId);

  // 7. Fire-and-forget campaign sync
  try {
    const { data: newAccount } = await supabase
      .from("ad_accounts")
      .select("id")
      .eq("organization_id", orgId)
      .eq("platform_account_id", chosen.account_id)
      .single();

    if (newAccount?.id) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/campaigns/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: newAccount.id }),
      }).catch((err) => {
        console.warn("[Meta Select] Initial sync failed silently:", err);
      });
    }
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ success: true });
}

// ─── Webhook Subscription ─────────────────────────────────────────────────────

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
