/**
 * Extracted handler logic for the audience chat step.
 *
 * Contains:
 * - resolveAndStoreStrategy: shared targeting resolution + store mutation
 * - applyCopyResult: shared copy variation slicing + CTA mapping + store update
 * - Meta search fetch helpers (DRY wrappers around /api/meta/search-*)
 */

import type { AIStrategyResult } from "@/lib/ai/types";
import type { CopyVariation } from "@/stores/campaign-store";
import type { AdSyncObjective } from "@/lib/constants";
import type { CTAIntent, CTAData } from "@/types/cta-types";
import {
  resolveInterests,
  resolveBehaviors,
  resolveLifeEvents,
  resolveWorkPositions,
  resolveIndustries,
  resolveLocation,
  normalizeLocationName,
  NIGERIA_DEFAULT,
  type ResolvedTarget,
  type ResolvedLocation,
} from "@/lib/utils/targeting-resolver";

import {
  mapIntentToCTA,
  generateWhatsAppMessage,
} from "@/lib/constants/cta-options";

// ─── Meta Search Helpers ─────────────────────────────────────────────────────

function metaSearchFn(endpoint: string) {
  return async (query: string) => {
    const r = await fetch(
      `/api/meta/${endpoint}?query=${encodeURIComponent(query)}`,
    );
    return r.ok ? r.json() : [];
  };
}

function metaLocationSearchFn() {
  return async (query: string, type: string) => {
    const r = await fetch(
      `/api/meta/search-location?query=${encodeURIComponent(query)}&type=${type}`,
    );
    return r.ok ? r.json() : [];
  };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface TargetingNames {
  interestNames: string[];
  behaviorNames: string[];
  lifeEventNames: string[];
  workPositionNames: string[];
  industryNames: string[];
  locationNames: string[];
}

export interface ResolvedStrategy {
  normalizedInterests: ResolvedTarget[];
  normalizedBehaviors: ResolvedTarget[];
  normalizedLifeEvents: ResolvedTarget[];
  normalizedWorkPositions: ResolvedTarget[];
  normalizedIndustries: ResolvedTarget[];
  finalLocations: Array<{ id: string; name: string; type: string; country: string }>;
  variations: CopyVariation[];
  primaryCopy: CopyVariation;
  ctaData: CTAData;
}

// ─── Extract Targeting Names ─────────────────────────────────────────────────

export function extractTargetingNames(result: AIStrategyResult): TargetingNames {
  const interestNames = (result.interests || []).map((i: any) =>
    typeof i === "string" ? i : i.name,
  );
  const behaviorNames = (result.behaviors || []).map((b: any) =>
    typeof b === "string" ? b : b.name,
  );
  const lifeEventNames = (result.lifeEvents || []).map((e: any) =>
    typeof e === "string" ? e : e.name,
  );
  const workPositionNames = (result.workPositions ?? []).filter(
    (p: any) => typeof p === "string" && p,
  );
  const industryNames = (result.industries ?? []).filter(
    (i: any) => typeof i === "string" && i,
  );
  const locationNames: string[] = Array.from(
    new Set(
      (result.suggestedLocations || []).map((name: string) =>
        normalizeLocationName(name),
      ),
    ),
  );

  return {
    interestNames,
    behaviorNames,
    lifeEventNames,
    workPositionNames,
    industryNames,
    locationNames,
  };
}

// ─── Resolve All Targeting ───────────────────────────────────────────────────

export async function resolveAllTargeting(
  names: TargetingNames,
): Promise<{
  resolvedInterests: ResolvedTarget[];
  resolvedLocations: (ResolvedLocation | null)[];
  resolvedBehaviors: ResolvedTarget[];
  resolvedLifeEvents: ResolvedTarget[];
  resolvedWorkPositions: ResolvedTarget[];
  resolvedIndustries: ResolvedTarget[];
}> {
  const [
    resolvedInterests,
    resolvedLocations,
    resolvedBehaviors,
    resolvedLifeEvents,
    resolvedWorkPositions,
    resolvedIndustries,
  ] = await Promise.all([
    resolveInterests(names.interestNames, metaSearchFn("search-interest")),
    Promise.all(
      names.locationNames.map((name) =>
        resolveLocation(name, metaLocationSearchFn()),
      ),
    ),
    resolveBehaviors(names.behaviorNames, metaSearchFn("search-behavior")),
    resolveLifeEvents(names.lifeEventNames, metaSearchFn("search-life-events")),
    resolveWorkPositions(names.workPositionNames, metaSearchFn("search-work-position")),
    resolveIndustries(names.industryNames, metaSearchFn("search-industry")),
  ]);

  return {
    resolvedInterests,
    resolvedLocations,
    resolvedBehaviors,
    resolvedLifeEvents,
    resolvedWorkPositions,
    resolvedIndustries,
  };
}

// ─── Normalize & Build Final Strategy ────────────────────────────────────────

function normalize(items: ResolvedTarget[]) {
  return items.map(({ id, name, resolved }) => ({ id, name, resolved }));
}

export function buildResolvedStrategy(
  result: AIStrategyResult,
  resolved: Awaited<ReturnType<typeof resolveAllTargeting>>,
  options: {
    existingLocations: Array<{ id: string; name: string; type: string; country: string }>;
    maxCopyVariations: number;
    platform: "meta" | "tiktok" | null;
    objective: AdSyncObjective | null;
  },
): ResolvedStrategy {
  const normalizedInterests = normalize(resolved.resolvedInterests);
  const normalizedBehaviors = normalize(resolved.resolvedBehaviors);
  const normalizedLifeEvents = normalize(resolved.resolvedLifeEvents);
  const normalizedWorkPositions = normalize(resolved.resolvedWorkPositions);
  const normalizedIndustries = normalize(resolved.resolvedIndustries);

  // Deduplicate valid locations
  const validLocations = resolved.resolvedLocations.filter(Boolean) as NonNullable<
    (typeof resolved.resolvedLocations)[number]
  >[];
  const uniqueValidLocations = Array.from(
    new Map(validLocations.map((l) => [l.id, l])).values(),
  );

  const finalLocations =
    options.existingLocations.length > 0
      ? options.existingLocations
      : uniqueValidLocations.length > 0
        ? uniqueValidLocations
        : [NIGERIA_DEFAULT];

  // Slice copy variations by tier limit
  const allHeadlines: string[] = (result.headline || []).slice(
    0,
    options.maxCopyVariations,
  );
  const allCopies: string[] = (result.copy || []).slice(
    0,
    options.maxCopyVariations,
  );
  const variations: CopyVariation[] = allHeadlines.map(
    (h: string, i: number) => ({
      headline: h,
      primary: allCopies[i] || allCopies[0] || "",
    }),
  );
  const primaryCopy = variations[0] ?? { headline: "", primary: "" };

  // CTA mapping
  const ctaFromIntent = mapIntentToCTA(
    result.ctaIntent || "buy_now",
    options.platform,
    options.objective,
  );
  const whatsappMsg =
    result.whatsappMessage ||
    (ctaFromIntent.code === "SEND_MESSAGE"
      ? generateWhatsAppMessage({
          headline: primaryCopy.headline,
          locations: finalLocations,
        })
      : undefined);

  return {
    normalizedInterests,
    normalizedBehaviors,
    normalizedLifeEvents,
    normalizedWorkPositions,
    normalizedIndustries,
    finalLocations,
    variations,
    primaryCopy,
    ctaData: {
      intent: (result.ctaIntent || "buy_now") as CTAIntent,
      platformCode: ctaFromIntent.code,
      displayLabel: ctaFromIntent.label,
      whatsappMessage: whatsappMsg,
    },
  };
}

// ─── Apply Copy Result (shared by refinement + TYPE_D) ───────────────────────

export function applyCopyResult(
  result: AIStrategyResult,
  options: {
    maxCopyVariations: number;
    platform: "meta" | "tiktok" | null;
    objective: AdSyncObjective | null;
    locations: Array<{ id: string; name: string; type: string; country: string }>;
  },
): {
  variations: CopyVariation[];
  primaryCopy: CopyVariation;
  ctaData: CTAData;
} {
  const allHeadlines: string[] = (result.headline || []).slice(
    0,
    options.maxCopyVariations,
  );
  const allCopies: string[] = (result.copy || []).slice(
    0,
    options.maxCopyVariations,
  );
  const variations: CopyVariation[] = allHeadlines.map(
    (h: string, i: number) => ({
      headline: h,
      primary: allCopies[i] || allCopies[0] || "",
    }),
  );
  const primaryCopy = variations[0] ?? { headline: "", primary: "" };

  const ctaFromIntent = mapIntentToCTA(
    result.ctaIntent || "buy_now",
    options.platform,
    options.objective,
  );
  const whatsappMsg =
    result.whatsappMessage ||
    (ctaFromIntent.code === "SEND_MESSAGE"
      ? generateWhatsAppMessage({
          headline: primaryCopy.headline,
          locations: options.locations,
        })
      : undefined);

  return {
    variations,
    primaryCopy,
    ctaData: {
      intent: (result.ctaIntent || "buy_now") as CTAIntent,
      platformCode: ctaFromIntent.code,
      displayLabel: ctaFromIntent.label,
      whatsappMessage: whatsappMsg,
    },
  };
}

// ─── Phase 1: Location-only Resolution ──────────────────────────────────────

/**
 * Resolves only the location names from an AI result — used in Phase 1 so
 * locations appear before targeting (which resolves in Phase 2).
 */
export async function resolveLocationsOnly(
  locationNames: string[],
  existingLocations: Array<{ id: string; name: string; type: string; country: string }>,
): Promise<Array<{ id: string; name: string; type: string; country: string }>> {
  if (existingLocations.length > 0) return existingLocations;

  const resolved = await Promise.all(
    locationNames.map((name) => resolveLocation(name, metaLocationSearchFn())),
  );

  const valid = resolved.filter(Boolean) as NonNullable<(typeof resolved)[number]>[];
  const unique = Array.from(new Map(valid.map((l) => [l.id, l])).values());
  return unique.length > 0 ? unique : [NIGERIA_DEFAULT];
}

// ─── Phase 2: Background Targeting Resolution ────────────────────────────────

export interface Phase2ResolvedItem {
  id: string;
  name: string;
  resolved: boolean;
}

export interface Phase2Result {
  interests: Phase2ResolvedItem[];
  behaviors: Phase2ResolvedItem[];
  lifeEvents: Phase2ResolvedItem[];
  workPositions: Phase2ResolvedItem[];
  industries: Phase2ResolvedItem[];
}

export interface Phase2Params {
  interestNames: string[];
  behaviorNames: string[];
  lifeEventNames: string[];
  workPositionNames: string[];
  industryNames: string[];
  adCopy: string;
  ctaIntent: string;
  businessType: string;
}

/**
 * Fire-and-forget Phase 2 targeting resolution.
 *
 * Sends AI-generated search keywords + ad copy context to the server-side
 * resolve-targeting endpoint, which searches Meta API for real candidates and
 * uses gpt-5.4-nano to pick the best match for each keyword.
 *
 * Does NOT return a Promise — callers should not await this. Results are
 * delivered via the onComplete/onError callbacks.
 */
export function runPhase2Targeting(
  params: Phase2Params,
  onComplete: (result: Phase2Result) => void,
  onError: () => void,
): void {
  fetch("/api/meta/resolve-targeting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adCopy: params.adCopy,
      ctaIntent: params.ctaIntent,
      businessType: params.businessType,
      interests: params.interestNames,
      behaviors: params.behaviorNames,
      lifeEvents: params.lifeEventNames,
      workPositions: params.workPositionNames,
      industries: params.industryNames,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`resolve-targeting failed: ${res.status}`);
      return res.json();
    })
    .then((data: Phase2Result) => {
      onComplete(data);
    })
    .catch((err) => {
      console.error("[Phase2] Targeting resolution failed:", err?.message);
      onError();
    });
}
