# Tenzu Creative System v2 — PRD

**Status:** Draft  
**Author:** AI Systems Review  
**Date:** 2026-02-20  

---

## Background

Tenzu's AI creative generation pipeline (FLUX via fal.ai + GPT-4o intermediate) was
producing street market and outdoor shopfront backgrounds for product ads. Root cause was
confirmed as two prompt contamination vectors in the v1 system:

1. `context-compiler.ts` injected location names as **scene descriptors** ("Nigerian street
   culture", "Lagos urban aesthetic") directly into the FLUX prompt string, causing Flux to
   render them as literal visual backgrounds.
2. `FLUX_AD_GENERATOR_SYSTEM` schema used `"Lagos urban market"` as an example
   `location_context` value, biasing GPT-4o toward market scenes whenever Lagos appeared
   in context.

Both were fixed in v1.1 (this sprint). This document covers the Phase 2–4 roadmap.

---

## Phase 2: Style Reference Library

**Goal:** Give users meaningful control over the visual style of their creatives without
requiring prompt engineering knowledge.

### Studio Presets (default tier — available to all plans)
| Preset ID | Name | Description | FLUX modifier |
|---|---|---|---|
| `studio_white` | Clean White | Pure white backdrop, soft box lighting | "pure white seamless background, soft diffused studio lighting" |
| `studio_gradient` | Soft Gradient | Pastel/neutral gradient, modern look | "light pastel gradient background, professional product photography" |
| `studio_dark` | Premium Dark | Deep charcoal/navy, luxury feel | "dark charcoal studio background, dramatic rim lighting, luxury aesthetic" |
| `flat_lay` | Flat Lay | Top-down product arrangement | "flat lay photography, top-down view, clean surface, minimal props" |

### Lifestyle Presets (Pro tier)
| Preset ID | Name | Description | Notes |
|---|---|---|---|
| `lifestyle_indoor` | Modern Interior | Clean Nigerian home/office setting | Must explicitly use `ad_type: lifestyle` |
| `lifestyle_social` | Out & About | Urban but not market — cafe, rooftop | Enforced: no street vendors or market stalls |
| `lifestyle_event` | Occasion Ready | Owambe/event context for fashion | For fashion/fabric verticals only |

### Implementation
- Add `visualStyle?: string` field to `CampaignContext` interface
- In `compileContextPrompt()`, map style preset ID → FLUX modifier string (Section 6)
- Store user's last-used style in campaign store for persistence
- Default: `studio_white` for `product_image`, `studio_gradient` for `social_ad`

---

## Phase 3: A/B Testing Framework

**Goal:** Allow users to generate 2–3 creative variants per campaign and track which
performs best after launch.

### Variant Generation
- Add `variantCount: 1 | 2 | 3` param to `generateAdCreative()`
- When `variantCount > 1`, generate with different seeds and minor prompt mutations:
  - Variant A: base prompt + seed X
  - Variant B: base prompt + "slightly different angle, alternate color palette" + seed Y
  - Variant C: base prompt + "alternative product positioning" + seed Z
- Store variants as siblings (same `parent_id`) in the `creatives` table

### Performance Tracking
- Add `ab_group: "A" | "B" | "C"` column to `campaign_creatives` join table
- Expose spend, CTR, ROAS per variant in `roi-metrics-card.tsx`
- Auto-winner logic: after 500 impressions, flag the variant with highest CTR
- Surface winner badge in campaigns view

### UI
- Creative selector in campaign wizard shows variants side-by-side (swipe on mobile)
- "Set as Primary" button promotes a variant to the main creative slot
- "Pause Losing Variants" quick action in campaign detail view

---

## Phase 4: User Style Selector UI

**Goal:** Surface visual style control to users without exposing prompt complexity.

### Component: `StyleSelectorPanel`
Location: `components/creatives/studio/style-selector-panel.tsx`

```tsx
// Props
interface StyleSelectorPanelProps {
  selectedStyle: string;
  onStyleChange: (styleId: string) => void;
  tier: "free" | "pro";  // locks lifestyle presets behind Pro
}
```

### Placement
1. **In campaign wizard** (`creative-step.tsx`): Show style selector above the generate
   button. Default to `studio_white`. Collapsed by default, expandable.
2. **In Studio** (`studio-layout.tsx`): Style picker in the left sidebar, always visible.
3. **In chat bubble** (`audience-chat-step.tsx`): After image is generated, show a
   "Change style" quick-action row below the image bubble with 3–4 preset thumbnails.

### Visual Design
- Grid of 2×2 thumbnail tiles showing preview of each style
- Lock icon on Pro presets for free users with upgrade CTA on hover
- Selected style gets a primary-colored border ring
- Tooltip on hover shows style name + short description

---

## Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Users want authentic Nigerian market aesthetic for certain businesses (e.g. fresh produce delivery) | Add `lifestyle_market` preset (Pro) that explicitly opts into outdoor market setting — off by default |
| Hard background constraints may feel too restrictive for creative users | Keep `raw` mode as full escape hatch — no context enrichment, no constraints |
| A/B variant generation doubles credit cost | Charge 1.5× credits for 2 variants, 2× for 3 — not full 2× or 3× |

---

## Test Cases (v1.1 regression suite)

Run these prompts and verify NO street/market backgrounds appear:

| Input | Expected Output |
|---|---|
| "wig" + Lagos + `social_ad` | Studio/gradient bg, product-centered, no street |
| "shawarma delivery Lekki" + `product_image` | Clean food photography, white bg, no vendor stall |
| "ankara set Yaba" + `social_ad` | Fabric product shot, clean backdrop, no market |
| "skincare routine kit" + `product_image` | White bg, flat lay or pedestal, no hands or street |
| "men's shoes Lagos" + `social_ad` | Clean studio shot, no road or pavement background |

**Pass condition:** Zero street/market scene elements in generated image.  
**Fail condition:** Any visible market stall, street vendor, roadside, or crowd element.
