/**
 * Nigeria 2025 Performance Benchmarks — Single Source of Truth
 *
 * All campaign intelligence modules import from this file.
 * Sources: Adamigo, Focus Digital, TheSMEMall, Triple Whale (2024-2025)
 */

import type { AdSyncObjective } from "@/lib/constants";

// ── FX Rate ────────────────────────────────────────────────────────────────
// Consolidated here; previously isolated in use-campaign-roi.ts
export const FX_RATE = Number(process.env.NEXT_PUBLIC_USD_NGN_RATE) || 1_600;

// ── Meta Ad Benchmarks (Nigeria 2025) ──────────────────────────────────────
export const NG_BENCHMARKS = {
  /** Cost per 1,000 impressions (USD) */
  cpmUsd: 1.5,
  /** Cost per click (USD) */
  cpcUsd: 0.12,

  // Click-through rates by objective
  /** Lead-gen / Engagement campaigns */
  ctrEngagement: 0.0253,
  /** Traffic / Conversions campaigns */
  ctrTraffic: 0.0138,
  /** Awareness campaigns */
  ctrAwareness: 0.0094,

  /** WhatsApp message open rate */
  waOpenRate: 0.98,
  /** Estimated WhatsApp response rate (optimized for CONVERSATIONS, higher intent) */
  waResponseRate: 0.85,
  /** Estimated % of responders who convert to a sale */
  waConvRate: 0.08,

  /** Estimated Website Conversion Rate (Traffic -> Purchase) */
  websiteConvRate: 0.015,

  /**
   * Quality discount for Tier-3 markets.
   * Nigeria has 20-30% higher bot / low-quality traffic than Tier-1 markets.
   * Applied as a multiplier to raw impressions→clicks calculations.
   */
  qualityDiscount: 0.75,

  /** Global ROAS benchmark (Triple Whale, Dec 2024) */
  roasBenchmark: 2.79,
} as const;

// ── CTR by Objective ───────────────────────────────────────────────────────
import { CAMPAIGN_OBJECTIVES } from "@/lib/constants";

export function getCTRForObjective(objectiveId: AdSyncObjective): number {
  const obj = CAMPAIGN_OBJECTIVES.find((o) => o.id === objectiveId);
  const model = obj?.optimizationModel || "click";

  switch (model) {
    case "conversation":
      return NG_BENCHMARKS.ctrEngagement; // Conversations behave like engagement CTR-wise
    case "click":
      return NG_BENCHMARKS.ctrTraffic;
    case "reach":
      return NG_BENCHMARKS.ctrAwareness;
    case "engagement":
      return NG_BENCHMARKS.ctrEngagement;
    case "lead":
      return NG_BENCHMARKS.ctrEngagement; // Lead-gen CTR is similar to engagement
    case "conversion":
      return NG_BENCHMARKS.ctrTraffic; // Conversion campaigns share traffic CTR profile
    case "app_install":
      return NG_BENCHMARKS.ctrTraffic; // App install CTR roughly tracks traffic
    default:
      return NG_BENCHMARKS.ctrTraffic;
  }
}

// ── Objective Multipliers ──────────────────────────────────────────────────
// Higher = stronger direct ROAS signal
export const OBJECTIVE_MULTIPLIERS: Record<AdSyncObjective, number> = {
  whatsapp: 1.3, // Sales Intent: High (Direct conversation)
  traffic: 1.1, // Sales Intent: Medium (Website visit)
  engagement: 0.85, // Growth Intent
  awareness: 0.7, // Growth Intent
  leads: 1.2, // High sales intent — captured lead = warm prospect
  sales: 1.5, // Highest sales signal — pixel-qualified conversions
  app_promotion: 0.9, // Growth intent — installs don't always convert to revenue
};

// ── Quality Discount by Objective ──────────────────────────────────────────
export const QUALITY_DISCOUNTS: Record<AdSyncObjective, number> = {
  whatsapp: 0.95, // Meta heavily filters bots for "Conversation" optimization
  traffic: 0.85, // "Landing Page View" optimization filters some bots
  awareness: 0.7,
  engagement: 0.85,
  leads: 0.9, // Instant form optimization filters low-intent clicks
  sales: 0.88, // Pixel-trained conversion optimization, decent quality
  app_promotion: 0.8, // App install traffic can include incentivized installs
};

// ── Budget Constraints (₦ Naira) ───────────────────────────────────────────
export const BUDGET_CONSTRAINTS = {
  /** Absolute floor — below this Meta can't optimize */
  floorNgn: 2_000,
  /** Recommended starting budget */
  defaultNgn: 5_000,
  /** Soft ceiling — warn before exceeding */
  ceilingNgn: 50_000,
  /** Minimum campaign days for algorithm learning */
  minDurationDays: 7,
} as const;

// ── Budget Tier Presets ────────────────────────────────────────────────────
// Previously hardcoded in budget-launch-step.tsx
export const BUDGET_TIERS = [
  {
    label: "Starter",
    amount: 2_500,
    desc: "Test the waters",
    popular: false,
  },
  {
    label: "Recommended",
    amount: 5_000,
    desc: "Best for growth",
    popular: true,
  },
  {
    label: "Pro",
    amount: 15_000,
    desc: "Maximum scale",
    popular: false,
  },
] as const;

// ── Default Targeting by Objective ─────────────────────────────────────────
export const DEFAULT_AGE_RANGES: Record<
  AdSyncObjective,
  { min: number; max: number }
> = {
  whatsapp: { min: 21, max: 45 },
  traffic: { min: 18, max: 55 },
  awareness: { min: 18, max: 65 },
  engagement: { min: 18, max: 35 },
  leads: { min: 21, max: 55 }, // Form-fillers skew slightly older
  sales: { min: 18, max: 50 }, // Purchase behaviour skews broad but capped
  app_promotion: { min: 18, max: 40 }, // App installs skew younger/mobile-first
};

// ── Default Locations (Meta geo IDs — cities) ─────────────────────────────
/**
 * Lagos (2420605), Abuja (2347251), Port Harcourt (2346156) — Meta city IDs.
 * Used when the user has not specified any locations.
 * Lagos ID matches LAGOS_DEFAULT in targeting-resolver.ts — confirmed correct.
 */
import type { LocationOption } from "@/stores/campaign-store";

export const DEFAULT_LOCATIONS: LocationOption[] = [
  { id: "2420605", name: "Lagos", type: "city", country: "Nigeria" },
  { id: "2347251", name: "Abuja", type: "city", country: "Nigeria" },
  { id: "2346156", name: "Port Harcourt", type: "city", country: "Nigeria" },
];

// ── Account Health Tiers ───────────────────────────────────────────────────
export const ACCOUNT_TIERS = {
  STARTER: {
    maxDailySpend: 15_000,
    minHistorySpend: 0,
    label: "Starter",
    description: "New account warm-up phase",
  },
  ESTABLISHED: {
    maxDailySpend: 150_000,
    minHistorySpend: 50_000,
    label: "Established",
    description: "Proven payment history",
  },
  SCALER: {
    maxDailySpend: 1_000_000,
    minHistorySpend: 500_000,
    label: "Scaler",
    description: "High volume trusted account",
  },
} as const;

// ── Policy Risk Patterns (Nigeria Specific) ────────────────────────────────
/**
 * Terms that frequently trigger Meta's automated policy flags in this region.
 * Focusing on:
 * 1. Unrealistic health claims (cure, permanent, fat loss)
 * 2. Financial schemes (crypto, investment, ponzi)
 * 3. Aggressive/Spammy language
 */
export const RISKY_TERMS = [
  // TODO: Move to ai checker away from shell
  // Health / Medical
  {
    pattern: /\b(cure|cures|cured)\b/i,
    reason: "Claims of a 'cure' are flagged as misleading health claims.",
  },
  {
    pattern: /\b(permanent weight loss|lose \d+kg in \d+ days)\b/i,
    reason: "Unrealistic weight loss claims trigger bans.",
  },
  {
    pattern: /\b(diabetes|cancer|fibroid|infertility)\b/i,
    reason: "Targeting specific health conditions is restricted.",
  },

  // Financial / Crypto
  {
    pattern: /\b(crypto|bitcoin|forex|binary option)\b/i,
    reason: "Cryptocurrency and financial products are heavily restricted.",
  },
  {
    pattern: /\b(investment|double your money|ponzi)\b/i,
    reason: "Get-rich-quick schemes are prohibited.",
  },

  // Aggressive / Quality
  {
    pattern: /\b(giveaway|free money)\b/i,
    reason: "Bait-and-switch or low-quality content flag.",
  },
  {
    pattern: /(!{3,})/i,
    reason: "Excessive punctuation (!!!) signals low quality.",
  },
] as const;
