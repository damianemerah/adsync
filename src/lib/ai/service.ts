import OpenAI from "openai";
import { AIInput, AIStrategyResult } from "./types";
import { createClient } from "@/lib/supabase/server";
import { TIER_CONFIG, TierId } from "@/lib/constants";
import { resolveTier } from "@/lib/tier";
import { TRIAGE_INSTRUCTION } from "./prompts";
import { OBJECTIVE_INTENT_MAP } from "@/lib/constants";
import { buildScopedBehaviorCatalogPrompt } from "@/lib/constants/meta-behaviors";
import { buildScopedLifeEventCatalogPrompt } from "@/lib/constants/meta-life-events";

// ─── Minimal System Instruction ──────────────────────────────────────────────
const NG_PERSONA = `You are an expert Nigerian ad copywriter and marketing strategist.`;
const GLOBAL_PERSONA = `You are an expert global ad copywriter and marketing strategist.`;

function buildBaseInstruction(
  orgCountryCode?: string,
  businessContext?: { category?: string },
): string {
  const persona =
    !orgCountryCode || orgCountryCode === "NG" ? NG_PERSONA : GLOBAL_PERSONA;

  const category = businessContext?.category;

  return `${persona} Use your available skills to determine the best strategy and generate high-converting ad copy. Structure your response according to the provided JSON schema.

When a <site> tag is present, use it to ground the copy in the business's real product language, pricing, and brand voice — extract specifics (product names, prices, key benefits) and prefer them over generic phrasing.

When a <gaps> tag is present, it lists context slots the user hasn't specified yet (e.g. "location,price_tier"). Use the FIRST listed slot as your meta.refinement_question — ask it naturally after your plain_english_summary.

INTERESTS — generate 5–8 interest names (1–3 words each, Meta-style).
Avoid brand names, country names, and suffixes like "lovers" or "enthusiasts".
Prefer Nigeria-relevant terms when they fit the business. Examples:
"Fashion", "Hair care", "Clothing", "Online shopping", "Small business",
"Cooking", "Technology", "Beauty", "Real estate", "Nollywood", "Gospel music",
"Nigerian music", "Entrepreneurship", "Football", "Health", "Skincare",
"Wedding", "Interior design", "Shoes", "Investment".
If none of these fit, use other short valid Meta interest names (1–3 words).

BEHAVIORS — you MUST output ONLY names from this exact list (2–5, never invent new names):
${buildScopedBehaviorCatalogPrompt(category)}

LIFE EVENTS — output ONLY names from this exact list (0–2), or an empty array [] if none clearly apply:
${buildScopedLifeEventCatalogPrompt(category)}

Outputting any behavior or life event name NOT in the above lists is a critical error.

WORK POSITIONS — 0–3 job titles, only if the product clearly targets a professional demographic (B2B, professional services, luxury goods, health products for practitioners, etc.). Output [] if not applicable.
Use short, widely-held job titles Meta recognizes. Examples: "CEO", "Manager", "Doctor", "Nurse", "Engineer", "Entrepreneur", "Teacher", "Accountant", "Business owner", "Sales representative".
Avoid vague titles like "Worker" or "Employee". Output as: "workPositions": ["title1", "title2"].

INDUSTRIES — 0–2 broad industry sectors, only if targeting B2B, wholesale, or professional equipment buyers. Use when you need a wider B2B net than exact job titles can provide. Output [] for consumer/B2C products.
Examples: "Management", "Healthcare and Medical Services", "Retail", "Finance", "Construction", "Education". Output as: "industries": ["sector1", "sector2"].

`;
}

// ─── Full Strategy JSON Schema ────────────────────────────────────────────────
const AI_STRATEGY_SCHEMA = {
  type: "object" as const,
  properties: {
    plain_english_summary: { type: "string" as const },
    interests: { type: "array" as const, items: { type: "string" as const } },
    behaviors: { type: "array" as const, items: { type: "string" as const } },
    lifeEvents: { type: "array" as const, items: { type: "string" as const } },
    workPositions: { type: "array" as const, items: { type: "string" as const } },
    industries: { type: "array" as const, items: { type: "string" as const } },
    demographics: {
      type: "object" as const,
      properties: {
        age_min: { type: "number" as const },
        age_max: { type: "number" as const },
        gender: { type: "string" as const, enum: ["all", "male", "female"] },
      },
      required: ["age_min", "age_max", "gender"] as const,
      additionalProperties: false,
    },
    suggestedLocations: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    geo_strategy: {
      anyOf: [
        {
          type: "object" as const,
          properties: {
            type: {
              type: "string" as const,
              enum: ["broad", "cities"] as const,
            },
          },
          required: ["type"] as const,
          additionalProperties: false,
        },
        { type: "null" as const },
      ],
    },
    estimatedReach: { type: "number" as const },
    copy: { type: "array" as const, items: { type: "string" as const } },
    headline: { type: "array" as const, items: { type: "string" as const } },
    ctaIntent: {
      type: "string" as const,
      enum: [
        "start_whatsapp_chat",
        "buy_now",
        "learn_more",
        "book_appointment",
        "get_quote",
        "sign_up",
        "download",
      ],
    },
    whatsappMessage: { type: ["string", "null"] as const },
    suggestedLeadForm: {
      anyOf: [
        {
          type: "object" as const,
          properties: {
            fields: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  type: { type: "string" as const },
                  label: { type: ["string", "null"] as const },
                  choices: {
                    anyOf: [
                      {
                        type: "array" as const,
                        items: { type: "string" as const },
                      },
                      { type: "null" as const },
                    ],
                  },
                },
                required: ["type", "label", "choices"] as const,
                additionalProperties: false,
              },
            },
            thankYouMessage: { type: "string" as const },
          },
          required: ["fields", "thankYouMessage"] as const,
          additionalProperties: false,
        },
        { type: "null" as const },
      ],
    },
    meta: {
      type: "object" as const,
      properties: {
        input_type: {
          type: "string" as const,
          enum: [
            "TYPE_A",
            "TYPE_B",
            "TYPE_C",
            "TYPE_D",
            "TYPE_E",
            "TYPE_F",
            "TYPE_G",
          ],
        },
        needs_clarification: { type: "boolean" as const },
        clarification_question: { type: ["string", "null"] as const },
        clarification_options: {
          anyOf: [
            { type: "array" as const, items: { type: "string" as const } },
            { type: "null" as const },
          ],
        },
        is_question: { type: "boolean" as const },
        question_answer: { type: ["string", "null"] as const },
        price_signal: {
          type: "string" as const,
          enum: ["low", "mid", "high", "unknown"],
        },
        detected_business_type: {
          type: "string" as const,
          enum: [
            "fashion",
            "beauty",
            "food",
            "electronics",
            "events",
            "b2b",
            "general",
            "unknown",
          ],
        },
        confidence: { type: "number" as const },
        inferred_assumptions: {
          type: "array" as const,
          items: { type: "string" as const },
        },
        refinement_question: { type: ["string", "null"] as const },
      },
      required: [
        "input_type",
        "needs_clarification",
        "clarification_question",
        "clarification_options",
        "is_question",
        "question_answer",
        "price_signal",
        "detected_business_type",
        "confidence",
        "inferred_assumptions",
        "refinement_question",
      ] as const,
      additionalProperties: false,
    },
  },
  required: [
    "plain_english_summary",
    "interests",
    "behaviors",
    "lifeEvents",
    "workPositions",
    "industries",
    "demographics",
    "suggestedLocations",
    "geo_strategy",
    "estimatedReach",
    "copy",
    "headline",
    "ctaIntent",
    "whatsappMessage",
    "suggestedLeadForm",
    "meta",
  ] as const,
  additionalProperties: false,
};

// ─── OpenAI Client ────────────────────────────────────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
  timeout: 30000,
  maxRetries: 1,
});

// ─── Skill IDs ────────────────────────────────────────────────────────────────
// Exported so ai-images.ts can reference imageCreative without duplication.
export const SKILL_IDS = {
  coreStrategy: process.env.SKILL_ID_CORE_STRATEGY_NG!,
  copyVerticals: process.env.SKILL_ID_COPY_VERTICALS_NG!, // merged: fashion/beauty/food/services/b2b/general
  copyElectronics: process.env.SKILL_ID_COPY_ELECTRONICS_NG!,
  copyEvents: process.env.SKILL_ID_COPY_EVENTS_NG!,
  policyGuard: process.env.SKILL_ID_POLICY_GUARD_NG!,
  lifeEvents: process.env.SKILL_ID_LIFE_EVENTS_NG!,
  imageCreative: process.env.SKILL_ID_IMAGE_CREATIVE_NG!,
};

// Business types that require Meta policy compliance checking.
// policyGuard is skipped for 85%+ of calls (food, fashion, beauty) — saves ~500 tokens/call.
const REGULATED_TYPES = new Set([
  "finance",
  "health",
  "betting",
  "supplements",
  "insurance",
  "crypto",
  "forex",
]);

function buildSkillList(
  businessType?: string,
  needsLifeEvents?: boolean,
): any[] {
  const type = businessType ?? "general";

  // electronics and events have dedicated skills; everything else uses copy-verticals-ng
  const verticalSkillId =
    type === "electronics"
      ? SKILL_IDS.copyElectronics
      : type === "events"
        ? SKILL_IDS.copyEvents
        : SKILL_IDS.copyVerticals;

  const skills = [
    { type: "skill_reference", skill_id: SKILL_IDS.coreStrategy },
    { type: "skill_reference", skill_id: verticalSkillId },
  ];

  // Policy guard only for regulated categories
  if (REGULATED_TYPES.has(type)) {
    skills.push({ type: "skill_reference", skill_id: SKILL_IDS.policyGuard });
  }

  if (needsLifeEvents) {
    skills.push({ type: "skill_reference", skill_id: SKILL_IDS.lifeEvents });
  }

  return skills;
}

// ─── Objective-Copy Coherence Gate ───────────────────────────────────────────
// Validates that ctaIntent is compatible with the campaign objective.
// Derived from OBJECTIVE_INTENT_MAP.ctaBias so they stay in sync.
// Silently corrects mismatches — zero API tokens.

// Maps each ctaBias value → the set of AI ctaIntent strings that are coherent with it.
// "shop_now" in ctaBias maps to "buy_now" in the AI schema (they're the same intent).
const CTA_BIAS_COMPATIBLE: Record<string, string[]> = {
  start_whatsapp_chat: ["start_whatsapp_chat", "get_quote", "book_appointment", "learn_more"],
  buy_now:             ["buy_now", "start_whatsapp_chat", "get_quote", "book_appointment"],
  shop_now:            ["buy_now", "start_whatsapp_chat", "get_quote", "book_appointment"],
  learn_more:          ["learn_more", "start_whatsapp_chat", "sign_up"],
  sign_up:             ["sign_up", "start_whatsapp_chat", "get_quote", "book_appointment", "learn_more"],
  download:            ["download", "sign_up"],
};

// Build the whitelist once at startup from OBJECTIVE_INTENT_MAP
const OBJECTIVE_CTA_WHITELIST: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [objective, config] of Object.entries(OBJECTIVE_INTENT_MAP)) {
    const bias = config.ctaBias;
    map[objective] = CTA_BIAS_COMPATIBLE[bias] ?? [bias];
  }
  // Aliases and variants not in OBJECTIVE_INTENT_MAP
  map["lead_gen"] = map["leads"];
  map["conversions"] = map["sales"];
  map["reach"] = ["learn_more", "start_whatsapp_chat"];
  map["app_installs"] = map["app_promotion"];
  return map;
})();

function applyObjectiveCopyCoherence(
  result: AIStrategyResult,
  objective?: string,
): AIStrategyResult {
  if (!objective) return result;
  const objKey = objective.toLowerCase().replace(/\s+/g, "_");
  const allowed = OBJECTIVE_CTA_WHITELIST[objKey];
  if (!allowed || allowed.includes(result.ctaIntent)) return result;

  // Use the first item in the allowed list as the corrected CTA
  const corrected = allowed[0] as AIStrategyResult["ctaIntent"];
  console.log(
    `⚠️ [Coherence Gate] CTA mismatch: objective="${objective}" ctaIntent="${result.ctaIntent}" → corrected to "${corrected}"`,
  );
  return {
    ...result,
    ctaIntent: corrected,
    whatsappMessage: corrected === "start_whatsapp_chat" ? result.whatsappMessage : null,
  };
}

// ─── Interest Normalization ───────────────────────────────────────────────────
// Strips non-Meta patterns the AI sometimes produces despite prompt guardrails.
// Runs post-generation, zero API tokens.
const INTEREST_BAD_SUFFIX =
  /\s+(lovers?|enthusiasts?|buyers?|users?|fans?|people|community|groups?)$/i;
const INTEREST_COUNTRY_PREFIX =
  /^(nigerian|lagos|abuja|kano|accra|kenyan|ghanaian|african)\s+/i;
const INTEREST_DESCRIPTOR_PREFIX =
  /^(affordable|cheap|premium|luxury|quality|best|top|local|authentic)\s+/i;

function normalizeInterests(interests: string[]): string[] {
  const seen = new Set<string>();
  return interests
    .map((raw) => {
      let s = raw.trim();
      s = s.replace(INTEREST_BAD_SUFFIX, "");
      s = s.replace(INTEREST_COUNTRY_PREFIX, "");
      s = s.replace(INTEREST_DESCRIPTOR_PREFIX, "");
      s = s.charAt(0).toUpperCase() + s.slice(1).trim();
      return s;
    })
    .filter((s) => {
      if (s.length < 3 || s.length > 50) return false;
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ─── Build User Message ───────────────────────────────────────────────────────
// Injects onboarding org context into <ctx> so Skills skip re-inference entirely.
// This alone reduces reasoning tokens by ~100-200 per call for known verticals.
function buildUserMessage(
  input: AIInput,
  extracted?: TriageResult["extracted"],
  missingSlots?: string[],
): string {
  const lines: string[] = [`<biz>${input.businessDescription}</biz>`];
  const ctxParts: string[] = [];

  if (extracted) {
    // Local preprocessor already ran — use its output directly
    ctxParts.push(`gender:${extracted.gender}`);
    ctxParts.push(`tier:${extracted.priceTier}`);
    ctxParts.push(`type:${extracted.businessType}`);
    if (extracted.lifeSignals) {
      lines.push(`<life>${extracted.lifeSignals}</life>`);
    }
  } else {
    // Inject org onboarding data so Skills skip their inference tables.
    // Previously these were fetched from DB but thrown away here — now they're used.
    if (input.customerGender && input.customerGender !== "both") {
      ctxParts.push(`gender:${input.customerGender}`);
    }
    if (input.priceTier) ctxParts.push(`tier:${input.priceTier}`);
    if (input.industry) {
      const industryMap: Record<string, string> = {
        "E-commerce (Fashion/Beauty)": "fashion",
        "Food & Beverage": "food",
        "Beauty & Cosmetics": "beauty",
        Electronics: "electronics",
        Events: "events",
        "B2B / Services": "b2b",
      };
      const mapped = industryMap[input.industry];
      if (mapped) ctxParts.push(`type:${mapped}`);
    }
  }

  if (ctxParts.length > 0) {
    lines.push(`<ctx>${ctxParts.join(" | ")}</ctx>`);
  }

  if (input.location) lines.push(`<loc>${input.location}</loc>`);
  if (input.sellingMethod) lines.push(`<del>${input.sellingMethod}</del>`);
  if (input.objective) lines.push(`<obj>${input.objective}</obj>`);

  if (input.siteContext) {
    lines.push(`<site>${input.siteContext}</site>`);
  }

  if (input.currentCopy) {
    lines.push(
      `<refine>h:"${input.currentCopy.headline}" b:"${input.currentCopy.primary}"</refine>`,
    );
  }

  // Hint at unfilled slots so the AI targets the right refinement_question
  if (missingSlots && missingSlots.length > 0) {
    lines.push(`<gaps>${missingSlots.join(",")}</gaps>`);
  }

  return lines.filter(Boolean).join("\n");
}

// ─── Two-model Triage ─────────────────────────────────────────────────────────
// Cheap gpt-5-mini pre-check before expensive gpt-5.2+Skills call.
// TYPE_B/C/E inputs never touch the Skills API — saves ~3,500 tokens each.
const TRIAGE_SCHEMA = {
  type: "object" as const,
  properties: {
    input_type: {
      type: "string" as const,
      enum: ["TYPE_A", "TYPE_B", "TYPE_C", "TYPE_D", "TYPE_E", "TYPE_G"] as const,
    },
    needs_full_generation: { type: "boolean" as const },
    is_refinement: { type: "boolean" as const },
    unlock_question: { type: ["string", "null"] as const },
    direct_answer: { type: ["string", "null"] as const },
    proposed_plan: { type: ["string", "null"] as const },
    needs_confirmation: { type: "boolean" as const },
    extracted: {
      type: "object" as const,
      properties: {
        gender: {
          type: "string" as const,
          enum: ["male", "female", "all"] as const,
        },
        priceTier: {
          type: "string" as const,
          enum: ["low", "mid", "high", "unknown"] as const,
        },
        businessType: {
          type: "string" as const,
          enum: [
            "fashion",
            "beauty",
            "food",
            "electronics",
            "events",
            "b2b",
            "general",
            "unknown",
          ] as const,
        },
        lifeSignals: { type: "string" as const }, // comma-separated e.g. "wedding,job"
      },
      required: ["gender", "priceTier", "businessType", "lifeSignals"] as const,
      additionalProperties: false,
    },
    completeness_score: { type: "number" as const }, // 0–5
    missing_slots: { type: "array" as const, items: { type: "string" as const } },
  },
  required: [
    "input_type",
    "needs_full_generation",
    "is_refinement",
    "unlock_question",
    "direct_answer",
    "proposed_plan",
    "needs_confirmation",
    "extracted",
    "completeness_score",
    "missing_slots",
  ] as const,
  additionalProperties: false,
};

// Condensed conversation history for triage context window.
// Only role + content — no internal message metadata needed.
export interface TriageMessage {
  role: "user" | "ai";
  content: string;
}

export interface TriageResult {
  input_type: string;
  needs_full_generation: boolean;
  is_refinement: boolean;
  unlock_question?: string | null;
  direct_answer?: string | null;
  proposed_plan?: string | null;
  needs_confirmation?: boolean;
  extracted: {
    gender: "male" | "female" | "all";
    priceTier: "low" | "mid" | "high" | "unknown";
    businessType:
      | "fashion"
      | "beauty"
      | "food"
      | "electronics"
      | "events"
      | "b2b"
      | "general"
      | "unknown";
    lifeSignals: string;
  };
  /** 0–5: how many context slots are filled (product, location, audience, price, selling method) */
  completeness_score: number;
  /** Names of unfilled slots, e.g. ["location", "price_tier"] */
  missing_slots: string[];
}

async function triageInput(
  description: string,
  objective: string,
  conversationHistory: TriageMessage[] = [],
  orgContext?: string,
): Promise<TriageResult> {
  // Build a compact history string for the triage model.
  // Limit to last 6 messages to keep triage token cost low.
  const recentHistory = conversationHistory.slice(-6);
  const historyText =
    recentHistory.length > 0
      ? recentHistory
          .map((m) => `${m.role.toUpperCase()}: ${m.content.substring(0, 200)}`)
          .join("\n")
      : "No prior history.";

  const orgContextBlock = orgContext
    ? `\n\n== ORG CONTEXT (from profile) ==\n${orgContext}`
    : "";

  const triageInput = `== CONVERSATION HISTORY ==\n${historyText}\n\n== LATEST USER MESSAGE ==\n${description}\n\n== CAMPAIGN OBJECTIVE ==\n${objective}${orgContextBlock}`;

  const response = await (openai.responses.create as any)({
    model: "gpt-5-mini",
    instructions: TRIAGE_INSTRUCTION,
    input: triageInput,
    text: {
      format: {
        type: "json_schema",
        name: "triage_result",
        schema: TRIAGE_SCHEMA,
      },
    },
  });

  return JSON.parse(response.output_text) as TriageResult;
}

// ─── Full Strategy Generator ──────────────────────────────────────────────────
async function generateWithOpenAI(
  input: AIInput,
  tierAi: (typeof TIER_CONFIG)[TierId]["ai"],
  extracted?: TriageResult["extracted"],
  missingSlots?: string[],
): Promise<AIStrategyResult> {
  const useSkills = tierAi.useSkills;
  console.log("\n====================================");
  console.log("🚀 [OpenAI Service] generateWithOpenAI called");
  console.log(
    `   - Business: ${input.businessDescription.substring(0, 50)}...`,
  );
  console.log(`   - Target: ${input.customerGender} in ${input.location}`);
  console.log(`   - Model: ${tierAi.strategyModel} | Skills: ${useSkills}`);

  const response = await (openai.responses.create as any)({
    model: tierAi.strategyModel,
    instructions: buildBaseInstruction(input.orgCountryCode, {
      category: extracted?.businessType,
    }),
    input: buildUserMessage(input, extracted, missingSlots),
    ...(useSkills
      ? {
          tools: [
            {
              type: "shell",
              environment: {
                type: "container_auto",
                skills: buildSkillList(
                  extracted?.businessType,
                  !!(
                    extracted?.lifeSignals?.trim() &&
                    extracted.lifeSignals !== "none"
                  ),
                ),
              },
            },
          ],
        }
      : {}),
    text: {
      format: {
        type: "json_schema",
        name: "ai_strategy_result",
        schema: AI_STRATEGY_SCHEMA,
      },
    },
  });

  console.log("✅ [OpenAI Service] Raw response object received successfully.");

  const usage = response.usage || {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };

  if (response.output) {
    const outputStr = JSON.stringify(response.output);
    const skillMatches = [
      ...outputStr.matchAll(/\/skills\/([a-zA-Z0-9_-]+)\//g),
    ];
    const skillsUsed = new Set(skillMatches.map((m) => m[1]));
    console.log(
      "🛠️ [OpenAI Service] Skills actively used by AI in this generation:",
    );
    if (skillsUsed.size > 0) {
      skillsUsed.forEach((skill) => console.log(`  - 🎯 ${skill}`));
    } else {
      console.log(
        "  - No explicit skills were called (relied on pre-loaded knowledge)",
      );
    }
  }

  console.log("💎💎💎 USAGE 💎💎💎", usage);
  console.log("====================================\n");

  const outputText = response.output_text;
  if (!outputText) throw new Error("No text response from OpenAI");

  const result = JSON.parse(outputText) as AIStrategyResult;
  return { ...result, usage };
}

// ─── Copy Refinement Schema (slim — copy/headline/whatsapp only) ─────────────
// Refinement never needs to re-generate interests, behaviors, demographics etc.
// Using the full AI_STRATEGY_SCHEMA wastes ~400-600 tokens and splits model attention.
const REFINEMENT_SCHEMA = {
  type: "object" as const,
  properties: {
    copy: { type: "array" as const, items: { type: "string" as const } },
    headline: { type: "array" as const, items: { type: "string" as const } },
    whatsappMessage: { type: ["string", "null"] as const },
  },
  required: ["copy", "headline", "whatsappMessage"] as const,
  additionalProperties: false,
};

const REFINEMENT_INSTRUCTION = `You are a Nigerian ad copy editor. Rewrite only the copy variations and headlines based on the refinement instruction.
Keep the same brand voice, CTA intent, and WhatsApp message format. Return ONLY the updated copy, headline, and whatsappMessage fields.`;

// ─── Copy Refinement (gpt-5-mini, slim schema — no full strategy re-gen) ─────
export async function refineAdCopyWithOpenAI(
  input: AIInput,
  refinementInstruction: string,
): Promise<AIStrategyResult & { usage?: any }> {
  const response = await (openai.responses.create as any)({
    model: "gpt-5-mini",
    instructions: REFINEMENT_INSTRUCTION,
    input: `${buildUserMessage(input)}\n\nRefinement instruction: ${refinementInstruction}`,
    text: {
      format: {
        type: "json_schema",
        name: "refinement_result",
        schema: REFINEMENT_SCHEMA,
      },
    },
  });

  const usage = response.usage || {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  console.log("💎💎💎 USAGE 💎💎💎 refinement", usage);
  console.log("====================================\n");

  const outputText = response.output_text;
  if (!outputText) throw new Error("No response from OpenAI refinement");

  // Merge refined copy fields back onto a minimal valid AIStrategyResult shell.
  // Caller only uses copy/headline/whatsappMessage from refinement responses.
  const refined = JSON.parse(outputText) as {
    copy: string[];
    headline: string[];
    whatsappMessage: string | null;
  };

  return {
    plain_english_summary: "",
    interests: [],
    behaviors: [],
    lifeEvents: [],
    industries: [],
    demographics: { age_min: 18, age_max: 65, gender: "all" },
    suggestedLocations: [],
    geo_strategy: null,
    estimatedReach: 0,
    copy: refined.copy,
    headline: refined.headline,
    ctaIntent: "start_whatsapp_chat" as const,
    whatsappMessage: refined.whatsappMessage,
    suggestedLeadForm: null,
    meta: {
      input_type: "TYPE_D" as const,
      needs_clarification: false,
      clarification_question: null,
      clarification_options: null,
      is_question: false,
      question_answer: null,
      price_signal: "unknown" as const,
      detected_business_type: "unknown" as const,
      confidence: 1,
      inferred_assumptions: [],
      refinement_question: null,
    },
    usage,
  };
}

// ─── Mock Generator (dev fallback) ───────────────────────────────────────────
async function generateMock(input: AIInput): Promise<AIStrategyResult> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return {
    interests: [
      "Small Business",
      "Entrepreneurship",
      "Fashion Accessories",
      "Lagos Life",
    ],
    behaviors: [
      "Engaged Shoppers",
      "Facebook access (mobile): all mobile devices",
    ],
    demographics: { age_min: 25, age_max: 45, gender: "all" },
    suggestedLocations: ["Lagos, Nigeria", "Abuja, Nigeria"],
    geo_strategy: { type: "cities" },
    estimatedReach: 1200000,
    copy: [
      `Stop scrolling! 🛑 The best ${input.businessDescription.substring(0, 10)}... is here. Order now and get fast delivery in Lagos.`,
      "Upgrade your lifestyle with our premium collection. Limited stock available! 🛍️",
    ],
    headline: ["Best Prices in Lagos", "Premium Quality"],
    reasoning:
      "Mock Data: Targeted broad interests in commercial hubs for maximum visibility.",
    ctaIntent: "buy_now" as const,
    plain_english_summary: "Mock campaign targeting Lagos shoppers.",
    lifeEvents: [],
    industries: [],
    whatsappMessage: null,
    suggestedLeadForm: null,
    meta: {
      input_type: "TYPE_A" as const,
      needs_clarification: false,
      clarification_question: null,
      clarification_options: null,
      is_question: false,
      question_answer: null,
      price_signal: "mid" as const,
      detected_business_type: "general" as const,
      confidence: 0.85,
      inferred_assumptions: [],
      refinement_question: null,
    },
  };
}

// ─── Main Export: Resolves tier, runs triage, then generates ──────────────────
export async function generateAndSaveStrategy(
  input: AIInput,
  conversationHistory: TriageMessage[] = [],
  activeOrgId?: string,
): Promise<AIStrategyResult & { usage?: any }> {
  const supabase = await createClient();
  const provider = process.env.AI_PROVIDER!;

  if (provider !== "openai") {
    console.log("Generating mock data...", provider);
    return generateMock(input);
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key missing");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { config: tierConfig } = await resolveTier(supabase, user.id);
  console.log(
    `🎯 [OpenAI Service] Tier resolved — Skills: ${tierConfig.ai.useSkills}`,
  );

  // ── Skip triage for TYPE_G confirmations (user already approved the plan) ──
  if (input.skipTriage) {
    console.log("⚡ [Service] skipTriage=true — bypassing triage, generating directly", input);
    return generateWithOpenAI(input, tierConfig.ai);
  }

  // ── Two-model triage: route cheap cases through gpt-5-mini before Skills ──
  let extractedContext: TriageResult["extracted"] | undefined;
  let triageMissingSlots: string[] | undefined;

  try {
    // Build org context string for triage if profile data is available
    const orgContextParts: string[] = [];
    if (input.orgBusinessDescription) {
      orgContextParts.push(`business_description: ${input.orgBusinessDescription}`);
    }
    if (input.industry) orgContextParts.push(`industry: ${input.industry}`);
    if (input.priceTier) orgContextParts.push(`price_tier: ${input.priceTier}`);
    if (input.customerGender) orgContextParts.push(`customer_gender: ${input.customerGender}`);
    const orgContext = orgContextParts.length > 0 ? orgContextParts.join("\n") : undefined;

    // When the user pasted a URL, augment the triage description with a brief
    // excerpt of the scraped content so triage can classify it correctly.
    // Without this, a bare URL → empty description → TYPE_B (clarification) instead of TYPE_A.
    const triageDescription = input.siteContext
      ? `${input.businessDescription ? input.businessDescription + "\n" : ""}[Website content excerpt]: ${input.siteContext.substring(0, 300)}`
      : input.businessDescription;

    console.log("🔍 [Triage] Description:", triageDescription);

    const triage = await triageInput(
      triageDescription,
      input.objective || "whatsapp",
      conversationHistory,
      orgContext,
    );
    console.log("🔍 [Triage] Result:", triage);

    extractedContext = triage.extracted;
    triageMissingSlots = triage.missing_slots;

    // Non-TYPE_A: respond directly without loading Skills — saves ~3,500 tokens
    if (!triage.needs_full_generation) {
      // TYPE_D — triage confirmed this is a refinement request
      // Route to refineAdCopyWithOpenAI. The API route handles this with
      // refinementInstruction, so return a structured signal the route can act on.
      if (triage.is_refinement) {
        return {
          plain_english_summary: "",
          interests: [],
          behaviors: [],
          lifeEvents: [],
          industries: [],
          demographics: { age_min: 18, age_max: 65, gender: "all" },
          suggestedLocations: [],
          geo_strategy: null,
          estimatedReach: 0,
          copy: [],
          headline: [],
          ctaIntent: "buy_now" as const,
          whatsappMessage: null,
          suggestedLeadForm: null,
          meta: {
            input_type: "TYPE_D" as const,
            needs_clarification: false,
            clarification_question: null,
            clarification_options: null,
            is_question: false,
            question_answer: null,
            price_signal: "unknown" as const,
            detected_business_type: "unknown" as const,
            confidence: 0.9,
            inferred_assumptions: [],
            refinement_question: null,
          },
        };
      }

      // TYPE_G — bare request but org profile has enough context to propose a plan
      if (triage.input_type === "TYPE_G") {
        return {
          plain_english_summary: "",
          interests: [],
          behaviors: [],
          lifeEvents: [],
          industries: [],
          demographics: { age_min: 18, age_max: 65, gender: "all" },
          suggestedLocations: [],
          geo_strategy: null,
          estimatedReach: 0,
          copy: [],
          headline: [],
          ctaIntent: "buy_now" as const,
          whatsappMessage: null,
          suggestedLeadForm: null,
          meta: {
            input_type: "TYPE_G" as const,
            needs_clarification: false,
            needs_confirmation: true,
            proposed_plan: triage.proposed_plan ?? null,
            clarification_question: null,
            clarification_options: null,
            is_question: false,
            question_answer: null,
            price_signal: "unknown" as const,
            detected_business_type: "unknown" as const,
            confidence: 0.7,
            inferred_assumptions: [],
            refinement_question: null,
          },
        };
      }

      // TYPE_B / TYPE_C / TYPE_E — same early-return shape as before
      // Use completeness_score to set a grounded confidence (0.1 – 0.6 range for incomplete inputs)
      const earlyConfidence = Math.max(0.1, (triage.completeness_score ?? 0) / 5 * 0.6);
      return {
        plain_english_summary: "",
        interests: [],
        behaviors: [],
        lifeEvents: [],
        industries: [],
        demographics: { age_min: 18, age_max: 65, gender: "all" },
        suggestedLocations: [],
        geo_strategy: null,
        estimatedReach: 0,
        copy: [],
        headline: [],
        ctaIntent: "buy_now" as const,
        whatsappMessage: null,
        suggestedLeadForm: null,
        meta: {
          input_type: triage.input_type as any,
          needs_clarification: triage.input_type === "TYPE_B",
          clarification_question: triage.unlock_question ?? null,
          clarification_options: null,
          is_question:
            triage.input_type === "TYPE_C" || triage.input_type === "TYPE_E",
          question_answer: triage.direct_answer ?? null,
          price_signal: "unknown" as const,
          detected_business_type: "unknown" as const,
          confidence: earlyConfidence,
          inferred_assumptions: [],
          refinement_question: null,
        },
      };
    }
  } catch (triageErr) {
    // Safe degradation: triage failure falls through to full generation
    console.warn("[Triage] Failed, proceeding with full gen:", triageErr);
  }

  // ── Full generation: gpt-5.2 + Skills ────────────────────────────────────
  const rawResult = await generateWithOpenAI(
    input,
    tierConfig.ai,
    extractedContext,
    triageMissingSlots,
  );

  // Apply post-generation intelligence gates (zero API cost)
  const aiResult = applyObjectiveCopyCoherence(
    { ...rawResult, interests: normalizeInterests(rawResult.interests) },
    input.objective,
  );
  console.log("OpenAI Skills Result: 📋", aiResult);

  let orgIdToSave = activeOrgId;

  if (!orgIdToSave) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user?.id)
      .single();
    if (!member) throw new Error("No organization found");
    orgIdToSave = member.organization_id as string;
  }

  const { error } = await supabase
    .from("targeting_profiles")
    .insert({
      organization_id: orgIdToSave || undefined,
      name: `${input.businessDescription.substring(0, 20)}...`,
      business_description: input.businessDescription,
      product_category: "General",
      ai_reasoning: aiResult.reasoning,
      validated_interests: aiResult.interests,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) console.error("Failed to save targeting profile:", error);
  return aiResult;
}

/**
 * Save AI strategy result as campaign context for creative step use.
 */
export async function saveCampaignContext(
  campaignId: string,
  strategyResult: AIStrategyResult,
  businessDescription: string,
) {
  const supabase = await createClient();

  try {
    const campaignContext = {
      businessDescription,
      targeting: {
        interests: strategyResult.interests,
        behaviors: strategyResult.behaviors,
        locations: strategyResult.suggestedLocations,
        demographics: strategyResult.demographics,
      },
      copy:
        strategyResult.copy && strategyResult.headline
          ? {
              headline: strategyResult.headline[0],
              bodyCopy: strategyResult.copy[0],
            }
          : undefined,
    };

    const { error } = await supabase
      .from("campaigns")
      .update({ ai_context: campaignContext })
      .eq("id", campaignId);

    if (error) {
      console.error("Failed to save campaign context:", error);
      throw error;
    }

    console.log("✅ Saved campaign context for:", campaignId);
    return campaignContext;
  } catch (error) {
    console.error("Error saving campaign context:", error);
    throw error;
  }
}
