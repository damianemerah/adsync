/**
 * Pre-Launch Validation Rules
 *
 * Returns a structured result with blocking errors and non-blocking warnings
 * so the UI can show them before the user commits to launch.
 * Called at the top of `launchCampaign()` before the Meta API chain.
 */

import type { AdSyncObjective } from "@/lib/constants";
import { BUDGET_CONSTRAINTS, ACCOUNT_TIERS, RISKY_TERMS } from "./benchmarks";

// ── Types ──────────────────────────────────────────────────────────────────

interface RuleContext {
  name: string;
  objective: AdSyncObjective;
  budget: number;
  platform: "meta" | "tiktok";
  destinationValue: string;
  creatives: string[];
  targetInterests: { id: string; name: string }[];
  targetLocations: { id: string; name: string }[];
  durationDays?: number;
  // New Context Context
  totalHistoricalSpend?: number;
  campaignCount?: number;
  adCopy?: string[]; // Arrays of text strings (headline, primary text) to check for violations
}

export interface ValidationIssue {
  id: string;
  severity: "error" | "warning";
  message: string;
}

export interface PreLaunchResult {
  canLaunch: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// ── Nigerian phone regex ───────────────────────────────────────────────────
// Accepts: 08012345678, +2348012345678, 2348012345678
const NG_PHONE_RE = /^(?:0|\+?234)\d{10}$/;

// ── Rules ──────────────────────────────────────────────────────────────────

type Rule = (ctx: RuleContext) => ValidationIssue | null;

const rules: Rule[] = [
  // ERRORS — block launch
  (ctx) => {
    if (ctx.budget < BUDGET_CONSTRAINTS.floorNgn) {
      return {
        id: "budget_floor",
        severity: "error",
        message: `Minimum daily budget is ₦${BUDGET_CONSTRAINTS.floorNgn.toLocaleString()}. Below this, Meta's algorithm can't optimize delivery.`,
      };
    }
    return null;
  },

  (ctx) => {
    // STARTER SAFEGUARDS: Strict cap for new accounts to prevent immediate bans
    const isStarter =
      (ctx.totalHistoricalSpend || 0) < ACCOUNT_TIERS.STARTER.maxDailySpend &&
      (ctx.campaignCount || 0) === 0;

    if (isStarter && ctx.budget > ACCOUNT_TIERS.STARTER.maxDailySpend) {
      return {
        id: "starter_cap",
        severity: "error", // Strict block for safety
        message: `New Account Safety: To prevent immediate bans, your first campaign is limited to ₦${ACCOUNT_TIERS.STARTER.maxDailySpend.toLocaleString()}/day. Scale up after your first successful payment.`,
      };
    }
    return null;
  },

  (ctx) => {
    if (
      ctx.objective === "whatsapp" &&
      !NG_PHONE_RE.test(ctx.destinationValue.replace(/[\s\-]/g, ""))
    ) {
      return {
        id: "whatsapp_phone_invalid",
        severity: "error",
        message:
          "Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678).",
      };
    }
    return null;
  },

  (ctx) => {
    if (ctx.creatives.length === 0) {
      return {
        id: "no_creative",
        severity: "error",
        message:
          "Add at least one image. Tap 'Generate with AI' for instant creatives.",
      };
    }
    return null;
  },

  // POLICY CHECKS (Ad Copy)
  (ctx) => {
    // Scan all text inputs provided in context (if any)
    // We assume ctx might contain ad text fields in the future,
    // but for now we'll scan the campaign name (as a proxy/placeholder)
    // OR we need to update RuleContext to include ad text.
    // Let's rely on what we have + extend if possible.

    // Check known risky terms
    const textToScan = [ctx.name, ...(ctx.adCopy || [])].join(" ");

    for (const term of RISKY_TERMS) {
      if (term.pattern.test(textToScan)) {
        return {
          id: "policy_risk",
          severity: "warning",
          message: `Policy Risk: The term "${term.pattern.toString().replace(/\\b/g, "").replace(/\//g, "")}" may trigger a ban. ${term.reason}`,
        };
      }
    }
    return null;
  },

  // WARNINGS — allow launch but flag
  (ctx) => {
    if (ctx.targetLocations.length === 1 && ctx.targetInterests.length < 2) {
      return {
        id: "narrow_audience",
        severity: "warning",
        message:
          "Your audience may be too narrow. Add more locations or interests for better reach.",
      };
    }
    return null;
  },

  (ctx) => {
    const days = ctx.durationDays ?? BUDGET_CONSTRAINTS.minDurationDays;
    if (days < BUDGET_CONSTRAINTS.minDurationDays) {
      return {
        id: "short_duration",
        severity: "warning",
        message: `Campaigns under ${BUDGET_CONSTRAINTS.minDurationDays} days don't give Meta enough data to optimize. We recommend at least ${BUDGET_CONSTRAINTS.minDurationDays} days.`,
      };
    }
    return null;
  },

  (ctx) => {
    // Dynamic Soft Ceiling based on Account Tier
    const tierLimit =
      (ctx.totalHistoricalSpend || 0) >
      ACCOUNT_TIERS.ESTABLISHED.minHistorySpend
        ? ACCOUNT_TIERS.SCALER.maxDailySpend
        : ACCOUNT_TIERS.ESTABLISHED.maxDailySpend; // Default cap for non-starters

    // Don't flag if it's already caught by the strict starter cap
    const isStarter =
      (ctx.totalHistoricalSpend || 0) < ACCOUNT_TIERS.STARTER.maxDailySpend &&
      (ctx.campaignCount || 0) === 0;

    if (!isStarter && ctx.budget > tierLimit) {
      return {
        id: "budget_high",
        severity: "warning",
        message: `Daily budget above ₦${tierLimit.toLocaleString()} might trigger a review. Start lower and scale up every 3 days.`,
      };
    }
    return null;
  },

  (ctx) => {
    if (!ctx.name || ctx.name.trim().length === 0) {
      return {
        id: "missing_name",
        severity: "warning",
        message: "No campaign name set. A default name will be generated.",
      };
    }
    return null;
  },
];

// ── Main ───────────────────────────────────────────────────────────────────

export function validatePreLaunch(ctx: RuleContext): PreLaunchResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  for (const rule of rules) {
    const issue = rule(ctx);
    if (!issue) continue;
    if (issue.severity === "error") {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  return {
    canLaunch: errors.length === 0,
    errors,
    warnings,
  };
}
