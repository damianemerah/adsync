import type { AdSyncObjective } from "@/lib/constants";

export interface GeoStrategy {
  type: "broad" | "cities";
  radius_km: number;
}

/**
 * Deterministic geo strategy resolver.
 *
 * Called at campaign launch — enforces objective-aware targeting regardless of
 * what the AI suggested. The AI's `geo_strategy` field is advisory; this function
 * is the source of truth for the Meta API payload.
 *
 * - awareness / engagement → broad geo (region or country-level) + home+recent
 *   Max reach, better CPM efficiency. Radius irrelevant.
 * - whatsapp / traffic → city-level, 10km radius, residents only (home)
 *   Precision conversion — no tourists / people passing through.
 */
export function pickGeoStrategy(objective: AdSyncObjective): GeoStrategy {
  if (objective === "awareness" || objective === "engagement") {
    return {
      type: "broad",
      radius_km: 0, // not used for broad geo
    };
  }

  // whatsapp | traffic
  return {
    type: "cities",
    radius_km: 17,
  };
}
