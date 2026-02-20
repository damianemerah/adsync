import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { sendNotification } from "@/lib/notifications";
import { evaluatePostLaunchRules } from "@/lib/intelligence";
import type { CampaignMetrics } from "@/lib/intelligence/post-launch-rules";

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
      },
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
              metaData.error.message,
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
                supabase,
              );
              return { id: account.id, status: "alert_sent" };
            }
          }

          return { id: account.id, status: "ok", balance };
        } catch (err: any) {
          console.error(`Processing error [${account.id}]:`, err.message);
          throw err;
        }
      }),
    );

    // ── E. Post-Launch Rule Evaluation ──────────────────────────────────────
    // Fetch live campaigns that launched at least 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: liveCampaigns } = await supabase
      .from("campaigns")
      .select(
        `
        id,
        name,
        created_at,
        organization_id,
        campaign_insights (
          impressions,
          reach,
          clicks,
          ctr,
          cpc,
          spend,
          conversions
        )
      `,
      )
      .eq("status", "active")
      .lt("created_at", twoDaysAgo.toISOString())
      .limit(50); // Process up to 50 campaigns per cron run

    const postLaunchResults: Array<{
      campaignId: string;
      triggeredRules: number;
    }> = [];

    if (liveCampaigns && liveCampaigns.length > 0) {
      console.log(
        `[Cron] Evaluating post-launch rules for ${liveCampaigns.length} campaigns...`,
      );

      for (const campaign of liveCampaigns) {
        try {
          const insight = (campaign.campaign_insights as any[])?.[0];
          if (!insight) continue;

          const createdAt = new Date(campaign.created_at);
          const now = new Date();
          const ageHours =
            (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          const ageDays = ageHours / 24;

          // Build metrics object for rule evaluation
          const metrics: CampaignMetrics = {
            campaignId: campaign.id,
            campaignName: campaign.name,
            ageHours,
            ageDays,
            impressions: insight.impressions ?? 0,
            reach: insight.reach ?? 0,
            clicks: insight.clicks ?? 0,
            ctr: insight.ctr ?? 0,
            cpcNgn: insight.cpc ?? 0,
            spendNgn: insight.spend ?? 0,
            conversions: insight.conversions ?? 0,
          };

          const triggeredRules = evaluatePostLaunchRules(metrics);

          if (triggeredRules.length > 0) {
            console.log(
              `[PostLaunch] ${triggeredRules.length} rule(s) triggered for campaign ${campaign.id}`,
            );

            // Fetch organization owner to notify
            const { data: owner } = await supabase
              .from("organization_members")
              .select("user_id")
              .eq("organization_id", campaign.organization_id)
              .eq("role", "owner")
              .single();

            if (owner) {
              // Send one notification per triggered rule (most severe first)
              const sorted = triggeredRules.sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2, success: 3 };
                return order[a.severity] - order[b.severity];
              });

              // Only send the most actionable rule to avoid notification spam
              const topRule = sorted[0];
              await sendNotification(
                {
                  userId: owner.user_id,
                  organizationId: campaign.organization_id,
                  title:
                    topRule.severity === "critical"
                      ? "⚠️ Campaign Needs Attention"
                      : topRule.severity === "warning"
                        ? "Campaign Alert"
                        : topRule.severity === "success"
                          ? "🚀 Scale Opportunity"
                          : "Campaign Update",
                  message: topRule.message,
                  type:
                    topRule.severity === "success" ? "info" : topRule.severity,
                  category: "campaign",
                  actionUrl: `/campaigns/${campaign.id}`,
                  actionLabel: "View Campaign",
                },
                supabase,
              );
            }

            postLaunchResults.push({
              campaignId: campaign.id,
              triggeredRules: triggeredRules.length,
            });
          }
        } catch (ruleErr: any) {
          console.error(
            `[PostLaunch] Error evaluating campaign ${campaign.id}:`,
            ruleErr.message,
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: results.map((r) => r.status),
      postLaunchEvaluated: liveCampaigns?.length ?? 0,
      postLaunchTriggered: postLaunchResults.length,
    });
  } catch (error: any) {
    console.error("Cron Job Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
