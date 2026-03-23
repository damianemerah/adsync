# Targeting Engine Evolution Plan

**Strategy:** Cold → Warm → Scale  
**Skill:** `.agent/skills/audience-targeting/SKILL.md`

---

## Why This Order Matters

New Tenzu users start with zero pixel data and zero Tenzu attribution clicks. Building warm retargeting or lookalike audiences before cold traffic has run is technically possible but strategically empty — Meta won't have enough source data to create meaningful audiences. The phases enforce a logical data dependency:

```
Phase 1 (Cold Traffic) → generates clicks/impressions
         ↓
Phase 2 (Custom Audiences) → retargets people who clicked Tenzu links or fired pixels
         ↓
Phase 3 (Lookalikes) → finds new people who look like the ones who converted
```

---

## Phase 1 — Cold Traffic Engine ✅ Complete

**Goal:** Get more signal quality out of cold targeting before any warm data exists.  
**Tier:** All tiers  
**Store:** v7 → v8 → v9

| Task | File(s) | Status |
|------|---------|--------|
| Add `targetLanguages: number[]` to store | `campaign-store.ts` | ✅ Done (v8) |
| Add `exclusionAudienceIds: string[]` to store | `campaign-store.ts` | ✅ Done (v8) |
| Add `targetLifeEvents: TargetingOption[]` to store | `campaign-store.ts` | ✅ Done (v9) |
| Add `locales` to targeting payload | `meta.ts:createAdSet` | ✅ Done |
| Fix `exclusions` payload (remove undefined passthrough) | `meta.ts:createAdSet` | ✅ Done |
| Add `life_events` to targeting payload | `meta.ts:createAdSet` | ✅ Done |
| Add `MetaService.searchLocales()` method | `meta.ts` | ✅ Done (dormant utility) |
| Add income proxy behavior aliases | `meta-behaviors.ts` | ✅ Done |
| Add `META_LIFE_EVENT_SEEDS` + resolvers + category suggester | `meta-behaviors.ts` | ✅ Done |
| Update AI prompt for income proxies | `core-strategy-ng/SKILL.md` Step 6 | ✅ Done |
| Add AI Step 6B for life events | `core-strategy-ng/SKILL.md` | ✅ Done |
| Language selector UI | `audience-summary.tsx` | ✅ Done (static badges) |
| Exclusions checkbox stub UI | `audience-summary.tsx` | ✅ Done |
| Life Events UI selector | `audience-summary.tsx` | ⚠️ Pending |
| Extend `LaunchConfig` + `targeting_snapshot` | `campaigns.ts` | ✅ Done |

**Reference:** `.agent/skills/audience-targeting/references/phase1-cold-traffic.md`

---

## Phase 2 — Custom Audiences (Warm Traffic Engine)

**Goal:** Retarget people who already engaged with previous campaigns via Tenzu Links or pixel.  
**Tier:** Growth + Agency  
**Store bump:** v9 → v10  
**Prerequisite:** User has run at least 1 campaign and has link click or pixel data

| Task | File(s) | Status |
|------|---------|--------|
| Create `meta_audiences` Supabase table | New migration | ⬜ Planned |
| Add `MetaService.getCustomAudiences()` | `meta.ts` | ⬜ Planned |
| Create `syncMetaAudiences()` server action | `src/actions/audiences.ts` | ⬜ Planned |
| Create `getAvailableAudiences()` server action | `src/actions/audiences.ts` | ⬜ Planned |
| Add `customAudienceIds: string[]` to store | `campaign-store.ts` | ⬜ Planned |
| Add `custom_audiences` to targeting payload | `meta.ts:createAdSet` | ⬜ Planned |
| Retargeting toggle UI in audience step | Audience step component | ⬜ Planned |
| Tier gate: Growth+ only (UI + server action) | UI + `campaigns.ts` | ⬜ Planned |

**Reference:** `.agent/skills/audience-targeting/references/phase2-custom-audiences.md`

---

## Phase 3 — Lookalike Audiences (Pro Tier Scaler)

**Goal:** Find new customers who look like existing converters. The "Tenzu Gold" strategy.  
**Tier:** Agency only  
**Store bump:** v10 → v11  
**Prerequisite:** User has a custom audience with 1,000+ people

| Task | File(s) | Status |
|------|---------|--------|
| Add `MetaService.createLookalikeAudience()` | `meta.ts` | ⬜ Planned |
| Create `createLookalikeAudience()` server action | `src/actions/audiences.ts` | ⬜ Planned |
| Add `lookalikAudienceIds: string[]` to store | `campaign-store.ts` | ⬜ Planned |
| Merge lookalike IDs into `custom_audiences` payload | `meta.ts:createAdSet` | ⬜ Planned |
| Lookalike creator UI with ratio selector | Audience step component | ⬜ Planned |
| Tier gate: Agency only (UI + server action) | UI + `campaigns.ts` | ⬜ Planned |
| Min source size warning (< 1,000 people) | UI | ⬜ Planned |

**Reference:** `.agent/skills/audience-targeting/references/phase3-lookalikes.md`

---

## Database Impact Summary

| Change | Phase | Migration |
|--------|-------|-----------|
| No schema changes for Phase 1 | 1 | — |
| `meta_audiences` table (new) | 2 | `add_meta_audiences_table` |
| No schema changes for Phase 3 (uses same table) | 3 | — |

The `campaigns.targeting_snapshot` (existing jsonb column) absorbs all new targeting fields.

---

## Tier Access Matrix

| Feature | Starter | Growth | Agency |
|---------|---------|--------|--------|
| Interests + Behaviors + Geo | ✅ | ✅ | ✅ |
| Age + Gender + Language | ✅ | ✅ | ✅ |
| Life Events | ✅ | ✅ | ✅ |
| Exclusion audiences | ✅ | ✅ | ✅ |
| Custom audience retargeting | ❌ | ✅ | ✅ |
| Lookalike audiences | ❌ | ❌ | ✅ |

---

## Always Read Before Starting Any Phase

1. `.agent/rules/project-rule.md` — architecture rules
2. `.agent/rules/decisions.md` — settled decisions
3. `.agent/skills/campaign-launch/SKILL.md` — the launch flow you're extending
4. `.agent/skills/audience-targeting/SKILL.md` — this targeting skill
