---
name: frontend-design
description: Create production-grade, "Crisp Modern" dashboards for Tenzu. Driven by precision, 1px borders, tight radiuses, and high-contrast typography.
---

## Core Strategy

You are a lead frontend engineer. Your mission is to refactor and build UIs that match the Tenzu "Crisp Modern" style, characterized by high-contrast emerald actions, deep navy foundations, tight grid alignments, and flat, border-driven surfaces rather than floating shadows.

## Resource Utilization

1. **Design Tokens**: Read `src/app/globals.css` before writing any code. Apply these as the absolute source of truth for colors and radius.
2. **Visual Baseline**: Think "Stripe, Linear, or Vercel." Crisp, fast, and structured.
3. **Mockup Workflow**: For complex requests, use native **Nano Banana Pro** or generated images using the fal.ai MCP to create mockups.

## Visual Standards (The Tenzu Crisp Look)

- **Palette**:
  - **Primary Action**: Emerald Green (Token: `bg-primary`)
  - **Foundation Text/Headers**: Deep Navy / Crisp Black (Token: `text-foreground`). Use heavily as _background_ on the Landing Page (`src/app/(public)`), but _sparingly_ as background on Dashboard (`src/app/(authenticated)`).
  - **Secondary Text**: State Slate (Token: `text-subtle-foreground`) - Use for sidebar links, metadata, and descriptions. **Do not use `muted-foreground` for text you want people to read.**
  - **Subtle Scaffolding**: Marketing Gray (Token: `text-muted-foreground`) - Use only for borders (`border-border`), disabled states, or tertiary info.
  - **AI Features**: AI Purple (Token: `text-ai` / `bg-ai`) - **ALWAYS** use for AI-powered tools, links, and "Generate" buttons.
- **Shape & Depth**: Use `rounded-md` or `rounded-lg`. **NEVER** use `rounded-3xl` or massive pill shapes for main containers—those are for "Soft" style. Rely on `border border-border` for separation instead of shadows.
- **Layout Architecture**:
  - **Sidebar**: Fixed left sidebar with a `bg-sidebar` background and absolute crisp right border (`border-r border-sidebar-border`).
  - **Active Items**: Use a crisp `bg-accent` or subtle `bg-primary/10` block for the current active state.
  - **Grid**: Use "Bento Grid" layouts (`grid-cols-12`) with tight `gap-4` or `gap-6` spacing.

## Shadows & Elevation (The "Flat UI" Rule)

- **Neutralize Shadows**: Automatically identify and remove any standard Tailwind shadows (e.g., `shadow-md`, `shadow-lg`, `shadow-soft`).
- **Use Borders Instead**: Depth is created by 1px `border-border` lines and background color shifts (`bg-card` vs `bg-background`), NOT floating shadows.
- **Popovers/Modals**: If a shadow is absolutely required (e.g., for a dropdown menu), use a very tight, hard shadow `shadow-sm` combined with a border.

## Technical Execution (Tailwind v4 + Shadcn)

- **Overrides**: Heavily override default Shadcn components if they are too bubbly. Force `rounded-md`.
- **Empty States**: Use centered, light-gray line-art icons (Iconoir) with an "Improve with AI" emerald CTA.

## Design System & Theming (Strict)

Adhere to the `.agent/rules/shadcn-theme.md` rules:

- **Semantic Tokens Only**: **NEVER** use hex codes (e.g., `#12E193`, `bg-[#030018]`) or arbitrary tailwind colors (`bg-blue-500`).
- **Icons**: Use `iconoir-react`. Never use Lucide.
- **Typography**:
  - **Headings**: `font-heading`, `text-foreground`, `font-bold` or `font-semibold`.
  - **Body**: `font-sans`, `text-foreground`
  - **Links/Actions**: `text-subtle-foreground` -> `hover:text-foreground` transition.

## The Polish Protocol

To avoid "messy" amateur UIs, apply these rules:
1.  **Visual Hierarchy**: The primary action (Emerald green) should be the ONLY thing popping. Demote everything else using `text-subtle-foreground`.
2.  **Structural Grid**: Align everything to strict grid lines. If cards are next to each other, their borders should form a clean grid without messy extra margins.
3.  **Readability**: Never place gray text on a dark background if it's meant to be read.

## Validation Protocol

After implementation:
- **Squint Test:** Can you identify the #1 action immediately?
- **Border Check:** Are we heavily relying on borders instead of shadows?
- Run `npx tsc --noemit` for code error and fix.
