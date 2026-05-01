# Tenzu — Design System

> Auto-read by all Impeccable design skills. Technical token and component reference.
> Source of truth for tokens: `src/app/globals.css`

---

## Color Tokens

All colors must be used via semantic CSS custom properties. Never use hex codes or arbitrary Tailwind values in JSX.

| Purpose | Light | Dark | Tailwind Class |
|---|---|---|---|
| Primary action | `#12e193` | `#12e193` | `bg-primary` / `text-primary` |
| Primary on primary | `#ffffff` | `#030018` | `text-primary-foreground` |
| Page background | `#ffffff` | `#030018` | `bg-background` |
| Default text | `#030018` | `#ffffff` | `text-foreground` |
| Card / surface | `#ffffff` | `#0a071e` | `bg-card` |
| Sidebar bg | `#ffffff` | `#05021a` | `bg-sidebar` |
| Secondary text (readable) | `#445469` | `#cbd5e1` | `text-subtle-foreground` |
| Muted surface | `#f9fafb` | `#1b1832` | `bg-muted` |
| Placeholder / disabled text | `#98a2b3` | `#98a2b3` | `text-muted-foreground` |
| 1px borders | `#ebecf2` | `#1b1832` | `border-border` |
| Sidebar border | `#f2f4f7` | — | `border-sidebar-border` |
| Accent bg (light emerald) | `#f4fbf9` | — | `bg-accent` |
| Accent text | `#12e193` | — | `text-accent-foreground` |
| Error / destructive | `#e54b4f` | — | `text-destructive` / `bg-destructive` |
| Focus ring | `#12e193` | `#12e193` | `ring-ring` |
| **AI features** | `#8b5cf6` | `#8b5cf6` | `text-ai` / `bg-ai` |
| AI foreground | `#ffffff` | `#ffffff` | `text-ai-foreground` |
| Facebook brand | `#1877f2` | — | `text-facebook` |

### Text Color Decision Tree

```
Heading or primary body copy?     → text-foreground
Description, icon, or sidebar?   → text-subtle-foreground
Placeholder or disabled state?   → text-muted-foreground
Primary brand action?             → text-primary
AI-powered feature?               → text-ai
Error?                            → text-destructive
```

> Never use `text-muted-foreground` for text you want people to actually read.

---

## Typography

| Role | Font | Class | Weight |
|---|---|---|---|
| Headings (h1, h2, h3) | Montserrat Alternates | `font-heading` | 700 |
| All body text | Montserrat | `font-sans` | 400 / 500 / 600 / 700 |

**Rules:**
- `font-heading` on all H1–H3 with `letter-spacing: -0.025em` (applied globally)
- Body, labels, links: `font-sans`
- Never use Inter, Roboto, Open Sans, system-ui, or any other font — the font stack is locked

---

## Shape & Radius

| Element | Class |
|---|---|
| Cards, containers | `rounded-lg` (0.5rem) |
| Inputs, badges, small | `rounded-md` |
| Pills (tags only) | `rounded-full` |

**Banned**: `rounded-2xl`, `rounded-3xl` — violates the Crisp Modern flat aesthetic.

---

## Shadows

| Situation | Rule |
|---|---|
| Cards, panels, surfaces | No shadow — use `border border-border` instead |
| Floating dropdowns, tooltips | `shadow-sm` + `border border-border` |
| `shadow-md`, `shadow-lg` | Never — too floaty, breaks the flat aesthetic |

---

## Component Patterns

### Standard Crisp Card

```tsx
<div className="bg-card border border-border rounded-lg p-6">
  <div className="flex items-center gap-3 mb-4">
    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
      <IconName className="h-5 w-5" />
    </div>
    <div>
      <h3 className="text-lg font-heading font-bold text-foreground">Card Title</h3>
      <p className="text-sm text-subtle-foreground">Supporting description</p>
    </div>
  </div>
</div>
```

### Form Input

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-foreground">Label</label>
  <input className="w-full bg-background border border-border rounded-md px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none placeholder:text-muted-foreground" />
</div>
```

### AI Feature Block

```tsx
<div className="bg-ai/5 border border-ai/20 rounded-lg p-4">
  <div className="flex items-center gap-2 mb-2">
    <Sparks className="h-4 w-4 text-ai" />
    <span className="text-sm font-semibold text-ai">AI Insight</span>
  </div>
  <p className="text-sm text-foreground">
    Your ad reached <span className="font-bold text-primary">2,400 people</span>.
  </p>
</div>
```

### Active Sidebar Item

```tsx
<div className="flex items-center gap-3 px-2 py-1.5 rounded-md bg-accent text-primary font-medium text-sm">
  <Icon className="h-4 w-4" />
  <span>Dashboard</span>
</div>
```

---

## Accessibility Requirements

- Text contrast ratio ≥ 4.5:1 (WCAG AA)
- All interactive elements have `:focus-visible` states via `ring-ring`
- No semantic information conveyed by color alone
- Touch targets ≥ 44×44px (mobile-first users)

---

## Icons

Library: `iconoir-react` — no other icon library. Never import from `lucide-react`.

---

## Dark Mode

Fully supported via `.dark` class. All semantic tokens have dark variants defined in `src/app/globals.css`.
