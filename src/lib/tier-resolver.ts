/**
 * Tier Resolver — spend-based dynamic tier enforcement.
 *
 * Rules:
 *   ≤ ₦100,000  (10_000_000 kobo) → starter
 *   ≤ ₦300,000  (30_000_000 kobo) → growth
 *   > ₦300,000                    → agency
 *
 * The resolver only enforces the MINIMUM (floor) tier.
 * Users can always be on a HIGHER tier than their spend requires,
 * but they can NEVER be downgraded below the floor.
 */

import type { TierId } from "@/lib/constants";
import { TIER_CONFIG } from "@/lib/constants";

// ─── Spend thresholds (kobo) ─────────────────────────────────────────────────

const STARTER_CEILING_KOBO =
  TIER_CONFIG.starter.limits.adSpendCeilingKobo ?? 10_000_000; // ₦100,000
const GROWTH_CEILING_KOBO =
  TIER_CONFIG.growth.limits.adSpendCeilingKobo ?? 30_000_000; // ₦300,000

// ─── Core resolver ────────────────────────────────────────────────────────────

/**
 * Returns the minimum tier required for a given 30-day spend amount.
 * This is the "floor" tier — the user cannot go below this.
 *
 * @param bufferKobo - Anomaly buffer from TIER_CONFIG for the user's current tier.
 *   Spend must exceed ceiling + buffer before triggering an upgrade, protecting
 *   against one-off campaign spikes (e.g. a Black Friday sale).
 *   Defaults to 0 (no buffer) for backward compatibility.
 */
export function resolveSpendTier(spendKobo: number, bufferKobo: number = 0): TierId {
  if (spendKobo <= STARTER_CEILING_KOBO + bufferKobo) return "starter";
  if (spendKobo <= GROWTH_CEILING_KOBO + bufferKobo) return "growth";
  return "agency";
}

// ─── Tier ordering ───────────────────────────────────────────────────────────

const TIER_ORDER: Record<TierId, number> = {
  starter: 0,
  growth: 1,
  agency: 2,
};

/**
 * Returns true if `requested` tier is allowed given `currentSpendKobo`.
 * A user can:
 *  - stay on the same tier ✓
 *  - upgrade to any higher tier ✓
 *  - NOT downgrade below the spend-floor tier ✗
 */
export function isTierChangeAllowed(
  requestedTier: TierId,
  currentSpendKobo: number,
): boolean {
  const floorTier = resolveSpendTier(currentSpendKobo);
  return TIER_ORDER[requestedTier] >= TIER_ORDER[floorTier];
}

/**
 * Returns true if `candidateTier` is strictly higher than `currentTier`.
 */
export function isUpgrade(candidateTier: TierId, currentTier: TierId): boolean {
  return TIER_ORDER[candidateTier] > TIER_ORDER[currentTier];
}

/**
 * Human-readable spend range label for a given tier.
 */
export function tierSpendRangeLabel(tier: TierId): string {
  switch (tier) {
    case "starter":
      return "Up to ₦100,000/mo ad spend";
    case "growth":
      return "₦100,001 – ₦300,000/mo ad spend";
    case "agency":
      return "Above ₦300,000/mo ad spend";
  }
}
