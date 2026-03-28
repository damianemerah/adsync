# Tenzu – Project Rules for Claude

## Available Tools (MCP)

**You have full access to several MCP servers to aid your workflow:**

- **Supabase MCP Server**: Use this for database research, running SQL queries, reading table structures, and applying migrations directly to the active project. Always apply migration with exact name and timestamp as on local files.
- **Perplexity-Ask MCP Server**: Use the Perplexity search integration to perform advanced, up-to-date research, search for current documentation, and resolve external implementation issues.
- **Context7 MCP Server**: **CRITICAL FOR META API:** Use this to fetch current Meta Graph API documentation (especially v25+). Meta's API changes frequently, especially regarding Ad Account Webhooks, Lead Forms, and Ad Creation endpoints. NEVER guess or hallucinate Meta Graph API fields (your training data is likely outdated). To verify the structure:
  1. Ask Context7 to query the `/websites/developers_facebook_graph-api` library ID (e.g., `ad account webhook subscribed fields v25`).
  2. Use `read_url_content` on the exact Meta Developer documentation URL if you have it.
  3. Always confirm the behavior for **v25.0** or the currently used version in the app.
- **Supabase Types**: Use this to get the types of the database tables. It is located at `src/types/supabase.ts`. To update it, run `npx -y supabase gen types typescript --project-id iomvjxlfxeppizkhehcl --schema public > src/types/supabase.ts`

## Agent Context & Skills

**Before writing any code for a feature, read `.agent/AGENTS.md`** — it is the single entry point for all project context:

- `.agent/rules/` — architecture decisions, code conventions, product rules, theme
- `.agent/skills/` — feature-area skill files (see index in AGENTS.md)
- `.agent/workflows/` — step-by-step workflow guides (`/implement-phase`, `/remodel`, etc.)
- `.agent/plans/` — current feature plans

The skill directory in AGENTS.md maps trigger phrases to the correct SKILL.md file. Always read the relevant skill before implementing a feature. Current skills include:

| Skill                   | Path                                             |
| ----------------------- | ------------------------------------------------ |
| Attribution Layer       | `.agent/skills/attribution/SKILL.md`             |
| AI Context              | `.agent/skills/ai-context/SKILL.md`              |
| Campaign Launch         | `.agent/skills/campaign-launch/SKILL.md`         |
| Naira Payments          | `.agent/skills/naira-payments/SKILL.md`          |
| Tier Strategy           | `.agent/skills/tier-strategy/SKILL.md`           |
| Marketing Copy          | `.agent/skills/marketing/SKILL.md`               |
| Frontend Design         | `.agent/skills/frontend-design/SKILL.md`         |
| Audience Targeting      | `.agent/skills/audience-targeting/SKILL.md`      |
| Lead Gen Objective      | `.agent/skills/lead-gen-objective/SKILL.md`      |
| App Promotion Objective | `.agent/skills/app-promotion-objective/SKILL.md` |
| Growth Strategy         | `.agent/skills/growth-strategy/SKILL.md`         |
| Lead Scoring            | `.agent/skills/lead-scoring/SKILL.md`            |
| Momentum Tracking       | `.agent/skills/momentum-tracking/SKILL.md`       |

---

## ⚠️ CRITICAL RULE: Always Wire UI Components

### The Problem

**You have a recurring pattern of building components but forgetting to wire them to the UI.** This wastes time and frustrates the user.

### Examples of Past Mistakes

1. **Creating `LeadsList.tsx` without adding it to campaign detail view** - Built the component, but user couldn't see it
2. **Building modals/sheets without adding trigger buttons** - Component exists but no way to open it
3. **Creating new pages without adding navigation links** - Page works but unreachable

### The Rule

**NEVER mark a UI component task as "complete" until:**

1. ✅ Component is built
2. ✅ Component is imported in parent component
3. ✅ Component is rendered (with conditional logic if needed)
4. ✅ User can navigate to it (buttons, links, tabs, routes, etc.)
5. ✅ You've verified the complete user flow

### Mandatory Checklist for UI Components

When creating any new component (modal, page, list, form, etc.):

- [ ] **Component file created** (`MyComponent.tsx`)
- [ ] **Imported in parent** (`import { MyComponent } from "..."`)"
- [ ] **Rendered in JSX** (`<MyComponent {...props} />`)
- [ ] **Navigation/trigger added** (button, link, tab, route, etc.)
- [ ] **Conditional rendering handled** (show/hide logic, permissions, feature flags)
- [ ] **User can actually see it** (not hidden behind a missing tab or route)

### Red Flags to Watch For

If you're doing any of these, STOP and wire the component:

- ❌ "I've created the component" → Did you add it to the parent?
- ❌ "The component is ready" → Can the user navigate to it?
- ❌ "Let's move on to the next task" → Have you tested the full user flow?

### Correct Implementation Pattern

```typescript
// ❌ BAD: Component exists but user can't see it
// File: src/components/features/LeadsList.tsx
export function LeadsList() { ... }
// No import, no render, no navigation → USER CANNOT ACCESS IT

// ✅ GOOD: Component is fully wired
// File: src/components/campaigns/campaign-detail-view.tsx
import { LeadsList } from "@/components/campaigns/leads-list"; // 1. Import

export function CampaignDetailView({ campaign }) {
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger> {/* 2. Navigation */}
      </TabsList>

      <TabsContent value="leads">
        <LeadsList campaignId={campaign.id} /> {/* 3. Render */}
      </TabsContent>
    </Tabs>
  );
}
```

### When Building Multi-Step Features

If a feature requires multiple components (backend + frontend + navigation):

1. **Plan the full flow first** (user journey from start to finish)
2. **Build backend** (API routes, server actions, database)
3. **Build UI component** (the actual component file)
4. **Wire the component** (import + render + navigation)
5. **Test the complete flow** (verify user can access it)
6. **ONLY THEN mark as complete**

### Exception: Reusable Components

If you're building a **reusable utility component** (not a feature):

- Document where it should be used
- Provide usage example
- Add to component library/storybook

But if you're building a **feature component** (user-facing):

- **ALWAYS wire it immediately**
- Don't leave it orphaned

---

## Architecture Overview

Next.js 16 App Router app with Supabase (Postgres + Auth). Users can belong to **multiple organizations**. Every page and data query must be scoped to the **active organization**.

## Active Organization Pattern

### The Rule

**Every query, action, and data fetch that is org-scoped MUST filter by the active org ID.**
Missing this causes data from other orgs to leak across workspace boundaries.

### How it works

| Context                            | Mechanism                                                                  | Import                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Server Components & Server Actions | `getActiveOrgId()` – reads `tenzu_active_org` cookie, validates against DB | `import { getActiveOrgId } from "@/lib/active-org"`                                |
| Client Components & Hooks          | `useActiveOrgContext()` – React Context set by the layout                  | `import { useActiveOrgContext } from "@/components/providers/active-org-provider"` |

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

---

## Edge Functions (Supabase Functions) — Multi-Org Pattern

### The Rule

**Edge Functions run as system-wide background jobs and do NOT filter by active org.** They are invoked by `pg_cron` with service role credentials and process **all organizations**.

### Why Edge Functions Are Different

| Context                     | Org Filtering Required? | Reason                                                                  |
| --------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| **Web App** (UI/API routes) | ✅ **YES**              | User is interacting with a specific workspace; must see only their data |
| **Edge Functions** (cron)   | ❌ **NO**               | System automation processing all orgs; identifies owners per record     |

### How Edge Functions Handle Multi-Org Data

Edge functions follow the **"fetch all, process per org, notify correct owner"** pattern:

```ts
// ✅ CORRECT: Edge function pattern
const { data: campaigns } = await supabase
  .from("campaigns")
  .select("id, name, organization_id") // Include organization_id
  .eq("status", "active");

for (const campaign of campaigns) {
  // Get the owner for THIS campaign's org
  const ownerId = await getOrgOwner(supabase, campaign.organization_id);

  // Send notification to the correct owner
  await sendNotification(ownerId, campaign);
}
```

```ts
// ❌ WRONG: Don't filter by a single org in edge functions
const orgId = await getActiveOrgId(); // ❌ NO! Edge functions don't have "active org"
const { data } = await supabase.from("campaigns").eq("organization_id", orgId); // ❌ This limits to one org only
```

### Current Edge Functions

All edge functions are scheduled via `pg_cron` and correctly implement multi-org processing:

| Function                 | Schedule       | Purpose                                                    | Org Scoping                                       |
| ------------------------ | -------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `sync-campaign-insights` | Every 6 hours  | Syncs Meta API metrics for all campaigns                   | Fetches all campaigns; each has `organization_id` |
| `subscription-lifecycle` | Daily 22:00    | Resets credits & expires trials                            | Processes all orgs in `organizations` table       |
| `account-health`         | Every 4 hours  | Checks ad account balances & pauses low-balance ads        | Fetches all ad_accounts; notifies per-org owner   |
| `post-launch-rules`      | Every 12 hours | Evaluates campaign performance & sends optimization alerts | Fetches all campaigns; notifies per-org owner     |
| `weekly-report`          | Weekly         | Sends performance summary emails                           | Groups by org; filters campaigns per org          |

### Helper Pattern: `getOrgOwner()`

Edge functions use this helper to find the correct user to notify:

```ts
async function getOrgOwner(supabase: any, organizationId: string) {
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .single();
  return data?.user_id ?? null;
}
```

### Key Files

| File                                                                                                                             | Purpose                                   |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [supabase/migrations/20260227160001_setup_pg_cron_schedules.sql](supabase/migrations/20260227160001_setup_pg_cron_schedules.sql) | Defines cron schedules for edge functions |
| `supabase/functions/*/index.ts`                                                                                                  | Edge function implementations             |

### When to Use Which Pattern

- **Building a Next.js API route or Server Action?** → Use `getActiveOrgId()` and filter by `organization_id`
- **Building a React hook or component?** → Use `useActiveOrgContext()` and include `activeOrgId` in queries
- **Building an Edge Function (cron job)?** → Fetch all records, include `organization_id`, and use `getOrgOwner()` to notify the right user


