# Tenzu — Product Context

> Auto-read by all Impeccable design skills. Single source of truth for brand identity and product purpose.

---

## Product Purpose

Tenzu democratizes Meta ad management for Nigerian SMEs — fashion sellers, food vendors, beauty businesses, and service providers who sell primarily via WhatsApp and measure success in chats received and sales closed, not impressions or CPM.

**register: product**

---

## Users

Nigerian SME owners — hustlers running real businesses from their phones.

- **Primary device**: Android or iPhone, 375–390px viewport
- **Context of use**: On the go, between orders, often on a slow connection
- **Job to be done**: Launch an ad quickly → get WhatsApp messages → record sales → know which ad worked
- **Emotional goal**: Confidence that their money is working for them
- **Tech level**: Non-technical. The UI must feel built _for_ them, not adapted down from a Western SaaS product.

---

## Brand Personality

**Crisp · Confident · Nigeria-First**

Three-word character: **Precise. Empowering. Real.**

- Not corporate, not startup-cute — grounded and serious like a tool you trust with your money
- Energetic but disciplined — the emerald green is bold; everything else is restrained
- WhatsApp-native context should feel familiar, not foreign

---

## Aesthetic Direction

**"Stripe meets Lagos"** — the structural precision of Stripe/Linear/Vercel, with the energy and confidence of a Nigerian SME category leader.

- Flat UI: depth via 1px `border-border` lines and background shifts, never floating shadows
- High-contrast: deep navy (#030018) backgrounds on landing; clean white (#ffffff) on dashboard
- Single accent dominance: emerald green is the only thing that pops — everything else defers
- Dark mode: fully supported via `.dark` class

**Visual references**: Stripe Dashboard, Linear, Vercel ("crisp modern" category)
**Anti-references**: Rounded bubbly SaaS (Notion-style), glassmorphism, neon-on-dark, gradient text on metrics

---

## Voice & UI Language

Non-negotiable copy rules — flag violations in any audit or clarify pass:

| Avoid                | Use Instead                  |
| -------------------- | ---------------------------- |
| "Campaign"           | "Ad" or "Sale"               |
| "Impressions"        | "People reached"             |
| "Optimize"           | "Improve"                    |
| "WhatsApp clicks"    | "People who messaged"        |
| "Record Sale" button | "Sold! 🎉"                   |
| `$` or `USD`         | `₦{amount.toLocaleString()}` |
| "Conversion"         | "Sale"                       |

---

## Strategic Principles

1. **Mobile Is Canon** — 375px is the real screen size. Never hide critical functionality on mobile.
2. **Naira-First** — SMEs never see a dollar amount. Always `₦` with `.toLocaleString()`.
3. **Attribution Always** — every ad destination wrapped in `tenzu.africa/l/[token]`. Never raw wa.me to Meta.
4. **AI Is Always Purple** — every AI-powered feature uses violet (#8b5cf6). No exceptions.
5. **Subscription Gate** — check `subscription_status === 'active'` before any Meta API write.

---

## Tech Stack (for design context)

- **Framework**: Next.js 16 App Router
- **UI**: Tailwind CSS v4 + Shadcn UI
- **Icons**: `iconoir-react` only (never lucide-react)
- **Fonts**: Montserrat Alternates (headings) + Montserrat (body) — no other fonts

---

## Tenzu-Specific Anti-Patterns (P0/P1 violations in any audit)

| Violation                                   | Correct Fix                                   | Severity |
| ------------------------------------------- | --------------------------------------------- | -------- |
| `text-gray-600`, `text-slate-500`           | `text-subtle-foreground`                      | P1       |
| `bg-blue-500`, `bg-[#123]`                  | Use semantic token or add to `globals.css`    | P0       |
| `shadow-md`, `shadow-lg` on cards           | `border border-border`                        | P1       |
| `rounded-3xl`, `rounded-2xl` on containers  | `rounded-lg`                                  | P2       |
| `import { X } from 'lucide-react'`          | `import { X } from 'iconoir-react'`           | P1       |
| `text-purple-500` for AI features           | `text-ai`                                     | P1       |
| Hardcoded `₦` or `NGN` string               | Derive from `org.currency_default`            | P0       |
| Multiple primary buttons in same view       | Demote secondary actions to `variant="ghost"` | P2       |
| `text-muted-foreground` on readable content | `text-subtle-foreground`                      | P2       |
| Glassmorphism, backdrop-blur (decorative)   | Remove — not Tenzu aesthetic                  | P2       |
| Gradient text on metrics/headings           | Plain `text-foreground`                       | P2       |
| `await` on analytics/notification calls     | Fire-and-forget `.then()` only                | P1       |
