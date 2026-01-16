import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { accountId } = await request.json(); // AdSync DB ID for the account

  // 1. Get Token
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    const token = decrypt(account.access_token);

    // 2. Fetch Active Campaigns from Meta
    const url = `https://graph.facebook.com/v24.0/${account.platform_account_id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=50&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    // 3. Upsert into DB
    const campaigns = data.data.map((c: any) => ({
      organization_id: account.organization_id,
      ad_account_id: account.id,
      platform: 'meta',
      platform_campaign_id: c.id,
      name: c.name,
      status: c.status.toLowerCase(), // ACTIVE -> active
      objective: c.objective.toLowerCase(),
      daily_budget_cents: c.daily_budget ? parseInt(c.daily_budget) : 0,
      updated_at: new Date().toISOString()
    }));

    if (campaigns.length > 0) {
      await supabase.from("campaigns").upsert(campaigns, {
        onConflict: 'platform_campaign_id'
      });
    }

    return NextResponse.json({ success: true, count: campaigns.length });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
}
}