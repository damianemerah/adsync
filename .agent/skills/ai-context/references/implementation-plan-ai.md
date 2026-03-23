# PHASE 2B — Creative Intelligence

## "Better ads for people who can't make ads"

**Target: Months 7–9 (Hours with AI)**

The AI creative is already built. This phase makes it smarter and adds UGC video.

---

### 3.1 Category Playbooks

As attribution data accumulates, build category-specific creative defaults.

**New file:** `src/lib/ai/category-playbooks.ts`

```typescript
export type BusinessCategory =
  | "fashion"
  | "beauty"
  | "food"
  | "digital_services"
  | "real_estate"
  | "general";

export interface CategoryPlaybook {
  category: BusinessCategory;
  topCreativeFormats: string[]; // "product on white bg", "lifestyle", "before/after"
  copyTone: string; // "casual_nigerian", "aspirational", "urgency"
  highPerformingCTAs: string[];
  avoidPatterns: string[];
  systemPromptAddition: string; // injected into Flux/OpenAI prompts
}

export const CATEGORY_PLAYBOOKS: Record<BusinessCategory, CategoryPlaybook> = {
  fashion: {
    category: "fashion",
    topCreativeFormats: [
      "lifestyle model wearing product",
      "flat lay on clean background",
      "before/after outfit",
    ],
    copyTone: "aspirational",
    highPerformingCTAs: ["Shop Now", "Send Message"],
    avoidPatterns: ["discount percentage in image", "cluttered backgrounds"],
    systemPromptAddition:
      "Nigerian fashion aesthetic, vibrant colors, clean modern background, aspirational but relatable",
  },
  beauty: {
    category: "beauty",
    topCreativeFormats: [
      "close-up product shot",
      "before/after result",
      "user applying product",
    ],
    copyTone: "results_focused",
    highPerformingCTAs: ["Send Message", "Get Quote"],
    avoidPatterns: ["medical claims", "miracle language"],
    systemPromptAddition:
      "Nigerian beauty market, diverse skin tones, bright clean aesthetic, product prominently featured",
  },
  food: {
    category: "food",
    topCreativeFormats: [
      "hero food shot",
      "packaging on clean surface",
      "process/cooking shot",
    ],
    copyTone: "warm_casual",
    highPerformingCTAs: ["Order Now", "Send Message"],
    avoidPatterns: ["overly dark images", "small portions"],
    systemPromptAddition:
      "Nigerian food photography style, warm lighting, appetizing presentation, fresh ingredients visible",
  },
  digital_services: {
    category: "digital_services",
    topCreativeFormats: [
      "result/outcome graphic",
      "testimonial screenshot",
      "before/after result",
    ],
    copyTone: "credibility_focused",
    highPerformingCTAs: ["Learn More", "Send Message"],
    avoidPatterns: ["income claims", "guaranteed results language"],
    systemPromptAddition:
      "Professional clean design, result-oriented, credibility signals, modern Nigerian business aesthetic",
  },
  real_estate: {
    category: "real_estate",
    topCreativeFormats: [
      "property exterior shot",
      "interior lifestyle",
      "aerial view",
    ],
    copyTone: "premium_aspirational",
    highPerformingCTAs: ["Get Quote", "Send Message", "Book Now"],
    avoidPatterns: ["price in creative", "cluttered contact details"],
    systemPromptAddition:
      "Nigerian real estate market, premium property photography, aspirational living, modern architecture",
  },
  general: {
    category: "general",
    topCreativeFormats: [
      "product on clean background",
      "lifestyle usage",
      "offer graphic",
    ],
    copyTone: "casual_nigerian",
    highPerformingCTAs: ["Send Message", "Shop Now"],
    avoidPatterns: ["too much text in image", "dark low-quality photography"],
    systemPromptAddition:
      "Nigerian market, clean modern aesthetic, product clearly visible",
  },
};

export function detectCategory(businessDescription: string): BusinessCategory {
  const desc = businessDescription.toLowerCase();
  if (/fashion|cloth|wear|outfit|dress|shoe/.test(desc)) return "fashion";
  if (/beauty|hair|skin|makeup|cosmetic|salon/.test(desc)) return "beauty";
  if (/food|restaurant|catering|eat|meal|cook/.test(desc)) return "food";
  if (/digital|online|course|training|software|tech/.test(desc))
    return "digital_services";
  if (/property|real estate|land|house|apartment|estate/.test(desc))
    return "real_estate";
  return "general";
}
```

**Wire into `ai-images.ts`** — when `campaignContext` is present:

```typescript
import {
  detectCategory,
  CATEGORY_PLAYBOOKS,
} from "@/lib/ai/category-playbooks";

// In generateAdCreative, when campaign context exists:
if (campaignContext?.businessDescription) {
  const category = detectCategory(campaignContext.businessDescription);
  const playbook = CATEGORY_PLAYBOOKS[category];
  // Append to system prompt
  systemPrompt += `\n\nCategory context: ${playbook.systemPromptAddition}`;
}
```

---

### 3.2 UGC Video Pipeline

**This addresses SMEs who can take phone videos but can't edit them.**

The pipeline:

1. SME uploads a raw phone video (or takes one in-app)
2. Tenzu uses `fal.ai` video models to add: captions, trim, add CTA text overlay, music bed
3. Output is a 15–30 second Reels/Stories-ready ad video

**New file:** `src/actions/ai-video.ts`

```typescript
"use server";

import { fal } from "@fal-ai/client";
import { createClient } from "@/lib/supabase/server";
import { requireCredits, spendCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/constants";

interface VideoProcessOptions {
  rawVideoUrl: string; // SME's uploaded video
  headline: string; // Overlay text
  ctaText: string; // CTA button text
  aspectRatio: "9:16" | "1:1"; // Stories vs Feed
  campaignId?: string;
}

export async function processUGCVideo({
  rawVideoUrl,
  headline,
  ctaText,
  aspectRatio,
  campaignId,
}: VideoProcessOptions) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Credit check — video costs more than image
  await requireCredits(user.id, CREDIT_COSTS.VIDEO_PROCESS || 20);

  // Call fal.ai video captioning/editing model
  // Using fal-ai/video-to-video or similar
  const result = await fal.subscribe("fal-ai/recraft-v3-video", {
    input: {
      video_url: rawVideoUrl,
      // Processing options depend on the model
      // This will be updated when fal.ai video API is confirmed
    },
  });

  // Spend credits after successful generation
  await spendCredits(
    user.id,
    CREDIT_COSTS.VIDEO_PROCESS || 20,
    "video_process",
  );

  return {
    success: true,
    videoUrl: (result as any).video?.url,
  };
}
```

> **Note:** Pin down the exact fal.ai video model and capabilities before implementing. The `fal-ai.md` and `fal-ai-edit.md` files in the repo should guide this. Video API is evolving rapidly — implement after confirming the right model for captioning + text overlay.

---

---

# PHASE 3 — The Intelligence Compounding Layer

## "The more you use it, the smarter it gets"

**Target: Months 9–12**

This is where Tenzu builds its moat. By this point, you have real attribution data across hundreds of Nigerian SME campaigns. Phase 3 is about turning that data into recommendations.

---

### 4.1 Performance Intelligence View

**New Supabase view:** `campaign_intelligence`

```sql
CREATE VIEW campaign_intelligence AS
SELECT
  c.id,
  c.organization_id,
  c.name,
  c.objective,
  c.daily_budget_cents,
  c.spend_cents,
  c.impressions,
  c.clicks,
  c.whatsapp_clicks,
  c.sales_count,
  c.revenue_ngn,
  -- Derived metrics
  CASE WHEN c.impressions > 0
    THEN ROUND((c.whatsapp_clicks::numeric / c.impressions) * 100, 2)
    ELSE 0 END AS whatsapp_click_rate,
  CASE WHEN c.whatsapp_clicks > 0
    THEN ROUND(c.sales_count::numeric / c.whatsapp_clicks * 100, 1)
    ELSE 0 END AS conversation_to_sale_rate,
  CASE WHEN c.sales_count > 0
    THEN ROUND((c.spend_cents::numeric / 100) * 1600 / c.sales_count)
    ELSE NULL END AS cost_per_sale_ngn,
  -- Targeting snapshot for pattern analysis
  c.targeting_snapshot,
  c.ai_context,
  c.created_at
FROM campaigns c
WHERE c.whatsapp_clicks IS NOT NULL;
```

---

### 4.2 AI Campaign Optimizer

**New file:** `src/lib/ai/campaign-optimizer.ts`

When a user starts a new campaign in the wizard, this service queries historical performance for their category and pre-populates smart defaults.

```typescript
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { detectCategory } from "./category-playbooks";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getOptimizationRecommendations({
  businessDescription,
  budgetNgn,
  organizationId,
}: {
  businessDescription: string;
  budgetNgn: number;
  organizationId: string;
}) {
  const supabase = await createClient();
  const category = detectCategory(businessDescription);

  // Pull aggregate performance data for this category across all orgs
  // (anonymized — no PII, just performance patterns)
  const { data: categoryBenchmarks } = await supabase
    .from("campaign_intelligence")
    .select(
      `
      whatsapp_click_rate,
      conversation_to_sale_rate,
      cost_per_sale_ngn,
      targeting_snapshot,
      daily_budget_cents
    `,
    )
    .filter("ai_context->>'businessDescription'", "ilike", `%${category}%`)
    .gte("whatsapp_clicks", 5) // Only include campaigns with meaningful data
    .order("whatsapp_click_rate", { ascending: false })
    .limit(20);

  if (!categoryBenchmarks || categoryBenchmarks.length === 0) {
    return null; // Not enough data yet
  }

  // Build context for the AI
  const benchmarkSummary = {
    avgClickRate: average(
      categoryBenchmarks.map((b: any) => b.whatsapp_click_rate),
    ),
    avgConversionRate: average(
      categoryBenchmarks.map((b: any) => b.conversation_to_sale_rate),
    ),
    topInterests: extractTopInterests(categoryBenchmarks),
  };

  const recommendation = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Based on performance data from ${categoryBenchmarks.length} similar Nigerian ${category} businesses:
      
Average WhatsApp click rate: ${benchmarkSummary.avgClickRate}%
Average conversation-to-sale rate: ${benchmarkSummary.avgConversionRate}%
Top performing interests: ${benchmarkSummary.topInterests.join(", ")}
User's budget: ₦${budgetNgn}/day
+
Suggest: 1) Best audience interests to target 2) Optimal daily budget allocation 3) Creative format recommendation.
Reply in JSON: { "interests": [], "budgetAdvice": "", "creativeFormat": "" }`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  return JSON.parse(recommendation.choices[0].message.content || "{}");
}

function average(nums: number[]): number {
  return nums.length
    ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
    : 0;
}

function extractTopInterests(benchmarks: any[]): string[] {
  const interestCounts: Record<string, number> = {};
  benchmarks.forEach((b) => {
    const interests = b.targeting_snapshot?.interests || [];
    interests.forEach((i: any) => {
      interestCounts[i.name] = (interestCounts[i.name] || 0) + 1;
    });
  });
  return Object.entries(interestCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name]) => name);
}
```
