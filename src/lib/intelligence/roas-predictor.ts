/**
 * ROAS Predictor — Weighted multi-factor model
 *
 * Produces a predicted ROAS multiplier, confidence score, and letter grade
 * that feeds into the existing `updateROAS()` in campaign-store.
 *
 * Formula:
 *   ROAS = 2.79 × (0.25·B + 0.30·T + 0.25·C + 0.20·H) × qualityDiscount × objectiveMultiplier
 */

import type { AdSyncObjective } from "@/lib/constants";
import {
  FX_RATE,
  NG_BENCHMARKS,
  QUALITY_DISCOUNTS,
  OBJECTIVE_MULTIPLIERS,
} from "./benchmarks";

// ── Types ──────────────────────────────────────────────────────────────────

export type ROASGrade = "A" | "B" | "C" | "D" | "F";

export interface ROASBreakdown {
  budgetScore: number;
  targetingScore: number;
  creativeScore: number;
  historyScore: number;
}

export interface ROASPrediction {
  /** Predicted ROAS multiplier (e.g. 2.5×) */
  value: number;
  /** 0–1 confidence score */
  confidence: number;
  grade: ROASGrade;
  breakdown: ROASBreakdown;
}

export interface ROASInput {
  dailyBudgetNgn: number;
  objective: AdSyncObjective;
  interestCount: number;
  locationCount: number;
  hasCustomAudience: boolean;
  creativeCount: number;
  hasPreviousCampaigns: boolean;
  /** Average ROI % from past campaigns (from useCampaignROI), or null */
  previousAvgROI: number | null;
  ageRange: { min: number; max: number };
}

// ── Factor weights ─────────────────────────────────────────────────────────

const WEIGHTS = {
  budget: 0.25,
  targeting: 0.3,
  creative: 0.25,
  history: 0.2,
} as const;

// ── Factor Scorers (0–1 each) ──────────────────────────────────────────────

function scoreBudget(dailyBudgetNgn: number): number {
  const usd = dailyBudgetNgn / FX_RATE;
  if (usd < 1.25) return 0.3; // Under ₦2,000
  if (usd < 3.0) return 0.6; // ₦2k – ₦4.8k
  if (usd < 12.5) return 0.9; // ₦5k – ₦20k (sweet spot)
  if (usd < 31.25) return 0.85; // ₦20k – ₦50k
  return 0.7; // ₦50k+ (diminishing returns)
}

function scoreTargeting(input: ROASInput): number {
  const interestBonus = Math.min(input.interestCount * 0.1, 0.4);
  const locationBonus = Math.min(input.locationCount * 0.15, 0.3);
  const audienceBonus = input.hasCustomAudience ? 0.2 : 0;
  const ageSpread = input.ageRange.max - input.ageRange.min;
  const agePenalty = ageSpread > 40 ? -0.1 : 0;

  return Math.min(
    0.1 + interestBonus + locationBonus + audienceBonus + agePenalty,
    1.0,
  );
}

function scoreCreative(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 0.6;
  if (count <= 3) return 0.85;
  return 0.9; // 3+ enables A/B testing
}

function scoreHistory(input: ROASInput): number {
  if (!input.hasPreviousCampaigns) return 0.5; // Neutral — no data
  if (input.previousAvgROI !== null) {
    // Scale 0-200% ROI → 0-1
    return Math.min(Math.max(input.previousAvgROI / 200, 0), 1.0);
  }
  return 0.5;
}

// ── Grade mapping ──────────────────────────────────────────────────────────

function gradeFromROAS(roas: number): ROASGrade {
  if (roas >= 3.0) return "A";
  if (roas >= 2.0) return "B";
  if (roas >= 1.5) return "C";
  if (roas >= 1.0) return "D";
  return "F";
}

// ── Main predictor ─────────────────────────────────────────────────────────

export function predictROAS(input: ROASInput): ROASPrediction {
  const budgetScore = scoreBudget(input.dailyBudgetNgn);
  const targetingScore = scoreTargeting(input);
  const creativeScore = scoreCreative(input.creativeCount);
  const historyScore = scoreHistory(input);

  const compositeScore =
    WEIGHTS.budget * budgetScore +
    WEIGHTS.targeting * targetingScore +
    WEIGHTS.creative * creativeScore +
    WEIGHTS.history * historyScore;

  const qualityDiscount = QUALITY_DISCOUNTS[input.objective];
  const objectiveMultiplier = OBJECTIVE_MULTIPLIERS[input.objective];

  const predicted =
    NG_BENCHMARKS.roasBenchmark *
    compositeScore *
    qualityDiscount *
    objectiveMultiplier;

  // Confidence: higher with more signals available
  const confidence = Math.min(
    0.3 + // Baseline from benchmarks
      (input.hasPreviousCampaigns ? 0.25 : 0) +
      (input.interestCount >= 3 ? 0.15 : 0.05) +
      (input.locationCount >= 2 ? 0.1 : 0.05) +
      (input.creativeCount >= 2 ? 0.1 : 0.05),
    0.95,
  );

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    value: round(predicted),
    confidence: round(confidence),
    grade: gradeFromROAS(predicted),
    breakdown: {
      budgetScore: round(budgetScore),
      targetingScore: round(targetingScore),
      creativeScore: round(creativeScore),
      historyScore: round(historyScore),
    },
  };
}
