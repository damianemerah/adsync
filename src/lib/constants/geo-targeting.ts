/**
 * Meta Ads API Geo Targeting Constraints
 *
 * Tracks countries where Meta does not support city-level targeting.
 * Used at campaign launch to automatically fall back to country-level geo,
 * and in the UI to warn users before they hit the Meta API error.
 *
 * To add a new country: append to CITY_TARGETING_UNSUPPORTED with
 * the country name exactly as it appears in LocationOption.country (from Meta's
 * targeting search API) and its ISO 3166-1 alpha-2 country code.
 *
 * Source: Meta error subcode 1487479 — "City targeting isn't supported in the country you selected."
 */

export const CITY_TARGETING_UNSUPPORTED: Record<string, string> = {
  Nigeria: "NG",
  // Expand as we launch in new markets, e.g.:
  // "Ethiopia": "ET",
  // "Tanzania": "TZ",
  // "Kenya": "KE",
};

/**
 * Returns true if ALL provided locations are in countries where
 * Meta does not support city-level targeting.
 */
export function allLocationsUnsupportedForCityTargeting(
  locations: Array<{ country?: string }>,
): boolean {
  if (locations.length === 0) return false;
  return locations.every(
    (l) => l.country && l.country in CITY_TARGETING_UNSUPPORTED,
  );
}

/**
 * Derives the Meta country codes to use as geo_locations.countries
 * when falling back from city to country-level targeting.
 */
export function getFallbackCountryCodes(
  locations: Array<{ country?: string }>,
): string[] {
  const codes = new Set<string>();
  for (const l of locations) {
    if (l.country && CITY_TARGETING_UNSUPPORTED[l.country]) {
      codes.add(CITY_TARGETING_UNSUPPORTED[l.country]);
    }
  }
  return [...codes];
}
