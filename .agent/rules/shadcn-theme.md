---
name: shadcn-design-system
description: Enforce Tenzu's design system — flat UI, semantic tokens, iconoir-react icons, Montserrat fonts.
globs: "**/*.{ts,tsx}"
---

# Tenzu Design System — Active Rules



## Non-Negotiable Rules (Always Active)

1. **Semantic tokens only** — No hex codes, no `bg-blue-500`, no `bg-[#xyz]` in JSX
2. **Icons** — `iconoir-react` exclusively. Never `lucide-react`
3. **Typography** — `font-heading` (h1–h3), `font-sans` (body). Font stack is locked to Montserrat
4. **Radius** — `rounded-lg` / `rounded-md`. `rounded-3xl` is banned
5. **Shadows** — Use `border border-border` instead. `shadow-md` / `shadow-lg` on surfaces is a violation
6. **AI features** — Must use `text-ai` / `bg-ai` (Violet). No exceptions
7. **Secondary text** — Use `text-subtle-foreground`, not `text-muted-foreground` for readable content

## Quick Violation Reference

| Violation                          | Fix                                 |
| ---------------------------------- | ----------------------------------- |
| `text-gray-600`                    | `text-subtle-foreground`            |
| `shadow-lg` on card                | `border border-border`              |
| `import { X } from 'lucide-react'` | `import { X } from 'iconoir-react'` |
| `rounded-3xl` on container         | `rounded-lg`                        |
| `text-purple-500` for AI           | `text-ai`                           |
| `bg-[#12E193]`                     | `bg-primary`                        |


