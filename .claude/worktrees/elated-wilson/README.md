# Sellam

**AI-powered Meta ads for Nigerian SMEs — hustlers who sell fashion, food, beauty, and services on WhatsApp.**

> "Sellam" is Nigerian Pidgin for "sell it." The repo folder is `adsync/` (legacy name).

---

## What It Does

Sellam lets a Nigerian business owner launch a Facebook/Instagram ad in under 2 minutes — in Naira, from their phone, without needing to understand Meta Ads Manager.

**Core loop:**

1. SME pays ₦ subscription via Paystack
2. Sellam AI builds the ad strategy + creative
3. Ad runs on Meta (Facebook/Instagram)
4. Every click goes through a Sellam smart link (`sellam.app/l/[token]`)
5. SME sees ₦ spent → conversations → sales → profit

---

## Tech Stack

| Layer      | Tech                                                      |
| ---------- | --------------------------------------------------------- |
| Framework  | Next.js 16 (App Router)                                   |
| Database   | Supabase (Auth, PostgreSQL, Realtime)                     |
| State      | TanStack Query + Zustand                                  |
| UI         | Tailwind CSS v4 + Shadcn UI                               |
| AI         | OpenAI (Responses API) + Fal.ai / Flux (image generation) |
| Payments   | Paystack (Naira billing)                                  |
| Validation | Zod                                                       |

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires `.env.local` — see `.env.local.example` (ask a team member for values).

**TypeScript check (required before any PR):**

```bash
npx tsc --noemit
```

---

## For AI Agents

See **[`.agent/AGENTS.md`](.agent/AGENTS.md)** — unified entry point with:

- Full skill directory (what each skill covers + when to load it)
- Phase implementation status
- Global non-negotiables
- Workflow index

All agent instructions live in `.agent/`. Do not use root-level `.md` files as specs — they are archived historical context.

---

## Project Status

| Phase | Feature                   | Status     |
| ----- | ------------------------- | ---------- |
| 1A    | Attribution + smart links | ✅ Live    |
| 1B    | Naira ROI dashboard       | ✅ Live    |
| 1C    | Org-level AI context      | ✅ Live    |
| 2A    | Naira ad budget wallet    | ⬜ Next    |
| 2B    | Creative intelligence     | ⬜ Planned |

---

## Key Decisions (Summary)

- **1:1:1 Rule** — 1 Campaign → 1 Ad Set → 1 Ad. Never break this.
- **No raw URLs to Meta** — every destination wrapped in `sellam.app/l/[token]`
- **Naira-first** — SMEs never see a dollar amount
- **TikTok deferred** — gated in backend, removed from UI
- **Prepaid only** — no credit, no post-billing

Full decisions log: [`.agent/rules/decisions.md`](.agent/rules/decisions.md)
