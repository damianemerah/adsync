# Workflow: Check Active Org Context

## When to run this
Run this check whenever you **create or modify** any file in:
- `src/hooks/`
- `src/actions/`
- `src/app/(authenticated)/` (pages and layouts)
- `src/components/` (any component that fetches data)

## Step-by-step audit

### 1. Identify the file type

**Server file** (has `"use server"`, is a page/layout Server Component, or is in `src/actions/`)?
→ Go to **Server Audit** below.

**Client file** (has `"use client"`, or is a hook in `src/hooks/`)?
→ Go to **Client Audit** below.

---

### Server Audit

1. Does the file query any of these tables: `campaigns`, `ad_accounts`, `creatives`, `organization_members`, `organizations`?
   - **YES** → Does it call `getActiveOrgId()`?
     - **NO** → Add it: `const orgId = await getActiveOrgId();` and `.eq("organization_id", orgId)` on the query.
   - **NO** → Does it query `ads`, `campaign_metrics`, or other child tables?
     - **YES** → Check the parent table and join-filter through `organization_id`.

2. Import check: `import { getActiveOrgId } from "@/lib/active-org";` must be present.

---

### Client Audit

1. Does the file use `useQuery` or `useMutation` that fetches org-scoped data?
   - **YES** → Does it call `useActiveOrgContext()`?
     - **NO** → Add: `const { activeOrgId } = useActiveOrgContext();`
   - Does the `queryKey` include `activeOrgId`? E.g. `["campaigns", activeOrgId]`?
     - **NO** → Add it — queries keyed without `activeOrgId` won't re-run on org switch.
   - Does the query have `.eq("organization_id", activeOrgId)` (guarded by `if (activeOrgId)`)?
     - **NO** → Add it.
   - Do `invalidateQueries` calls include `activeOrgId` in the key?
     - **NO** → Update them.

2. Import check: `import { useActiveOrgContext } from "@/components/providers/active-org-provider";` must be present.

---

### Indirect tables (ads, campaign_metrics)

These tables don't have a direct `organization_id`. Use `!inner` join:

```ts
// Client example
supabase
  .from("ads")
  .select("..., campaigns!inner(name, organization_id)")
  .eq("campaigns.organization_id", activeOrgId)
```

---

## Quick-scan command

To find files that may be missing org context, run:

```bash
# Find hooks/actions that query org-scoped tables but lack org filtering
grep -rn "\.from(\"campaigns\"\|\"ad_accounts\"\|\"creatives\")" src/hooks/ src/actions/ \
  | grep -v "organization_id\|getActiveOrgId\|useActiveOrgContext"
```

If this returns results, those files need the org context treatment above.
