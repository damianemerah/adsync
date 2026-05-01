---
name: audience-targeting
description: Governs all Meta Ads audience targeting upgrades for Tenzu — the Cold → Warm → Scale engine. Use when working on campaign-store.ts (adding targeting fields), meta.ts (targeting payload), audience-chat-step, meta-behaviors.ts, or any feature involving custom audiences, lookalike audiences, language targeting, income proxies, retargeting, exclusions, or Advantage+ audience signals. Always load this skill when the user mentions: "Phase 1 targeting", "Phase 2 audiences", "Phase 3 lookalikes", "language targeting", "locales", "income proxy", "custom audience", "retargeting toggle", "pixel audiences", or "lookalike percentage".
---

# Audience Targeting Skill

## Strategic North Star

> **Cold → Warm → Scale**  
> Build cold traffic first (interests + behaviors + demographics).  
> That data fuels warm retargeting (custom audiences from Tenzu link clicks + pixel fires).  
> Warm audiences then seed lookalikes for scaled reach.

**Never skip phases.** A new Tenzu user has zero pixel fires and zero Tenzu link clicks. Jumping to Phase 2 on Day 1 is technically possible but strategically wrong — empty custom audiences result in Meta rejecting the adset or serving to near-zero people.

---

## Phase Status

| Phase  | Feature                                                           | Status               |
| ------ | ----------------------------------------------------------------- | -------------------- |
| **1A** | Language targeting (`locales` field)                              | ✅ Done              |
| **1B** | Income proxy behaviors in AI prompt                               | ✅ Done              |
| **1C** | Exclusions activation (stub exists, needs store + UI)             | ✅ Done              |
| **1D** | Life Events targeting (`life_events` field)                       | ✅ Done — UI pending |
| **1E** | Work Positions targeting (`work_positions` field + AI generation) | ✅ Done              |
| **1F** | Industries targeting (`industries` field + AI generation)         | ✅ Done              |
| **2A** | Custom audiences — DB table + store + API payload                 | ⬜ Planned           |
| **2B** | Meta audience fetcher + UI selector                               | ⬜ Planned           |
| **2C** | Retargeting toggle in wizard                                      | ⬜ Planned           |
| **3A** | Lookalike audiences — store + API payload                         | ⬜ Planned           |
| **3B** | Lookalike tier gate (Growth/Agency only)                          | ⬜ Planned           |

---

## What Is Already Implemented (Do Not Re-implement)

From reading `src/stores/campaign-store.ts` and `src/lib/api/meta.ts`:

- ✅ `targetInterests` + `targetBehaviors` in store and payload
- ✅ `targetLifeEvents` in store and payload
- ✅ `targetWorkPositions` in store and payload (AI generates 0–3 job titles for B2B products)
- ✅ `targetIndustries` in store and payload (AI generates 0–2 broad sector names for B2B products)
- ✅ `locations` (geo_locations) in store and payload
- ✅ `ageRange` → `age_min` / `age_max` in store and payload
- ✅ `gender` → `genders: [1]` / `genders: [2]` / omitted (All) — correct Meta v24 format
- ✅ `exclusions` wired in `targetingPayload` as `exclusions: params.targeting.exclusions` — **stub only**, always `undefined` because store has no field and there is no UI
- ✅ Placement spec (automatic / instagram / facebook with sub-placements)
- ✅ Store version migration pattern (currently v7) — **must bump to v8** when adding new fields

---

## Reference Files

| File                                    | When to Read                                                              |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `references/phase1-cold-traffic.md`     | Implementing language targeting, income proxies, or activating exclusions |
| `references/phase2-custom-audiences.md` | Implementing custom audience DB table, store fields, API payload, or UI   |
| `references/phase3-lookalikes.md`       | Implementing lookalike audiences, tier gating, or the Pro scaler logic    |

---

## Critical Rules (Never Break)

1. **Meta v25 API.** `const API_VERSION = "v25.0"` in `meta.ts`. All field names and payload shapes must match v25 spec.
2. **Store migrations are mandatory.** Every new field added to `CampaignState` requires a version bump + migrate branch in the `persist` config if persist middleware is used.
3. **Naira-first.** No dollar amounts shown anywhere in UI related to these features.
4. **1:1:1 rule preserved.** These targeting additions go inside the existing `createAdSet` payload. Never spawn additional ad sets.
5. **Tier check before custom/lookalike.** Custom audiences are Growth+. Lookalikes are Agency only. Check `organizations.subscription_tier` server-side, not just in UI.
6. **Empty audiences must not break launch.** If `custom_audience_ids` is an empty array, omit the field entirely from the payload (Meta rejects empty arrays).
7. **`targeting_snapshot`** on the `campaigns` table (jsonb) must always receive the full resolved targeting object after launch — include new fields here too.
