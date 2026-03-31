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
 * Area → parent city normalization for Nigeria.
 * These are common neighborhood/area names users and the LLM might provide.
 * New: Nigerian does not have city targeting, only region, should we redo how this works?
 */
const NG_AREA_TO_CITY: Record<string, string> = {
  // Lagos areas
  lekki: "Lagos",
  "victoria island": "Lagos",
  vi: "Lagos",
  ikoyi: "Lagos",
  yaba: "Lagos",
  surulere: "Lagos",
  ikeja: "Lagos",
  ajah: "Lagos",
  festac: "Lagos",
  maryland: "Lagos",
  "isale eko": "Lagos",
  badagry: "Lagos",
  epe: "Lagos",
  ikorodu: "Lagos",
  "lagos island": "Lagos",
  "lagos mainland": "Lagos",
  // Abuja areas
  wuse: "Abuja",
  "wuse 2": "Abuja",
  maitama: "Abuja",
  asokoro: "Abuja",
  gwarinpa: "Abuja",
  jabi: "Abuja",
  garki: "Abuja",
  "life camp": "Abuja",
  kubwa: "Abuja",
  lugbe: "Abuja",
  "central area": "Abuja",
  fct: "Abuja",
  "abuja fct": "Abuja",
  // Port Harcourt areas
  gra: "Port Harcourt",
  "old gra": "Port Harcourt",
  "ada george": "Port Harcourt",
  rumuola: "Port Harcourt",
  "d-line": "Port Harcourt",
  "mile 3": "Port Harcourt",
  diobu: "Port Harcourt",
  ph: "Port Harcourt",
  portharcourt: "Port Harcourt",
  "port-harcourt": "Port Harcourt",
};

export function normalizeLocationName(name: string): string {
  const lower = name.toLowerCase().trim();
  return NG_AREA_TO_CITY[lower] ?? name;
}

/**
 * Resolve a location name → Meta geo object.
 * Tries city → region → returns null (caller uses Lagos default).
 */
export async function resolveLocation(
  name: string,
  searchFn: (query: string, type: "city" | "region") => Promise<any[]>,
): Promise<ResolvedLocation | null> {
  const normalized = normalizeLocationName(name);

  // City search
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
    // try region
  }

  // Region fallback
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

/** Lagos default — always valid, used when AI returns no resolvable location */
export const LAGOS_DEFAULT: ResolvedLocation = {
  id: "2420605",
  name: "Lagos",
  type: "city",
  country: "Nigeria",
  resolved: true,
};
