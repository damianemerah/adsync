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
