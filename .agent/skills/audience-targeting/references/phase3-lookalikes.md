# Phase 3: Lookalike Audiences (Pro Tier Scaler)

Prerequisite: User must have at least one custom audience with **1,000+ people** in it. Meta requires a minimum source audience size of 100, but 1,000+ is recommended for reliable lookalike quality. Below 100, Meta API returns error code 2654.

This phase is **Agency tier only**. Do not expose to Starter or Growth users.

---

## How Meta v24 Lookalikes Work

Lookalike audiences are **pre-created objects** in Meta, not inline parameters.  
You do not pass a "1%" percentage directly in the ad set targeting payload.  
Instead:

1. You **create** a lookalike audience via `POST /act_{id}/customaudiences` with a source audience ID and ratio
2. Meta returns a lookalike audience ID (e.g. `"23856789000"`)
3. **That ID is then used exactly like a custom audience ID** in `custom_audiences: [{ id: "23856789000" }]`

The `meta_audiences` table from Phase 2 already has `audience_type = 'lookalike'`, `lookalike_ratio`, `lookalike_country` — these rows represent **pre-created lookalike audiences** that Meta manages.

---

## 3A — Create Lookalike API Method

Add to `src/lib/api/meta.ts`:

```typescript
/**
 * Creates a lookalike audience from a source custom audience.
 * Meta v24 — ratio is a decimal between 0.01 (1%) and 0.20 (20%).
 * Country: "NG" for Nigeria.
 * 
 * After creation, Meta returns an audience ID. Sync it into meta_audiences table.
 * Lookalike creation is async on Meta's side — status will be "processing" initially.
 */
createLookalikeAudience: async (
  token: string,
  adAccountId: string,
  params: {
    sourceAudienceId: string;  // Platform audience ID of the source custom audience
    ratio: number;             // 0.01 = 1%, 0.03 = 3%
    country: string;           // "NG"
    name: string;              // Human-readable name e.g. "Paystack Buyers 1% NG"
  },
) => {
  const id = adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;

  return MetaService.request(`/${id}/customaudiences`, "POST", token, {
    name: params.name,
    subtype: "LOOKALIKE",
    origin_audience_id: params.sourceAudienceId,
    lookalike_spec: {
      ratio: params.ratio,       // e.g. 0.01
      country: params.country,   // "NG"
      type: "similarity",        // "similarity" (quality) | "reach" (size)
    },
  });
  // Returns: { id: "23856789000" }
},
```

---

## 3B — Server Action: Create & Sync Lookalike

Add to `src/actions/audiences.ts`:

```typescript
/**
 * Creates a lookalike audience on Meta and syncs into meta_audiences table.
 * Agency tier only.
 */
export async function createLookalikeAudience({
  adAccountId,
  sourceAudienceId,
  ratio,        // 0.01 | 0.03 | 0.05 | 0.10
  country = "NG",
}: {
  adAccountId: string;
  sourceAudienceId: string;
  ratio: number;
  country?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Tier gate — Agency only
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  const { data: org } = await supabase
    .from("organizations")
    .select("subscription_tier")
    .eq("id", member?.organization_id)
    .single();

  if (org?.subscription_tier !== "agency") {
    return {
      success: false,
      error: "Lookalike audiences require the Agency plan.",
    };
  }

  const { data: account } = await supabase
    .from("ad_accounts")
    .select("id, platform_account_id, access_token, organization_id")
    .eq("id", adAccountId)
    .single();

  if (!account) return { success: false, error: "Ad account not found" };

  try {
    const token = decrypt(account.access_token);
    const ratioLabel = `${Math.round(ratio * 100)}%`;
    const name = `Sellam Lookalike ${ratioLabel} ${country} — auto`;

    const result = await MetaService.createLookalikeAudience(token, account.platform_account_id, {
      sourceAudienceId,
      ratio,
      country,
      name,
    });

    // Save to DB
    await supabase.from("meta_audiences").insert({
      ad_account_id: account.id,
      organization_id: account.organization_id,
      platform_audience_id: result.id,
      name,
      audience_type: "lookalike",
      subtype: "LOOKALIKE",
      lookalike_ratio: ratio,
      lookalike_country: country,
      source_audience_id: sourceAudienceId,
    });

    return { success: true, audienceId: result.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
```

---

## 3C — Store Changes (`campaign-store.ts`)

Add to `CampaignState` interface:

```typescript
// Phase 3: Lookalike audiences (Agency tier)
lookalikAudienceIds: string[];   // Meta platform_audience_id values for lookalike inclusion
```

Add to initial state + `resetDraft`:

```typescript
lookalikAudienceIds: [],
```

**Bump store to version 10** (Phase 2 was v9):

```typescript
// Version 10 migration: Add lookalikeAudienceIds
if (version < 10) {
  return {
    ...(persistedState as any),
    lookalikAudienceIds: [],
  } as CampaignState;
}
```

---

## 3D — API Payload Changes (`meta.ts`)

Lookalike audience IDs are passed via the same `custom_audiences` array as custom audiences.  
Meta treats them identically in the payload — just merge both arrays:

```typescript
// Merge custom + lookalike audience IDs for the payload
const allAudienceIds = [
  ...(params.targeting.customAudienceIds ?? []),
  ...(params.targeting.lookalikAudienceIds ?? []),
];

// In targetingPayload:
...(allAudienceIds.length > 0 && {
  custom_audiences: allAudienceIds.map((id: string) => ({ id })),
}),
```

> ⚠️ Even though they are called "lookalike" conceptually, in Meta v24 they go into `custom_audiences` not a separate field. This is the correct and only way.

---

## 3E — Lookalike UI Flow

1. User opens audience step → Sellam detects Agency tier
2. "Scale with Lookalikes" section appears below retargeting
3. Show available custom audiences as source options with audience size
4. Let user pick: 1% (best quality), 3% (sweet spot), 5% (scale)
5. "Generate Lookalike" button → calls `createLookalikeAudience()` server action
6. Newly created lookalike appears in the list → user can select it for the campaign

### Recommended Ratio Labels for Nigerian SMEs

```typescript
const LOOKALIKE_RATIOS = [
  { value: 0.01, label: "1% — Most Similar (Best Quality)", recommended: false },
  { value: 0.03, label: "3% — Sweet Spot (Recommended)", recommended: true },
  { value: 0.05, label: "5% — Wider Reach", recommended: false },
  { value: 0.10, label: "10% — Maximum Scale", recommended: false },
];
```

### Tier Gate

```typescript
// UI — only render for Agency
if (org.subscription_tier !== "agency") {
  return <LookalikeUpgradePrompt tier="agency" />;
}

// Server action — already gated in createLookalikeAudience()
// Also validate in campaigns.ts launch action:
if (
  params.targeting.lookalikAudienceIds?.length > 0 &&
  org.subscription_tier !== "agency"
) {
  return {
    success: false,
    error: "Lookalike audience scaling requires the Agency plan.",
  };
}
```

---

## Sellam Gold Strategy (The Paystack Lookalike)

This is the highest-value use case. When the user has Paystack payment data connected:

1. Create a custom audience from "Paystack Purchasers" (either via a customer list upload or via pixel `Purchase` events)
2. Use that as the source for a 1–3% Lookalike
3. Run acquisition campaigns targeting only the lookalike

Expected ROAS improvement: 2–3x vs interests-only targeting.

> Implementation note: Customer list upload (email/phone) requires a separate flow using  
> `POST /act_{id}/customaudiences` with `subtype: "CUSTOM"` and a hashed data payload.  
> This is a Phase 3+ feature. Do not implement in the same sprint as basic lookalikes.

---

## Phase 3 Launch Checklist

- [ ] `MetaService.createLookalikeAudience()` added to `meta.ts`
- [ ] `createLookalikeAudience()` server action added to `audiences.ts`
- [ ] `lookalikAudienceIds` added to store (v10 migration)
- [ ] API payload merges `customAudienceIds + lookalikAudienceIds` into single `custom_audiences` array
- [ ] Lookalike UI section added to audience step (Agency gate)
- [ ] Tier gate in both UI and server action
- [ ] `targeting_snapshot` on DB includes lookalike IDs at launch
- [ ] TypeScript check: `npx tsc --noemit` passes
- [ ] Min audience size guard: surface a warning if source audience `approximate_count < 1000`
