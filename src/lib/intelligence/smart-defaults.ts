/**
 * Smart Defaults Engine
 *
 * Auto-populates campaign wizard fields based on objective, business type,
 * and past campaign performance. Called when the user selects an objective.
 */

import type { AdSyncObjective } from "@/lib/constants";
import type { CampaignROI } from "@/hooks/use-campaign-roi";
import type { LocationOption } from "@/stores/campaign-store";
import {
  BUDGET_CONSTRAINTS,
  DEFAULT_AGE_RANGES,
  DEFAULT_LOCATION_KEYS,
  ACCOUNT_TIERS,
} from "./benchmarks";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SmartDefaultsInput {
  objective: AdSyncObjective;
  businessType?: string; // "fashion" | "food" | "electronics" | etc.
  previousCampaigns?: CampaignROI[];
  locations: LocationOption[];
  // New Onboarding Fields
  industry?: string | null;
  customerGender?: string | null;
  sellingMethod?: string | null;
  priceTier?: string | null;
}

export interface SmartDefaults {
  budget: number;
  ageRange: { min: number; max: number };
  gender: "all" | "male" | "female";
  locationKeys: readonly string[];
  duration: number;
  placementType: "automatic";
}

// ── Main ───────────────────────────────────────────────────────────────────

export function computeSmartDefaults(input: SmartDefaultsInput): SmartDefaults {
  // Learn budget from past campaigns
  const pastAvgBudget =
    input.previousCampaigns && input.previousCampaigns.length > 0
      ? Math.round(
          input.previousCampaigns.reduce((s, c) => s + c.spendNgn, 0) /
            input.previousCampaigns.length /
            7, // Convert total spend to daily average
        )
      : null;

  let budget = pastAvgBudget
    ? Math.max(
        BUDGET_CONSTRAINTS.floorNgn,
        Math.min(pastAvgBudget, BUDGET_CONSTRAINTS.ceilingNgn),
      )
    : BUDGET_CONSTRAINTS.defaultNgn;

  // STARTER CHECK: If no history, cap at starter limit
  if (!input.previousCampaigns || input.previousCampaigns.length === 0) {
    budget = Math.min(budget, ACCOUNT_TIERS.STARTER.maxDailySpend);
  }

  // Age range: tighten for known verticals
  let ageRange = DEFAULT_AGE_RANGES[input.objective];

  // Use Industry if BusinessType not matched, or map Industry to BusinessType logic
  const industryLower = input.industry?.toLowerCase() || "";
  if (industryLower.includes("fashion") || industryLower.includes("beauty")) {
    ageRange = { min: 18, max: 35 };
  } else if (
    industryLower.includes("electronics") ||
    industryLower.includes("tech")
  ) {
    ageRange = { min: 22, max: 50 };
  } else if (industryLower.includes("real estate")) {
    ageRange = { min: 28, max: 60 };
  }

  // Gender Default
  let gender: "all" | "male" | "female" = "all";
  if (input.customerGender === "male") gender = "male";
  if (input.customerGender === "female") gender = "female";

  // Locations: use provided or fall back to defaults
  const locationKeys =
    input.locations.length > 0
      ? input.locations.map((l) => l.id)
      : DEFAULT_LOCATION_KEYS;

  return {
    budget,
    ageRange,
    gender,
    locationKeys,
    duration: BUDGET_CONSTRAINTS.minDurationDays,
    placementType: "automatic",
  };
}
