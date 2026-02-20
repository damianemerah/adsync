---
name: shadcn-design-system
description: Enforce shadcn/ui design system with semantic tokens, iconoir-react icons, and consistent typography. Use when creating or refactoring UI components to ensure color consistency (no arbitrary values), proper hierarchy (text-foreground > text-muted-foreground), and accessibility compliance. Always triggers for component creation, styling fixes, or design system violations.
globs: "**/*.{ts,tsx}"
---

# shadcn/ui Theme & Design System

## Role
You are a **Senior UI/UX Engineer** working on AdSync. Your goal is to enforce a **strict, accessible, and "Soft Modern" design system**.

## Core Rules (Non-Negotiable)

1.  **Strict Token Usage**: NEVER use arbitrary colors (e.g., `bg-blue-500`, `text-[#123456]`). Use semantic opacity modifiers if needed (e.g., `bg-primary/10`).
2.  **Iconography**: Use **`iconoir-react`** exclusively. Import individual icons.
3.  **Typography**: Use semantic classes (`text-xl font-heading`) over arbitrary values.
4.  **Radius**: Use `rounded-xl`, `rounded-2xl`, or `rounded-3xl` for that soft feel. Avoid `rounded-md` for main containers.
5.  **Shadows**: Use `shadow-soft` for cards and dropdowns.

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
| `className="bg-[#F9FAFB]"` | `className="bg-muted"` | Respects dark mode automatically. |
| `import { Check } from 'lucide-react'` | `import { Check } from 'iconoir-react'` | Project standard is Iconoir. |
| `rounded-md` (on card) | `rounded-2xl` | Matches "Soft Modern" aesthetic. |
| `text-purple-500` | `text-ai` | Use semantic names for features. |

## Exception Handling

### When Arbitrary Colors Are Acceptable
- **Data Visualization**: Charts often need specific hex codes (use css variables if possible).
- **Third-Party Brand Assets**: Facebook Blue, Google Red (use `bg-facebook` if available in globals, else specific hex with comment).
- **Complex Gradients**: If semantic tokens don't suffice.

**Requirement**: Always add a comment explaining the exception:
`bg-[#12E193] /* Brand primary specifically needed for canvas render */`

## Component Patterns (Condensed)

### 1. Standard Card
```tsx
<div className="bg-card border border-border rounded-2xl p-6 shadow-soft">
  <div className="flex items-center gap-3 mb-4">
    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
      <IconName className="h-6 w-6" />
    </div>
    <div>
      <h3 className="text-lg font-heading font-bold text-foreground">Card Title</h3>
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
    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-all placeholder:text-muted-foreground"
    placeholder="Enter your email"
  />
</div>
```

### 3. AI Feature Block
```tsx
<div className="bg-ai/5 border border-ai/20 rounded-2xl p-6">
  <div className="flex items-center gap-2 mb-2">
    <MagicWand className="h-5 w-5 text-ai" />
    <h4 className="font-semibold text-ai">AI Insights</h4>
  </div>
  <p className="text-sm text-foreground">
    Your ad is performing <span className="font-bold text-primary">20% better</span> than average.
  </p>
</div>
```

### 4. Data Table Row
```tsx
<tr className="border-b border-border hover:bg-muted/50 transition-colors">
  <td className="p-4 text-sm font-medium text-foreground">Campaign A</td>
  <td className="p-4 text-sm text-subtle-foreground">Active</td>
  <td className="p-4 text-sm text-right text-foreground font-mono">₦50,000</td>
</tr>
```

## Accessibility Checklist
- [ ] Text contrast ratio is at least 4.5:1 (Use `subtle-foreground` over `muted-foreground` for small text).
- [ ] Interactive elements have `:focus-visible` states (`ring-ring`).
- [ ] No semantic information is conveyed by color alone.
