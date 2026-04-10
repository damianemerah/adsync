# Multi-Agent Vertical Specialists — Implementation Plan

**Status:** ⬜ Post-MVP
**Dependencies:** Core AI generation stable, Skills system operational
**Skills Reference:** `.agent/skills/ai-context/SKILL.md`
**Date:** 2026-04-08

---

## Why This Matters

The current AI generation pipeline routes all verticals except `electronics` and `events` into a single merged skill: `copy-verticals-ng`. This means a beauty brand campaign loads 3,000+ tokens of food-delivery and B2B knowledge that will never be used — and the model's copy output reflects that diluted focus.

Splitting `copy-verticals-ng` into dedicated vertical agent configurations solves two things at once:

1. **Token reduction (~35–45% per TYPE_A call):** Each agent loads only its relevant skill. A `copy-beauty-ng` skill is ~1,200 tokens vs. the merged ~3,000-token file.
2. **Copy quality lift:** A beauty specialist can dedicate its entire prompt budget to skin type segmentation, ingredient proof points, result-oriented CTAs, and before/after framing — instead of reserving space for irrelevant verticals.

The general agent (`copy-verticals-ng`) stays as the fallback for `general` / `unknown` business types. No API contract changes. No frontend changes. Purely internal routing + skill content split.

---

## Current Architecture (Baseline)

| Business Type         | Skill Loaded Today    | Notes                |
| --------------------- | --------------------- | -------------------- |
| `electronics`         | `copy-electronics-ng` | ✅ Already dedicated |
| `events`              | `copy-events-ng`      | ✅ Already dedicated |
| `fashion`             | `copy-verticals-ng`   | 🟡 Merged — diluted  |
| `beauty`              | `copy-verticals-ng`   | 🟡 Merged — diluted  |
| `food`                | `copy-verticals-ng`   | 🟡 Merged — diluted  |
| `b2b`                 | `copy-verticals-ng`   | 🟡 Merged — diluted  |
| `general` / `unknown` | `copy-verticals-ng`   | ✅ Correct fallback  |

**Routing code:** `buildSkillList()` in `src/lib/ai/service.ts` (lines 340–369)

---

## Target Architecture

| Business Type         | Dedicated Skill       | Policy Guard | Notes                 |
| --------------------- | --------------------- | ------------ | --------------------- |
| `fashion`             | `copy-fashion-ng`     | No           | Split from verticals  |
| `beauty`              | `copy-beauty-ng`      | No           | Split from verticals  |
| `food`                | `copy-food-ng`        | No           | Split from verticals  |
| `b2b`                 | `copy-b2b-ng`         | No           | Split from verticals  |
| `real_estate`         | `copy-real-estate-ng` | No           | New vertical          |
| `health_wellness`     | `copy-health-ng`      | **Yes**      | New vertical          |
| `finance`             | `copy-finance-ng`     | **Yes**      | New vertical          |
| `electronics`         | `copy-electronics-ng` | No           | Already done ✅       |
| `events`              | `copy-events-ng`      | No           | Already done ✅       |
| `general` / `unknown` | `copy-verticals-ng`   | No           | Fallback — keep as-is |

---

## Phase 1 — Expand `detected_business_type`

> Focus: Add new types to the type union and triage detection
> Files: `src/lib/ai/types.ts`, `src/lib/ai/prompts.ts`

### 1.1 `src/lib/ai/types.ts` — Expand Union

```typescript
// Before
detected_business_type:
  | "fashion" | "beauty" | "food" | "electronics"
  | "events" | "b2b" | "general" | "unknown";

// After
detected_business_type:
  | "fashion" | "beauty" | "food" | "electronics"
  | "events" | "b2b"
  | "real_estate"      // NEW — property, apartments, land, rentals
  | "health_wellness"  // NEW — gym, supplements, fitness, therapy, yoga
  | "finance"          // NEW — loans, insurance, investment, fintech, savings
  | "general" | "unknown";
```

### 1.2 `src/lib/ai/prompts.ts` — Extend Triage Detection Examples

In `TRIAGE_INSTRUCTION` under `extracted.businessType`, add detection signal examples:

```
real_estate:      "apartment", "land", "property", "house for sale", "estate agent",
                  "rent", "letting", "housing estate", "buy land"

health_wellness:  "gym", "protein powder", "supplements", "vitamins", "yoga",
                  "fitness coach", "therapy", "wellness", "physiotherapy", "herbal"

finance:          "loan", "investment", "insurance", "savings", "interest rate",
                  "fintech", "borrow money", "mutual fund", "microfinance", "pension"
```

---

## Phase 2 — Create Dedicated Skill Files

> Focus: Author vertical-specific skill markdown files
> Files: New files in `src/lib/ai/skill-definitions/`

Each skill file follows the same YAML frontmatter + rule structure as existing skills.

### 2.1 `copy-fashion-ng` — Fashion & Clothing

**File:** `src/lib/ai/skill-definitions/copy-fashion-ng/SKILL.md`

**Core specializations to include:**

- Scarcity hooks: "Only 3 left", "Limited sizes", "Back in stock"
- Social proof hooks: "100+ sold this week", "Customers love this"
- Style/fit language: Ankara, Aso-ebi, bodycon, modest wear, thrift
- Seasonal context: Back-to-school, festive season, wedding season
- Price anchoring: Compare original vs. sale price in copy
- CTA defaults: "Shop Now", "Order Today", "Get Yours"
- WhatsApp format: "I want to order the [item name] in [size/color]"

### 2.2 `copy-beauty-ng` — Beauty, Skincare & Cosmetics

**File:** `src/lib/ai/skill-definitions/copy-beauty-ng/SKILL.md`

**Core specializations to include:**

- Skin type segmentation: oily, dry, dark skin, hyperpigmentation, acne-prone
- Ingredient proof points: "With Vitamin C", "Kojic acid formula", "Paraben-free"
- Result-oriented framing: "Visible glow in 7 days", "Fade dark spots in 2 weeks"
- Before/after framing: Reference transformation without before/after imagery claim
- Trust signals: "Dermatologist tested", "100+ 5-star reviews", "Used by MUAs"
- Meta policy: No direct "cure" or medical claim language
- CTA defaults: "Shop Now", "Order Your Kit", "Get Glowing"
- WhatsApp format: "Hi, I want to order [product name] for [skin concern]"

### 2.3 `copy-food-ng` — Food, Restaurants & Delivery

**File:** `src/lib/ai/skill-definitions/copy-food-ng/SKILL.md`

**Core specializations to include:**

- Hunger/craving trigger language: "Hot, fresh", "Crispy", "Smoky", "Just made"
- Delivery speed as CTA: "Order in 10 mins", "Delivered in 30 mins or less"
- Portion/value anchoring: "Full plate for ₦2,500", "Feeds 2 for ₦4,000"
- Local area hooks: Name the LGA/area in copy for hyperlocal feel
- Time-based hooks: "Lunch special", "Late night orders open", "Weekend deals"
- CTA defaults: "Order Now", "Place Your Order", "Chat to Order"
- WhatsApp format: "Hi, I'd like to order [meal name] for delivery to [area]"

### 2.4 `copy-b2b-ng` — B2B & Professional Services

**File:** `src/lib/ai/skill-definitions/copy-b2b-ng/SKILL.md`

**Core specializations to include:**

- ROI/outcome framing: "Save 5 hours/week", "Reduce cost by 30%", "Scale faster"
- Decision-maker targeting: Founders, CFOs, HR managers, procurement officers
- Work position & industry keyword emphasis (B2B targeting mode)
- Professional tone: No pidgin by default unless client explicitly uses it
- Trust signals: "Used by 200+ SMEs", "ISO certified", "Trusted by [name]"
- Credibility-first copy structure: Lead with proof, then offer
- CTA defaults: "Get a Free Quote", "Book a Demo", "Talk to Us"
- WhatsApp format: "Hi, I'm interested in [service]. We're a [company size] [industry] company."

### 2.5 `copy-real-estate-ng` — Real Estate & Property

**File:** `src/lib/ai/skill-definitions/copy-real-estate-ng/SKILL.md`

**Core specializations to include:**

- Location premium framing: "Prime Lekki location", "2 mins from [landmark]"
- Lifestyle aspiration: "Wake up to this view", "Your family's forever home"
- Payment plan hooks: "Flexible payment plan available", "Pay in 12 months"
- Size/spec anchoring: Bedrooms, sq footage, parking, security
- Urgency signals: "Only 4 units left", "Off-plan pricing ends [date]"
- CTA defaults: "Schedule a Tour", "Get Full Details", "Book a Viewing"
- WhatsApp format: "Hi, I'm interested in the [property name/type] in [area]. Please send more details."

### 2.6 `copy-health-ng` — Health & Wellness (+ Policy Guard)

**File:** `src/lib/ai/skill-definitions/copy-health-ng/SKILL.md`

**Core specializations to include:**

- Outcome framing (within Meta compliance): "Feel stronger", "More energy", "Better sleep" — not "cures X"
- Transformation language: "Support your journey", "Build the body you want"
- Community/coach positioning: "Join 500+ members", "1-on-1 coaching available"
- Meta policy (ALWAYS include `policy-guard-ng` for this type): No medical claims, no "cure", no before/after imagery claims
- Supplement rules: "Not intended to diagnose, treat..." awareness — keep claims general
- CTA defaults: "Learn More", "Join Now", "Book a Free Session"

> ⚠️ `policy-guard-ng` is **required** alongside this skill. Add to `buildSkillList()`.

### 2.7 `copy-finance-ng` — Finance & Fintech (+ Policy Guard)

**File:** `src/lib/ai/skill-definitions/copy-finance-ng/SKILL.md`

**Core specializations to include:**

- ROI/savings framing: "Earn up to X% returns", "Save ₦X monthly"
- Trust signals: "CBN licensed", "100% secure", "Used by X customers"
- Simplicity hooks: "Apply in 5 minutes", "No collateral required"
- Regulatory awareness: Avoid guaranteed return language
- Target segments: Salary earners, SME owners, students, market traders
- CTA defaults: "Apply Now", "Get Started", "Check Your Eligibility"

> ⚠️ `policy-guard-ng` is **required** alongside this skill. Add to `buildSkillList()`.

---

## Phase 3 — Register Skills & Update Routing

> Focus: Create skill assistants in OpenAI and wire routing
> Files: `src/lib/ai/service.ts`, `.env.local`, deployment env vars

### 3.1 Register Skills in OpenAI

For each new skill file, create a new OpenAI Assistant with the skill's content as the system prompt. Record the resulting assistant ID.

### 3.2 Add Env Vars

```bash
# .env.local (and deployment secrets)
SKILL_ID_COPY_FASHION_NG=asst_...
SKILL_ID_COPY_BEAUTY_NG=asst_...
SKILL_ID_COPY_FOOD_NG=asst_...
SKILL_ID_COPY_B2B_NG=asst_...
SKILL_ID_COPY_REAL_ESTATE_NG=asst_...
SKILL_ID_COPY_HEALTH_NG=asst_...
SKILL_ID_COPY_FINANCE_NG=asst_...
```

### 3.3 `src/lib/ai/service.ts` — Update `buildSkillList()`

Replace the current vertical routing block with a `verticalSkillMap` lookup:

```typescript
// Replaces the current if/else ladder inside buildSkillList()

const verticalSkillMap: Record<string, string | undefined> = {
  fashion: process.env.SKILL_ID_COPY_FASHION_NG,
  beauty: process.env.SKILL_ID_COPY_BEAUTY_NG,
  food: process.env.SKILL_ID_COPY_FOOD_NG,
  b2b: process.env.SKILL_ID_COPY_B2B_NG,
  real_estate: process.env.SKILL_ID_COPY_REAL_ESTATE_NG,
  health_wellness: process.env.SKILL_ID_COPY_HEALTH_NG,
  finance: process.env.SKILL_ID_COPY_FINANCE_NG,
  electronics: process.env.SKILL_ID_COPY_ELECTRONICS_NG, // existing
  events: process.env.SKILL_ID_COPY_EVENTS_NG, // existing
};

const verticalSkillId =
  verticalSkillMap[businessType] ?? process.env.SKILL_ID_COPY_VERTICALS_NG; // fallback for general/unknown

if (verticalSkillId) skills.push(verticalSkillId);

// Extend policy guard to cover new regulated types
const policyGuardTypes = [
  "finance",
  "health",
  "betting",
  "supplements",
  "health_wellness",
  "finance",
];
if (
  policyGuardTypes.includes(businessType) &&
  process.env.SKILL_ID_POLICY_GUARD_NG
) {
  skills.push(process.env.SKILL_ID_POLICY_GUARD_NG);
}
```

---

## Phase 4 (Future) — Model-Level Routing

> Status: ⬜ Research required — do not implement until copy quality is benchmarked

Once vertical skills are stable, route simpler verticals to `gpt-5-mini` for further cost reduction. Add a `preferredModel` field to a future `AgentConfig` type:

```typescript
// src/lib/ai/types.ts (future addition)
export interface AgentConfig {
  verticalSkillId: string;
  policyGuardRequired: boolean;
  preferredModel?: "gpt-5.2" | "gpt-5-mini"; // gpt-5-mini for food/fashion
}
```

Simple verticals (food, fashion) rarely need deep reasoning — `gpt-5-mini` is sufficient. B2B, finance, and real estate benefit from the stronger model.

**Pre-condition:** Run A/B quality benchmarks on 50+ campaigns per vertical before switching models.

---

## Execution Order

```
Step 1   src/lib/ai/types.ts              — Expand detected_business_type union
Step 2   src/lib/ai/prompts.ts            — Add real_estate/health_wellness/finance triage signals
Step 3   skill-definitions/copy-fashion-ng/SKILL.md   — Author skill file
Step 4   skill-definitions/copy-beauty-ng/SKILL.md    — Author skill file
Step 5   skill-definitions/copy-food-ng/SKILL.md      — Author skill file
Step 6   skill-definitions/copy-b2b-ng/SKILL.md       — Author skill file
Step 7   skill-definitions/copy-real-estate-ng/SKILL.md — Author skill file
Step 8   skill-definitions/copy-health-ng/SKILL.md    — Author skill file (requires policy guard)
Step 9   skill-definitions/copy-finance-ng/SKILL.md   — Author skill file (requires policy guard)
Step 10  OpenAI Console                  — Create 7 new assistants, record IDs
Step 11  .env.local + deployment         — Add 7 new SKILL_ID_* env vars
Step 12  src/lib/ai/service.ts           — Replace if/else with verticalSkillMap in buildSkillList()
Step 13  Verify token counts             — Check ai_requests table before/after
Step 14  Quality review                  — Manually compare 5 campaigns per vertical
```

---

## Definition of Done

- [ ] `detected_business_type` union includes all 10 types
- [ ] Triage correctly classifies `real_estate`, `health_wellness`, `finance` on test inputs
- [ ] 7 new skill files authored and committed
- [ ] 7 new OpenAI assistants created and env vars set
- [ ] `buildSkillList()` uses `verticalSkillMap` — no if/else vertical ladder
- [ ] Beauty campaign loads `copy-beauty-ng`, not `copy-verticals-ng` (verified via `ai_requests` log)
- [ ] Health/finance campaigns load policy guard alongside their vertical skill
- [ ] `general` / `unknown` campaigns still load `copy-verticals-ng` (fallback unchanged)
- [ ] Token count per TYPE_A call reduced by ≥ 30% vs. baseline for verticals with dedicated skill
- [ ] `copy-verticals-ng` is NOT deleted — remains as fallback
