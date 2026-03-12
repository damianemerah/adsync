At API level, “Creative testing” after Andromeda is just **structured ways of serving multiple creatives under controlled rules** so the algorithm doesn’t starve similar variants. There are three main mechanisms you can use from Adsync.

---

## 1. Multiple creatives in one ad set (the new Creative Testing feature)

Meta’s new in‑campaign Creative Testing lets you put **2–5 creatives inside the same ad set**, and the system:

- Splits traffic fairly between them during the test window
- Ensures each user sees only **one** of the variations
- Then reports a winner in Experiments / insights [easyinsights](https://easyinsights.ai/blog/metas-update-a-new-way-to-test-creatives-from-a-b-to-ai-led-optimization/)

**API shape (conceptual):**

You still create **one campaign, one ad set**, but multiple ads under that ad set:

```json
POST /v24.0/act_<AD_ACCOUNT_ID>/ads
{
  "name": "Concept A – Variant 1",
  "adset_id": "<ADSET_ID>",
  "creative": { "creative_id": "<CREATIVE_1_ID>" },
  "status": "PAUSED"
}

POST /v24.0/act_<AD_ACCOUNT_ID>/ads
{
  "name": "Concept A – Variant 2",
  "adset_id": "<ADSET_ID>",
  "creative": { "creative_id": "<CREATIVE_2_ID>" },
  "status": "PAUSED"
}
```

Then you enable **creative test mode** for that ad set via the Experiments system (see section 3), or by using the new “creative testing” flag Meta exposes in Ads Manager (not a separate endpoint, but a mode on the ad set that enforces equal delivery during the test phase). [youtube](https://www.youtube.com/watch?v=Oixy-SVIOZs)

For Adsync, this means: generate 2–5 distinct creatives for the same targeting, attach them as separate ads under one ad set, and mark that ad set as being in test mode.

---

## 2. Dynamic Creative (element‑level testing)

Dynamic Creative is older, but still works post‑Andromeda. You send **sets of assets** (multiple headlines, texts, images/videos), and Meta auto‑assembles combinations and optimizes them. [dancingchicken](https://www.dancingchicken.com/post/meta-ads-creative-testing-a-step-by-step-guide)

**API:**

```json
POST /v24.0/act_<AD_ACCOUNT_ID>/adcreatives
{
  "name": "Dynamic Creative",
  "object_story_spec": {
    "page_id": "<PAGE_ID>",
    "link_data": {
      "link": "https://example.com",
      "message": ["Text A", "Text B"],
      "headline": ["Headline 1", "Headline 2"],
      "call_to_action": { "type": "SHOP_NOW" },
      "multi_share_end_card": false
    }
  },
  "is_dco_internal": true
}
```

Ad level:

```json
{
  "adset_id": "<ADSET_ID>",
  "creative": { "creative_id": "<DCO_CREATIVE_ID>" }
}
```

Andromeda then evaluates creative **combinations** and pushes spend to best‑performing mixes. This is good for **micro‑variants**, but newer guidance says concept‑level testing (completely different ideas) is more stable. [goprimer](https://goprimer.com/blog/meta-andromeda-update/)

---

## 3. Experiments API (true A/B or concept tests)

To get **clean, statistically valid creative tests** under Andromeda, you use the Experiments system. Meta’s Experiments:

- Randomly splits audience between conditions
- Ensures **no overlap** (user doesn’t see both creatives)
- Reports lift/winner and significance [getangler](https://www.getangler.ai/blog/meta-ad-campaign-a-b-testing-evaluating-conversions-api-c-api-options-for-better-ad-performance)

**API pattern:**

1. Create two ad sets (or two ads) with different creatives but same targeting.
2. Register an experiment:

```json
POST /v24.0/<BUSINESS_ID>/experiments
{
  "name": "Creative Concept Test – March",
  "type": "A_B",
  "unit_type": "AD_SET",              // or "AD"
  "split_test_variable": "CREATIVE",
  "treatments": [
    { "name": "Concept A", "adset_id": "<ADSET_A_ID>" },
    { "name": "Concept B", "adset_id": "<ADSET_B_ID>" }
  ],
  "objective": "CONVERSIONS",
  "cooldown_start_time": 0
}
```

3. The experiment runs; you poll results via the experiment’s insights endpoint.

This is how you’d implement **true creative testing** in Adsync for more serious budgets.

---

## How this solves the Andromeda “similar creatives get starved” problem

Andromeda aggressively reallocates impressions to what it thinks is best; small tweaks in similar creatives can get **no spend** before you learn anything. [theshelf](https://www.theshelf.com/industry-news/creative-testing-strategy/)

These mechanisms counter that:

- **Creative testing mode / Experiments**: enforces **fair, isolated delivery** across creatives so each gets enough impressions before Andromeda fully takes over. [convert](https://www.convert.com/blog/growth-marketing/meta-ads-ab-testing-guide/)
- **Concept‑level testing**: you test clearly different ideas (e.g. “price‑focused” vs “status‑focused”), not just minor text tweaks, which gives Andromeda stronger signals and more stable comparisons. [goprimer](https://goprimer.com/blog/meta-andromeda-update/)

---

## What Adsync/Sellam should do

For your AI ad studio:

1. **Generate 2–5 clearly different concepts** per campaign (not tiny tweaks).
2. **Attach them as separate ads** under the same ad set (same targeting).
3. For bigger spenders, offer an **“Experiment mode”**:
   - Behind the scenes, create two ad sets (Concept A vs Concept B).
   - Register an Experiment via API as an A/B test on `AD_SET` or `AD`.
4. Surface a simple result:  
   “Concept B wins (+32% cheaper WhatsApp chat). Use this going forward.”

This is the Andromeda‑aligned way to do creative testing at API level: multiple creatives per ad set + optional Experiments API for strict tests, instead of many small manual ad sets that Andromeda will just ignore or starve.

---

# 1. Your current 1:1:1 rule

Your rule:

```
1 Campaign → 1 Ad Set → 1 Ad
```

This was historically good for:

- deterministic attribution
- simple infra
- easy debugging
- predictable spend

But **Andromeda favors creative exploration**, not rigid ad structures.

The system now learns mostly from:

- creative
- hook
- engagement signals
- conversion signals

NOT from granular audience stacks.

Your code already reflects this direction:

```ts
targeting_automation: {
  advantage_audience: 1;
}
```

That means you are already letting Meta's AI expand the audience.

So **targeting is already AI-controlled**.

Good.

---

# 2. The real bottleneck now

Your bottleneck is here:

```
1 Ad Set → 1 Ad
```

That means:

```
1 creative
1 hook
1 copy
```

Andromeda cannot explore.

So learning slows down.

---

# 3. What Meta now recommends (internally)

Modern structure:

```
1 Campaign
   → 1 Ad Set
        → 3-8 Ads
```

Each ad = different creative.

Example:

```
Ad 1 → Image
Ad 2 → UGC video
Ad 3 → Hook variation
Ad 4 → Different headline
Ad 5 → Carousel
```

Meta explores which creative wins.

---

# 4. Best rule for Sellam

Your next rule should be:

```
1:1:many
```

Meaning:

```
1 Campaign
1 Ad Set
3-6 Ads
```

NOT many-to-many.

Why?

Many-to-many creates:

```
5 campaigns
× 5 adsets
× 5 ads
= 125 objects
```

Your Nigerian SME users will break.

You want:

```
simple mental model
```

---

# 5. Sellam architecture that fits Andromeda

Ideal Sellam system:

```
1 Campaign
   ↓
1 Ad Set (broad targeting)
   ↓
AI Creative Pack
   ↓
5 Ads
```

Example:

```
Fashion store

Creative Pack:
1. Product image
2. Lifestyle image
3. UGC video
4. Price promo
5. WhatsApp testimonial
```

Meta then optimizes delivery.

---

# 6. Where Sellam should evolve

Your roadmap already hints this:

```
Phase 2B — Creative Intelligence
```

That's exactly the Andromeda layer.

Sellam should generate:

```
5 creative variations automatically
```

Then create ads like:

```
createAd(...)
createAd(...)
createAd(...)
createAd(...)
```

Same adset.

---

# 7. What NOT to do

Do NOT implement:

### many campaigns

```
10 campaigns
```

Bad for learning.

---

### stacked targeting

```
Fashion
Women
Lagos
25-34
Engaged shoppers
```

Andromeda expands anyway.

---

### complex adset splitting

```
Adset 1 → Lagos
Adset 2 → Abuja
Adset 3 → Ibadan
```

Meta now discourages this.

---

# 8. The real opportunity for Sellam

Sellam advantage is here:

```
Creative generation + WhatsApp attribution
```

Your stack already has:

```
Fal.ai
Flux
OpenAI
```

So Sellam should move toward:

```
AI Creative Engine
```

Not targeting engine.

---

# 9. Final recommendation

Keep:

```
1 Campaign
1 Ad Set
```

Change:

```
1 Ad → 5 Ads
```

New rule:

```
1:1:5
```

Generated by AI.

---

# 10. If you implement this next feature

Sellam becomes **far more powerful than Ads Manager for SMEs**.

Flow becomes:

```
User writes product

Sellam AI generates:
5 creatives
5 hooks
5 headlines

System launches:

1 campaign
1 adset
5 ads
```

Andromeda does the rest.

---

If you want, I can also show **the Meta internal “creative testing ladder” used by top ad buyers**, which would fit perfectly into **Sellam Phase 2B Creative Intelligence**. It's extremely effective for WhatsApp businesses.
