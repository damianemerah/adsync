import { NextResponse } from "next/server";
import {
  generateAndSaveStrategy,
  refineAdCopyWithOpenAI,
} from "@/lib/ai/service";
import { createClient } from "@/lib/supabase/server";
import { OBJECTIVE_INTENT_MAP, AdSyncObjective } from "@/lib/constants";

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // 2. Subscription guard — strategy generation is FREE but requires active account
  const { data: member } = await supabase
    .from("organization_members")
    .select(
      `
      organization_id,
      organizations (
        subscription_status,
        industry,
        selling_method,
        price_tier,
        customer_gender
      )
    `,
    )
    .eq("user_id", user.id)
    .single();

  if (!member) return new Response("No organization found", { status: 403 });

  // @ts-ignore — nested join typing
  const org = member.organizations;
  const status = org?.subscription_status as string | undefined;
  const allowedStatuses = ["active", "trialing"];
  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Your subscription is inactive. Please renew to continue." },
      { status: 403 },
    );
  }

  // 3. Parse input
  const body = await request.json();
  const {
    description,
    location,
    objective,
    currentCopy,
    refinementInstruction,
    preInferred,
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
    // ── Copy refinement via OpenAI gpt-4.1-mini (faster + cheaper) ──────────
    if (
      refinementInstruction &&
      currentCopy &&
      process.env.AI_PROVIDER === "openai"
    ) {
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
        refinementInstruction,
      );
      console.log(
        "\n[API Route: /api/ai/generate] ✅ Refinement generated successfully, returning to client.\n",
      );

      // Log text refinement usage
      await supabase
        .from("ai_requests")
        .insert({
          user_id: user.id,
          organization_id: member.organization_id as string,
          request_type: "copy_refinement",
          input_json: {
            type: "copy_refinement",
            description_length: description.length,
            refinement_instruction: refinementInstruction,
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
      preInferred,
    );
    console.log(
      "\n[API Route: /api/ai/generate] ✅ Strategy generated successfully, returning to client.\n",
    );

    // 4. Log usage (free action — no credits deducted)
    await supabase
      .from("ai_requests")
      .insert({
        user_id: user.id,
        organization_id: member.organization_id as string,
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
