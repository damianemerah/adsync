import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Benchmarks & Constants ──────────────────────────────────────────────────
const FX_RATE = parseInt(
  Deno.env.get("NEXT_PUBLIC_USD_NGN_RATE") ||
    Deno.env.get("USD_NGN_RATE") ||
    "1600",
);

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

interface TriggeredRule {
  id: string;
  action: ActionType;
  severity: Severity;
  message: string;
}

interface RuleDef {
  id: string;
  condition: (m: CampaignMetrics) => boolean;
  action: ActionType;
  severity: Severity;
  messageFn: (m: CampaignMetrics) => string;
}

// ── Rules ──────────────────────────────────────────────────────────────────
const RULES: RuleDef[] = [
  {
    id: "low_ctr",
    condition: (m) => m.ageHours >= 48 && m.impressions >= 1_000 && m.ctr < 0.8,
    action: "NOTIFY",
    severity: "warning",
    messageFn: (m) =>
      `Your CTR is ${m.ctr.toFixed(2)}% — below the ${(NG_BENCHMARKS.ctrTraffic * 100).toFixed(2)}% benchmark. Consider refreshing your creative or broadening your audience.`,
  },
  {
    id: "high_cpc",
    condition: (m) => {
      const cpcThreshold = NG_BENCHMARKS.cpcUsd * FX_RATE * 1.5;
      return m.ageHours >= 48 && m.clicks >= 20 && m.cpcNgn > cpcThreshold;
    },
    action: "NOTIFY",
    severity: "warning",
    messageFn: (m) =>
      `Cost per click is ₦${Math.round(m.cpcNgn).toLocaleString()} — above the ₦${Math.round(NG_BENCHMARKS.cpcUsd * FX_RATE).toLocaleString()} benchmark. Try adding more interests or expanding locations.`,
  },
  {
    id: "scaling_opportunity",
    condition: (m) =>
      m.ageDays >= 3 &&
      m.ctr >= 2.0 &&
      m.cpcNgn <= NG_BENCHMARKS.cpcUsd * FX_RATE &&
      m.conversions >= 5, // Currently we default conversions to 0, so this might not fire often unless wired
    action: "SUGGEST",
    severity: "success",
    messageFn: (m) =>
      `🚀 Campaign "${m.campaignName}" is performing well! CTR ${m.ctr.toFixed(1)}%, CPC ₦${Math.round(m.cpcNgn)}. Consider increasing budget by 25%.`,
  },
  {
    id: "waste_detection",
    condition: (m) =>
      m.ageDays >= 5 && m.spendNgn >= 10_000 && m.conversions === 0,
    action: "SUGGEST",
    severity: "critical",
    messageFn: (m) =>
      `⚠️ You've spent ₦${Math.round(m.spendNgn).toLocaleString()} on "${m.campaignName}" with no recorded sales. Consider pausing to review targeting or creative.`,
  },
  {
    id: "ad_fatigue",
    condition: (m) =>
      m.ageDays >= 7 && m.reach > 0 && m.impressions / m.reach > 3,
    action: "NOTIFY",
    severity: "info",
    messageFn: (m) => {
      const freq = (m.impressions / m.reach).toFixed(1);
      return `Ad frequency is ${freq}× for "${m.campaignName}" — your audience is seeing it too often. Refresh your creative to avoid fatigue.`;
    },
  },
];

function evaluatePostLaunchRules(metrics: CampaignMetrics): TriggeredRule[] {
  const triggered: TriggeredRule[] = [];
  for (const rule of RULES) {
    if (rule.condition(metrics)) {
      triggered.push({
        id: rule.id,
        action: rule.action,
        severity: rule.severity,
        message: rule.messageFn(metrics),
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
    read: false,
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
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

          const triggeredRules = evaluatePostLaunchRules(evalMetrics);
          if (triggeredRules.length === 0) continue;

          const ownerId = await getOrgOwner(
            supabase,
            campaign.organization_id!,
          );
          if (!ownerId) continue;

          const sorted = [...triggeredRules].sort((a, b) => {
            const order = { critical: 0, warning: 1, info: 2, success: 3 };
            return order[a.severity] - order[b.severity];
          });

          for (const rule of sorted) {
            const dedupKey = `${rule.id}:${campaign.id}:${week}`;

            const title =
              rule.severity === "critical"
                ? "⚠️ Campaign Needs Attention"
                : rule.severity === "warning"
                  ? "Campaign Alert"
                  : rule.severity === "success"
                    ? "🚀 Scaling Opportunity"
                    : "Campaign Insight";

            const result = await sendInAppNotification(supabase, {
              userId: ownerId,
              type: rule.severity === "success" ? "success" : rule.severity,
              category: "campaign",
              title,
              message: rule.message,
              actionLabel: "View Campaign",
              actionUrl: `/campaigns?id=${campaign.id}`,
              dedupKey,
            });

            if (!result?.deduped) postLaunchTriggered++;

            break; // Only send top-severity rule per campaign per run
          }
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("[Cron] Fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
