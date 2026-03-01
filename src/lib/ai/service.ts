import OpenAI from "openai";
import { AIInput, AIStrategyResult } from "./types";
import { createClient } from "@/lib/supabase/server";
import { TIER_CONFIG, TierId } from "@/lib/constants";
import { resolveTier } from "@/lib/tier";

// ─── Minimal System Instruction ──────────────────────────────────────────────
// Provide a lightweight instruction since the actual ad strategy rules and
// formats are automatically mounted into the model's environment via Skills.
const BASE_INSTRUCTION =
  "You are an expert Nigerian ad copywriter and marketing strategist. Use your available skills to determine the best strategy and generate high-converting ad copy. Structure your response according to the provided JSON schema.";

// ─── Structured output JSON schema (mirrors AIStrategyResult + AIStrategyMeta) ─
// Using text.format for guaranteed valid JSON — no more manual
// code-fence stripping or JSON.parse errors.
const AI_STRATEGY_SCHEMA = {
  type: "object" as const,
  properties: {
    plain_english_summary: { type: "string" as const },
    interests: { type: "array" as const, items: { type: "string" as const } },
    behaviors: { type: "array" as const, items: { type: "string" as const } },
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
    reasoning: { type: "string" as const },
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
            "TYPE_H",
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
        plain_english_summary: { type: ["string", "null"] as const },
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
        "plain_english_summary",
      ] as const,
      additionalProperties: false,
    },
  },
  required: [
    "plain_english_summary",
    "interests",
    "behaviors",
    "demographics",
    "suggestedLocations",
    "estimatedReach",
    "copy",
    "headline",
    "ctaIntent",
    "whatsappMessage",
    "reasoning",
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

// Skill ID constants — set by upload-skills.ts, stored in .env
const SKILL_IDS = {
  coreStrategy: process.env.SKILL_ID_CORE_STRATEGY_NG!,
  fashion: process.env.SKILL_ID_COPY_FASHION_NG!,
  food: process.env.SKILL_ID_COPY_FOOD_NG!,
  beauty: process.env.SKILL_ID_COPY_BEAUTY_NG!,
  services: process.env.SKILL_ID_COPY_SERVICES_NG!,
  policyGuard: process.env.SKILL_ID_POLICY_GUARD_NG!,
};

console.log("SKILL_IDS", SKILL_IDS);

// All skills passed as candidates on every call.
// The model reads each skill's YAML description and auto-loads only the relevant ones.
// Unloaded skills cost no tokens.
function buildSkillList(): any[] {
  return [
    { type: "skill_reference", skill_id: SKILL_IDS.coreStrategy },
    { type: "skill_reference", skill_id: SKILL_IDS.fashion },
    { type: "skill_reference", skill_id: SKILL_IDS.food },
    { type: "skill_reference", skill_id: SKILL_IDS.beauty },
    { type: "skill_reference", skill_id: SKILL_IDS.services },
    { type: "skill_reference", skill_id: SKILL_IDS.policyGuard },
  ];
}

// Build the user message — raw input to the model. No pre-processing, no classification.
function buildUserMessage(input: AIInput): string {
  return [
    `Business: ${input.businessDescription}.`,
    `Location: ${input.location || "Nigeria"}.`,
    input.industry ? `Industry: ${input.industry}.` : "",
    input.sellingMethod ? `Selling Method: ${input.sellingMethod}.` : "",
    input.priceTier ? `Price Tier: ${input.priceTier}.` : "",
    input.customerGender ? `Target Audience: ${input.customerGender}.` : "",
    input.objective
      ? `\nCAMPAIGN OBJECTIVE: ${input.objective}\nTone: ${input.objectiveContext?.tone || "Standard"}\nTargeting Bias: ${input.objectiveContext?.targetingBias || "Standard"}\nPreferred CTA: ${input.objectiveContext?.ctaBias || "Standard"}`
      : "",
    input.currentCopy
      ? `\nCURRENT COPY TO REFINE (edit this, do not rebuild from scratch):\nHeadline: "${input.currentCopy.headline}"\nBody: "${input.currentCopy.primary}"\nApply the refinement instruction above. Keep what works.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// OpenAI strategy generator — tier-aware.
// Growth/Agency: gpt-5.2 WITH Skills (industry-specific .md files auto-loaded)
// Starter: gpt-5.2 WITHOUT Skills (inline system prompt only — still good quality)
async function generateWithOpenAI(
  input: AIInput,
  tierAi: (typeof TIER_CONFIG)[TierId]["ai"],
): Promise<AIStrategyResult> {
  const useSkills = tierAi.useSkills;
  console.log("\n====================================");
  console.log("🚀 [OpenAI Service] generateWithOpenAI called");
  console.log("📦 [OpenAI Service] Input details:", input);
  console.log(
    `   - Business: ${input.businessDescription.substring(0, 50)}...`,
  );
  console.log(`   - Target: ${input.customerGender} in ${input.location}`);
  console.log(`   - Model: ${tierAi.strategyModel} | Skills: ${useSkills}`);

  const response = await (openai.responses.create as any)({
    model: tierAi.strategyModel,
    instructions: BASE_INSTRUCTION,
    input: buildUserMessage(input),
    // Skills require shell tool + environment — only available for Growth/Agency
    ...(useSkills
      ? {
          tools: [
            {
              type: "shell",
              environment: {
                type: "container_auto",
                skills: buildSkillList(),
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

  console.log(
    "✅ [OpenAI Service] Raw response object received successfully.",
    response,
  );
  console.log("====================================\n");

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("No text response from OpenAI");
  }

  // text.format guarantees valid JSON — no stripping needed
  return JSON.parse(outputText) as AIStrategyResult;
}

// Copy refinement — gpt-5-mini for iterative edits (faster + cheaper)
// NOTE: gpt-5-mini does NOT support shell tool, so no Skills here.
// This is intentional — refinement doesn't need industry-specific Skills,
// it just edits existing copy based on the user's instruction.
export async function refineAdCopyWithOpenAI(
  input: AIInput,
  refinementInstruction: string,
): Promise<AIStrategyResult> {
  console.log("\n====================================");
  console.log(
    "🚀 [OpenAI Service] refineAdCopyWithOpenAI called: input:",
    input,
  );
  console.log("📝 [OpenAI Service] Instruction:", refinementInstruction);
  console.log("🧠 [OpenAI Service] Calling responses.create (gpt-5-mini)...");

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

  console.log(
    "✅ [OpenAI Service] Raw refinement response object received successfully.",
    response,
  );
  console.log("====================================\n");

  const outputText = response.output_text;
  if (!outputText) throw new Error("No response from OpenAI refinement");

  return JSON.parse(outputText) as AIStrategyResult;
}

// 2. THE MOCK GENERATOR (Free)
async function generateMock(input: AIInput): Promise<AIStrategyResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    interests: [
      "Small Business",
      "Entrepreneurship",
      "Fashion Accessories",
      "Lagos Life",
    ],
    behaviors: ["Engaged Shoppers", "Mobile Device Users"],
    demographics: {
      age_min: 25,
      age_max: 45,
      gender: "all",
    },
    suggestedLocations: ["Lagos, Nigeria", "Abuja, Nigeria"],
    estimatedReach: 1200000,
    copy: [
      `Stop scrolling! 🛑 The best ${input.businessDescription.substring(
        0,
        10,
      )}... is here. Order now and get fast delivery in Lagos.`,
      "Upgrade your lifestyle with our premium collection. Limited stock available! 🛍️",
    ],
    headline: ["Best Prices in Lagos", "Premium Quality"],
    reasoning:
      "Mock Data: Targeted broad interests in commercial hubs for maximum visibility.",
    ctaIntent: "buy_now" as const,
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
    },
  };
}

// 3. THE EXPORTED FUNCTION — resolves tier before calling AI
export async function generateAndSaveStrategy(
  input: AIInput,
): Promise<AIStrategyResult> {
  const supabase = await createClient();
  // Check env variable to decide provider
  const provider = process.env.AI_PROVIDER!;

  // ─── OpenAI (Skills API) ──────────────────────────────────────────────────
  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key missing");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Resolve the caller's subscription tier for model selection
    const { config: tierConfig } = await resolveTier(supabase, user.id);
    console.log(
      `🎯 [OpenAI Service] Tier resolved — Skills: ${tierConfig.ai.useSkills}`,
    );

    const aiResult = await generateWithOpenAI(input, tierConfig.ai);
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

  console.log("Generating mock data...", provider);
  // ─── Fallback: Mock ───────────────────────────────────────────────────────
  return generateMock(input);
}

/**
 * Helper function to save AI strategy result as campaign context
 * Call this after campaign creation to enable context-aware generation
 *
 * @param campaignId - The campaign ID to attach context to
 * @param strategyResult - The AI strategy result from generateAndSaveStrategy
 * @param businessDescription - Original business description from user
 */
export async function saveCampaignContext(
  campaignId: string,
  strategyResult: AIStrategyResult,
  businessDescription: string,
) {
  const supabase = await createClient();

  try {
    // Build campaign context object
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
              headline: strategyResult.headline[0], // Use first headline
              bodyCopy: strategyResult.copy[0], // Use first copy variation
            }
          : undefined,
    };

    // Update campaign with ai_context
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
