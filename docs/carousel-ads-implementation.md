# Carousel Ads Implementation

## Overview

This document describes the carousel ads feature implementation for Tenzu. Users can now create Meta ads with **2-10 images** in a swipeable carousel format, in addition to the existing single-image ads.

---

## Answer to Original Question

**Q: Can we use multiple images for an ad even within the 1:1:1 constraint (1 Campaign = 1 Ad Set = 1 Ad)?**

**A: YES** — The 1:1:1 constraint is **orthogonal to image count**. You can have:
- ✅ 1 Campaign → 1 Ad Set → 1 **Single-Image Ad** (uses `image_hash`)
- ✅ 1 Campaign → 1 Ad Set → 1 **Carousel Ad** (uses `child_attachments[]` with 2-10 images)

The constraint is about campaign/ad set/ad hierarchy, **not** image count per ad.

---

## Implementation Summary

### 1. Meta API Service ([src/lib/api/meta.ts](../src/lib/api/meta.ts))

**Updated `createAd()` function to support both formats:**

```typescript
createAd: async (
  token: string,
  adAccountId: string,
  adSetId: string,
  creativeHash: string | string[], // ← Single hash OR array for carousel
  copy: any,
  ctaCode: string = "SHOP_NOW",
  objective?: string,
  carouselCards?: Array<{
    imageHash: string;
    headline: string;
    description?: string;
    link?: string;
  }>,
)
```

**Key changes:**
- Detects carousel mode if `carouselCards.length >= 2`
- Builds `child_attachments` array for carousel format:
  ```json
  {
    "child_attachments": [
      {
        "image_hash": "abc123",
        "name": "Card 1",
        "description": "...",
        "link": "https://...",
        "call_to_action": {...}
      },
      // ... up to 10 cards
    ]
  }
  ```
- Falls back to single `image_hash` for non-carousel ads

---

### 2. Campaign Store ([src/stores/campaign-store.ts](../src/stores/campaign-store.ts))

**Added carousel card state:**

```typescript
carouselCards: Array<{
  imageUrl: string;      // Supabase public URL
  headline: string;      // Per-card headline
  description?: string;  // Optional description
  link?: string;         // Optional per-card link (defaults to main URL)
}>;
```

**Initialized to `[]` in both default state and `resetDraft()`**

---

### 3. Carousel Editor UI ([src/components/campaigns/new/steps/creative/carousel-editor.tsx](../src/components/campaigns/new/steps/creative/carousel-editor.tsx))

**New component features:**
- Displays up to 10 carousel cards
- Each card shows:
  - Thumbnail preview
  - Editable headline
  - Optional description
  - Optional per-card destination link
- Click to expand/collapse card editor
- Add/Remove cards (max 10 per Meta's limit)
- Visual feedback for validation (min 2 cards required)

---

### 4. Creative Step Integration ([src/components/campaigns/new/steps/creative-step.tsx](../src/components/campaigns/new/steps/creative-step.tsx))

**Added carousel mode detection:**
- When user selects **2+ images**, carousel editor appears
- Tabs switch between "Single Image" and "Carousel" modes
- Auto-populates carousel cards from selected images
- `useEffect` hook initializes cards with placeholder headlines

**UI Flow:**
1. User selects multiple images from library
2. System detects `selectedCreatives.length >= 2`
3. Carousel setup card appears with tabs
4. User can customize each card's headline, description, and link
5. Or switch back to "Single Image" mode (uses only first image)

---

### 5. Campaign Launch Action ([src/actions/campaigns.ts](../src/actions/campaigns.ts))

**Updated `LaunchConfig` interface:**
```typescript
carouselCards?: Array<{
  imageUrl: string;
  headline: string;
  description?: string;
  link?: string;
}>;
```

**Image upload logic:**
```typescript
const isCarousel = config.carouselCards && config.carouselCards.length >= 2;

if (isCarousel) {
  // Upload all images, collect hashes
  for (const card of config.carouselCards) {
    const imageRes = await MetaService.createAdImage(...);
    carouselImageData.push({ imageHash, headline, description, link });
  }
} else {
  // Single image upload (legacy path)
  const imageRes = await MetaService.createAdImage(config.creatives[0]);
}
```

**Ad creation:**
```typescript
await MetaService.createAd(
  token,
  adAccountId,
  adSetId,
  isCarousel ? carouselImageData.map(c => c.imageHash) : imageHash,
  copy,
  ctaCode,
  objective,
  isCarousel ? carouselImageData : undefined,
);
```

**Database storage:**
- Carousel data saved to `creative_snapshot.carousel_cards` (JSONB column)
- Existing `carousel_data` column in `ads` table now utilized

---

### 6. Budget & Launch Step ([src/components/campaigns/new/steps/budget-launch-step.tsx](../src/components/campaigns/new/steps/budget-launch-step.tsx))

**Added carousel data to launch payload:**
```typescript
const launchPayload = {
  // ... existing fields
  ...(carouselCards && carouselCards.length >= 2 && { carouselCards }),
};
```

---

## User Journey

### Creating a Carousel Ad

1. **Step 1: Goal & Platform** — Select objective (works with all objectives)
2. **Step 2: Audience** — Configure targeting
3. **Step 3: Creative**
   - Select 2+ images from library or upload new ones
   - **Carousel Setup** card appears automatically
   - Switch to "Carousel" tab
   - Customize each card:
     - Headline (required)
     - Description (optional)
     - Link (optional, defaults to main destination URL)
4. **Step 4: Budget & Launch** — Set budget and launch

### Creating a Single-Image Ad

- Select 1 image **OR** select multiple but stay on "Single Image" tab
- Only the first selected image will be used

---

## Meta API Payload Comparison

### Single Image Ad
```json
{
  "name": "AdSync Creative",
  "object_story_spec": {
    "page_id": "123456",
    "link_data": {
      "image_hash": "abc123",
      "link": "https://example.com",
      "message": "Primary text",
      "name": "Headline",
      "call_to_action": { "type": "SHOP_NOW" }
    }
  }
}
```

### Carousel Ad
```json
{
  "name": "AdSync Carousel Creative",
  "object_story_spec": {
    "page_id": "123456",
    "link_data": {
      "child_attachments": [
        {
          "image_hash": "abc123",
          "name": "Card 1 Headline",
          "description": "Card 1 description",
          "link": "https://example.com/card1",
          "call_to_action": { "type": "SHOP_NOW" }
        },
        {
          "image_hash": "def456",
          "name": "Card 2 Headline",
          "description": "Card 2 description",
          "link": "https://example.com/card2",
          "call_to_action": { "type": "SHOP_NOW" }
        }
      ],
      "message": "Swipe to see more!",
      "name": "Collection Title"
    }
  }
}
```

---

## Validation & Constraints

### Meta API Limits
- **Min cards:** 2
- **Max cards:** 10
- Each card can have its own `link` and `description`

### UI Validation
- Carousel editor shows warning if only 1 card is configured
- "Add Card" button disabled when 10 cards reached or no more images available
- Each card requires a headline (enforced in UI, defaults to "Card N")

### Backward Compatibility
- Existing single-image campaigns unaffected
- `carouselCards` is optional in `LaunchConfig`
- If `carouselCards` is undefined or has < 2 items, falls back to single-image mode

---

## Database Schema

### campaigns table
```sql
creative_snapshot JSONB -- stores { creatives, ad_copy, carousel_cards? }
```

### ads table
```sql
carousel_data JSONB -- stores carousel card metadata (previously unused, now populated)
```

---

## Files Modified

1. ✅ [src/lib/api/meta.ts](../src/lib/api/meta.ts#L341-L443) — `createAd()` supports carousel
2. ✅ [src/stores/campaign-store.ts](../src/stores/campaign-store.ts#L101-L107) — Added `carouselCards` state
3. ✅ [src/components/campaigns/new/steps/creative-step.tsx](../src/components/campaigns/new/steps/creative-step.tsx#L480-L512) — Carousel UI integration
4. ✅ [src/components/campaigns/new/steps/creative/carousel-editor.tsx](../src/components/campaigns/new/steps/creative/carousel-editor.tsx) — **New component**
5. ✅ [src/actions/campaigns.ts](../src/actions/campaigns.ts#L460-L523) — Carousel launch logic
6. ✅ [src/components/campaigns/new/steps/budget-launch-step.tsx](../src/components/campaigns/new/steps/budget-launch-step.tsx#L354-L356) — Pass carousel data

---

## Testing Checklist

- [ ] Launch single-image ad (verify existing flow still works)
- [ ] Select 2 images, customize carousel cards, launch
- [ ] Select 10 images (max limit)
- [ ] Try to add 11th card (should be disabled)
- [ ] Verify carousel shows correctly in Meta Ads Manager
- [ ] Check database: `creative_snapshot.carousel_cards` populated
- [ ] Test with different objectives (leads, traffic, awareness)
- [ ] Switch between Single/Carousel tabs mid-creation

---

## Future Enhancements

1. **Drag & Drop Reordering** — Let users reorder carousel cards
2. **Video Cards** — Support video in carousel (Meta allows mixed media)
3. **Dynamic Product Catalog** — Auto-generate carousel from product feed
4. **A/B Test Card Order** — Test which card sequence performs best
5. **Carousel Templates** — Pre-built carousel structures for common use cases

---

## Conclusion

The carousel ads feature is now **fully implemented and backward-compatible**. Users can create both single-image and carousel ads seamlessly within the existing campaign creation flow, leveraging Meta's full carousel capabilities (2-10 cards with individual headlines, descriptions, and links).
