---
name: momentum-tracking
description: Manages Tenzu's stalled-ad detection system. Use when building logic to detect when an ad has gone quiet (no chats in 72h, no sales recorded in 5+ days), generating re-engagement prompts for the SME, or triggering follow-up suggestions inside the dashboard. Think of this as "deal momentum" but for ads — an early warning system so the SME knows when to act.
---

# Momentum Tracking Skill

## What Is Momentum Tracking?

In traditional sales tools, this is called "deal stall detection" — alerting the rep when a lead hasn't been touched in N days. Tenzu's equivalent is **detecting when an ad has gone quiet and prompting the SME to take action.**

Nigerian SMEs often launch an ad, check it once, and then forget it. A stalled ad silently drains the budget. Momentum tracking surfaces the problem with a clear, actionable prompt.

---

## Stall Definitions

| Stall Type        | Condition                                                   | Severity | Suggested Action                                                         |
| ----------------- | ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| **Click Drought** | Active campaign, 0 new clicks in 72h                        | Medium   | Suggest refreshing creative or expanding audience                        |
| **Chat Silence**  | >5 clicks but 0 WhatsApp conversations in 48h               | High     | Suggest checking WhatsApp Business availability, try a new message offer |
| **Revenue Stall** | >10 chats but 0 recorded sales in 5 days                    | High     | Suggest recording a sale (Mark as Sold), or switching the offer or price |
| **Spend Waste**   | Campaign spend_cents ≥ 50% of total budget, sales_count = 0 | Critical | Pause the ad and rebuild creative                                        |

---

## Detection Logic

```typescript
// src/lib/momentum.ts

import { differenceInHours, differenceInDays } from "date-fns";

export type StallType =
  | "click_drought"
  | "chat_silence"
  | "revenue_stall"
  | "spend_waste";

export interface StallSignal {
  type: StallType;
  severity: "medium" | "high" | "critical";
  message: string;
  cta: string;
  ctaHref: string;
}

export function detectStalls(campaign: Campaign): StallSignal[] {
  const signals: StallSignal[] = [];
  const now = new Date();

  // Only check active (running) campaigns
  if (campaign.status !== "ACTIVE") return signals;

  // 1. Click Drought
  const hoursSinceLastClick = campaign.last_click_at
    ? differenceInHours(now, new Date(campaign.last_click_at))
    : differenceInHours(now, new Date(campaign.created_at));

  if (campaign.total_link_clicks === 0 || hoursSinceLastClick > 72) {
    signals.push({
      type: "click_drought",
      severity: "medium",
      message: "Your ad hasn't gotten any clicks in 3 days.",
      cta: "Refresh Creative",
      ctaHref: `/campaigns/${campaign.id}/edit`,
    });
  }

  // 2. Chat Silence (clicks without WhatsApp chats)
  if (campaign.total_link_clicks >= 5 && campaign.whatsapp_clicks === 0) {
    signals.push({
      type: "chat_silence",
      severity: "high",
      message:
        "People are clicking but not messaging you. Something is blocking the conversation.",
      cta: "Check WhatsApp Link",
      ctaHref: `/campaigns/${campaign.id}`,
    });
  }

  // 3. Revenue Stall (chats without sales)
  const daysSinceCreated = differenceInDays(now, new Date(campaign.created_at));
  if (
    campaign.whatsapp_clicks >= 10 &&
    campaign.sales_count === 0 &&
    daysSinceCreated >= 5
  ) {
    signals.push({
      type: "revenue_stall",
      severity: "high",
      message:
        "You've had chats but no recorded sales in 5 days. Did you close any deals?",
      cta: "Record a Sale",
      ctaHref: `/campaigns/${campaign.id}`,
    });
  }

  // 4. Spend Waste (half budget gone, zero sales)
  const budgetCents = campaign.daily_budget_cents * daysSinceCreated;
  const spendPercent = budgetCents > 0 ? campaign.spend_cents / budgetCents : 0;
  if (
    spendPercent >= 0.5 &&
    campaign.sales_count === 0 &&
    daysSinceCreated >= 3
  ) {
    signals.push({
      type: "spend_waste",
      severity: "critical",
      message:
        "You've spent half your budget with no sales. This ad needs a new creative.",
      cta: "Pause & Rebuild",
      ctaHref: `/campaigns/${campaign.id}/edit`,
    });
  }

  return signals;
}
```

---

## UI Integration Points

### 1. Campaign List — Stall Badge

Show the highest-severity stall signal per campaign as a badge on the campaign card.

```
⚠️ Going Quiet   → medium
🔴 No Chats      → high
🔴 Check Results → high
💸 Losing Money  → critical
```

File: `src/components/campaigns/campaign-card.tsx`

### 2. Campaign Detail — Momentum Alert Banner

Show the full stall message + CTA as an alert below the campaign header.

```tsx
{
  stalls.length > 0 && (
    <Alert variant="warning">
      <AlertTitle>Action Needed</AlertTitle>
      <AlertDescription>{stalls[0].message}</AlertDescription>
      <Button asChild>
        <Link href={stalls[0].ctaHref}>{stalls[0].cta}</Link>
      </Button>
    </Alert>
  );
}
```

File: `src/app/(authenticated)/campaigns/[id]/page.tsx`

### 3. Dashboard — "Needs Attention" Section

List all campaigns with active stall signals, sorted by severity (critical first).

File: `src/components/dashboard/needs-attention.tsx`

---

## Notification System (Phase 3)

For Growth/Agency tier users, stall signals trigger WhatsApp notifications:

- **Click Drought (72h):** WhatsApp message to org's registered number
- **Revenue Stall (5 days):** WhatsApp message with "Record a sale" CTA
- **Spend Waste (50% budget, 0 sales):** Urgent WhatsApp alert

Check `tierConfig.features.whatsappAlerts` before sending. See `tier-strategy/SKILL.md`.

---

## Key Rules

- **Only check `ACTIVE` campaigns.** Paused, completed, or failed campaigns do not trigger stall signals.
- **Minimum age gate:** Do not flag any stall for campaigns under 24h old. Give the ad time to warm up.
- **Show at most 1 banner per campaign.** Display the highest severity signal only — don't overwhelm.
- **Never auto-pause an ad.** Signals are advisory. The SME always decides to pause or continue.

---

## Phase 3 Connection — Winning Ad Visual Analysis

Momentum tracking detects both stalled campaigns (problems) and high-velocity campaigns
(winners). The Phase 3 vision feedback loop consumes the **winner** signal.

A campaign is a candidate for the `analyze-assets` cron job when it meets all of:

- Status = `ACTIVE`
- `revenue_ngn > 0` (at least one sale recorded)
- `lead-scoring` score ≥ 75 (🔥 Hot — see `lead-scoring/SKILL.md`)
- Has an associated ad creative image in Supabase Storage

The cron job passes the winning ad image to `vision-analyzer.ts` (GPT-4o Vision), extracts
visual traits (patterns, palette, themes, copy hooks), and writes them to
`organizations.design_insights JSONB`. Future Flux image generations use these traits as
additional context — the loop from "ad performed well" to "next ad looks more like that."

This means the same attribution data that powers stall detection also powers creative
improvement — the feedback loop closes here.

See `ai-context/SKILL.md` (Phase 3 Roadmap) and `openai-api/SKILL.md` (vision-analyzer
pattern) for the full implementation plan.

## Implementation Status

| Item                                                                      | Status         |
| ------------------------------------------------------------------------- | -------------- |
| `detectStalls()` utility in `src/lib/momentum.ts`                         | ⬜ Not Started |
| Stall badge on campaign list                                               | ⬜ Not Started |
| Momentum alert banner in campaign detail                                   | ⬜ Not Started |
| "Needs Attention" dashboard section                                        | ⬜ Not Started |
| WhatsApp notification for stalls (Growth+)                                 | ⬜ Phase 3     |
| Feed 🔥 Hot campaigns to `analyze-assets` cron (Phase 3 vision loop)      | ⬜ Phase 3     |
