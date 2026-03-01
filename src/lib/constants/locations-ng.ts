/**
 * Nigerian locations — documentation reference only.
 *
 * STATUS: We resolve locations dynamically via Meta's /search?type=adgeolocation API
 * (see src/lib/utils/targeting-resolver.ts → resolveLocation).
 * A static list was attempted here but Meta's region keys are account-scoped and
 * change between API versions, making a hardcoded list fragile.
 *
 * The resolver uses:
 *   1. City search (most reliable for Lagos, Abuja, PH, etc.)
 *   2. Region fallback if city search fails
 *   3. Lagos default (id: "2420605") if all else fails
 *
 * This file is kept for documentation / reference. The alias mapping
 * (Lekki → Lagos, Wuse → Abuja, etc.) lives in targeting-resolver.ts.
 *
 * Known city IDs (verified June 2025 via Meta API sandbox):
 * - Lagos: 2420605 (city)
 * - Abuja: 2347251 (city)
 * - Port Harcourt: 2346156 (city)
 * - Kano: 2345893 (city)
 * - Ibadan: 2339354 (city)
 * - Enugu: 2332459 (city)
 * - Benin City: 2324774 (city)
 *
 * These are informational only — always resolve via API to get the current key.
 */

export const NG_LOCATION_DOCS = {
  note: "Use targeting-resolver.ts resolveLocation() for all runtime resolution.",
  knownCities: [
    { name: "Lagos", id: "2420605", type: "city" },
    { name: "Abuja", id: "2347251", type: "city" },
    { name: "Port Harcourt", id: "2346156", type: "city" },
    { name: "Kano", id: "2345893", type: "city" },
    { name: "Ibadan", id: "2339354", type: "city" },
    { name: "Enugu", id: "2332459", type: "city" },
    { name: "Benin City", id: "2324774", type: "city" },
  ],
} as const;
