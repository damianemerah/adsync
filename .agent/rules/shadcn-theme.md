---
name: shadcn-design-system
description: Enforce Tenzu's design system — flat UI, semantic tokens, iconoir-react icons, Montserrat fonts. Rules now live in .impeccable.md and are auto-enforced by all Impeccable design skills.
globs: "**/*.{ts,tsx}"
---

# Tenzu Design System — Active Rules

> **Design system rules have been consolidated into `.impeccable.md` at the project root.**
> All Impeccable skills (`/audit`, `/polish`, `/normalize`, etc.) read this file automatically.
> The rules below are a fast-reference summary. Full detail is in `.impeccable.md`.

## Non-Negotiable Rules (Always Active)

1. **Semantic tokens only** — No hex codes, no `bg-blue-500`, no `bg-[#xyz]` in JSX
2. **Icons** — `iconoir-react` exclusively. Never `lucide-react`
3. **Typography** — `font-heading` (h1–h3), `font-sans` (body). Font stack is locked to Montserrat
4. **Radius** — `rounded-lg` / `rounded-md`. `rounded-3xl` is banned
5. **Shadows** — Use `border border-border` instead. `shadow-md` / `shadow-lg` on surfaces is a violation
6. **AI features** — Must use `text-ai` / `bg-ai` (Violet). No exceptions
7. **Secondary text** — Use `text-subtle-foreground`, not `text-muted-foreground` for readable content

## Quick Violation Reference

| Violation | Fix |
|---|---|
| `text-gray-600` | `text-subtle-foreground` |
| `shadow-lg` on card | `border border-border` |
| `import { X } from 'lucide-react'` | `import { X } from 'iconoir-react'` |
| `rounded-3xl` on container | `rounded-lg` |
| `text-purple-500` for AI | `text-ai` |
| `bg-[#12E193]` | `bg-primary` |

## Full Rules

See `.impeccable.md` at the project root for:
- Complete token reference table
- Text color decision tree
- Component patterns (card, form, AI block, sidebar item)
- UI language / copy rules
- Accessibility checklist
