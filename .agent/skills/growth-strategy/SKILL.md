---
name: growth-strategy
description: Governs Sellam's "Connect for Free, Pay to Launch" growth model. Use when working on `SubscriptionGate`, free-tier routing, read-only dashboard access, date range limits, action gating (pause/edit/create), AI insight blurring, or any upsell trigger placement. Core principle — "Monitoring is Free, Action is Paid."
---

# Growth Strategy Skill — Free Dashboard ("Insight vs. Action")

## Core Philosophy

> **"We give you the Diagnosis for free, but you pay for the Cure."**

Users connect their Meta Ad Account for free and instantly see a beautiful read-only dashboard of their _existing_ campaigns. They upgrade when they need to **act** — pause a wasteful ad, create a new one, or unlock AI optimization.

This is the primary acquisition funnel. Sellam is a **"Trojan Horse"** — let them into the fortress (the dashboard) for free, but lock the armory (the tools to fight).

---

## Why This Works in Nigeria

1. **Zero Friction Setup:** "Connect Facebook" is one button. No credit card.
2. **Instant Gratification:** Beautiful, fast stats — better than Facebook's clunky mobile app.
3. **Trust First:** They see we report accurate data _before_ giving us money.
4. **Pain-Driven Upgrade:** They don't upgrade because we "sold" them — they upgrade because they have a specific pain (wasting ₦) that the Pro tool solves instantly.
5. **Low Cost:** Fetching + displaying JSON from Meta API costs us almost nothing.

---

## The Three Friction Layers

### Layer 1: "Time Machine" Block (Data Limitation)

Business owners are obsessed with "What happened today?" but they _need_ "What happened last month?" to grow.

| Access            | Free Tier                     | Paid Tier (Starter+)               |
| ----------------- | ----------------------------- | ---------------------------------- |
| Date range        | Last 7 days / This month only | Unlimited (lifetime, custom dates) |
| Period comparison | ❌ No "vs. Previous Period"   | ✅ Green/red arrows showing growth |
| Export            | ❌                            | ✅ CSV/PDF                         |

**Upsell UX:** The `DateRangePicker` component shows all dates, but selecting a date older than 30 days triggers a glassmorphism modal:

> _"See the Full Picture — Analyze seasonal trends with Lifetime History on Sellam Pro."_

**Server enforcement:**

```typescript
// In server action: clamp startDate to 30-day window for free tier
if (tier === "free" && isBefore(startDate, subDays(new Date(), 30))) {
  return { error: "History limit reached", data: null, isUpgradeTrigger: true };
}
```

---

### Layer 2: "Panic Button" Block (Action Gating)

**Highest conversion trigger.** The user sees a campaign with high CPC — they are panicking because they're wasting money.

| Action                     | Free Tier             | Paid Tier         |
| -------------------------- | --------------------- | ----------------- |
| View campaign stats        | ✅                    | ✅                |
| Pause / Resume campaign    | ❌ (triggers paywall) | ✅                |
| Edit campaign targeting    | ❌ (triggers paywall) | ✅                |
| Create new campaign        | ❌ (triggers paywall) | ✅                |
| AI image / copy generation | ❌ (triggers paywall) | ✅ (credit-gated) |

**Upsell UX:** The "Pause" toggle, "Edit" button, and "New Campaign" CTA are all visible but trigger a paywall on click:

> _"Control your ad spend instantly from Sellam. Upgrade to Pause, Edit, and Optimize in one click."_

**Why it converts:** They are emotionally invested in stopping the loss. The subscription cost (₦10,000/mo) is likely less than the money they're wasting on that bad ad.

---

### Layer 3: "Blurred Consultant" (AI Insights Tease)

Use the Bento Grid layout to tease AI analysis results.

| Element              | Free Tier                       | Paid Tier                                               |
| -------------------- | ------------------------------- | ------------------------------------------------------- |
| Optimization Score   | ✅ Visible: "Low (42/100)"      | ✅ Same                                                 |
| Diagnosis text       | 🔒 Blurred: `filter: blur(4px)` | ✅ Full text: "Your audience targeting is too broad..." |
| "Fix with AI" button | ❌ Disabled                     | ✅ Auto-applies the optimization                        |

**Upsell UX:** The blurred text is tantalizing — they can see _something intelligent_ was computed, but can't read it:

> _"Unlock AI-powered recommendations to save money and get more customers."_

---

## What's Free vs. Paid — Complete Map

### ✅ Free Zone (No subscription required)

| Feature                          | Component                    |
| -------------------------------- | ---------------------------- |
| Sign up / Login                  | Auth flow                    |
| Connect Meta Ad Account          | `/api/connect/meta/callback` |
| View dashboard (7-day window)    | `unified-dashboard.tsx`      |
| View campaign list (read-only)   | `campaigns-view.tsx`         |
| View campaign detail (read-only) | `campaign-detail-view.tsx`   |
| View notifications               | `/notifications`             |
| View settings                    | Settings pages               |
| View subscription / billing page | `billing-content.tsx`        |

### 🔒 Paid Zone (Starter+ subscription required)

| Feature                              | Component                    | Gate                                               |
| ------------------------------------ | ---------------------------- | -------------------------------------------------- |
| Create campaign                      | `budget-launch-step.tsx`     | Server: `launchCampaign()` checks sub status       |
| Pause / Resume campaign              | `campaign-detail-view.tsx`   | Server: `updateCampaignStatus()` checks sub status |
| Edit campaign                        | Campaign edit flow           | Server action gate                                 |
| AI copy generation                   | `audience-chat-step.tsx`     | Server: `requireCredits()`                         |
| AI image generation                  | `creative-step.tsx` / Studio | Server: `requireCredits()`                         |
| Date range > 30 days                 | `DateRangePicker`            | Server: clamp query window                         |
| AI optimization insights (full text) | Optimization card            | Server: return blurred flag                        |
| Mark as Sold                         | `mark-as-sold-button.tsx`    | Server action gate                                 |
| Sync campaign insights               | `syncCampaignInsights()`     | Server action gate                                 |

---

## Implementation Status

| Item                                                     | Status         |
| -------------------------------------------------------- | -------------- |
| Strategy documented                                      | ✅ This file   |
| Decision recorded in `decisions.md`                      | ✅             |
| `SubscriptionGate` allows dashboard read-only for `free` | ⬜ Not Started |
| `TIER_CONFIG` includes `free` tier entry                 | ⬜ Not Started |
| Date range clamping (Layer 1)                            | ⬜ Not Started |
| Action gating on Pause/Edit/Create (Layer 2)             | ⬜ Not Started |
| AI insight blurring (Layer 3)                            | ⬜ Not Started |
| Optimization score on campaign detail                    | ⬜ Not Started |
| Glassmorphism upgrade modals                             | ⬜ Not Started |

---

## Key Rules

- **Never hide data with CSS alone.** All gates must be enforced server-side (server actions / RLS). Client blur is cosmetic only.
- **Never auto-downgrade to free.** Free is the entry state — once they subscribe, expiry goes to `expired` (which shows `SubscriptionGate` lock), not back to `free`.
- **"Free" is not "Expired."** Free users chose not to pay _yet_. Expired users _stopped_ paying. Different UX — free gets the read-only dashboard; expired gets the reactivation lock screen.
- **Sync existing campaigns on connect.** As soon as they connect their Meta account, trigger `syncCampaigns()` to populate the dashboard — this is the "Aha!" moment.
- **UI language:** "Start for free" not "Free trial." "Upgrade" not "Subscribe." "Unlock" not "Pay."
