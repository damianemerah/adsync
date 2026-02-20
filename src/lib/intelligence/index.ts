/**
 * Intelligence Layer — Barrel Export
 *
 * All campaign intelligence imports should go through this file:
 *   import { estimateBudget, predictROAS, ... } from "@/lib/intelligence";
 */

// Benchmarks & Constants
export {
  FX_RATE,
  NG_BENCHMARKS,
  BUDGET_CONSTRAINTS,
  BUDGET_TIERS,
  OBJECTIVE_MULTIPLIERS,
  QUALITY_DISCOUNTS,
  DEFAULT_AGE_RANGES,
  DEFAULT_LOCATION_KEYS,
  getCTRForObjective,
} from "./benchmarks";

// Budget Estimator
export { estimateBudget } from "./estimator";
export type { BudgetEstimate, EstimateRange } from "./estimator";

// ROAS Predictor
export { predictROAS } from "./roas-predictor";
export type {
  ROASPrediction,
  ROASInput,
  ROASBreakdown,
  ROASGrade,
} from "./roas-predictor";

// Smart Defaults
export { computeSmartDefaults } from "./smart-defaults";
export type { SmartDefaults, SmartDefaultsInput } from "./smart-defaults";

// Pre-Launch Rules
export { validatePreLaunch } from "./pre-launch-rules";
export type { PreLaunchResult, ValidationIssue } from "./pre-launch-rules";

// Post-Launch Rules
export { evaluatePostLaunchRules } from "./post-launch-rules";
export type {
  CampaignMetrics,
  TriggeredRule,
  AutoAction,
  Suggestion,
} from "./post-launch-rules";
