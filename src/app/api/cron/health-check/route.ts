import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { sendNotification } from "@/lib/notifications/sender";
import { evaluatePostLaunchRules } from "@/lib/intelligence";
import type { CampaignMetrics } from "@/lib/intelligence/post-launch-rules";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const META_API_VERSION = "v24.0";

// ── Balance Thresholds (in meta's native units, e.g. Nigerian kobo/cents) ──
// Meta returns balance as a string integer in the account's currency minor unit.
// For NGN: 1 NGN = 100 units. So ₦5,000 = 500_000 units.
const BALANCE_WARN_THRESHOLD = 500_000;  // ₦5,000 → send warning, watch closely
const BALANCE_PAUSE_THRESHOLD = 200_000; // ₦2,000 → pause all active campaigns NOW

// ── Dedup window helpers ────────────────────────────────────────────────────
// Returns ISO week string like "2026-W09" so rules re-arm weekly
function isoWeek(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Returns YYYY-MM-DD — rules using this re-arm daily
function isoDay(date = new Date()): string {
  return date.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // ── Admin client ──────────────────────────────────────────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const today = isoDay();
    const week = isoWeek();

    // ── Helper: get org owner ────────────────────────────────────────────────
    async function getOrgOwner(organizationId: string) {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("role", "owner")
        .single();
      return data?.user_id ?? null;
    }

    // ── Helper: pause all active campaigns via Meta API ──────────────────────
    async function pauseAccountCampaigns(
      accessToken: string,
      platformAccountId: string,
    ): Promise<number> {
      const actId = platformAccountId.startsWith("act_")
        ? platformAccountId
        : `act_${platformAccountId}`;

      // Fetch active campaign IDs from Meta
      const listUrl = `https://graph.facebook.com/${META_API_VERSION}/${actId}/campaigns?fields=id,status&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&limit=50&access_token=${accessToken}`;
      const listRes = await fetch(listUrl);
      const listData = await listRes.json();

      if (listData.error || !listData.data) return 0;

      let paused = 0;
      for (const campaign of listData.data) {
        try {
          const pauseRes = await fetch(
            `https://graph.facebook.com/${META_API_VERSION}/${campaign.id}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                status: "PAUSED",
                access_token: accessToken,
              }),
            },
          );
          const pauseData = await pauseRes.json();
          if (pauseData.success) paused++;
        } catch (err: any) {
          console.error(`[Pause] Failed campaign ${campaign.id}:`, err.message);
        }
      }

      return paused;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION A: Ad Account Balance Checks
    // ════════════════════════════════════════════════════════════════════════
    const { data: accounts, error: accErr } = await supabase
      .from("ad_accounts")
      .select("*")
      .in("health_status", ["healthy", "paused_by_system"])
      .not("access_token", "is", null);

    if (accErr) throw accErr;

    console.log(`[Cron] Checking ${accounts?.length ?? 0} ad accounts...`);

    const accountResults = await Promise.allSettled(
      (accounts ?? []).map(async (account) => {
        try {
          const accessToken = decrypt(account.access_token);
          const actId = account.platform_account_id.startsWith("act_")
            ? account.platform_account_id
            : `act_${account.platform_account_id}`;

          // Call Meta for balance + status
          const url = `https://graph.facebook.com/${META_API_VERSION}/${actId}?fields=balance,currency,account_status&access_token=${accessToken}`;
          const res = await fetch(url);
          const metaData = await res.json();

          if (metaData.error) {
            if (metaData.error.code === 190) {
              await supabase
                .from("ad_accounts")
                .update({ health_status: "token_expired" })
                .eq("id", account.id);
            }
            return { id: account.id, status: "meta_error", msg: metaData.error.message };
          }

          const balance = parseInt(metaData.balance || "0");
          const fbStatus = metaData.account_status; // 1=Active, 2=Disabled

          // Update cached balance
          await supabase
            .from("ad_accounts")
            .update({
              last_known_balance_cents: balance,
              last_health_check: new Date().toISOString(),
              health_status: fbStatus === 2 ? "disabled" : account.health_status === "paused_by_system" ? "paused_by_system" : "healthy",
            })
            .eq("id", account.id);

          if (fbStatus !== 1) return { id: account.id, status: "not_active" };

          const ownerId = await getOrgOwner(account.organization_id);
          if (!ownerId) return { id: account.id, status: "no_owner" };

          const currency = metaData.currency ?? "NGN";
          const balanceFormatted = `${currency} ${(balance / 100).toLocaleString()}`;

          // ── TIER 1: CRITICAL — Balance below pause threshold ──────────────
          if (balance < BALANCE_PAUSE_THRESHOLD) {
            // Only pause if not already paused by us
            if (!account.paused_by_system) {
              console.log(`[Balance] CRITICAL for account ${account.id} — pausing campaigns`);
              const pausedCount = await pauseAccountCampaigns(accessToken, account.platform_account_id);

              await supabase
                .from("ad_accounts")
                .update({
                  health_status: "paused_by_system",
                  paused_by_system: true,
                  auto_paused_at: new Date().toISOString(),
                })
                .eq("id", account.id);

              await sendNotification({
                userId: ownerId,
                type: "critical",
                category: "billing",
                title: "⛔ Ads Paused — Low Balance",
                message: `Your ad account balance dropped to ${balanceFormatted}, which is below our safety threshold. We automatically paused ${pausedCount} campaign${pausedCount !== 1 ? "s" : ""} to prevent Meta from charging you into a negative balance. Top up and resume when ready.`,
                actionLabel: "Top Up Now",
                actionUrl: "/settings/general",
                dedupKey: `low_balance_pause:${account.id}:${today}`,
                supabaseClient: supabase,
              });

              return { id: account.id, status: "auto_paused", pausedCount };
            }

            // Already paused — just remind if we haven't today
            await sendNotification({
              userId: ownerId,
              type: "critical",
              category: "billing",
              title: "Balance Still Low — Campaigns Paused",
              message: `Your account balance is still ${balanceFormatted}. Top up to resume your campaigns.`,
              actionLabel: "Top Up",
              actionUrl: "/settings/general",
              dedupKey: `low_balance_reminder:${account.id}:${today}`,
              supabaseClient: supabase,
            });

            return { id: account.id, status: "still_paused" };
          }

          // ── Balance recovered — auto-resume if we paused it ───────────────
          if (account.paused_by_system && balance >= BALANCE_WARN_THRESHOLD) {
            await supabase
              .from("ad_accounts")
              .update({
                health_status: "healthy",
                paused_by_system: false,
                auto_paused_at: null,
              })
              .eq("id", account.id);

            await sendNotification({
              userId: ownerId,
              type: "success",
              category: "billing",
              title: "✅ Balance Restored — Campaigns Ready",
              message: `Your ad account balance is now ${balanceFormatted}. Your campaigns were paused by our safety system — head to Campaigns to resume them when you're ready.`,
              actionLabel: "View Campaigns",
              actionUrl: "/campaigns",
              dedupKey: `balance_restored:${account.id}:${today}`,
              supabaseClient: supabase,
            });

            return { id: account.id, status: "balance_restored" };
          }

          // ── TIER 2: WARNING — Balance getting low, not yet critical ────────
          if (balance < BALANCE_WARN_THRESHOLD) {
            await sendNotification({
              userId: ownerId,
              type: "warning",
              category: "billing",
              title: "⚠️ Ad Balance Getting Low",
              message: `Your ad account balance is ${balanceFormatted}. If it drops below ₦2,000, we will automatically pause your campaigns to protect you from going into a negative balance. Top up soon to avoid interruption.`,
              actionLabel: "Top Up",
              actionUrl: "/settings/general",
              dedupKey: `low_balance_warn:${account.id}:${today}`,
              supabaseClient: supabase,
            });
            return { id: account.id, status: "warned", balance };
          }

          return { id: account.id, status: "ok", balance };
        } catch (err: any) {
          console.error(`[Account] Error processing ${account.id}:`, err.message);
          throw err;
        }
      }),
    );

    // ════════════════════════════════════════════════════════════════════════
    // SECTION B: Post-Launch Rule Evaluation
    // ════════════════════════════════════════════════════════════════════════
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Pull aggregate metrics from campaign_metrics (NOT campaign_insights which doesn't exist)
    const { data: liveCampaigns } = await supabase
      .from("campaigns")
      .select("id, name, created_at, organization_id, spend_cents, impressions, clicks, ctr")
      .eq("status", "active")
      .lt("created_at", twoDaysAgo.toISOString())
      .limit(50);

    let postLaunchTriggered = 0;

    if (liveCampaigns && liveCampaigns.length > 0) {
      console.log(`[PostLaunch] Evaluating ${liveCampaigns.length} campaigns...`);

      for (const campaign of liveCampaigns) {
        try {
          // Get 7-day aggregate from campaign_metrics
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const { data: metrics } = await supabase
            .from("campaign_metrics")
            .select("impressions, reach, clicks, ctr, spend_cents")
            .eq("campaign_id", campaign.id)
            .gte("date", sevenDaysAgo.toISOString().split("T")[0]);

          // Aggregate
          const agg = (metrics ?? []).reduce(
            (acc, m) => ({
              impressions: acc.impressions + (m.impressions ?? 0),
              reach: acc.reach + (m.reach ?? 0),
              clicks: acc.clicks + (m.clicks ?? 0),
              spendCents: acc.spendCents + (m.spend_cents ?? 0),
            }),
            { impressions: 0, reach: 0, clicks: 0, spendCents: 0 },
          );

          if (agg.impressions === 0 && agg.spendCents === 0) continue;

          const createdAt = new Date(campaign.created_at!);
          const now = new Date();
          const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          const ageDays = ageHours / 24;

          const spendNgn = agg.spendCents / 100;
          const ctr = agg.clicks > 0 && agg.impressions > 0
            ? (agg.clicks / agg.impressions) * 100
            : 0;
          const cpcNgn = agg.clicks > 0 ? spendNgn / agg.clicks : 0;

          const evalMetrics: CampaignMetrics = {
            campaignId: campaign.id,
            campaignName: campaign.name,
            ageHours,
            ageDays,
            impressions: agg.impressions,
            reach: agg.reach,
            clicks: agg.clicks,
            ctr,
            cpcNgn,
            spendNgn,
            conversions: 0, // TODO: pull from link_clicks when event_type='purchase'
          };

          const triggeredRules = evaluatePostLaunchRules(evalMetrics);
          if (triggeredRules.length === 0) continue;

          const ownerId = await getOrgOwner(campaign.organization_id!);
          if (!ownerId) continue;

          // Sort by severity — send top rule per campaign per cron run
          const sorted = [...triggeredRules].sort((a, b) => {
            const order = { critical: 0, warning: 1, info: 2, success: 3 };
            return order[a.severity] - order[b.severity];
          });

          for (const rule of sorted) {
            const dedupKey = `${rule.id}:${campaign.id}:${week}`;

            const title =
              rule.severity === "critical" ? "⚠️ Campaign Needs Attention"
              : rule.severity === "warning" ? "Campaign Alert"
              : rule.severity === "success" ? "🚀 Scaling Opportunity"
              : "Campaign Insight";

            const result = await sendNotification({
              userId: ownerId,
              type: rule.severity === "success" ? "success" : rule.severity,
              category: "campaign",
              title,
              message: rule.message,
              actionLabel: "View Campaign",
              actionUrl: `/campaigns?id=${campaign.id}`,
              dedupKey,
              supabaseClient: supabase,
            });

            if (!result?.deduped) postLaunchTriggered++;

            // Only send top-severity rule per campaign per run to avoid noise
            break;
          }
        } catch (ruleErr: any) {
          console.error(`[PostLaunch] Campaign ${campaign.id}:`, ruleErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      accountsChecked: accounts?.length ?? 0,
      accountResults: accountResults.map((r) =>
        r.status === "fulfilled" ? r.value : { error: (r as any).reason?.message },
      ),
      postLaunchCampaigns: liveCampaigns?.length ?? 0,
      postLaunchNotificationsSent: postLaunchTriggered,
    });
  } catch (error: any) {
    console.error("[Cron] Fatal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
