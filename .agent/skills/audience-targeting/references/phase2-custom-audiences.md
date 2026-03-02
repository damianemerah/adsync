# Phase 2: Custom Audiences (Warm Traffic Engine)

Prerequisite: User must have run at least one campaign via Sellam with AdSync Link attribution OR have a Meta Pixel with recorded fires. Without this data, custom audiences will be empty and Meta will reject the ad set.

---

## 2A — Database Layer

### New Table: `meta_audiences`

This table syncs and caches the user's available Meta custom audiences from the Meta API. It is scoped per `ad_account` (not per org, since one org can have multiple ad accounts).

```sql
-- Migration name: add_meta_audiences_table
CREATE TABLE public.meta_audiences (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id uuid NOT NULL REFERENCES public.ad_accounts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Meta-provided fields
  platform_audience_id text NOT NULL,          -- Meta's audience ID e.g. "23856340123"
  name                 text NOT NULL,           -- Human-readable name from Meta
  audience_type        text NOT NULL,           -- 'custom' | 'lookalike'
  subtype              text,                    -- 'WEBSITE', 'CUSTOM', 'APP', 'ENGAGEMENT', 'LOOKALIKE'
  approximate_count    integer,                 -- Meta's estimated audience size (can be null)
  lookalike_ratio      numeric(4,3),            -- e.g. 0.01 = 1%, only for lookalike type
  lookalike_country    text,                    -- e.g. "NG"
  source_audience_id   text,                    -- For lookalikes: the source custom audience ID

  -- Sync metadata
  last_synced_at       timestamptz DEFAULT now(),
  is_stale             boolean DEFAULT false,   -- Flag if >7 days since last sync

  created_at           timestamptz DEFAULT now(),

  UNIQUE(ad_account_id, platform_audience_id)
);

-- RLS: users can only see audiences for their org's ad accounts
ALTER TABLE public.meta_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_meta_audiences"
  ON public.meta_audiences FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Index for fast lookup by ad account
CREATE INDEX idx_meta_audiences_ad_account ON public.meta_audiences(ad_account_id);
CREATE INDEX idx_meta_audiences_org ON public.meta_audiences(organization_id);
```

> The `campaigns` table already has a `targeting_snapshot` jsonb column. When a campaign launches with custom audiences, store the audience IDs + names snapshot there for historical reference. **Do not add a FK from campaigns to meta_audiences** — the Meta audience can be deleted externally.

---

## 2B — Meta API: Fetch Custom Audiences

### New `MetaService` Method

Add to `src/lib/api/meta.ts`:

```typescript
/**
 * Fetch all custom + lookalike audiences for an ad account.
 * Used to populate the audience selector UI and sync the meta_audiences DB table.
 * Meta v24 — fields verified against Marketing API reference.
 */
getCustomAudiences: async (token: string, adAccountId: string) => {
  const id = adAccountId.startsWith("act_")
    ? adAccountId
    : `act_${adAccountId}`;

  const data = await MetaService.request(
    `/${id}/customaudiences?fields=id,name,subtype,approximate_count,lookalike_ratio,lookalike_spec&limit=50`,
    "GET",
    token,
  );
  return data.data || [];
  // Each item shape:
  // {
  //   id: "23856340123",
  //   name: "Website Visitors 30d",
  //   subtype: "WEBSITE",                    // WEBSITE | CUSTOM | APP | ENGAGEMENT | LOOKALIKE
  //   approximate_count: 1500,
  //   lookalike_ratio: null,                 // Only for LOOKALIKE subtype
  //   lookalike_spec: { ratio: 0.01, country: "NG", ... }
  // }
},
```

### Sync Server Action

Create `src/actions/audiences.ts`:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { MetaService } from "@/lib/api/meta";
import { decrypt } from "@/lib/crypto";

/**
 * Syncs Meta custom audiences for an ad account into the meta_audiences table.
 * Call this:
 *   - When the user opens the audience step in the wizard (lazy sync)
 *   - On a background cron (weekly staleness refresh)
 */
export async function syncMetaAudiences(adAccountId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  // Fetch ad account with token
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("id, platform_account_id, access_token, organization_id")
    .eq("id", adAccountId)
    .single();

  if (!account) return { success: false, error: "Ad account not found" };

  try {
    const token = decrypt(account.access_token);
    const audiences = await MetaService.getCustomAudiences(
      token,
      account.platform_account_id,
    );

    if (!audiences.length) return { success: true, count: 0 };

    // Upsert into meta_audiences
    const rows = audiences.map((a: any) => ({
      ad_account_id: account.id,
      organization_id: account.organization_id,
      platform_audience_id: a.id,
      name: a.name,
      audience_type: a.subtype === "LOOKALIKE" ? "lookalike" : "custom",
      subtype: a.subtype,
      approximate_count: a.approximate_count ?? null,
      lookalike_ratio: a.lookalike_spec?.ratio ?? null,
      lookalike_country: a.lookalike_spec?.country ?? null,
      source_audience_id: a.lookalike_spec?.origin?.[0]?.id ?? null,
      last_synced_at: new Date().toISOString(),
      is_stale: false,
    }));

    await supabase
      .from("meta_audiences")
      .upsert(rows, { onConflict: "ad_account_id, platform_audience_id" });

    return { success: true, count: rows.length };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Fetch synced audiences from DB for the campaign wizard audience selector.
 */
export async function getAvailableAudiences(adAccountId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("meta_audiences")
    .select("id, platform_audience_id, name, audience_type, subtype, approximate_count, lookalike_ratio")
    .eq("ad_account_id", adAccountId)
    .order("audience_type", { ascending: true }) // custom first, then lookalike
    .order("name", { ascending: true });

  if (error) return [];
  return data ?? [];
}
```

---

## 2C — Store Changes (`campaign-store.ts`)

Add to `CampaignState` interface:

```typescript
// Phase 2: Custom audience retargeting
customAudienceIds: string[];     // Meta platform_audience_id values for inclusion
```

Add to initial state + `resetDraft`:

```typescript
customAudienceIds: [],
```

**Bump store to version 9** (Phase 1 was v8):

```typescript
// Version 9 migration: Add customAudienceIds
if (version < 9) {
  return {
    ...(persistedState as any),
    customAudienceIds: [],
  } as CampaignState;
}
```

---

## 2D — API Payload Changes (`meta.ts`)

Inside `targetingPayload` in `createAdSet`, add:

```typescript
// Custom audiences — only include if IDs are provided
...(params.targeting.customAudienceIds?.length > 0 && {
  custom_audiences: params.targeting.customAudienceIds.map(
    (id: string) => ({ id }),
  ),
}),
```

> Meta v24 format: `custom_audiences: [{ id: "23856340123" }, { id: "23856340456" }]`  
> An empty array `[]` will cause Meta to return error code 100. Always guard with length check.

---

## 2E — Retargeting Toggle UI

In `audience-chat-step.tsx` or the audience step, add a "Retargeting" mode toggle that:

1. Calls `syncMetaAudiences(adAccountId)` on mount (lazy sync, show spinner)
2. Renders a list of available custom audiences from `getAvailableAudiences()`
3. Shows approximate count next to each audience ("~1,500 people")
4. Allows multi-select; stores selected `platform_audience_id` values in `customAudienceIds`
5. Shows a gating message for Starter tier users: "Upgrade to Growth to unlock retargeting"

### Tier Gate

```typescript
// In the UI component:
if (org.subscription_tier === "starter") {
  return <RetargetingUpgradePrompt />;
}
```

```typescript
// In campaigns.ts server action — validate server-side too:
if (
  params.targeting.customAudienceIds?.length > 0 &&
  org.subscription_tier === "starter"
) {
  return {
    success: false,
    error: "Custom audience retargeting requires Growth plan or above.",
  };
}
```

---

## Phase 2 Launch Checklist

- [ ] Supabase migration: `meta_audiences` table created with RLS
- [ ] `MetaService.getCustomAudiences()` method added to `meta.ts`
- [ ] `syncMetaAudiences()` server action created in `src/actions/audiences.ts`
- [ ] `getAvailableAudiences()` server action created
- [ ] `customAudienceIds` added to store (v9 migration)
- [ ] `custom_audiences` conditional added to `targetingPayload`
- [ ] Retargeting toggle UI added to audience step
- [ ] Tier gate: Growth+ only (both UI and server action)
- [ ] `targeting_snapshot` in DB includes `customAudienceIds` on launch
- [ ] TypeScript check: `npx tsc --noemit` passes
