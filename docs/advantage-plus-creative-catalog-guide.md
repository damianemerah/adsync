# Advantage+ Creative (ASC) - Implementation Guide

**Status:** 🔮 **Future Feature** - Requires Product Catalog
**Priority:** Low (Post-MVP)
**Complexity:** High
**Dependencies:** Meta Product Catalog, Commerce Manager integration

---

## What is Advantage+ Creative?

Advantage+ Creative (formerly **Advantage+ Shopping Campaigns / ASC**) is Meta's AI-powered creative optimization system for e-commerce advertisers.

### Key Benefits
- **20-40% better ROAS** compared to manual creative testing
- **Automatic creative testing** - Meta tests 20-150 creative variations
- **Dynamic product ads** - Auto-generates ads from your catalog
- **Reduced manual work** - Set budget, upload assets, let Meta optimize

### How It Works
1. Connect your product catalog to Meta
2. Upload 20-50+ creative assets (images, videos, copy variations)
3. Meta's AI automatically:
   - Tests all combinations
   - Shows best-performing variants to each audience
   - Optimizes creative delivery in real-time

---

## Requirements for Implementation

### 1. **Campaign Objective: SALES Only**
Advantage+ Creative **only works with `OUTCOME_SALES`** objective.

**Current AdSync Support:**
- ✅ We already support SALES objective
- ✅ Users can select "sales" when creating campaigns
- ✅ Maps to Meta's `OUTCOME_SALES`

**No changes needed** ✅

---

### 2. **Product Catalog Connection** 🚧 **Missing - Blocking**

#### What's Required
- User must connect a **Facebook Product Catalog** to their Ad Account
- Catalog contains:
  - Product IDs, names, prices, images
  - Product categories & variants
  - Availability status

#### Implementation Steps

**Option A: Manual Catalog Setup (User does it)**
1. User creates catalog in Meta Commerce Manager
2. Uploads products via CSV or API
3. Connects catalog to Ad Account
4. We fetch `catalog_id` from Meta API
5. Pass `catalog_id` when creating campaigns

**Option B: Automated Catalog Sync (We do it)** 🌟 **Recommended**
1. Add "Products" section to AdSync
2. User adds products to our database
3. We sync products to Meta Catalog API
4. Auto-associate catalog with campaigns

**API Endpoints Needed:**
```typescript
// Create catalog
POST /act_{ad_account_id}/catalogs
{
  "name": "My Product Catalog",
  "vertical": "commerce"
}

// Add products
POST /{catalog_id}/products
{
  "retailer_id": "SKU123",
  "name": "Product Name",
  "price": "2999 NGN",
  "url": "https://example.com/product",
  "image_url": "https://cdn.example.com/image.jpg"
}

// Get catalog ID
GET /act_{ad_account_id}/product_catalogs
```

**Database Schema:**
```sql
CREATE TABLE product_catalogs (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  ad_account_id UUID REFERENCES ad_accounts(id),
  meta_catalog_id TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY,
  catalog_id UUID REFERENCES product_catalogs(id),
  sku TEXT NOT NULL,
  name TEXT,
  price_cents INTEGER,
  currency TEXT DEFAULT 'NGN',
  image_url TEXT,
  product_url TEXT,
  meta_product_id TEXT,
  synced_at TIMESTAMPTZ
);
```

---

### 3. **Multiple Creative Variations** ⚠️ **Partially Supported**

#### What's Required
- Upload **20-50+ creative assets** per campaign
- Mix of images, videos, carousels
- Multiple ad copy variations
- Different headlines & CTAs

#### Current AdSync Support
- ✅ We support multiple creatives (images/videos)
- ❌ We don't guide users to upload 20-50 assets
- ❌ We don't test copy variations automatically

#### Implementation Changes

**UI Changes:**
```typescript
// campaign-creation-flow.tsx
interface AdvantageCreativeConfig {
  enabled: boolean; // Toggle for Advantage+ Creative
  creativeSets: {
    images: string[]; // 10-30 images
    videos: string[]; // 5-10 videos
    headlines: string[]; // 5-10 headline variations
    primaryText: string[]; // 5-10 primary text variations
    descriptions: string[]; // 5-10 description variations
    ctas: CTAData[]; // 3-5 CTA variations
  };
}
```

**Meta API Changes:**
```typescript
// In createMetaAd() function
if (config.advantageCreative?.enabled) {
  const adCreativePayload = {
    name: "Advantage+ Creative",
    degrees_of_freedom_spec: {
      creative_features_spec: {
        standard_enhancements: {
          enroll_status: "OPT_IN" // ← Enable Advantage+ Creative
        }
      }
    },
    asset_feed_spec: {
      images: config.creativeSets.images.map(url => ({ hash: uploadedHash })),
      videos: config.creativeSets.videos.map(url => ({ id: uploadedVideoId })),
      bodies: config.creativeSets.primaryText.map(text => ({ text })),
      titles: config.creativeSets.headlines.map(text => ({ text })),
      descriptions: config.creativeSets.descriptions.map(text => ({ text })),
      call_to_actions: config.creativeSets.ctas.map(cta => ({
        type: cta.platformCode
      })),
    },
    // ... rest of creative spec
  };
}
```

---

### 4. **Conversions API / Pixel** ✅ **Already Supported**

#### What's Required
- Meta Pixel installed on website
- Tracks `Purchase` events
- 50+ conversions per week (for AI to learn)

#### Current AdSync Support
- ✅ We already track clicks via attribution URLs
- ✅ We track WhatsApp conversions
- ⚠️ **Website conversions** depend on user's Pixel setup
- 🔮 Future: Add Pixel integration guide

---

### 5. **Advantage+ Campaign Structure**

#### Simplified Campaign Structure
With Advantage+ Creative enabled:

```
Campaign (OUTCOME_SALES, Advantage+ Budget)
  └─ Ad Set 1 (Single broad audience)
       └─ Ad 1 (Advantage+ Creative with 20-50 variations)
            ├─ Creative Set (images, videos, copy)
            └─ Product Set (from catalog)
```

**Key Differences from Manual:**
- **1 ad set** instead of multiple test ad sets
- **Broad targeting** (let Meta's AI find audiences)
- **No manual A/B tests** (Meta does it automatically)
- **Campaign-level budget** (Advantage+ Budget)

---

## Implementation Roadmap

### Phase 1: Foundation (Pre-requisites)
- [ ] Add Product Catalog support
  - [ ] Database schema (`product_catalogs`, `products`)
  - [ ] "Products" section in UI
  - [ ] Meta Catalog API integration
  - [ ] Product upload & sync

### Phase 2: Advantage+ Creative UI
- [ ] Add toggle in campaign creation: "Use Advantage+ Creative"
- [ ] Multi-asset upload flow (20-50 assets)
- [ ] Copy variation editor
- [ ] Preview creative combinations

### Phase 3: Meta API Integration
- [ ] Implement `degrees_of_freedom_spec` in `createMetaAd()`
- [ ] Implement `asset_feed_spec` for multiple creatives
- [ ] Add `catalog_id` to ad set creation
- [ ] Handle Advantage+ Creative errors

### Phase 4: Testing & Optimization
- [ ] Test with real product catalog
- [ ] Verify creative variations are tested
- [ ] Monitor ROAS improvements
- [ ] Add Advantage+ performance metrics to dashboard

---

## Code Snippets

### Enable Advantage+ Creative (Meta API)

```typescript
// In createMetaAd() function (process-campaign-launch edge function)
async function createMetaAd(
  token: string,
  adAccountId: string,
  adSetId: string,
  pageId: string,
  config: any
) {
  const id = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  // Only enable Advantage+ Creative for SALES objective with catalog
  if (config.objective === "sales" && config.catalogId && config.advantageCreative?.enabled) {

    // Upload all creative assets first (images/videos)
    const uploadedImages = await Promise.all(
      config.creativeSets.images.map(url => uploadImageToMeta(token, adAccountId, url))
    );
    const imageHashes = uploadedImages.map(res => Object.values(res.images)[0].hash);

    // Create Advantage+ Creative
    const creativeRes = await metaRequest(`/${id}/adcreatives`, "POST", token, {
      name: "Advantage+ Creative",

      // ✅ Enable Advantage+ Creative optimization
      degrees_of_freedom_spec: {
        creative_features_spec: {
          standard_enhancements: {
            enroll_status: "OPT_IN"
          }
        }
      },

      // ✅ Provide multiple creative assets for testing
      asset_feed_spec: {
        images: imageHashes.map(hash => ({ hash })),
        bodies: config.creativeSets.primaryText.map(text => ({ text })),
        titles: config.creativeSets.headlines.map(text => ({ text })),
        descriptions: config.creativeSets.descriptions.map(text => ({ text })),
        call_to_actions: config.creativeSets.ctas.map(cta => ({
          type: cta.platformCode
        })),
        link_urls: [{ website_url: config.destinationUrl }],
      },

      // ✅ Link to product catalog
      object_story_spec: {
        page_id: pageId,
        template_data: {
          catalog_id: config.catalogId,
          product_set_id: config.productSetId, // Optional: filter products
        }
      },
    });

    // Create ad with Advantage+ Creative
    return metaRequest(`/${id}/ads`, "POST", token, {
      name: "Advantage+ Ad",
      adset_id: adSetId,
      creative: { creative_id: creativeRes.id },
      status: "PAUSED",
    });
  }

  // Fallback: Regular ad creation
  // ... existing code
}
```

---

## Decision: Why Not Implement Now?

### Blockers
1. **No Product Catalog Support** - Requires full e-commerce integration
2. **Complex UX** - Need multi-asset upload flow (20-50 assets)
3. **Limited User Base** - Most AdSync users aren't e-commerce
4. **High Effort, Low ROI** - Better to focus on core features first

### Alternative: Advantage+ Budget (Lower Hanging Fruit)
**Advantage+ Budget** (campaign-level budget optimization) delivers **70% of the benefit** with **10% of the effort**:
- ✅ No catalog required
- ✅ Works with all objectives
- ✅ Simple toggle in UI
- ✅ 20-30% efficiency gain

**Recommendation:** Implement Advantage+ Budget first, defer Advantage+ Creative until:
- We have 50+ active advertisers
- Multiple users request product catalog support
- We're ready to build a full e-commerce module

---

## References

- [Meta Advantage+ Shopping Campaigns Guide](https://www.facebook.com/business/help/1457434390995573)
- [Advantage+ Creative API Docs](https://developers.facebook.com/docs/marketing-api/advantage-plus-creative/)
- [Product Catalog API](https://developers.facebook.com/docs/marketing-api/catalog)
- [Asset Feed Spec](https://developers.facebook.com/docs/marketing-api/reference/asset-feed-spec/)

---

**Last Updated:** March 24, 2026
**Status:** 📋 Documentation Only - Not Implemented
**Next Review:** When we hit 50+ active advertisers or receive catalog feature requests
