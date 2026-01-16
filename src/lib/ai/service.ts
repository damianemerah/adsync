import OpenAI from "openai";
import { AIInput, AIStrategyResult } from "./types";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
});

// 1. THE REAL GENERATOR (Costs Money)
async function generateWithOpenAI(input: AIInput): Promise<AIStrategyResult> {
  try {
    const completion = await openai.chat.completions.create({
      // UPDATE THIS LINE
      model: "gpt-5-mini",

      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Business: ${input.businessDescription}. Location Context: ${
            input.location || "Nigeria"
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
    suggestedLocations: ["Lagos, Nigeria", "Abuja, Nigeria"],
    estimatedReach: 1200000,
    copy: [
      `Stop scrolling! 🛑 The best ${input.businessDescription.substring(
        0,
        10
      )}... is here. Order now and get fast delivery in Lagos.`,
      "Upgrade your lifestyle with our premium collection. Limited stock available! 🛍️",
    ],
    headline: ["Best Prices in Lagos", "Premium Quality"],
    reasoning:
      "Mock Data: Targeted broad interests in commercial hubs for maximum visibility.",
  };
}

// 3. THE EXPORTED FUNCTION
export async function generateAndSaveStrategy(
  input: AIInput
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

    const { data: profile, error } = await supabase
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
