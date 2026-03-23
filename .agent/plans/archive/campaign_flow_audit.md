# Tenzu × Tenzu — Campaign Flow Audit & Repositioning Plan

> Compared against: _SME Psychology-First Campaign Design_ (Tenzu brief)

---

## 1. What You've Already Built (Credit Where It's Due)

The codebase is significantly ahead of where the Tenzu doc assumes you are. Before listing gaps, here's what's **genuinely functional**:

| Feature                                                  | Status        | Location                                   |
| -------------------------------------------------------- | ------------- | ------------------------------------------ |
| 4-step campaign wizard                                   | ✅ Working    | `campaigns/new/page.tsx` + step components |
| Full Meta API chain (campaign → ad set → ad image → ad)  | ✅ Working    | `actions/campaigns.ts`                     |
| AI audience chat (interests, behaviors, locations, copy) | ✅ Working    | `audience-chat-step.tsx`                   |
| Nigeria 2025 benchmarks (CPM, CTR, WA funnel)            | ✅ Documented | `lib/intelligence/benchmarks.ts`           |
| Budget estimator (reach, conversations, CPC)             | ✅ Working    | `lib/intelligence/estimator.ts`            |
| Budget tier presets (Starter/Recommended/Pro)            | ✅ Working    | `budget-launch-step.tsx`                   |
| CTA auto-mapping by objective                            | ✅ Working    | `stores/campaign-store.ts`                 |
| Attribution links (WhatsApp + website tracking)          | ✅ Working    | `lib/attribution.ts`                       |
| Pre-launch validation rules                              | ✅ Working    | `lib/intelligence/pre-launch-rules.ts`     |
| ROAS predictor module                                    | ✅ Built      | `lib/intelligence/roas-predictor.ts`       |
| Smart defaults engine                                    | ✅ Built      | `lib/intelligence/smart-defaults.ts`       |
| Post-launch rules engine                                 | ✅ Built      | `lib/intelligence/post-launch-rules.ts`    |
| AI inline image generation during chat                   | ✅ Working    | `audience-chat-step.tsx`                   |
| WhatsApp notifications                                   | ✅ Working    | `notifications/sender.ts`                  |
| Subscription gating                                      | ✅ Working    | `actions/campaigns.ts`                     |

---

## 2. What's Missing, Dummy, or Disconnected

### 🔴 Critical — Blocking "Intelligence Platform" Claim

**A. `computeSmartDefaults` is never called**
The `lib/intelligence/smart-defaults.ts` file exists and is well-written, but nothing in the wizard actually calls it. Budget defaults are hardcoded at `₦5,000` in `campaign-store.ts`. When a user picks an objective, no smart defaults are applied.

- **Fix:** Call `computeSmartDefaults` in `GoalPlatformStep` on objective selection, and pipe results into `updateDraft()`.

**B. `predictROAS` / `updateROAS` are completely unwired** ⚠️ **RESOLVED (Mar 2026) — ROAS prediction UI was intentionally removed from BudgetLaunchStep.** The `roas-predictor.ts` file still exists but is no longer wired to any UI. This was a deliberate product decision, not a bug. Do not re-add.

- ~~Fix: Call `predictROAS` in `BudgetLaunchStep` on budget change and display predicted ROAS + confidence.~~

**C. `evaluatePostLaunchRules` is never triggered**
`lib/intelligence/post-launch-rules.ts` is a fully designed engine that presumably generates suggestions and auto-actions (pause underperforming campaigns, scale good ones). But there's no cron job, no webhook handler, and no UI reading from it.

- **Fix:** Wire into the campaigns sync cron (`/api/cron/health-check`) or add a post-sync call after `syncCampaigns`.

**D. `syncCampaignInsights` and `syncCampaignAds` are never called**
Both actions exist in `campaigns.ts` but have no trigger — no cron, no UI button, no webhook. The `campaign_metrics` table is never populated.

- **Fix:** Add a cron route or call from the campaign sync flow.

---

### 🟠 High Priority — UX Cognitive Overload

**E. No "What are you selling?" first moment**
The Tenzu brief's core insight is that SMEs struggle _before_ Step 1. Your wizard starts with **Goal selection** — an abstract UX concept most Nigerian SMEs don't map to their mental model. The business description that powers the AI (the `aiPrompt`) is only asked in the chat in Step 2.

- **Current:** `Goal → Platform → AI Chat (asks "what are you promoting?") → Creative → Budget`
- **Should be:** `"What are you selling?" → AI classifies → Everything else auto-fills`

**F. Budget recommendation is input-first, not outcome-first**
`BudgetLaunchStep` shows estimated reach/conversations _after_ you type a budget. The Tenzu brief specifically asks for outcome-first language:

> _"To generate ~20–35 WhatsApp conversations, we recommend ₦12,000 over 5 days."_

Right now it's: `"Type a budget → see what you might get"`.  
It should be: `"Tell us your goal → we recommend the budget."`

- **Fix:** Invert the UI. Show 3 outcome-oriented tiers (e.g. "Test: ~5 conversations", "Grow: ~20 conversations", "Scale: ~60 conversations") before the manual input.

**G. Audience summary panel is hidden on mobile**
`audience-chat-step.tsx` wraps the right panel in `className="hidden lg:block"`. Nigerian SMEs are primarily mobile users. The entire audience review experience is invisible on phones.

- **Fix:** Collapse it into a bottom sheet or a tab below the chat on mobile.

**H. "Launch Confidence Meter" is static**
The `BudgetLaunchStep` shows "Ad Account Active" and "Subscription Active" always as success — even when they might not be. The creative check uses `selectedCreatives.length > 0` which works, but it's a simple boolean, not a quality score.

- **Fix:** Make the check items actually query Supabase in real-time, and add a quality warning if the creative doesn't meet Meta's aspect ratio requirements.

---

### 🟡 Medium Priority — Missing Intelligence Surfaces

**I. No image quality scoring**
The Tenzu brief lists: text density, lighting, face visibility, color contrast, social proof signals — scored 1-100. Nothing like this exists.

- `creative-step.tsx` is a pure grid picker with no AI evaluation.
- The `probe-image-size` library is already used in `ai-images.ts` for compliance checking.
- **Fix:** When an image is selected, call a lightweight scoring endpoint (can use OpenAI Vision with a structured prompt to return a score + improvement tips).

**J. No "broad targeting" recommendation UX**
The Tenzu brief recommends: if research shows broad targeting outperforms interest-based for Nigerian SMEs, show:

> _"Most beauty businesses in Lagos see better results with broad targeting."_

Currently the AI always suggests interests and the user can only remove them. There's no "go broad" path.

- **Fix:** Add a "Use Broad Targeting" toggle in the audience summary panel that clears interests and shows a benchmark-backed explanation.

**K. No closed-loop learning**
The `whatsapp_sales` table and `link_clicks` table exist — this is the raw material for learning. But nothing feeds these signals back into `benchmarks.ts` or into future recommendations. The intelligence layer uses hardcoded benchmarks.

- **Fix (v2):** Build an org-level performance table that updates CPM/CTR from real campaign data and weights smart defaults by past performance.

---

### 🟢 Low Priority — Polish & Consistency

**L. `applyTemplate` is a stub**
`useCampaignStore` has `selectedTemplate` state and `applyTemplate()` action, but the action only calls `set({ selectedTemplate: templateId })` — nothing else. No templates are applied to copy, targeting, or creative. The store version was bumped to 3 with migration, suggesting this was planned.

**M. Creative Step (Step 3) has no AI assistance**
When you arrive at `creative-step.tsx`, you're on your own. The AI image generation is available _in the chat_ (Step 2), but if you skip it or want to redo it, the Creative step offers no AI help — just a grid and upload button. There's no "Generate with AI" path from Step 3.

**N. Copy editor not pre-filled from AI**
`creative-step.tsx` renders a copy editor with `adCopy.headline` and `adCopy.primary` from the store — these _are_ pre-filled by the AI in Step 2. But if the user navigates directly to Step 3 or clears the chat, they see empty fields with no generation option. A "Generate Copy with AI" button is missing here.

**O. WhatsApp number UX is broken by default**
In `creative-step.tsx`, the destination input shows `"080 1234 5678"` as placeholder and the Naira-formatting happens server-side in `launchCampaign`. But there's no real-time format feedback (e.g., flag if the number is invalid length). The pre-launch validation catches it but shows the error as a toast at the very end.

---

## 3. Where Tenzu is Ahead of Tenzu

| Tenzu Concept                                         | Tenzu Status              |
| ------------------------------------------------------ | -------------------------- |
| Product category → auto-classifies targeting           | ❌ Not implemented         |
| Outcome-first budget framing ("~20 conversations")     | ❌ Inverted — budget-first |
| Broad targeting recommendation with benchmark evidence | ❌ Not surfaced            |
| Creative image scoring (AI vision score 1-100)         | ❌ Not implemented         |
| Closed-loop learning from sales/clicks                 | ❌ No feedback loop        |
| ROAS predictor shown to user                           | ❌ Built but not surfaced  |
| Smart defaults applied on objective selection          | ❌ Built but not called    |
| Post-launch rule engine → proactive suggestions        | ❌ Built but not triggered |

---

## 4. Tenzu UX Repositioning — Recommended New Flow

```
┌─────────────────────────────────────────────┐
│  STEP 0 (NEW): What are you selling?        │
│  Input: "Luxury wigs" / "Ankara dresses"    │
│  AI → classify category → pre-fill context │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  STEP 1: Goal + Platform (existing)         │
│  + Smart defaults applied immediately       │
│  + ROAS prediction shown per objective      │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  STEP 2: Audience (AI Chat — existing)      │
│  + Add "Go Broad" toggle with evidence      │
│  + Mobile-visible audience summary          │
│  + Image generation stays here             │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  STEP 3: Creative (existing)                │
│  + AI image scoring on selection            │
│  + "Generate with AI" button here too       │
│  + Pre-filled copy with edit option         │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  STEP 4: Budget — INVERTED to outcome-first │
│  "To get ~20 conversations → ₦8,000/5 days" │
│  + Real ROAS predictor output shown         │
│  + Dynamic system check (not static)        │
└─────────────────────────────────────────────┘
```

---

## 5. Immediate Action Priority (Quick Wins)

1. **Wire `computeSmartDefaults`** into `GoalPlatformStep` — 1 hour, zero new infrastructure needed.
2. **Wire `predictROAS`** into `BudgetLaunchStep` and display — 2 hours.
3. **Invert budget step UX**: show outcome tiers ("~X conversations") before the number input — 3 hours, no backend changes.
4. **Fix mobile audience summary**: convert right panel to bottom drawer on mobile — 4 hours.
5. **Trigger `evaluatePostLaunchRules`** from the health-check cron — 2 hours.
6. **Add "Generate with AI" button to Step 3** — 2 hours.

All 6 items use existing infrastructure. Zero new services needed. Combined: ~14 hours of work to unlock what reads like a much more intelligent product.

---

## 6. What Makes This Fundable vs. Just Functional

| "Just Functional"                  | "Fundable Intelligence Platform"                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| User picks budget → sees estimates | System recommends budget based on desired outcome                                      |
| AI generates interests on request  | System applies smart defaults before user even asks                                    |
| ROAS predictor module exists       | ROAS prediction shown at every budget decision point                                   |
| Post-launch rules exist            | Rules trigger proactive notifications ("Your campaign is underperforming, here's why") |
| Sales table exists                 | Sales data feeds back into future recommendations                                      |
| Nigerian benchmarks hardcoded      | Benchmarks update from real org campaign history                                       |

The intelligence layer is 70% built. The gap is surfacing it to the user.
