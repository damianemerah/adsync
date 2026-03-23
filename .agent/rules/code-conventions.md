# Tenzu Code Conventions

## Stack

Next.js 16 App Router, Supabase, TanStack Query, Zustand,
Tailwind CSS, Shadcn UI, Zod, OpenAI, Flux via Fal.ai, Paystack

## File Structure Conventions

- Server actions: `src/actions/[domain].ts`
- API route handlers: `src/app/api/[domain]/route.ts`
- Exception: attribution redirect lives at `src/app/l/[token]/route.ts` (not under /api)
  — this is intentional: produces clean `tenzu.africa/l/[token]` URLs embedded in Meta ads
- Exception: pixel endpoint lives at `src/app/api/pixel/route.ts`
  — returns 1x1 transparent GIF, handles purchase events from website pixel snippets
- Client hooks: `src/hooks/use-[noun].ts`
- AI utilities: `src/lib/ai/[name].ts`
- Types: `src/types/[domain].ts`

## Patterns

- All DB access via Supabase server client in server actions and route handlers
- Client data fetching via TanStack Query hooks — never Supabase client directly in components
- New Supabase tables always get RLS policies in the same migration file
- All DB writes affecting campaigns must call revalidatePath("/campaigns")
- Non-blocking side effects (analytics, notifications) use fire-and-forget .then()
  Never await them — never block the main user flow for side effects

## TypeScript

- TypeScript errors are blockers — run `npx tsc --noemit` before marking any task done
- `any` is forbidden — use proper types or `unknown` with type guards
- Use types from `src/types/supabase.ts` for all DB row types

## Monetary Values

- All NGN values stored in kobo (integer × 100) in most tables
- Exception: `whatsapp_sales.amount_ngn` is whole Naira (simpler for UX input)
- All USD values stored in cents (integer × 100)
- Display: always `₦{amount.toLocaleString()}` — never "NGN" prefix
- FX rate: read from env `NEXT_PUBLIC_USD_NGN_RATE`, default 1600 — never hardcode

## Naming

- Attribution tokens: 8-char nanoid — `generateAttributionToken()`
- Pixel tokens: 12-char nanoid — separate namespace from attribution tokens
- DB migration files: `[YYYYMMDDHHMMSS]_[description].sql`
- DB functions: snake_case verbs — `increment_campaign_clicks`, `update_campaign_sales_summary`
- Server actions: camelCase verbs — `recordSale`, `launchCampaign`, `updateOrgProfile`
- Hooks: `use-[noun]` — `use-campaign-roi`, `use-org-context`

## Attribution Columns

- `destination_type`: TEXT — `'whatsapp'` or `'website'`, stored on both `attribution_links` and `link_clicks`
- `pixel_token`: TEXT — only populated for `website` destination_type links (enables pixel snippet)
- `event_type`: TEXT — `'click'` (default) or `'purchase'` (from pixel), stored on `link_clicks`
- `event_value_ngn`: INTEGER — sale amount in Naira (from pixel purchase events)
- Campaigns table: separate `whatsapp_clicks`, `website_clicks`, `total_link_clicks` counters
  `increment_campaign_clicks(p_campaign_id, p_destination_type)` branches on type

## Error Handling

- Never throw from `launchCampaign` — always return `{ success: boolean, error?: string }`
- Meta API failures: log with console.error, return `{ success: false, error: message }`
- TenzuGuard wraps all fragile Meta API calls
- Attribution link creation failure = fall back to raw destination URL silently
  Never block campaign launch because of attribution failure

## UI

- Mobile first — every component must work on 375px. Users are on phones.
- Strict color tokens: NEVER hex codes or arbitrary Tailwind colors (e.g. text-blue-500)
  ALWAYS use semantic vars from `src/app/globals.css`: text-primary, bg-muted, border-border
- AI features: ALWAYS use `text-ai` / `bg-ai` (Purple) to distinguish from standard actions
- Secondary text: `text-subtle-foreground` — never `text-muted-foreground` for readable content
- Headings: `font-heading` (Montserrat Alternates), body: `font-sans` (Montserrat)

## Proactive Audit

After completing any task:

1. Run `npx tsc --noemit` — fix all errors
2. Scan for hardcoded dummy data (John Doe, lorem ipsum, static arrays)
3. Ask: "This is displaying static data — the [table] already exists, should I connect it?"
