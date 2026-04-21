# Refactoring Governance

This rule defines constraints for refactoring code within the Tenzu codebase.

## Objective
Refactor carefully and incrementally. Improve readability and structure without changing behavior. **Identify the minimum safe refactor.** Never create abstractions unless they fix specific duplication or boundary problems.

## Core Architecture & Next.js Rules

- **Server-First:** Default to Server Components. Use "use client" only for interactivity, browser APIs, or state.
- **Server Logic:** Keep data fetching and business logic on the server. Use server actions for mutations.
- **Supabase:** Use the shared server client helper. Do not call `createClient()` in render paths. Avoid repeating setup.
- **React 19:** Use `useActionState` for form status/validation. Use `use()` only in Suspense-friendly boundaries.
- **Boundaries:** Keep files small (~300 lines) and single-purpose. Separate data access from UI.
- **Composition:** Prefer composition over inheritance. Extract shared constants/validation centrally.

## State & Data Governance

State has a strict hierarchy. Refactoring must not change ownership.

| State type | Tool | Rule |
|---|---|---|
| Server data | TanStack Query | **Exclusively.** Never use `useEffect` + `useState` for fetches. |
| Wizard state | Zustand | Only for multi-step flows and cross-component client state. |
| Local UI state | `useState` | For isolated toggles/hover within one component. |

- **No Duplication:** Never copy server state into Zustand.
- **React Query:** Always include `activeOrgId` in `queryKey`. Use `onSuccess/onError` for mutations.
- **Scoping:** Every org-scoped query MUST filter by `.eq("organization_id", orgId)`. Use `getActiveOrgId()` (Server) or `useActiveOrgContext()` (Client).

## Hook Granularity (Mutations vs. Queries)

**Rule:** Mutation hooks must be independent of query hooks. Never bundle `useMutation` calls inside the same exported function as a `useQuery`. They must be split into separate named exports.

| Pattern | Correct | Forbidden |
|---|---|---|
| Data fetching | `useCampaignsList()` | ~~`useCampaigns()` with embedded mutations~~ |
| Write actions | `useCampaignMutations()` | ~~Mutations inside a query hook~~ |

**Rationale:** When a monolithic hook bundles queries + mutations, every component that needs a single mutation also initializes and subscribes to the full background query. A single list-data update then re-renders all those components unnecessarily — even those that only care about writing. Splitting them eliminates this wasteful coupling.

**Naming Convention:**
- Query hook: `use{Resource}List()` or `use{Resource}Detail()` for single items.
- Mutation hook: `use{Resource}Mutations()`.
- Deprecated combined shims may exist temporarily during migration and MUST be marked `/** @deprecated */`.

## Defensive Filter Audit

**Rule:** Ensure status filters (e.g., `.eq("status", "active")`) guard *writes*, not *reads*.
- **Read/Display:** Should generally return data regardless of health/status so the UI can handle the state.
- **Write/Action:** Must strictly filter to safe/valid states.

## Hardcoded Value Audit

**Rule:** No static brand names, labels, or identifiers in API payloads or database writes. These drift silently when the product name changes.

**Watch for:**
- Hardcoded `name:` fields in Meta API requests (ads, adcreatives, adsets, campaigns)
- Static strings used as display names in DB upserts (e.g. `name: "AdSync Ad 1"`)
- Any string literal that embeds the app name or a fixed sequence number (`Ad 1`, `Creative 1`)

**Fix pattern:**
1. Derive the name from user-provided input (e.g. `campaignName`, `headline`)
2. If the value is unavailable, use a generator function — never a hardcoded fallback string
3. DB rows that mirror a platform object should use `platformObject.name`, not a static literal, so they stay in sync

**Generator pattern (approved):**
```ts
function generateAdObjectName(suffix: string, format?: "carousel" | "video"): string {
  const label = format ? `${format.charAt(0).toUpperCase() + format.slice(1)} ` : "";
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `${label}${suffix} - ${timestamp}`;
}
```

## Coding Standards

- **TypeScript:** `any` is forbidden. Fix during refactors. Run `npx tsc --noemit`.
- **Monetary:** Keep money in server state (React Query). Use `₦{amount.toLocaleString()}`. NGN/USD stored as kobo/cents (except `whatsapp_sales.amount_ngn`).
- **Design System:** Use semantic tokens from `globals.css`. Use `iconoir-react`. No hex codes, arbitrary shadows, or `rounded-3xl`.
- **DRY:** Extract helpers only if they improve maintainability. Delete dead code; don't comment it out.

## Workflow & Stop Conditions

1. **Inspect:** Look for duplication, dead code, large files (>300 lines), and `useEffect` fetches.
2. **Plan:** Propose a plan before large changes.
3. **Execute:** Smallest safe change first. Verify active-org scoping is preserved.
4. **Stop and Ask:** If behavior changes, client/server splits are ambiguous, or data leaking is a risk.

**Output Format:** Found, Plan, Files, Risks, Code, Verification.
