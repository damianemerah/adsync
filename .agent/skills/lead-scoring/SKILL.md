---
name: lead-scoring
description: Manages Tenzu's SME-adapted lead scoring model — prioritizing which ads and targeting profiles to optimize based on chat-to-sale conversion rate, cost-per-chat, and revenue-per-ad. Use when building ad performance ranking, optimization suggestions, "best audience" recommendations, or any feature that helps the SME identify which ads or targeting profiles are worth scaling.
---

# Lead Scoring Skill

## What "Lead Scoring" Means for Tenzu

Traditional CRM lead scoring (Salesforce, HubSpot) ranks individual prospects. Tenzu's context is different: **there is no CRM, the "leads" are anonymous ad clickers, and the SME is a single owner on a phone.**

Instead, Tenzu scores **ad campaigns and targeting profiles** — answering the question: _"Which of your ads is actually making you money, and which is wasting ₦?"_

---

## The Scoring Model

Score each campaign on a 0–100 scale using three signals:

### Signal 1: Revenue-Per-Chat (Weight: 50%)

Most direct indicator of ad quality.

```
revenue_per_chat = campaigns.revenue_ngn / MAX(campaigns.whatsapp_clicks, 1)
```

> Higher = people who clicked this ad were buying-intent buyers, not just curious ones.

### Signal 2: Cost-Per-Chat (Weight: 30%)

Efficiency of the targeting.

```
cost_per_chat = campaigns.spend_cents / 100 / MAX(campaigns.whatsapp_clicks, 1)
```

> Lower = targeting is efficient and reaching the right people per Naira spent.

### Signal 3: Chat-to-Sale Rate (Weight: 20%)

Closing rate — how many chatters actually bought.

```
chat_to_sale_rate = campaigns.sales_count / MAX(campaigns.whatsapp_clicks, 1)
```

> Higher = stronger product-market fit for this specific creative/audience combination.

### Normalized Score Formula

```typescript
function scoreCampaign(campaign: Campaign, allCampaigns: Campaign[]): number {
  // 1. Revenue per chat (higher is better)
  const revPerChat =
    campaign.revenue_ngn / Math.max(campaign.whatsapp_clicks, 1);
  const maxRevPerChat = Math.max(
    ...allCampaigns.map((c) => c.revenue_ngn / Math.max(c.whatsapp_clicks, 1)),
  );
  const revScore = maxRevPerChat > 0 ? (revPerChat / maxRevPerChat) * 50 : 0;

  // 2. Cost per chat (lower is better — invert)
  const costPerChat =
    campaign.spend_cents / 100 / Math.max(campaign.whatsapp_clicks, 1);
  const minCostPerChat = Math.min(
    ...allCampaigns.map(
      (c) => c.spend_cents / 100 / Math.max(c.whatsapp_clicks, 1),
    ),
  );
  const costScore = costPerChat > 0 ? (minCostPerChat / costPerChat) * 30 : 0;

  // 3. Chat-to-sale rate (higher is better)
  const chatToSale =
    campaign.sales_count / Math.max(campaign.whatsapp_clicks, 1);
  const maxChatToSale = Math.max(
    ...allCampaigns.map((c) => c.sales_count / Math.max(c.whatsapp_clicks, 1)),
  );
  const saleScore = maxChatToSale > 0 ? (chatToSale / maxChatToSale) * 20 : 0;

  return Math.round(revScore + costScore + saleScore);
}
```

---

## Score Interpretation (UI Labels)

| Score  | Label   | Color Token        | Action                                             |
| ------ | ------- | ------------------ | -------------------------------------------------- |
| 75–100 | 🔥 Hot  | `text-success`     | "Scale this ad — it's working."                    |
| 50–74  | ✅ Good | `text-primary`     | "This ad is profitable. Run it longer."            |
| 25–49  | ⚠️ Weak | `text-warning`     | "This ad needs a better audience or new creative." |
| 0–24   | ❌ Cold | `text-destructive` | "Pause this ad — it's losing you money."           |

---

## Where to Use This

- **Campaign list:** Show score badge on each campaign row
  → File: `src/components/campaigns/campaign-card.tsx`

- **Campaign detail header:** Show score + plain-language interpretation
  → File: `src/app/(authenticated)/campaigns/[id]/page.tsx`

- **"Best Audience" recommendation in wizard:** Pre-fill targeting profile from highest-scored past campaign
  → File: `src/components/campaigns/new/steps/audience-chat-step.tsx`
  → Use: `targeting_profiles` table, sort by average campaign score for org

- **ROI overview page:** Rank all campaigns from best to worst score
  → File: `src/components/dashboard/roi-overview.tsx`

---

## Key Rules

- **Minimum data requirement:** A campaign needs at least 10 WhatsApp clicks before scoring. Below 10, show "Not enough data yet."
- **Zero revenue is not automatic failure:** A new campaign 24h old with 0 sales is not "Cold" — use `started_at` to exclude campaigns under 48h old from scoring.
- **Scores are relative, not absolute.** They only have meaning when compared across the org's own campaigns — not against industry benchmarks.
- **Never show scores to external viewers** — scores use internal spend data, keep them org-scoped.

---

## Implementation Status

| Item                                                                       | Status         |
| -------------------------------------------------------------------------- | -------------- |
| `scoreCampaign()` utility                                                  | ⬜ Not Started |
| Score badge on campaign list                                               | ⬜ Not Started |
| Score interpretation in campaign detail                                    | ⬜ Not Started |
| "Best Audience" pre-fill from top-scored campaign                          | ⬜ Not Started |
| ROI overview ranked list                                                   | ⬜ Not Started |
| Feed 🔥 Hot campaigns (score ≥ 75) to `analyze-assets` cron (Phase 3)     | ⬜ Phase 3     |

## Phase 3 Connection — Score as Vision Loop Trigger

The 🔥 Hot tier (score ≥ 75) is the entry condition for the Phase 3 AI Vision Feedback Loop.

When a campaign scores Hot, the `analyze-assets` cron job picks it up, retrieves its ad
creative from Supabase Storage, and passes it to `src/lib/ai/vision-analyzer.ts` for
GPT-4o Vision analysis. The extracted visual traits (patterns, colour palette, copy hooks)
are written to `organizations.design_insights JSONB` and injected into future Flux image
generation calls via `compileContextPrompt()`.

Think of this as: **"your winning ad teaches Tenzu how to make the next winning ad."**

The scoring model itself does not change for Phase 3 — the phase simply adds a consumer
of the existing score output. The `scoreCampaign()` function can be reused as-is.

See `ai-context/SKILL.md` (Phase 3 Roadmap) and `openai-api/SKILL.md` (GPT-4o Vision
pattern) for the full implementation plan.
