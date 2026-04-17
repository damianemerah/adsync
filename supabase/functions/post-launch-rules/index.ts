import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Edge functions invoked by pg_cron don't need CORS headers
// Removed permissive CORS that allowed any origin to call this endpoint

// ── Benchmarks & Constants ──────────────────────────────────────────────────
// FX_RATE is fetched dynamically inside each request — never at module scope.
// This avoids stale state on warm Deno isolate restarts.

const NG_BENCHMARKS = {
  cpcUsd: 0.12,
  ctrTraffic: 0.0138,
};

// ── Types ──────────────────────────────────────────────────────────────────
interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  ageHours: number;
  ageDays: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpcNgn: number;
  spendNgn: number;
  conversions: number;
}

type ActionType = "NOTIFY" | "SUGGEST";
type Severity = "info" | "success" | "warning" | "critical";
type Suggestion =
  | "creative_refresh"
  | "audience_expand"
  | "budget_scale_up"
  | "pause_review";

const SUGGESTION_LABELS: Record<Suggestion, string> = {
  creative_refresh: "Refresh Creative",
  audience_expand: "Expand Audience",
  budget_scale_up: "Scale Budget",
  pause_review: "Review & Pause",
};

interface TriggeredRule {
  id: string;
  action: ActionType;
  severity: Severity;
  message: string;
  suggestion: Suggestion;
}

interface RuleDef {
  id: string;
  condition: (m: CampaignMetrics, fxRate: number) => boolean;
  action: ActionType;
  severity: Severity;
  messageFn: (m: CampaignMetrics, fxRate: number) => string;
  suggestion: Suggestion;
}

// ── Rules ──────────────────────────────────────────────────────────────────
const RULES: RuleDef[] = [
  {
    id: "low_ctr",
    condition: (m) => m.ageHours >= 48 && m.impressions >= 1_000 && m.ctr < 0.8,
    action: "NOTIFY",
    severity: "warning",
    suggestion: "creative_refresh",
    messageFn: (m) =>
      `Your CTR is ${m.ctr.toFixed(2)}% — below the ${(NG_BENCHMARKS.ctrTraffic * 100).toFixed(2)}% benchmark. Consider refreshing your creative or broadening your audience.`,
  },
  {
    id: "high_cpc",
    condition: (m, fxRate) => {
      const cpcThreshold = NG_BENCHMARKS.cpcUsd * fxRate * 1.5;
      return m.ageHours >= 48 && m.clicks >= 20 && m.cpcNgn > cpcThreshold;
    },
    action: "NOTIFY",
    severity: "warning",
    suggestion: "audience_expand",
    messageFn: (m, fxRate) =>
      `Cost per click is ₦${Math.round(m.cpcNgn).toLocaleString()} — above the ₦${Math.round(NG_BENCHMARKS.cpcUsd * fxRate).toLocaleString()} benchmark. Try adding more interests or expanding locations.`,
  },
  {
    id: "scaling_opportunity",
    condition: (m, fxRate) =>
      m.ageDays >= 3 &&
      m.ctr >= 2.0 &&
      m.cpcNgn <= NG_BENCHMARKS.cpcUsd * fxRate &&
      m.conversions >= 5,
    action: "SUGGEST",
    severity: "success",
    suggestion: "budget_scale_up",
    messageFn: (m) =>
      `🚀 Campaign "${m.campaignName}" is performing well! CTR ${m.ctr.toFixed(1)}%, CPC ₦${Math.round(m.cpcNgn)}. Consider increasing budget by 25%.`,
  },
  {
    id: "waste_detection",
    condition: (m) =>
      m.ageDays >= 5 && m.spendNgn >= 10_000 && m.conversions === 0,
    action: "SUGGEST",
    severity: "critical",
    suggestion: "pause_review",
    messageFn: (m) =>
      `⚠️ You've spent ₦${Math.round(m.spendNgn).toLocaleString()} on "${m.campaignName}" with no recorded sales. Consider pausing to review targeting or creative.`,
  },
  {
    id: "ad_fatigue",
    condition: (m) =>
      m.ageDays >= 7 && m.reach > 0 && m.impressions / m.reach > 3,
    action: "NOTIFY",
    severity: "info",
    suggestion: "creative_refresh",
    messageFn: (m) => {
      const freq = (m.impressions / m.reach).toFixed(1);
      return `Ad frequency is ${freq}× for "${m.campaignName}" — your audience is seeing it too often. Refresh your creative to avoid fatigue.`;
    },
  },
];

function evaluatePostLaunchRules(
  metrics: CampaignMetrics,
  fxRate: number,
): TriggeredRule[] {
  const triggered: TriggeredRule[] = [];
  for (const rule of RULES) {
    if (rule.condition(metrics, fxRate)) {
      triggered.push({
        id: rule.id,
        action: rule.action,
        severity: rule.severity,
        message: rule.messageFn(metrics, fxRate),
        suggestion: rule.suggestion,
      });
    }
  }
  return triggered;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function isoWeek(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function getOrgOwner(supabase: any, organizationId: string) {
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .single();
  return data?.user_id ?? null;
}

async function sendInAppNotification(supabase: any, params: any) {
  const {
    userId,
    type,
    category,
    title,
    message,
    actionLabel,
    actionUrl,
    dedupKey,
  } = params;

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    category,
    title,
    message,
    action_label: actionLabel,
    action_url: actionUrl,
    dedup_key: dedupKey,
    is_read: false,
  });

  if (error) {
    if (error.code === "23505") {
      return { deduped: true };
    }
    console.error("Error inserting notification:", error);
  }
  return { deduped: false };
}

// ── Main Handler ───────────────────────────────────────────────────────────
serve(async (req) => {
  // pg_cron uses POST, not OPTIONS
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─────────────────────────────────────────────────────────────────────
    // Fetch current FX rate — scoped locally, never mutates module state.
    // ─────────────────────────────────────────────────────────────────────
    let fxRate = 1600;
    try {
      const { data: fxData } = await supabase
        .from("fx_rates")
        .select("rate_ngn_per_usd")
        .eq("is_active", true)
        .single();

      if (fxData?.rate_ngn_per_usd) {
        fxRate = parseFloat(fxData.rate_ngn_per_usd);
        console.log(`✓ Using dynamic FX rate: ${fxRate}`);
      } else {
        console.warn("⚠️ No active FX rate found, using fallback: 1600");
      }
    } catch (fxError) {
      console.error("⚠️ Failed to fetch FX rate:", fxError);
      console.log("Using fallback FX rate: 1600");
    }

    const week = isoWeek();

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: liveCampaigns } = await supabase
      .from("campaigns")
      .select(
        "id, name, created_at, organization_id, spend_cents, impressions, clicks, ctr",
      )
      .eq("status", "active")
      .lt("created_at", twoDaysAgo.toISOString())
      .limit(50);

    let postLaunchTriggered = 0;

    if (liveCampaigns && liveCampaigns.length > 0) {
      console.log(
        `[PostLaunch] Evaluating ${liveCampaigns.length} campaigns...`,
      );

      for (const campaign of liveCampaigns) {
        try {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const { data: metrics } = await supabase
            .from("campaign_metrics")
            .select("impressions, reach, clicks, ctr, spend_cents")
            .eq("campaign_id", campaign.id)
            .gte("date", sevenDaysAgo.toISOString().split("T")[0]);

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
          const ageHours =
            (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          const ageDays = ageHours / 24;

          const spendNgn = agg.spendCents / 100;
          const ctr =
            agg.clicks > 0 && agg.impressions > 0
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
            conversions: 0, // In the future, this can be hydrated by querying link_clicks
          };

          const triggeredRules = evaluatePostLaunchRules(evalMetrics, fxRate);
          if (triggeredRules.length === 0) continue;

          const ownerId = await getOrgOwner(
            supabase,
            campaign.organization_id!,
          );
          if (!ownerId) continue;

          const sorted = [...triggeredRules].sort((a, b) => {
            const order: Record<Severity, number> = {
              critical: 0,
              warning: 1,
              info: 2,
              success: 3,
            };
            return order[a.severity] - order[b.severity];
          });

          // Only send the top-severity rule per campaign per weekly window.
          const topRule = sorted[0];
          const dedupKey = `${topRule.id}:${campaign.id}:${week}`;

          const title =
            topRule.severity === "critical"
              ? "⚠️ Campaign Needs Attention"
              : topRule.severity === "warning"
                ? "Campaign Alert"
                : topRule.severity === "success"
                  ? "🚀 Scaling Opportunity"
                  : "Campaign Insight";

          const result = await sendInAppNotification(supabase, {
            userId: ownerId,
            type: topRule.severity === "success" ? "success" : topRule.severity,
            category: "campaign",
            title,
            message: topRule.message,
            actionLabel: SUGGESTION_LABELS[topRule.suggestion],
            actionUrl: `/campaigns?id=${campaign.id}`,
            dedupKey,
          });

          if (!result?.deduped) postLaunchTriggered++;
        } catch (ruleErr: any) {
          console.error(
            `[PostLaunch] Campaign ${campaign.id}:`,
            ruleErr.message,
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        postLaunchCampaigns: liveCampaigns?.length ?? 0,
        postLaunchNotificationsSent: postLaunchTriggered,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[Cron] Fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
