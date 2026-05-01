# Phase 1: Cold Traffic Engine

Optimize targeting for new users with zero pixel or attribution data.  
Four additions: Language targeting, Income proxy behaviors, Exclusions activation, and Life Events.

---

## Implementation Status

| Task                                | Status  |
| ----------------------------------- | ------- |
| 1A — Language targeting (`locales`) | ✅ Done |
| 1B — Income proxy behaviors         | ✅ Done |
| 1C — Activate exclusions stub       | ✅ Done |
| 1D — Life Events targeting          | ✅ Done |

Store is currently at **version 9**.

---

## 1A — Language Targeting (`locales` field)

### Meta v24 Spec

Meta v24 uses **numeric locale IDs**, not string language codes, for the `locales` field.  
Key IDs for Nigerian market (verified via `/search?type=adlocale`):

| Locale        | ID    |
| ------------- | ----- |
| English (all) | `6`   |
| English (UK)  | `23`  |
| Yoruba        | `114` |
| Igbo          | `66`  |
| Hausa         | `35`  |

> ⚠️ Always verify IDs against the live API before shipping.  
> Use: `GET /search?type=adlocale&q=yoruba&access_token={token}`  
> Response shape: `{ data: [{ key: 114, name: "Yoruba" }] }`

### What Was Implemented

**`campaign-store.ts`** — `targetLanguages: number[]` added to interface, initial state, and `resetDraft`. Included in v8 migration.

**`meta.ts` → `targetingPayload`:**

```typescript
...(params.targeting.locales?.length > 0 && {
  locales: params.targeting.locales,
}),
```

**`meta.ts` → `MetaService`** — `searchLocales()` method added as a dormant utility. Not called by UI — static list used instead (correct for Nigerian MVP).

**`campaigns.ts`** — `targetLanguages?: number[]` in `LaunchConfig`. Mapped as `locales: config.targetLanguages` into `createAdSet`. Persisted in `targeting_snapshot.languages`.

**`audience-summary.tsx`** — Static badge toggles for English (6), Yoruba (114), Igbo (66), Hausa (35).

---

## 1B — Income Proxy Behaviors

Since Meta's `income` demographic field is unavailable for Nigeria, high-income signals are proxied through behaviors.

### What Was Implemented

**`meta-behaviors.ts`** — Updated aliases on existing seeds:

- `iOS device users` — added: `"premium phone users"`, `"high income mobile"`, `"affluent mobile users"`
- `Frequent international travelers` — added: `"high income travelers"`, `"affluent travelers"`
- `Business travelers` — added: `"corporate users"`, `"c-suite"`, `"executives"`, `"professionals"`
- `Engaged Shoppers` — added: `"high intent buyers"`, `"premium shoppers"`

**`core-strategy-ng/SKILL.md`** — Step 6 Objective Overrides updated:

```
Premium / luxury tier (or products > ₦10,000) → prioritize income proxy behaviors:
"iOS device users", "Frequent international travelers", "Business travelers", "Engaged Shoppers".
Avoid broad low-signal behaviors.
```

---

## 1C — Activate Exclusions

The `exclusions` passthrough stub in `meta.ts` was broken (always passed `undefined`). Replaced with a proper conditional.

### What Was Implemented

**`campaign-store.ts`** — `exclusionAudienceIds: string[]` added to interface, initial state, and `resetDraft`. Included in v8 migration alongside `targetLanguages`.

**`meta.ts` → `targetingPayload`** — Replaced broken stub with:

```typescript
...(params.targeting.exclusionAudienceIds?.length > 0 && {
  exclusions: {
    custom_audiences: params.targeting.exclusionAudienceIds.map(
      (id: string) => ({ id }),
    ),
  },
}),
```

**`campaigns.ts`** — `exclusionAudienceIds?: string[]` in `LaunchConfig`. Mapped into `createAdSet`. Persisted in `targeting_snapshot.exclusions`.

**`audience-summary.tsx`** — Checkbox stub: "Exclude previous customers (Coming soon)". Pushes a dummy ID to validate the full store → API → DB pipeline. Full UI activates in Phase 2C.

---

## 1D — Life Events Targeting

Life Events are **a separate Meta API field** from behaviors — they go into `life_events`, not `behaviors`. They target people at a specific life moment (engaged, new parent, new job) rather than a general interest pattern. Only relevant when the product directly serves that life stage.

### Meta v24 Spec

```typescript
// In targetingPayload — conditional, same pattern as behaviors
life_events: [{ id: "6003156085124", name: "Newly engaged (1 year)" }];
```

Life event IDs are resolved the same way as behavior IDs — via the Meta targeting search API or local seed lookup.

### What Was Implemented

**`meta-behaviors.ts`** — New exports added (separate from behavior seeds):

```typescript
export interface MetaLifeEventSeed {
  name: string;
  path: string;
  relevantFor: string[]; // Product categories this event applies to
  aliases: string[];
}

export const META_LIFE_EVENT_SEEDS: MetaLifeEventSeed[];
export function resolveLocalLifeEvent(aiName: string): MetaLifeEventSeed | null;
export function suggestLifeEventsForCategory(category: string): MetaLifeEventSeed[];
```

Seeds included:

| Life Event                  | Relevant For                                                   |
| --------------------------- | -------------------------------------------------------------- |
| Newly engaged (1 year)      | Wedding, bridal, asoebi, catering, event planning, photography |
| Newly married (1 year)      | Home decor, furniture, appliances, travel, gifts               |
| New relationship (6 months) | Fashion, beauty, skincare, gifts, perfume                      |
| Expecting parents           | Baby products, maternity, antenatal                            |
| New parents (1 year)        | Baby clothes, baby food, toys, childcare                       |
| New homeowner (1 year)      | Furniture, interior design, appliances, cleaning               |
| Recently moved (6 months)   | Home decor, moving services, appliances                        |
| New job (6 months)          | Corporate wear, suits, office shoes, professional bags         |
| Job anniversary (1 year)    | Gifts, fashion, accessories                                    |

**`campaign-store.ts`** — `targetLifeEvents: TargetingOption[]` added to interface, initial state, and `resetDraft`. **Store bumped v8 → v9** with migration:

```typescript
if (version < 9) {
  return { ...(persistedState as any), targetLifeEvents: [] } as CampaignState;
}
```

**`meta.ts` → `targetingPayload`:**

```typescript
...(params.targeting.lifeEvents?.length > 0 && {
  life_events: params.targeting.lifeEvents.map(
    (e: { id: string; name: string }) => ({ id: e.id, name: e.name }),
  ),
}),
```

**`campaigns.ts`** — `targetLifeEvents?: { id: string; name: string }[]` in `LaunchConfig`. Mapped as `lifeEvents: config.targetLifeEvents` into `createAdSet`. Persisted in `targeting_snapshot.life_events`.

**`core-strategy-ng/SKILL.md`** — Step 6B added with full product-to-life-event mapping table, rules (max 2, only when directly relevant to life stage), and concrete examples. `lifeEvents: []` added to output schema.

### AI Logic

The AI now silently checks if the product serves a life transition. Examples:

- "I sell wedding gowns" → outputs `lifeEvents: ["Newly engaged (1 year)"]`
- "Baby clothes and accessories" → outputs `lifeEvents: ["Expecting parents", "New parents (1 year)"]`
- "I sell shawarma in Lekki" → outputs `lifeEvents: []` (no life-stage connection)

### Pending UI

`audience-summary.tsx` does not yet render a life events selector. The field is wired store → API → DB but the UI surface is not built. When building it, follow the same badge/toggle pattern as language targeting. The `suggestLifeEventsForCategory()` helper in `meta-behaviors.ts` can pre-select relevant events based on the AI-detected business type.

---

## Phase 1 Final Checklist

- [x] Store v8: `targetLanguages` + `exclusionAudienceIds` with migration
- [x] Store v9: `targetLifeEvents` with migration
- [x] `locales` in `targetingPayload` (conditional)
- [x] `exclusions` payload fixed (correct conditional shape)
- [x] `life_events` in `targetingPayload` (conditional)
- [x] `searchLocales` in `MetaService` (dormant utility)
- [x] High-income behavior aliases added to `meta-behaviors.ts`
- [x] `META_LIFE_EVENT_SEEDS` + resolver + category suggester added to `meta-behaviors.ts`
- [x] AI prompt updated: income proxies for premium products (Step 6)
- [x] AI prompt updated: life events by product category (Step 6B)
- [x] `lifeEvents: []` in AI output schema
- [x] All three fields in `targeting_snapshot` on DB
- [x] Language UI: static badge toggles in `audience-summary.tsx`
- [x] Exclusions UI: checkbox stub in `audience-summary.tsx`
- [ ] Life Events UI: selector not yet built (store + API wired, UI pending)
- [x] `LaunchConfig` extended in `campaigns.ts`
- [x] TypeScript: `npx tsc --noemit` passes
