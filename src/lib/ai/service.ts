import OpenAI from "openai";
import { AIInput, AIStrategyResult } from "./types";
import { createClient } from "@/lib/supabase/server";
import { ADS_SYSTEM_PROMPT } from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
  timeout: 20000, // 20s hard cap — prevents the 34s+ hangs we saw in logs
  maxRetries: 1,  // OpenAI SDK built-in retry on transient errors
});

// 1. THE REAL GENERATOR (Costs Money)
async function generateWithOpenAI(input: AIInput): Promise<AIStrategyResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ADS_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Business: ${input.businessDescription}.
          Location Context: ${input.location || "Nigeria"}.
          ${input.industry ? `Industry: ${input.industry}.` : ""}
          ${input.sellingMethod ? `Selling Method: ${input.sellingMethod}.` : ""}
          ${input.priceTier ? `Price Tier: ${input.priceTier}.` : ""}
          ${input.customerGender ? `Target Audience: ${input.customerGender}.` : ""}
          ${
            input.objective
              ? `\nCAMPAIGN OBJECTIVE: ${input.objective}
          INTENT GUIDELINES:
          - Tone: ${input.objectiveContext?.tone || "Standard"}
          - Targeting Bias: ${input.objectiveContext?.targetingBias || "Standard"}
          - Preferred CTA: ${input.objectiveContext?.ctaBias || "Standard"}`
              : ""
          }
          ${
            input.currentCopy
              ? `\nCURRENT COPY TO REFINE (do not rebuild from scratch — edit this):
          Headline: "${input.currentCopy.headline}"
          Body: "${input.currentCopy.primary}"
          Apply the refinement instruction above to this existing copy. Keep what works, only change what was asked.`
              : ""
          }`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content returned from AI");

    return JSON.parse(content) as AIStrategyResult;
  } catch (error) {
    console.error("OpenAI Error:", error);
    throw error;
  }
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

// 3. THE EXPORTED FUNCTION
export async function generateAndSaveStrategy(
  input: AIInput,
): Promise<AIStrategyResult> {
  const supabase = await createClient();
  // Check env variable to decide provider
  const provider = process.env.AI_PROVIDER!;

  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API Key missing");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const aiResult = await generateWithOpenAI(input);

    console.log("AI Result:📁📁", aiResult);

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
        name: `${input.businessDescription.substring(0, 20)}...`, // Auto-name
        business_description: input.businessDescription,
        product_category: "General", // You can ask AI to categorize this too
        ai_reasoning: aiResult.reasoning,
        // Store the raw AI suggestion
        validated_interests: aiResult.interests,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) console.error("Failed to save profile:", error);

    return aiResult;
  }

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
