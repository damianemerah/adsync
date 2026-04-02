---
name: frontend-design
description: Create production-grade, "Crisp Modern" dashboards for Tenzu. Driven by precision, 1px borders, tight radiuses, and high-contrast typography.
---

> **This skill has been superseded by the Impeccable `frontend-design` skill.**
> All design context, token rules, and anti-patterns now live in `.impeccable.md` at the project root.
> The active skill is at `.agents/skills/frontend-design/SKILL.md`.

## For Reference Only

The Tenzu design system is defined at:
- **`.impeccable.md`** — Design context, tokens, anti-patterns, component patterns (auto-read by all Impeccable skills)
- **`src/app/globals.css`** — Source of truth for all CSS custom properties
- **`.agent/rules/shadcn-theme.md`** → points to `.impeccable.md`

## Quick Token Reference

Read `.impeccable.md` for the full table. Summary:

| Role | Token |
|---|---|
| Primary action | `bg-primary` / `text-primary` |
| Secondary text | `text-subtle-foreground` |
| Placeholder / disabled | `text-muted-foreground` |
| AI features | `text-ai` / `bg-ai` |
| Error states | `text-destructive` |
| Surfaces | `bg-card`, `bg-muted`, `bg-background` |
| Borders | `border-border`, `border-sidebar-border` |
