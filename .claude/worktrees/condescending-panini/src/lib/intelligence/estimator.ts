/**
 * Budget Estimator — Naira-native reach/click/conversation projections
 *
 * Converts a ₦ daily budget into projected impressions, clicks, WhatsApp
 * conversations, and sales using Nigeria 2025 benchmarks.
 */

import { CAMPAIGN_OBJECTIVES, type AdSyncObjective } from "@/lib/constants";
import {
  FX_RATE,
  NG_BENCHMARKS,
  QUALITY_DISCOUNTS,
  getCTRForObjective,
} from "./benchmarks";

// ── Types ──────────────────────────────────────────────────────────────────

export interface EstimateRange {
  low: number;
  mid: number;
  high: number;
}

export interface BudgetEstimate {
  dailyBudgetNgn: number;
  dailyBudgetUsd: number;

  // Reach & Impressions
  estimatedImpressions: EstimateRange;
  estimatedReach: EstimateRange;

  // Clicks
  estimatedClicks: EstimateRange;
  costPerClickNgn: number;

  // WhatsApp funnel
  estimatedConversations: EstimateRange;
  estimatedSales: EstimateRange;
  costPerConversationNgn: number;

  // Projections
  weeklySpendNgn: number;
  monthlySpendNgn: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create a ±30% band around a midpoint */
function band(mid: number): EstimateRange {
  return {
    low: Math.round(mid * 0.7),
    mid,
    high: Math.round(mid * 1.3),
  };
}

// ── Main Estimator ─────────────────────────────────────────────────────────

export function estimateBudget(
  dailyBudgetNgn: number,
  objective: AdSyncObjective,
): BudgetEstimate {
  const dailyUsd = dailyBudgetNgn / FX_RATE;
  const ctr = getCTRForObjective(objective);
  const qualityDiscount = QUALITY_DISCOUNTS[objective];

  // Core calculations
  const impressionsMid = Math.round((dailyUsd / NG_BENCHMARKS.cpmUsd) * 1_000);
  const clicksMid = Math.round(impressionsMid * ctr * qualityDiscount);
  const reachMid = Math.round(impressionsMid * 0.7); // ~70% unique reach

  // Optimization Model Branching
  const objCtx = CAMPAIGN_OBJECTIVES.find((o) => o.id === objective);
  const model = objCtx?.optimizationModel || "click";

  let conversationsMid = 0;
  let salesMid = 0;

  if (model === "conversation") {
    // WhatsApp funnel: clicks → open → reply → buy
    conversationsMid = Math.round(
      clicksMid * NG_BENCHMARKS.waOpenRate * NG_BENCHMARKS.waResponseRate,
    );
    salesMid = Math.round(conversationsMid * NG_BENCHMARKS.waConvRate);
  } else if (model === "click" && objCtx?.category === "revenue") {
    // Website Sales funnel: clicks → purchase
    // We treat "conversations" as 0 for website traffic, or maybe we track "Add to Cart" as similar intermediate step?
    // For now, let's just project Sales directly.
    salesMid = Math.round(clicksMid * NG_BENCHMARKS.websiteConvRate);
  } else {
    // Awareness/Engagement - Minimal direct sales attribution
    salesMid = 0;
  }

  const costPerClick =
    clicksMid > 0
      ? Math.round(dailyBudgetNgn / clicksMid)
      : Math.round(NG_BENCHMARKS.cpcUsd * FX_RATE);

  const costPerConversation =
    conversationsMid > 0 ? Math.round(dailyBudgetNgn / conversationsMid) : 0;

  return {
    dailyBudgetNgn,
    dailyBudgetUsd: Math.round(dailyUsd * 100) / 100,
    estimatedImpressions: band(impressionsMid),
    estimatedReach: band(reachMid),
    estimatedClicks: band(clicksMid),
    costPerClickNgn: costPerClick,
    estimatedConversations: band(conversationsMid),
    estimatedSales: band(salesMid),
    costPerConversationNgn: costPerConversation,
    weeklySpendNgn: dailyBudgetNgn * 7,
    monthlySpendNgn: dailyBudgetNgn * 30,
  };
}
