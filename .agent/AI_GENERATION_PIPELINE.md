# AI Campaign Generation Pipeline

**Document Version:** 1.0
**Last Updated:** 2026-03-31
**Status:** Current Architecture

---

## Overview

The Tenzu AI campaign generation pipeline is a **multi-phase, cost-optimized system** that routes user requests through three models to balance quality and token efficiency:

1. **Triage (gpt-5-mini)** → Classify input & extract context
2. **Full Generation (gpt-5.2 + Skills)** → Generate complete strategy with Meta targeting
3. **Resolution** → Convert AI-generated names to Meta IDs
4. **Refinement (gpt-5-mini, optional)** → Edit copy without regenerating strategy

The system **never passes AI generation directly to the Meta API**. Instead:
- AI generates targeting names as strings
- Local catalog lookup resolves ~95% of names instantly
- Remaining 5% fall back to Meta API search
- All names are validated before campaign launch

---

## Phase 1: Triage (gpt-5-mini)

**Purpose:** Fast, cheap input classification before expensive full generation
**Cost:** ~300 tokens per call
**Entry Point:** `POST /api/ai/generate`
**Model:** `gpt-5-mini`

### Input

```typescript
// From request body
{
  description: string;           // User's business description
  objective?: string;            // "sales" | "awareness" | "whatsapp"
  location?: string;
  conversationHistory?: Array<{ role, content }>;  // Multi-turn context
}

// From org profile (Supabase)
{
  industry?: string;             // "E-commerce (Fashion/Beauty)" | "Food & Beverage" | ...
  selling_method?: string;       // "online" | "physical_store" | "both"
  price_tier?: string;           // "low" | "mid" | "high"
  customer_gender?: string;      // "male" | "female" | "both"
  business_description?: string; // Org's pre-saved profile
}
```

### Classification

The triage system classifies inputs into 7 types:

| Type | Trigger | Action | Cost Saved |
|------|---------|--------|-----------|
| **TYPE_A** | "Fashion boutique in Lagos" | Full generation with Skills | $0 (required) |
| **TYPE_B** | Single bare word "shoes" | Return clarification question | ~3.5k tokens |
| **TYPE_C** | "How do I target women?" | Answer question directly | ~3.5k tokens |
| **TYPE_D** | "Make it shorter" (refinement) | Route to gpt-5-mini refiner | ~2.5k tokens |
| **TYPE_E** | "That's great!" (confirmation) | Return friendly response | ~3.5k tokens |
| **TYPE_F** | "How to make pasta?" (off-topic) | Politely decline | ~3.5k tokens |
| **TYPE_G** | Bare request + org profile available | Propose plan for confirmation | ~3k tokens |

### Slot Extraction

Triage extracts 4 slots even for non-TYPE_A inputs:

```typescript
extracted: {
  gender: "male" | "female" | "all";
  priceTier: "low" | "mid" | "high" | "unknown";
  businessType: "fashion" | "beauty" | "food" | "electronics"
               | "events" | "b2b" | "general" | "unknown";
  lifeSignals: "wedding,job" | "none" | "";  // comma-separated
}
```

**Rules:**
- Use **full conversation history** (not just latest message) to extract slots
- Map Nigerian slang to standard terms
  - "I dey sell" → "I sell"
  - "e get class" → premium tier
  - "na wigs I dey do" → business type = beauty
- Default to "unknown" only when genuinely undetectable

### Output: TriageResult

```typescript
interface TriageResult {
  input_type: "TYPE_A" | "TYPE_B" | ... | "TYPE_G";
  needs_full_generation: boolean;  // true only for TYPE_A
  is_refinement: boolean;

  // For TYPE_B/C/E/F (direct response):
  unlock_question?: string;  // e.g., "Are you selling men's or women's shoes?"
  direct_answer?: string;    // For TYPE_C/E/F responses

  // For TYPE_G (org-aware proposal):
  proposed_plan?: string;    // "Based on your profile, I'll create..."
  needs_confirmation?: boolean;

  // Always extracted:
  extracted: {
    gender: string;
    priceTier: string;
    businessType: string;
    lifeSignals: string;
  };
}
```

### Decision Tree

```
Input received
    ↓
Triage model classifies
    ├─ TYPE_A? → needs_full_generation = true
    │           (Continue to Phase 2)
    │
    ├─ TYPE_B/C/E/F? → needs_full_generation = false
    │                → Return direct response (no Skills cost)
    │
    └─ TYPE_G? → needs_full_generation = false
                → Return proposed_plan, wait for confirmation
```

---

## Phase 2: Full Generation (gpt-5.2 + Skills)

**Purpose:** Generate complete campaign strategy with validated targeting
**Cost:** ~2,500–4,000 tokens per call
**Models:** `gpt-5.2` (primary) + Skills environment
**Entry Point:** `generateAndSaveStrategy()` in [src/lib/ai/service.ts:681](src/lib/ai/service.ts#L681)
**Trigger:** Only if `triage.needs_full_generation = true`

### System Instruction: buildBaseInstruction()

The system instruction is dynamic and category-aware:

```typescript
function buildBaseInstruction(
  orgCountryCode?: string,
  businessContext?: { category?: string },
): string
```

**Content Structure:**

```
You are an expert {Nigerian|Global} ad copywriter and marketing strategist.

[Instructions to determine strategy]

INTERESTS — prefer names from this catalog (5-8, 1-3 words each):
${buildScopedInterestCatalogPrompt(category)}
├─ Output: "Fashion | Clothing | Shopping | Online shopping | Shoes | Handbags | ..."
└─ Max: 30 items, category-relevant first

BEHAVIORS — you MUST output ONLY names from this exact list (2–5):
${buildScopedBehaviorCatalogPrompt(category)}
├─ Output: "Engaged Shoppers | Online buyers | Mobile device users | ..."
└─ Max: 20 items, category-relevant first

LIFE EVENTS — output ONLY names from this exact list (0–2), or empty array:
${buildScopedLifeEventCatalogPrompt(category)}
├─ Output: "Newly engaged (1 year) | New job | New relationship | ..."
└─ Max: 15 items, category-relevant first

[Rest of instructions about copy tone, CTA, etc.]
```

### Catalog Scoping Logic

**Why scope?** To reduce prompt tokens while maintaining quality.

#### Interest Catalog Scoping

```typescript
// From meta-interests.ts:1752
export function buildScopedInterestCatalogPrompt(
  category?: string,
  max = 30,
): string {
  if (!category) return buildInterestCatalogPrompt();  // All ~200 interests

  const relevant = suggestInterestsForCategory(category);
  if (relevant.length >= max) {
    return relevant.slice(0, max).map(i => i.name).join(" | ");
  }

  // Pad with universal interests sorted by universality
  const rest = META_INTEREST_SEEDS.filter(e => !relevant.includes(e))
    .sort((a, b) => b.relevantFor.length - a.relevantFor.length);

  const combined = [...relevant, ...rest].slice(0, max);
  return combined.map(i => i.name).join(" | ");
}
```

**Example: Fashion Campaign**

```
All interests: 200+ items
  ↓ Filter by category="fashion"
Relevant: ["Fashion", "Clothing", "Shopping", "Shoes", "Handbags", "Jewelry", ...]
  ↓ Pad with universal interests (most relevant_for tags)
Final (30 max): ["Fashion", "Clothing", "Shopping", ..., "Online shopping", "Retail"]
```

#### Behavior Catalog Scoping

```typescript
// From meta-behaviors.ts:4391
export function buildScopedBehaviorCatalogPrompt(
  category?: string,
  max = 20,
): string {
  // Same pattern as interests
  // Prioritize: Engaged Shoppers (universal), then category-specific
}
```

**Example: Beauty Campaign**

```
All behaviors: 150+ items
  ↓ Filter by category="beauty"
Relevant: ["Engaged Shoppers", "Online buyers", "Mobile device users",
           "Beauty product buyers", "Skincare product buyers", ...]
  ↓ Limit to 20
Final: 15 relevant + 5 universal = 20 items
```

#### Life Event Catalog Scoping

```typescript
// From meta-life-events.ts:688
export function buildScopedLifeEventCatalogPrompt(
  category?: string,
  max = 15,
): string
```

**Example: Weddings**

```
All life events: 50+ items
  ↓ Filter by category="events"
Relevant: ["Newly engaged (1 year)", "Newly engaged (6 months)", "Newly engaged (3 months)",
           "Newlywed (1 year)", "Newlywed (6 months)", "New job", ...]
  ↓ Limit to 15
Final: 10 wedding events + 5 universal = 15 items
```

### User Message: buildUserMessage()

```typescript
// From service.ts:279
function buildUserMessage(
  input: AIInput,
  extracted?: TriageResult["extracted"],
): string
```

**Format:**

```xml
<biz>User's business description here</biz>

<ctx>gender:female | tier:mid | type:fashion</ctx>

<loc>Lagos</loc>

<del>online_store</del>

<obj>sales</obj>

<site>[Scraped website content if URL pasted]</site>

<refine>h:"Old headline" b:"Old body copy"</refine>  <!-- If refinement -->
```

**Purpose:** Inject extracted context so Skills skip re-inference (saves 100–200 tokens).

### Skills Environment

Only loaded if `tier.ai.useSkills = true`:

```typescript
tools: [
  {
    type: "shell",
    environment: {
      type: "container_auto",
      skills: [
        { type: "skill_reference", skill_id: "core-strategy-ng" },
        { type: "skill_reference", skill_id: "copy-verticals-ng" },  // or copy-electronics-ng, copy-events-ng
        { type: "skill_reference", skill_id: "policy-guard-ng" },    // Only if regulated category
        { type: "skill_reference", skill_id: "life-events-ng" },     // Only if life_signals detected
      ]
    }
  }
]
```

**Skill Routing:**

| Business Type | Skills Loaded |
|---------------|---------------|
| Fashion, Beauty, Food, B2B, General | `core-strategy-ng` + `copy-verticals-ng` |
| Electronics | `core-strategy-ng` + `copy-electronics-ng` |
| Events, Weddings | `core-strategy-ng` + `copy-events-ng` |
| Finance, Health, Crypto, Betting | + `policy-guard-ng` (compliance check) |
| Any + Life signals detected | + `life-events-ng` |

### AI Response: AIStrategyResult

```typescript
interface AIStrategyResult {
  // Generated by AI (names only, not IDs):
  interests: string[];           // ["Fashion", "Shopping", "Online shopping", ...]
  behaviors: string[];           // ["Engaged Shoppers", "Online buyers", ...]
  lifeEvents: string[];          // ["New relationship", "Newly engaged"] or []

  // Copy variants:
  copy: string[];                // 3 ad body copy variations
  headline: string[];            // 3 headline variations
  whatsappMessage: string | null;  // e.g., "Hi! I saw your ad about wigs in Lagos..."

  // Targeting details:
  demographics: {
    age_min: number;
    age_max: number;
    gender: "all" | "male" | "female";
  };
  suggestedLocations: string[];  // ["Lagos", "Abuja"]
  geo_strategy: {
    type: "broad" | "cities";
  } | null;
  estimatedReach: number;

  // CTA & forms:
  ctaIntent: "start_whatsapp_chat" | "buy_now" | "learn_more"
             | "book_appointment" | "get_quote" | "sign_up" | "download";
  suggestedLeadForm?: {
    fields: Array<{ type, label, choices }>;
    thankYouMessage: string;
  } | null;

  // Plain language:
  plain_english_summary: string;  // "Targeting women 18–35 in Lagos..."
  reasoning?: string;

  // Metadata:
  meta: AIStrategyMeta;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### Storage: Targeting Profiles

After generation, save to `targeting_profiles` table:

```typescript
// From service.ts:863
const { error } = await supabase
  .from("targeting_profiles")
  .insert({
    organization_id: orgId,
    name: "Fashion boutique in Lagos...",
    business_description: input.businessDescription,
    product_category: "General",
    ai_reasoning: aiResult.reasoning,
    validated_interests: aiResult.interests,  // Still strings, not Meta IDs
    created_by: user.id,
  })
  .select("id")
  .single();
```

**Note:** At this stage, `interests`, `behaviors`, and `lifeEvents` are **strings only**. Conversion to Meta IDs happens later during campaign launch.

---

## Phase 3: Resolution — AI Names → Meta IDs

**Purpose:** Convert AI-generated strings to validated Meta targeting object IDs
**Timing:** Lazy (on-demand during campaign launch)
**Entry Point:** [src/lib/utils/targeting-resolver.ts](src/lib/utils/targeting-resolver.ts)

### Three-Tier Lookup Pattern

#### Tier 1: Local Catalog Fast Path (90%+ hit rate)

```typescript
// From meta-interests.ts:1709
export function resolveLocalInterest(aiName: string): MetaInterestSeed | null {
  const normalized = aiName.toLowerCase().trim();

  // Exact match
  const exact = META_INTEREST_SEEDS.find(
    i => i.name.toLowerCase() === normalized,
  );
  if (exact) return exact;

  // Alias match (fuzzy)
  const alias = META_INTEREST_SEEDS.find(e =>
    e.aliases.some(a => a === normalized || normalized.includes(a) || a.includes(normalized)),
  );
  return alias ?? null;
}
```

**Example:**

```
AI generates: "Hair care"
  ↓ Local lookup
META_INTEREST_SEEDS.find(i => i.name === "Hair care")
  → {
      name: "Hair care",
      metaId: "6003362473156",  ← Already confirmed
      aliases: ["hair", "hair styling", "hair treatment"]
    }
  ↓
Return: { id: "6003362473156", name: "Hair care", resolved: true }
  (INSTANT, no API call)
```

**Catalog Structure:**

```typescript
export interface MetaInterestSeed {
  name: string;           // "Hair care"
  metaId?: string;        // "6003362473156" (from validate-meta-interests.ts)
  path: string;
  aliases: string[];      // ["hair", "hair styling", "treatment"]
  relevantFor: string[];  // ["beauty", "hair", "skincare"]
}
```

#### Tier 2: Meta API Search (5–10% fallback)

```typescript
// From targeting-resolver.ts:80
export async function resolveInterest(
  name: string,
  searchFn: (query: string) => Promise<any[]>,
): Promise<ResolvedTarget> {
  const local = resolveLocalInterest(name);

  if (local?.metaId) {
    return { id: local.metaId, name: local.name, resolved: true };  // ← Tier 1
  }

  // Tier 2: Meta API search
  const correctedName = local?.name ?? name;
  const keyword = extractSearchKeyword(correctedName);  // "Hair care" → "Hair care"

  try {
    const results = await searchFn(keyword);  // Call Meta API

    if (results.length > 0) {
      const top = results[0];

      // Sanity check: must share at least one word with query
      if (hasWordOverlap(top.name, correctedName)) {
        return { id: top.id, name: top.name, resolved: true };
      }
    }
  } catch (error) {
    // Tier 3: Fallback
  }

  // Tier 3: Name-only (unresolved)
  return { id: "", name: correctedName, resolved: false };
}
```

**Sanity Check Logic:**

```typescript
// From targeting-resolver.ts:70
function hasWordOverlap(resultName: string, intended: string): boolean {
  const resultWords = new Set(resultName.toLowerCase().split(/\s+/));
  const intendedWords = intended.toLowerCase().split(/\s+/);

  return intendedWords.some(w => w.length > 2 && resultWords.has(w));
}
```

**Example:** If AI generates "Natural oils" but Meta API returns "Oil painting", reject because:
- "oils" is in both
- But "natural" ≠ "painting"
- Word overlap check fails → fallback to name-only

#### Tier 3: Name-Only Fallback

```typescript
// Returned if Tier 1 & 2 fail
ResolvedTarget {
  id: "",
  name: "Hair care",
  resolved: false  // ← Flag: no Meta ID validated
}
```

**Behavior at Campaign Launch:**
- Names with `resolved: false` are **displayed in UI**
- When user tries to **publish to Meta**, API rejects invalid IDs
- UI prompts user to correct the targeting

### Behaviors & Life Events Resolution

**Behaviors** follow the same pattern but with **higher local hit rate (~95%)**:

```typescript
// From meta-behaviors.ts
export function resolveLocalBehavior(name: string): MetaBehaviorSeed | null {
  // Same 3-tier pattern
}
```

**Life Events** follow the same pattern:

```typescript
// From meta-life-events.ts:645
export function resolveLocalLifeEvent(name: string): MetaLifeEventSeed | null {
  // Same 3-tier pattern
}
```

### Resolution Batch Example

```typescript
// In campaigns.ts or during launch:

const strategy = AIStrategyResult {
  interests: ["Fashion", "Shopping", "Online shopping"],
  behaviors: ["Engaged Shoppers", "Online buyers"],
  lifeEvents: ["New relationship"],
};

// Resolve all
const resolvedInterests = await Promise.all(
  strategy.interests.map(name => resolveInterest(name, metaSearchFn))
);
// → [
//   { id: "6003348604581", name: "Fashion", resolved: true },
//   { id: "6003263791114", name: "Shopping", resolved: true },
//   { id: "6003346592981", name: "Online shopping", resolved: true },
// ]

const resolvedBehaviors = await Promise.all(
  strategy.behaviors.map(name => resolveBehavior(name, metaSearchFn))
);
// → [
//   { id: "6071631541183", name: "Engaged Shoppers", resolved: true },
//   { id: "6003388291114", name: "Online buyers", resolved: true },
// ]

const resolvedLifeEvents = await Promise.all(
  strategy.lifeEvents.map(name => resolveLifeEvent(name, metaSearchFn))
);
// → [
//   { id: "6005232221572", name: "New relationship", resolved: true },
// ]

// Save to campaign.resolved_targeting for Meta API call
```

---

## Phase 4: Refinement (gpt-5-mini, Optional)

**Purpose:** Edit generated copy without regenerating entire strategy
**Cost:** ~200 tokens per call
**Model:** `gpt-5-mini`
**Entry Point:** `refineAdCopyWithOpenAI()` in [src/lib/ai/service.ts:567](src/lib/ai/service.ts#L567)
**Trigger:** User says "make it shorter", "more fire", "change the headline", etc.

### Input

```typescript
interface RefinementInput {
  // Current strategy state:
  interests: string[];           // ← DO NOT CHANGE
  behaviors: string[];           // ← DO NOT CHANGE
  demographics: { ... };         // ← DO NOT CHANGE

  // Only these will be updated:
  currentCopy: {
    headline: string;
    primary: string;
  };
  refinementInstruction: string; // User's instruction: "Make it shorter"
}
```

### System Instruction

```
You are a Nigerian ad copy editor.
Rewrite only the copy variations and headlines based on the refinement instruction.
Keep the same brand voice, CTA intent, and WhatsApp message format.
Return ONLY the updated copy, headline, and whatsappMessage fields.
```

### Schema

```typescript
const REFINEMENT_SCHEMA = {
  type: "object",
  properties: {
    copy: { type: "array", items: { type: "string" } },
    headline: { type: "array", items: { type: "string" } },
    whatsappMessage: { type: ["string", "null"] },
  },
  required: ["copy", "headline", "whatsappMessage"],
};
```

### Output

```typescript
// Only these fields are updated
{
  copy: [
    "Refined copy variation 1",
    "Refined copy variation 2",
    "Refined copy variation 3",
  ],
  headline: [
    "Shorter headline 1",
    "Shorter headline 2",
    "Shorter headline 3",
  ],
  whatsappMessage: "Updated WhatsApp message if needed",
}

// Everything else remains from Phase 2:
interests, behaviors, demographics, etc. stay the same
```

**Key:** Refinement **never touches** interests, behaviors, or targeting. It's copy-only.

---

## Data Flow Summary

```
User Input
    ↓
[POST /api/ai/generate] (route.ts:12)
    ├─ Auth check
    ├─ Org context fetch (industry, price_tier, customer_gender, etc.)
    ├─ Subscription & credits check
    ├─ URL scraping (if user pasted link)
    └─ Parse request body
    ↓
[Triage] (service.ts:426)
    ├─ Model: gpt-5-mini
    ├─ Input: description + conversation history + org context
    └─ Output: TriageResult { input_type, extracted, needs_full_generation }
    ↓
Decision: needs_full_generation?
    ├─ NO (TYPE_B/C/E/F/G) → Return triage response directly
    │
    └─ YES (TYPE_A) → Continue to full generation
            ↓
    [Full Generation] (service.ts:465)
        ├─ Model: gpt-5.2 + Skills
        ├─ System instruction: buildBaseInstruction()
        │  ├─ Interests: buildScopedInterestCatalogPrompt(category) → pipe-separated string
        │  ├─ Behaviors: buildScopedBehaviorCatalogPrompt(category) → pipe-separated string
        │  └─ Life events: buildScopedLifeEventCatalogPrompt(category) → pipe-separated string
        │
        ├─ User message: buildUserMessage(input, extracted)
        │  ├─ <biz>...</biz>
        │  ├─ <ctx>gender:X | tier:Y | type:Z</ctx>
        │  ├─ <site>[scraped content]</site>
        │  └─ <refine>...<refine> (if refinement)
        │
        └─ Output: AIStrategyResult
            ├─ interests: ["Fashion", "Shopping", ...]       ← Strings
            ├─ behaviors: ["Engaged Shoppers", ...]         ← Strings
            ├─ lifeEvents: ["New relationship"] or []       ← Strings
            ├─ copy, headline, whatsappMessage
            ├─ demographics, suggestedLocations, estimatedReach
            └─ meta, usage
            ↓
    [Save to DB] (service.ts:863)
        └─ targeting_profiles table
            ├─ validated_interests: ["Fashion", ...]  ← Still strings
            ├─ ai_reasoning, business_description
            └─ created_by, created_at
            ↓
    [Return to Client] (route.ts:224)
        └─ Send AIStrategyResult as JSON
        ↓
    [Client displays strategy in campaign creation]
        ↓
    [Optional: Refinement] (route.ts:154)
        ├─ User says "Make it shorter"
        ├─ Call refineAdCopyWithOpenAI()
        │  └─ Model: gpt-5-mini (cheap)
        │  └─ Only updates: copy, headline, whatsappMessage
        └─ Return updated variations
            ↓
    [Campaign Launch] (campaigns.ts action)
        ├─ Trigger: User clicks "Create Campaign"
        ├─ Resolve all interests, behaviors, life events to Meta IDs
        │  ├─ resolveInterest(name) → { id, name, resolved }
        │  ├─ resolveBehavior(name) → { id, name, resolved }
        │  └─ resolveLifeEvent(name) → { id, name, resolved }
        │
        ├─ Check all resolved = true
        │  ├─ YES → Proceed
        │  └─ NO → Return error, ask to fix targeting
        │
        └─ Call Meta API with resolved IDs
            └─ Create ads on Meta
```

---

## Token & Cost Optimization

### Per-Request Token Breakdown

| Phase | Model | Tokens | Notes |
|-------|-------|--------|-------|
| Triage | gpt-5-mini | ~300 | Always runs |
| Full Gen | gpt-5.2 | ~2,500–4,000 | Only TYPE_A (30% of requests) |
| Refinement | gpt-5-mini | ~200 | Optional (5% of requests) |

**Average request:** 300 (triage) + (0.3 × 3,250) + (0.05 × 200) ≈ **1,375 tokens**

### Why Catalog Scoping Saves Tokens

```
Interest catalog:
  - Full list: 200+ items → ~400 tokens in prompt
  - Scoped (fashion): 30 items → ~60 tokens
  - Savings: 340 tokens × 30% of requests = 102 tokens/avg request

Behavior catalog:
  - Full list: 150+ items → ~300 tokens
  - Scoped (fashion): 20 items → ~40 tokens
  - Savings: 260 tokens × 30% = 78 tokens/avg request

Life events:
  - Full list: 50+ items → ~100 tokens
  - Scoped (fashion): 15 items → ~30 tokens
  - Savings: 70 tokens × 30% = 21 tokens/avg request

Total savings: 102 + 78 + 21 = ~200 tokens per full generation request
```

### Why Triage Saves Money

```
Without triage (all requests to gpt-5.2 + Skills):
  - 1,000 requests × 3,250 tokens = 3,250,000 tokens/month
  - Cost: ~$15/month (at gpt-5.2 rates)

With triage:
  - 1,000 requests:
    - 300 requests (TYPE_A) × 3,250 tokens = 975,000 tokens
    - 700 requests (TYPE_B/C/E/F/G) × 300 tokens = 210,000 tokens
  - Total: 1,185,000 tokens/month
  - Cost: ~$5/month

Savings: 70% cost reduction
```

---

## Validation & Testing

### Validate Meta Interests

```bash
npx ts-node src/scripts/validate-meta-interests.ts
```

Confirms that every `metaId` in `META_INTEREST_SEEDS` is still valid on Meta's API. Updates `meta-interests.ts`.

### Validate Meta Behaviors

```bash
npx ts-node src/scripts/validate-meta-behaviors.ts
```

Confirms behaviors. Produces `meta-behaviors-audit.json` with validation results.

### Validate Meta Life Events

```bash
npx ts-node src/scripts/validate-meta-life-events.ts
```

Confirms life events. Same validation pattern.

### Run Deduplication

```bash
npx ts-node src/scripts/dedup-meta-catalogs.ts
```

Removes duplicate or obsolete catalog entries.

---

## Architecture Decisions

### Why Three Models?

| Model | Why | Cost |
|-------|-----|------|
| gpt-5-mini (triage) | Fast classification, doesn't need Skills | $0.30/1M tokens |
| gpt-5.2 + Skills | Full reasoning for complex strategy | $15/1M tokens |
| gpt-5-mini (refine) | Simple copy editing, no reasoning needed | $0.30/1M tokens |

Routing cheap requests through gpt-5-mini avoids wasting gpt-5.2's expensive reasoning tokens.

### Why Lazy Resolution?

**Issue:** If we resolved all AI names to Meta IDs immediately after generation:
- Every request would need Meta API calls (~200ms each × 3 catalogs = 600ms latency)
- Failed resolutions would block campaign creation

**Solution:** Resolve only at campaign launch:
- User experience: instant feedback on strategy
- Errors: caught during campaign creation, not generation
- Flexibility: catalog updates don't invalidate old strategies

### Why Category-Scoped Catalogs?

**Without scoping:** 200 interest names in prompt → AI gets distracted
**With scoping:** 30 relevant interests → AI stays focused

Example: Fashion AI shouldn't see "Car enthusiasts" or "Gaming" interests.

### Why Local Lookup Before API?

- **Speed:** Instant (no network call)
- **Reliability:** Pre-validated metaIDs from last validation run
- **Cost:** Zero API calls for 90% of cases

---

## Current Known Issues & Improvements

### Interests

- **Issue:** AI occasionally generates names outside local catalog
- **Status:** Tier 2 (Meta API search) catches most; <5% need name-only fallback
- **Improvement:** Run quarterly validation to expand catalog

### Behaviors

- **Status:** Excellent. ~95% local hit rate. Behaviors rarely change on Meta.
- **Plan:** Semi-annual validation

### Life Events

- **Status:** Good. ~98% local hit rate.
- **Plan:** Quarterly validation, especially around holidays

---

## Related Files

| File | Purpose |
|------|---------|
| [src/lib/ai/service.ts](src/lib/ai/service.ts) | Core pipeline (triage, full gen, refinement) |
| [src/app/api/ai/generate/route.ts](src/app/api/ai/generate/route.ts) | API endpoint & request handling |
| [src/lib/utils/targeting-resolver.ts](src/lib/utils/targeting-resolver.ts) | Name → ID resolution |
| [src/lib/constants/meta-interests.ts](src/lib/constants/meta-interests.ts) | Interest catalog & scoping |
| [src/lib/constants/meta-behaviors.ts](src/lib/constants/meta-behaviors.ts) | Behavior catalog & scoping |
| [src/lib/constants/meta-life-events.ts](src/lib/constants/meta-life-events.ts) | Life event catalog & scoping |
| [src/scripts/validate-meta-interests.ts](src/scripts/validate-meta-interests.ts) | Validation script |
| [src/scripts/validate-meta-behaviors.ts](src/scripts/validate-meta-behaviors.ts) | Validation script |
| [src/scripts/validate-meta-life-events.ts](src/scripts/validate-meta-life-events.ts) | Validation script |
