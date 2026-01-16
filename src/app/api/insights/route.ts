import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { MetaService } from "@/lib/api/meta";

export async function GET(request: Request) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2. Get Org & Ad Account
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!member) return new Response("No Org", { status: 400 });

  const { data: account } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("organization_id", member.organization_id as string)
    .eq("platform", "meta") // Focusing on Meta for MVP
    .eq("health_status", "healthy")
    .limit(1)
    .single();

  if (!account) {
    // Return empty zeros if no account connected (not an error)
    return NextResponse.json({
      spend: 0,
      impressions: 0,
      clicks: 0,
      cpc: 0,
      ctr: 0,
      reach: 0,
    });
  }

  try {
    // 3. Call Meta API
    const accessToken = decrypt(account.access_token);
    const data = await MetaService.getAccountInsights(
      accessToken,
      account.platform_account_id
    );

    // 4. Format Data
    // Meta returns an array (one item per date range). We take the first one.
    const stats = data.data?.[0] || {};

    return NextResponse.json({
      spend: stats.spend || 0,
      impressions: stats.impressions || 0,
      clicks: stats.clicks || 0,
      cpc: stats.cpc || 0,
      ctr: stats.ctr || 0,
      reach: stats.reach || 0,
    });
  } catch (error: any) {
    console.error("Insights Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
