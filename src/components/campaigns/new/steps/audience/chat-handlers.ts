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
  resolveLocation,
  normalizeLocationName,
  NIGERIA_DEFAULT,
} from "@/lib/utils/targeting-resolver";

import {
  mapIntentToCTA,
  generateWhatsAppMessage,
} from "@/lib/constants/cta-options";

// ─── Meta Search Helpers ─────────────────────────────────────────────────────

function metaLocationSearchFn() {
  return async (query: string, type: string, countryCode?: string) => {
    let url = `/api/meta/search-location?query=${encodeURIComponent(query)}&type=${type}`;
    if (countryCode) url += `&country_code=${countryCode}`;
    const r = await fetch(url);
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

// ─── Apply Copy Result ───────────────────────────────────────────────────────

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
  targetingMode?: string;
  locations?: string[];
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
      targetingMode: params.targetingMode,
      locations: params.locations,
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
