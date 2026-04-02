// src/lib/ai/preprocessor.ts
// Responsibilities: catch zero-value trivial inputs only.
// Classification, slot extraction, and intent routing are owned by gpt-5-mini in service.ts.

export type LocalInputType = "TIER1_TYPE_E" | "TIER2_AI";

export interface LocalClassification {
  localType: LocalInputType;
}

// ─── Trivial confirmation patterns ──────────────────────────────────────────

// English confirmations (fixed: no leading spaces in alternation group)
const TIER1_CONFIRM =
  /^(thanks|thank you|okay|ok|perfect|looks good|yes|no|done|great|got it|are you done|is it ready|nice|awesome|yep|yup|nope|nah|that works|sounds good|all good|sure|cool|alright|fine|understood)[.!?]*$/i;

// Pidgin / Yoruba / Nigerian English confirmations
const TIER1_PIDGIN =
  /^(oya|sharp|correct|e don do|no wahala|e good|ehen|na so|dey go|sabi|shey|abi|wetin|joor|abeg|walahi|o dabo|dalu|e kaaro|oshey)[.!?]*$/i;

// Pure emoji messages (1-5 emoji characters, no text)
const EMOJI_ONLY = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]{1,5}$/u;

// Repeated single words: "ok ok", "yes yes yes"
const REPEATED_WORD = /^(\w+)(\s+\1){1,4}[.!?]*$/i;

export function classifyLocally(raw: string): LocalClassification {
  const trimmed = raw.trim();

  // Guard: empty input
  if (!trimmed) return { localType: "TIER1_TYPE_E" };

  // Trivial confirmations — no semantic value, no API needed
  if (TIER1_CONFIRM.test(trimmed)) return { localType: "TIER1_TYPE_E" };

  // Pidgin/Yoruba confirmations — same zero-value category
  if (TIER1_PIDGIN.test(trimmed)) return { localType: "TIER1_TYPE_E" };

  // Pure emoji (👍, 🔥, 💯)
  if (EMOJI_ONLY.test(trimmed)) return { localType: "TIER1_TYPE_E" };

  // Repeated words ("ok ok ok")
  if (REPEATED_WORD.test(trimmed)) return { localType: "TIER1_TYPE_E" };

  // Strip trailing emojis and recheck confirmation patterns
  // Handles "ok 👍", "great 🔥", "perfect 💯"
  const withoutTrailingEmoji = trimmed
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+$/u, "")
    .trim();
  if (
    withoutTrailingEmoji &&
    withoutTrailingEmoji !== trimmed &&
    (TIER1_CONFIRM.test(withoutTrailingEmoji) ||
      TIER1_PIDGIN.test(withoutTrailingEmoji))
  ) {
    return { localType: "TIER1_TYPE_E" };
  }

  // Everything else goes to gpt-5-mini for proper classification
  return { localType: "TIER2_AI" };
}
