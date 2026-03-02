// src/lib/ai/preprocessor.ts
// Does NOT handle location (targeting-resolver), numeric normalization (audience-chat-step)

export type LocalInputType = "TIER1_TYPE_B" | "TIER1_TYPE_E" | "TIER2_AI";

export interface LocalClassification {
  localType: LocalInputType;
  preInferred?: {
    gender: "female" | "male" | "all";
    priceTier: "low" | "mid" | "high";
    businessType:
      | "fashion"
      | "beauty"
      | "food"
      | "electronics"
      | "events"
      | "b2b"
      | "general";
    lifeSignals: string; // e.g. "wedding,job" — passed as <life> XML tag to model
  };
}

// ─── Keyword patterns ─────────────────────────────────────────────────────────
const FEMALE_KW =
  /female|women|ladies|gown|wig|skincare|lace|makeup|boutique|braid|feminine/i;
const MALE_KW = /\bmen\b|male|shirts|agbada|senator/i;
const PREMIUM_KW =
  /luxury|premium|high\.end|exclusive|e get class|e fine well well/i;
const BUDGET_KW = /affordable|cheap|budget|e no cost/i;

const FASHION_KW =
  /boutique|clothing|bag|gown|dress|ankara|aso\.?ebi|agbada|thrift|shoe|fashion/i;
const BEAUTY_KW =
  /wig|hair extension|natural hair|hair care|skincare|serum|glow|cream|makeup|cosmetics|lash|nail|braid/i;
const FOOD_KW =
  /food|cake|shawarma|buka|catering|restaurant|chef|delivery|pastry|small chops/i;
const EVENTS_KW =
  /wedding|event plan|birthday|owambe|aso\.?oke|decorator|mc\b|dj\b/i;
const B2B_KW =
  /consulting|agency|coaching|logistics|printing|branding|photographer|videographer/i;

// Life event signals — fed into <life> XML tag for model to confirm/expand
// ⚠️ Not exhaustive — model scans for additional nuanced signals (e.g. "graduation agbada")
const LIFE_SIGNAL_MAP: [RegExp, string][] = [
  [/wedding gown|bridal|bride|introduction|engagement|asoebi/i, "wedding"],
  [/baby|maternity|pregnant|naming ceremony|push present/i, "baby"],
  [/home furniture|interior design|housewarming|new apartment/i, "home"],
  [
    /corporate wear|suit|office wear|nysc|corper|send\.forth|graduation/i,
    "job",
  ],
  [/honeymoon|newlywed|couple gift/i, "marriage"],
];

// TIER 1: zero-ambiguity patterns — no API call ever needed
const TIER1_CONFIRM =
  /^(thanks|okay|ok|perfect|looks good|yes|no|done|great|got it)[.!?]?$/i;
const TIER1_BARE_ADV =
  /^(I want to advertise|I want to run ads|advertise my business|run ads)\.?$/i;

// ─── Main export ──────────────────────────────────────────────────────────────
export function classifyLocally(raw: string): LocalClassification {
  const trimmed = raw.trim();

  // TIER 1: catch before any API cost
  if (TIER1_CONFIRM.test(trimmed)) return { localType: "TIER1_TYPE_E" };
  if (TIER1_BARE_ADV.test(trimmed) || trimmed.split(/\s+/).length === 1) {
    return { localType: "TIER1_TYPE_B" };
  }

  // TIER 2: needs API — pre-infer to save model tokens
  const lower = trimmed.toLowerCase();

  const gender: NonNullable<LocalClassification["preInferred"]>["gender"] =
    FEMALE_KW.test(lower) && !MALE_KW.test(lower)
      ? "female"
      : MALE_KW.test(lower) && !FEMALE_KW.test(lower)
        ? "male"
        : "all";

  const priceTier: NonNullable<
    LocalClassification["preInferred"]
  >["priceTier"] = PREMIUM_KW.test(lower)
    ? "high"
    : BUDGET_KW.test(lower)
      ? "low"
      : "mid";

  const businessType: NonNullable<
    LocalClassification["preInferred"]
  >["businessType"] = FOOD_KW.test(lower)
    ? "food"
    : BEAUTY_KW.test(lower)
      ? "beauty"
      : FASHION_KW.test(lower)
        ? "fashion"
        : EVENTS_KW.test(lower)
          ? "events"
          : B2B_KW.test(lower)
            ? "b2b"
            : "general";

  // Collect life signals — model confirms/expands these
  const lifeSignals = LIFE_SIGNAL_MAP.filter(([pattern]) => pattern.test(lower))
    .map(([, signal]) => signal)
    .join(",");

  return {
    localType: "TIER2_AI",
    preInferred: { gender, priceTier, businessType, lifeSignals },
  };
}
