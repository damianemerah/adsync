import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { sendNotification } from "@/lib/notifications";

// Vercel Cron config
export const maxDuration = 60; // Allow it to run for up to 60 seconds
export const dynamic = "force-dynamic";

const META_API_VERSION = "v24.0";
const LOW_BALANCE_THRESHOLD = 200000; // e.g. 2000 units (approx ₦2,000 if using kobo logic, adjust based on meta response units)

export async function GET(request: Request) {
  try {
    // 1. Security Check (CRON_SECRET)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Init Admin Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 3. Fetch All Connected Accounts
    const { data: accounts, error } = await supabase
      .from("ad_accounts")
      .select("*")
      .eq("health_status", "healthy") // Only check healthy ones
      .not("access_token", "is", null);

    if (error) throw error;
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ message: "No accounts to check" });
    }

    console.log(`[Cron] Checking ${accounts.length} ad accounts...`);

    // 4. Parallel Processing (Faster)
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          // A. Decrypt Token
          const accessToken = decrypt(account.access_token);
          const actId = account.platform_account_id.startsWith("act_")
            ? account.platform_account_id
            : `act_${account.platform_account_id}`;

          // B. Call Meta API
          // Note: 'balance' returns the amount formatted in basic units (e.g. cents/kobo)
          const url = `https://graph.facebook.com/${META_API_VERSION}/${actId}?fields=balance,currency,account_status&access_token=${accessToken}`;
          const res = await fetch(url);
          const metaData = await res.json();

          if (metaData.error) {
            console.error(
              `Meta Error [${account.id}]:`,
              metaData.error.message
            );
            // If invalid token, mark as expired in DB so we stop checking it
            if (metaData.error.code === 190) {
              await supabase
                .from("ad_accounts")
                .update({ health_status: "token_expired" })
                .eq("id", account.id);
            }
            return {
              id: account.id,
              status: "error",
              msg: metaData.error.message,
            };
          }

          const balance = parseInt(metaData.balance || "0");
          const fbStatus = metaData.account_status; // 1=Active, 2=Disabled

          // C. Update Local Cache (Keep Dashboard fresh)
          await supabase
            .from("ad_accounts")
            .update({
              last_known_balance_cents: balance,
              last_health_check: new Date().toISOString(),
              health_status: fbStatus === 2 ? "disabled" : "healthy", // Auto-detect bans
            })
            .eq("id", account.id);

          // D. Alert Logic
          // Only alert if Active AND Prepaid Balance is Low
          // (Note: Postpaid accounts usually show "Balance" as amount owed, logic differs)
          if (fbStatus === 1 && balance < LOW_BALANCE_THRESHOLD) {
            // Get Owner
            const { data: owner } = await supabase
              .from("organization_members")
              .select("user_id")
              .eq("organization_id", account.organization_id)
              .eq("role", "owner")
              .single();

            if (owner) {
              await sendNotification(
                {
                  userId: owner.user_id,
                  organizationId: account.organization_id,
                  title: "Low Ad Balance",
                  message: `Your ad account balance is low (${
                    metaData.currency
                  } ${(
                    balance / 100
                  ).toLocaleString()}). Top up to keep ads running.`,
                  type: "warning",
                  category: "budget",
                  actionUrl: "/ad-accounts",
                  actionLabel: "View Account",
                },
                supabase
              );
              return { id: account.id, status: "alert_sent" };
            }
          }

          return { id: account.id, status: "ok", balance };
        } catch (err: any) {
          console.error(`Processing error [${account.id}]:`, err.message);
          throw err;
        }
      })
    );

    return NextResponse.json({
      success: true,
      summary: results.map((r) => r.status),
    });
  } catch (error: any) {
    console.error("Cron Job Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
