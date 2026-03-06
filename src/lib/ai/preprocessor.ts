// src/lib/ai/preprocessor.ts
// Responsibilities: catch zero-value trivial inputs only.
// Classification, slot extraction, and intent routing are owned by gpt-5-mini in service.ts.

export type LocalInputType = "TIER1_TYPE_E" | "TIER2_AI";

export interface LocalClassification {
  localType: LocalInputType;
}

// Only pattern worth catching locally — pure confirmations with zero semantic value.
// These never need an API call. Saves cost at scale.
const TIER1_CONFIRM =
  /^(thanks|okay|ok|perfect|looks good|yes|no|done|great|got it| are you done| is it ready| nice| awesome)[.!?]?$/i;

export function classifyLocally(raw: string): LocalClassification {
  const trimmed = raw.trim();

  // Guard: empty input
  if (!trimmed) return { localType: "TIER1_TYPE_E" };

  // Trivial confirmations — no semantic value, no API needed
  if (TIER1_CONFIRM.test(trimmed)) return { localType: "TIER1_TYPE_E" };

  // Everything else goes to gpt-5-mini for proper classification
  return { localType: "TIER2_AI" };
}
