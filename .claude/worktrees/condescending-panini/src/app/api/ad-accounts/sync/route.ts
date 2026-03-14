import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Validate User
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2. Get Request Body (Account ID to sync)
  const { accountId } = await request.json(); // DB ID (uuid), not FB ID

  // 3. Fetch Token from DB
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("access_token, platform_account_id, platform")
    .eq("id", accountId)
    .single();

  if (!account) return new Response("Account not found", { status: 404 });

  // 4. Decrypt Token
  const accessToken = decrypt(account.access_token);

  // 5. Fetch Data from Platform
  let updateData = {};

  if (account.platform === "meta") {
    try {
      // Fetch Balance, Currency, Status, Funding Source
      const fields =
        "balance,currency,account_status,funding_source_details,amount_spent";
      const url = `https://graph.facebook.com/v24.0/${account.platform_account_id}?fields=${fields}&access_token=${accessToken}`;

      const res = await fetch(url);
      const fbData = await res.json();

      if (fbData.error) {
        // If token is invalid, update status to 'token_expired'
        await supabase
          .from("ad_accounts")
          .update({ health_status: "token_expired" })
          .eq("id", accountId);
        return NextResponse.json({
          success: false,
          error: fbData.error.message,
        });
      }

      // Map FB Status to our Enum
      // FB Status: 1=Active, 2=Disabled, 3=Unsettled, 7=Pending_Review, 9=In_Grace_Period
      let healthStatus = "healthy";
      if (fbData.account_status === 2) healthStatus = "disabled";
      if (fbData.account_status === 3 || fbData.account_status === 9)
        healthStatus = "payment_issue";

      updateData = {
        last_known_balance_cents: fbData.balance ? parseInt(fbData.balance) : 0, // FB returns "1234" for 12.34 usually, but check currency
        currency: fbData.currency,
        health_status: healthStatus,
        funding_source_details: fbData.funding_source_details || null,
        last_health_check: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Meta Sync Error", error);
      return new Response("Sync Failed", { status: 500 });
    }
  }

  // 6. Update Database
  const { error } = await supabase
    .from("ad_accounts")
    .update(updateData)
    .eq("id", accountId);

  if (error) return NextResponse.json({ success: false, error: error.message });

  return NextResponse.json({ success: true, data: updateData });
}
