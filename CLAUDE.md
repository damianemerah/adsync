# AdSync – Project Rules for Claude

## Architecture Overview

Next.js 16 App Router app with Supabase (Postgres + Auth). Users can belong to **multiple organizations**. Every page and data query must be scoped to the **active organization**.

## Active Organization Pattern

### The Rule

**Every query, action, and data fetch that is org-scoped MUST filter by the active org ID.**
Missing this causes data from other orgs to leak across workspace boundaries.

### How it works

| Context                            | Mechanism                                                                   | Import                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Server Components & Server Actions | `getActiveOrgId()` – reads `sellam_active_org` cookie, validates against DB | `import { getActiveOrgId } from "@/lib/active-org"`                                |
| Client Components & Hooks          | `useActiveOrgContext()` – React Context set by the layout                   | `import { useActiveOrgContext } from "@/components/providers/active-org-provider"` |

### Server-side pattern (Server Components, Server Actions)

```ts
import { getActiveOrgId } from "@/lib/active-org";

const orgId = await getActiveOrgId();
if (!orgId) throw new Error("No organization found");

const { data } = await supabase
  .from("campaigns")
  .select("*")
  .eq("organization_id", orgId);
```

### Client-side pattern (React hooks / Client Components)

```ts
import { useActiveOrgContext } from "@/components/providers/active-org-provider";

const { activeOrgId } = useActiveOrgContext();

const query = useQuery({
  queryKey: ["campaigns", activeOrgId], // ← include in queryKey!
  queryFn: async () => {
    let q = supabase.from("campaigns").select("*");
    if (activeOrgId) q = q.eq("organization_id", activeOrgId);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
});
```

> **Do NOT use Zustand** for the active org ID. The value originates on the server (cookie) and is injected via `ActiveOrgProvider` in the layout — React Context is the right tool.

### Indirect org filtering (ads → campaigns)

Tables without a direct `organization_id` (e.g. `ads`) must filter through their parent using `!inner` join:

```ts
supabase
  .from("ads")
  .select("..., campaigns!inner(name, organization_id)")
  .eq("campaigns.organization_id", activeOrgId);
```

## Tables with organization_id

- `campaigns` ✅
- `ad_accounts` ✅
- `creatives` ✅
- `organizations` ✅ (is the org itself)
- `organization_members` ✅

## Tables scoped indirectly (via join)

- `ads` → through `campaigns.organization_id`
- `campaign_metrics` → through `campaigns.organization_id`

## Checklist when adding/editing a hook or action

When you create or modify a file in `src/hooks/` or `src/actions/`:

- [ ] Does it query a table that has `organization_id`? Add `.eq("organization_id", orgId)`.
- [ ] Is it a client hook? Use `useActiveOrgContext()` and include `activeOrgId` in `queryKey`.
- [ ] Is it a server action? Call `getActiveOrgId()` at the top.
- [ ] Does the table lack direct `organization_id`? Filter via `!inner` join to the parent.
- [ ] Are `invalidateQueries` calls including `activeOrgId` in the key? They should.

## Key Files

| File                                               | Purpose                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `src/lib/active-org.ts`                            | Server-side: resolves org from cookie                            |
| `src/components/providers/active-org-provider.tsx` | Client-side: React Context provider                              |
| `src/app/(authenticated)/(main)/layout.tsx`        | Calls `getActiveOrgId()` and wraps tree in `<ActiveOrgProvider>` |
| `src/store/dashboard-store.ts`                     | Zustand for dashboard UI state only (platform, date range, etc.) |
| `src/hooks/use-organization.ts`                    | Fetches all orgs + provides `switchOrganization`                 |

## Zustand usage

Zustand (`src/store/dashboard-store.ts`) is for **dashboard UI state only** (selected platform, date range, account filters). It does NOT store `activeOrgId` — that lives in the cookie and React Context.
