---
name: shadcn-design-system
description: Enforce shadcn/ui design system with semantic tokens, iconoir-react icons, and consistent typography. Enforces the Tenzu "Crisp Modern" aesthetic (flat UI, tight radiuses, crisp borders, no floating shadows). 
globs: "**/*.{ts,tsx}"
---

# shadcn/ui Theme & Design System

## Role
You are a **Senior UI/UX Engineer** working on Tenzu. Your goal is to enforce a **strict, accessible, and "Crisp Modern" flat design system**.

## Core Rules (Non-Negotiable)

1.  **Strict Token Usage**: NEVER use arbitrary colors (e.g., `bg-blue-500`, `text-[#123456]`). Use semantic opacity modifiers if needed (e.g., `bg-primary/10`).
2.  **Iconography**: Use **`iconoir-react`** exclusively. Import individual icons.
3.  **Typography**: Use semantic classes (`text-xl font-heading`) over arbitrary values.
4.  **Radius**: Use `rounded-md` or `rounded-lg` for all cards and inputs. AVOID `rounded-2xl` and `rounded-3xl` as they feel off-brand and too "bubbly".
5.  **Shadows**: DO NOT use soft floating shadows for cards. Use crisp 1px borders (`border border-border`) for separation. Use `shadow-sm` ONLY for floating elements like dropdowns or tooltips.

## Color Usage Guidelines

### Text Color Selection Tree
- **Primary Content** (Headings, Body): `text-foreground`
- **Secondary Content** (Descriptions, Icons): `text-subtle-foreground` (Preferred over `muted-foreground` for readability)
- **Metadata/Disabled**: `text-muted-foreground`
- **Brand Emphasis**: `text-primary`
- **AI Features**: `text-ai` (Violet)
- **Error/Destructive**: `text-destructive`

### Backgrounds
- **Page**: `bg-background`
- **Cards/Surfaces**: `bg-card`
- **Interactive/Hover**: `bg-muted` or `bg-muted/50`
- **AI Highlight**: `bg-ai/10` or `bg-ai`

## Common Violations & Fixes

| Violation | Correction | Why? |
| :--- | :--- | :--- |
| `className="text-gray-600"` | `className="text-subtle-foreground"` | Enforces theme consistency. |
| `className="shadow-lg"` | `className="border border-border"` | Tenzu uses Flat UI (borders over shadows). |
| `import { Check } from 'lucide-react'` | `import { Check } from 'iconoir-react'` | Project standard is Iconoir. |
| `rounded-3xl` (on card) | `rounded-lg` | Matches Tenzu "Crisp Modern" flat aesthetic. |
| `text-purple-500` | `text-ai` | Use semantic names for features. |

## Exception Handling

### When Arbitrary Colors Are Acceptable
- **Data Visualization**: Charts often need specific hex codes (use css variables if possible).
- **Third-Party Brand Assets**: Facebook Blue, Google Red
- **Complex Gradients**: If semantic tokens don't suffice.

**Requirement**: Always add a comment explaining the exception:
`bg-[#12E193] /* Brand primary specifically needed for canvas render */`

## Component Patterns (Condensed)

### 1. Standard Crisp Card
```tsx
<div className="bg-card border border-border rounded-lg p-6">
  <div className="flex items-center gap-3 mb-4">
    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
      <IconName className="h-6 w-6" />
    </div>
    <div>
      <h3 className="text-lg font-heading font-semibold text-foreground">Card Title</h3>
      <p className="text-sm text-subtle-foreground">Secondary description text</p>
    </div>
  </div>
  <div className="space-y-4">
    {/* Content */}
  </div>
</div>
```

### 2. Form Input
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-foreground">Email Address</label>
  <input
    type="email"
    className="w-full bg-background border border-input rounded-md px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-all placeholder:text-muted-foreground"
    placeholder="Enter your email"
  />
</div>
```

### 3. AI Feature Block
```tsx
<div className="bg-ai/5 border border-ai/20 rounded-lg p-6">
  <div className="flex items-center gap-2 mb-2">
    <Sparkles className="h-5 w-5 text-ai" />
    <h4 className="font-semibold text-ai">AI Insights</h4>
  </div>
  <p className="text-sm text-foreground">
    Your ad is performing <span className="font-bold text-primary">20% better</span> than average.
  </p>
</div>
```

## Accessibility Checklist
- [ ] Text contrast ratio is at least 4.5:1
- [ ] Interactive elements have `:focus-visible` states (`ring-ring`).
- [ ] No semantic information is conveyed by color alone.
