# Org-Level AI Context — Full Implementation Reference

## Phase 1C

Read this entire file before modifying any AI-related files.
The existing files MUST be extended, not replaced.

---

# PHASE 1C — Org-Level AI Context

## "The AI that already knows your business"

**Target: Months 2–4 (Hours with AI) (parallel with Phase 1B)**

---

### What Already Exists — Read These Files First

Before writing anything, read these existing files:

| File                                          | What it has                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `src/lib/ai/context-compiler.ts`              | `CampaignContext` interface, `compileContextPrompt()`, `hasValidContext()`, `analyzePrompt()` — EXTEND, never replace |
| `src/lib/ai/service.ts`                       | `generateAndSaveStrategy()`, `saveCampaignContext()` — EXTEND                                                         |
| `src/lib/ai/types.ts`                         | `AIStrategyResult`, `AIInput`                                                                                         |
| `targeting_profiles` table                    | `business_description`, `product_category` — Layer 2, already exists                                                  |
| `campaigns.ai_context`                        | Per-campaign JSON — Layer 3, already exists                                                                           |
| `ai_requests` table                           | `context_source`, `used_context` — already measures context quality                                                   |
| `src/app/(authenticated)/onboarding/page.tsx` | Captures `orgName` + `industry` in Step 1. The `INDUSTRIES` array is already defined here.                            |
| `src/actions/onboarding.ts`                   | `createOrganization()` — extend to save org profile fields                                                            |

---

### The Context Hierarchy

```
Layer 1 — Org Profile  (BUILD THIS — the gap)
  organizations.business_description  → "Women's fashion, Lagos-based"
  organizations.business_category     → "fashion_beauty"
  organizations.business_location     → "Lagos, Nigeria"
  organizations.target_audience       → "Women 18-35 in Lagos"
  Loaded via useOrgContext() hook, cached 30 mins

Layer 2 — Targeting Profile  (EXISTS)
  targeting_profiles.business_description
  targeting_profiles.product_category
  Saved by generateAndSaveStrategy()

Layer 3 — Campaign Context  (EXISTS)
  campaigns.ai_context (CampaignContext JSON)
  Saved by saveCampaignContext()

Layer 4 — User Message  (EXISTS)
  Real-time chat, overrides layers above where explicit
```

---

### 1C.1 Database Migration

**File:** `supabase/migrations/[timestamp]_org_ai_context.sql`

Extend the EXISTING `organizations` table — do not create a new table:

```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS business_description TEXT,
  ADD COLUMN IF NOT EXISTS business_category    TEXT,
  -- Values: 'fashion_beauty' | 'electronics' | 'services' | 'real_estate'
  --         | 'food_beverage' | 'tech_saas' | 'other'
  ADD COLUMN IF NOT EXISTS business_location    TEXT,
  -- e.g. "Lagos, Nigeria" — drives cultural context in compileContextPrompt()
  ADD COLUMN IF NOT EXISTS target_audience      TEXT,
  -- Plain text, e.g. "Women 18-35 in Lagos" — AI parses this
  ADD COLUMN IF NOT EXISTS whatsapp_number      TEXT;
  -- Primary selling WhatsApp number for default campaign destination
```

No RLS changes needed — `organizations` already has RLS. New columns inherit it.

---

### 1C.2 Extend CampaignContext — Modify Existing File

**Modified file:** `src/lib/ai/context-compiler.ts`

ADD the `OrgProfile` interface above the existing `CampaignContext`.
Then ADD `org?: OrgProfile` as the first field in `CampaignContext`.
Do NOT remove or rename any existing fields — this must be backward compatible.

```typescript
// ADD this new interface ABOVE the existing CampaignContext
export interface OrgProfile {
  name: string;
  businessDescription?: string;
  businessCategory?: string;
  businessLocation?: string; // e.g. "Lagos, Nigeria"
  targetAudience?: string; // plain text, AI parses it
}

// MODIFY existing CampaignContext — add org as optional Layer 1
export interface CampaignContext {
  org?: OrgProfile; // ← ADD — Layer 1 context (new)
  businessDescription: string; // ← KEEP — Layer 3 campaign-specific (existing)
  targeting: {
    interests: string[];
    behaviors: string[];
    locations: string[];
    demographics: {
      age_min: number;
      age_max: number;
      gender: "all" | "male" | "female";
    };
  };
  copy?: {
    headline: string;
    subHeadline?: string;
    bodyCopy: string;
  };
  platform?: "meta" | "tiktok" | "google";
  objective?: "awareness" | "sales" | "leads";
}
```

---

### 1C.3 Modify compileContextPrompt() — Same File

In `src/lib/ai/context-compiler.ts`, modify the SECTION 2 of `compileContextPrompt()`
to check `context.org` first, then fall back to existing `context.businessDescription`:

```typescript
// SECTION 2: Business Context — replace the existing block with this:

// Layer 1: Org profile (new — highest priority for business description)
if (context.org?.businessDescription) {
  prompt += ` for ${context.org.businessDescription}`;
} else if (context.businessDescription) {
  // Layer 3 fallback: campaign-specific description (preserves existing behaviour)
  prompt += ` for ${context.businessDescription}`;
}

// Org audience hint (new)
if (context.org?.targetAudience) {
  prompt += `. Primary audience: ${context.org.targetAudience}`;
}

// Org location enriches the location section (merges with campaign targeting.locations)
// Pass orgLocation down to SECTION 4 for use if targeting.locations is empty:
const orgLocation = context.org?.businessLocation;
```

In SECTION 4 (Location + Cultural Context), use `orgLocation` as fallback:

```typescript
// SECTION 4 — modify to use orgLocation as fallback:
const locationSource = locations && locations.length > 0 ? locations[0] : orgLocation;

if (locationSource) {
  prompt += `. Location: ${locationSource}`;
  const loc = locationSource.toLowerCase();
  if (loc.includes("lagos")) {
    prompt += ", modern Lagos urban aesthetic, vibrant Nigerian street culture";
  } else if (loc.includes("abuja")) {
    prompt += ", Abuja professional environment, modern Nigerian capital aesthetic";
  } else if (loc.includes("nigeria")) {
    prompt += ", authentic Nigerian cultural context, modern African aesthetic";
  }
}
```

---

### 1C.4 Industry → Category Mapping

The onboarding page already has this `INDUSTRIES` array:

```typescript
const INDUSTRIES = [
  "E-commerce (Fashion/Beauty)",
  "E-commerce (Electronics)",
  "Service Business",
  "Real Estate",
  "Food & Beverage",
  "Tech / SaaS",
  "Other",
];
```

Add this mapping helper in `src/actions/onboarding.ts`:

```typescript
function mapIndustryToCategory(industry: string): string {
  const map: Record<string, string> = {
    "E-commerce (Fashion/Beauty)": "fashion_beauty",
    "E-commerce (Electronics)": "electronics",
    "Service Business": "services",
    "Real Estate": "real_estate",
    "Food & Beverage": "food_beverage",
    "Tech / SaaS": "tech_saas",
    Other: "other",
  };
  return map[industry] || "other";
}
```

---

### 1C.5 Extend Onboarding — Capture Business Description

**Modified file:** `src/app/(authenticated)/onboarding/page.tsx`

Add two optional fields to Step 1 (the Business Name + Industry step).
Add after the existing Industry `<Select>` block:

```typescript
// Add to form state (at the top with other useState):
const [businessDescription, setBusinessDescription] = useState("");
const [targetAudience, setTargetAudience] = useState("");

// Add to handleFinish formData:
formData.append("businessDescription", businessDescription);
formData.append("targetAudience", targetAudience);

// Add to Step 1 JSX, after the Industry Select:
<div className="space-y-2">
  <Label htmlFor="businessDescription" className="text-base">
    What do you sell?{" "}
    <span className="text-muted-foreground text-sm font-normal">(optional)</span>
  </Label>
  <Textarea
    id="businessDescription"
    placeholder="e.g. Women's fashion and accessories, Lagos-based, fast delivery"
    value={businessDescription}
    onChange={(e) => setBusinessDescription(e.target.value)}
    className="bg-muted border-border resize-none"
    rows={2}
  />
  <p className="text-xs text-muted-foreground">
    Helps our AI write better ads from day one — no re-explaining every time.
  </p>
</div>

<div className="space-y-2">
  <Label htmlFor="targetAudience" className="text-base">
    Who are your customers?{" "}
    <span className="text-muted-foreground text-sm font-normal">(optional)</span>
  </Label>
  <Input
    id="targetAudience"
    placeholder="e.g. Women 18-35 in Lagos and Abuja"
    value={targetAudience}
    onChange={(e) => setTargetAudience(e.target.value)}
    className="bg-muted border-border"
  />
</div>
```

---

### 1C.6 Extend createOrganization Action

**Modified file:** `src/actions/onboarding.ts`

In the existing `createOrganization()` function, extend the `organizations` insert
to include the new profile fields:

```typescript
// In the organizations.insert() call, add these fields:
business_description: formData.get("businessDescription") as string || null,
business_category:    mapIndustryToCategory(industry),
target_audience:      formData.get("targetAudience") as string || null,
```

Add the new `updateOrgProfile` action at the bottom of the same file:

```typescript
export async function updateOrgProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  if (!member) throw new Error("No organization");

  const { error } = await supabase
    .from("organizations")
    .update({
      business_description: (formData.get("businessDescription") as string) || null,
      business_category: (formData.get("businessCategory") as string) || null,
      business_location: (formData.get("businessLocation") as string) || null,
      target_audience: (formData.get("targetAudience") as string) || null,
      whatsapp_number: (formData.get("whatsappNumber") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.organization_id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings/business");
}
```

---

### 1C.7 Org Context Hook

**New file:** `src/hooks/use-org-context.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface OrgContext {
  name: string;
  businessDescription: string | null;
  businessCategory: string | null;
  businessLocation: string | null;
  targetAudience: string | null;
  whatsappNumber: string | null;
}

export function useOrgContext() {
  return useQuery({
    queryKey: ["org-context"],
    queryFn: async (): Promise<OrgContext | null> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("organizations")
        .select(
          "name, business_description, business_category, business_location, target_audience, whatsapp_number"
        )
        .single();
      if (!data) return null;
      return {
        name: data.name,
        businessDescription: data.business_description,
        businessCategory: data.business_category,
        businessLocation: data.business_location,
        targetAudience: data.target_audience,
        whatsappNumber: data.whatsapp_number,
      };
    },
    staleTime: 1000 * 60 * 30, // 30 minutes — org profile rarely changes
  });
}
```

---

### 1C.8 Wire Into Campaign Wizard

**Modified file:** `src/components/campaigns/new/steps/goal-platform-step.tsx`

```typescript
import { useOrgContext } from "@/hooks/use-org-context";

// In the component:
const { data: orgContext } = useOrgContext();

// When calling generateAndSaveStrategy or building AI input:
const aiInput = {
  businessDescription: orgContext?.businessDescription || campaignStore.businessDescription || "",
  location: orgContext?.businessLocation || "Nigeria",
  targetAudience: orgContext?.targetAudience || undefined,
};
```

---

### 1C.9 Business Settings Page — Edit Org Profile

**Modified file:** `src/app/(authenticated)/settings/business/page.tsx`

Add these fields to the existing business settings form, using `updateOrgProfile` action:

```typescript
// New fields alongside existing org name field:

<div className="space-y-2">
  <Label>What do you sell?</Label>
  <Textarea
    placeholder="e.g. Women's fashion and accessories, fast delivery in Lagos"
    value={businessDescription}
    onChange={(e) => setBusinessDescription(e.target.value)}
    rows={2}
    className="bg-muted border-border resize-none"
  />
  <p className="text-xs text-muted-foreground">
    Tenzu's AI uses this to write better ads without you re-explaining every time.
  </p>
</div>

<div className="space-y-2">
  <Label>Who are your customers?</Label>
  <Input
    placeholder="e.g. Women 18-35 in Lagos and Abuja"
    value={targetAudience}
    onChange={(e) => setTargetAudience(e.target.value)}
  />
</div>

<div className="space-y-2">
  <Label>Your WhatsApp selling number</Label>
  <Input
    placeholder="e.g. 08012345678"
    value={whatsappNumber}
    onChange={(e) => setWhatsappNumber(e.target.value)}
  />
  <p className="text-xs text-muted-foreground">
    Used as the default destination for WhatsApp campaigns.
  </p>
</div>
```

---

### Phase 1C Deliverable Check

After this phase:

- `organizations` table has `business_description`, `business_category`, `business_location`, `target_audience`, `whatsapp_number`
- Onboarding Step 1 captures description + audience (optional, no friction)
- `CampaignContext` has `org?: OrgProfile` as Layer 1 — backward compatible
- `compileContextPrompt()` injects org description before campaign-specific data
- Campaign wizard opens with org context pre-loaded — AI knows the business from message one
- Business settings page lets SMEs update profile at any time
- `use-org-context` caches for 30 mins — zero repeated DB calls per session
- Impact measurable via `ai_requests.context_source` — 'org_profile' hits should grow
