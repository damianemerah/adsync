/**
 * Targeting resolver — converts AI-generated strings to validated Meta IDs.
 *
 * Philosophy: simple beats clever.
 * Meta's interest search returns the canonical category as data[0] for 1-2 word queries.
 * The fix was always the AI prompt (short catalog terms), not a complex fuzzy pipeline.
 *
 * Interest pipeline:
 *   1. Extract primary keyword (first 1-2 significant words from the AI term)
 *   2. Search Meta API → take data[0]
 *   3. Accept if result name shares at least one word with the query (sanity check)
 *   4. Reject + skip if no result or zero word overlap — avoids silently wrong IDs
 *
 * Behavior pipeline:
 *   1. Local catalog lookup (instant, no API) — covers 90% of cases
 *   2. Exact API search with corrected name from catalog
 *   3. Fallback to name-only (displayed in UI, filtered at launch)
 *
 * Location pipeline:
 *   1. Normalize Nigerian area/city aliases → parent region (Lekki → Lagos, Port Harcourt → Rivers State)
 *   2. Skip city search if canonical is a known NG region, or if country is in CITY_TARGETING_UNSUPPORTED
 *   3. Region API search
 *   4. Nigeria country fallback
 */

import { CITY_TARGETING_UNSUPPORTED } from "@/lib/constants/geo-targeting";

export interface ResolvedTarget {
  id: string;
  name: string;
  /** false = name-only fallback; Meta will reject this at campaign launch */
  resolved: boolean;
}

export interface ResolvedLocation {
  id: string;
  name: string;
  type: string;
  country: string;
  resolved: boolean;
}

// ─── Interest Resolution ──────────────────────────────────────────────────────

/**
 * Sanity check: does the Meta result have any word overlap with the intended term?
 * Prevents accepting completely unrelated results (e.g. "Oil" → "Oil painting" when we wanted "Cooking oil")
 */
function hasWordOverlap(resultName: string, intended: string): boolean {
  const resultWords = new Set(resultName.toLowerCase().split(/\s+/));
  const intendedWords = intended.toLowerCase().split(/\s+/);
  return intendedWords.some((w) => w.length > 2 && resultWords.has(w));
}

const NG_AREA_TO_SEARCH_FORMAT: Record<string, string> = {
  // ── Lagos (region key: 2607) ────────────────────────────────────────────────
  // Bare "Lagos" → Lagos region. "Lagos Nigeria" via API → Lagos city (1630653) — avoid.
  // Map "lagos nigeria" here so it hits the NG_REGION_KEY_MAP fast path instead.
  lagos: "Lagos",
  "lagos state": "Lagos",
  "lagos nigeria": "Lagos",
  lekki: "Lagos",
  "victoria island": "Lagos",
  vi: "Lagos",
  ikoyi: "Lagos",
  yaba: "Lagos",
  surulere: "Lagos",
  ajah: "Lagos",
  festac: "Lagos",
  maryland: "Lagos",
  "isale eko": "Lagos",
  badagry: "Lagos",
  epe: "Lagos",
  ikorodu: "Lagos",
  "lagos island": "Lagos",
  "lagos mainland": "Lagos",

  // ── FCT / Abuja (region key: 2608) ─────────────────────────────────────────
  // "Federal Capital Territory" → region. "Abuja" → city (1611075).
  // Use the full region name for all Abuja neighbourhoods.
  "federal capital territory": "Federal Capital Territory",
  "federal capital territory nigeria": "Federal Capital Territory",
  fct: "Federal Capital Territory",
  "abuja fct": "Federal Capital Territory",
  abuja: "Federal Capital Territory",
  "abuja nigeria": "Federal Capital Territory",
  wuse: "Federal Capital Territory",
  "wuse 2": "Federal Capital Territory",
  maitama: "Federal Capital Territory",
  asokoro: "Federal Capital Territory",
  gwarinpa: "Federal Capital Territory",
  jabi: "Federal Capital Territory",
  garki: "Federal Capital Territory",
  "life camp": "Federal Capital Territory",
  kubwa: "Federal Capital Territory",
  lugbe: "Federal Capital Territory",
  "central area": "Federal Capital Territory",

  // ── Rivers State (region key: 2636) ────────────────────────────────────────
  // Bare "Rivers" and "Rivers State Nigeria" both resolve correctly.
  rivers: "Rivers State",
  "rivers state": "Rivers State",
  "rivers state nigeria": "Rivers State",
  "rivers nigeria": "Rivers State",
  // Port Harcourt and PH neighbourhoods → Rivers State region (city targeting unsupported in NG)
  "port harcourt": "Rivers State",
  "port-harcourt": "Rivers State",
  portharcourt: "Rivers State",
  ph: "Rivers State",
  gra: "Rivers State",
  "old gra": "Rivers State",
  "ada george": "Rivers State",
  rumuola: "Rivers State",
  "d-line": "Rivers State",
  "mile 3": "Rivers State",
  diobu: "Rivers State",

  // ── Cross River (region key: 2611) ─────────────────────────────────────────
  "cross river": "Cross River",
  "cross river state": "Cross River",
  "cross river nigeria": "Cross River",
  calabar: "Cross River",  // Calabar is the capital; resolves to a city, but CR region is the target

  // ── Kano (region) ──────────────────────────────────────────────────────────
  kano: "Kano State",
  "kano state": "Kano State",
  "kano nigeria": "Kano State",

  // ── Oyo State (region key: 2621) ───────────────────────────────────────────
  // "Oyo" bare → Oyo State region. "Oyo Nigeria" via API → "Oyo, Oyo" city — avoid.
  // Map "oyo nigeria" here so it hits the NG_REGION_KEY_MAP fast path.
  oyo: "Oyo State",
  "oyo state": "Oyo State",
  "oyo nigeria": "Oyo State",
  ibadan: "Oyo State",  // Ibadan is in Oyo State; city targeting unsupported in NG

  // ── Ogun (region key: 2609) ────────────────────────────────────────────────
  ogun: "Ogun",
  "ogun state": "Ogun",
  "ogun nigeria": "Ogun",

  // ── Delta State (region key: 2623) ─────────────────────────────────────────
  // Bare "Delta" returned no Nigerian result — "Delta Nigeria" → "Delta State"
  delta: "Delta Nigeria",       // use the query that works
  "delta state": "Delta Nigeria",
  "delta nigeria": "Delta Nigeria",
  warri: "Delta Nigeria",       // Warri is in Delta State; city targeting unsupported in NG

  // ── Anambra (region key: 2614) ─────────────────────────────────────────────
  anambra: "Anambra",
  "anambra state": "Anambra",
  "anambra nigeria": "Anambra",
  onitsha: "Anambra",           // Onitsha is in Anambra; city targeting unsupported in NG

  // ── Edo (region key: 2624) ─────────────────────────────────────────────────
  edo: "Edo",
  "edo state": "Edo",
  "edo nigeria": "Edo",
  benin: "Edo",                 // Benin City is in Edo State; city targeting unsupported in NG
  "benin city": "Edo",

  // ── Kaduna (region) ────────────────────────────────────────────────────────
  kaduna: "Kaduna State",
  "kaduna state": "Kaduna State",
  "kaduna nigeria": "Kaduna State",

  // ── Abia (region key: 2631) ────────────────────────────────────────────────
  abia: "Abia",
  "abia state": "Abia",
  "abia nigeria": "Abia",
  aba: "Abia",                  // Aba is in Abia State; city targeting unsupported in NG

  // ── Akwa Ibom (region key: 2610) ───────────────────────────────────────────
  "akwa ibom": "Akwa Ibom",
  "akwa ibom state": "Akwa Ibom",
  "akwa ibom nigeria": "Akwa Ibom",
  uyo: "Akwa Ibom",             // Uyo is in Akwa Ibom; city targeting unsupported in NG

  // ── Imo (region key: 2617) ─────────────────────────────────────────────────
  imo: "Imo",
  "imo state": "Imo",
  "imo nigeria": "Imo",
  owerri: "Imo",                // Owerri is in Imo State; city targeting unsupported in NG

  // ── Osun (region key: 2628) ────────────────────────────────────────────────
  osun: "Osun",
  "osun state": "Osun",
  "osun nigeria": "Osun",
  oshogbo: "Osun",              // Oshogbo is in Osun State; city targeting unsupported in NG
  osogbo: "Osun",

  // ── Ekiti (region key: 2640) ───────────────────────────────────────────────
  // "Ekiti Nigeria" resolves to wrong city "Ikere-Ekiti, Ekiti" — use bare
  ekiti: "Ekiti",
  "ekiti state": "Ekiti",

  // ── Ondo (region key: 2634 via "Ondo Nigeria", subcity key 1636694 bare) ───
  // "Ondo" bare → subcity. "Ondo Nigeria" → Ondo State region. Use "Ondo State".
  "ondo state": "Ondo Nigeria",   // query that resolves to region
  "ondo nigeria": "Ondo Nigeria",
  ondo: "Ondo Nigeria",

  // ── Borno State (region key: 2616) ─────────────────────────────────────────
  // "Borno Nigeria" resolves to "Biu" city (wrong) — use bare "Borno"
  borno: "Borno State",
  "borno state": "Borno State",
  maiduguri: "Borno State",     // Maiduguri is in Borno; city targeting unsupported in NG

  // ── Remaining 36-state regions ─────────────────────────────────────────────
  enugu: "Enugu State",
  "enugu state": "Enugu State",
  "enugu nigeria": "Enugu State",

  kwara: "Kwara",               // region (key: 2619)
  "kwara state": "Kwara",

  niger: "Niger State",
  "niger state": "Niger State",

  kogi: "Kogi",                 // region (key: 2627)
  "kogi state": "Kogi",

  benue: "Benué",               // region (key: 2615) — Meta spells it "Benué"
  "benue state": "Benué",

  plateau: "Plateau",           // region (key: 2635)
  "plateau state": "Plateau",
  "jos": "Plateau",

  nasarawa: "Nasarawa",         // region (key: 2642)
  "nasarawa state": "Nasarawa",

  jigawa: "Jigawa",             // region (key: 2625)
  "jigawa state": "Jigawa",

  bauchi: "Bauchi State",
  "bauchi state": "Bauchi State",

  gombe: "Gombe State",
  "gombe state": "Gombe State",

  adamawa: "Adamawa",           // region (key: 2622)
  "adamawa state": "Adamawa",

  taraba: "Taraba",             // region (key: 2629)
  "taraba state": "Taraba",

  yobe: "Yobe",                 // region (key: 2630)
  "yobe state": "Yobe",

  zamfara: "Zamfara",           // region (key: 2643)
  "zamfara state": "Zamfara",

  kebbi: "Kebbi",               // region (key: 2626)
  "kebbi state": "Kebbi",

  sokoto: "Sokoto State",
  "sokoto state": "Sokoto State",

  bayelsa: "Bayelsa",           // region (key: 2638)
  "bayelsa state": "Bayelsa",

  ebonyi: "Ebonyi",             // region (key: 2639)
  "ebonyi state": "Ebonyi",

  katsina: "Katsina State",
  "katsina state": "Katsina State",

  // Ikeja — maps explicitly to Lagos region (neighbourhood OF Lagos)
  ikeja: "Lagos",
};

/**
 * Confirmed Meta region keys for all 36 Nigerian states + FCT.
 *
 * Map key = canonical search string (the value emitted by NG_AREA_TO_SEARCH_FORMAT).
 * Verified against the live Meta adgeolocation API via discover-ng-regions.ts.
 *
 * To add or update an entry: run `npx tsx src/scripts/discover-ng-regions.ts`
 * and copy the region key for the relevant state.
 */
const NG_REGION_KEY_MAP: Record<string, { key: string; name: string }> = {
  "Lagos":                      { key: "2607", name: "Lagos" },
  "Federal Capital Territory":  { key: "2608", name: "Federal Capital Territory" },
  "Rivers State":               { key: "2636", name: "Rivers State" },
  "Cross River":                { key: "2611", name: "Cross River" },
  "Oyo State":                  { key: "2621", name: "Oyo State" },
  "Ogun":                       { key: "2609", name: "Ogun" },
  "Delta Nigeria":              { key: "2623", name: "Delta State" },
  "Anambra":                    { key: "2614", name: "Anambra" },
  "Edo":                        { key: "2624", name: "Edo" },
  "Abia":                       { key: "2631", name: "Abia" },
  "Akwa Ibom":                  { key: "2610", name: "Akwa Ibom" },
  "Imo":                        { key: "2617", name: "Imo" },
  "Osun":                       { key: "2628", name: "Osun" },
  "Ekiti":                      { key: "2640", name: "Ekiti" },
  "Ondo Nigeria":               { key: "2634", name: "Ondo State" },
  "Borno State":                { key: "2616", name: "Borno State" },
  "Kwara":                      { key: "2619", name: "Kwara" },
  "Kogi":                       { key: "2627", name: "Kogi" },
  "Benué":                      { key: "2615", name: "Benué" },
  "Plateau":                    { key: "2635", name: "Plateau" },
  "Nasarawa":                   { key: "2642", name: "Nasarawa" },
  "Jigawa":                     { key: "2625", name: "Jigawa" },
  "Bayelsa":                    { key: "2638", name: "Bayelsa" },
  "Ebonyi":                     { key: "2639", name: "Ebonyi" },
  "Adamawa":                    { key: "2622", name: "Adamawa" },
  "Taraba":                     { key: "2629", name: "Taraba" },
  "Yobe":                       { key: "2630", name: "Yobe" },
  "Zamfara":                    { key: "2643", name: "Zamfara" },
  "Kebbi":                      { key: "2626", name: "Kebbi" },
  "Niger State":                { key: "2620", name: "Niger State" },
  "Kano State":                 { key: "2618", name: "Kano State" },
  "Kaduna State":               { key: "2612", name: "Kaduna State" },
  "Sokoto State":               { key: "2637", name: "Sokoto State" },
  "Enugu State":                { key: "2633", name: "Enugu State" },
  "Bauchi State":               { key: "2632", name: "Bauchi State" },
  "Gombe State":                { key: "2641", name: "Gombe State" },
  "Katsina State":              { key: "2613", name: "Katsina State" },
};

/**
 * Derived from NG_REGION_KEY_MAP — ensures city search is always skipped
 * for any canonical that has a confirmed region key.
 * For future entries added without a key, add manually here as well.
 */
export const NG_REGION_CANONICAL_SET = new Set(Object.keys(NG_REGION_KEY_MAP));

/**
 * Converts an AI-generated or user-typed location string to the exact search
 * string that Meta's adgeolocation API resolves correctly for Nigeria.
 * Returns the input unchanged if no mapping is found.
 */
export function normalizeToNgStateFormat(name: string): string {
  const key = name.toLowerCase().trim();
  return NG_AREA_TO_SEARCH_FORMAT[key] ?? name;
}

export function normalizeLocationName(name: string): string {
  const stateFormat = normalizeToNgStateFormat(name);
  if (stateFormat !== name) return stateFormat;
  return name;
}

/**
 * Resolve a location name → Meta geo object.
 *
 * Fast path: if the normalized name matches a confirmed Nigerian region key in
 * NG_REGION_KEY_MAP, return the cached result immediately — no API call.
 *
 * For other Nigerian canonicals in NG_REGION_CANONICAL_SET (future entries without
 * a confirmed key): skip city search, go straight to region API.
 *
 * City aliases ("Port Harcourt", "Ibadan", etc.) are remapped to their parent state
 * in NG_AREA_TO_SEARCH_FORMAT, so they also hit the fast path.
 *
 * For all other locations: tries city → region → returns null.
 * A country-aware guard prevents returning city-type results for countries in
 * CITY_TARGETING_UNSUPPORTED even if the mapping table is incomplete.
 */
export async function resolveLocation(
  name: string,
  searchFn: (query: string, type: "city" | "region", countryCode?: string) => Promise<any[]>,
): Promise<ResolvedLocation | null> {
  const normalized = normalizeLocationName(name);

  // Fast path: locally cached region key — no API call needed
  const cached = NG_REGION_KEY_MAP[normalized];
  if (cached) {
    return {
      id: cached.key,
      name: cached.name,
      type: "region",
      country: "Nigeria",
      resolved: true,
    };
  }

  const isNigerianRegion = NG_REGION_CANONICAL_SET.has(normalized);
  // Scope API searches to NG when we know the location is Nigerian — prevents
  // false matches (e.g. "Lagos" → Lagos, Portugal instead of Lagos, Nigeria).
  const ngCountryCode = isNigerianRegion ? "NG" : undefined;

  // Skip city search for Nigerian state-level locations — city targeting is unsupported.
  if (!isNigerianRegion) {
    try {
      const results = await searchFn(normalized, "city");
      const match = results.find((r: any) => hasWordOverlap(r.name, normalized));
      if (match) {
        // Safety net: if this country doesn't support city targeting, fall through to region
        // rather than returning a city-type result that Meta will reject at launch.
        if (match.country_name && match.country_name in CITY_TARGETING_UNSUPPORTED) {
          // intentional fall-through to region search below
        } else {
          return {
            id: match.key || String(match.id),
            name: match.name,
            type: "city",
            country: match.country_name,
            resolved: true,
          };
        }
      }
    } catch {
      // fall through to region
    }
  }

  // Region search (primary for NG, fallback for others).
  // Prefer results that are type=region and share a word with the query; fall
  // back to any region-type result, then to results[0] as a last resort.
  try {
    const results = await searchFn(normalized, "region", ngCountryCode);
    const match =
      results.find((r: any) => r.type === "region" && hasWordOverlap(r.name, normalized)) ??
      results.find((r: any) => r.type === "region") ??
      results[0];
    if (match) {
      return {
        id: match.key || String(match.id),
        name: match.name,
        type: "region",
        country: match.country_name,
        resolved: true,
      };
    }
  } catch {
    // silent
  }

  return null;
}

/** Nigeria country-level fallback — used when no region resolves for a Nigerian location. */
export const NIGERIA_DEFAULT: ResolvedLocation = {
  id: "NG",
  name: "Nigeria",
  type: "country",
  country: "Nigeria",
  resolved: true,
};

/**
 * @deprecated Use NIGERIA_DEFAULT.
 * Kept as a re-export alias so legacy callers don’t break during migration.
 */
export const LAGOS_DEFAULT = NIGERIA_DEFAULT;
