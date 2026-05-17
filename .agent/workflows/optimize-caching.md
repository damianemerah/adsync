---
description: Audit and optimize a Next.js 16 App Router page for caching, streaming, Suspense, and TTFB best practices.
---

# Workflow: /optimize-caching

Trigger this workflow when you want to audit a specific route or page for Next.js 16 rendering best practices, ensuring we cache expensive data-fetching functions, stream heavy data with Suspense, and avoid blocking the Time to First Byte (TTFB).

> **App context:** Every route under `(authenticated)` uses `cookies()` (via Supabase auth and `getActiveOrgId()`), which permanently opts the route into **dynamic rendering**. The goal here is never "make the page static" — it is to cache individual data-fetching functions inside a dynamic page using `'use cache'`, so expensive fetches are not repeated on every request.

## Prerequisites — `'use cache'` in Next.js 16

`'use cache'` requires the `cacheComponents` feature flag in `next.config.ts` for Next.js 16.0.x. It can be placed at the top of any `async` function or Server Component to cache its return value across requests.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    cacheComponents: true,
  },
};
```

---

## ⚠️ Critical Rule: The Suspense Boundary Requirement

With `cacheComponents: true`, Next.js 16 enforces that **all uncached dynamic data access — cookies(), headers(), AND uncached fetch calls (e.g. `supabase.auth.getUser()`)** — must occur inside a `<Suspense>` boundary. Violations throw:

```
Error: Route "/...": Uncached data was accessed outside of <Suspense>.
```

### What `connection()` does and does NOT fix

`import { connection } from "next/server"` + `await connection()` opts the component into dynamic rendering and fixes **cookie access** (`cookies()`, `headers()`). It does **NOT** fix uncached fetch calls. `supabase.auth.getUser()` makes a network request and will still trigger the error even after `await connection()`.

### The correct fix for layouts

Layouts cannot be wrapped in `<Suspense>` from the outside by the router — they must sit inside a Suspense boundary provided by their **parent layout**. The pattern used in this app:

```tsx
// src/app/(authenticated)/layout.tsx  ← SYNCHRONOUS, provides the boundary
import { Suspense } from "react";
export default function AuthenticatedLayout({ children }) {
  return <Suspense>{children}</Suspense>;  // ← child layouts run inside this
}

// src/app/(authenticated)/(main)/layout.tsx  ← async, runs INSIDE the boundary above
export default async function MainLayout({ children }) {
  await connection();                    // explicit opt-in (documents intent)
  const supabase = await createClient(); // ← safe: inside <Suspense>
  const { data: { user } } = await supabase.auth.getUser(); // ← safe: fetch inside <Suspense>
  if (!user) redirect("/login");
  ...
}
```

### Rule of thumb

| Location                                                | Pattern                                                                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Top-most layout** (e.g. `(authenticated)/layout.tsx`) | Synchronous. Provides `<Suspense>{children}</Suspense>`. No dynamic data.                                                        |
| **Child layouts** (e.g. `(main)/layout.tsx`)            | Async. Call `await connection()` first, then access cookies/fetch freely.                                                        |
| **Pages**                                               | Inside child layout's Suspense. Call `await connection()` first. Wrap heavy sub-loaders in their own `<Suspense>` for streaming. |
| **Expensive cached functions**                          | Use `'use cache'` + `cacheTag()` + `cacheLife()`. No `connection()` needed.                                                      |

**Never add `createClient()` or any async data access to the top-most (route group) layout.** It sits above the Suspense boundary and any dynamic access there will trigger the error globally.

---

## Execution Steps

### 1. Target Selection

Identify the specific page or route you want to optimize.

```
/optimize-caching src/app/(authenticated)/(main)/campaigns/page.tsx
```

---

### 3. Analysis Phase (Runtime & Static)

Use `view_file` to understand the target's current state. Simultaneously, use the **Next.js MCP** to inspect the live environment:

1. **Check for Errors:** Run `nextjs_call` with `get_errors` to see if there are any active hydration or uncached data access errors.
2. **Inspect Routes:** Use `nextjs_call` with `get_routes` to verify the page structure and middleware involvement.

Look for these anti-patterns:

| Anti-pattern                   | What to look for                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Top-Level Awaits**           | `await Promise.all(...)` or sequential `await`s in the default export of `page.tsx` that block the HTML stream       |
| **Dynamic Functions**          | `cookies()`, `headers()`, or `searchParams` (all force dynamic rendering — expected in this app)                     |
| **`searchParams` async shape** | In Next.js 15+, `searchParams` is `Promise<Record<string, string>>` and must be awaited                              |
| **Missing Suspense**           | Data fetches not wrapped in `<Suspense>`                                                                             |
| **Missing loading.tsx**        | Absence of a `loading.tsx` file for the route segment                                                                |
| **Client Component Bloat**     | Server-side data fetched inside `"use client"` components via `useEffect` when it could come from a Server Component |
| **Uncached fetches**           | Expensive `async` functions (Meta API calls, aggregation queries) called without `'use cache'`                       |
| **Double-fetch**               | RSC fetching the same data that a TanStack Query `useQuery` also fetches on mount                                    |

---

### 3. Propose the Optimization Plan

Output an `implementation_plan.md` using the `<planning_mode>` workflow. The plan must detail:

- Which fetches are blocking TTFB.
- Which async functions are expensive enough to warrant `'use cache'` (with a `cacheTag` + `cacheLife`).
- How to split data fetching into asynchronous Server Components (`DataLoader` pattern).
- Where `<Suspense>` boundaries should go and how granular they should be (too coarse = poor UX; too fine = waterfall).
- Whether any Server Action that mutates cached data needs a matching `revalidateTag()` call.
- Whether client components that receive this data need a TanStack Query hydration boundary to avoid a double-fetch on mount.

**Wait for user approval before making any code changes.**

---

### 4. Execution (After Approval)

#### 4a. Create Loading State

Add `loading.tsx` with a layout-accurate Skeleton UI that matches the page shell.

#### 4b. Refactor Page — DataLoader Pattern

Move heavy data fetches into separate `async function DataLoader()` Server Components. Wrap them in `<Suspense>` inside `page.tsx`.

```tsx
// page.tsx
import { Suspense } from "react";
import { MetricsSkeleton } from "@/components/skeletons";
import { MetricsLoader } from "./metrics-loader"; // async Server Component

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>; // ← must be a Promise in Next.js 15+
}) {
  const { range } = await searchParams;

  return (
    <Shell>
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsLoader range={range} />
      </Suspense>
    </Shell>
  );
}
```

#### 4c. Implement Data Cache with `'use cache'`

Apply `'use cache'` at the top of expensive async data-fetching functions. Always pair it with `cacheTag()` for invalidation and `cacheLife()` for expiry.

```ts
import { unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from "next/cache";

async function getOrgMetrics(orgId: string) {
  "use cache";
  cacheTag(`metrics-${orgId}`); // targeted invalidation key
  cacheLife("hours"); // built-in profile: seconds | minutes | hours | days | weeks | max

  const { data } = await supabase
    .from("campaign_metrics")
    .select("...")
    .eq("organization_id", orgId);

  return data;
}
```

**Available `cacheLife` profiles:** `"seconds"` | `"minutes"` | `"hours"` | `"days"` | `"weeks"` | `"max"`

#### 4d. Wire Cache Invalidation in Server Actions

Any Server Action that writes to data covered by a `cacheTag` must call `revalidateTag()` after the mutation.

```ts
"use server";
import { revalidateTag } from "next/cache";

export async function updateCampaign(campaignId: string, payload: Partial<Campaign>) {
  const orgId = await getActiveOrgId();
  await supabase.from("campaigns").update(payload).eq("id", campaignId);

  revalidateTag(`metrics-${orgId}`); // bust the cached metrics for this org
  revalidateTag(`campaigns-${orgId}`);
}
```

#### 4e. (Optional) Hydrate TanStack Query to Avoid Double-Fetch

If a client component uses `useQuery` for data that a Server Component already fetched, use TanStack Query's `HydrationBoundary` to seed the client cache from the server — preventing a redundant network call on mount.

```tsx
// page.tsx (Server Component)
import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query";
import { CampaignsList } from "@/components/campaigns/campaigns-list"; // "use client"

export default async function CampaignsPage() {
  const orgId = await getActiveOrgId();
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["campaigns", orgId],
    queryFn: () => fetchCampaigns(orgId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CampaignsList />
    </HydrationBoundary>
  );
}

// campaigns-list.tsx ("use client")
function CampaignsList() {
  const { activeOrgId } = useActiveOrgContext();
  const { data } = useQuery({
    queryKey: ["campaigns", activeOrgId],
    queryFn: () => fetchCampaigns(activeOrgId),
    // data is already in the cache from the server prefetch — no extra request on mount
  });
  ...
}
```

#### 4f. Preserve Shell

Keep fast checks (auth validation, feature flags, active org resolution) at the top level of `page.tsx` so the layout shell renders immediately before any `<Suspense>` boundaries resolve.

---

### 5. Verification

- Run `npx tsc --noemit` to verify TypeScript types.
- Confirm that every `cacheTag` used in a data function has a matching `revalidateTag` call in the relevant Server Action(s).
- Confirm `searchParams` is typed as `Promise<...>` in any page that uses it.
- Add a summary of the changes to `walkthrough.md`.
