import { NextResponse } from "next/server";
import {
  generateAndSaveStrategy,
  refineAdCopyWithOpenAI,
} from "@/lib/ai/service";
import { createClient } from "@/lib/supabase/server";
import { OBJECTIVE_INTENT_MAP, AdSyncObjective } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/active-org";

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2. Get active organization
  const activeOrgId = await getActiveOrgId();
  if (!activeOrgId) {
    return new Response("No organization found", { status: 403 });
  }

  // 3. Subscription guard — strategy generation is FREE but requires active account
  const { data: org } = await supabase
    .from("organizations")
    .select(
      `
      id,
      subscription_status,
      subscription_expires_at,
      industry,
      selling_method,
      price_tier,
      customer_gender
    `,
    )
    .eq("id", activeOrgId)
    .single();

  if (!org) return new Response("No organization found", { status: 403 });
  const status = org?.subscription_status as string | undefined;
  const expiresAt = org?.subscription_expires_at as string | undefined;

  const allowedStatuses = ["active", "trialing"];
  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Your subscription is inactive. Please renew to continue." },
      { status: 403 },
    );
  }

  if (status === "trialing" && expiresAt) {
    if (new Date(expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Your free trial has expired. Please upgrade to continue." },
        { status: 403 },
      );
    }
  }

  // 3. Parse input
  const body = await request.json();
  const {
    description,
    location,
    objective,
    currentCopy,
    refinementInstruction,
    conversationHistory,
  } = body;
  console.log("\n====================================");
  console.log("🚀 [API Route: /api/ai/generate] Request received");
  console.log("   - Location:", location);
  console.log("   - Objective:", objective);
  console.log("   - Description Length:", description?.length || 0);
  console.log("   - Is Refinement:", !!refinementInstruction);
  console.log("====================================\n");

  // Resolve objective context
  const objId = objective as AdSyncObjective;
  const objContext =
    objId && OBJECTIVE_INTENT_MAP[objId]
      ? OBJECTIVE_INTENT_MAP[objId]
      : undefined;

  if (!description)
    return NextResponse.json(
      { error: "Description required" },
      { status: 400 },
    );

  try {
    // ── Copy refinement via OpenAI gpt-5-mini (faster + cheaper) ──────────
    if (
      refinementInstruction &&
      currentCopy &&
      process.env.AI_PROVIDER === "openai"
    ) {
      const actualInstruction =
        refinementInstruction ||
        "Update the ad copy to incorporate the new business context provided in the description.";

      const strategy = await refineAdCopyWithOpenAI(
        {
          businessDescription: description,
          location,
          industry: org?.industry,
          sellingMethod: org?.selling_method,
          priceTier: org?.price_tier,
          customerGender: org?.customer_gender,
          objective: objective ? String(objective).toUpperCase() : undefined,
          currentCopy,
        },
        actualInstruction,
      );
      console.log(
        "\n[API Route: /api/ai/generate] ✅ Refinement generated successfully, returning to client.\n",
      );

      // Log text refinement usage
      await supabase
        .from("ai_requests")
        .insert({
          user_id: user.id,
          organization_id: activeOrgId,
          request_type: "copy_refinement",
          input_json: {
            type: "copy_refinement",
            description_length: description.length,
            refinement_instruction: actualInstruction,
          },
          result_json: { generated: true, usage: strategy.usage },
          tokens_used: strategy.usage?.total_tokens || 0,
        })
        .then(({ error }) => {
          if (error)
            console.error("[refinement] Failed to log request:", error);
        });

      // Remove usage from client response
      const { usage, ...clientStrategy } = strategy;
      return NextResponse.json(clientStrategy);
    }

    const strategy = await generateAndSaveStrategy(
      {
        businessDescription: description,
        location: location,
        industry: org?.industry,
        sellingMethod: org?.selling_method,
        priceTier: org?.price_tier,
        customerGender: org?.customer_gender,
        objective: objective ? String(objective).toUpperCase() : undefined,
        objectiveContext: objContext,
        currentCopy: currentCopy ?? undefined,
      },
      conversationHistory ?? [],
    );
    console.log(
      "\n[API Route: /api/ai/generate] ✅ Strategy generated successfully, returning to client.\n",
    );

    if (strategy.meta?.input_type === "TYPE_D") {
      // Guard: TYPE_D without currentCopy means the user typed a refinement phrase
      // ("make it shorter", "try again") before any copy was ever generated.
      // Triage may misclassify this if the conversation history is empty.
      // Downgrade to TYPE_B and return a helpful prompt instead of crashing.
      if (!currentCopy || !currentCopy.headline) {
        return NextResponse.json({
          plain_english_summary: "",
          interests: [],
          behaviors: [],
          lifeEvents: [],
          demographics: { age_min: 18, age_max: 65, gender: "all" },
          suggestedLocations: [],
          estimatedReach: 0,
          copy: [],
          headline: [],
          ctaIntent: "buy_now",
          whatsappMessage: null,
          meta: {
            input_type: "TYPE_B",
            needs_clarification: true,
            clarification_question:
              "I don't have any copy to refine yet — what are you selling?",
            clarification_options: null,
            is_question: false,
            question_answer: null,
            price_signal: "unknown",
            detected_business_type: "unknown",
            confidence: 0.1,
            inferred_assumptions: [],
            refinement_question: null,
          },
        });
      }

      if (process.env.AI_PROVIDER === "openai") {
        const refinedStrategy = await refineAdCopyWithOpenAI(
          {
            businessDescription: description,
            location,
            industry: org?.industry,
            sellingMethod: org?.selling_method,
            priceTier: org?.price_tier,
            customerGender: org?.customer_gender,
            objective: objective ? String(objective).toUpperCase() : undefined,
            currentCopy,
          },
          description, // The user's raw refinement instruction becomes the refinement prompt
        );
        const { usage, ...clientStrategy } = refinedStrategy;
        return NextResponse.json(clientStrategy);
      }
    }

    // 4. Log usage (free action — no credits deducted)
    await supabase
      .from("ai_requests")
      .insert({
        user_id: user.id,
        organization_id: activeOrgId,
        request_type: "text_generation",
        input_json: {
          type: "campaign_strategy",
          description_length: description.length,
        },
        result_json: { generated: true, usage: strategy.usage },
        tokens_used: strategy.usage?.total_tokens || 0,
      })
      .then(({ error }) => {
        if (error) console.error("[strategy] Failed to log request:", error);
      });

    // Remove usage from client response
    const { usage, ...clientStrategy } = strategy;
    return NextResponse.json(clientStrategy);
  } catch (error: any) {
    console.error("AI Strategy Error:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy" },
      { status: 500 },
    );
  }
}
