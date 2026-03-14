/**
 * Post-Launch Automation Rules
 *
 * Evaluates live campaign metrics and returns triggered actions:
 * notifications, scaling suggestions, fatigue warnings, or waste alerts.
 *
 * Designed to be called by a cron / edge function that runs
 * periodically (e.g. every 6 hours) via `syncCampaignInsights()`.
 */

import { NG_BENCHMARKS, FX_RATE } from "./benchmarks";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;

  /** Hours since campaign was created */
  ageHours: number;
  /** Days since campaign was created */
  ageDays: number;

  impressions: number;
  reach: number;
  clicks: number;
  /** Click-through rate as a percentage (e.g. 1.5 = 1.5%) */
  ctr: number;
  /** Cost per click in NGN */
  cpcNgn: number;
  /** Total spend in NGN */
  spendNgn: number;
  /** Number of tracked conversions / sales */
  conversions: number;
}

export type ActionType = "NOTIFY" | "SUGGEST";
export type Severity = "info" | "success" | "warning" | "critical";
export type Suggestion =
  | "creative_refresh"
  | "audience_expand"
  | "budget_scale_up"
  | "pause_review";

export interface AutoAction {
  type: "BUDGET_INCREASE" | "AUTO_PAUSE";
  multiplier?: number;
  maxBudgetNgn?: number;
  requireConfirmation: boolean;
}

export interface TriggeredRule {
  id: string;
  action: ActionType;
  severity: Severity;
  message: string;
  suggestion: Suggestion;
  autoAction?: AutoAction;
}

// ── Rule definitions ───────────────────────────────────────────────────────

interface RuleDef {
  id: string;
  condition: (m: CampaignMetrics) => boolean;
  action: ActionType;
  severity: Severity;
  messageFn: (m: CampaignMetrics) => string;
  suggestion: Suggestion;
  autoAction?: AutoAction;
}

const RULES: RuleDef[] = [
  {
    id: "low_ctr",
    condition: (m) => m.ageHours >= 48 && m.impressions >= 1_000 && m.ctr < 0.8,
    action: "NOTIFY",
    severity: "warning",
    messageFn: (m) =>
      `Your CTR is ${m.ctr.toFixed(2)}% — below the ${(NG_BENCHMARKS.ctrTraffic * 100).toFixed(2)}% benchmark. Consider refreshing your creative or broadening your audience.`,
    suggestion: "creative_refresh",
  },
  {
    id: "high_cpc",
    condition: (m) => {
      const cpcThreshold = NG_BENCHMARKS.cpcUsd * FX_RATE * 1.5; // 1.5× benchmark
      return m.ageHours >= 48 && m.clicks >= 20 && m.cpcNgn > cpcThreshold;
    },
    action: "NOTIFY",
    severity: "warning",
    messageFn: (m) =>
      `Cost per click is ₦${Math.round(m.cpcNgn).toLocaleString()} — above the ₦${Math.round(NG_BENCHMARKS.cpcUsd * FX_RATE).toLocaleString()} benchmark. Try adding more interests or expanding locations.`,
    suggestion: "audience_expand",
  },
  {
    id: "scaling_opportunity",
    condition: (m) =>
      m.ageDays >= 3 &&
      m.ctr >= 2.0 &&
      m.cpcNgn <= NG_BENCHMARKS.cpcUsd * FX_RATE &&
      m.conversions >= 5,
    action: "SUGGEST",
    severity: "success",
    messageFn: (m) =>
      `🚀 Campaign "${m.campaignName}" is performing well! CTR ${m.ctr.toFixed(1)}%, CPC ₦${Math.round(m.cpcNgn)}. Consider increasing budget by 25%.`,
    suggestion: "budget_scale_up",
    autoAction: {
      type: "BUDGET_INCREASE",
      multiplier: 1.25,
      maxBudgetNgn: 50_000,
      requireConfirmation: true,
    },
  },
  {
    id: "waste_detection",
    condition: (m) =>
      m.ageDays >= 5 && m.spendNgn >= 10_000 && m.conversions === 0,
    action: "SUGGEST",
    severity: "critical",
    messageFn: (m) =>
      `⚠️ You've spent ₦${Math.round(m.spendNgn).toLocaleString()} on "${m.campaignName}" with no recorded sales. Consider pausing to review targeting or creative.`,
    suggestion: "pause_review",
    autoAction: {
      type: "AUTO_PAUSE",
      requireConfirmation: true,
    },
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
    suggestion: "creative_refresh",
  },
];

// ── Main ───────────────────────────────────────────────────────────────────

export function evaluatePostLaunchRules(
  metrics: CampaignMetrics,
): TriggeredRule[] {
  const triggered: TriggeredRule[] = [];

  for (const rule of RULES) {
    if (rule.condition(metrics)) {
      triggered.push({
        id: rule.id,
        action: rule.action,
        severity: rule.severity,
        message: rule.messageFn(metrics),
        suggestion: rule.suggestion,
        autoAction: rule.autoAction,
      });
    }
  }

  return triggered;
}
