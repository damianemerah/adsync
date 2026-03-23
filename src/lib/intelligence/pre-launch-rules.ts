/**
 * Pre-Launch Validation Rules
 *
 * Returns a structured result with blocking errors and non-blocking warnings
 * so the UI can show them before the user commits to launch.
 * Called at the top of `launchCampaign()` before the Meta API chain.
 */

import type { AdSyncObjective } from "@/lib/constants";
import { BUDGET_CONSTRAINTS, ACCOUNT_TIERS, RISKY_TERMS } from "./benchmarks";
import { formatCurrency } from "@/lib/utils";

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
  // Globalization params — default to NG/NGN for existing callers
  orgCountryCode?: string;
  currency?: string;
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
      const cur = ctx.currency ?? "NGN";
      return {
        id: "budget_floor",
        severity: "error",
        message: `Minimum daily budget is ${formatCurrency(BUDGET_CONSTRAINTS.floorNgn, cur)}. Below this, Meta's algorithm can't optimize delivery.`,
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
      const cur = ctx.currency ?? "NGN";
      return {
        id: "starter_cap",
        severity: "error", // Strict block for safety
        message: `New Account Safety: To prevent immediate bans, your first campaign is limited to ${formatCurrency(ACCOUNT_TIERS.STARTER.maxDailySpend, cur)}/day. Scale up after your first successful payment.`,
      };
    }
    return null;
  },

  (ctx) => {
    // Only validate Nigerian phone format when org is in NG
    if (
      ctx.objective === "whatsapp" &&
      (!ctx.orgCountryCode || ctx.orgCountryCode === "NG") &&
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

// ── Async Validators ───────────────────────────────────────────────────────

/**
 * Checks if a provided website URL is reachable and does not return a 404 or broken status.
 * Intended to be called asynchronously during launch actions.
 */
export async function validateDestinationUrl(
  url: string,
  objective: AdSyncObjective,
): Promise<ValidationIssue | null> {
  // WhatsApp uses wa.me deep links generated internally, skipped here
  if (objective === "whatsapp") return null;
  if (!url || url.trim() === "") return null;

  let targetUrl = url;
  if (!targetUrl.startsWith("http")) {
    targetUrl = `https://${targetUrl}`;
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    // Attempt HEAD request first to save bandwidth
    let response = await fetch(targetUrl, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AdSyncBot/1.0)" },
      signal: controller.signal,
      cache: "no-store",
    });

    // Some servers block HEAD requests (405 or 403), fallback to GET
    if (response.status === 405 || response.status === 403) {
      response = await fetch(targetUrl, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AdSyncBot/1.0)" },
        signal: controller.signal,
        cache: "no-store",
      });
    }

    clearTimeout(id);

    if (response.status === 404) {
      return {
        id: "url_404",
        severity: "error",
        message: `The provided website link (${targetUrl}) is broken (404 Page Not Found). Please provide a valid, working link.`,
      };
    }
    if (response.status >= 500) {
      return {
        id: "url_500",
        severity: "error",
        message: `The provided website link (${targetUrl}) returned a server error (${response.status}). Meta will likely reject this ad.`,
      };
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      return {
        id: "url_timeout",
        severity: "error",
        message: `The website link (${targetUrl}) took too long to load or timed out. Please ensure your website is accessible.`,
      };
    }
    // Network errors, DNS resolution failures, etc.
    return {
      id: "url_unreachable",
      severity: "error",
      message: `Cannot reach the destination website (${targetUrl}). The link might be broken, or the domain is unavailable.`,
    };
  }

  return null;
}
