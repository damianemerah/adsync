# Static / Dummy Data Audit — RESOLVED

All items addressed. Status key: ✅ Done | 🔜 Phase 2 (intentionally deferred)

---

## 1. `phone-mockup.tsx` — Brand identity ✅ DONE

| What                                 | Status | Resolution                                                           |
| ------------------------------------ | ------ | -------------------------------------------------------------------- |
| Avatar letter `"B"`                  | ✅     | Derives `displayInitial` from `brandName` prop                       |
| `"Brand Name"` / `"Your Brand"` text | ✅     | Uses `brandName` prop, falls back to `"Your Business"`               |
| `"1,240 likes"`                      | ✅     | `estimatedLikes` computed from `dailyBudgetNgn` using CPM/reach math |
| `"2 days ago"`                       | ✅     | Replaced with `"Just now"`                                           |
| `"@yourbrand"` TikTok handle         | ✅     | Derived from brand name: `@yourbusiness`                             |
| TikTok `"Brand Name"` bold           | ✅     | Uses `displayName`                                                   |

`PhoneMockupPanel` now sources `organization.name` from `useOrganization()` and
passes it as `brandName` + `dailyBudgetNgn` into `PhoneMockup`.

---

## 2. `budget-launch-step.tsx` — Launch Card checks ✅ DONE

| What                                   | Status | Resolution                                                                 |
| -------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `"Ad Account Active"` always success   | ✅     | Reads from `useAdAccounts()`, checks `status === "healthy"`                |
| `"Subscription Active"` always success | ✅     | Reads from `useSubscription()`, checks `status === "active" \| "trialing"` |

- Added `"loading"` status to `CheckItem` with a small spinner
- Launch button is **disabled** while checks are loading OR if either check fails
- Labels are dynamic: `"Checking ad account…"` → `"Ad Account Connected"` or `"No healthy ad account"`

---

## 3. `budget-launch-step.tsx` — Hardcoded tier estimates ✅ DONE

| What                                    | Status | Resolution                                                                          |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| `convLow`/`convHigh` in `OUTCOME_TIERS` | ✅     | Removed from type definition and constant                                           |
| Tier card shows live ranges             | ✅     | `tierEstimates` memo calls `estimateBudget(tier.amount, objective)` for all 3 tiers |
| Ranges update when objective changes    | ✅     | `tierEstimates` depends on `[objective]`                                            |

Helper `getOutcomeRange()` selects the right metric slice
(conversations / clicks / reach) based on the active objective.

---

## 4. `phone-mockup-panel.tsx` — Misleading preview toast ✅ DONE

Toast message updated from `"Opening native platform preview..."` to
`"Opening Ads Manager — live preview available after launch."` which is
accurate and sets correct expectations.

---

## 5. `campaign-store.ts` — `savedAudiences` never shown ✅ ANNOTATED

Added `// Phase 2:` comment in the store type explaining the intended
behaviour (a Saved Audiences panel in the audience step) and current status
(populated but not displayed). Code left intact so Phase 2 UI can plug in
without store changes.

---

## 6. `campaign-store.ts` — `applyTemplate` hollow ✅ ANNOTATED

Comment updated to describe Phase 2 intent:

> "Applying a template will pre-fill adCopy, targeting interests, and budget
> based on industry vertical (e.g. fashion, food, beauty)."

State persistence kept so template selection survives until Phase 2 UI ships.

---

## Research Notes (Perplexity)

Used to validate the `benchmarks.ts` values and inform UI copy framing:

- **CPM Nigeria 2025**: $1.20–$2.00 USD (Tier 3 market) — matches `cpmUsd: 1.5` ✅
- **USD/NGN 2025-2026**: ~₦1,600–1,700 — matches `FX_RATE = 1_600` ✅
- **Quality discount**: Nigeria has ~20–30% higher bot/low-quality traffic — matches `qualityDiscount: 0.75` ✅
- **Advantage+ vs manual**: Advantage+ wins overall CTR/ROI for non-technical users; Instagram-only favours visual verticals (fashion, beauty); Facebook-only gives broader cheaper reach for services/food
- **Framing for Nigerian SMBs**: Show Naira first, use outcome language ("conversations started", "website visitors", "people reached") not ad-tech jargon, express ROAS as a multiplier (₦1 in → ₦Nx out)

The `getOutcomeRange()` helper and the tier card labels already follow this
principle — they show real-world outcomes, not impressions or CPM.
