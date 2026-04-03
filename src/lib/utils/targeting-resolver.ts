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
 *   1. Normalize Nigerian area aliases → parent city (Lekki → Lagos)
 *   2. City API search
 *   3. Region API fallback
 *   4. Lagos default
 */

import { resolveLocalBehavior } from "@/lib/constants/meta-behaviors";
import { resolveLocalLifeEvent } from "@/lib/constants/meta-life-events";
import { resolveLocalInterest } from "@/lib/constants/meta-interests";

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
 * Extract the primary search keyword from an AI-generated interest term.
 *
 * Strategy: take the first 1-2 meaningful words.
 * "Hair care" → "Hair care" (already short, use as-is)
 * "Natural hair extensions" → "Natural hair" (first 2 words)
 * "Event planning and services" → "Event planning" (first 2 words)
 */
function extractSearchKeyword(term: string): string {
  const cleaned = term.trim().toLowerCase();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 1);

  // Already 1-2 words — use as-is
  if (words.length <= 2) return term.trim();

  // 3+ words — take first 2
  return words.slice(0, 2).join(" ");
}

/**
 * Sanity check: does the Meta result have any word overlap with the intended term?
 * Prevents accepting completely unrelated results (e.g. "Oil" → "Oil painting" when we wanted "Cooking oil")
 */
function hasWordOverlap(resultName: string, intended: string): boolean {
  const resultWords = new Set(resultName.toLowerCase().split(/\s+/));
  const intendedWords = intended.toLowerCase().split(/\s+/);
  return intendedWords.some((w) => w.length > 2 && resultWords.has(w));
}

/**
 * Resolve a single AI-generated interest name → Meta targeting object.
 * Simple: extract keyword → search → take data[0] if sane.
 */
export async function resolveInterest(
  name: string,
  searchFn: (query: string) => Promise<any[]>,
): Promise<ResolvedTarget> {
  // Local catalog — normalizes common LLM names to exact Meta names
  const local = resolveLocalInterest(name);

  // Fast-path: confirmed Meta ID baked in (from validate-meta-interests.ts)
  if (local?.metaId) {
    return { id: local.metaId, name: local.name, resolved: true };
  }

  const correctedName = local?.name ?? name;
  const keyword = extractSearchKeyword(correctedName);

  try {
    const results = await searchFn(keyword);

    if (results.length > 0) {
      const top = results[0];
      // Sanity check: result must share at least one word with our query
      if (hasWordOverlap(top.name, keyword)) {
        return { id: String(top.id), name: top.name, resolved: true };
      }

      // Word overlap failed — try the corrected full name if different from keyword
      if (keyword !== correctedName.trim()) {
        const fallback = await searchFn(correctedName.trim());
        if (fallback.length > 0 && hasWordOverlap(fallback[0].name, correctedName)) {
          return {
            id: String(fallback[0].id),
            name: fallback[0].name,
            resolved: true,
          };
        }
      }
    }
  } catch {
    // Network error — skip silently
  }

  console.warn(`[resolveInterest] No valid match for: "${name}"`);
  return { id: name, name, resolved: false };
}

/**
 * Resolve all AI interests in parallel (capped at 5 concurrent to avoid rate limits).
 */
export async function resolveInterests(
  names: string[],
  searchFn: (query: string) => Promise<any[]>,
  concurrency = 5,
): Promise<ResolvedTarget[]> {
  const results: ResolvedTarget[] = [];
  for (let i = 0; i < names.length; i += concurrency) {
    const batch = names.slice(i, i + concurrency);
    const resolved = await Promise.all(
      batch.map((name) => resolveInterest(name, searchFn)),
    );
    results.push(...resolved);
  }
  return results;
}

// ─── Behavior Resolution ─────────────────────────────────────────────────────

/**
 * Resolve a behavior name.
 *
 * Local catalog first (instant, no API call for 90% of cases).
 * API search only if local lookup fails.
 */
export async function resolveBehavior(
  name: string,
  searchFn: (query: string) => Promise<any[]>,
): Promise<ResolvedTarget> {
  // 1. Local catalog — normalizes common LLM aliases to exact Meta names
  const local = resolveLocalBehavior(name);

  // Fast-path: confirmed Meta ID baked in (from validate-meta-behaviors.ts)
  if (local?.metaId) {
    return { id: local.metaId, name: local.name, resolved: true };
  }

  const searchName = local?.name ?? name;

  try {
    const results = await searchFn(searchName);
    // Exact name match first
    const exact = results.find(
      (r: any) => r.name.toLowerCase() === searchName.toLowerCase(),
    );
    if (exact) {
      return { id: String(exact.id), name: exact.name, resolved: true };
    }
    // Close enough — first result if there's any word overlap
    if (results.length > 0 && hasWordOverlap(results[0].name, searchName)) {
      return {
        id: String(results[0].id),
        name: results[0].name,
        resolved: true,
      };
    }
  } catch {
    // silent
  }

  // Fallback: use the corrected local name (or original) without an ID
  console.warn(`[resolveBehavior] No API match for: "${name}"`);
  return { id: searchName, name: searchName, resolved: false };
}

/**
 * Resolve all AI behaviors in batches (capped at 3 concurrent to avoid rate limits).
 */
export async function resolveBehaviors(
  names: string[],
  searchFn: (query: string) => Promise<any[]>,
  concurrency = 3,
): Promise<ResolvedTarget[]> {
  const results: ResolvedTarget[] = [];
  for (let i = 0; i < names.length; i += concurrency) {
    const batch = names.slice(i, i + concurrency);
    const resolved = await Promise.all(
      batch.map((name) => resolveBehavior(name, searchFn)),
    );
    results.push(...resolved);
  }
  return results;
}

// ─── Life Event Resolution ────────────────────────────────────────────────────

/**
 * Resolve a single AI-generated life event name → Meta targeting object.
 *
 * Local catalog first (from META_LIFE_EVENT_SEEDS aliases).
 * API search only if local lookup fails or returns no match.
 */
export async function resolveLifeEvent(
  name: string,
  searchFn: (query: string) => Promise<any[]>,
): Promise<ResolvedTarget> {
  // 1. Local catalog — normalizes LLM aliases to exact Meta names
  const local = resolveLocalLifeEvent(name);

  // Fast-path: confirmed Meta ID baked in (from validate-meta-behaviors.ts)
  if (local?.metaId) {
    return { id: local.metaId, name: local.name, resolved: true };
  }

  const searchName = local?.name ?? name;
  try {
    const results = await searchFn(searchName);
    // Exact name match first
    const exact = results.find(
      (r: any) => r.name.toLowerCase() === searchName.toLowerCase(),
    );
    if (exact) {
      return { id: String(exact.id), name: exact.name, resolved: true };
    }
    // Close enough — first result if there's any word overlap
    if (results.length > 0 && hasWordOverlap(results[0].name, searchName)) {
      return {
        id: String(results[0].id),
        name: results[0].name,
        resolved: true,
      };
    }
  } catch {
    // silent
  }

  console.warn(`[resolveLifeEvent] No API match for: "${name}"`);
  return { id: searchName, name: searchName, resolved: false };
}

/**
 * Resolve all AI life events in batches (capped at 3 concurrent).
 */
export async function resolveLifeEvents(
  names: string[],
  searchFn: (query: string) => Promise<any[]>,
  concurrency = 3,
): Promise<ResolvedTarget[]> {
  const results: ResolvedTarget[] = [];
  for (let i = 0; i < names.length; i += concurrency) {
    const batch = names.slice(i, i + concurrency);
    const resolved = await Promise.all(
      batch.map((name) => resolveLifeEvent(name, searchFn)),
    );
    results.push(...resolved);
  }
  return results;
}

/**
 * Resolve a work position name to a Meta ID via the API search.
 * No local catalog — Meta's adworkposition search is reliable for common titles.
 */
export async function resolveWorkPosition(
  name: string,
  searchFn: (query: string) => Promise<any[]>,
): Promise<ResolvedTarget> {
  try {
    const results = await searchFn(name);
    const exact = results.find(
      (r: any) => r.name.toLowerCase() === name.toLowerCase(),
    );
    if (exact) {
      return { id: String(exact.id), name: exact.name, resolved: true };
    }
    if (results.length > 0 && hasWordOverlap(results[0].name, name)) {
      return {
        id: String(results[0].id),
        name: results[0].name,
        resolved: true,
      };
    }
  } catch {
    // silent
  }

  console.warn(`[resolveWorkPosition] No API match for: "${name}"`);
  return { id: name, name, resolved: false };
}

/**
 * Resolve all work position names in batches (capped at 3 concurrent).
 */
export async function resolveWorkPositions(
  names: string[],
  searchFn: (query: string) => Promise<any[]>,
  concurrency = 3,
): Promise<ResolvedTarget[]> {
  const results: ResolvedTarget[] = [];
  for (let i = 0; i < names.length; i += concurrency) {
    const batch = names.slice(i, i + concurrency);
    const resolved = await Promise.all(
      batch.map((name) => resolveWorkPosition(name, searchFn)),
    );
    results.push(...resolved);
  }
  return results;
}

/**
 * Resolve an industry sector name to a Meta ID via the API search.
 * No local catalog — Meta's adTargetingCategory/industries search is reliable for standard sectors.
 */
export async function resolveIndustry(
  name: string,
  searchFn: (query: string) => Promise<any[]>,
): Promise<ResolvedTarget> {
  try {
    const results = await searchFn(name);
    const exact = results.find(
      (r: any) => r.name.toLowerCase() === name.toLowerCase(),
    );
    if (exact) {
      return { id: String(exact.id), name: exact.name, resolved: true };
    }
    if (results.length > 0 && hasWordOverlap(results[0].name, name)) {
      return {
        id: String(results[0].id),
        name: results[0].name,
        resolved: true,
      };
    }
  } catch {
    // silent
  }

  console.warn(`[resolveIndustry] No API match for: "${name}"`);
  return { id: name, name, resolved: false };
}

/**
 * Resolve all industry names in batches (capped at 3 concurrent).
 */
export async function resolveIndustries(
  names: string[],
  searchFn: (query: string) => Promise<any[]>,
  concurrency = 3,
): Promise<ResolvedTarget[]> {
  const results: ResolvedTarget[] = [];
  for (let i = 0; i < names.length; i += concurrency) {
    const batch = names.slice(i, i + concurrency);
    const resolved = await Promise.all(
      batch.map((name) => resolveIndustry(name, searchFn)),
    );
    results.push(...resolved);
  }
  return results;
}

/**
 * Area/city alias → Meta canonical search string for Nigeria.
 *
 * Values are the EXACT strings that Meta's adgeolocation API resolves
 * to a region or city record for Nigeria. Generated by discover-ng-regions.ts.
 *
 * Convention (from live API testing):
 *   - States: use bare state name — "Lagos", "Ogun", "Anambra" → region records
 *   - FCT: use "Federal Capital Territory" (not "Abuja" which resolves to a city)
 *   - Rivers: use "Rivers" (bare) or "Rivers State Nigeria" — both → Rivers State region
 *     Do NOT use bare "Rivers Nigeria" — it also resolves to Rivers State but is needlessly long
 *   - Borno: use bare "Borno" — "Borno Nigeria" resolves to "Biu" (a city, wrong)
 *   - City aliases (Ibadan, Port Harcourt, etc.) stay as cities — they are valid targets
 *     but will be caught by pre-launch rules if city targeting is unsupported
 *
 * Keys must be lowercase. The resolver lowercases before lookup.
 */
const NG_AREA_TO_SEARCH_FORMAT: Record<string, string> = {
  // ── Lagos (region key: 2607) ────────────────────────────────────────────────
  // Bare "Lagos" → Lagos region. "Lagos Nigeria" → Lagos city (1630653) — avoid.
  lagos: "Lagos",
  "lagos state": "Lagos",
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
  // Port Harcourt stays as a city lookup (key: 1638000, type: city)
  "port harcourt": "Port Harcourt",
  "port-harcourt": "Port Harcourt",
  portharcourt: "Port Harcourt",
  ph: "Port Harcourt",
  gra: "Port Harcourt",
  "old gra": "Port Harcourt",
  "ada george": "Port Harcourt",
  rumuola: "Port Harcourt",
  "d-line": "Port Harcourt",
  "mile 3": "Port Harcourt",
  diobu: "Port Harcourt",

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
  // "Oyo" bare → Oyo State region. "Oyo Nigeria" → "Oyo, Oyo" city.
  oyo: "Oyo State",
  "oyo state": "Oyo State",
  ibadan: "Ibadan",  // city lookup (key: 1624010)

  // ── Ogun (region key: 2609) ────────────────────────────────────────────────
  ogun: "Ogun",
  "ogun state": "Ogun",
  "ogun nigeria": "Ogun",

  // ── Delta State (region key: 2623) ─────────────────────────────────────────
  // Bare "Delta" returned no Nigerian result — "Delta Nigeria" → "Delta State"
  delta: "Delta Nigeria",       // use the query that works
  "delta state": "Delta Nigeria",
  "delta nigeria": "Delta Nigeria",
  warri: "Warri",               // city (key: 1643529)

  // ── Anambra (region key: 2614) ─────────────────────────────────────────────
  anambra: "Anambra",
  "anambra state": "Anambra",
  "anambra nigeria": "Anambra",
  onitsha: "Onitsha",           // city (key: 1636832)

  // ── Edo (region key: 2624) ─────────────────────────────────────────────────
  edo: "Edo",
  "edo state": "Edo",
  "edo nigeria": "Edo",
  benin: "Benin",               // city (key: 1616339) — "Benin City" query returns "Benin"
  "benin city": "Benin",

  // ── Kaduna (region) ────────────────────────────────────────────────────────
  kaduna: "Kaduna State",
  "kaduna state": "Kaduna State",
  "kaduna nigeria": "Kaduna State",

  // ── Abia (region key: 2631) ────────────────────────────────────────────────
  abia: "Abia",
  "abia state": "Abia",
  "abia nigeria": "Abia",
  aba: "Aba",                   // city/subcity (key: 1610699)

  // ── Akwa Ibom (region key: 2610) ───────────────────────────────────────────
  "akwa ibom": "Akwa Ibom",
  "akwa ibom state": "Akwa Ibom",
  "akwa ibom nigeria": "Akwa Ibom",
  uyo: "Uyo",                   // city (key: 1643236)

  // ── Imo (region key: 2617) ─────────────────────────────────────────────────
  imo: "Imo",
  "imo state": "Imo",
  "imo nigeria": "Imo",
  owerri: "Owerri, Imo",        // city (key: 1637515) — Meta includes state in name

  // ── Osun (region key: 2628) ────────────────────────────────────────────────
  osun: "Osun",
  "osun state": "Osun",
  "osun nigeria": "Osun",
  oshogbo: "Osogbo",            // city (key: 1637269) — Meta spells it "Osogbo"

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
  maiduguri: "Maiduguri",       // city (key: 1631610)

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
 * Set of canonical search strings that we know resolve to Meta region records.
 * Used by resolveLocation() to skip the city API call for these queries
 * (city targeting is unsupported in Nigeria).
 */
export const NG_REGION_CANONICAL_SET = new Set<string>([
  "Lagos",
  "Federal Capital Territory",
  "Rivers State",
  "Cross River",
  "Oyo State",
  "Ogun",
  "Delta Nigeria",
  "Anambra",
  "Edo",
  "Abia",
  "Akwa Ibom",
  "Imo",
  "Osun",
  "Ekiti",
  "Ondo Nigeria",
  "Borno State",
  "Kwara",
  "Kogi",
  "Benué",
  "Plateau",
  "Nasarawa",
  "Jigawa",
  "Bayelsa",
  "Ebonyi",
  "Adamawa",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Kebbi",
  "Niger State",
  "Kano State",
  "Kaduna State",
  "Sokoto State",
  "Enugu State",
  "Bauchi State",
  "Gombe State",
  "Katsina State",
]);

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
 * For Nigerian locations that map to a known region canonical (e.g. "Lagos",
 * "Federal Capital Territory", "Oyo State") we skip the city API call and go
 * straight to region search — Meta doesn't support city-level targeting in
 * Nigeria so the city call would produce a record rejected at launch.
 *
 * City aliases ("Port Harcourt", "Ibadan", etc.) are NOT in NG_REGION_CANONICAL_SET
 * so they still attempt city lookup, which is intentional.
 *
 * For all other locations: tries city → region → returns null.
 */
export async function resolveLocation(
  name: string,
  searchFn: (query: string, type: "city" | "region") => Promise<any[]>,
): Promise<ResolvedLocation | null> {
  const normalized = normalizeLocationName(name);
  const isNigerianRegion = NG_REGION_CANONICAL_SET.has(normalized);

  // Skip city search for Nigerian state-level locations — city targeting is unsupported.
  if (!isNigerianRegion) {
    try {
      const results = await searchFn(normalized, "city");
      const match = results.find((r: any) => hasWordOverlap(r.name, normalized));
      if (match) {
        return {
          id: match.key || String(match.id),
          name: match.name,
          type: "city",
          country: match.country_name,
          resolved: true,
        };
      }
    } catch {
      // fall through to region
    }
  }

  // Region search (primary for NG, fallback for others)
  try {
    const results = await searchFn(normalized, "region");
    if (results.length > 0) {
      const r = results[0];
      return {
        id: r.key || String(r.id),
        name: r.name,
        type: "region",
        country: r.country_name,
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
