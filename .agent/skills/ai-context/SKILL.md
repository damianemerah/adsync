---
name: ai-context
description: Manages the Tenzu org-level AI context layer (Layer 1). Use when working on `compileContextPrompt`, `useOrgContext`, `context-compiler.ts`, `service.ts`, `category-playbooks.ts`, org profile DB columns, onboarding or settings business page fields, or any OpenAI/Fal.ai call that should be context-enriched with org data.
---

# AI Context Skill

## When to Load

Load this skill when working on:

- `src/lib/ai/context-compiler.ts` — extending CampaignContext, compileContextPrompt
- `src/lib/ai/service.ts` — generateAndSaveStrategy, saveCampaignContext
- `src/lib/ai/prompts.ts` — system prompts
- `src/lib/ai/category-playbooks.ts` — new file, category-specific defaults
- `src/hooks/use-org-context.ts` — new hook
- `src/app/(authenticated)/onboarding/page.tsx` — adding business description fields
- `src/actions/onboarding.ts` — createOrganization + new updateOrgProfile
- `src/app/(authenticated)/settings/business/page.tsx` — org profile edit fields
- `organizations` table columns: business_description, business_category, business_location, target_audience, whatsapp_number
- Any OpenAI or Fal.ai call that should be context-enriched

## Implementation Status

| Item                                                                              | Status      |
| --------------------------------------------------------------------------------- | ----------- |
| `organizations` columns: business_description, business_category, target_audience | ✅ Migrated |
| `useOrgContext` hook                                                              | ✅ Built    |
| `compileContextPrompt` Layer 1 injection                                          | ✅ Built    |
| `updateOrgProfile` action in onboarding.ts                                        | ✅ Built    |
| `OrgProfile` interface in context-compiler.ts                                     | ✅ Built    |
| Onboarding page fields (business description, target audience)                    | ✅ Built    |
| Settings business page fields                                                     | ✅ Built    |
| `category-playbooks.ts`                                                           | ✅ Built    |
| Wire org context into campaign wizard (`GoalPlatformStep`)                        | ✅ Built    |
| `organizations.design_insights` JSONB column + `analyze-assets` vision cron       | ⬜ Phase 3  |
| `insightsContext` parameter injection into `generateAdCreative()`                 | ⬜ Phase 3  |

## Reference Implementation

Full SQL, code, and file-by-file specs are in:
`.agent/skills/ai-context/references/phase-1c-ai-context.md`

Read this before modifying any AI-related files.

## What Already Exists — Do Not Duplicate

| File                              | What it has                                                                                   | Status                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `src/lib/ai/context-compiler.ts`  | `CampaignContext` interface, `compileContextPrompt()`, `hasValidContext()`, `analyzePrompt()` | ✅ Exists — EXTEND, don't replace            |
| `src/lib/ai/service.ts`           | `generateAndSaveStrategy()`, `saveCampaignContext()`                                          | ✅ Exists — EXTEND                           |
| `src/lib/ai/types.ts`             | `AIStrategyResult`, `AIInput`                                                                 | ✅ Exists                                    |
| `targeting_profiles` table        | `business_description`, `product_category`                                                    | ✅ Exists — Layer 2 context                  |
| `campaigns.ai_context`            | Per-campaign JSON context                                                                     | ✅ Exists — Layer 3 context                  |
| `ai_requests` table               | `context_source`, `used_context` tracking                                                     | ✅ Exists — already measures context quality |
| Onboarding `orgName` + `industry` | Captured in Step 1                                                                            | ✅ Captured — NOT yet saved to org profile   |

## Context Hierarchy (Layer 1 is the gap to build)

```
Layer 1 — Org Profile (BUILD THIS)
  organizations.business_description  → "Women's fashion, Lagos-based"
  organizations.business_category     → "fashion_beauty"
  organizations.business_location     → "Lagos, Nigeria"
  organizations.target_audience       → "Women 18-35 in Lagos"
  Loaded via useOrgContext() hook, cached 30 mins

Layer 2 — Targeting Profile (EXISTS)
  targeting_profiles.business_description
  targeting_profiles.product_category
  Saved by generateAndSaveStrategy() in service.ts

Layer 3 — Campaign Context (EXISTS)
  campaigns.ai_context (CampaignContext JSON)
  Saved by saveCampaignContext() in service.ts

Layer 4 — User Message (EXISTS)
  Real-time chat input, overrides above where explicit

Layer 5 — Design Insights (Phase 3 — Planned)
  organizations.design_insights JSONB  → {"successful_patterns": [...], "visual_themes": [...]}
  Populated by analyze-assets cron → GPT-4o Vision analysis of winning ad images
  Injected as insightsContext parameter into generateAdCreative() (optional enhancement)
  See: momentum-tracking/SKILL.md (winner detection) + openai-api/SKILL.md (vision pattern)
```

## CampaignContext Extension Pattern

EXTEND the existing interface — do NOT replace it:

```typescript
// ADD above existing CampaignContext in context-compiler.ts
export interface OrgProfile {
  name: string;
  businessDescription?: string;
  businessCategory?: string;
  businessLocation?: string;
  targetAudience?: string;
}

// MODIFY existing CampaignContext — add org as optional
export interface CampaignContext {
  org?: OrgProfile; // ← NEW Layer 1
  businessDescription: string; // ← KEEP existing Layer 3
  // ... rest unchanged
}
```

## compileContextPrompt() Modification Pattern

Check `context.org` first, fall back to existing `context.businessDescription`:

```typescript
// Layer 1: org profile (new)
if (context.org?.businessDescription) {
  prompt += ` for ${context.org.businessDescription}`;
} else if (context.businessDescription) {
  // Layer 3 fallback — existing behaviour preserved
  prompt += ` for ${context.businessDescription}`;
}
```

## Industry → Category Mapping

Onboarding uses these industry strings (from existing INDUSTRIES array):

```
"E-commerce (Fashion/Beauty)"  → "fashion_beauty"
"E-commerce (Electronics)"     → "electronics"
"Service Business"             → "services"
"Real Estate"                  → "real_estate"
"Food & Beverage"              → "food_beverage"
"Tech / SaaS"                  → "tech_saas"
"Other"                        → "other"
```

## Category Playbooks (new file: src/lib/ai/category-playbooks.ts)

Each category has: topCreativeFormats, copyTone, highPerformingCTAs,
avoidPatterns, systemPromptAddition.

detectCategory(businessDescription) → BusinessCategory
Injected into compileContextPrompt() when org.businessCategory is available.

## Key Rules

- useOrgContext() staleTime: 30 minutes — never re-fetch on every keystroke
- org context is optional in CampaignContext — never break existing flows
- updateOrgProfile goes in src/actions/onboarding.ts (existing file, same domain)
- Track impact via ai_requests.context_source — 'org_profile' hits should grow over time
- `insightsContext` (Phase 3) is strictly optional — `generateAdCreative()` must work identically without it

## Phase 3 Roadmap — AI Vision Feedback Loop (Planned)

The org-level AI context layer is designed to grow. Once attribution data accumulates, winning ad images can be analysed automatically to close the loop between ad performance and the next creative.

### How It Works

1. **Identify winners** — `lead-scoring` model detects campaigns with score ≥ 75 (🔥 Hot)
2. **Analyse assets** — `analyze-assets` cron calls `src/lib/ai/vision-analyzer.ts`
   - Uses GPT-4o Vision to extract visual traits from the winning ad image
   - Returns structured JSON: `{ successful_patterns, color_palette, visual_themes, copy_hooks }`
3. **Store insights** — writes to `organizations.design_insights JSONB`
4. **Inject context** — `compileContextPrompt()` includes `design_insights` as `insightsContext`
5. **Better creatives** — next Flux generation is guided by proven-winning visual traits

### Key Files (Phase 3 — Not Yet Built)

- `src/lib/ai/vision-analyzer.ts` — GPT-4o Vision analysis function (NEW)
- `src/lib/ai/context-compiler.ts` — extend `compileContextPrompt()` with `insightsContext`
- `organizations.design_insights JSONB` — new column (migration needed)
- `cron/analyze-assets.ts` or Supabase Edge Function — scheduled runner

### Design Insight Schema (Planned)

```typescript
interface DesignInsights {
  successful_patterns: string[]; // e.g. ["before/after layout", "product close-up"]
  color_palette: string[]; // e.g. ["#FF6B35", "#FFF8F0"] dominant colours
  visual_themes: string[]; // e.g. ["outdoor lifestyle", "premium packaging"]
  copy_hooks: string[]; // e.g. ["urgency", "social proof", "price anchor"]
  last_analyzed_at: string; // ISO timestamp
}
```

The `insightsContext` parameter is an enhancement, not a dependency — `generateAdCreative()` must produce valid results with or without it.
