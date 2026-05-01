// src/app/api/ai/generate/route.ts

import { NextResponse } from "next/server";
import {
  generateAndSaveStrategy,
  refineAdCopyWithOpenAI,
} from "@/lib/ai/service";
import { createClient } from "@/lib/supabase/server";
import { OBJECTIVE_INTENT_MAP, AdSyncObjective, TIER_CONFIG, TierId, CREDIT_COSTS } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/active-org";
import { extractUrlFromMessage, scrapeUrl } from "@/lib/ai/url-scraper";
import { spendCredits } from "@/lib/credits";

function toResponseKind(inputType: string): string {
  const map: Record<string, string> = {
    TYPE_A: "strategy",
    TYPE_B: "clarify",
    TYPE_C: "answer",
    TYPE_D: "refine",
    TYPE_E: "noop",
    TYPE_F: "redirect",
    TYPE_G: "confirm",
  };
  return map[inputType] ?? "clarify";
}

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
  const [{ data: org }, { data: userSub }] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        `
        id,
        industry,
        selling_method,
        price_tier,
        customer_gender,
        business_description,
        city,
        state,
        business_phone,
        business_website,
        whatsapp_number,
        country_code
      `,
      )
      .eq("id", activeOrgId)
      .single(),
    supabase
      .from("user_subscriptions")
      .select("subscription_status, subscription_expires_at, subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!org) return new Response("No organization found", { status: 403 });
  const status = userSub?.subscription_status as string | undefined;
  const expiresAt = userSub?.subscription_expires_at as string | undefined;

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

  // 4. Monthly chat limit check — free within quota, 1 credit per message after
  const tier = (userSub?.subscription_tier as TierId) || "starter";
  const maxMonthlyChats = TIER_CONFIG[tier]?.limits?.maxMonthlyChats ?? 50;

  if (maxMonthlyChats < 999999) {
    // Use subscription billing period start, not calendar month start.
    // subscription_expires_at is 30 days after the last renewal, so subtract
    // 30 days to get the start of the current billing cycle.
    const billingPeriodStart = expiresAt
      ? new Date(new Date(expiresAt).getTime() - 30 * 24 * 60 * 60 * 1000)
      : (() => {
          const d = new Date();
          d.setDate(1);
          d.setHours(0, 0, 0, 0);
          return d;
        })();

    const { count } = await supabase
      .from("ai_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", billingPeriodStart.toISOString());

    if ((count ?? 0) >= maxMonthlyChats) {
      // Over monthly limit — charge 1 credit as overage
      const { data: userRecord } = await supabase
        .from("users")
        .select("credits_balance")
        .eq("id", user.id)
        .single();

      const balance = userRecord?.credits_balance ?? 0;
      if (balance < CREDIT_COSTS.CHAT_OVERAGE) {
        return NextResponse.json(
          {
            error: `You've used all ${maxMonthlyChats} AI chat sessions this month and have no credits left. Top up or upgrade to continue.`,
            limitReached: true,
            noCredits: true,
            upgradeRequired: true,
          },
          { status: 429 },
        );
      }

      // Deduct 1 credit upfront before the AI call
      await spendCredits(supabase, activeOrgId, user.id, CREDIT_COSTS.CHAT_OVERAGE, "chat_overage", null, null);
    }
  }

  // 5. Parse input
  const body = await request.json();
  const {
    description: rawDescription,
    location,
    objective,
    currentCopy,
    refinementInstruction,
    conversationHistory,
  } = body;

  // ── URL context extraction ──────────────────────────────────────────────────
  // If the user pasted a URL, scrape it server-side and inject as site context.
  // The URL is stripped from the description so the model doesn't try to "visit" it.
  let siteContext: string | null = null;
  let description: string = rawDescription;

  let detectedUrl: string | null = rawDescription ? extractUrlFromMessage(rawDescription) : null;
  console.log("detectedUrl🔥", detectedUrl);
  if (detectedUrl) {
    siteContext = await scrapeUrl(detectedUrl);
    console.log("siteContext🔥", siteContext);
    if (siteContext) {
      // Strip URL from description. extractUrlFromMessage normalises bare domains
      // to https://, so try both the normalised form and whatever the regex matched
      // in the raw text (e.g. "www.actibuzz.com" vs "https://www.actibuzz.com").
      const rawMatch = rawDescription.match(
        /(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:com|net|org|io|ai|app|co|store|shop|dev|tech|online|site|web|info|biz|ng|za|gh|ke|eg|tz|ug|rw|sn|ci|cm|et|ma|tn|dz|zw|zm|bw|mz|ao)(?:\/[^\s"'<>()[\]{}]*)?\b/i,
      )?.[0];
      description = rawDescription
        .replace(detectedUrl, "")
        .replace(rawMatch ?? "", "")
        .trim() || rawDescription;
    }
    // If scrape failed, leave description as-is and pass detectedUrl to service
    // so triage can ask the user to describe their product instead.
    console.log("description🔥", description);
  } else {
    // On confirmation turns ("Yes, proceed"), recover siteContext from the URL
    // the user sent in an earlier message — it won't be in rawDescription anymore.
    const isConfirmPhrase = /^(yes|proceed|go ahead|ok|okay|yep|sure|do it|yes proceed|yes, proceed|make it|create it|do am|oya do am)$/i.test(
      rawDescription?.trim() ?? ""
    );
    if (isConfirmPhrase && conversationHistory?.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role === "user" && msg.content) {
          const histUrl = extractUrlFromMessage(msg.content);
          if (histUrl) {
            siteContext = await scrapeUrl(histUrl);
            console.log("siteContext (recovered from history)🔥", siteContext);
            if (!siteContext) detectedUrl = histUrl; // signal failed scrape
            break;
          }
        }
      }
    }
  }

  // Resolve objective context
  const objId = objective as AdSyncObjective;
  const objContext =
    objId && OBJECTIVE_INTENT_MAP[objId]
      ? OBJECTIVE_INTENT_MAP[objId]
      : undefined;

  if (!description) {
    // No user description and no org profile — ask for clarification instead of hard 400
    console.log("No description provided")
    return NextResponse.json({
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
      ctaIntent: "buy_now",
      whatsappMessage: null,
      responseKind: "clarify",
      meta: {
        input_type: "TYPE_B",
        needs_clarification: true,
        needs_confirmation: false,
        proposed_plan: null,
        clarification_question: "What are you selling? Give me one sentence and I'll build your ad.",
        clarification_options: null,
        is_question: false,
        question_answer: null,
      },
    });
  }

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
          location: location || (org?.city ? [org.city, org.state].filter(Boolean).join(", ") : undefined),
          industry: org?.industry,
          sellingMethod: org?.selling_method,
          priceTier: org?.price_tier,
          customerGender: org?.customer_gender,
          objective: objective ? String(objective).toUpperCase() : undefined,
          currentCopy,
          orgCountryCode: org?.country_code ?? "NG",
          siteContext,
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
      return NextResponse.json({
        ...clientStrategy,
        responseKind: "refine",
        siteContextSummary: siteContext ? siteContext.slice(0, 500) : null,
      });
    }

    const strategy = await generateAndSaveStrategy(
      {
        businessDescription: description,
        location: location || (org?.city ? [org.city, org.state].filter(Boolean).join(", ") : undefined),
        industry: org?.industry,
        sellingMethod: org?.selling_method,
        priceTier: org?.price_tier,
        customerGender: org?.customer_gender,
        objective: objective ? String(objective).toUpperCase() : undefined,
        objectiveContext: objContext,
        currentCopy: currentCopy ?? undefined,
        orgBusinessDescription: org?.business_description ?? null,
        orgWhatsappNumber: org?.whatsapp_number ?? null,
        orgWebsite: org?.business_website ?? null,
        orgCountryCode: org?.country_code ?? "NG",
        siteContext,
        detectedUrl: siteContext ? null : (detectedUrl ?? null),
      },
      conversationHistory ?? [],
      activeOrgId,
    );
    console.log(
      "\n[API Route: /api/ai/generate] ✅ Strategy generated successfully, returning to client.\n",
    strategy);

    // this may have to go as triage will already solved it.

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
          responseKind: "clarify",
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
            follow_ups: null,
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
            orgCountryCode: org?.country_code ?? "NG",
            siteContext,
          },
          description, // The user's raw refinement instruction becomes the refinement prompt
        );
        const { usage, ...clientStrategy } = refinedStrategy;
        return NextResponse.json({
          ...clientStrategy,
          responseKind: "refine",
          siteContextSummary: siteContext ? siteContext.slice(0, 500) : null,
        });
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
          ...(siteContext ? { site_context_chars: siteContext.length } : {}),
        },
        result_json: { generated: true, usage: strategy.usage },
        tokens_used: strategy.usage?.total_tokens || 0,
      })
      .then(({ error }) => {
        if (error) console.error("[strategy] Failed to log request:", error);
      });

    // Remove usage from client response
    const { usage, ...clientStrategy } = strategy;

    // Guard: if the result contains real copy + headline, always treat it as a full
    // strategy response — even if meta.input_type is "TYPE_E" or "TYPE_C".
    // The AI model sometimes tags a completed generation as TYPE_E (sign-off) when
    // the user confirmed via "Yes, proceed", causing toResponseKind() to return "noop"
    // and the client to discard the generated copy entirely.
    const hasGeneratedCopy =
      Array.isArray(clientStrategy.copy) && clientStrategy.copy.length > 0 &&
      Array.isArray(clientStrategy.headline) && clientStrategy.headline.length > 0;

    const derivedKind = hasGeneratedCopy
      ? "strategy"
      : toResponseKind(clientStrategy.meta?.input_type ?? "");

    return NextResponse.json({
      ...clientStrategy,
      responseKind: derivedKind,
      siteContextSummary: siteContext ? siteContext.slice(0, 500) : null,
    });
  } catch (error: any) {
    console.error("AI Strategy Error:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy", responseKind: "clarify" },
      { status: 500 },
    );
  }
}
