# Sellam — AI Agent Entry Point (AGENTS.md)

> **Product Name:** Sellam (code repo: `adsync/`) — Nigerian Pidgin for "sell it."
> **Mission:** Democratize Meta ad management for Nigerian SMEs — hustlers who sell fashion, food, beauty, and services primarily via WhatsApp.

---

## Quick Start for AI Agents

**Before writing any code, always:**

1. Read `.agent/rules/project-rule.md` — architecture, tech stack, and implementation rules
2. Read `.agent/rules/decisions.md` — settled decisions (do not revisit these)
3. Read `.agent/rules/sellam-product.md` — product vision, MVP rules, UI language
4. Read the **relevant skill file** for the feature area you are working in (see index below)

---

## Skill Directory

| Skill                       | Trigger Phrases                                                                                                                                                                                                              | SKILL.md                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Attribution Layer**       | attribution link, smart link, `/l/[token]`, pixel, WhatsApp clicks, ROI dashboard, `link_clicks`, CAPI, Conversions API, fbclid, `updateAdAccountCapi`, Meta Pixel ID, offline conversion, capi_access_token                 | [skills/attribution/SKILL.md](skills/attribution/SKILL.md)                         |
| **AI Context**              | org context, business description, `compileContextPrompt`, `useOrgContext`, category playbooks                                                                                                                               | [skills/ai-context/SKILL.md](skills/ai-context/SKILL.md)                           |
| **Campaign Launch**         | launch campaign, Meta API, `campaigns.ts`, policy guard, ad copy check, 1:1:1 rule                                                                                                                                           | [skills/campaign-launch/SKILL.md](skills/campaign-launch/SKILL.md)                 |
| **Naira Payments**          | ad budget, top-up, virtual card, wallet, Paystack, Grey API, Geegpay                                                                                                                                                         | [skills/naira-payments/SKILL.md](skills/naira-payments/SKILL.md)                   |
| **Tier Strategy**           | tier, credits, Starter, Growth, Agency, `TIER_CONFIG`, feature gates, upgrade prompt                                                                                                                                         | [skills/tier-strategy/SKILL.md](skills/tier-strategy/SKILL.md)                     |
| **Marketing Copy**          | landing page, email, social post, copywriting, brand voice, competitive positioning                                                                                                                                          | [skills/marketing/SKILL.md](skills/marketing/SKILL.md)                             |
| **Frontend Design**         | UI, dashboard, Soft Modern, Wask aesthetic, Shadcn, layout, `/remodel`                                                                                                                                                       | [skills/frontend-design/SKILL.md](skills/frontend-design/SKILL.md)                 |
| **OpenAI API**              | OpenAI, Responses API, structured output, skill upload, JSON schema                                                                                                                                                          | [skills/openai-api/SKILL.md](skills/openai-api/SKILL.md)                           |
| **Lead Scoring**            | lead prioritization, which ad to optimize, cost-per-chat, best performing ad                                                                                                                                                 | [skills/lead-scoring/SKILL.md](skills/lead-scoring/SKILL.md)                       |
| **Momentum Tracking**       | stalled deal, no chats, ad went quiet, no sales, re-engagement prompt                                                                                                                                                        | [skills/momentum-tracking/SKILL.md](skills/momentum-tracking/SKILL.md)             |
| **Growth Strategy**         | free dashboard, read-only mode, `SubscriptionGate`, action gating, date range limit, upsell                                                                                                                                  | [skills/growth-strategy/SKILL.md](skills/growth-strategy/SKILL.md)                 |
| **Audience Targeting**      | language targeting, locales, income proxy, custom audiences, lookalike audiences, retargeting toggle, exclusions, Phase 1/2/3 targeting, meta_audiences table, `customAudienceIds`, `lookalikAudienceIds`, `targetLanguages` | [skills/audience-targeting/SKILL.md](skills/audience-targeting/SKILL.md)           |
| **Lead Gen Objective**      | OUTCOME_LEADS, lead gen form, instant form, lead ad creative, lead_gen_form_id, `createLeadGenForm`, `getLeadGenForms`, lead-form-step                                                                                       | [skills/lead-gen-objective/SKILL.md](skills/lead-gen-objective/SKILL.md)           |
| **App Promotion Objective** | OUTCOME_APP_PROMOTION, app installs, application_id, promoted_object, app store URL, `app-info-step`, app_promotion                                                                                                          | [skills/app-promotion-objective/SKILL.md](skills/app-promotion-objective/SKILL.md) |

---

## Implementation Phase Status

| Phase    | Feature                                                                                              | Status      |
| -------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| **1A**   | Attribution layer — smart links, click tracking, redirect route                                      | ✅ Complete |
| **1B**   | Naira ROI dashboard — Mark as Sold, `useCampaignROI`                                                 | ✅ Complete |
| **1C**   | Org-level AI context — `useOrgContext`, category playbooks                                           | ✅ Complete |
| **CAPI** | Meta Conversions API — offline WhatsApp + website CAPI events, `fbclid` capture, CAPI settings UI    | ✅ Complete |
| **2A**   | Naira ad budget wallet — Paystack top-up, virtual USD card                                           | ✅ Complete |
| **T1**   | Targeting Phase 1 — Language, income proxies, exclusions                                             | ⬜ Next     |
| **T2**   | Targeting Phase 2 — Custom audiences, retargeting                                                    | ⬜ Planned  |
| **T3**   | Targeting Phase 3 — Lookalike audiences (Agency tier)                                                | ⬜ Planned  |
| **2B**   | Creative intelligence — UGC video pipeline                                                           | ⬜ Planned  |
| **3**    | AI Vision Feedback Loop — `analyze-assets` cron, GPT-4o Vision, `design_insights`, `insightsContext` | 🟡 Planned  |
| **4**    | Creative Testing — 1:1:N Meta Creative Testing API, multi-creative launch, CAPI-gated                | 🟢 Future   |

Always check `.agent/rules/decisions.md` before starting any phase.
Always read the relevant skill file before writing code.

---

## Global Non-Negotiables

- **1:1:1 Rule:** 1 Campaign → 1 Ad Set → 1 Ad. Never break this for standard launches. Phase 4 creative testing will introduce a controlled exception — see `campaign-launch/SKILL.md`.
- **Attribution Always:** Every ad destination wrapped in `sellam.app/l/[token]`. Never raw `wa.me` or raw `https://` to Meta.
- **Naira-First:** SMEs never see a dollar amount. Always `₦{amount.toLocaleString()}`.
- **TypeScript Strictness:** `any` is forbidden. Run `npx tsc --noemit` before marking any task done.
- **Mobile First:** Every component must work at 375px. User is on a phone.
- **Subscription Gate:** Check `subscription_status === 'active'` before any Meta API write.
- **Policy Guard:** Run ad copy through `checkAdPolicy()` before Meta submission. Block HIGH, warn MEDIUM.
- **TikTok:** Deferred. Gated in backend. Remove from UI if visible.
- **No Shared Cards:** Each org gets their own Meta virtual card. Never use a shared Sellam card on Meta.

---

## Workflows

| Workflow           | When to Use                                          |
| ------------------ | ---------------------------------------------------- |
| `/implement-phase` | Starting a new feature phase from the plan           |
| `/new-migration`   | Creating a Supabase DB migration                     |
| `/policy-check`    | Checking ad copy risk before launch                  |
| `/remodel`         | Refactoring UI to match Sellam Soft Modern aesthetic |
| `/fix-layout`      | Fixing spacing and layout inconsistencies            |

---

## Architecture At a Glance

```
Framework:   Next.js 16 App Router (middleware: proxy.ts)
Database:    Supabase (Auth, PostgreSQL, Realtime)
State:       TanStack Query (server) + Zustand (wizard client state)
UI:          Tailwind CSS v4 + Shadcn UI
Validation:  Zod
AI:          OpenAI (Responses API, strategy/copy) + Fal.ai/Flux (images)
Payments:    Paystack (Naira subscriptions + top-ups)
```

### Key File Locations

| Area                 | Path                                      |
| -------------------- | ----------------------------------------- |
| Server actions       | `src/actions/[domain].ts`                 |
| API routes           | `src/app/api/[domain]/route.ts`           |
| Attribution redirect | `src/app/l/[token]/route.ts`              |
| Pixel endpoint       | `src/app/api/pixel/route.ts`              |
| Client hooks         | `src/hooks/use-[noun].ts`                 |
| AI utilities         | `src/lib/ai/[name].ts`                    |
| AI Vision Analyzer   | `src/lib/ai/vision-analyzer.ts` (Phase 3) |
| Types                | `src/types/[domain].ts`                   |

---

## Archived / Deprecated Docs

The following files live in `.agent/plans/archive/`. They are **historical context only** — do not use as implementation specs:

- `implementation_plan.md` → master 12-month plan, superseded phase-by-phase by `skills/*/references/`
- `campaign_flow_audit.md` → audit of built-but-disconnected features (some items since resolved or intentionally removed)
- `static_data_audit.md` → resolved dummy data audit
- `adsync-creative-v2-prd.md` → creative pipeline Phase 2–4 roadmap (not started)
- `summary.md` → project overview, largely replaced by this file + `rules/sellam-product.md`
