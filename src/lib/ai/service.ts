import OpenAI from "openai";
import { AIInput, AIStrategyResult } from "./types";
import { createClient } from "@/lib/supabase/server";
import { TIER_CONFIG, TierId } from "@/lib/constants";
import { resolveTier } from "@/lib/tier";
import { LocalClassification } from "./preprocessor";

// ─── Minimal System Instruction ──────────────────────────────────────────────
const BASE_INSTRUCTION =
  "You are an expert Nigerian ad copywriter and marketing strategist. Use your available skills to determine the best strategy and generate high-converting ad copy. Structure your response according to the provided JSON schema.";

// ─── Full Strategy JSON Schema ────────────────────────────────────────────────
const AI_STRATEGY_SCHEMA = {
  type: "object" as const,
  properties: {
    plain_english_summary: { type: "string" as const },
    interests: { type: "array" as const, items: { type: "string" as const } },
    behaviors: { type: "array" as const, items: { type: "string" as const } },
    lifeEvents: { type: "array" as const, items: { type: "string" as const } },
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
    meta: {
      type: "object" as const,
      properties: {
        input_type: {
          type: "string" as const,
          enum: ["TYPE_A", "TYPE_B", "TYPE_C", "TYPE_D", "TYPE_E", "TYPE_F", "TYPE_G", "TYPE_H"],
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
          enum: ["fashion", "beauty", "food", "electronics", "events", "b2b", "general", "unknown"],
        },
        confidence: { type: "number" as const },
        inferred_assumptions: {
          type: "array" as const,
          items: { type: "string" as const },
        },
        refinement_question: { type: ["string", "null"] as const },
      },
      required: [
        "input_type", "needs_clarification", "clarification_question",
        "clarification_options", "is_question", "question_answer",
        "price_signal", "detected_business_type", "confidence",
        "inferred_assumptions", "refinement_question",
      ] as const,
      additionalProperties: false,
    },
  },
  required: [
    "plain_english_summary", "interests", "behaviors", "lifeEvents",
    "demographics", "suggestedLocations", "estimatedReach", "copy",
    "headline", "ctaIntent", "whatsappMessage", "meta",
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
const SKILL_IDS = {
  coreStrategy: process.env.SKILL_ID_CORE_STRATEGY_NG!,
  fashion: process.env.SKILL_ID_COPY_FASHION_NG!,
  food: process.env.SKILL_ID_COPY_FOOD_NG!,
  beauty: process.env.SKILL_ID_COPY_BEAUTY_NG!,
  services: process.env.SKILL_ID_COPY_SERVICES_NG!,
  policyGuard: process.env.SKILL_ID_POLICY_GUARD_NG!,
  lifeEvents: process.env.SKILL_ID_LIFE_EVENTS_NG!,
};

console.log("SKILL_IDS", SKILL_IDS);

function buildSkillList(businessType?: string, needsLifeEvents?: boolean): any[] {
  const VERTICAL: Record<string, string> = {
    fashion: SKILL_IDS.fashion,
    beauty: SKILL_IDS.beauty,
    food: SKILL_IDS.food,
    events: SKILL_IDS.fashion,
    electronics: SKILL_IDS.services,
    b2b: SKILL_IDS.services,
    general: SKILL_IDS.services,
  };

  const skills = [
    { type: "skill_reference", skill_id: SKILL_IDS.coreStrategy },
    {
      type: "skill_reference",
      skill_id: VERTICAL[businessType ?? "general"] ?? SKILL_IDS.services,
    },
    { type: "skill_reference", skill_id: SKILL_IDS.policyGuard },
  ];

  if (needsLifeEvents) {
    skills.push({ type: "skill_reference", skill_id: SKILL_IDS.lifeEvents });
  }

  return skills;
}

// ─── Build User Message ───────────────────────────────────────────────────────
// Injects onboarding org context into <ctx> so Skills skip re-inference entirely.
// This alone reduces reasoning tokens by ~100-200 per call for known verticals.
function buildUserMessage(
  input: AIInput,
  preInferred?: LocalClassification["preInferred"],
): string {
  const lines: string[] = [`<biz>${input.businessDescription}</biz>`];
  const ctxParts: string[] = [];

  if (preInferred) {
    // Local preprocessor already ran — use its output directly
    ctxParts.push(`gender:${preInferred.gender}`);
    ctxParts.push(`tier:${preInferred.priceTier}`);
    ctxParts.push(`type:${preInferred.businessType}`);
    if (preInferred.lifeSignals) {
      lines.push(`<life>${preInferred.lifeSignals}</life>`);
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
        "Electronics": "electronics",
        "Events": "events",
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
  if (input.objective) lines.push(`<obj>${input.objective}</obj>`);

  if (input.currentCopy) {
    lines.push(
      `<refine>h:"${input.currentCopy.headline}" b:"${input.currentCopy.primary}"</refine>`,
    );
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
      enum: ["TYPE_A", "TYPE_B", "TYPE_C", "TYPE_D", "TYPE_E"] as const,
    },
    needs_full_generation: { type: "boolean" as const },
    unlock_question: { type: ["string", "null"] as const },
    direct_answer: { type: ["string", "null"] as const },
  },
  required: ["input_type", "needs_full_generation"] as const,
  additionalProperties: false,
};

const TRIAGE_INSTRUCTION = `You classify Nigerian ad campaign inputs. Rules:
TYPE_A = any product/service description with 2+ words → needs_full_generation:true
TYPE_B = single bare word, price only, or pure location only → needs_full_generation:false, provide unlock_question
TYPE_C = user asking an advertising question → needs_full_generation:false, provide direct_answer
TYPE_D = user asking to refine existing copy → needs_full_generation:true
TYPE_E = conversational sign-off/confirmation → needs_full_generation:false, direct_answer:"You're all set!"
Pidgin multi-word = TYPE_A. Emojis with words = TYPE_A. Be decisive.`;

async function triageInput(
  description: string,
  objective: string,
): Promise<{
  input_type: string;
  needs_full_generation: boolean;
  unlock_question?: string | null;
  direct_answer?: string | null;
}> {
  const response = await (openai.responses.create as any)({
    model: "gpt-5-mini",
    instructions: TRIAGE_INSTRUCTION,
    input: `obj:${objective} | input:${description}`,
    text: {
      format: { type: "json_schema", name: "triage_result", schema: TRIAGE_SCHEMA },
    },
  });
  return JSON.parse(response.output_text);
}

// ─── Full Strategy Generator ──────────────────────────────────────────────────
async function generateWithOpenAI(
  input: AIInput,
  tierAi: (typeof TIER_CONFIG)[TierId]["ai"],
  preInferred?: LocalClassification["preInferred"],
): Promise<AIStrategyResult> {
  const useSkills = tierAi.useSkills;
  console.log("\n====================================");
  console.log("🚀 [OpenAI Service] generateWithOpenAI called");
  console.log(`   - Business: ${input.businessDescription.substring(0, 50)}...`);
  console.log(`   - Target: ${input.customerGender} in ${input.location}`);
  console.log(`   - Model: ${tierAi.strategyModel} | Skills: ${useSkills}`);

  const response = await (openai.responses.create as any)({
    model: tierAi.strategyModel,
    instructions: BASE_INSTRUCTION,
    input: buildUserMessage(input, preInferred),
    ...(useSkills
      ? {
          tools: [
            {
              type: "shell",
              environment: {
                type: "container_auto",
                skills: buildSkillList(
                  preInferred?.businessType,
                  !!preInferred?.lifeSignals,
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

  const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  if (response.output) {
    const outputStr = JSON.stringify(response.output);
    const skillMatches = [...outputStr.matchAll(/\/skills\/([a-zA-Z0-9_-]+)\//g)];
    const skillsUsed = new Set(skillMatches.map((m) => m[1]));
    console.log("🛠️ [OpenAI Service] Skills actively used by AI in this generation:");
    if (skillsUsed.size > 0) {
      skillsUsed.forEach((skill) => console.log(`  - 🎯 ${skill}`));
    } else {
      console.log("  - No explicit skills were called (relied on pre-loaded knowledge)");
    }
  }

  console.log("💎💎💎 USAGE 💎💎💎", usage);
  console.log("====================================\n");

  const outputText = response.output_text;
  if (!outputText) throw new Error("No text response from OpenAI");

  const result = JSON.parse(outputText) as AIStrategyResult;
  return { ...result, usage };
}

// ─── Copy Refinement (gpt-5-mini, no Skills) ─────────────────────────────────
export async function refineAdCopyWithOpenAI(
  input: AIInput,
  refinementInstruction: string,
): Promise<AIStrategyResult & { usage?: any }> {
  console.log("\n====================================");
  console.log("🚀 [OpenAI Service] refineAdCopyWithOpenAI called");
  console.log("📝 [OpenAI Service] Instruction:", refinementInstruction);

  const response = await (openai.responses.create as any)({
    model: "gpt-5-mini",
    instructions: BASE_INSTRUCTION,
    input: `${buildUserMessage(input)}\n\nRefinement instruction: ${refinementInstruction}`,
    text: {
      format: {
        type: "json_schema",
        name: "ai_strategy_result",
        schema: AI_STRATEGY_SCHEMA,
      },
    },
  });

  const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  console.log("💎💎💎 USAGE 💎💎💎 refinement", usage);
  console.log("====================================\n");

  const outputText = response.output_text;
  if (!outputText) throw new Error("No response from OpenAI refinement");

  const result = JSON.parse(outputText) as AIStrategyResult;
  return { ...result, usage };
}

// ─── Mock Generator (dev fallback) ───────────────────────────────────────────
async function generateMock(input: AIInput): Promise<AIStrategyResult> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return {
    interests: ["Small Business", "Entrepreneurship", "Fashion Accessories", "Lagos Life"],
    behaviors: ["Engaged Shoppers", "Mobile Device Users"],
    demographics: { age_min: 25, age_max: 45, gender: "all" },
    suggestedLocations: ["Lagos, Nigeria", "Abuja, Nigeria"],
    estimatedReach: 1200000,
    copy: [
      `Stop scrolling! 🛑 The best ${input.businessDescription.substring(0, 10)}... is here. Order now and get fast delivery in Lagos.`,
      "Upgrade your lifestyle with our premium collection. Limited stock available! 🛍️",
    ],
    headline: ["Best Prices in Lagos", "Premium Quality"],
    reasoning: "Mock Data: Targeted broad interests in commercial hubs for maximum visibility.",
    ctaIntent: "buy_now" as const,
    plain_english_summary: "Mock campaign targeting Lagos shoppers.",
    lifeEvents: [],
    whatsappMessage: null,
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
  preInferred?: LocalClassification["preInferred"],
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
  console.log(`🎯 [OpenAI Service] Tier resolved — Skills: ${tierConfig.ai.useSkills}`);

  // ── Two-model triage: route cheap cases through gpt-5-mini before Skills ──
  // Skip triage when: local preprocessor already ran (preInferred set),
  // or it's a copy refinement (currentCopy present) — both go straight to full gen
  const skipTriage = !!preInferred || !!input.currentCopy;

  if (!skipTriage) {
    try {
      const triage = await triageInput(
        input.businessDescription,
        input.objective || "whatsapp",
      );
      console.log("🔍 [Triage] Result:", triage);

      // Non-TYPE_A: respond directly without loading Skills — saves ~3,500 tokens
      if (!triage.needs_full_generation) {
        return {
          plain_english_summary: "",
          interests: [],
          behaviors: [],
          lifeEvents: [],
          demographics: { age_min: 18, age_max: 65, gender: "all" },
          suggestedLocations: [],
          estimatedReach: 0,
          copy: [],
          headline: [],
          ctaIntent: "buy_now" as const,
          whatsappMessage: null,
          meta: {
            input_type: triage.input_type as any,
            needs_clarification: triage.input_type === "TYPE_B",
            clarification_question: triage.unlock_question ?? null,
            clarification_options: null,
            is_question: triage.input_type === "TYPE_C" || triage.input_type === "TYPE_E",
            question_answer: triage.direct_answer ?? null,
            price_signal: "unknown" as const,
            detected_business_type: "unknown" as const,
            confidence: 0.3,
            inferred_assumptions: [],
            refinement_question: null,
          },
        };
      }
    } catch (triageErr) {
      // Safe degradation: triage failure falls through to full generation
      console.warn("[Triage] Failed, proceeding with full gen:", triageErr);
    }
  }

  // ── Full generation: gpt-5.2 + Skills ────────────────────────────────────
  const aiResult = await generateWithOpenAI(input, tierConfig.ai, preInferred);
  console.log("OpenAI Skills Result: 📋", aiResult);

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user?.id)
    .single();
  if (!member) throw new Error("No organization found");

  const { error } = await supabase
    .from("targeting_profiles")
    .insert({
      organization_id: member?.organization_id,
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
